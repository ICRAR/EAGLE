import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

// Fixed v4-shaped ids (schema requires 4/8ab version+variant nibbles on map keys).
const NODE1 = '11111111-aaaa-4bbb-8ccc-dddddddddddd';
const NODE2 = '22222222-aaaa-4bbb-8ccc-dddddddddddd';
const PORT1 = '33333333-aaaa-4bbb-8ccc-dddddddddddd';
const PORT2 = '44444444-aaaa-4bbb-8ccc-dddddddddddd';
const EDGE = '55555555-aaaa-4bbb-8ccc-dddddddddddd';
const VIS_A = '66666666-aaaa-4bbb-8ccc-dddddddddddd';
const VIS_B = '77777777-aaaa-4bbb-8ccc-dddddddddddd';

type TestRef = {getId: () => string};
type TestField = {
    getId: () => string;
    getNode: () => TestRef;
    getEdges: () => Iterable<TestRef>;
};
type TestEdge = {
    getId: () => string;
    getSrcPort: () => TestField;
    getDestPort: () => TestField;
};
type TestVisual = {
    getId: () => string;
    getTarget: () => TestRef | null;
};
type TestGraph = {
    getNodes: () => Iterable<TestRef>;
    getEdges: () => Iterable<TestEdge>;
    getNodeById: (id: string) => TestRef | undefined;
    getVisualById: (id: string) => TestVisual | undefined;
    createRollbackSnapshot: () => TestGraph;
    restoreRollbackSnapshot: (snapshot: TestGraph) => void;
};
type TestEagle = {
    logicalGraph: () => TestGraph;
    _loadGraphJSON: (
        json: string,
        fileName: string,
        loadCallback: (graph: TestGraph) => void
    ) => Promise<boolean>;
};

test('A rollback snapshot re-points cloned fields, edges and visual targets', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const graphData = {
        modelData: {type: 'Graph', schemaVersion: 'V4', name: 'rollback references'},
        nodes: {
            [NODE1]: {id: NODE1, category: 'Data', name: 'node-1', fields: {[PORT1]: {id: PORT1, name: 'p1', type: 'string'}}},
            [NODE2]: {id: NODE2, category: 'Data', name: 'node-2', fields: {[PORT2]: {id: PORT2, name: 'p2', type: 'string'}}},
        },
        edges: {
            [EDGE]: {id: EDGE, srcNodeId: NODE1, srcPortId: PORT1, destNodeId: NODE2, destPortId: PORT2},
        },
        visuals: {
            // visual A targets a node; visual B targets visual A (visual-to-visual)
            [VIS_A]: {id: VIS_A, type: 'Group', content: '', targetId: NODE1},
            [VIS_B]: {id: VIS_B, type: 'Label', content: 'label', targetId: VIS_A},
        },
        graphConfigurations: {},
        activeGraphConfigId: null,
    };

    type EvalArg = {data: object, node1: string, node2: string, edge: string, visA: string, visB: string};
    const result = await page.evaluate(async (arg: EvalArg) => {
        const {data, node1, node2, edge: edgeId, visA, visB} = arg;
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const captured: {outcome: unknown} = {outcome: null};
        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), 'rollback-refs.graph', (graph) => {
            // exercise the snapshot/restore round-trip in place on the loaded graph
            graph.restoreRollbackSnapshot(graph.createRollbackSnapshot());
            const restored = graph;

            const restoredEdge = Array.from(restored.getEdges()).find((edge) => edge.getId() === edgeId);
            const restoredNode1 = restored.getNodeById(node1);
            const restoredNode2 = restored.getNodeById(node2);
            const restoredVisualA = restored.getVisualById(visA);
            const restoredVisualB = restored.getVisualById(visB);

            if (typeof restoredEdge === 'undefined' || typeof restoredNode1 === 'undefined' || typeof restoredNode2 === 'undefined'
                || typeof restoredVisualA === 'undefined' || typeof restoredVisualB === 'undefined'){
                captured.outcome = {
                    loaded: true,
                    error: 'expected object missing from restored graph',
                    diag: {
                        nodeCount: Array.from(restored.getNodes()).length,
                        edgeCount: Array.from(restored.getEdges()).length,
                        hasNode1: typeof restoredNode1 !== 'undefined',
                        hasNode2: typeof restoredNode2 !== 'undefined',
                        hasEdge: typeof restoredEdge !== 'undefined',
                        hasVisA: typeof restoredVisualA !== 'undefined',
                        hasVisB: typeof restoredVisualB !== 'undefined',
                    },
                };
                return;
            }

            const edgeInSrcPort = Array.from(restoredEdge.getSrcPort().getEdges()).some((edge) => edge === restoredEdge);
            const edgeInDestPort = Array.from(restoredEdge.getDestPort().getEdges()).some((edge) => edge === restoredEdge);
            const srcPortOwnsRestoredNode = restoredEdge.getSrcPort().getNode() === restoredNode1;
            const destPortOwnsRestoredNode = restoredEdge.getDestPort().getNode() === restoredNode2;
            const nodeVisualTargetsRestoredNode = restoredVisualA.getTarget() === restoredNode1;
            const visualToVisualTargetsRestoredVisual = restoredVisualB.getTarget() === restoredVisualA;

            captured.outcome = {
                loaded: true,
                edgeInSrcPort,
                edgeInDestPort,
                srcPortOwnsRestoredNode,
                destPortOwnsRestoredNode,
                nodeVisualTargetsRestoredNode,
                visualToVisualTargetsRestoredVisual,
            };
        });
        if (!loaded){
            return {loaded, error: 'graph did not load'} as const;
        }
        return captured.outcome;
    }, {data: graphData, node1: NODE1, node2: NODE2, edge: EDGE, visA: VIS_A, visB: VIS_B});

    expect(result).toEqual({
        loaded: true,
        edgeInSrcPort: true,
        edgeInDestPort: true,
        srcPortOwnsRestoredNode: true,
        destPortOwnsRestoredNode: true,
        nodeVisualTargetsRestoredNode: true,
        visualToVisualTargetsRestoredVisual: true,
    });

    await page.close();
});
