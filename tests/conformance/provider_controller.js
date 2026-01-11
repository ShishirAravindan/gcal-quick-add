import { spawn } from 'child_process';
import fetch from 'node-fetch';

export class ProviderController {
    constructor() {
        this.ollamaProcess = null;
    }

    async startOllama() {
        console.log('--- Checking Ollama Service ---');
        try {
            const res = await fetch('http://localhost:11434/api/version');
            if (res.ok) {
                console.log('Ollama already running.');
                return true;
            }
        } catch (e) {}

        console.log('Starting Ollama process...');
        this.ollamaProcess = spawn('ollama', ['serve'], {
            detached: true,
            stdio: 'ignore'
        });
        this.ollamaProcess.unref();

        let retries = 15;
        while (retries > 0) {
            try {
                const res = await fetch('http://localhost:11434/api/version');
                if (res.ok) return true;
            } catch (e) {}
            await new Promise(r => setTimeout(r, 1000));
            retries--;
        }
        throw new Error('Ollama failed to start. Ensure it is installed and in PATH.');
    }

    async ensureModel(modelName) {
        const res = await fetch('http://localhost:11434/api/tags');
        const data = await res.json();
        if (!data.models.some(m => m.name.startsWith(modelName))) {
            console.log(`Model ${modelName} missing. Pulling...`);
            return new Promise((resolve, reject) => {
                const pull = spawn('ollama', ['pull', modelName], { stdio: 'inherit' });
                pull.on('close', code => code === 0 ? resolve() : reject());
            });
        }
    }

    async checkLMStudio() {
        try {
            const res = await fetch('http://localhost:1234/v1/models');
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    async stopOllama() {
        if (this.ollamaProcess && this.ollamaProcess.pid) {
            try {
                process.kill(-this.ollamaProcess.pid);
            } catch(e) {
                // If already dead or permission issue
                process.kill(this.ollamaProcess.pid);
            }
        }
    }
}