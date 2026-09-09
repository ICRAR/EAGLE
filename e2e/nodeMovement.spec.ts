import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Dragging a graph node updates its logical position', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.setUIMode(page, 'Expert');
    await TestHelpers.createNewGraph(page);
    await TestHelpers.expandPalette(page, 0);
    await page.locator('#addPaletteNodeHelloWorldApp').click();

    const nodeBody = page.locator('.node .body').first();
    const box = await nodeBody.boundingBox();
    expect(box).not.toBeNull();

    const before = await page.evaluate(() => {
        const node = Array.from((window as any).eagle.logicalGraph().getNodes())[0];
        return {
            position: node.getPosition(),
            scale: (window as any).eagle.globalScale(),
        };
    });

    const delta = { x: 100, y: 60 };
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + delta.x, box!.y + box!.height / 2 + delta.y, { steps: 10 });
    await page.mouse.up();

    const after = await page.evaluate(() =>
        Array.from((window as any).eagle.logicalGraph().getNodes())[0].getPosition(),
    );

    expect(after.x - before.position.x).toBeCloseTo(delta.x / before.scale, 0);
    expect(after.y - before.position.y).toBeCloseTo(delta.y / before.scale, 0);
});