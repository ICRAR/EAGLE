import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

const NODE = '11111111-aaaa-4bbb-8ccc-dddddddddddd';
const FIELD_KEY_1 = '22222222-aaaa-4bbb-8ccc-dddddddddddd';
const FIELD_KEY_2 = '33333333-aaaa-4bbb-8ccc-dddddddddddd';
const SHARED_FIELD = '44444444-aaaa-4bbb-8ccc-dddddddddddd';

type TestIssue = {message: string};
type TestErrorsWarnings = {errors: TestIssue[], warnings: TestIssue[]};
type TestNode = {
    getFields: () => Iterable<unknown>;
};
type TestGraph = {
    getNodeById: (id: string) => TestNode | undefined;
};
type TestEagle = {
    _loadGraphJSON: (
        json: string,
        fileName: string,
        loadCallback: (graph: TestGraph, errorsWarnings: TestErrorsWarnings) => void
    ) => Promise<boolean>;
};

test('Duplicate field IDs within a node warn and are skipped', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const graphData = {
        modelData: {type: 'Graph', schemaVersion: 'V4', name: 'duplicate fields in node'},
        nodes: {
            [NODE]: {
                id: NODE,
                category: 'Data',
                name: 'node-1',
                fields: {
                    [FIELD_KEY_1]: {
                        id: SHARED_FIELD,
                        name: 'p1',
                        type: 'string',
                        usage: 'OutputPort',
                    },
                    [FIELD_KEY_2]: {
                        id: SHARED_FIELD,
                        name: 'p2',
                        type: 'string',
                        usage: 'OutputPort',
                    },
                },
            },
        },
        edges: {},
        visuals: {},
        graphConfigurations: {},
        activeGraphConfigId: null,
    };

    const result = await page.evaluate(async ({data, nodeId}: {data: object, nodeId: string}) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        let fieldCount = -1;
        let warnings: string[] = [];
        let errors: string[] = [];

        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), 'duplicate-fields-in-node.graph', (graph, errorsWarnings) => {
            const node = graph.getNodeById(nodeId);
            fieldCount = node === undefined ? -1 : Array.from(node.getFields()).length;
            warnings = errorsWarnings.warnings.map((issue) => issue.message);
            errors = errorsWarnings.errors.map((issue) => issue.message);
        });

        return {loaded, fieldCount, warnings, errors};
    }, {data: graphData, nodeId: NODE});

    expect(result.loaded).toBe(true);
    expect(result.fieldCount).toBe(1);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some((warning) => warning.includes('duplicate field id'))).toBe(true);

    await page.close();
});
