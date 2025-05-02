import { test, expect } from '@playwright/test';

const GRAPHS = [
  "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/SDP%20Pipelines/cont_img_mvp.graph"
]

test('Validating Graphs', async ({ page }) => {
  page.setViewportSize({width:1920,height:1080})
  
  for (const graphUrl of GRAPHS){
    await page.goto('http://localhost:8888/?service=Url&url='+graphUrl);

    //wait for the repo to be removed
    await page.waitForTimeout(1000);

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/EAGLE/);
  }

  //closing the browser
  await page.close();
});
