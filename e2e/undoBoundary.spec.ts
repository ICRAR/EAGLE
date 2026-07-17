import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Undo exhausted history warns on first boundary keypress', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    // set 'Expert' UI mode
    await TestHelpers.setUIMode(page, 'Expert');

    // start from an empty graph
    await expect(await TestHelpers.getNodeCount(page)).toBe(0);

    // expand the first palette and add 4 nodes one-by-one
    await TestHelpers.expandPalette(page, 0);

    await page.locator('#palette_0_HelloWorldApp').scrollIntoViewIfNeeded();
    await page.locator('#addPaletteNodeHelloWorldApp').click();

    // agree to create a new graph with auto-generated name
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'OK' }).click();
    await page.waitForTimeout(500);
    await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(1);

    for (let expectedCount = 2; expectedCount <= 4; expectedCount++) {
        await page.locator('#palette_0_File').scrollIntoViewIfNeeded();
        await page.locator('#addPaletteNodeFile').click();
        await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(expectedCount);
    }

    // undo exactly 4 actions to get back to empty graph
    for (let expectedCount = 3; expectedCount >= 0; expectedCount--) {
        await TestHelpers.undo(page);
        await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(expectedCount);
    }

    // clear any previous notifications so we only observe the boundary attempt
    await page.evaluate(() => {
        const $ = (window as any).$;
        $('[data-notify="container"]').remove();
    });

    // the first extra undo is still valid on a fresh graph because graph
    // initialization metadata is recorded in undo history.
    await TestHelpers.undo(page);

    const notification = page.locator('div[data-notify="container"]').first();
    await notification.waitFor({ state: 'attached' });
    await expect(notification.locator('[data-notify="title"]')).toContainText('Undo');
    await expect(notification.locator('span[data-notify="message"]')).toContainText('Added a new graph configuration');

    // This metadata undo should not alter visible graph state.
    await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(0);

    await page.locator('button[data-notify="dismiss"]').first().click();

    // The next undo is the real boundary.
    await TestHelpers.undo(page);

    const boundaryNotification = page.locator('div[data-notify="container"]').first();
    await boundaryNotification.waitFor({ state: 'attached' });
    await expect(boundaryNotification.locator('[data-notify="title"]')).toContainText('Unable to Undo');
    await expect(boundaryNotification.locator('span[data-notify="message"]')).toContainText('No further history available');
    await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(0);

    await page.locator('button[data-notify="dismiss"]').first().click();
    await page.close();
});

test('Undo still works after add undo add branch', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    await TestHelpers.setUIMode(page, 'Expert');
    await expect(await TestHelpers.getNodeCount(page)).toBe(0);

    await TestHelpers.expandPalette(page, 0);

    // First add creates the graph.
    await page.locator('#palette_0_HelloWorldApp').scrollIntoViewIfNeeded();
    await page.locator('#addPaletteNodeHelloWorldApp').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'OK' }).click();
    await page.waitForTimeout(500);
    await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(1);

    // Undo back to empty.
    await TestHelpers.undo(page);
    await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(0);

    // Branch history by adding a different node.
    await page.locator('#palette_0_File').scrollIntoViewIfNeeded();
    await page.locator('#addPaletteNodeFile').click();
    await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(1);

    // Undo should still work immediately on the new branch.
    await TestHelpers.undo(page);
    await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(0);

    // One more undo should still be valid because graph initialization metadata
    // is part of the undo history.
    await page.evaluate(() => {
        const $ = (window as any).$;
        $('[data-notify="container"]').remove();
    });

    await TestHelpers.undo(page);

    const notification = page.locator('div[data-notify="container"]').first();
    await notification.waitFor({ state: 'attached' });
    await expect(notification.locator('[data-notify="title"]')).toContainText('Undo');
    await expect(notification.locator('span[data-notify="message"]')).toContainText('Added a new graph configuration');
    await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(0);

    await page.locator('button[data-notify="dismiss"]').first().click();

    await TestHelpers.undo(page);

    const boundaryNotification = page.locator('div[data-notify="container"]').first();
    await boundaryNotification.waitFor({ state: 'attached' });
    await expect(boundaryNotification.locator('[data-notify="title"]')).toContainText('Unable to Undo');
    await expect(boundaryNotification.locator('span[data-notify="message"]')).toContainText('No further history available');
    await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(0);

    await page.locator('button[data-notify="dismiss"]').first().click();
    await page.close();
});