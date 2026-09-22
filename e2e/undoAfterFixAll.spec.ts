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
    let initialCount: number;
    let postFixCount: number;

    await test.step('Load the graph and capture initial issues', async () => {
        await page.goto('http://localhost:8888/?tutorial=none&service=Url&url=' + GRAPH_URL);
        await page.locator('div[data-notify="container"]').waitFor({ state: 'attached' });
        await page.locator('button[data-notify="dismiss"]').click();
        await page.locator('div[data-notify="container"]').waitFor({ state: 'detached' });
        await TestHelpers.setUIMode(page, 'Expert');
        initialCount = await TestHelpers.getNumWarningsErrors(page);
        console.log('Initial warnings+errors:', initialCount);
    });

    await test.step('Apply fixes and record the fixed state', async () => {
        await page.press('body', 'f');
        await page.locator('div[data-notify="container"]').waitFor({ state: 'attached' });
        await page.locator('button[data-notify="dismiss"]').click();
        await page.locator('div[data-notify="container"]').waitFor({ state: 'detached' });
        await expect.poll(async () => await TestHelpers.getNumWarningsErrors(page)).toBeLessThanOrEqual(initialCount);
        postFixCount = await TestHelpers.getNumWarningsErrors(page);
        console.log('Post-fix warnings+errors:', postFixCount);
    });

    let nodeCount: number;
    await test.step('Delete two nodes', async () => {
        nodeCount = await TestHelpers.getNodeCount(page);
        expect(nodeCount).toBeGreaterThan(1);
        const nodeIds: string[] = await page.evaluate(() => {
            const eagle = (window as any).eagle;
            return Array.from(eagle.logicalGraph().nodes().keys()) as string[];
        });
        for (const nodeId of nodeIds.slice(0, 2)) {
            await page.evaluate(async (id: string) => {
                const eagle = (window as any).eagle;
                const node = eagle.logicalGraph().getNodeById(id);
                if (node) {
                    eagle.setSelection(node, (window as any).EagleFileType.Graph);
                    await eagle.deleteSelection(false, true, false);
                }
            }, nodeId);
        }
        await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(nodeCount - 2);
    });

    await test.step('Undo one deletion and verify fixed issues remain fixed', async () => {
        await TestHelpers.undo(page);
        await expect.poll(async () => await TestHelpers.getNodeCount(page)).toBe(nodeCount - 1);
        const countAfterUndo = await TestHelpers.getNumWarningsErrors(page);
        console.log('Warnings+errors after undo:', countAfterUndo);
        expect(countAfterUndo).toBe(postFixCount);
    });

    await page.close();
});
