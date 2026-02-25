import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Undo', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    // set 'Expert' UI mode
    await TestHelpers.setUIMode(page, 'Expert');

    // check that number of nodes is 0
    const nodeCount = await TestHelpers.getNodeCount(page);
    await expect(nodeCount).toBe(0);

    // expand the 'Builtin Components' palette
    await page.locator('#palette0').click();
    await page.waitForTimeout(250);

    // add a helloworld app to the graph by clicking it's icon
    await page.locator('#palette_0_HelloWorldApp').scrollIntoViewIfNeeded();
    await page.locator('#addPaletteNodeHelloWorldApp').click();

    // agree to create a new graph with it's auto-generated name
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'OK' }).click();
    await page.waitForTimeout(500);

    // check that number of nodes is 1
    const nodeCount2 = await TestHelpers.getNodeCount(page);
    await expect(nodeCount2).toBe(1);

    // scroll the file node into view in the palette
    await page.locator('#palette_0_File').scrollIntoViewIfNeeded()
    await page.locator('#addPaletteNodeFile').click();

    // check that number of nodes is 2
    const nodeCount3 = await TestHelpers.getNodeCount(page);
    await expect(nodeCount3).toBe(2);

    // undo the last action (adding the file node)
    await TestHelpers.undo(page);

    // check that number of nodes is 1
    const nodeCount4 = await TestHelpers.getNodeCount(page);
    await expect(nodeCount4).toBe(1);

    // redo the last action (adding the file node)
    await TestHelpers.redo(page);

    // check that number of nodes is 2
    const nodeCount5 = await TestHelpers.getNodeCount(page);
    await expect(nodeCount5).toBe(2);

    // undo the last action (adding the file node)
    await TestHelpers.undo(page);

    // check that number of nodes is 1
    const nodeCount6 = await TestHelpers.getNodeCount(page);
    await expect(nodeCount6).toBe(1);

    // undo the last action (adding the hello world node)
    await TestHelpers.undo(page);

    // check that number of nodes is 0
    const nodeCount7 = await TestHelpers.getNodeCount(page);
    await expect(nodeCount7).toBe(0);

    // redo the last action (adding the hello world node)
    await TestHelpers.redo(page);

    // check that number of nodes is 1
    const nodeCount8 = await TestHelpers.getNodeCount(page);
    await expect(nodeCount8).toBe(1);

    // close the browser
    await page.close();
});