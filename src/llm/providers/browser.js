import { pipeline, env } from '@xenova/transformers';
import { ModelInterface } from "../interfaces.js";

env.allowLocalModels = false;
// Only use browser cache if we are in a browser environment
env.useBrowserCache = typeof window !== 'undefined' && typeof window.caches !== 'undefined';

export class BrowserProvider extends ModelInterface {
    constructor(config) {
        super(config);
        this.pipe = null;
        this.status = 'disconnected';
    }

    async initialize() {
        if (this.status === 'connected') return;
        try {
            this.status = 'connecting';
            const modelName = this.config.modelName || 'Xenova/LaMini-Flan-T5-248M';
            this.pipe = await pipeline('text2text-generation', modelName);
            this.status = 'connected';
        } catch (error) {
             this.status = 'disconnected';
             console.error("Browser Model Init Error:", error);
             throw error;
        }
    }

    async generate(prompt) {
         if (this.status !== 'connected') await this.initialize();
         const output = await this.pipe(prompt, { 
             max_new_tokens: 512,
             temperature: 0,
             do_sample: false 
         });
         return output[0].generated_text;
    }

    async generateStructured(prompt, schema) {
        // Transformers.js doesn't natively support structured output like cloud APIs.
        // We append a JSON instruction and parse the result.
        const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY raw JSON matching this schema: ${JSON.stringify(schema)}`;
        const text = await this.generate(jsonPrompt);
        
        try {
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
            }
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse browser model structured output:", text);
            throw new Error("Model failed to return valid JSON");
        }
    }
    
    getStatus() {
        return { 
            status: this.status, 
            message: this.status === 'connected' ? `Loaded ${this.config.modelName} (Browser)` : 'Disconnected' 
        };
    }
}
