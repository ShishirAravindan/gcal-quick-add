import { ChatOllama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MODELS, STATUS } from './constants.js';

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
    constructor(modelName = MODELS.GEMINI) {
        this.modelName = modelName;
        this.googleApiKey = null;
        this.prompt = PromptTemplate.fromTemplate(PROMPT_TEMPLATE);
        this.model = null;
        this.status = STATUS.DISCONNECTED;
    }
    
    getStatus() {
        return this.status;
    }

    async initModel() {
        try {
            this.status = STATUS.CONNECTING;
            
            if (this.modelName === MODELS.GEMINI) {
                if (!this.googleApiKey) {
                    this.status = STATUS.DISCONNECTED;
                    throw new Error("Google API key is required for Gemini models");
                }
                
                console.log(`Initializing with Google model: ${this.modelName}`);
                
                this.model = new ChatGoogleGenerativeAI({
                    modelName: this.modelName,
                    apiKey: this.googleApiKey,
                    temperature: 0,
                });
                
                // Test the connection with a minimal prompt
                await this.model.invoke("Hello");
                this.status = STATUS.CONNECTED;
            } else {
                console.log(`Initializing with Ollama model: ${this.modelName}`);
                
                const isOllamaRunning = await this.checkOllamaStatus();
                if (!isOllamaRunning) {
                    this.status = STATUS.DISCONNECTED;
                    throw new Error('Ollama server is not running');
                }
                
                this.model = new ChatOllama({
                    baseUrl: "http://localhost:11434",
                    model: this.modelName,
                    temperature: 0,
                    streaming: false,
                });
                
                this.status = STATUS.CONNECTED;
            }
        } catch (error) {
            this.status = STATUS.DISCONNECTED;
            console.error('Model initialization failed:', error);
            throw error;
        }
    }
    
    async setModel(modelName, apiKey = null) {
        this.modelName = modelName;
        
        if (modelName === MODELS.GEMINI) {
            this.googleApiKey = apiKey;
        }
        
        await this.initModel();
        console.log(`Switched to model: ${modelName}`);
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
        // Get the local timezone
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
                name: 'gemini-2.0-flash',
                size: 'Cloud',
                modified: new Date().toLocaleDateString(),
                type: 'google'
            });
            
            return models;
        } catch (error) {
            console.error('Error fetching available models:', error);
            
            // Return just the Gemini model if Ollama is not available
            return [{
                name: 'gemini-2.0-flash',
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
        // Check if running on iOS device
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (isIOS) {
            // iOS calendar format using webcal protocol
            return `webcal://calendar.google.com/calendar/ical/${encodeURIComponent(details.text)}.ics?${new URLSearchParams({
                action: 'TEMPLATE',
                text: details.text,
                dates: details.dates.replace(/[-:]/g, ''),
                details: details.details,
                location: details.location || '',
                recur: details.recur || ''
            }).toString()}`;
        }
        
        return this.createWebCalendarUrl(details);
    }

    createWebCalendarUrl(details) {
        const baseUrl = 'https://calendar.google.com/calendar/render';
        
        // Parse the dates to determine if they include timezone information
        const datesStr = details.dates;
        let ctz = null;
        
        // If the dates don't include 'Z' (UTC marker), add the local timezone
        if (!datesStr.includes('Z')) {
            ctz = this.getCurrentTimezone();
        }
        
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: details.text,
            dates: details.dates.replace(/[-:]/g, ''),  // Remove any extra formatting
            details: details.details
        });

        if (details.location) {
            params.append('location', details.location);
        }

        if (details.recur) {
            params.append('recur', details.recur);
        }
        
        // Add timezone parameter if needed
        if (ctz) {
            params.append('ctz', ctz);
        }

        return `${baseUrl}?${params.toString()}`;
    }

    async parseEvent(text) {
        try {
            // Initialize model if not already done
            if (!this.model) {
                await this.initModel();
            }
            
            // For Ollama models, verify Ollama is running
            if (this.modelName !== MODELS.GEMINI) {
                const isOllamaRunning = await this.checkOllamaStatus();
                if (!isOllamaRunning) {
                    throw new Error('Ollama server is not running. Please start Ollama first.');
                }
            }

            console.log(`Parsing event text with model ${this.modelName}:`, text);
            
            // Get the formatted prompt with current datetime and timezone
            const formattedPrompt = await this.prompt.invoke({
                input: text,
                current_datetime: this.formatCurrentDateTime(),
                current_timezone: this.getCurrentTimezone()
            });
            console.debug('Formatted prompt:', formattedPrompt);
            
            // Get model's response
            const response = await this.model.invoke(formattedPrompt);
            console.debug('Model response:', response);
            
            // Parse the response into an object
            const details = this.parseOutputToObject(response.content);
            console.debug('Parsed details:', details);
            
            // Create the calendar URL
            const calendarUrl = this.createGoogleCalendarUrl(details);
            console.debug('Calendar URL:', calendarUrl);
            
            return calendarUrl;
        } catch (error) {
            console.error('Error parsing event:', error);
            throw new Error(`Failed to parse event details: ${error.message}`);
        }
    }
}

export default EventParser; 