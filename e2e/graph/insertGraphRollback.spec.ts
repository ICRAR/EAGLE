import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

const INPUT_GRAPH_LOCATION = "data/LoopWithBranch.graph";

type TestNode = {
    getChildren: () => Iterable<TestNode>;
    getParent: () => TestNode | null;
    getEmbed: () => TestNode | null;
    getInputApplication: () => TestNode | null;
    getOutputApplication: () => TestNode | null;
    getId: () => string;
    clone: () => TestNode;
    setId: (id: string) => TestNode;
};

type TestEdge = object;

type TestGraphConfigNode = {
    getNode: () => TestNode;
};

type TestGraphConfig = {
    addNode: (node: TestNode) => TestGraphConfigNode;
    getId: () => string;
    getNodeById: (id: string) => TestGraphConfigNode | undefined;
};

type TestGraph = {
    getNodes: () => Iterable<TestNode>;
    getEdges: () => Iterable<TestEdge>;
    getGraphConfigs: () => Iterable<TestGraphConfig>;
    addGraphConfig: (config: TestGraphConfig, markChanged: boolean) => void;
    getNodeById: (id: string) => TestNode | undefined;
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
    insertGraph: (
        nodes: (TestNode | null)[],
        edges: TestEdge[],
        parent: TestNode | null,
        errorsWarnings: {errors: unknown[], warnings: unknown[]}
    ) => Promise<void>;
};

test('Failed graph insertion preserves existing graph relationships', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    const fixtureGraph = await TestHelpers.readGraph(INPUT_GRAPH_LOCATION);
    const graphLoaded = await page.evaluate(async (json: string) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        return eagle._loadGraphJSON(json, 'rollback-fixture.graph', (graph) => {
            eagle.logicalGraph(graph);
        });
    }, fixtureGraph);
    expect(graphLoaded).toBe(true);

    const result = await page.evaluate(async () => {
        const testWindow = window as unknown as {
            eagle: TestEagle;
            GraphConfig: new () => TestGraphConfig;
        };
        const eagle = testWindow.eagle;
        const graph = eagle.logicalGraph();
        const nodes = Array.from(graph.getNodes());
        const parent = nodes.find((node) => Array.from(node.getChildren()).length > 0);
        if (parent === undefined) {
            throw new Error('Fixture does not contain a parent-child relationship');
        }

        const child = Array.from(parent.getChildren()).at(0);
        if (child === undefined) {
            throw new Error('Fixture parent does not contain a child');
        }

        const graphConfig = new testWindow.GraphConfig();
        graphConfig.addNode(parent);
        graph.addGraphConfig(graphConfig, false);

        const originalNodes = Array.from(graph.getNodes());
        const originalEdges = Array.from(graph.getEdges());
        const originalConfigs = Array.from(graph.getGraphConfigs());
        const originalRelationships = originalNodes.map((node) => ({
            node,
            parent: node.getParent(),
            embed: node.getEmbed(),
            inputApplication: node.getInputApplication(),
            outputApplication: node.getOutputApplication(),
        }));
        const configNode = graphConfig.getNodeById(parent.getId());
        if (configNode === undefined) {
            throw new Error('Graph config did not retain its parent node');
        }

        // The parent is added first; normaliseNodes then throws on the invalid node,
        // exercising rollback after the graph has already been partially mutated.
        const insertionParent = parent.clone().setId(`rollback-parent-${Date.now()}`);
        let insertionFailed = false;
        try {
            await eagle.insertGraph([null], [], insertionParent, { errors: [], warnings: [] });
        } catch {
            insertionFailed = true;
        }

        const restoredGraph = eagle.logicalGraph();
        const restoredNodes = Array.from(restoredGraph.getNodes());
        const restoredEdges = Array.from(restoredGraph.getEdges());
        const restoredConfigs = Array.from(restoredGraph.getGraphConfigs());
        const relationshipsIntact = originalRelationships.every((relationship) => {
            return relationship.node.getParent() === relationship.parent
                && relationship.node.getEmbed() === relationship.embed
                && relationship.node.getInputApplication() === relationship.inputApplication
                && relationship.node.getOutputApplication() === relationship.outputApplication;
        });
        const restoredParent = restoredNodes.find((node) => node.getId() === parent.getId());
        const restoredChild = restoredNodes.find((node) => node.getId() === child.getId());
        const restoredConfig = restoredConfigs.find((config) => config.getId() === graphConfig.getId());
        const restoredConfigNode = restoredConfig?.getNodeById(parent.getId());

        return {
            insertionFailed,
            sameGraph: restoredGraph === graph,
            sameNodes: restoredNodes.length === originalNodes.length
                && originalNodes.every((node, index) => restoredNodes[index] === node),
            sameEdges: restoredEdges.length === originalEdges.length
                && originalEdges.every((edge, index) => restoredEdges[index] === edge),
            sameConfigs: restoredConfigs.length === originalConfigs.length
                && originalConfigs.every((config, index) => restoredConfigs[index] === config),
            relationshipsIntact,
            childStillReferencesParent: child.getParent() === parent,
            restoredChildReferencesRestoredParent: restoredChild?.getParent() === restoredParent,
            configNodeStillReferencesOriginalNode: configNode.getNode() === parent,
            restoredConfigNodeReferencesRestoredNode: restoredConfigNode?.getNode() === restoredParent,
        };
    });

    expect(result).toEqual({
        insertionFailed: true,
        sameGraph: true,
        sameNodes: true,
        sameEdges: true,
        sameConfigs: true,
        relationshipsIntact: true,
        childStillReferencesParent: true,
        restoredChildReferencesRestoredParent: true,
        configNodeStillReferencesOriginalNode: true,
        restoredConfigNodeReferencesRestoredNode: true,
    });

    await page.close();
});
