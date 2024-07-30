import { test, expect } from '@playwright/test';

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

  //add a helloworld app to the graph by clicking it's icon
  await page.locator('#addPaletteNodeHelloWorldApp').click();
  //agree to create a new graph with it's auto-generated name
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'OK' }).click();

  //scroll the file node into view in the palette
  await page.locator('#palette_1_File').scrollIntoViewIfNeeded()
  await page.dragAndDrop( '#palette_1_File' ,'#graphArea', {targetPosition:{x:400,y:400}})

  //center the graph
  await page.getByRole('button', { name: 'filter_center_focus' }).click();
  
  await page.waitForTimeout(500);

  //drag an edge from helloWorldApp -> File
  await page.dragAndDrop('#HelloWorldApp .outputPort', '#File .inputPort',{sourcePosition:{x:2,y:2},targetPosition:{x:2,y:2}})


  //click on the input port of the file to open the parameter table modal and highlight the port
  await page.locator('.inputPort').click();
  //rename the port
  await page.locator('.highlighted .tableFieldDisplayName').fill('testInput');

  //wait for bootstrap modal then close
  await page.waitForTimeout(500);
  await page.locator('#parameterTableModal').getByRole('button', { name: 'Close' }).click();


  await page.close();
});
