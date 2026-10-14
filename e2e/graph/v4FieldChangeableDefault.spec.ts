import { test, expect } from '@playwright/test';

test('A V4 field without changeable loads and defaults to changeable', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    const graphData = {
        modelData: { type: 'Graph', schemaVersion: 'V4', name: 'field default graph' },
        nodes: {
            '00000000-0000-4000-8000-000000000001': {
                category: 'Data',
                name: 'Data node',
                fields: {
                    '00000000-0000-4000-8000-000000000002': {
                        name: 'optional changeable field',
                        type: 'string',
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
        const eagle = (window as any).eagle;
        let nodeCount: number | null = null;
        let fieldChangeable: boolean | null = null;
        let warnings: string[] = [];
        let errors: string[] = [];

        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), 'field-default.graph', (graph: any, errorsWarnings: any) => {
            nodeCount = graph.getNumNodes();
            const node = graph.getNodeById('00000000-0000-4000-8000-000000000001');
            const field = node?.getFieldById('00000000-0000-4000-8000-000000000002');
            fieldChangeable = field?.isChangeable() ?? null;
            warnings = (errorsWarnings.warnings as {message: string}[]).map((warning) => warning.message);
            errors = (errorsWarnings.errors as {message: string}[]).map((error) => error.message);
        });

        return { loaded: Boolean(loaded), nodeCount, fieldChangeable, warnings, errors };
    }, graphData);

    expect(result.loaded).toBe(true);
    expect(result.nodeCount).toBe(1);
    expect(result.fieldChangeable).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);

    await page.close();
});
