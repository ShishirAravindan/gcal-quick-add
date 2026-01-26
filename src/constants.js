export const STATUS = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected'
};

export const MODEL_TYPES = {
    CLOUD: { icon: 'cloud', label: 'Cloud' },
    BROWSER: { icon: 'laptop', label: 'Browser' },
    LOCAL: { icon: 'terminal', label: 'Local' }
};

export const MODEL_OPTIONS = [
    {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3 Flash (Preview)',
        type: 'google',
        servingPattern: 'CLOUD',
        description: 'Fastest Google Cloud Model'
    },
    {
        id: 'gemini-3-pro-preview',
        name: 'Gemini 3 Pro (Preview)',
        type: 'google',
        servingPattern: 'CLOUD',
        description: 'High Intelligence Google Cloud Model'
    },
    {
        id: 'browser-t5',
        name: 'In-Browser (LaMini T5)',
        type: 'browser',
        servingPattern: 'BROWSER',
        modelName: 'Xenova/LaMini-Flan-T5-248M',
        description: 'Runs locally in browser (Private, no setup)'
    },
    {
        id: 'ollama-llama3',
        name: 'Ollama (Llama 3)',
        type: 'ollama',
        servingPattern: 'LOCAL',
        modelName: 'llama3.2-3b',
        baseUrl: 'http://localhost:11434/v1',
        description: 'Local inference via Ollama'
    },
    {
        id: 'lmstudio-local',
        name: 'LM Studio (Local)',
        type: 'lmstudio',
        servingPattern: 'LOCAL',
        modelName: 'local-model',
        baseUrl: 'http://localhost:1234/v1',
        description: 'Local inference via LM Studio'
    },
    {
        id: 'openrouter-auto',
        name: 'OpenRouter (Auto)',
        type: 'openrouter',
        servingPattern: 'CLOUD',
        modelName: 'auto', 
        baseUrl: 'https://openrouter.ai/api/v1',
        description: 'Cloud API Aggregator'
    }
];

export const STORAGE_KEYS = {
    THEME: 'gcal_theme',
    API_KEY: 'gcal_api_key', 
    OPENROUTER_KEY: 'gcal_openrouter_key',
    PREFERRED_MODEL_ID: 'gcal_preferred_model_id',
    EXAMPLES_VISIBLE: 'gcal_examples_visible'
};

export const UI_MESSAGES = {
    STATUS: {
        CONNECTING: 'Connecting...',
        DISCONNECTED: 'Disconnected',
        PROCESSING: 'Processing...'
    },
    ERRORS: {
        NO_API_KEY: 'API Key required',
        INVALID_API_KEY: 'Invalid API Key',
        NO_MODELS: 'No models available',
        NO_EVENT_DETAILS: 'Please enter event details',
        CONNECTION_FAILED: 'Connection failed'
    },
    SUCCESS: {
        EVENT_CREATED: 'Event link created!',
        API_KEY_SAVED: 'API Key saved',
        MODEL_SWITCHED: (name) => `Switched to ${name}`
    }
};