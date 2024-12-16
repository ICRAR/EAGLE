import { test, expect } from '@playwright/test';

test('Creating and editing Palettes', async ({ page }) => {
  
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

  //expand the 'Builtin Components' palette
  await page.locator('#palette0').click();
  await page.waitForTimeout(250);

  //right click the hello world app in the palette
  await page.locator('#palette_0_CopyApp').click({
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

  await page.close();
});
