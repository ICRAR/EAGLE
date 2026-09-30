import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

const INPUT_GRAPH_LOCATION: string = "data/LoopWithBranch.graph";

test('Insert Graph', async ({ page }) => {
    await test.step('Create and configure a new graph', async () => {
        await page.goto('http://localhost:8888/?tutorial=none');
        await TestHelpers.setUIMode(page, 'Expert');
        await TestHelpers.createNewGraph(page);
        await TestHelpers.setShortDescription(page, "Some short description");
        await TestHelpers.setDetailedDescription(page, "Some detailed description");
    });

    await test.step('Insert the input graph', async () => {
        const inputOJS = await TestHelpers.readGraph(INPUT_GRAPH_LOCATION);
        await TestHelpers.insertGraphFromString(page, inputOJS);
    });

    await test.step('Verify the inserted graph', async () => {
        const numErrors = await TestHelpers.getNumWarningsErrors(page);
        expect(numErrors).toEqual(0);
    });

    // close the browser
    await page.close();
});