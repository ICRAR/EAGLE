import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Creating a Simple Graph', async ({ page }) => {
  await test.step('Set up the graph and add nodes', async () => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await expect(page).toHaveTitle(/EAGLE/);
    await TestHelpers.setUIMode(page, "Expert");
    await TestHelpers.expandPalette(page, 0);
    await page.locator('#addPaletteNodeHelloWorldApp').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'OK' }).click();
    await page.locator('#palette_0_File').scrollIntoViewIfNeeded();
    await page.locator('#addPaletteNodeFile').click();
  });

  await test.step('Connect and configure the nodes', async () => {
    await page.getByRole('button', { name: 'filter_center_focus' }).click();
    const box = await page.locator('#logicalGraphParent').boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(250);
    await TestHelpers.dragEdge(page, 'HelloWorldApp', 'File');
    await page.waitForTimeout(500);
    await page.locator('#hello .inputPort').click();
    await page.locator('.highlighted .column_Flags button.changeableFlag').click();
    await page.locator('.highlighted .tableFieldDisplayName').fill('testInput');
    await page.waitForTimeout(500);
    await page.locator('.closeBottomWindowBtn').getByRole('button').click();
  });

  await test.step('Delete a node and verify the graph state', async () => {
    const numNodesPreDelete = await TestHelpers.getNodeCount(page);
    await expect(numNodesPreDelete).toBe(2);
    await page.locator('#palette_0_File').scrollIntoViewIfNeeded();
    await page.locator('#addPaletteNodeFile').click();
    await page.waitForTimeout(500);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);
    await page.locator('#confirmModalAffirmativeAnswer').click();
    await page.waitForTimeout(500);
    const numNodesPostDelete = await TestHelpers.getNodeCount(page);
    await expect(numNodesPostDelete).toBe(2);
  });

  await page.close();
});
