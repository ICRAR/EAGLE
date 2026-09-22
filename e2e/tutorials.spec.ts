import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Tutorials', async ({ page }) => {
    test.setTimeout(300000);

    const tutorialNames = await test.step('Discover registered tutorials', async () => {
        // Bootstrap the app once so we can query which tutorials are currently registered.
        await page.goto('http://localhost:8888/?tutorial=none');
        await expect(page).toHaveTitle(/EAGLE/);
        await page.waitForFunction(() => (window as any).eagle?.eagleIsReady?.() === true, { timeout: TestHelpers.LONG_TIMEOUT });

        const names = await page.evaluate(() => {
            return (window as any).TutorialSystem?.getTutorialNames?.() || [];
        });

        return names;
    });

    await test.step(`Found ${tutorialNames.length} tutorials`, async () => {
        expect(tutorialNames.length).toBeGreaterThan(0);
    });

    for (const tutorialName of tutorialNames) {
        await test.step(`Run tutorial: ${tutorialName}`, async () => {
            // Start each tutorial from a fresh app state so steps are isolated.
            await page.goto('http://localhost:8888/?tutorial=none');
            await expect(page).toHaveTitle(/EAGLE/);
            await page.waitForFunction(() => (window as any).eagle?.eagleIsReady?.() === true, { timeout: TestHelpers.LONG_TIMEOUT });
            await TestHelpers.runTutorialByName(page, tutorialName);
        });
    }

    await page.close();
});
