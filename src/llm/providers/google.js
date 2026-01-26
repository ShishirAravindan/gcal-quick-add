import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ModelInterface } from "../interfaces.js";

export class GoogleProvider extends ModelInterface {
    constructor(config) {
        super(config);
        this.model = null;
        this.status = 'disconnected';
    }

    async initialize() {
        if (!this.config.apiKey) {
            throw new Error("Google API key is required");
        }
        
        try {
            this.status = 'connecting';
            const modelName = this.config.modelName || this.config.model || 'gemini-3-flash-preview';
            this.model = new ChatGoogleGenerativeAI({
                model: modelName,
                apiKey: this.config.apiKey,
                temperature: 0,
            });

            // Quick connectivity check
            await this.model.invoke("hi");
            this.status = 'connected';
        } catch (error) {
            this.status = 'disconnected';
            console.error("Google/LangChain Init Error:", error);
            throw error;
        }
    }

    async generate(prompt) {
        if (this.status !== 'connected' || !this.model) await this.initialize();
        const response = await this.model.invoke(prompt);
        return response.content;
    }

    async generateStructured(prompt, schema) {
        if (this.status !== 'connected' || !this.model) await this.initialize();
        const structuredModel = this.model.withStructuredOutput(schema);
        return await structuredModel.invoke(prompt);
    }
    
    getStatus() {
        return { 
            status: this.status, 
            message: this.status === 'connected' ? `Connected to ${this.config.modelName}` : 'Disconnected' 
        };
    }
}
