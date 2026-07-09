import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Tutorials', async ({ page }) => {
    test.setTimeout(300000);

    // Bootstrap the app once so we can query which tutorials are currently registered.
    await page.goto('http://localhost:8888/?tutorial=none');
    await expect(page).toHaveTitle(/EAGLE/);
    await page.waitForFunction(() => (window as any).eagle?.eagleIsReady?.() === true, { timeout: TestHelpers.LONG_TIMEOUT });

    const tutorials = await page.evaluate(() => {
        // This is a bit of a hack to get the list of tutorials. We can't directly access the tutorialArray because it's not exposed to the window object, so we have to go through the Eagle instance and then get the tutorials from there.
        const eagleStatic = (window as any).Eagle?.tutorials;
        if (Array.isArray(eagleStatic) && eagleStatic.length > 0) {
            return eagleStatic
                .map((tutorial: any) => tutorial?.getName?.())
                .filter((name: any) => typeof name === 'string' && name.length > 0);
        }

        return [];
    });

    expect(tutorials.length).toBeGreaterThan(0);
    console.log(`[tutorial-test] starting: ${tutorials.length} tutorials`);

    for (const tutorialName of tutorials) {
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
