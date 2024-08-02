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

  // await page.close();
});
