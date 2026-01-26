import { spawn } from 'child_process';
import fetch from 'node-fetch';

export class ProviderController {
    constructor() {
        this.ollamaProcess = null;
        this.startedOllama = false;
        this.ollamaSpawnError = null;
        this.ollamaExitInfo = null;
    }

    async checkOllama() {
        try {
            const res = await fetch('http://localhost:11434/api/version');
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    async startOllama() {
        console.log('--- Checking Ollama Service ---');
        if (await this.checkOllama()) {
            console.log('Ollama already running.');
            return true;
        }

        console.log('Starting Ollama process...');
        this.ollamaProcess = spawn('ollama', ['serve'], {
            detached: true,
            stdio: 'ignore'
        });
        this.ollamaProcess.unref();
        this.startedOllama = true;
        this.ollamaSpawnError = null;
        this.ollamaExitInfo = null;

        this.ollamaProcess.on('error', (error) => {
            this.ollamaSpawnError = error;
        });

        this.ollamaProcess.on('exit', (code, signal) => {
            this.ollamaExitInfo = { code, signal };
        });

        let retries = 15;
        while (retries > 0) {
            if (this.ollamaSpawnError) {
                throw new Error(`Failed to spawn Ollama: ${this.ollamaSpawnError.message}`);
            }
            if (this.ollamaExitInfo) {
                throw new Error(`Ollama exited early (code ${this.ollamaExitInfo.code}, signal ${this.ollamaExitInfo.signal}).`);
            }
            if (await this.checkOllama()) return true;
            await new Promise(r => setTimeout(r, 1000));
            retries--;
        }
        throw new Error('Ollama failed to start or become ready in time.');
    }

    async ensureModel(modelName, { requireExisting = false } = {}) {
        const res = await fetch('http://localhost:11434/api/tags');
        if (!res.ok) {
            throw new Error('Failed to read Ollama model list.');
        }
        const data = await res.json();
        const models = Array.isArray(data.models) ? data.models : [];
        if (!models.some(m => m.name.startsWith(modelName))) {
            if (requireExisting) {
                throw new Error(`Ollama model ${modelName} missing. Disable TEST_REQUIRE_MODEL_PULL to auto-pull.`);
            }
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

    async startLMStudio() {
        if (await this.checkLMStudio()) return true;
        if (process.env.TEST_RUN_LMSTUDIO === 'true') {
            throw new Error('LM Studio auto-start is not supported. Start it manually.');
        }
        throw new Error('LM Studio not reachable at http://localhost:1234/v1/models.');
    }

    async prepareProvider(plan) {
        if (plan.status !== 'ready') return plan;
        if (plan.localType === 'ollama') {
            const shouldStart = process.env.TEST_RUN_OLLAMA === 'true';
            const requireExisting = process.env.TEST_REQUIRE_MODEL_PULL === 'true';
            if (shouldStart) {
                await this.startOllama();
            } else if (!(await this.checkOllama())) {
                throw new Error('Ollama not running. Set TEST_RUN_OLLAMA=true to auto-start.');
            }

            const modelName = plan.modelConfig?.modelName;
            if (modelName) {
                await this.ensureModel(modelName, { requireExisting });
            }
        }

        if (plan.localType === 'lmstudio') {
            await this.startLMStudio();
        }

        return plan;
    }

    async prepareProviders(plans) {
        const results = [];
        for (const plan of plans) {
            if (plan.status !== 'ready') {
                results.push(plan);
                continue;
            }

            try {
                await this.prepareProvider(plan);
                results.push(plan);
            } catch (error) {
                results.push({
                    ...plan,
                    status: 'error',
                    reason: error.message
                });
            }
        }
        return results;
    }

    async stopOllama() {
        if (!this.startedOllama || !this.ollamaProcess?.pid) return;
        if (this.ollamaProcess.exitCode !== null) return;

        const pid = this.ollamaProcess.pid;
        const attempts = [
            () => process.kill(-pid),
            () => process.kill(pid)
        ];

        for (const attempt of attempts) {
            try {
                attempt();
                break;
            } catch (error) {
                if (error.code === 'ESRCH') break;
                if (error.code === 'EPERM') continue;
                throw error;
            }
        }
    }

    async stopLMStudio() {
        return;
    }

    async shutdown() {
        await this.stopOllama();
        await this.stopLMStudio();
    }
}
