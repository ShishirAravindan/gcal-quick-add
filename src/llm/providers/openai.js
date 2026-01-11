import { ChatOpenAI } from "@langchain/openai";
import { ModelInterface } from "../interfaces.js";

export class OpenAIProvider extends ModelInterface {
    constructor(config) {
        super(config);
        this.client = null;
        this.status = 'disconnected';
    }

    async initialize() {
        try {
            this.status = 'connecting';
            
            this.client = new ChatOpenAI({
                configuration: {
                    baseURL: this.config.baseUrl,
                },
                modelName: this.config.modelName,
                temperature: 0,
                // Use provided key, or dummy if not needed (Ollama/LM Studio)
                apiKey: this.config.apiKey || 'not-needed', 
            });

            // Quick connectivity check
            await this.client.invoke("hi");
            this.status = 'connected';
        } catch (error) {
            this.status = 'disconnected';
            console.error("OpenAI-Compatible Init Error:", error);
            throw error;
        }
    }

    async generate(prompt) {
         if (this.status !== 'connected') await this.initialize();
         const response = await this.client.invoke(prompt);
         return response.content;
    }

    async generateStructured(prompt, schema) {
        if (this.status !== 'connected') await this.initialize();
        const structuredModel = this.client.withStructuredOutput(schema);
        return await structuredModel.invoke(prompt);
    }

    getStatus() {
        return { 
            status: this.status, 
            message: this.status === 'connected' ? `Connected to ${this.config.modelName}` : 'Disconnected' 
        };
    }
}