import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

// Fixed v4-shaped ids. The shared field id is deliberately reused on two different
// nodes: field ids are only unique within a node, not graph-wide.
const NODE1 = '11111111-aaaa-4bbb-8ccc-dddddddddddd';
const NODE2 = '22222222-aaaa-4bbb-8ccc-dddddddddddd';
const SHARED_FIELD = '33333333-aaaa-4bbb-8ccc-dddddddddddd';
const EDGE = '55555555-aaaa-4bbb-8ccc-dddddddddddd';

type TestField = {
    getId: () => string;
    getNode: () => TestNode;
};

type TestNode = {
    getId: () => string;
    getName: () => string;
    getFields: () => Iterable<TestField>;
    getInputPorts: () => TestField[];
    getOutputPorts: () => TestField[];
};

type TestEdge = {
    getSrcNode: () => TestNode;
    getDestNode: () => TestNode;
    getSrcPort: () => TestField;
    getDestPort: () => TestField;
};

type TestGraph = {
    getNodes: () => Iterable<TestNode>;
    getEdges: () => Iterable<TestEdge>;
    fileInfo: () => {name: string};
};

type TestIssue = {message: string};
type TestErrorsWarnings = {errors: TestIssue[], warnings: TestIssue[]};
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
    insertGraph: (
        nodes: TestNode[],
        edges: TestEdge[],
        parentNode: TestNode | null,
        errorsWarnings: TestErrorsWarnings
    ) => Promise<void>;
};

test('Inserting a graph with duplicate field IDs wires edges to the owning node ports', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const graphData = {
        modelData: {type: 'Graph', schemaVersion: 'V4', name: 'duplicate field insert'},
        nodes: {
            [NODE1]: {
                id: NODE1,
                category: 'Data',
                name: 'node-1',
                fields: {
                    [SHARED_FIELD]: {
                        id: SHARED_FIELD,
                        name: 'shared-out',
                        type: 'string',
                        usage: 'OutputPort',
                    },
                },
            },
            [NODE2]: {
                id: NODE2,
                category: 'Data',
                name: 'node-2',
                fields: {
                    [SHARED_FIELD]: {
                        id: SHARED_FIELD,
                        name: 'shared-in',
                        type: 'string',
                        usage: 'InputPort',
                    },
                },
            },
        },
        edges: {
            [EDGE]: {
                id: EDGE,
                srcNodeId: NODE1,
                srcPortId: SHARED_FIELD,
                destNodeId: NODE2,
                destPortId: SHARED_FIELD,
            },
        },
        visuals: {},
        graphConfigurations: {},
        activeGraphConfigId: null,
    };

    const result = await page.evaluate(async (data: object) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const graph = eagle.logicalGraph();
        graph.fileInfo().name = 'duplicate-field-insert';

        let parsedGraph: TestGraph | null = null;
        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), 'duplicate-fields.graph', (lg) => {
            parsedGraph = lg;
        });
        if (!loaded){
            return {loaded: false, error: 'graph did not load'};
        }

        const graphToInsert = parsedGraph as TestGraph;
        const errorsWarnings: TestErrorsWarnings = {errors: [], warnings: []};
        await eagle.insertGraph(
            Array.from(graphToInsert.getNodes()),
            Array.from(graphToInsert.getEdges()),
            null,
            errorsWarnings,
        );

        const insertedGraph = eagle.logicalGraph();
        const insertedNode1 = Array.from(insertedGraph.getNodes()).find((node) => node.getName() === 'node-1');
        const insertedNode2 = Array.from(insertedGraph.getNodes()).find((node) => node.getName() === 'node-2');
        const insertedEdge = Array.from(insertedGraph.getEdges()).find((edge) =>
            edge.getSrcNode().getName() === 'node-1' && edge.getDestNode().getName() === 'node-2');

        return {
            loaded: true,
            insertErrors: errorsWarnings.errors.map((issue) => issue.message),
            insertWarnings: errorsWarnings.warnings.map((issue) => issue.message),
            hasNode1: typeof insertedNode1 !== 'undefined',
            hasNode2: typeof insertedNode2 !== 'undefined',
            hasEdge: typeof insertedEdge !== 'undefined',
            srcPortOwnedByNode1: typeof insertedEdge !== 'undefined'
                && typeof insertedNode1 !== 'undefined'
                && insertedEdge.getSrcPort().getNode() === insertedNode1,
            destPortOwnedByNode2: typeof insertedEdge !== 'undefined'
                && typeof insertedNode2 !== 'undefined'
                && insertedEdge.getDestPort().getNode() === insertedNode2,
            srcPortId: typeof insertedEdge !== 'undefined' ? insertedEdge.getSrcPort().getId() : null,
            destPortId: typeof insertedEdge !== 'undefined' ? insertedEdge.getDestPort().getId() : null,
        };
    }, graphData);

    expect(result).toEqual({
        loaded: true,
        insertErrors: [],
        insertWarnings: [],
        hasNode1: true,
        hasNode2: true,
        hasEdge: true,
        srcPortOwnedByNode1: true,
        destPortOwnedByNode2: true,
        srcPortId: expect.any(String),
        destPortId: expect.any(String),
    });
    expect(result.srcPortId).not.toBe(result.destPortId);

    await page.close();
});
