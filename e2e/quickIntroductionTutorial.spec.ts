import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';




test('Quick Introduction Tutorial', async ({ page }) => {

    // Use tutorial=none to suppress welcome/whats-new modals, then trigger the tutorial
    // manually once Eagle is fully initialised.
    await page.goto('http://localhost:8888/?tutorial=none');
    await expect(page).toHaveTitle(/EAGLE/);

    await test.step('Start quick introduction tutorial', async () => {
        // Wait for Eagle to finish initialising
        await page.waitForFunction(() => (window as any).eagle?.eagleIsReady?.() === true, { timeout: 10000 });
        await page.evaluate(() => (window as any).TutorialSystem.initiateTutorial('Quick Start'));
    });

    await TestHelpers.runTutorialInfoStep(page, 'Welcome to Eagle!');
    await TestHelpers.runTutorialInfoStep(page, 'Left Panel');
    await TestHelpers.runTutorialInfoStep(page, 'Graph Canvas');
    await TestHelpers.runTutorialInfoStep(page, 'Right Panel');
    await TestHelpers.runTutorialInfoStep(page, 'Hints Bar');
    await TestHelpers.runTutorialInfoStep(page, 'Inspector');
    await TestHelpers.runTutorialInfoStep(page, 'User Interface Element Tooltips');
    await TestHelpers.runTutorialPressStep(page, 'Help', '#navbarDropdownHelp');
    await TestHelpers.runTutorialInfoStep(page, 'Tutorials');
    await TestHelpers.runTutorialInfoStep(page, 'Read The Docs');
    await TestHelpers.runTutorialInfoStep(page, 'Keyboard Shortcuts');
    await TestHelpers.runTutorialInfoStep(page, 'Quick Actions');
    await TestHelpers.runTutorialPressStep(page, 'Click To Open Settings', '#settings');
    await TestHelpers.runTutorialInfoStep(page, 'Set up Eagle to how you need it.');
    await TestHelpers.runTutorialInfoStep(page, 'Eagle UI modes');
    await TestHelpers.runTutorialInfoStep(page, 'Setup the URL for the Translator Service');
    await TestHelpers.runTutorialInfoStep(page, 'Setup your git access token');
    await TestHelpers.runTutorialInfoStep(page, 'DockerHub user name');
    await TestHelpers.runTutorialPressStep(page, 'Click To Save Settings', '#settingsModalAffirmativeButton');
    await TestHelpers.runTutorialInfoStep(page, 'Translate Button');

    await test.step('Tutorial info step: Well Done!', async () => {
        await TestHelpers.waitForTutorialStep(page, 'Well Done!');
        await expect(page.locator('#tutorialInfoPopUp .tutNextBtn')).toHaveCount(0);
    });

    await test.step('Exit tutorial and verify cleanup', async () => {
        await page.locator('#tutorialInfoPopUp .tutEndBtn').click();
        await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: 5000 });
        await expect(page.locator('#tutorialInfoPopUp')).toHaveCount(0);
    });

    await page.close();
});
