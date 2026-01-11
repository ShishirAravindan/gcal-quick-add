import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { ModelInterface } from "../interfaces.js";

export class LocalProvider extends ModelInterface {
    constructor(config) {
        super(config);
        this.client = null;
        this.status = 'disconnected';
    }

    async initialize() {
        try {
            this.status = 'connecting';
            
            if (this.config.type === 'ollama') {
                 // Ollama Specific
                 this.client = new ChatOllama({
                    baseUrl: this.config.baseUrl || "http://localhost:11434",
                    model: this.config.modelName,
                    temperature: 0,
                });
                
                // Validate Ollama connection
                try {
                    const res = await fetch(`${this.config.baseUrl || "http://localhost:11434"}/api/version`);
                    if (!res.ok) throw new Error("Ollama not reachable");
                } catch (e) {
                    throw new Error("Ollama server is not running or unreachable");
                }

            } else {
                // OpenAI Compatible (LM Studio, OpenRouter)
                 const config = {
                    configuration: {
                        baseURL: this.config.baseUrl,
                    },
                    modelName: this.config.modelName,
                    temperature: 0,
                    // OpenRouter/LM Studio often need an API key, even if dummy
                    apiKey: this.config.apiKey || 'lm-studio', 
                };
                
                if (this.config.type === 'openrouter') {
                     // OpenRouter might need specific headers if requested, but usually standard OpenAI compatible
                     // Ensure base URL is correct for OpenRouter if not passed explicitly?
                     // Usually passed in config.baseUrl
                }
                
                this.client = new ChatOpenAI(config);
            }

            // Test connection
            await this.client.invoke("hi");
            this.status = 'connected';
        } catch (error) {
            this.status = 'disconnected';
            console.error("Local/OpenAI Init Error:", error);
            throw error;
        }
    }

    async generate(prompt) {
         if (this.status !== 'connected') await this.initialize();
         const response = await this.client.invoke(prompt);
         return response.content;
    }

    getStatus() {
        return { 
            status: this.status, 
            message: this.status === 'connected' ? `Connected to ${this.config.modelName}` : 'Disconnected' 
        };
    }
}