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
        const eagle = (window as unknown as {eagle: {
            _loadGraphJSON: (
                json: string,
                fileName: string,
                loadCallback: (graph: {getNumNodes: () => number}, errorsWarnings: {warnings: {message: string}[], errors: {message: string}[]}) => void
            ) => Promise<boolean>;
        }}).eagle;
        let parsedNodeCount: number | null = null;
        let parserWarnings: string[] = [];
        let parserErrors: string[] = [];
        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), "empty-nodes.graph", (graph, errorsWarnings) => {
            parsedNodeCount = graph.getNumNodes();
            parserWarnings = errorsWarnings.warnings.map((warning) => warning.message);
            parserErrors = errorsWarnings.errors.map((error) => error.message);
        });

        return { loaded: Boolean(loaded), parsedNodeCount, parserWarnings, parserErrors };
    }, graphData);

    expect(result.loaded).toBe(true);
    expect(result.parsedNodeCount).toBe(0);
    expect(result.parserWarnings).toContain('The graph contains no nodes.');
    expect(result.parserErrors).toEqual([]);

    await page.close();
});
