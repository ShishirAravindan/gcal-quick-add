import 'dotenv/config';
import { describe, it, beforeAll, afterAll } from 'vitest';
import EventParser from '../../src/eventParser.js';
import { ProviderController } from './provider_controller.js';
import { GOLDEN_DATASET } from './golden_dataset.js';
import { getProviderPlans } from './harness_config.js';
import { parseCalendarUrl, evaluateCase } from './case_validation.js';
import { computeLatencyStats, writeReport } from './reporting.js';

const { requested, plans, unknown } = getProviderPlans();
const warnings = [];
if (unknown.length) {
    warnings.push(`Unknown providers in TEST_PROVIDERS: ${unknown.join(', ')}`);
}

if (requested.length === 0) {
    describe('Cross-Provider Conformance Matrix', () => {
        it('requires TEST_PROVIDERS', () => {
            throw new Error('TEST_PROVIDERS not set. Use a conformance script or set TEST_PROVIDERS manually.');
        });
    });
} else {
    describe('Cross-Provider Conformance Matrix', () => {
        const controller = new ProviderController();
        const parser = new EventParser();
        const providerStatuses = new Map();
        const providerResults = new Map();

        beforeAll(async () => {
            if (warnings.length) {
                warnings.forEach(message => console.warn(message));
            }
            const prepared = await controller.prepareProviders(plans);
            prepared.forEach(plan => providerStatuses.set(plan.id, plan));
        }, 300000);

        const runTestsForProvider = (plan) => {
            describe(`Provider: ${plan.label}`, () => {
                it(`should pass golden dataset for ${plan.modelId}`, async () => {
                    const status = providerStatuses.get(plan.id) || plan;
                    const latencies = [];
                    const providerEval = {
                        id: plan.id,
                        name: plan.label,
                        modelId: plan.modelId,
                        status: status.status,
                        reason: status.reason || null,
                        cases: []
                    };

                    let passed = 0;
                    try {
                        if (status.status === 'error') {
                            throw new Error(`Provider preflight failed: ${status.reason}`);
                        }

                        try {
                            await parser.setModel(plan.modelId, plan.apiKey);
                        } catch (e) {
                            providerEval.status = 'error';
                            providerEval.reason = `Model init failed: ${e.message}`;
                            throw e;
                        }

                        for (const tc of GOLDEN_DATASET) {
                            console.log(`[${plan.label}] Testing: ${tc.input}`);
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

                        if (passed !== GOLDEN_DATASET.length) {
                            const failing = providerEval.cases
                                .filter(entry => !entry.success)
                                .map(entry => entry.name)
                                .join(', ');
                            providerEval.status = 'error';
                            providerEval.reason = `Conformance failures: ${failing}`;
                            throw new Error(providerEval.reason);
                        }
                    } finally {
                        const latencyStats = computeLatencyStats(latencies);
                        providerEval.metrics = {
                            passRate: GOLDEN_DATASET.length ? Number(((passed / GOLDEN_DATASET.length) * 100).toFixed(2)) : 0,
                            passed,
                            totalCases: GOLDEN_DATASET.length,
                            avgLatencyMs: latencyStats.avgMs,
                            p95LatencyMs: latencyStats.p95Ms,
                            minLatencyMs: latencyStats.minMs,
                            maxLatencyMs: latencyStats.maxMs
                        };
                        providerResults.set(plan.id, providerEval);
                    }
                }, 300000);
            });
        };

        plans.forEach(plan => runTestsForProvider(plan));

        afterAll(async () => {
            await controller.shutdown();

            const reportProviders = plans.map(plan => providerResults.get(plan.id) || {
                id: plan.id,
                name: plan.label,
                modelId: plan.modelId,
                status: 'error',
                reason: 'No results recorded',
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

            const reportPath = writeReport({
                runType: 'conformance',
                datasetCount: GOLDEN_DATASET.length,
                providers: reportProviders,
                warnings
            });

            console.log(`Conformance report saved to ${reportPath}`);
        });
    });
}
