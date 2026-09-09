import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Dragging a palette component into the graph creates the node', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.setUIMode(page, 'Expert');
    await TestHelpers.createNewGraph(page);
    await TestHelpers.expandPalette(page, 0);

    const paletteFile = page.locator('#palette_0_File').locator('..');
    await paletteFile.dragTo(page.locator('#logicalGraphParent'), { targetPosition: { x: 500, y: 350 } });

    await expect.poll(() => TestHelpers.getNodeCount(page)).toBe(1);
    const nodeNames = await page.evaluate(() =>
        Array.from((window as any).eagle.logicalGraph().getNodes()).map((node: any) => node.getName()),
    );
    expect(nodeNames).toEqual(['File']);
});