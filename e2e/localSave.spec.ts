import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Saving a modified graph clears its dirty marker', async ({ page }) => {
    test.setTimeout(15000);

    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.setUIMode(page, 'Expert');
    await TestHelpers.setSchemaVersion(page, 'V4');
    await TestHelpers.createNewGraph(page);
    await TestHelpers.expandPalette(page, 0);

    await page.locator('#addPaletteNodeHelloWorldApp').click();
    await expect(page.locator('#fileIsModified')).toBeVisible();

    const saveResponsePromise = page.waitForResponse(
        response => response.url().endsWith('/saveFileToLocal') && response.request().method() === 'POST',
        { timeout: 5000 },
    );
    await page.locator('#navbarDropdownGraph').click();
    await page.locator('.dropDropDownParent:visible').filter({ hasText: 'Local Storage' }).hover();
    await page.locator('#saveGraph').click();
    await saveResponsePromise;

    await expect(page.locator('#fileIsModified')).toBeHidden();
});