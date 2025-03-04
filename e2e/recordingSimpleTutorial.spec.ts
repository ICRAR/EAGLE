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


test('Creating Hellow World Example', async ({ page }) => {
  let clickTarget:any = null;

  // there is a bug in the playwright code that with the way we are creating the test here, we page.pause does not work as intended. 
  // creating a secont browser context allows us to pause the test
  // the reason i dont just create the browser context this way in the first place is that with this method, the video recording doesnt work...
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

  //show a title message
  await textNotification(page, 'Tutorial: ', 'Creating a Hello World graph')

  //explain then click on the graph button in the navbar
  clickTarget = await page.getByRole('button', { name: 'Graph' })
  await explainElement(page, clickTarget, 'down', 'First, create a graph using this menu. This allows you to give your graph a name.')
  await moveMouseCursor(page, clickTarget)
  await clickTarget.click();
  // await page2.pause()

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
  
  // await page.pause()
  await page.close();
});