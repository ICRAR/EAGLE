import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

test('findEdgesContainedByNodes handles graph iterators and partial selections', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await expect(page).toHaveTitle(/EAGLE/);

    await TestHelpers.setUIMode(page, 'Expert');
    await TestHelpers.expandPalette(page, 0);

    await page.locator('#addPaletteNodeHelloWorldApp').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'OK' }).click();

    await page.locator('#palette_0_File').scrollIntoViewIfNeeded();
    await page.locator('#addPaletteNodeFile').click();
    await page.waitForTimeout(500);
    await TestHelpers.dragEdge(page, 'HelloWorldApp', 'File');

    const result = await page.evaluate(() => {
        const eagle = (window as any).eagle as { logicalGraph: () => { getNodes: () => Map<string, unknown>; getEdges: () => unknown[] } };
        const graph = eagle.logicalGraph();
        const nodes = Array.from(graph.getNodes());
        const edges = Array.from(graph.getEdges());
        const graphRenderer = (window as any).GraphRenderer as { findEdgesContainedByNodes: (edges: unknown[], nodes: unknown[] | unknown[]) => { getId: () => string }[] };

        const allSelected = graphRenderer.findEdgesContainedByNodes(
            graph.getEdges() as unknown[],
            graph.getNodes() as unknown[],
        );
        const oneSelected = graphRenderer.findEdgesContainedByNodes(
            graph.getEdges() as unknown[],
            [nodes[0]] as unknown[],
        );

        return {
            graphEdgeCount: edges.length,
            allSelectedIds: allSelected.map((edge) => edge.getId()),
            oneSelectedCount: oneSelected.length,
        };
    });

    expect(result.graphEdgeCount).toBeGreaterThan(0);
    expect(result.allSelectedIds).toHaveLength(result.graphEdgeCount);
    expect(result.oneSelectedCount).toBe(0);

    await page.close();
});

test('findDepthOfNode follows nested parents', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await expect(page).toHaveTitle(/EAGLE/);

    await TestHelpers.setUIMode(page, 'Expert');
    await TestHelpers.expandPalette(page, 0);

    await page.locator('#addPaletteNodeHelloWorldApp').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'OK' }).click();

    await page.locator('#palette_0_File').scrollIntoViewIfNeeded();
    await page.locator('#addPaletteNodeFile').click();
    await page.waitForTimeout(500);
    await page.locator('#palette_0_File').scrollIntoViewIfNeeded();
    await page.locator('#addPaletteNodeFile').click();
    await page.waitForTimeout(500);

    const depth = await page.evaluate(() => {
        const eagle = (window as any).eagle as { logicalGraph: () => { getNodes: () => Map<string, unknown>; getNodeByIndex: (i: number) => { setParent: (n: unknown) => void; getDrawOrderHint: () => number } }; setSelection: (a: null, b: string) => void };
        const graph = eagle.logicalGraph();
        eagle.setSelection(null, 'Graph');
        const nodes = Array.from(graph.getNodes());
        const child = graph.getNodeByIndex(0);
        const parent = graph.getNodeByIndex(1);
        const grandparent = graph.getNodeByIndex(2);

        child.setParent(parent);
        parent.setParent(grandparent);

        const expectedDepth = 2 + (
            child.getDrawOrderHint() +
            parent.getDrawOrderHint() +
            grandparent.getDrawOrderHint()
        ) / 10;

        return {
            actual: (window as any).GraphRenderer.findDepthOfNode(0, nodes) as number,
            expected: expectedDepth,
        };
    });

    expect(depth.actual).toBe(depth.expected);
    
    await page.close();
});
