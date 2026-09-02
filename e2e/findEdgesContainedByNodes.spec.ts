import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

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
        const eagle = (window as any).eagle;
        const graph = eagle.logicalGraph();
        const nodes = Array.from(graph.getNodes());
        const edges = Array.from(graph.getEdges());
        const graphRenderer = (window as any).GraphRenderer;

        const allSelected = graphRenderer.findEdgesContainedByNodes(
            graph.getEdges(),
            graph.getNodes(),
        );
        const oneSelected = graphRenderer.findEdgesContainedByNodes(
            graph.getEdges(),
            [nodes[0]],
        );

        return {
            graphEdgeCount: edges.length,
            allSelectedIds: allSelected.map((edge: any) => edge.getId()),
            oneSelectedCount: oneSelected.length,
        };
    });

    expect(result.graphEdgeCount).toBeGreaterThan(0);
    expect(result.allSelectedIds).toHaveLength(result.graphEdgeCount);
    expect(result.oneSelectedCount).toBe(0);
});
