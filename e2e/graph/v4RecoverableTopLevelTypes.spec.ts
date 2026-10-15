import { test, expect } from '@playwright/test';

test('Malformed optional V4 top-level values warn and use parser defaults', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    const cases = [
        { key: 'edges', value: [] },
        { key: 'visuals', value: [] },
        { key: 'graphConfigurations', value: [] },
        { key: 'activeGraphConfigId', value: 5 },
    ];

    const results = await page.evaluate(async (loadCases: {key: string, value: unknown}[]) => {
        const eagle = (window as any).eagle;
        const results = [];

        for (const loadCase of loadCases){
            const graphData: Record<string, unknown> = {
                modelData: { type: 'Graph', schemaVersion: 'V4', name: 'recoverable values' },
                nodes: {},
                edges: {},
                visuals: {},
                graphConfigurations: {},
                activeGraphConfigId: null,
            };
            graphData[loadCase.key] = loadCase.value;

            let parsedGraph: any = null;
            let warnings: string[] = [];
            const loaded = await eagle._loadGraphJSON(JSON.stringify(graphData), 'recoverable-values.graph', (graph: any, errorsWarnings: any) => {
                parsedGraph = graph;
                warnings = errorsWarnings.warnings.map((warning: {message: string}) => warning.message);
            });

            results.push({
                key: loadCase.key,
                loaded: Boolean(loaded),
                warnings,
                edgeCount: parsedGraph?.getNumEdges(),
                visualCount: parsedGraph?.getNumVisuals(),
                graphConfigCount: parsedGraph?.getNumGraphConfigs(),
                activeGraphConfigId: parsedGraph?.activeGraphConfigId(),
            });
        }

        return results;
    }, cases);

    for (const result of results){
        expect(result.loaded, `${result.key} should not block loading`).toBe(true);
        expect(result.warnings.some((warning) => warning.startsWith(`Schema validation: ${result.key} `))).toBe(true);
    }

    expect(results[0].edgeCount).toBe(0);
    expect(results[1].visualCount).toBe(0);
    expect(results[2].graphConfigCount).toBe(0);
    expect(results[3].activeGraphConfigId).toBeNull();

    await page.close();
});
