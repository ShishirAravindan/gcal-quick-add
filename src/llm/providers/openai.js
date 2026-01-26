import { ChatOpenAI } from "@langchain/openai";
import { ModelInterface } from "../interfaces.js";

export class OpenAIProvider extends ModelInterface {
    constructor(config) {
        super(config);
        this.client = null;
        this.status = 'disconnected';
    }

    getSafeConfig() {
        const { apiKey, ...rest } = this.config || {};
        return rest;
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

            // Lightweight connectivity check (list models endpoint vs full inference)
            if (this.config.baseUrl) {
                const modelsUrl = this.config.baseUrl.replace(/\/v1\/?$/, '') + '/api/tags';
                const fallbackUrl = this.config.baseUrl + '/models';
                
                try {
                    // Try Ollama-style endpoint first
                    const resp = await fetch(modelsUrl, { method: 'GET' });
                    if (!resp.ok) throw new Error('Ollama endpoint failed');
                } catch {
                    // Fall back to OpenAI-style /models endpoint
                    const resp = await fetch(fallbackUrl, { 
                        method: 'GET',
                        headers: this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}
                    });
                    if (!resp.ok) throw new Error('Server not reachable');
                }
            } else {
                // Cloud API - do a quick inference check
                await this.client.invoke("hi");
            }
            
            this.status = 'connected';
        } catch (error) {
            this.status = 'disconnected';
            console.error("OpenAI-Compatible Init Error:", error);
            console.error("OpenAI-Compatible Init Config:", this.getSafeConfig());
            throw error;
        }
    }

    async generate(prompt) {
         if (this.status !== 'connected') await this.initialize();
         try {
             const response = await this.client.invoke(prompt);
             return response.content;
         } catch (error) {
             console.error("OpenAI-Compatible Generate Error:", error);
             console.error("OpenAI-Compatible Generate Config:", this.getSafeConfig());
             throw error;
         }
    }

    async generateStructured(prompt, schema) {
        if (this.status !== 'connected') await this.initialize();
        try {
            const canUseNativeStructured = typeof this.client.withStructuredOutput === 'function'
                && typeof this.client.bind === 'function';

            if (canUseNativeStructured) {
                const structuredModel = this.client.withStructuredOutput(schema);
                return await structuredModel.invoke(prompt);
            }

            const shape = typeof schema?.shape === 'function'
                ? schema.shape()
                : schema?.shape || schema?._def?.shape?.();
            const keys = shape ? Object.keys(shape) : [];

            const schemaHint = keys.length
                ? `Return ONLY raw JSON with keys: ${keys.join(', ')}.`
                : 'Return ONLY raw JSON matching the expected schema.';
            const jsonPrompt = `${prompt}\n\nIMPORTANT: ${schemaHint}`;
            const text = await this.generate(jsonPrompt);

            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');
            const jsonText = (jsonStart >= 0 && jsonEnd > jsonStart)
                ? text.substring(jsonStart, jsonEnd + 1)
                : text;
            const data = JSON.parse(jsonText);

            if (schema?.safeParse) {
                const parsed = schema.safeParse(data);
                if (!parsed.success) {
                    throw new Error('Structured output failed schema validation.');
                }
                return parsed.data;
            }

            return data;
        } catch (error) {
            console.error("OpenAI-Compatible Structured Error:", error);
            console.error("OpenAI-Compatible Structured Config:", this.getSafeConfig());
            throw error;
        }
    }

    getStatus() {
        return { 
            status: this.status, 
            message: this.status === 'connected' ? `Connected to ${this.config.modelName}` : 'Disconnected' 
        };
    }
}
