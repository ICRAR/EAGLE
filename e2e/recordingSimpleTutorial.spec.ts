// import { test } from '@playwright/test';
import { test, expect,chromium, Page,Browser } from '@playwright/test';
import { enableMouseCursor, explainElement, moveMouseCursor, textNotification } from '../playwrightHelpers';

test.use({ 
  viewport: { width: 1920, height: 1080 },
  video: {
    mode: 'on',
    size: { width: 1920, height: 1080 }
  },
  launchOptions:{
    slowMo: 700
  }
});


test('Recording a simple tutorial', async ({ page }) => {
  let clickTarget:any = null;

  // const browser = await chromium.launch({
  //   headless: false
  // });
  // const context = await browser.newContext();
  // const page2 = await context.newPage();

  //this is needed to catch and forward console logs to the test results console in visual studio code
  page.on('console', (msg) => {
    console.log(msg);
  });


  await page.goto('http://localhost:8888/');

  await enableMouseCursor(page);

  await textNotification(page, 'title', 'testing testing')


  clickTarget = await page.getByRole('button', { name: 'Graph' })
  await explainElement(page,clickTarget,'down', 'this is a test button message123')
  // await page2.pause()

  await moveMouseCursor(page, clickTarget)
  await clickTarget.click();

  clickTarget = await page.getByText('New Create New Graph [ N ]')
  await moveMouseCursor(page, clickTarget)
  await clickTarget.hover();

  clickTarget = await page.getByRole('link', { name: 'Create New Graph [ N ]' })
  await moveMouseCursor(page, clickTarget)
  await clickTarget.hover();

  //hover for a moment, then click
  await page.waitForTimeout(200);
  await clickTarget.click();

   //enter a name for the new graph
  await page.locator('#inputModalInput').press('ControlOrMeta+a');
  await page.locator('#inputModalInput').pressSequentially('myNewGraph');

  //click ok
  clickTarget = await page.getByRole('button', { name: 'OK' })
  await moveMouseCursor(page, clickTarget)
  await clickTarget.click();
  
  // await page.pause()
  await page.close();
});