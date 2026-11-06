import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

type TestErrorsWarnings = {errors: {message: string}[], warnings: {message: string}[]};
type TestEagle = {
    _loadGraphJSON: (
        json: string,
        fileName: string,
        loadCallback: (graph: {getNumNodes: () => number, getNodeName: (id: string) => string}, errorsWarnings: TestErrorsWarnings) => void
    ) => Promise<boolean>;
};

test('Unknown attributes on a V4 node or field warn instead of blocking the load', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const graphData = {
        modelData: { type: 'Graph', schemaVersion: 'V4', name: 'unknown attributes' },
        nodes: {
            'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee': {
                id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                name: 'node-1',
                x: 10,
                y: 20,
                unexpectedKey: 'extra',
                fields: {
                    '11111111-2222-4333-8444-555555555555': {
                        id: '11111111-2222-4333-8444-555555555555',
                        name: 'field-1',
                        unexpectedKey: 'extra',
                    },
                },
            },
        },
        edges: {},
        visuals: {},
        graphConfigurations: {},
        activeGraphConfigId: null,
    };

    const result = await page.evaluate(async (data: object) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        let parsedNodeCount: number | null = null;
        let parserWarnings: string[] = [];
        let parserErrors: string[] = [];
        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), 'unknown-attributes.graph', (graph, errorsWarnings) => {
            parsedNodeCount = graph.getNumNodes();
            parserWarnings = errorsWarnings.warnings.map((warning) => warning.message);
            parserErrors = errorsWarnings.errors.map((error) => error.message);
        });

        return { loaded: Boolean(loaded), parsedNodeCount, parserWarnings, parserErrors };
    }, graphData);

    expect(result.loaded).toBe(true);
    expect(result.parsedNodeCount).toBe(1);
    expect(result.parserErrors).toEqual([]);
    expect(result.parserWarnings.some((warning) => warning.startsWith('Schema validation: nodes/'))).toBe(true);
    expect(result.parserWarnings.some((warning) => warning.includes('/fields/'))).toBe(true);

    await page.close();
});
