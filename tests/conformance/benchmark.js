import 'dotenv/config';
import EventParser from '../../src/eventParser.js';
import { GOLDEN_DATASET } from './golden_dataset.js';
import { ProviderController } from './provider_controller.js';
import { getProviderPlans } from './harness_config.js';
import { parseCalendarUrl, evaluateCase } from './case_validation.js';
import { computeLatencyStats, writeReport } from './reporting.js';

const { requested, plans, unknown } = getProviderPlans();
if (requested.length === 0) {
    console.error('TEST_PROVIDERS not set. Use a bench script or set TEST_PROVIDERS manually.');
    process.exit(1);
}

async function runBenchmark() {
    const warnings = [];
    if (unknown.length) {
        warnings.push(`Unknown providers in TEST_PROVIDERS: ${unknown.join(', ')}`);
    }

    const controller = new ProviderController();
    const parser = new EventParser();
    const results = [];
    let hadErrors = false;
    let reportPath = null;

    try {
        if (warnings.length) {
            warnings.forEach(message => console.warn(message));
        }

        const prepared = await controller.prepareProviders(plans);
        const runnable = prepared.filter(plan => plan.status === 'ready');
        const preflightErrors = prepared.filter(plan => plan.status === 'error');

        if (preflightErrors.length) {
            hadErrors = true;
            preflightErrors.forEach(plan => {
                console.error(`❌ Provider preflight failed: ${plan.label} (${plan.id}) - ${plan.reason}`);
            });
        }

        console.log(`\n🚀 Starting GCal Quick Add Benchmark (${runnable.length} providers, ${GOLDEN_DATASET.length} cases each)\n`);

        for (const plan of prepared) {
            if (plan.status !== 'ready') {
                results.push({
                    id: plan.id,
                    name: plan.label,
                    modelId: plan.modelId,
                    status: plan.status,
                    reason: plan.reason || 'Preflight failed',
                    cases: [],
                    metrics: {
                        passRate: 0,
                        passed: 0,
                        totalCases: GOLDEN_DATASET.length,
                        avgLatencyMs: 0,
                        p95LatencyMs: 0,
                        minLatencyMs: 0,
                        maxLatencyMs: 0
                    }
                });
                continue;
            }

            console.log(`--------------------------------------------------`);
            console.log(`📊 Evaluating Provider: ${plan.label} (${plan.id})`);
            console.log(`--------------------------------------------------`);

            let passed = 0;
            const latencies = [];
            const providerEval = {
                id: plan.id,
                name: plan.label,
                modelId: plan.modelId,
                status: plan.status,
                reason: null,
                cases: []
            };

            try {
                await parser.setModel(plan.modelConfig.id, plan.apiKey, plan.modelConfig.modelName);
            } catch (e) {
                hadErrors = true;
                providerEval.status = 'error';
                providerEval.reason = `Model init failed: ${e.message}`;
                results.push(providerEval);
                console.error(`❌ Failed to initialize model: ${e.message}`);
                continue;
            }

            for (const tc of GOLDEN_DATASET) {
                const start = Date.now();
                let result = null;
                let error = null;
                let evaluation = { success: false, failures: ['exception'] };

                try {
                    const url = await parser.parseEvent(tc.input);
                    result = parseCalendarUrl(url);
                    evaluation = evaluateCase(tc, result);
                } catch (e) {
                    error = e.message;
                }

                const latency = Date.now() - start;
                latencies.push(latency);
                if (evaluation.success) passed++;

                console.log(`${evaluation.success ? '✅' : '❌'} ${tc.name.padEnd(25)} | ${latency}ms`);

                providerEval.cases.push({
                    name: tc.name,
                    input: tc.input,
                    success: evaluation.success,
                    failures: evaluation.failures,
                    latencyMs: latency,
                    result,
                    error
                });
            }

            const latencyStats = computeLatencyStats(latencies);
            const score = GOLDEN_DATASET.length ? Number(((passed / GOLDEN_DATASET.length) * 100).toFixed(2)) : 0;

            console.log(`\n✨ Final Score: ${score}% | Avg Latency: ${latencyStats.avgMs}ms\n`);

            providerEval.metrics = {
                passRate: score,
                passed,
                totalCases: GOLDEN_DATASET.length,
                avgLatencyMs: latencyStats.avgMs,
                p95LatencyMs: latencyStats.p95Ms,
                minLatencyMs: latencyStats.minMs,
                maxLatencyMs: latencyStats.maxMs
            };
            results.push(providerEval);
        }
    } finally {
        await controller.shutdown();
        reportPath = writeReport({
            runType: 'benchmark',
            datasetCount: GOLDEN_DATASET.length,
            providers: results,
            warnings
        });
        console.log(`💾 Benchmark report saved to ${reportPath}`);
        if (hadErrors) process.exitCode = 1;
    }
}

runBenchmark().catch(console.error);
