import EventParser from './eventParser.js';
import { MODEL_OPTIONS, MODEL_TYPES, STORAGE_KEYS } from './constants.js';
import { listGoogleModels } from './llm/googleModels.js';

const byId = id => document.getElementById(id);
const eventForm = byId('eventForm');
const eventInput = byId('eventInput');
const calendarButton = byId('mainActionButton');
const calendarActionLabel = byId('calendarActionLabel');
const eventError = byId('eventError');
const calendarStatus = byId('calendarStatus');
const modelDialog = byId('modelTray');
const settingsButton = byId('settingsButton');
const providerChoices = byId('providerChoices');
const providerStatus = byId('providerStatus');
const modelConfig = byId('modelConfig');
const keyForm = byId('keyForm');
const apiKeyInput = byId('apiKeyInput');
const editKey = byId('editKey');
const googlePicker = byId('googlePicker');
const googleModelChoices = byId('googleModelChoices');
const googleModelSummary = byId('googleModelSummary');
const googleModelList = byId('googleModelList');
const catalogStatus = byId('googleCatalogStatus');
const refreshGoogleButton = byId('refreshGoogleModels');
const desktopKeyboard = matchMedia('(min-width: 581px) and (hover: hover) and (pointer: fine)');

let parser;
let modelAttempt = 0;
let catalogRequest;
let googleModels = null;
let catalogMessage = '';
let modelLoading = false;
let openingCalendar = false;
let inputRevision = 0;

const savedProvider = localStorage.getItem(STORAGE_KEYS.PREFERRED_MODEL_ID);
let preferredGoogleModel = localStorage.getItem(STORAGE_KEYS.GOOGLE_MODEL_ID);
if (savedProvider?.startsWith('gemini-') && !preferredGoogleModel) {
    preferredGoogleModel = savedProvider;
    localStorage.setItem(STORAGE_KEYS.GOOGLE_MODEL_ID, savedProvider);
}
let provider = MODEL_OPTIONS.find(model => model.id === savedProvider) ?? MODEL_OPTIONS[0];

const providerAppearance = {
    google: { icon: 'gemini', label: 'Google AI Studio' },
    openrouter: { icon: 'openrouter', label: 'OpenRouter' },
    browser: { icon: 'browser', label: 'Browser' },
    ollama: { icon: 'ollama', label: 'Ollama' },
    lmstudio: { icon: 'lmstudio', label: 'LM Studio' }
};

for (const [patterns, heading] of [
    [['CLOUD'], MODEL_TYPES.CLOUD.label],
    [['BROWSER', 'LOCAL'], 'On this device']
]) {
    const group = document.createElement('fieldset');
    const options = MODEL_OPTIONS.filter(model => patterns.includes(model.servingPattern));
    group.className = 'provider-group';
    group.innerHTML = `
        <legend>${heading}</legend>
        <div class="provider-grid ${options.length === 3 ? 'three-providers' : ''}">
            ${options.map(model => {
                const { icon, label } = providerAppearance[model.type];
                return `<label class="provider-option">
                    <input type="radio" class="sr-only" name="provider" value="${model.id}" ${model === provider ? 'checked' : ''}>
                    <span class="provider-card">
                        <svg class="icon provider-icon" aria-hidden="true"><use href="#icon-${icon}"/></svg>
                        <span>${label}</span>
                        <svg class="icon provider-check" aria-hidden="true"><use href="#icon-check"/></svg>
                    </span>
                </label>`;
            }).join('')}
        </div>`;
    providerChoices.append(group);
}

function keyStorage() {
    if (provider.type === 'google') return STORAGE_KEYS.API_KEY;
    if (provider.type === 'openrouter') return STORAGE_KEYS.OPENROUTER_KEY;
    return null;
}

function providerKey() {
    const storage = keyStorage();
    return storage ? localStorage.getItem(storage) : null;
}

function selectedGoogleModel() {
    return googleModels?.find(model => model.id === preferredGoogleModel);
}

function renderCalendarAction() {
    const needsKey = keyStorage() && !providerKey();
    const needsModel = provider.type === 'google' && !selectedGoogleModel();
    calendarButton.disabled = openingCalendar || (modelLoading && !needsModel);
    calendarActionLabel.textContent = openingCalendar ? 'Opening Calendar…'
        : needsKey ? 'Set up model'
        : needsModel ? 'Choose model'
        : modelLoading ? 'Connecting…'
        : 'Open in Calendar';
}

function renderModel() {
    byId('activeProvider').hidden = provider.type === 'google';
    byId('currentModelLabel').textContent = provider.name;
    byId('currentModelIcon').setAttribute('href', '#icon-' + providerAppearance[provider.type].icon);
    renderCalendarAction();
}

function renderGooglePicker() {
    googlePicker.hidden = provider.type !== 'google' || !providerKey();
    googleModelChoices.hidden = Boolean(catalogRequest) || !googleModels?.length;
    byId('googleModelName').textContent = selectedGoogleModel()?.name || 'Choose a model';
    googleModelList.replaceChildren();
    for (const { name, id } of googleModels ?? []) {
        const row = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.value = id;
        button.setAttribute('aria-pressed', String(id === preferredGoogleModel));
        button.append(name);
        if (name !== id) {
            const identifier = document.createElement('code');
            identifier.textContent = id;
            button.append(identifier);
        }
        row.append(button);
        googleModelList.append(row);
    }
    refreshGoogleButton.disabled = Boolean(catalogRequest);
    catalogStatus.textContent = catalogMessage;
}

function renderKeyForm(editing = false) {
    const storage = keyStorage();
    const key = providerKey();
    modelConfig.hidden = !storage;
    keyForm.hidden = !storage || (!editing && Boolean(key));
    editKey.hidden = !storage || !keyForm.hidden;
    if (!keyForm.hidden) {
        byId('apiKeyLabel').textContent = provider.type === 'google' ? 'Google AI Studio API key' : 'OpenRouter API key';
        apiKeyInput.value = key || '';
    } else {
        apiKeyInput.value = '';
    }
}

function openModelDialog({ focusModel = false } = {}) {
    renderKeyForm();
    modelDialog.showModal();
    if (focusModel && !keyForm.hidden) apiKeyInput.focus();
    else if (focusModel && !googlePicker.hidden && !googleModelChoices.hidden) {
        googleModelChoices.open = true;
        googleModelSummary.focus();
    }
    else byId('closeTray').focus();
}

async function initializeModel({ refresh = false } = {}) {
    const attempt = ++modelAttempt;
    catalogRequest?.abort();
    catalogRequest = null;
    parser = null;
    modelLoading = false;

    const model = provider;
    const key = providerKey();
    if (keyStorage() && !key) {
        providerStatus.textContent = 'An API key is required.';
        renderModel();
        renderGooglePicker();
        return;
    }

    modelLoading = true;
    providerStatus.textContent = model.type === 'google' ? '' : 'Connecting…';
    renderModel();

    try {
        let googleModel;
        if (model.type === 'google') {
            if (refresh || !googleModels) {
                googleModels = null;
                catalogRequest = new AbortController();
                catalogMessage = 'Loading Google models…';
                renderGooglePicker();
                try {
                    const models = await listGoogleModels(key, AbortSignal.any([
                        catalogRequest.signal,
                        AbortSignal.timeout(15000)
                    ]));
                    if (attempt !== modelAttempt) return;
                    googleModels = models;
                } finally {
                    if (attempt === modelAttempt) catalogRequest = null;
                }
            }
            googleModel = selectedGoogleModel();
            catalogMessage = googleModel ? '' : !googleModels.length
                ? 'Google returned no eligible Gemini models.'
                : preferredGoogleModel ? 'Your saved model is unavailable. Choose another model.'
                : 'Choose a model to continue.';
            if (!googleModel) return;
        }

        const nextParser = new EventParser();
        parser = nextParser;
        await nextParser.setModel(model.id, key, googleModel?.id);
        if (attempt === modelAttempt) providerStatus.textContent = '';
    } catch (error) {
        if (attempt !== modelAttempt) return;
        if (model.type === 'google' && !googleModels) {
            catalogMessage = error.name === 'TimeoutError' ? 'The catalog request timed out. Try refreshing.'
                : error instanceof TypeError ? 'Could not reach Google. Check your connection and refresh.'
                : error.message;
        } else {
            providerStatus.textContent = 'Could not connect to ' + model.name + '.';
        }
    } finally {
        if (attempt === modelAttempt) {
            modelLoading = false;
            renderModel();
            renderGooglePicker();
        }
    }
}

function showError(message) {
    eventError.textContent = message;
    eventError.hidden = !message;
}

async function openEventInCalendar(event) {
    event.preventDefault();
    if (openingCalendar) return;
    if ((keyStorage() && !providerKey()) || (provider.type === 'google' && !selectedGoogleModel())) {
        openModelDialog({ focusModel: true });
        return;
    }

    const text = eventInput.value.trim();
    if (!text) {
        showError('Describe an event to open in Calendar.');
        eventInput.focus();
        return;
    }
    if (!parser || modelLoading) return;

    const activeParser = parser;
    const revision = inputRevision;
    openingCalendar = true;
    showError('');
    calendarStatus.textContent = 'Opening Google Calendar.';
    renderCalendarAction();
    try {
        const calendarUrl = await activeParser.parseEvent(text, { preferNative: false });
        if (revision === inputRevision && activeParser === parser && !modelDialog.open) {
            window.location.assign(calendarUrl);
        }
    } catch (error) {
        if (revision === inputRevision && activeParser === parser) {
            showError(error.message || 'Could not open Calendar. Try again.');
        }
    } finally {
        openingCalendar = false;
        calendarStatus.textContent = '';
        renderCalendarAction();
    }
}

eventForm.addEventListener('submit', openEventInCalendar);
eventInput.addEventListener('keydown', event => {
    if (desktopKeyboard.matches && event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        if (!calendarButton.disabled && !event.repeat) eventForm.requestSubmit();
    }
});
eventInput.addEventListener('input', () => {
    inputRevision++;
    showError('');
    if (!CSS.supports('field-sizing', 'content')) {
        eventInput.style.height = 'auto';
        eventInput.style.height = eventInput.scrollHeight + 2 + 'px';
    }
});
settingsButton.addEventListener('click', () => openModelDialog());
byId('closeTray').addEventListener('click', () => modelDialog.close());
modelDialog.addEventListener('close', () => { googleModelChoices.open = false; });
providerChoices.addEventListener('change', event => {
    provider = MODEL_OPTIONS.find(model => model.id === event.target.value);
    googleModelChoices.open = false;
    localStorage.setItem(STORAGE_KEYS.PREFERRED_MODEL_ID, provider.id);
    showError('');
    renderKeyForm();
    initializeModel();
});
editKey.addEventListener('click', () => {
    renderKeyForm(true);
    apiKeyInput.focus();
});
keyForm.addEventListener('submit', async event => {
    event.preventDefault();
    const model = provider;
    const key = apiKeyInput.value.trim();
    localStorage.setItem(keyStorage(), key);
    localStorage.setItem(STORAGE_KEYS.PREFERRED_MODEL_ID, model.id);
    if (model.type === 'google') googleModels = null;
    renderKeyForm();
    if (key) {
        if (model.type === 'google') byId('closeTray').focus();
        else modelDialog.close();
    }
    await initializeModel();
    if (model === provider && modelDialog.open && !googlePicker.hidden && !googleModelChoices.hidden &&
        document.activeElement === byId('closeTray')) {
        googleModelChoices.open = !selectedGoogleModel();
        googleModelSummary.focus();
    }
});
refreshGoogleButton.addEventListener('click', () => initializeModel({ refresh: true }));
googleModelList.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    preferredGoogleModel = button.value;
    localStorage.setItem(STORAGE_KEYS.GOOGLE_MODEL_ID, preferredGoogleModel);
    localStorage.setItem(STORAGE_KEYS.PREFERRED_MODEL_ID, provider.id);
    showError('');
    modelDialog.close();
    initializeModel();
});
renderKeyForm();
initializeModel();
if (desktopKeyboard.matches && document.activeElement === document.body) eventInput.focus();
