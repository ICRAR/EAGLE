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
  try {
    await page.dragAndDrop('#HelloWorldApp .outputPort', '#File .inputPort',{sourcePosition:{x:2,y:2},targetPosition:{x:2,y:2},timeout:5000})
  } catch(e) {
    // drag and drop can timeout due to graph overlay - this is ok, the edge may still be created
  }
  await page.waitForTimeout(500);

  // verify that an edge was created
  const numEdgesAfterDragDrop = await page.evaluate(() => {
    return (<any>window).eagle.logicalGraph().getNumEdges();
  });
  await expect(numEdgesAfterDragDrop).toBeGreaterThanOrEqual(1);

  //center the graph to ensure nodes are visible
  await page.getByRole('button', { name: 'filter_center_focus' }).click();
  await page.waitForTimeout(600);

  //click on the input port of the file to open the parameter table modal and highlight the port
  const inputPort = page.locator('#File .inputPort, #hello .inputPort').first();
  await inputPort.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  await inputPort.click({ timeout: 5000 }).catch(async () => {
    // If click fails, try with the original selector
    await page.locator('.inputPort').first().click();
  });
  await page.waitForTimeout(800);
  
  // set 'changeable' on the port to true
  const changeableButton = page.locator('.highlighted .column_Flags button.changeableFlag').first();
  await changeableButton.scrollIntoViewIfNeeded();
  await changeableButton.click();
  await page.waitForTimeout(300);

  //rename the port
  await page.locator('.highlighted .tableFieldDisplayName').fill('testInput');
  await page.waitForTimeout(300);

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
  await page.waitForTimeout(500);

  // confirm the deletion in the modal
  await page.locator('#confirmModalAffirmativeAnswer').click();
  await page.waitForTimeout(500);

  // check that the graph has the expected number of nodes
  const numNodesPostDelete = await page.evaluate(() => {
    return (<any>window).eagle.logicalGraph().getNumNodes();
  });

  await expect(numNodesPostDelete).toBe(2);

  await page.close();
});
