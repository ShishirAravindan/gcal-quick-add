import fs from 'fs';
import path from 'path';

export function computeLatencyStats(latencies) {
    if (!latencies.length) {
        return { avgMs: 0, p95Ms: 0, minMs: 0, maxMs: 0 };
    }

    const total = latencies.reduce((sum, value) => sum + value, 0);
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));

    return {
        avgMs: Math.round(total / latencies.length),
        p95Ms: sorted[p95Index],
        minMs: sorted[0],
        maxMs: sorted[sorted.length - 1]
    };
}

export function writeReport({ runType, datasetCount, providers, warnings = [] }) {
    const timestamp = new Date().toISOString();
    const report = {
        runType,
        timestamp,
        dataset: { count: datasetCount },
        summary: {
            totalProviders: providers.length,
            runnableProviders: providers.filter(provider => provider.status === 'ready').length,
            failedProviders: providers.filter(provider => provider.status === 'error').length
        },
        warnings,
        providers
    };

    const dir = './tests/conformance/results';
    fs.mkdirSync(dir, { recursive: true });

    const fileName = `${runType}_${timestamp.replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    return filePath;
}
