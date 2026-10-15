import { test, expect } from '@playwright/test';

test('An empty V4 nodes container loads with a warning', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    const graphData = {
        modelData: { type: 'Graph', schemaVersion: 'V4', name: 'empty graph' },
        nodes: {},
        edges: {},
        visuals: {},
        graphConfigurations: {},
        activeGraphConfigId: null,
    };

    const result = await page.evaluate(async (data: object) => {
        const eagle = (window as any).eagle;
        let parsedNodeCount: number | null = null;
        let parserWarnings: string[] = [];
        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), "empty-nodes.graph", (graph: any, errorsWarnings: any) => {
            parsedNodeCount = graph.getNumNodes();
            parserWarnings = (errorsWarnings.warnings as {message: string}[]).map((warning) => warning.message);
        });

        return { loaded: Boolean(loaded), parsedNodeCount, parserWarnings };
    }, graphData);

    expect(result.loaded).toBe(true);
    expect(result.parsedNodeCount).toBe(0);
    expect(result.parserWarnings).toContain('The graph contains no nodes.');

    await page.close();
});
