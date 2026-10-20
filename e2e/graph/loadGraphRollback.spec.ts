import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

const INPUT_GRAPH_LOCATION = 'data/LoopWithBranch.graph';

test('A failed graph load restores the existing graph and its config references in place', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.loadGraphFromString(page, await TestHelpers.readGraph(INPUT_GRAPH_LOCATION));

    const result = await page.evaluate(async () => {
        const eagle = (window as any).eagle;
        const graph = eagle.logicalGraph();
        const originalNodes: any[] = Array.from(graph.getNodes());
        const node = originalNodes[0];
        const graphConfig = new (window as any).GraphConfig();
        graphConfig.addNode(node);
        graph.addGraphConfig(graphConfig, false);
        const configNode = graphConfig.getNodeById(node.getId());

        const loaded = await eagle._loadGraphJSON(JSON.stringify({
            modelData: { type: 'Graph', schemaVersion: 'V4', name: 'throws after parsing' },
            nodes: {},
            edges: {},
            visuals: {},
            graphConfigurations: {},
            activeGraphConfigId: null,
        }), 'throws-after-parsing.graph', () => {
            graph.clear();
            throw new Error('simulated post-parse load failure');
        });

        const restoredGraph = eagle.logicalGraph();
        const restoredNodes: any[] = Array.from(restoredGraph.getNodes());
        const restoredConfig = Array.from(restoredGraph.getGraphConfigs()).find((config: any) => config.getId() === graphConfig.getId());
        const restoredConfigNode = restoredConfig?.getNodeById(node.getId());

        return {
            loaded: Boolean(loaded),
            sameGraph: restoredGraph === graph,
            sameNodes: restoredNodes.length === originalNodes.length
                && originalNodes.every((originalNode: any) => restoredNodes.includes(originalNode)),
            sameConfig: restoredConfig === graphConfig,
            sameConfigNode: restoredConfigNode === configNode,
            configNodeReferencesLiveNode: restoredConfigNode?.getNode() === node,
            liveNodeRestored: restoredGraph.getNodeById(node.getId()) === node,
        };
    });

    expect(result).toEqual({
        loaded: false,
        sameGraph: true,
        sameNodes: true,
        sameConfig: true,
        sameConfigNode: true,
        configNodeReferencesLiveNode: true,
        liveNodeRestored: true,
    });

    await page.close();
});
