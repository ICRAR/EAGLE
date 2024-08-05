import { test, expect } from '@playwright/test';

test('Creating a Simple Graph', async ({ page }) => {
  
  await page.goto('http://localhost:8888/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/EAGLE/);

  //--------ENABLE EXPERT MODE----------

  //open settings modal via keyboard shortcut
  await page.press('body','o');

  //enable expert mode
  const uiModeSelect = await page.getByPlaceholder('uiMode')
  uiModeSelect.selectOption({value:'Expert'})
  //close settings modal (wait is needed, bootstrap is not ready to close the modal again that quickly)
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'OK' }).click()

  //add a helloworld app to the graph by clicking it's icon
  await page.locator('#addPaletteNodeHelloWorldApp').click();
  //agree to create a new graph with it's auto-generated name
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'OK' }).click();

  //------------ADD NODE TO GRAPH-----------
  
  //scroll the file node into view in the palette and add to graph
  await page.locator('#palette_0_File').scrollIntoViewIfNeeded()
  await page.dragAndDrop( '#palette_0_File' ,'#graphArea', {targetPosition:{x:400,y:400}})

  //-----------EDITING THE NODE IN THE PARAMETERS TABLE--------
  //open the parameters table via keybaord shortcut
  await page.press('body','t');

  //add a new parameter
  await page.getByRole('button', { name: 'Add Parameter' }).click();
  //select the new parameter
  await page.getByRole('cell', { name: 'New Parameter' }).getByPlaceholder('New Parameter').click();
  //select text and replace it with a test name
  await page.getByRole('row', { name: 'New Parameter' }).getByPlaceholder('New Parameter').selectText()
  await page.getByRole('row', { name: 'New Parameter' }).getByPlaceholder('New Parameter').pressSequentially('test parameter');

  await page.locator('#typeButtonFor_851fd1f0-809e-440c-acd4-4a8644368b36').click();
  // await page.getByRole('cell', { name: 'Object arrow_drop_down' }).getByRole('button').click();
  // await page.getByRole('row', { name: 'test parameter String' }).getByRole('combobox').first().selectOption('ApplicationArgument');
  // await page.getByRole('row', { name: 'test parameter String' }).getByRole('combobox').nth(1).selectOption('OutputPort');
  // await page.locator('#tableRow_851fd1f0-809e-440c-acd4-4a8644368b36 > td:nth-child(11) > .duplicate').click();
  // await page.getByRole('cell', { name: 'test parameter copy' }).getByPlaceholder('New Parameter').click();
  // await page.getByRole('cell', { name: 'test parameter copy' }).getByPlaceholder('New Parameter').pressSequentially('test parameter 2');
  // await page.getByRole('button', { name: 'favorite_border' }).click();
  // await page.getByRole('row', { name: 'test parameter String' }).getByRole('textbox').nth(1).click();
  // await page.getByRole('row', { name: 'test parameter String' }).getByRole('textbox').nth(1).pressSequentially('1');
  // await page.getByRole('row', { name: 'test parameter 2 favorite' }).getByRole('textbox').nth(1).pressSequentially('2');
  // await page.getByRole('row', { name: 'test parameter 2 favorite' }).getByRole('textbox').nth(1).click();
  // await page.getByRole('row', { name: 'test parameter 1 String' }).getByRole('textbox').nth(2).pressSequentially('1');
  // await page.getByRole('row', { name: 'test parameter 1 String' }).getByRole('textbox').nth(2).click();
  // await page.getByRole('row', { name: 'test parameter 2 favorite 2' }).getByRole('textbox').nth(2).click();
  // await page.getByRole('row', { name: 'test parameter 2 favorite 2' }).getByRole('textbox').nth(2).pressSequentially('2');
  // await page.getByRole('cell', { name: '' }).getByRole('textbox').click();
  // await page.getByRole('row', { name: 'test parameter 1 12 String' }).getByRole('textbox').nth(3).pressSequentially('test parameter description');
  // await page.close();
});
