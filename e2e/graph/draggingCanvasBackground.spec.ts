import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';
import type { Eagle } from '../../src/Eagle';

async function firstNodePosition(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const eagle = (window as any).eagle as Eagle;
    const nodes = eagle.logicalGraph().getNodes();
    const [node] = nodes;
    return node.getPosition();
  });
}

test('Dragging the Canvas Background', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await test.step('Set up an expert-mode graph with a node', async () => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await expect(page).toHaveTitle(/EAGLE/);
    await TestHelpers.setUIMode(page, 'Expert');
    await TestHelpers.expandPalette(page, 0);
    await page.locator('#addPaletteNodeHelloWorldApp').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'OK' }).click();
    await page.waitForTimeout(500);
    const numNodes = await TestHelpers.getNodeCount(page);
    expect(numNodes).toBe(1);
  });

  await test.step('Left-click drag on the empty canvas background pans the canvas', async () => {
    const box = await page.locator('#logicalGraphParent').boundingBox();
    if (!box) {
      throw new Error('graph canvas is not visible');
    }

    const offsetBefore = await page.evaluate(() => {
      const eagle = (window as any).eagle as Eagle;
      return {
        x: eagle.globalOffsetX(),
        y: eagle.globalOffsetY(),
      };
    });
    const transformBefore = await page.locator('#logicalGraph').getAttribute('style');

    const nodePositionBefore = await firstNodePosition(page);

    // drag from the lower-left of the canvas, where the background is guaranteed
    // to be empty (the node sits near the center) and away from other UI overlays
    const startX = box.x + box.width * 0.7;
    const startY = box.y + box.height * 0.75;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 150, startY + 100, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    const offsetAfter = await page.evaluate(() => {
      const eagle = (window as any).eagle as Eagle;
      return {
        x: eagle.globalOffsetX(),
        y: eagle.globalOffsetY(),
      };
    });

    // the canvas moved in the drag direction
    expect(offsetAfter.x - offsetBefore.x).toBeGreaterThan(0);
    expect(offsetAfter.y - offsetBefore.y).toBeGreaterThan(0);

    // and the rendered graph transform reflects the new offset
    const transformAfter = await page.locator('#logicalGraph').getAttribute('style');
    expect(transformAfter).not.toBe(transformBefore);

    // the drag must not have moved the node itself
    expect(await TestHelpers.getNodeCount(page)).toBe(1);
    const nodePositionAfter = await firstNodePosition(page);
    expect(nodePositionAfter).toEqual(nodePositionBefore);
  });

  await test.step('Clicking the empty background clears the selection without console errors', async () => {
    // select the node by clicking its body, as a user would
    await page.locator('.node .body').first().click();
    await page.waitForTimeout(300);
    const selectedBefore = await page.evaluate(() => {
      const eagle = (window as any).eagle as Eagle;
      return eagle.selectedObjects().length as number;
    });
    expect(selectedBefore).toBe(1);

    const box = await page.locator('#logicalGraphParent').boundingBox();
    if (!box) {
      throw new Error('graph canvas is not visible');
    }
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.75);
    await page.waitForTimeout(300);

    const selectedAfter = await page.evaluate(() => {
      const eagle = (window as any).eagle as Eagle;
      return eagle.selectedObjects().length as number;
    });
    expect(selectedAfter).toBe(0);
    expect(consoleErrors).toHaveLength(0);
  });

  await page.close();
});
