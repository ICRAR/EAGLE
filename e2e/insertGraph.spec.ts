import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

const INPUT_GRAPH_LOCATION: string = "data/LoopWithBranch.graph";

test('V4 Format JSON Match', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    // set 'Expert' UI mode
    await TestHelpers.setUIMode(page, 'Expert');

    // 1 - read input graph from file, and load it into the app
    const inputOJS = await TestHelpers.readGraph(INPUT_GRAPH_LOCATION);
    await TestHelpers.insertGraphFromString(page, inputOJS);

    const numErrors = await TestHelpers.getNumWarningsErrors(page);
    expect(numErrors).toEqual(0);

    // close the browser
    await page.close();
});