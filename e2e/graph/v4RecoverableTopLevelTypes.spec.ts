import { test, expect } from '@playwright/test';

type TestIssue = {message: string};
type TestGraph = {
    getNumNodes: () => number;
    getNumEdges: () => number;
    getNumVisuals: () => number;
    getNumGraphConfigs: () => number;
    activeGraphConfigId: () => string | null;
};
type TestErrorsWarnings = {errors: TestIssue[], warnings: TestIssue[]};
type TestEagle = {
    _loadGraphJSON: (
        json: string,
        fileName: string,
        loadCallback: (graph: TestGraph, errorsWarnings: TestErrorsWarnings) => void | Promise<void>
    ) => Promise<boolean>;
    loadingErrors: () => TestIssue[];
};
type RecoverableLoadResult = {
    key: string;
    loaded: boolean;
    warnings: string[];
    edgeCount: number | undefined;
    visualCount: number | undefined;
    graphConfigCount: number | undefined;
    activeGraphConfigId: string | null | undefined;
};
type InvalidLoadResult = {loaded: boolean, errors: string[]};

test('Malformed optional V4 top-level values warn and use parser defaults', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    const cases = [
        { key: 'edges', value: [] },
        { key: 'visuals', value: [] },
        { key: 'graphConfigurations', value: [] },
        { key: 'activeGraphConfigId', value: 5 },
    ];

    const results = await page.evaluate(async (loadCases: {key: string, value: unknown}[]) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const results: RecoverableLoadResult[] = [];

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

            let warnings: string[] = [];
            let edgeCount: number | undefined;
            let visualCount: number | undefined;
            let graphConfigCount: number | undefined;
            let activeGraphConfigId: string | null | undefined;
            const loaded = await eagle._loadGraphJSON(JSON.stringify(graphData), 'recoverable-values.graph', (graph, errorsWarnings) => {
                edgeCount = graph.getNumEdges();
                visualCount = graph.getNumVisuals();
                graphConfigCount = graph.getNumGraphConfigs();
                activeGraphConfigId = graph.activeGraphConfigId();
                warnings = errorsWarnings.warnings.map((warning) => warning.message);
            });

            results.push({
                key: loadCase.key,
                loaded: Boolean(loaded),
                warnings,
                edgeCount,
                visualCount,
                graphConfigCount,
                activeGraphConfigId,
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

test('A V4 graph with null modelData reports a blocking validation error', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    const results = await page.evaluate(async () => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const malformedGraphs = [
            { modelData: null },
            { modelData: null, nodes: {} },
            { nodes: {} },
        ];
        const results: InvalidLoadResult[] = [];

        for (const graphData of malformedGraphs){
            const loaded = await eagle._loadGraphJSON(JSON.stringify(graphData), 'invalid-model-data.graph', () => undefined);
            const loadingErrors = eagle.loadingErrors();
            results.push({
                loaded: Boolean(loaded),
                errors: loadingErrors.map((error) => error.message),
            });
        }

        return results;
    });

    for (const result of results){
        expect(result.loaded).toBe(false);
        expect(result.errors.some((error) => error.startsWith('Schema validation:'))).toBe(true);
    }
    expect(results[0].errors.some((error) => error.includes('modelData'))).toBe(true);
    expect(results[1].errors.some((error) => error.includes('modelData'))).toBe(true);

    await page.close();
});
