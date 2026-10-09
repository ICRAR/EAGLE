import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

test('Undo duplicate snapshot detection', async ({ page }) => {
    let frontAfterAdd: number;
    await test.step('Create a graph and record its history', async () => {
        await page.goto('http://localhost:8888/?tutorial=none');
        await expect(page).toHaveTitle(/EAGLE/);
        await TestHelpers.setUIMode(page, 'Expert');
        await TestHelpers.expandPalette(page, 0);
        await page.locator('#palette_0_HelloWorldApp').scrollIntoViewIfNeeded();
        await page.locator('#addPaletteNodeHelloWorldApp').click();
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: 'OK' }).click();
        await page.waitForTimeout(500);
        frontAfterAdd = await page.evaluate<number>(() => (window as any).eagle.undo().front() as number);
    });

    await test.step('Reject a duplicate snapshot', async () => {
        await page.evaluate(() => {
            const eagle = (window as any).eagle as { undo: () => { pushSnapshot: (e: unknown, name: string) => void } };
            eagle.undo().pushSnapshot(eagle, 'duplicate push attempt');
        });
        const frontAfterDuplicatePush = await page.evaluate<number>(() => (window as any).eagle.undo().front() as number);
        expect(frontAfterDuplicatePush).toBe(frontAfterAdd);
    });

    await test.step('Accept a real graph change', async () => {
        await page.locator('#palette_0_File').scrollIntoViewIfNeeded();
        await page.locator('#addPaletteNodeFile').click();
        await page.waitForTimeout(500);
        const frontAfterFileAdd = await page.evaluate<number>(() => (window as any).eagle.undo().front() as number);
        expect(frontAfterFileAdd).not.toBe(frontAfterAdd);
    });

    await page.close();
});
