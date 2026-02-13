import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

const INPUT_GRAPH_LOCATION: string = "data/LoopWithBranch.graph";

test('Insert Graph', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    // set 'Expert' UI mode
    await TestHelpers.setUIMode(page, 'Expert');

    // 0 - create a new graph
    await TestHelpers.createNewGraph(page);

    // 1 - set the descriptions of the new graph
    await TestHelpers.setShortDescription(page, "Some short description");
    await TestHelpers.setDetailedDescription(page, "Some detailed description");

    // 2 - read input graph from file, and load it into the app
    const inputOJS = await TestHelpers.readGraph(INPUT_GRAPH_LOCATION);
    await TestHelpers.insertGraphFromString(page, inputOJS);

    const numErrors = await TestHelpers.getNumWarningsErrors(page);
    expect(numErrors).toEqual(0);

    // close the browser
    await page.close();
});