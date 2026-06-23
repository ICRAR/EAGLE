import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

const TUTORIALS = [
    'Quick Start',
    'Graph Building',
    'Graph Configurations',
];

test('Tutorials', async ({ page }) => {
    test.setTimeout(300000);

    for (const tutorialName of TUTORIALS) {
        await test.step(`Run tutorial: ${tutorialName}`, async () => {
            // Start each tutorial from a fresh app state.
            await page.goto('http://localhost:8888/?tutorial=none');
            await expect(page).toHaveTitle(/EAGLE/);
            await page.waitForFunction(() => (window as any).eagle?.eagleIsReady?.() === true, { timeout: 10000 });
            await TestHelpers.runTutorialByName(page, tutorialName);
        });
    }

    await page.close();
});
