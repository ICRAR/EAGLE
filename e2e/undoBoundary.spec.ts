import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Undo exhausted history warns on first boundary keypress', async ({ page }) => {
    await test.step('Build and undo the graph history', async () => {
        await page.goto('http://localhost:8888/?tutorial=none');
        await TestHelpers.setUIMode(page, 'Expert');
        await expect(await TestHelpers.getNodeCount(page)).toBe(0);
        await TestHelpers.expandPalette(page, 0);
        await page.locator('#palette_0_HelloWorldApp').scrollIntoViewIfNeeded();
        await page.locator('#addPaletteNodeHelloWorldApp').click();
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: 'OK' }).click();
        await page.waitForTimeout(500);
        await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(1);
        for (let expectedCount = 2; expectedCount <= 4; expectedCount++) {
            await page.locator('#palette_0_File').scrollIntoViewIfNeeded();
            await page.locator('#addPaletteNodeFile').click();
            await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(expectedCount);
        }
        for (let expectedCount = 3; expectedCount >= 0; expectedCount--) {
            await TestHelpers.undo(page);
            await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(expectedCount);
        }
    });

    await test.step('Verify metadata and history boundaries', async () => {
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
    });

    await page.close();
});

test('Undo still works after add undo add branch', async ({ page }) => {
    await test.step('Create and branch the undo history', async () => {
        await page.goto('http://localhost:8888/?tutorial=none');
        await TestHelpers.setUIMode(page, 'Expert');
        await expect(await TestHelpers.getNodeCount(page)).toBe(0);
        await TestHelpers.expandPalette(page, 0);
        await page.locator('#palette_0_HelloWorldApp').scrollIntoViewIfNeeded();
        await page.locator('#addPaletteNodeHelloWorldApp').click();
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: 'OK' }).click();
        await page.waitForTimeout(500);
        await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(1);
        await TestHelpers.undo(page);
        await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(0);
        await page.locator('#palette_0_File').scrollIntoViewIfNeeded();
        await page.locator('#addPaletteNodeFile').click();
        await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(1);
        await TestHelpers.undo(page);
        await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(0);
    });

    await test.step('Verify metadata undo and the final boundary', async () => {
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
    });
    
    await page.close();
});