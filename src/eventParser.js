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