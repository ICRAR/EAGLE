import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

test('Creating a Simple Graph', async ({ page }) => {
  
  await page.goto('http://localhost:8888/?tutorial=none');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/EAGLE/);

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

  //scroll the file node into view in the palette
  await page.locator('#palette_0_File').scrollIntoViewIfNeeded()
  await page.locator('#addPaletteNodeFile').click();

  //center the graph
  await page.getByRole('button', { name: 'filter_center_focus' }).click();
  
  //doing a little mouse zoom with the cursor at the center location of the graph
  const box = await page.locator('#logicalGraphParent').boundingBox();
  let centerX :number;
  let centerY : number;
  if(box){
    centerX = box.x + box.width / 2;
    centerY = box.y + box.height / 2;

    await page.mouse.move(centerX,centerY)
    await page.mouse.wheel(0,400)
    await page.waitForTimeout(500);
  }

  //additional little wait to prevent timeouts on the next line
  await page.waitForTimeout(200);

  //drag an edge from helloWorldApp -> File
  await page.dragAndDrop('#HelloWorldApp .outputPort', '#File .inputPort',{sourcePosition:{x:2,y:2},targetPosition:{x:2,y:2}})

  //click on the input port of the file to open the parameter table modal and highlight the port
  await page.locator('#hello .inputPort').click();
  //rename the port
  await page.locator('.highlighted .tableFieldDisplayName').fill('testInput');

  //wait for bootstrap modal then close
  await page.waitForTimeout(500);
  await page.locator('.closeBottomWindowBtn').getByRole('button').click();

  // check that the graph has the expected number of nodes
  const numNodesPreDelete = await page.evaluate(() => {
    return (<any>window).eagle.logicalGraph().getNumNodes();
  });

  await expect(numNodesPreDelete).toBe(2);

  // add a second file node
  await page.locator('#palette_0_File').scrollIntoViewIfNeeded();
  await page.locator('#addPaletteNodeFile').click();
  await page.waitForTimeout(500);

  // delete the second file node
  await page.keyboard.press('Delete');

  // confirm the deletion in the modal
  await page.locator('#confirmModalAffirmativeAnswer').click();

  // check that the graph has the expected number of nodes
  const numNodesPostDelete = await page.evaluate(() => {
    return (<any>window).eagle.logicalGraph().getNumNodes();
  });

  await expect(numNodesPostDelete).toBe(2);

  await page.close();
});
