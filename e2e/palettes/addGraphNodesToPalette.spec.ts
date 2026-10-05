import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

test('Add graph nodes to a new custom palette', async ({ page }) => {

    await test.step('Set up an editable graph', async () => {
        await page.goto('http://localhost:8888/?tutorial=none');
        await expect(page).toHaveTitle(/EAGLE/);
        await TestHelpers.setUIMode(page, 'Expert');
        await TestHelpers.createNewGraph(page);
    });

    await test.step('Add a graph node to a custom palette', async () => {
        await TestHelpers.expandPalette(page, 0);
        await page.locator('#addPaletteNodeHelloWorldApp').click();
        await page.waitForTimeout(500);
        await page.locator('#addGraphNodesToPalette').click();
        await TestHelpers.enterCustomChoiceName(page, 'myTestPalette');
        await page.waitForTimeout(500);
    });

    await test.step('Verify the custom palette', async () => {
        await expect(page.locator('#userMessageModal')).not.toBeVisible();
        const newPaletteNodeCount = await page.evaluate(() => {
            const eagle = (window as any).eagle;
            for (const palette of eagle.palettes()) {
                if (palette.fileInfo().name === 'myTestPalette.palette') {
                    return palette.getNumNodes();
                }
            }
            return -1;
        });

        expect(newPaletteNodeCount).toBeGreaterThan(0);
    });

    await page.close();
});
