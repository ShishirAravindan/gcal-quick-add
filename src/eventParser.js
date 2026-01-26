import { PromptTemplate } from "@langchain/core/prompts";
import { MODEL_OPTIONS, STATUS } from './constants.js';
import { ModelFactory } from './llm/factory.js';
import { EventDetailsSchema } from './llm/schema.js';

const PROMPT_TEMPLATE = `Extract calendar event details from the following text.
Current datetime: {current_datetime}
Current timezone: {current_timezone}

Input text: {input}

Remember:
1. For dates, use one of these formats:
   - Local time (floating): YYYYMMDD'T'HHMMSS (e.g., 20210108T170000)
   - UTC time: YYYYMMDD'T'HHMMSS'Z' (e.g., 20210108T170000Z)
2. Include both start and end time in 'dates' separated by '/'
3. For recurring events, the 'recur' field MUST start with 'RRULE:' prefix.`;

class EventParser {
    constructor() {
        this.currentModel = null;
        this.prompt = PromptTemplate.fromTemplate(PROMPT_TEMPLATE);
    }
    
    getStatus() {
        return this.currentModel ? this.currentModel.getStatus().status : STATUS.DISCONNECTED;
    }
    
    getStatusMessage() {
        return this.currentModel ? this.currentModel.getStatus().message : 'No model selected';
    }

    async setModel(modelId, apiKey = null) {
        const modelConfig = MODEL_OPTIONS.find(m => m.id === modelId);
        if (!modelConfig) throw new Error(`Model ${modelId} not found`);

        const config = { ...modelConfig };
        if (config.type === 'google' || config.type === 'openrouter') {
             config.apiKey = apiKey;
        }

        try {
            this.currentModel = ModelFactory.create(config.type, config);
            await this.currentModel.initialize();
        } catch (error) {
            console.error('Failed to initialize model:', error);
            throw error;
        }
    }

    formatCurrentDateTime() {
        const now = new Date();
        return now.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZoneName: 'short'
        });
    }
    
    getCurrentTimezone() {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    async checkOllamaStatus() {
        try {
            const response = await fetch('http://localhost:11434/api/version');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Ollama server version:', data.version);
            return true;
        } catch (error) {
            console.error('Ollama server is not running:', error);
            return false;
        }
    }
    
    async getAvailableModels() {
        try {
            const response = await fetch('http://localhost:11434/api/tags');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            // Add Ollama models to the list
            const models = data.models.map(model => ({
                name: model.name,
                size: this.formatSize(model.size),
                modified: new Date(model.modified_at).toLocaleDateString(),
                type: 'ollama'
            }));
            
            // Add Gemini model
            models.push({
                name: 'gemini-3.0-flash',
                size: 'Cloud',
                modified: new Date().toLocaleDateString(),
                type: 'google'
            });
            
            return models;
        } catch (error) {
            console.error('Error fetching available models:', error);
            
            // Return just the Gemini model if Ollama is not available
            return [{
                name: 'gemini-3.0-flash',
                size: 'Cloud',
                modified: new Date().toLocaleDateString(),
                type: 'google'
            }];
        }
    }
    
    formatSize(bytes) {
        if (!bytes) return '';
        const gb = bytes / (1024 * 1024 * 1024);
        return `${gb.toFixed(1)}GB`;
    }

    parseOutputToObject(output) {
        const lines = output.split('\n');
        const result = {};
        
        for (const line of lines) {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
                const value = valueParts.join(':').trim();
                result[key.trim()] = value;
            }
        }

        // Validate required fields
        const requiredFields = ['text', 'dates'];
        for (const field of requiredFields) {
            if (!result[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Ensure recur field has RRULE: prefix if present
        if (result.recur && !result.recur.startsWith('RRULE:')) {
            result.recur = `RRULE:${result.recur}`;
        }

        return {
            text: result.text,
            dates: result.dates,
            details: result.details || '',
            location: result.location || '',
            recur: result.recur || ''
        };
    }

    createGoogleCalendarUrl(details) {
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (isIOS) {
            const params = new URLSearchParams({
                action: 'TEMPLATE',
                text: details.text,
                dates: details.dates.replace(/[-:]/g, ''),
                details: details.details || '',
                location: details.location || ''
            });
            if (details.recur) params.append('recur', details.recur);
            return `googlecalendar://calendar/event?${params.toString()}`;
        }
        
        const baseUrl = 'https://calendar.google.com/calendar/render';
        const datesStr = details.dates;
        let ctz = null;
        
        if (!datesStr.includes('Z')) {
            ctz = this.getCurrentTimezone();
        }
        
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: details.text,
            dates: details.dates.replace(/[-:]/g, ''),
            details: details.details || ''
        });

        if (details.location) params.append('location', details.location);
        if (details.recur) params.append('recur', details.recur);
        if (ctz) params.append('ctz', ctz);

        return `${baseUrl}?${params.toString()}`;
    }

    async parseEvent(text) {
        if (!this.currentModel) throw new Error("No model selected or initialized");

        const formattedPrompt = await this.prompt.format({
            input: text,
            current_datetime: this.formatCurrentDateTime(),
            current_timezone: this.getCurrentTimezone()
        });
        
        // Use Structured Output
        const details = await this.currentModel.generateStructured(formattedPrompt, EventDetailsSchema);
        
        // Ensure recur field has RRULE: prefix if present and not already there
        if (details.recur && !details.recur.startsWith('RRULE:')) {
            details.recur = `RRULE:${details.recur}`;
        }

        return this.createGoogleCalendarUrl(details);
    }
}

export default EventParser;