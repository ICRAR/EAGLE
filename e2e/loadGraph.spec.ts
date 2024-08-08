

import { test, expect } from '@playwright/test';

test('Graph Loading', async ({ page }) => {
  
  await page.goto('http://localhost:8888/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/EAGLE/);
  await page.waitForTimeout(5000);

  let EAGLE_GITHUB_ACCESS_TOKEN:string = ''
  if(process.env.EAGLE_GITHUB_ACCESS_TOKEN){
    EAGLE_GITHUB_ACCESS_TOKEN = process.env.EAGLE_GITHUB_ACCESS_TOKEN.toString();
  }
  const SUCCESS_MESSAGE = "Success:";

  await page.press('body','o');
  await page.getByRole('button', { name: 'External Services' }).click();
  await page.locator('#settingGitHubAccessTokenValue').click();
  await page.locator('#settingGitHubAccessTokenValue').pressSequentially(EAGLE_GITHUB_ACCESS_TOKEN);
  // await page.getByRole('button', { name: 'OK' }).click();



  // await page.close();
});