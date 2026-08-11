import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

// Regression test for: fix all issues, do other actions, undo — previously fixed
// errors/warnings must NOT reappear.
// https://github.com/ICRAR/EAGLE/issues/1667
//
// Reproduction steps:
// 1. Open a graph that has fixable warnings/errors
// 2. Fix all issues with 'f'
// 3. Delete two nodes
// 4. Undo (z) once to restore one deleted node
// 5. Verify warning/error count has NOT reverted to pre-fix levels

const GRAPH_URL =
    'https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/examples/HelloWorld-Universe-function.graph';

test('Undo after fixAll does not reintroduce fixed errors', async ({ page }) => {
    // load the graph via URL query param
    await page.goto('http://localhost:8888/?tutorial=none&service=Url&url=' + GRAPH_URL);

    // wait for the graph-load notification
    await page.locator('div[data-notify="container"]').waitFor({ state: 'attached' });
    await page.locator('button[data-notify="dismiss"]').click();
    await page.locator('div[data-notify="container"]').waitFor({ state: 'detached' });

    // set UI mode so editing is allowed
    await TestHelpers.setUIMode(page, 'Expert');

    // capture the initial warning/error count before fix
    const initialCount = await TestHelpers.getNumWarningsErrors(page);
    console.log('Initial warnings+errors:', initialCount);

    // press 'f' to run fixAll
    await page.press('body', 'f');

    // dismiss any notification from fixAll
    await page.locator('div[data-notify="container"]').waitFor({ state: 'attached' });
    await page.locator('button[data-notify="dismiss"]').click();
    await page.locator('div[data-notify="container"]').waitFor({ state: 'detached' });

    // Wait until graph state settles after applying fixes.
    await expect.poll(async () => await TestHelpers.getNumWarningsErrors(page)).toBeLessThanOrEqual(initialCount);

    // capture the post-fix count — this is the count that must be preserved after undo
    const postFixCount = await TestHelpers.getNumWarningsErrors(page);
    console.log('Post-fix warnings+errors:', postFixCount);

    // get the node count so we know how many to select for deletion
    const nodeCount = await TestHelpers.getNodeCount(page);
    expect(nodeCount).toBeGreaterThan(1);

    // select all nodes and delete them one at a time using the evaluate API to avoid
    // needing to click on canvas nodes (positions may vary)
    const nodeIds: string[] = await page.evaluate(() => {
        const eagle = (window as any).eagle;
        return Array.from(eagle.logicalGraph().nodes().keys()) as string[];
    });

    // delete first node via the eagle API directly
    await page.evaluate(async (id: string) => {
        const eagle = (window as any).eagle;
        const node = eagle.logicalGraph().getNodeById(id);
        if (node) {
            eagle.setSelection(node, (window as any).Eagle.FileType.Graph);
            await eagle.deleteSelection(false, true, false);
        }
    }, nodeIds[0]);
    await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(nodeCount - 1);

    // delete second node
    await page.evaluate(async (id: string) => {
        const eagle = (window as any).eagle;
        const node = eagle.logicalGraph().getNodeById(id);
        if (node) {
            eagle.setSelection(node, (window as any).Eagle.FileType.Graph);
            await eagle.deleteSelection(false, true, false);
        }
    }, nodeIds[1]);
    await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(nodeCount - 2);

    // verify two nodes were deleted
    const nodeCountAfterDelete = await TestHelpers.getNodeCount(page);
    expect(nodeCountAfterDelete).toBe(nodeCount - 2);

    // undo once (restores one deletion)
    await TestHelpers.undo(page);
    await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(nodeCount - 1);

    // one node should be back
    const nodeCountAfterUndo = await TestHelpers.getNodeCount(page);
    expect(nodeCountAfterUndo).toBe(nodeCount - 1);

    // THE CRITICAL ASSERTION: warning/error count after undo must equal the post-fix
    // count, NOT the original pre-fix count.
    const countAfterUndo = await TestHelpers.getNumWarningsErrors(page);
    console.log('Warnings+errors after undo:', countAfterUndo);

    expect(countAfterUndo).toBe(postFixCount);

    await page.close();
});
