import { test, expect,chromium } from '@playwright/test';
import { enableMouseCursor, moveMouseCursor } from '../playwrightHelpers';
// import * as $ from '../static/externals/jquery-3.6.0.min.js'; seems like jquery wont work

test.use({ 
  video: {
    mode: 'on',
    size: { width: 1920, height: 1080 }
  },
  viewport: { width: 1920, height: 1080 },
  launchOptions:{
    slowMo: 700
  }
});

test('recording simple tutorial', async () => {

  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  let clickTarget:any = null;

  page.on('console', (msg) => {
    console.log(msg);
  });

  await page.goto('http://localhost:8888/');

  await enableMouseCursor(page);

  clickTarget = await page.getByRole('button', { name: 'Graph' })
  await moveMouseCursor(page, clickTarget)
  // console.log(await clickTarget.boundingBox())
  await page.pause()
  await page.getByRole('button', { name: 'Graph' }).hover();
  await page.getByRole('button', { name: 'Graph' }).click();


  await page.getByText('New Create New Graph [ N ]').hover();
  await page.getByRole('link', { name: 'Create New Graph [ N ]' }).hover();
  await page.getByRole('link', { name: 'Create New Graph [ N ]' }).click();
  await page.locator('#inputModalInput').press('ControlOrMeta+a');
  await page.locator('#inputModalInput').pressSequentially('myNewGraph');
  await page.locator('#inputModalInput').press('Enter');

  await page.pause()
  // await page.evaluate(() => {
  //   testing123  
  // })

  // await page.close();
});