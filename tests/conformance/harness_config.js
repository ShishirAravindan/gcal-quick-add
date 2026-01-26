import { MODEL_OPTIONS } from '../../src/constants.js';

const PROVIDER_DEFS = {
    browser: {
        label: 'In-Browser',
        modelId: 'browser-t5'
    },
    gemini: {
        label: 'Google Cloud',
        modelId: 'gemini-3-flash-preview',
        envKey: 'TEST_GEMINI_KEY'
    },
    openrouter: {
        label: 'OpenRouter',
        modelId: 'openrouter-auto',
        envKey: 'TEST_OPENROUTER_KEY'
    },
    ollama: {
        label: 'Ollama Local',
        modelId: 'ollama-llama3',
        localType: 'ollama'
    },
    lmstudio: {
        label: 'LM Studio',
        modelId: 'lmstudio-local',
        localType: 'lmstudio'
    }
};

function parseProviders(value) {
    if (!value) return [];
    return value
        .split(',')
        .map(entry => entry.trim().toLowerCase())
        .filter(Boolean);
}

function findModelConfig(modelId) {
    return MODEL_OPTIONS.find(model => model.id === modelId) || null;
}

export function getProviderPlans() {
    const requested = parseProviders(process.env.TEST_PROVIDERS);
    const unknown = requested.filter(name => !PROVIDER_DEFS[name]);
    const plans = requested
        .filter(name => PROVIDER_DEFS[name])
        .map(name => {
            const def = PROVIDER_DEFS[name];
            const modelConfig = findModelConfig(def.modelId);
            if (!modelConfig) {
                return {
                    id: name,
                    label: def.label,
                    modelId: def.modelId,
                    status: 'error',
                    reason: `Model ${def.modelId} not found in MODEL_OPTIONS`
                };
            }

            const apiKey = def.envKey ? process.env[def.envKey] : null;
            if (def.envKey && !apiKey) {
                return {
                    id: name,
                    label: def.label,
                    modelId: def.modelId,
                    status: 'error',
                    reason: `Missing ${def.envKey}`
                };
            }

            return {
                id: name,
                label: def.label,
                modelId: def.modelId,
                modelConfig,
                apiKey,
                localType: def.localType || null,
                status: 'ready'
            };
        });

    return { requested, plans, unknown };
}
