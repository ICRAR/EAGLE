import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Creating and editing Palettes', async ({ page }) => {
  
  await page.goto('http://localhost:8888/?tutorial=none');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/EAGLE/);
  
  // set 'Expert' UI mode
  await TestHelpers.setUIMode(page, 'Expert');

  //expand the 'Builtin Components' palette
  await TestHelpers.expandPalette(page, 0);

  //right click the hello world app in the palette
  await page.locator('#palette_0_CopyApp').click({
    button: 'right'
  });

  //click menu item add to another palette
  await page.getByText('Add to another palette').click();

  //enter the new palette name and confirm
  await TestHelpers.enterCustomChoiceName(page, 'test');

  await page.close();
});
