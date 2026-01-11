import { PromptTemplate } from "@langchain/core/prompts";
import { MODEL_OPTIONS, STATUS } from './constants.js';
import { ModelFactory } from './llm/factory.js';

const PROMPT_TEMPLATE = `Extract calendar event details from the following text.
Current datetime: {current_datetime}
Current timezone: {current_timezone}

Format the output EXACTLY as shown, with one detail per line:
text: One-line summary of the event
dates: Event start and finish times in RFC 5545 format (e.g., "20210108T170000Z/20210108T190000Z" for UTC or "20210108T170000/20210108T190000" for floating local time)
details: Longer event description (exclude information used elsewhere)
location: Intended venue for the activity
recur: [Optional] Recurrence pattern as RFC5545 RRULE (must start with 'RRULE:' prefix, e.g., "RRULE:FREQ=WEEKLY;UNTIL=20210331T000000Z")

Example outputs:

1. "Team meeting tomorrow at 2pm for 1 hour":
text: Team Meeting
dates: 20240109T140000/20240109T150000
details: Regular team sync meeting
location: online

2. "Weekly team standup every Monday at 10am for 30min until end of March":
text: Weekly Team Standup
dates: 20240108T100000/20240108T103000
details: Regular weekly team standup meeting
location: online
recur: RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20240331T235959Z

3. "Yoga class every Tuesday and Thursday at 7am for 1 hour":
text: Yoga Class
dates: 20240109T070000/20240109T080000
details: Regular yoga fitness class
location: Fitness Studio
recur: RRULE:FREQ=WEEKLY;BYDAY=TU,TH

Input text: {input}

Remember:
1. Use the current datetime and timezone above when converting relative dates
2. For dates, use one of these formats:
   - Local time (floating): YYYYMMDD'T'HHMMSS (e.g., 20210108T170000)
   - UTC time: YYYYMMDD'T'HHMMSS'Z' (e.g., 20210108T170000Z)
3. Include both start and end time in 'dates' separated by '/'
4. If a specific timezone is mentioned in the input, adjust the time accordingly
5. Keep the 'text' field concise
6. Use 'details' for any additional context
7. For recurring events:
   - MUST start with 'RRULE:' prefix
   - FREQ can be: DAILY, WEEKLY, MONTHLY, or YEARLY
   - BYDAY uses: MO,TU,WE,TH,FR,SA,SU
   - UNTIL must be in UTC format with Z suffix
   - Multiple rules are separated by semicolon
   - Common patterns:
     * Every weekday: RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
     * Monthly on specific date: RRULE:FREQ=MONTHLY;BYMONTHDAY=15
     * Weekly on specific days: RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR`;

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

        console.log(`Switching to model: ${config.name} (${config.type})`);
        
        try {
            this.currentModel = ModelFactory.create(config.type, config);
            await this.currentModel.initialize();
            console.log(`Successfully initialized ${config.name}`);
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

        const requiredFields = ['text', 'dates'];
        for (const field of requiredFields) {
            if (!result[field]) {
                try {
                    const jsonStart = output.indexOf('{');
                    const jsonEnd = output.lastIndexOf('}');
                    if (jsonStart >= 0 && jsonEnd > jsonStart) {
                         const json = JSON.parse(output.substring(jsonStart, jsonEnd + 1));
                         if (json.text && json.dates) return json;
                    }
                } catch(e) {}
                
                throw new Error(`Missing required field: ${field}`);
            }
        }

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
                details: details.details,
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
            details: details.details
        });

        if (details.location) params.append('location', details.location);
        if (details.recur) params.append('recur', details.recur);
        if (ctz) params.append('ctz', ctz);

        return `${baseUrl}?${params.toString()}`;
    }

    async parseEvent(text) {
        if (!this.currentModel) {
            throw new Error("No model selected or initialized");
        }

        console.log(`Parsing event text with model ${this.currentModel.name}:`, text);
        
        const formattedPrompt = await this.prompt.invoke({
            input: text,
            current_datetime: this.formatCurrentDateTime(),
            current_timezone: this.getCurrentTimezone()
        });
        
        const promptString = formattedPrompt.toString();
        
        const responseText = await this.currentModel.generate(promptString);
        console.debug('Model response:', responseText);
        
        const details = this.parseOutputToObject(responseText);
        return this.createGoogleCalendarUrl(details);
    }
}

export default EventParser;