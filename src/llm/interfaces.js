export class ModelInterface {
    constructor(config) {
        this.config = config;
        this.name = config.name || 'Unknown Model';
    }

    async initialize() {
        throw new Error('Method "initialize" must be implemented');
    }

    async generate(prompt) {
        throw new Error('Method "generate" must be implemented');
    }

    getStatus() {
        // Returns { status: 'connected' | 'disconnected' | 'connecting', message: '' }
        throw new Error('Method "getStatus" must be implemented');
    }
}