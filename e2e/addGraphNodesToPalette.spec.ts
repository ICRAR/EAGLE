import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Add graph nodes to a new custom palette', async ({ page }) => {

    await page.goto('http://localhost:8888/?tutorial=none');
    await expect(page).toHaveTitle(/EAGLE/);

    // set Expert mode - enables both graph editing and palette editing
    await TestHelpers.setUIMode(page, 'Expert');

    // create a new named graph (so adding a node won't re-prompt for a graph name)
    await TestHelpers.createNewGraph(page);

    // expand the first palette (Builtin Components) and add a HelloWorldApp to the graph
    await TestHelpers.expandPalette(page, 0);
    await page.locator('#addPaletteNodeHelloWorldApp').click();
    // wait for the node to actually appear in the graph before proceeding
    await page.waitForFunction(() => (window as any).eagle.logicalGraph().getNumNodes() > 0);

    // click the "Add Graph Nodes To Palette" button in the navbar
    await page.locator('#addGraphNodesToPalette').click();

    // the choice modal appears; since no writable palettes exist yet, the custom
    // name input is directly available - fill in a new palette name and confirm
    await TestHelpers.enterCustomChoiceName(page, 'myTestPalette');

    // verify no error dialog appeared
    await expect(page.locator('#userMessageModal')).not.toBeVisible();

    // verify the new palette was created and contains nodes
    const newPaletteNodeCount = await page.evaluate(() => {
        const eagle = (window as any).eagle;
        for (const palette of eagle.palettes()) {
            if (palette.fileInfo().name === 'myTestPalette.palette') {
                return palette.getNumNodes();
            }
        }
        return -1; // palette not found
    });

    expect(newPaletteNodeCount).toBeGreaterThan(0);

    await page.close();
});
