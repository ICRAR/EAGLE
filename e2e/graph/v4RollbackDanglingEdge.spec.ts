import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

const NODE1 = '11111111-aaaa-4bbb-8ccc-dddddddddddd';
const NODE2 = '22222222-aaaa-4bbb-8ccc-dddddddddddd';
const FIELD1 = '33333333-aaaa-4bbb-8ccc-dddddddddddd';
const FIELD2 = '44444444-aaaa-4bbb-8ccc-dddddddddddd';
const EDGE = '55555555-aaaa-4bbb-8ccc-dddddddddddd';

type TestGraph = {
    getNodes: () => Iterable<{getId: () => string}>;
    nodes: () => Map<string, unknown>;
    getNumEdges: () => number;
    createRollbackSnapshot: () => TestGraph;
};
type TestEagle = {
    logicalGraph: {
        (): TestGraph;
        (graph: TestGraph): void;
    };
    _loadGraphJSON: (
        json: string,
        fileName: string,
        loadCallback: (graph: TestGraph) => void
    ) => Promise<boolean>;
};

test('Rollback snapshots omit dangling edges instead of retaining live references', async ({ page }) => {
    const graphData = {
        modelData: {type: 'Graph', schemaVersion: 'V4', name: 'dangling edge snapshot'},
        nodes: {
            [NODE1]: {
                id: NODE1,
                category: 'Data',
                name: 'node-1',
                fields: {
                    [FIELD1]: {id: FIELD1, name: 'out', type: 'string', usage: 'OutputPort'},
                },
            },
            [NODE2]: {
                id: NODE2,
                category: 'Data',
                name: 'node-2',
                fields: {
                    [FIELD2]: {id: FIELD2, name: 'in', type: 'string', usage: 'InputPort'},
                },
            },
        },
        edges: {
            [EDGE]: {
                id: EDGE,
                srcNodeId: NODE1,
                srcPortId: FIELD1,
                destNodeId: NODE2,
                destPortId: FIELD2,
            },
        },
        visuals: {},
        graphConfigurations: {},
        activeGraphConfigId: null,
    };

    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const result = await page.evaluate(async (data: object) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), 'dangling-edge.graph', (graph) => {
            eagle.logicalGraph(graph);
        });
        if (!loaded) {
            return {loaded: false, originalEdges: -1, snapshotEdges: -1};
        }

        const graph = eagle.logicalGraph();
        const firstNode = Array.from(graph.getNodes())[0];
        graph.nodes().delete(firstNode.getId());

        const snapshot = graph.createRollbackSnapshot();
        return {
            loaded: true,
            originalEdges: graph.getNumEdges(),
            snapshotEdges: snapshot.getNumEdges(),
        };
    }, graphData);

    expect(result.loaded).toBe(true);
    expect(result.originalEdges).toBe(1);
    expect(result.snapshotEdges).toBe(0);

    await page.close();
});
