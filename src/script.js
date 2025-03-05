import EventParser from './eventParser.js';
import { MODELS, STATUS, STORAGE_KEYS, UI_MESSAGES } from './constants.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const eventInput = document.getElementById('eventInput');
    const createEventButton = document.getElementById('createEvent');
    const statusMessage = document.getElementById('statusMessage');
    const statusIndicator = document.getElementById('statusIndicator');
    const modelName = document.getElementById('modelName');
    const retryButton = document.getElementById('retryConnection');
    const exampleItems = document.querySelectorAll('.example-list li');
    const examplesToggle = document.getElementById('examplesToggle');
    const exampleList = document.getElementById('exampleList');
    const examplesHeader = document.getElementById('examplesHeader');
    const themeToggle = document.getElementById('themeToggle');
    const modelSelector = document.getElementById('modelSelector');
    const modelSelect = document.getElementById('modelSelect');
    const googleApiKeyContainer = document.getElementById('googleApiKeyContainer');
    const googleApiKeyInput = document.getElementById('googleApiKey');
    const saveApiKeyButton = document.getElementById('saveApiKey');
    const copyInstallCommand = document.getElementById('copyInstallCommand');
    
    // State
    let isExamplesVisible = true;
    let availableModels = [];
    
    // Initialize parser without specifying a model (will auto-select first available)
    const parser = new EventParser();

    // Check if dark mode is preferred or previously set
    initTheme();
    
    // Load saved API key if exists
    loadSavedApiKey();
    
    // Check LLM connection status and load models
    loadModels();
    
    // Add click handler for create button
    createEventButton.addEventListener('click', createEvent);
    
    // Add keyboard shortcut (ctrl/cmd + enter) to create event
    eventInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            createEvent();
        }
    });
    
    // Add click handler for retry button
    retryButton.addEventListener('click', () => {
        retryButton.style.display = 'none';
        loadModels();
    });
    
    // Add click handlers for example items
    exampleItems.forEach(item => {
        item.addEventListener('click', () => {
            const exampleText = item.getAttribute('data-example');
            eventInput.value = exampleText;
            eventInput.focus();
        });
    });
    
    // Toggle examples visibility
    examplesHeader.addEventListener('click', toggleExamples);
    examplesToggle.addEventListener('click', toggleExamples);
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Model selection change
    modelSelect.addEventListener('change', async (e) => {
        const selectedModel = e.target.value;
        const selectedModelData = availableModels.find(m => m.name === selectedModel);
        
        if (selectedModelData) {
            if (selectedModelData.type === 'google') {
                // Show Google API key input
                googleApiKeyContainer.style.display = 'block';
                const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
                
                if (savedApiKey) {
                    try {
                        await parser.setModel(selectedModel, savedApiKey);
                        updateConnectionStatus(STATUS.CONNECTED, `Google ${selectedModel}`);
                        localStorage.setItem(STORAGE_KEYS.PREFERRED_MODEL, selectedModel);
                        showStatus(UI_MESSAGES.SUCCESS.MODEL_SWITCHED(selectedModel), 'success');
                    } catch (error) {
                        showStatus(error.message, 'error');
                    }
                } else {
                    showStatus(UI_MESSAGES.ERRORS.NO_API_KEY, 'error');
                }
            } else {
                // Hide Google API key input for Ollama models
                googleApiKeyContainer.style.display = 'none';
                try {
                    await parser.setModel(selectedModel);
                    localStorage.setItem(STORAGE_KEYS.PREFERRED_MODEL, selectedModel);
                    showStatus(UI_MESSAGES.SUCCESS.MODEL_SWITCHED(selectedModel), 'success');
                } catch (error) {
                    showStatus(error.message, 'error');
                }
            }
        }
    });
    
    // Save Google API key
    saveApiKeyButton.addEventListener('click', async () => {
        const apiKey = googleApiKeyInput.value.trim();
        if (!apiKey) {
            showStatus(UI_MESSAGES.ERRORS.INVALID_API_KEY, 'error');
            return;
        }
        
        try {
            localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey); // Save API key to localStorage
            const selectedModel = modelSelect.value;
            await parser.setModel(selectedModel, apiKey);
            updateConnectionStatus(STATUS.CONNECTED, `Google ${selectedModel}`);
            showStatus(UI_MESSAGES.SUCCESS.API_KEY_SAVED, 'success');
        } catch (error) {
            showStatus(error.message, 'error');
        }
    });
    
    // Load saved API key
    function loadSavedApiKey() {
        const savedApiKey = localStorage.getItem('googleApiKey');
        if (savedApiKey) {
            googleApiKeyInput.value = savedApiKey;
        }
    }
    
    // Function to toggle theme
    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
        themeToggle.innerHTML = `<span class="material-symbols-rounded">${newTheme === 'dark' ? 'light_mode' : 'dark_mode'}</span>`;
    }
    
    // Initialize theme based on preference
    function initTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        
        document.documentElement.setAttribute('data-theme', theme);
        themeToggle.innerHTML = `<span class="material-symbols-rounded">${theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>`;
    }
    
    // Toggle examples visibility
    function toggleExamples(e) {
        e.stopPropagation();
        isExamplesVisible = !isExamplesVisible;
        
        if (isExamplesVisible) {
            exampleList.classList.remove('hidden');
            examplesToggle.innerHTML = '<span class="material-symbols-rounded">expand_less</span>';
        } else {
            exampleList.classList.add('hidden');
            examplesToggle.innerHTML = '<span class="material-symbols-rounded">expand_more</span>';
        }
        
        localStorage.setItem(STORAGE_KEYS.EXAMPLES_VISIBLE, isExamplesVisible);
    }
    
    function updateConnectionStatus(status, modelInfo = '') {
        statusIndicator.className = 'status-indicator ' + status;
        modelName.textContent = status === STATUS.CONNECTED ? modelInfo : 
                              status === STATUS.CONNECTING ? UI_MESSAGES.STATUS.CONNECTING : 
                              UI_MESSAGES.STATUS.DISCONNECTED;
        retryButton.style.display = status === STATUS.DISCONNECTED ? 'inline' : 'none';
    }
    
    // Function to load models
    async function loadModels() {
        updateConnectionStatus(STATUS.CONNECTING);
        
        try {
            // Get available models
            availableModels = await parser.getAvailableModels();
            
            if (availableModels.length > 0) {
                // Show model selector
                populateModelSelector(availableModels);
                modelSelector.style.display = 'block';
                
                // Get saved preference or use Gemini as default
                const preferredModel = localStorage.getItem(STORAGE_KEYS.PREFERRED_MODEL) || MODELS.GEMINI;
                let modelToUse = availableModels.some(m => m.name === preferredModel) 
                    ? preferredModel 
                    : MODELS.GEMINI;
                
                const selectedModelData = availableModels.find(m => m.name === modelToUse);
                modelSelect.value = modelToUse;
                
                // If it's Gemini, check for saved API key
                if (modelToUse === MODELS.GEMINI) {
                    const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
                    if (savedApiKey) {
                        await parser.setModel(modelToUse, savedApiKey);
                        updateConnectionStatus(STATUS.CONNECTED, `Google ${modelToUse}`);
                    } else {
                        googleApiKeyContainer.style.display = 'block';
                        updateConnectionStatus(STATUS.DISCONNECTED);
                        showStatus(UI_MESSAGES.ERRORS.NO_API_KEY, 'error');
                    }
                } else {
                    await parser.setModel(modelToUse);
                    updateConnectionStatus(parser.getStatus(), `${modelToUse} (${selectedModelData.size})`);
                }
            } else {
                updateConnectionStatus(STATUS.DISCONNECTED);
                showStatus(UI_MESSAGES.ERRORS.NO_MODELS, 'error');
            }
        } catch (error) {
            console.error('Error loading models:', error);
            updateConnectionStatus(STATUS.DISCONNECTED);
            showStatus(error.message, 'error');
            retryButton.style.display = 'inline';
        }
    }
    
    // Populate model selector dropdown
    function populateModelSelector(models) {
        // Clear existing options
        modelSelect.innerHTML = '';
        // Get saved preference
        // Add options for each model
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.type === 'google' 
                ? `${model.name} (Google AI Studio)` 
                : `${model.name} (${model.size})`;
            modelSelect.appendChild(option);
        });
    }
    
    // Function to show status message
    function showStatus(message, type = '') {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message';
        
        if (type) {
            statusMessage.classList.add(type);
        }
        
        // Clear success messages after a delay
        if (type === 'success') {
            setTimeout(() => {
                if (statusMessage.classList.contains('success')) {
                    statusMessage.textContent = '';
                    statusMessage.className = 'status-message';
                }
            }, 5000);
        }
    }
    
    // Function to create event
    async function createEvent() {
        const eventText = eventInput.value.trim();
        if (!eventText) {
            showStatus(UI_MESSAGES.ERRORS.NO_EVENT_DETAILS, 'error');
            return;
        }

        try {
            // Update UI state
            createEventButton.disabled = true;
            createEventButton.innerHTML = '<span class="material-symbols-rounded">hourglass_top</span> Processing...';
            showStatus(UI_MESSAGES.STATUS.PROCESSING, '');
            
            // Get calendar URL from parser
            const calendarUrl = await parser.parseEvent(eventText);
            showStatus(UI_MESSAGES.SUCCESS.EVENT_CREATED, 'success');
            window.open(calendarUrl, '_blank');
        } catch (error) {
            console.error('Error creating event:', error);
            showStatus(error.message, 'error');
        } finally {
            createEventButton.disabled = false;
            createEventButton.innerHTML = '<span class="material-symbols-rounded">calendar_add_on</span> Create Event';
        }
    }

    // Copy install command
    copyInstallCommand.addEventListener('click', () => {
        navigator.clipboard.writeText('npm install @langchain/google-genai')
            .then(() => {
                copyInstallCommand.innerHTML = '<span class="material-symbols-rounded">check</span>';
                setTimeout(() => {
                    copyInstallCommand.innerHTML = '<span class="material-symbols-rounded">content_copy</span>';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    });
}); 