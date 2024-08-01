import { test, expect } from '@playwright/test';

test('Eagle has title', async ({ page }) => {
  page.setViewportSize({width:1920,height:1080})
  
  await page.goto('http://localhost:8888/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/EAGLE/);

  const REPO_NAME = "ICRAR/daliuge";
  const REPO_BRANCH = "yan-812-2";
  const repoExists :boolean = await page.locator('#ICRAR_daliuge_yan-812-2').count() === 1

  //just making sure the repo doesnt exist for some reason, if it does, remove it
  if(repoExists){
    await page.locator('.repoConatiner').filter({has:page.locator('#ICRAR_daliuge_yan-812-2')}).getByText('eject').click()
  }

  await page.getByRole('button',{name:'Add Repository'}).click()
  await page.waitForTimeout(1000);//wait needed to allow the input fields to be ready to detect changes to their values

  await page.locator('input#gitCustomRepositoryModalRepositoryNameInput').fill(REPO_NAME)
  await page.locator('input#gitCustomRepositoryModalRepositoryBranchInput').fill(REPO_BRANCH)
  await page.waitForTimeout(1000);//wait needed to allow the input fields to be ready to detect changes to their values

  await page.locator('button#gitCustomRepositoryModalAffirmativeButton').click()
  // await page.close();
});
