import { test, expect, type Page } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

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

const loadInvalidGraph = async (page: Page, graphData: unknown): Promise<InvalidLoadResult> => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    return page.evaluate(async (data: unknown) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), 'invalid-graph.graph', () => undefined);
        return {
            loaded: Boolean(loaded),
            errors: eagle.loadingErrors().map((error) => error.message),
        };
    }, graphData);
};

test('Malformed optional V4 top-level values warn and use parser defaults', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

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
    const result = await loadInvalidGraph(page, {modelData: null});

    expect(result.loaded, JSON.stringify(result)).toBe(false);
    expect(result.errors.some((error) => error.startsWith('Schema validation:') && error.includes('modelData'))).toBe(true);

    await page.close();
});

test('A V4 graph without modelData reports a blocking validation error', async ({ page }) => {
    const result = await loadInvalidGraph(page, {nodes: {}});

    expect(result.loaded, JSON.stringify(result)).toBe(false);
    expect(result.errors.some((error) => error.startsWith('Schema validation:') && error.includes('modelData'))).toBe(true);

    await page.close();
});

test('An invalid schemaVersion on a V4 graph reaches V4 schema validation', async ({ page }) => {
    const result = await loadInvalidGraph(page, {
        modelData: {type: 'Graph', schemaVersion: 5, name: 'invalid schema version'},
        nodes: {},
    });

    expect(result.loaded, JSON.stringify(result)).toBe(false);
    expect(result.errors.some((error) => error.startsWith('Schema validation:') && error.includes('schemaVersion'))).toBe(true);

    await page.close();
});
