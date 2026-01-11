import { GoogleProvider } from "./providers/google.js";
import { OpenAIProvider } from "./providers/openai.js";
import { BrowserProvider } from "./providers/browser.js";

export class ModelFactory {
    static create(type, config) {
        switch (type) {
            case 'google':
                return new GoogleProvider(config);
            case 'ollama':
            case 'local': 
            case 'openai': 
            case 'openrouter':
            case 'lmstudio':
                return new OpenAIProvider(config);
            case 'browser':
                return new BrowserProvider(config);
            default:
                throw new Error(`Unknown model type: ${type}`);
        }
    }
}