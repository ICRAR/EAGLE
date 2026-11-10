import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

const NODE = '11111111-aaaa-4bbb-8ccc-dddddddddddd';
const PORT = '22222222-aaaa-4bbb-8ccc-dddddddddddd';
const EDGE = '33333333-aaaa-4bbb-8ccc-dddddddddddd';
const VISUAL = '44444444-aaaa-4bbb-8ccc-dddddddddddd';

type TestGraph = {
    getNumNodes: () => number;
    getNumEdges: () => number;
    getNumVisuals: () => number;
    getNodeById: (id: string) => {getName: () => string} | undefined;
    getEdgeById: (id: string) => {getId: () => string} | undefined;
    getVisualById: (id: string) => {getId: () => string} | undefined;
};
type TestIssue = {message: string};
type TestErrorsWarnings = {errors: TestIssue[], warnings: TestIssue[]};
type TestEagle = {
    _loadGraphJSON: (
        json: string,
        fileName: string,
        loadCallback: (graph: TestGraph, errorsWarnings: TestErrorsWarnings) => void
    ) => Promise<boolean>;
};

test('V4 duplicate node, edge and visual IDs are warned about and skipped', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const graphData = {
        modelData: {type: 'Graph', schemaVersion: 'V4', name: 'duplicate ids'},
        nodes: {
            'aaaaaaaa-aaaa-4bbb-8ccc-dddddddddddd': {
                id: NODE,
                category: 'Data',
                name: 'node-1',
                fields: {
                    [PORT]: {id: PORT, name: 'p1', type: 'string', usage: 'OutputPort'},
                },
            },
            'bbbbbbbb-aaaa-4bbb-8ccc-dddddddddddd': {
                id: NODE,
                category: 'Data',
                name: 'node-2',
                fields: {},
            },
        },
        edges: {
            'cccccccc-aaaa-4bbb-8ccc-dddddddddddd': {
                id: EDGE,
                srcNodeId: NODE,
                srcPortId: PORT,
                destNodeId: NODE,
                destPortId: PORT,
            },
            'dddddddd-aaaa-4bbb-8ccc-dddddddddddd': {
                id: EDGE,
                srcNodeId: NODE,
                srcPortId: PORT,
                destNodeId: NODE,
                destPortId: PORT,
            },
        },
        visuals: {
            'eeeeeeee-aaaa-4bbb-8ccc-dddddddddddd': {id: VISUAL, type: 'Group', content: ''},
            'ffffffff-aaaa-4bbb-8ccc-dddddddddddd': {id: VISUAL, type: 'Group', content: ''},
        },
        graphConfigurations: {},
        activeGraphConfigId: null,
    };

    const result = await page.evaluate(async (data: object) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        let nodeCount = -1;
        let edgeCount = -1;
        let visualCount = -1;
        let warnings: string[] = [];
        let errors: string[] = [];

        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), 'duplicate-ids.graph', (graph, errorsWarnings) => {
            nodeCount = graph.getNumNodes();
            edgeCount = graph.getNumEdges();
            visualCount = graph.getNumVisuals();
            warnings = errorsWarnings.warnings.map((issue) => issue.message);
            errors = errorsWarnings.errors.map((issue) => issue.message);
        });

        return {
            loaded: Boolean(loaded),
            nodeCount,
            edgeCount,
            visualCount,
            warnings,
            errors,
            nodeName: null as string | null,
            edgeId: null as string | null,
            visualId: null as string | null,
        };
    }, graphData);

    expect(result.loaded).toBe(true);
    expect(result.nodeCount).toBe(1);
    expect(result.edgeCount).toBe(1);
    expect(result.visualCount).toBe(1);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some((warning) => warning.includes('Node id') && warning.includes(NODE))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('Edge id') && warning.includes(EDGE))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('Visual id') && warning.includes(VISUAL))).toBe(true);

    await page.close();
});
