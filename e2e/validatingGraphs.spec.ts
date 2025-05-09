import { test, expect } from '@playwright/test';

const GRAPHS = [
  "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/SDP%20Pipelines/cont_img_mvp.graph"
]

test('Validating Graphs', async ({ page }) => {
  page.setViewportSize({width:1920,height:1080})
  
  for (const graphUrl of GRAPHS){
    await page.goto('http://localhost:8888/?tutorial=none&service=Url&url='+graphUrl);

    // wait for the page to load
    await page.waitForTimeout(1000);

    // expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/EAGLE/);

    // navigate menus and click the "validate" item
    await page.locator('#navbarDropdownGraph').click();
    await page.locator('#validateGraph').click();

    // wait for the validation
    await page.waitForTimeout(1000);

    // check result
    await expect(page.locator('div[data-notify="container"]:last-child').locator('span[data-notify="message"]')).toContainText(" valid ");
  }

  //closing the browser
  await page.close();
});
