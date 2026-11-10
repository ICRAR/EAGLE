import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

const NODE1 = '11111111-aaaa-4bbb-8ccc-dddddddddddd';
const NODE2 = '22222222-aaaa-4bbb-8ccc-dddddddddddd';
const PORT1 = '33333333-aaaa-4bbb-8ccc-dddddddddddd';
const PORT2 = '44444444-aaaa-4bbb-8ccc-dddddddddddd';
const EDGE = '55555555-aaaa-4bbb-8ccc-dddddddddddd';

type TestNode = {
    getExpanded: () => boolean;
    getKeepExpanded: () => boolean;
    getRadius: () => number;
    setExpanded: (value: boolean) => TestNode;
    setKeepExpanded: (value: boolean) => TestNode;
    setRadius: (radius: number) => TestNode;
};

type TestEdge = {
    getPosition: () => {x: number, y: number};
    getSelectionRelative: () => boolean;
    setPosition: (x: number, y: number) => void;
    setSelectionRelative: (value: boolean) => void;
};

type TestGraph = {
    getNodeById: (id: string) => TestNode | undefined;
    getEdgeById: (id: string) => TestEdge | undefined;
    createRollbackSnapshot: () => TestGraph;
    restoreRollbackSnapshot: (snapshot: TestGraph) => void;
};
type TestEagle = {
    _loadGraphJSON: (
        json: string,
        fileName: string,
        loadCallback: (graph: TestGraph) => void
    ) => Promise<boolean>;
};

test('A rollback snapshot preserves node hierarchy/radius state and edge position/selection', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const graphData = {
        modelData: {type: 'Graph', schemaVersion: 'V4', name: 'rollback state'},
        nodes: {
            [NODE1]: {
                id: NODE1,
                category: 'Data',
                name: 'node-1',
                fields: {[PORT1]: {id: PORT1, name: 'p1', type: 'string', usage: 'OutputPort'}},
            },
            [NODE2]: {
                id: NODE2,
                category: 'Data',
                name: 'node-2',
                fields: {[PORT2]: {id: PORT2, name: 'p2', type: 'string', usage: 'InputPort'}},
            },
        },
        edges: {
            [EDGE]: {id: EDGE, srcNodeId: NODE1, srcPortId: PORT1, destNodeId: NODE2, destPortId: PORT2},
        },
        visuals: {},
        graphConfigurations: {},
        activeGraphConfigId: null,
    };

    const result = await page.evaluate(async ({data, node1Id, edgeId}: {data: object, node1Id: string, edgeId: string}) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const captured: {outcome: unknown} = {outcome: null};

        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), 'rollback-state.graph', (graph) => {
            const node = graph.getNodeById(node1Id);
            const edge = graph.getEdgeById(edgeId);
            if (typeof node === 'undefined' || typeof edge === 'undefined'){
                captured.outcome = {loaded: true, error: 'expected node/edge missing'};
                return;
            }

            node.setKeepExpanded(false);
            node.setExpanded(false);
            node.setRadius(42);
            edge.setPosition(12, 34);
            edge.setSelectionRelative(true);

            const snapshot = graph.createRollbackSnapshot();

            node.setRadius(1);
            edge.setPosition(0, 0);
            edge.setSelectionRelative(false);

            graph.restoreRollbackSnapshot(snapshot);

            const restoredNode = graph.getNodeById(node1Id);
            const restoredEdge = graph.getEdgeById(edgeId);
            if (typeof restoredNode === 'undefined' || typeof restoredEdge === 'undefined'){
                captured.outcome = {loaded: true, error: 'expected restored node/edge missing'};
                return;
            }

            captured.outcome = {
                loaded: true,
                expanded: restoredNode.getExpanded(),
                keepExpanded: restoredNode.getKeepExpanded(),
                radius: restoredNode.getRadius(),
                edgeX: restoredEdge.getPosition().x,
                edgeY: restoredEdge.getPosition().y,
                edgeSelectionRelative: restoredEdge.getSelectionRelative(),
            };
        });

        if (!loaded){
            return {loaded: false, error: 'graph did not load'} as const;
        }
        return captured.outcome;
    }, {data: graphData, node1Id: NODE1, edgeId: EDGE});

    expect(result).toEqual({
        loaded: true,
        expanded: false,
        keepExpanded: false,
        radius: 42,
        edgeX: 12,
        edgeY: 34,
        edgeSelectionRelative: true,
    });

    await page.close();
});
