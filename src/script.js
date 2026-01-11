import EventParser from './eventParser.js';
import { MODEL_OPTIONS, MODEL_TYPES, STORAGE_KEYS, UI_MESSAGES, STATUS } from './constants.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const eventInput = document.getElementById('eventInput');
    const createEventButton = document.getElementById('createEvent');
    const statusMessage = document.getElementById('statusMessage');
    const statusIndicator = document.getElementById('statusIndicator');
    const modelIconDisplay = document.getElementById('modelIcon');
    const modelNameDisplay = document.getElementById('modelName');
    const retryButton = document.getElementById('retryConnection');
    const exampleItems = document.querySelectorAll('.example-list li');
    const examplesToggle = document.getElementById('examplesToggle');
    const exampleList = document.getElementById('exampleList');
    const examplesHeader = document.getElementById('examplesHeader');
    const themeToggle = document.getElementById('themeToggle');
    const modelSelect = document.getElementById('modelSelect');
    const apiKeyContainer = document.getElementById('apiKeyContainer');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyButton = document.getElementById('saveApiKey');

    // State
    let isExamplesVisible = true;
    const parser = new EventParser();

    // Initialize
    initTheme();
    loadModelsUI();
    
    // Event Listeners
    createEventButton.addEventListener('click', createEvent);
    
    eventInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            createEvent();
        }
    });
    
    retryButton.addEventListener('click', () => {
        initializeModel(modelSelect.value);
    });
    
    exampleItems.forEach(item => {
        item.addEventListener('click', () => {
            eventInput.value = item.getAttribute('data-example');
            eventInput.focus();
        });
    });
    
    examplesHeader.addEventListener('click', toggleExamples);
    themeToggle.addEventListener('click', toggleTheme);
    
    modelSelect.addEventListener('change', (e) => {
        initializeModel(e.target.value);
    });

    saveApiKeyButton.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            const currentModelId = modelSelect.value;
            const modelConfig = MODEL_OPTIONS.find(m => m.id === currentModelId);
            if (modelConfig && modelConfig.type === 'google') {
                localStorage.setItem(STORAGE_KEYS.API_KEY, key);
            } else if (modelConfig && modelConfig.type === 'openrouter') {
                localStorage.setItem(STORAGE_KEYS.OPENROUTER_KEY, key);
            }
            
            showStatus(UI_MESSAGES.SUCCESS.API_KEY_SAVED, 'success');
            initializeModel(currentModelId);
        }
    });

    // Functions

    function initTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
        updateThemeIcon(theme);
    }

    function updateThemeIcon(theme) {
        themeToggle.innerHTML = `<span class="material-symbols-rounded">${theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>`;
    }

    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
        updateThemeIcon(newTheme);
    }

    function toggleExamples() {
        isExamplesVisible = !isExamplesVisible;
        exampleList.classList.toggle('hidden', !isExamplesVisible);
        examplesToggle.innerHTML = `<span class="material-symbols-rounded">${isExamplesVisible ? 'expand_less' : 'expand_more'}</span>`;
        localStorage.setItem(STORAGE_KEYS.EXAMPLES_VISIBLE, isExamplesVisible);
    }

    function loadModelsUI() {
        modelSelect.innerHTML = '';
        MODEL_OPTIONS.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            const typeLabel = MODEL_TYPES[model.servingPattern].label;
            option.textContent = `${model.name} (${typeLabel})`; 
            modelSelect.appendChild(option);
        });

        const savedModelId = localStorage.getItem(STORAGE_KEYS.PREFERRED_MODEL_ID);
        if (savedModelId && MODEL_OPTIONS.some(m => m.id === savedModelId)) {
            modelSelect.value = savedModelId;
        } else {
            modelSelect.value = MODEL_OPTIONS[0].id;
        }

        initializeModel(modelSelect.value);
    }

    async function initializeModel(modelId) {
        const modelConfig = MODEL_OPTIONS.find(m => m.id === modelId);
        if (!modelConfig) return;

        localStorage.setItem(STORAGE_KEYS.PREFERRED_MODEL_ID, modelId);
        
        // Update Icon
        const typeInfo = MODEL_TYPES[modelConfig.servingPattern];
        modelIconDisplay.textContent = typeInfo.icon;
        modelIconDisplay.style.display = 'inline-block';
        
        updateConnectionStatus(STATUS.CONNECTING, `Connecting to ${modelConfig.name}...`);
        
        let apiKey = null;
        if (modelConfig.type === 'google') {
            apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
            apiKeyContainer.style.display = 'block';
            apiKeyInput.placeholder = "Enter Google API Key";
        } else if (modelConfig.type === 'openrouter') {
             apiKey = localStorage.getItem(STORAGE_KEYS.OPENROUTER_KEY);
             apiKeyContainer.style.display = 'block';
             apiKeyInput.placeholder = "Enter OpenRouter Key";
        } else {
            apiKeyContainer.style.display = 'none';
        }
        
        if (apiKey) apiKeyInput.value = apiKey;

        try {
            await parser.setModel(modelId, apiKey);
            updateConnectionStatus(STATUS.CONNECTED, `${modelConfig.name}`);
        } catch (error) {
            console.error(error);
            updateConnectionStatus(STATUS.DISCONNECTED, `Failed: ${error.message}`);
        }
    }

    function updateConnectionStatus(status, message) {
        statusIndicator.className = `status-indicator ${status}`;
        modelNameDisplay.textContent = message || (status === STATUS.CONNECTED ? 'Connected' : 'Disconnected');
        retryButton.style.display = status === STATUS.DISCONNECTED ? 'inline-block' : 'none';
    }

    function showStatus(message, type = '') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        if (type === 'success') {
            setTimeout(() => {
                if (statusMessage.textContent === message) {
                    statusMessage.textContent = '';
                    statusMessage.className = 'status-message';
                }
            }, 5000);
        }
    }

    async function createEvent() {
        const text = eventInput.value.trim();
        if (!text) {
            showStatus(UI_MESSAGES.ERRORS.NO_EVENT_DETAILS, 'error');
            return;
        }

        createEventButton.disabled = true;
        createEventButton.innerHTML = '<span class="material-symbols-rounded">hourglass_top</span> Processing...';
        showStatus(UI_MESSAGES.STATUS.PROCESSING);

        try {
            const url = await parser.parseEvent(text);
            showStatus(UI_MESSAGES.SUCCESS.EVENT_CREATED, 'success');
            window.open(url, '_blank');
        } catch (error) {
            showStatus(error.message, 'error');
        } finally {
            createEventButton.disabled = false;
            createEventButton.innerHTML = '<span class="material-symbols-rounded">add</span> Create Event';
        }
    }
});