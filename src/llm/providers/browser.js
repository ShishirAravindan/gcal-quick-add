import { pipeline, env } from '@xenova/transformers';
import { ModelInterface } from "../interfaces.js";

// Skip local checks since we are in browser
env.allowLocalModels = false;
env.useBrowserCache = true;

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
            // Default to a small model good for instruction following if not specified
            const modelName = this.config.modelName || 'Xenova/LaMini-Flan-T5-248M';
            
            console.log(`Loading browser model: ${modelName}`);
            
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
    
    getStatus() {
        return { 
            status: this.status, 
            message: this.status === 'connected' ? `Loaded ${this.config.modelName} (Browser)` : 'Disconnected' 
        };
    }
}