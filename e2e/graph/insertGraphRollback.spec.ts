import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

const INPUT_GRAPH_LOCATION = "data/LoopWithBranch.graph";

test('Failed graph insertion preserves existing graph relationships', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.loadGraphFromString(page, await TestHelpers.readGraph(INPUT_GRAPH_LOCATION));

    const result = await page.evaluate(async () => {
        const eagle = (window as any).eagle;
        const graph = eagle.logicalGraph();
        const nodes: any[] = Array.from(graph.getNodes());
        const parent = nodes.find((node: any) => Array.from(node.getChildren()).length > 0);
        if (parent === undefined) {
            return { setupError: 'Fixture does not contain a parent-child relationship' };
        }

        const child: any = Array.from(parent.getChildren())[0];
        const graphConfig = new (window as any).GraphConfig();
        graphConfig.addNode(parent);
        graph.addGraphConfig(graphConfig, false);

        const originalNodes: any[] = Array.from(graph.getNodes());
        const originalEdges: any[] = Array.from(graph.getEdges());
        const originalConfigs: any[] = Array.from(graph.getGraphConfigs());
        const originalRelationships = originalNodes.map((node: any) => ({
            node,
            parent: node.getParent(),
            embed: node.getEmbed(),
            inputApplication: node.getInputApplication(),
            outputApplication: node.getOutputApplication(),
        }));
        const configNode = graphConfig.getNodeById(parent.getId());

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
        const restoredNodes: any[] = Array.from(restoredGraph.getNodes());
        const restoredEdges: any[] = Array.from(restoredGraph.getEdges());
        const restoredConfigs: any[] = Array.from(restoredGraph.getGraphConfigs());
        const relationshipsIntact = originalRelationships.every((relationship: any) => {
            return relationship.node.getParent() === relationship.parent
                && relationship.node.getEmbed() === relationship.embed
                && relationship.node.getInputApplication() === relationship.inputApplication
                && relationship.node.getOutputApplication() === relationship.outputApplication;
        });
        const restoredParent = restoredNodes.find((node: any) => node.getId() === parent.getId());
        const restoredChild = restoredNodes.find((node: any) => node.getId() === child.getId());
        const restoredConfig = restoredConfigs.find((config: any) => config.getId() === graphConfig.getId());
        const restoredConfigNode = restoredConfig?.getNodeById(parent.getId());

        return {
            insertionFailed,
            sameGraph: restoredGraph === graph,
            sameNodes: restoredNodes.length === originalNodes.length
                && originalNodes.every((node: any, index: number) => restoredNodes[index] === node),
            sameEdges: restoredEdges.length === originalEdges.length
                && originalEdges.every((edge: any, index: number) => restoredEdges[index] === edge),
            sameConfigs: restoredConfigs.length === originalConfigs.length
                && originalConfigs.every((config: any, index: number) => restoredConfigs[index] === config),
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
