import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

const VALID_GRAPH = 'data/LoopWithBranch.graph';

type TestNode = {
    getId: () => string;
};

type TestEdge = {
    getId: () => string;
};

type TestGraph = {
    getNodes: () => Iterable<TestNode>;
    getEdges: () => Iterable<TestEdge>;
    createRollbackSnapshot: () => TestGraph;
};

type TestErrorsWarnings = {
    errors: unknown[];
    warnings: unknown[];
};

type TestEagle = {
    logicalGraph: {
        (): TestGraph;
        (graph: TestGraph): void;
    };
    _loadGraphJSON: (
        json: string,
        fileName: string,
        loadCallback: (graph: TestGraph, errorsWarnings: TestErrorsWarnings) => void | Promise<void>
    ) => Promise<boolean>;
    insertGraph: (
        nodes: TestNode[],
        edges: TestEdge[],
        parentNode: TestNode | null,
        errorsWarnings: TestErrorsWarnings
    ) => Promise<void>;
};

type TestWindow = {
    eagle: TestEagle;
};

type SnapshotCount = {
    loaded: boolean;
    snapshotCalls: number;
};

// Every snapshot deep-clone taken on the active graph during the test is counted by wrapping
// its createRollbackSnapshot; the wrapper is always restored in a finally block.
test('A non-graph file rejection does not take a rollback snapshot', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.loadGraphFromString(page, await TestHelpers.readGraph(VALID_GRAPH));

    const result: SnapshotCount = await page.evaluate(async () => {
        const eagle = (window as unknown as TestWindow).eagle;
        const graph = eagle.logicalGraph();
        const original = graph.createRollbackSnapshot;
        let count = 0;
        graph.createRollbackSnapshot = () => {
            count++;
            return original();
        };
        let loaded = false;
        try {
            loaded = await eagle._loadGraphJSON(JSON.stringify({ foo: 'bar' }), 'notagraph.graph', () => undefined);
        } finally {
            graph.createRollbackSnapshot = original;
        }
        return { loaded: Boolean(loaded), snapshotCalls: count };
    });

    expect(result.loaded).toBe(false);
    expect(result.snapshotCalls).toBe(0);
});

test('A structurally-invalid V4 graph rejection does not take a rollback snapshot', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.loadGraphFromString(page, await TestHelpers.readGraph(VALID_GRAPH));

    const result: SnapshotCount = await page.evaluate(async () => {
        const eagle = (window as unknown as TestWindow).eagle;
        const graph = eagle.logicalGraph();
        const original = graph.createRollbackSnapshot;
        let count = 0;
        graph.createRollbackSnapshot = () => {
            count++;
            return original();
        };
        let loaded = false;
        try {
            loaded = await eagle._loadGraphJSON(JSON.stringify({ modelData: null }), 'invalid.graph', () => undefined);
        } finally {
            graph.createRollbackSnapshot = original;
        }
        return { loaded: Boolean(loaded), snapshotCalls: count };
    });

    expect(result.loaded).toBe(false);
    expect(result.snapshotCalls).toBe(0);
});

test('A valid graph load (replace path) takes no rollback snapshot', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.loadGraphFromString(page, await TestHelpers.readGraph(VALID_GRAPH));

    const validJson = await TestHelpers.readGraph(VALID_GRAPH);
    const result: SnapshotCount = await page.evaluate(async (json: string) => {
        const eagle = (window as unknown as TestWindow).eagle;
        const graph = eagle.logicalGraph();
        const original = graph.createRollbackSnapshot;
        let count = 0;
        graph.createRollbackSnapshot = () => {
            count++;
            return original();
        };
        let loaded = false;
        try {
            loaded = await eagle._loadGraphJSON(json, 'valid.graph', (lg) => {
                eagle.logicalGraph(lg);
            });
        } finally {
            graph.createRollbackSnapshot = original;
        }
        return { loaded: Boolean(loaded), snapshotCalls: count };
    }, validJson);

    // The replace path swaps the active graph with a single atomic assignment; there is no
    // partial state to roll back, so no snapshot is taken.
    expect(result.loaded).toBe(true);
    expect(result.snapshotCalls).toBe(0);
});

test('The insert path takes a single rollback snapshot', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.loadGraphFromString(page, await TestHelpers.readGraph(VALID_GRAPH));

    const validJson = await TestHelpers.readGraph(VALID_GRAPH);
    const result: SnapshotCount = await page.evaluate(async (json: string) => {
        const eagle = (window as unknown as TestWindow).eagle;
        const graph = eagle.logicalGraph();
        const original = graph.createRollbackSnapshot;
        let count = 0;
        graph.createRollbackSnapshot = () => {
            count++;
            return original();
        };
        let loaded = false;
        try {
            loaded = await eagle._loadGraphJSON(json, 'insert.graph', async (lg, errorsWarnings) => {
                await eagle.insertGraph(Array.from(lg.getNodes()), Array.from(lg.getEdges()), null, errorsWarnings);
            });
        } finally {
            graph.createRollbackSnapshot = original;
        }
        return { loaded: Boolean(loaded), snapshotCalls: count };
    }, validJson);

    // The insert path is the one mutation that can leave the live graph partially modified,
    // so it is the single place a rollback snapshot is taken: insertGraph owns it, and
    // _loadGraphJSON takes none.
    expect(result.snapshotCalls).toBe(1);
});
