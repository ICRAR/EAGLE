import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Undo duplicate snapshot detection', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await expect(page).toHaveTitle(/EAGLE/);

    // set 'Expert' UI mode
    await TestHelpers.setUIMode(page, 'Expert');

    // expand the 'Builtin Components' palette and add a HelloWorldApp node
    await page.locator('#palette0').click();
    await page.waitForTimeout(250);
    await page.locator('#palette_0_HelloWorldApp').scrollIntoViewIfNeeded();
    await page.locator('#addPaletteNodeHelloWorldApp').click();

    // agree to create a new graph
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'OK' }).click();
    await page.waitForTimeout(500);

    // record the undo front pointer after adding the node
    const frontAfterAdd = await page.evaluate(() => {
        return (window as any).eagle.undo().front();
    });

    // push a snapshot with no graph change — should be a duplicate and aborted
    await page.evaluate(() => {
        const eagle = (window as any).eagle;
        eagle.undo().pushSnapshot(eagle, 'duplicate push attempt');
    });

    const frontAfterDuplicatePush = await page.evaluate(() => {
        return (window as any).eagle.undo().front();
    });

    // front pointer must not have advanced — duplicate was detected
    await expect(frontAfterDuplicatePush).toBe(frontAfterAdd);

    // now add a File node to genuinely change the graph
    await page.locator('#palette_0_File').scrollIntoViewIfNeeded();
    await page.locator('#addPaletteNodeFile').click();
    await page.waitForTimeout(500);

    const frontAfterFileAdd = await page.evaluate(() => {
        return (window as any).eagle.undo().front();
    });

    // front pointer must have advanced — the change was real
    await expect(frontAfterFileAdd).not.toBe(frontAfterAdd);

    await page.close();
});
