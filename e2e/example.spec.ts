import { test, expect } from '@playwright/test';

// test('has title', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Expect a title "to contain" a substring.
//   await expect(page).toHaveTitle(/Playwright/);
// });

// test('get started link', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Click the get started link.
//   await page.getByRole('link', { name: 'Get started' }).click();

//   // Expects page to have a heading with the name of Installation.
//   await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
// });


test('Eagle has title', async ({ page }) => {
  await page.goto('http://localhost:8888/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/EAGLE/);

  //open settings modal
  await page.locator('#settings').click()

  //enable expert mode
  const uiModeSelect = await page.getByPlaceholder('uiMode')
  uiModeSelect.selectOption({value:'Expert'})

  //close settings modal (wait is needed, bootstrap is not ready to close the modal again that quickly)
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'OK' }).click()

  //right click the hellow world app in the palette
  await page.locator('#palette_0_HelloWorldApp').click({
    button: 'right'
  });

  //click menu item add to another palette
  await page.getByText('Add to another palette').click();

  //select the input field to give the new palette a name
  await page.getByRole('textbox', { name: 'Custom Port Name' }).click();

  //write test
  await page.getByRole('textbox', { name: 'Custom Port Name' }).fill('test');

  //timeout for bootstrap animation and confirm the modal
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'OK' }).click();

  await page.locator('#addPaletteNodeGenericNpyScatterApp').click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'OK' }).click();
});