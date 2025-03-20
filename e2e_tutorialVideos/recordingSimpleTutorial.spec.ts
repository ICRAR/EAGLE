// import { test } from '@playwright/test';
import { test, expect,chromium, Page,Browser } from '@playwright/test';
import { enableMouseCursor, explainElement, moveMouseCursor, textNotification } from '../playwrightHelpers';

test.use({ 
  viewport: { width: 2560, height: 1440 },
  video: {
    mode: 'on',
    size: { width: 2560, height: 1440 }
  },
  launchOptions:{
    slowMo: 700,
  }
});


test('Hello World Tutorial Video', async ({ page }) => {
  let clickTarget:any = null;
  //over write the test timeout limit. these tutorials are way longer than normal tests.
  test.setTimeout(120000);

  //this is needed to catch and forward console logs to the test results console in visual studio code
  page.on('console', (msg) => {
    console.log(msg);
  });

  await page.goto('http://localhost:8888/');

  //this will add our custom mouse cursor svg into the body of the website, so we can move it around later.
  await enableMouseCursor(page);

  //show a title message
  await textNotification(page, 'Tutorial: ', 'Creating a Hello World graph', 2500)

  //explain then click on the graph button in the navbar
  clickTarget = await page.locator('#navbarDropdownGraph')
  await moveMouseCursor(page, clickTarget)
  await explainElement(page, clickTarget, 'down', 'First, create a graph using this menu. This allows you to give your graph a name.', 6000)
  await clickTarget.click();

  // hover on the new option to expand 
  clickTarget = await page.getByText('New Create New Graph [ N ]')
  await moveMouseCursor(page, clickTarget)
  await clickTarget.hover();

  //move mouse to the create new graph option
  clickTarget = await page.getByRole('link', { name: 'Create New Graph [ N ]' })
  await moveMouseCursor(page, clickTarget)
  await clickTarget.hover();

  //hover for a moment, then click
  await page.waitForTimeout(200);
  await clickTarget.click();

  //enter a name for the new graph
  await page.locator('#inputModalInput').press('ControlOrMeta+a');
  await page.locator('#inputModalInput').pressSequentially('Hello_World_Video_Tutorial');

  //click ok
  clickTarget = await page.getByRole('button', { name: 'OK' })
  await moveMouseCursor(page, clickTarget)
  await clickTarget.click();

  //move mouse to graph info explain then click
  clickTarget = await page.getByRole('button', { name: 'info' })
  await moveMouseCursor(page, clickTarget)
  await explainElement(page, clickTarget, 'down', 'This is where you can access the graph info modal. It gives access to information like graph author, date last edited and graph descriptions.', 7000)
  await clickTarget.click();
  
  //move mouse to graph description, show message and enter a description
  clickTarget = await page.getByLabel('Graph Info').locator('input[type="text"]')
  await moveMouseCursor(page, clickTarget)
  await explainElement(page, clickTarget, 'down', 'Lets enter a description for our graph.', 3000)
  await clickTarget.click();
  await clickTarget.pressSequentially('A graph saving the output of a HelloWorldApp to disk.');    
  await page.waitForTimeout(500); // small wait to let the viewer see what happened

  //click ok to close the modal
  clickTarget = await page.getByRole('button', { name: 'OK' })
  await moveMouseCursor(page, clickTarget)
  await clickTarget.click();

  //expand the palette
  clickTarget = await page.locator('#palette0')
  await moveMouseCursor(page, clickTarget)
  await clickTarget.click();

  //add a hello world app
  clickTarget = await page.locator('#addPaletteNodeHelloWorldApp')
  await moveMouseCursor(page, clickTarget)
  await clickTarget.hover();
  await page.waitForTimeout(1000); // small wait to let the viewer see what happened
  await explainElement(page, clickTarget, 'right', 'Hover over the icon of a palette component to find out information about it. Then click it to add it to the graph.', 6000)
  await clickTarget.click();

  //use right click on the canvas to add a file node
  clickTarget = await page.getByText('HelloWorldApp hello')
  await moveMouseCursor(page, clickTarget)
  await clickTarget.click({
    button: 'right'
  });
  
  //explain the right click menu and search then add the file node by pressing enter
  clickTarget = await page.locator('#customContextMenu .searchBarContainer')
  await moveMouseCursor(page, clickTarget)
  await explainElement(page, clickTarget, 'up', 'You can right click on many elements in eagle to get extra options. If you right click on an empty part of the canvas, you can quickly add a node to the graph.', 7500)
  await page.waitForTimeout(500); // small wait to allow one the first pop up to disappear before the next one comes up
  await explainElement(page, clickTarget, 'up', 'We will search for "file" and press "enter" to quickly add a file node to our graph.', 4000)
  //search for file then press enter to add the file node to the graph
  await clickTarget.pressSequentially('file')
  await page.press('body','Enter');

  clickTarget = await page.locator('#logicalGraph .node').first().locator('.body')
  await moveMouseCursor(page, clickTarget)
  await explainElement(page, clickTarget, 'down',"Nodes can be selected to view and edit their parameters. A node's name can be edited by clicking on it in the graph.", 6000)
  await clickTarget.click()

  //explaination for the inspector
  clickTarget = await page.locator('#inspector .container')
  await moveMouseCursor(page, clickTarget)
  await explainElement(page, clickTarget, 'up',"Basic information and some simple actions for the selected element can be seen here.", 4000)

  //explain then click on the parameter table button
  clickTarget = await page.locator('#openNodeParamsTable')
  await moveMouseCursor(page, clickTarget)
  await explainElement(page, clickTarget, 'up',"The node fields table is for more advanced editing of the node. You can access it here.", 4000)
  await clickTarget.click()

  //change the name of who we are greeting
  clickTarget = await page.getByRole('row', { name: 'greet World World String' }).getByRole('textbox').nth(1)
  await moveMouseCursor(page, clickTarget)
  await clickTarget.click();
  await clickTarget.press('ControlOrMeta+a');
  await clickTarget.pressSequentially('Felicia');  
  await page.waitForTimeout(500); // small wait to let the viewer see what happened

  //close the bottom window
  clickTarget = await page.locator('.closeBottomWindowBtn')
  await moveMouseCursor(page, clickTarget)
  await clickTarget.click();

  //draw an edge between the nodes
  const outputPort = await page.locator('#HelloWorldApp .outputPort')
  const inputPort = await page.locator('#File .inputPort')
  await moveMouseCursor(page, outputPort)
  await explainElement(page, outputPort, 'down', 'This is the output port of the hello world app.',3000)
  await explainElement(page, inputPort, 'down', 'And this is the input port of the File node.',3000)
  await explainElement(page, outputPort, 'down', 'Drag and drop from one port to the other to create a connection.',4000)
  await moveMouseCursor(page, inputPort)
  await page.dragAndDrop('#HelloWorldApp .outputPort', '#File .inputPort',{sourcePosition:{x:2,y:2},targetPosition:{x:2,y:2}})
  await explainElement(page, inputPort, 'down', 'The output of the Hello World App will now be saved to disk as a file.',4000)

  //end notification
  await textNotification(page, 'Tutorial: ', 'Finished graph creation tutorial.', 3000);

  await page.close();
});