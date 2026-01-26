import EventParser from './eventParser.js';
import { MODEL_OPTIONS, STORAGE_KEYS, UI_MESSAGES, STATUS } from './constants.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const eventInput = document.getElementById('eventInput');
    const magicBoxContainer = document.getElementById('magicBoxContainer');
    const mainActionButton = document.getElementById('mainActionButton');
    const buttonText = document.getElementById('buttonText');
    const actionFlipCard = document.getElementById('actionFlipCard');
    
    // Config Elements
    const apiKeyInput = document.getElementById('apiKeyInput');
    const baseUrlInput = document.getElementById('baseUrlInput');
    const saveConfigButton = document.getElementById('saveConfig');
    const cancelConfigButton = document.getElementById('cancelConfig');
    const keyGroup = document.getElementById('keyGroup');
    const urlGroup = document.getElementById('urlGroup');
    const openConfigBtn = document.getElementById('openConfig');
    
    // Status Elements
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const toastContainer = document.getElementById('toastContainer');
    const themeToggle = document.getElementById('themeToggle');
    
    // Pattern & Pill
    const enginePill = document.getElementById('enginePill');
    const currentModelLabel = document.getElementById('currentModelLabel');
    const dockItems = document.querySelectorAll('.dock-item');
    
    // Tray Elements
    const modelTray = document.getElementById('modelTray');
    const trayOverlay = document.getElementById('trayOverlay');
    const trayList = document.getElementById('trayList');
    const closeTrayBtn = document.getElementById('closeTray');

    // State
    const parser = new EventParser();
    let currentPattern = 'CLOUD';
    let selectedModelId = localStorage.getItem(STORAGE_KEYS.PREFERRED_MODEL_ID) || MODEL_OPTIONS[0].id;
    let isConfiguring = false;

    // --- Initialize ---
    initTheme();
    // Validate selected model matches pattern
    const initialModel = MODEL_OPTIONS.find(m => m.id === selectedModelId);
    if (initialModel) {
        currentPattern = initialModel.servingPattern;
    }
    selectPattern(currentPattern, false); // Don't re-initialize immediately, let selectPattern do it

    // --- UI Logic ---

    function selectPattern(pattern, shouldInit = true) {
        currentPattern = pattern;
        
        // Update Dock UI
        dockItems.forEach(item => {
            item.classList.toggle('selected', item.getAttribute('data-pattern') === pattern);
        });

        // Accent Color (Solarized: Orange, Magenta, Violet)
        const colors = { 'CLOUD': '#cb4b16', 'BROWSER': '#d33682', 'LOCAL': '#6c71c4' };
        document.documentElement.style.setProperty('--pattern-glow', colors[pattern]);
        
        // Ensure selected model belongs to this pattern
        const currentModel = MODEL_OPTIONS.find(m => m.id === selectedModelId);
        if (!currentModel || currentModel.servingPattern !== pattern) {
            // Pick first model for this pattern
            selectedModelId = MODEL_OPTIONS.find(m => m.servingPattern === pattern).id;
        }

        updateEnginePill();
        updateButtonState();
        if (shouldInit) initializeModel();
    }

    function updateEnginePill() {
        const model = MODEL_OPTIONS.find(m => m.id === selectedModelId);
        currentModelLabel.textContent = model ? model.name : 'Unknown';
        enginePill.classList.add('visible');
    }

    function openTray() {
        const patternModels = MODEL_OPTIONS.filter(m => m.servingPattern === currentPattern);
        trayList.innerHTML = '';
        
        patternModels.forEach(model => {
            const item = document.createElement('div');
            item.className = `tray-item ${model.id === selectedModelId ? 'selected' : ''}`;
            
            // Add pencil icon for cloud models
            const isCloud = ['google', 'openrouter'].includes(model.type);
            const editHtml = isCloud ? `
                <div class="edit-icon" title="Configure Model">
                    <span class="material-symbols-rounded" style="font-size: 18px;">edit</span>
                </div>
            ` : '';

            item.innerHTML = `
                <div>
                    <div style="font-weight: 600;">${model.name}</div>
                    <div class="model-desc">${model.description}</div>
                </div>
                ${editHtml}
            `;

            item.onclick = (e) => {
                // If clicked the edit icon specifically
                if (e.target.closest('.edit-icon')) {
                    e.stopPropagation();
                    selectedModelId = model.id;
                    localStorage.setItem(STORAGE_KEYS.PREFERRED_MODEL_ID, model.id);
                    updateEnginePill();
                    closeTray();
                    toggleConfig(true);
                    return;
                }

                selectedModelId = model.id;
                localStorage.setItem(STORAGE_KEYS.PREFERRED_MODEL_ID, model.id);
                closeTray();
                updateEnginePill();
                updateButtonState();
                initializeModel();
            };
            trayList.appendChild(item);
        });

        modelTray.classList.add('open');
        trayOverlay.classList.add('visible');
    }

    function closeTray() {
        modelTray.classList.remove('open');
        trayOverlay.classList.remove('visible');
    }

    function toggleConfig(show) {
        isConfiguring = show;
        if (show) {
            const model = MODEL_OPTIONS.find(m => m.id === selectedModelId);
            // Dynamic Visibility
            keyGroup.classList.toggle('hidden', !['google', 'openrouter'].includes(model.type));
            urlGroup.classList.toggle('hidden', !['ollama', 'lmstudio', 'openrouter'].includes(model.type));
            
            // Fill existing
            if (model.type === 'google') apiKeyInput.value = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
            if (model.type === 'openrouter') apiKeyInput.value = localStorage.getItem(STORAGE_KEYS.OPENROUTER_KEY) || '';
            baseUrlInput.value = model.baseUrl || ''; // Fallback to constant
            
            actionFlipCard.classList.add('flipped');
        } else {
            actionFlipCard.classList.remove('flipped');
        }
    }

    function updateButtonState() {
        const model = MODEL_OPTIONS.find(m => m.id === selectedModelId);
        const needsKey = ['google', 'openrouter'].includes(model.type);
        const hasKey = needsKey ? (model.type === 'google' ? localStorage.getItem(STORAGE_KEYS.API_KEY) : localStorage.getItem(STORAGE_KEYS.OPENROUTER_KEY)) : true;
        
        if (needsKey && !hasKey) {
            mainActionButton.classList.add('warning');
            buttonText.textContent = 'Setup Required';
        } else {
            mainActionButton.classList.remove('warning');
            buttonText.textContent = 'Create Event';
        }
    }

    async function initializeModel() {
        updateConnectionStatus(STATUS.CONNECTING);
        const model = MODEL_OPTIONS.find(m => m.id === selectedModelId);
        if (!model) return;

        let key = null;
        if (model.type === 'google') key = localStorage.getItem(STORAGE_KEYS.API_KEY);
        if (model.type === 'openrouter') key = localStorage.getItem(STORAGE_KEYS.OPENROUTER_KEY);

        try {
            await parser.setModel(selectedModelId, key);
            updateConnectionStatus(STATUS.CONNECTED, model.name);
        } catch (e) {
            updateConnectionStatus(STATUS.DISCONNECTED, e.message);
        }
    }

    // --- Action Button Events ---
    mainActionButton.addEventListener('click', () => {
        const model = MODEL_OPTIONS.find(m => m.id === selectedModelId);
        const needsKey = ['google', 'openrouter'].includes(model.type);
        const hasKey = needsKey ? (model.type === 'google' ? localStorage.getItem(STORAGE_KEYS.API_KEY) : localStorage.getItem(STORAGE_KEYS.OPENROUTER_KEY)) : true;
        
        if (needsKey && !hasKey) {
            toggleConfig(true);
        } else {
            createEvent();
        }
    });

    saveConfigButton.addEventListener('click', () => {
        const model = MODEL_OPTIONS.find(m => m.id === selectedModelId);
        if (model.type === 'google') localStorage.setItem(STORAGE_KEYS.API_KEY, apiKeyInput.value);
        if (model.type === 'openrouter') localStorage.setItem(STORAGE_KEYS.OPENROUTER_KEY, apiKeyInput.value);
        
        showToast('Configuration saved', 'success');
        toggleConfig(false);
        updateButtonState();
        initializeModel();
    });

    // --- Other Events ---
    cancelConfigButton.addEventListener('click', () => toggleConfig(false));
    currentModelLabel.addEventListener('click', openTray);
    closeTrayBtn.addEventListener('click', closeTray);
    trayOverlay.addEventListener('click', closeTray);

    dockItems.forEach(item => {
        item.addEventListener('click', () => selectPattern(item.getAttribute('data-pattern')));
    });

    // Enter key to submit
    eventInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            mainActionButton.click();
        }
    });

    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.getAttribute('data-example');
            eventInput.value = '';
            let i = 0;
            const interval = setInterval(() => {
                eventInput.value += text[i++];
                if (i >= text.length) clearInterval(interval);
            }, 20);
        });
    });

    themeToggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(STORAGE_KEYS.THEME, next);
    });

    function initTheme() {
        document.documentElement.setAttribute('data-theme', localStorage.getItem(STORAGE_KEYS.THEME) || 'dark');
    }

    function updateConnectionStatus(status, info) {
        statusDot.className = `dot ${status}`;
        statusText.textContent = status === STATUS.CONNECTED ? `Ready: ${info}` : status === STATUS.CONNECTING ? 'Initializing...' : 'Offline';
        magicBoxContainer.classList.toggle('active', status === STATUS.CONNECTED);
    }

    function showToast(msg, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'check_circle',
            error: 'error',
            info: 'info'
        };
        
        toast.innerHTML = `
            <span class="material-symbols-rounded" style="font-size: 20px;">${icons[type] || 'info'}</span>
            <span>${msg}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    async function createEvent() {
        const text = eventInput.value.trim();
        if (!text) return;
        
        // Loading state
        mainActionButton.disabled = true;
        mainActionButton.classList.add('loading');
        buttonText.textContent = 'Processing ...';
        
        try {
            const url = await parser.parseEvent(text);
            window.open(url, '_blank');
        } catch (e) {
            showToast(e.message, 'error', 6000);
        } finally {
            mainActionButton.disabled = false;
            mainActionButton.classList.remove('loading');
            updateButtonState(); // Restore button text
        }
    }
});