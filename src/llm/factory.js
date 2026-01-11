import { GoogleProvider } from "./providers/google.js";
import { LocalProvider } from "./providers/local.js";
import { BrowserProvider } from "./providers/browser.js";

export class ModelFactory {
    static create(type, config) {
        switch (type) {
            case 'google':
                return new GoogleProvider(config);
            case 'ollama':
            case 'local': 
            case 'openai': // Generic OpenAI compatible
            case 'openrouter':
            case 'lmstudio':
                return new LocalProvider({ ...config, type });
            case 'browser':
                return new BrowserProvider(config);
            default:
                throw new Error(`Unknown model type: ${type}`);
        }
    }
}