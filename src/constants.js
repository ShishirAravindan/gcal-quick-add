export const MODELS = {
    GEMINI: 'gemini-2.0-flash'
};

export const STATUS = {
    CONNECTED: 'connected',
    CONNECTING: 'connecting',
    DISCONNECTED: 'disconnected'
};

export const STORAGE_KEYS = {
    THEME: 'theme',
    API_KEY: 'googleApiKey',
    PREFERRED_MODEL: 'preferredModel',
    EXAMPLES_VISIBLE: 'examplesVisible'
};

export const UI_MESSAGES = {
    ERRORS: {
        NO_API_KEY: 'Please enter your Google API key',
        NO_EVENT_DETAILS: 'Please enter event details',
        NO_MODELS: 'No models found. Please install at least one model.',
        INVALID_API_KEY: 'Please enter a valid API key',
        OLLAMA_NOT_RUNNING: 'Ollama server is not running. Please start Ollama first.'
    },
    SUCCESS: {
        MODEL_SWITCHED: (model) => `Switched to model: ${model}`,
        API_KEY_SAVED: 'Google API key saved and model initialized',
        EVENT_CREATED: 'Event created! Opening Google Calendar...'
    },
    STATUS: {
        PROCESSING: 'Processing your request...',
        CHECKING_MODELS: 'Checking models...',
        CONNECTING: 'Connecting...',
        DISCONNECTED: 'Disconnected'
    }
}; 