import 'dotenv/config';
import EventParser from '../../src/eventParser.js';
import { GOLDEN_DATASET } from './golden_dataset.js';
import { MODEL_OPTIONS } from '../../src/constants.js';
import fs from 'fs';
import path from 'path';

async function runBenchmark() {
    const parser = new EventParser();
    const results = [];
    
    // Determine which models to test based on environment
    const enabledModels = MODEL_OPTIONS.filter(m => {
        if (m.type === 'google' && !process.env.GCAL_TEST_GEMINI_KEY) return false;
        if (m.type === 'ollama' && process.env.RUN_OLLAMA !== 'true') return false;
        return true; 
    });

    console.log(`\n🚀 Starting GCal Quick Add Benchmark (${enabledModels.length} models, ${GOLDEN_DATASET.length} cases each)\n`);

    for (const modelConfig of enabledModels) {
        console.log(`--------------------------------------------------`);
        console.log(`📊 Evaluating Model: ${modelConfig.name} (${modelConfig.type})`);
        console.log(`--------------------------------------------------`);

        let passed = 0;
        let totalLatency = 0;
        const modelKey = modelConfig.type === 'google' ? process.env.GCAL_TEST_GEMINI_KEY : null;
        
        try {
            await parser.setModel(modelConfig.id, modelKey);
        } catch (e) {
            console.error(`❌ Failed to initialize model: ${e.message}`);
            continue;
        }

        const modelEval = {
            model: modelConfig.name,
            type: modelConfig.type,
            cases: []
        };

        for (const tc of GOLDEN_DATASET) {
            const start = Date.now();
            let result = null;
            let error = null;
            let success = false;

            try {
                const url = await parser.parseEvent(tc.input);
                const params = new URLSearchParams(url.split('?')[1]);
                result = {
                    text: params.get('text'),
                    dates: params.get('dates'),
                    location: params.get('location'),
                    recur: params.get('recur')
                };

                // Validate
                const textOk = !tc.expected.text || tc.expected.text.test(result.text);
                const datesOk = !tc.expected.dates || tc.expected.dates.test(result.dates);
                const recurOk = !tc.expected.recur || tc.expected.recur.test(result.recur);
                const customOk = !tc.expected.custom || tc.expected.custom(result);

                success = textOk && datesOk && recurOk && customOk;
            } catch (e) {
                error = e.message;
            }

            const latency = Date.now() - start;
            totalLatency += latency;
            if (success) passed++;

            console.log(`${success ? '✅' : '❌'} ${tc.name.padEnd(25)} | ${latency}ms`);
            
            modelEval.cases.push({
                name: tc.name,
                input: tc.input,
                success,
                latency,
                result,
                error
            });
        }

        const score = (passed / GOLDEN_DATASET.length) * 100;
        const avgLatency = Math.round(totalLatency / GOLDEN_DATASET.length);
        
        console.log(`\n✨ Final Score: ${score}% | Avg Latency: ${avgLatency}ms\n`);
        
        modelEval.score = score;
        modelEval.avgLatency = avgLatency;
        results.push(modelEval);
    }

    // Save Results
    const dir = './tests/conformance/results';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const fileName = `eval_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(path.join(dir, fileName), JSON.stringify(results, null, 2));
    console.log(`💾 Full report saved to ${dir}/${fileName}`);
}

runBenchmark().catch(console.error);
