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
        const eagle = (window as unknown as {eagle: {
            _loadGraphJSON: (
                json: string,
                fileName: string,
                loadCallback: (graph: {
                    getNumNodes: () => number;
                    getNodeById: (id: string) => {getFieldById: (id: string) => {isChangeable: () => boolean} | undefined} | undefined;
                }, errorsWarnings: {warnings: {message: string}[], errors: {message: string}[]}) => void
            ) => Promise<boolean>;
        }}).eagle;
        let nodeCount: number | null = null;
        let fieldChangeable: boolean | null = null;
        let warnings: string[] = [];
        let errors: string[] = [];

        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), 'field-default.graph', (graph, errorsWarnings) => {
            nodeCount = graph.getNumNodes();
            const node = graph.getNodeById('00000000-0000-4000-8000-000000000001');
            const field = node?.getFieldById('00000000-0000-4000-8000-000000000002');
            fieldChangeable = field?.isChangeable() ?? null;
            warnings = errorsWarnings.warnings.map((warning) => warning.message);
            errors = errorsWarnings.errors.map((error) => error.message);
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
