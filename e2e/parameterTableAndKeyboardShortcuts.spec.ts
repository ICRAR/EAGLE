import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Parameter Tables and keyboard Shortcuts', async ({ page }) => {
  
  await page.goto('http://localhost:8888/?tutorial=none');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/EAGLE/);

  //--------ENABLE EXPERT MODE----------
  //open settings modal via keyboard shortcut
  await page.press('body','o');

  // set 'Expert' UI mode
  await TestHelpers.setUIMode(page, "Expert");

  //expand the 'Builtin Components' palette
  await page.locator('#palette0').click();
  await page.waitForTimeout(250);

  //add a helloworld app to the graph by clicking it's icon
  await page.locator('#addPaletteNodeHelloWorldApp').click();
  //agree to create a new graph with it's auto-generated name
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'OK' }).click();

  //-----------EDITING THE NODE IN THE PARAMETERS TABLE--------
  //open the parameters table via keyboard shortcut
  await page.press('body','t');

  //add a new parameter
  await page.getByRole('button', { name: 'Add Parameter' }).click();
  //select the new parameter
  await page.getByRole('cell', { name: 'New Parameter' }).getByPlaceholder('New Parameter').click();

  //select text and replace it with a test name
  await page.getByRole('row', { name: 'New Parameter' }).getByPlaceholder('New Parameter').selectText()
  await page.getByRole('row', { name: 'New Parameter' }).getByPlaceholder('New Parameter').pressSequentially('test parameter');
  //check that the name has been changed
  await expect(page.getByRole('row').last().locator('.column_DisplayText input')).toHaveValue('test parameter')

  //change the new parameter to an integer
  await page.getByRole('row').last().locator('.column_Type').getByRole('button').click()
  await page.getByRole('row').last().locator('.dropdown-menu').getByText('Integer').click()
  //check that the type selector has been changed
  await expect(page.getByRole('row').last().locator('.typesInput')).toHaveValue('Integer')

  //change parameter type then check that the value has been changed accordingly
  await page.getByRole('row').last().locator('.column_ParamType').getByRole('combobox').selectOption('Application');
  await expect(page.getByRole('row').last().locator('.column_ParamType').getByRole('combobox')).toHaveValue('Application')
  
  //change use as and then make sure that the value has been changed accordingly
  await page.getByRole('row').last().locator('.column_Usage').getByRole('combobox').selectOption('OutputPort');
  await expect(page.getByRole('row').last().locator('.column_Usage').getByRole('combobox')).toHaveValue('OutputPort')
  
  //duplicate the new custom field
  await page.getByRole('row').last().locator('.duplicate').click();
  
  //test each of the flags
  await page.getByRole('row').last().locator('.column_Flags').getByText('diamond').click()
  await page.getByRole('row').last().locator('.column_Flags').getByText('location_on').click()
  await page.getByRole('row').last().locator('.column_Flags').getByText('alarm_off').click()
  await page.getByRole('row').last().locator('.column_Flags').getByText('lock_open').click()

  //count the number of fields on the node 
  const countBefore = await page.getByRole('row').count()
  //delete the last field added
  await page.getByRole('row').last().locator('.delete').click();
  //count the number of fields on the node again
  const countAfter = await page.getByRole('row').count()
  //make sure the number of fields has decreased by 1
  await expect(countBefore - countAfter === 1).toBeTruthy()
  //making sure the correct field has been removed
  await expect(page.getByRole('row').last().locator('.column_DisplayText input')).not.toHaveValue('test parameter copy')
  
  //hover on the name cell to reveal the key parameters icon
  await page.getByRole('row').last().locator('.column_DisplayText').hover();
  //make the field a key parameter
  await page.getByRole('row').last().locator('.column_DisplayText button').click();
  
  //confirm the default name for the new graph config
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'OK' }).click();
  
  //close the parameter table modal
  await page.waitForTimeout(800);
  await page.locator('.closeBottomWindowBtn button').click();

  //open the key graph parameter table modal
  await page.locator('#openGraphConfigurationTable').click();

  await page.waitForTimeout(500);

  //make sure the field has been added to the key graph parameter table
  await expect(await page.locator('.parameterTable tbody').getByRole('row').count()===0).toBeFalsy();

  await page.close();
});
