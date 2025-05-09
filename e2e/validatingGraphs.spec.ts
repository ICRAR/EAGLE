import { test, expect } from '@playwright/test';

const GRAPHS = [
  // SDP Pipelines
  "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/SDP%20Pipelines/cont_img_mvp.graph",

  // examples
  "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/examples/HelloWorld-simple.graph",

  // graph_patterns
  "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/graph_patterns/LoopWithBranch.graph"
]

test('Validating Graphs', async ({ page }) => {
  page.setViewportSize({width:1920,height:1080})
  
  for (const graphUrl of GRAPHS){
    await page.goto('http://localhost:8888/?tutorial=none&service=Url&url='+graphUrl);

    // wait for the 'graph load success' notification to be shown
    await page.locator('div[data-notify="container"]').waitFor({state: 'attached'});

    // dismiss notification
    await page.locator('button[data-notify="dismiss"]').click();

    // wait for the 'graph load success' notification to be dismissed
    await page.locator('div[data-notify="container"]').waitFor({state: 'detached'});

    // navigate menus and click the "validate" item
    await page.locator('#navbarDropdownGraph').click();
    await page.locator('#validateGraph').click();

    // wait for the validation
    await page.locator('div[data-notify="container"]').waitFor({state: 'attached'});

    // check result in notification
    await expect(page.locator('span[data-notify="message"]')).toContainText(" valid ");
  }

  //closing the browser
  await page.close();
});
