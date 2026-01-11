import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import EventParser from '../../src/eventParser.js';
import { ProviderController } from './provider_controller.js';
import { MODEL_OPTIONS } from '../../src/constants.js';
import { GOLDEN_DATASET } from './golden_dataset.js';

const RUN_OLLAMA = process.env.RUN_OLLAMA === 'true';
const RUN_LMSTUDIO = process.env.RUN_LMSTUDIO === 'true';
const GEMINI_KEY = process.env.GCAL_TEST_GEMINI_KEY;

describe('Cross-Provider Conformance Matrix', () => {
    const controller = new ProviderController();
    const parser = new EventParser();

    beforeAll(async () => {
        if (RUN_OLLAMA) {
            await controller.startOllama();
            await controller.ensureModel('llama3');
        }
    }, 120000);

    const runTestsForProvider = (providerName, modelId, apiKey = null) => {
        describe(`Provider: ${providerName}`, () => {
            it(`should pass golden dataset for ${modelId}`, async () => {
                await parser.setModel(modelId, apiKey);
                
                for (const tc of GOLDEN_DATASET) {
                    console.log(`[${providerName}] Testing: ${tc.input}`);
                    try {
                        const url = await parser.parseEvent(tc.input);
                        const params = new URLSearchParams(url.split('?')[1]);
                        
                        const result = {
                            text: params.get('text'),
                            dates: params.get('dates'),
                            location: params.get('location'),
                            recur: params.get('recur')
                        };

                        if (tc.expected.text) expect(result.text).toMatch(tc.expected.text);
                        if (tc.expected.dates) expect(result.dates).toMatch(tc.expected.dates);
                        if (tc.expected.location) expect(result.location).toMatch(tc.expected.location);
                        if (tc.expected.recur) expect(result.recur).toMatch(tc.expected.recur);
                        if (tc.expected.custom) {
                            const isValid = tc.expected.custom(result);
                            expect(isValid, `Custom validation failed for ${tc.name}`).toBe(true);
                        }
                    } catch (e) {
                        throw new Error(`Failed test case "${tc.name}": ${e.message}`);
                    }
                }
            }, 60000);
        });
    };

    // 1. Browser (Transformers.js)
    runTestsForProvider('In-Browser', 'browser-t5');

    // 2. Google Gemini (if key provided)
    if (GEMINI_KEY) {
        runTestsForProvider('Google Cloud', 'gemini-3-flash-preview', GEMINI_KEY);
    }

    // 2. Ollama (if enabled)
    if (RUN_OLLAMA) {
        runTestsForProvider('Ollama Local', 'ollama-llama3');
    }

    // 3. LM Studio (if enabled)
    if (RUN_LMSTUDIO) {
        runTestsForProvider('LM Studio', 'lmstudio-local');
    }

    afterAll(async () => {
        if (RUN_OLLAMA) {
            await controller.stopOllama();
        }
    });
});