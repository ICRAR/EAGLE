import { test, expect } from '@playwright/test';

test('Adding and Removing Repositories', async ({ page }) => {
  page.setViewportSize({width:1920,height:1080})
  
  await page.goto('http://localhost:8888/?tutorial=none');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/EAGLE/);

  const REPO_NAME = "ICRAR/daliuge";
  const REPO_BRANCH = "yan-812-2";
  const repoHTMLId = '#'+REPO_NAME.replace('/', '_') + "_" + REPO_BRANCH;

  //making sure the repo doesn't exist for some reason, if it does, remove it
  if(await page.locator('#ICRAR_daliuge_yan-812-2').count() === 1){
    await page.locator('.repoContainer').filter({has:page.locator(repoHTMLId)}).hover()
    await page.locator('.repoContainer').filter({has:page.locator(repoHTMLId)}).getByText('eject').click()
  }

  //click the add repository button
  await page.getByRole('button',{name:'Add Repository'}).click()

  //wait needed to allow the input fields to be ready to detect changes to their values
  await page.waitForTimeout(500);

  //fill out the add repository modal information and confirm the modal
  await page.locator('input#gitCustomRepositoryModalRepositoryNameInput').pressSequentially(REPO_NAME)
  await page.locator('input#gitCustomRepositoryModalRepositoryBranchInput').pressSequentially(REPO_BRANCH)
  await page.locator('button#gitCustomRepositoryModalAffirmativeButton').click()

  //waiting for the repo to be added
  await page.waitForTimeout(1000);

  //making sure the repo now exists in the repositories tab
  await expect(await page.locator(repoHTMLId).count() === 1).toBeTruthy()

  //removing the repo
  await page.locator('.repoContainer').filter({has:page.locator(repoHTMLId)}).hover()
  await page.locator(repoHTMLId + "-eject").click()
  await page.waitForTimeout(500);
  await page.locator('button#confirmModalAffirmativeButton').click()

  //wait for the repo to be removed
  await page.waitForTimeout(1000);

  //making sure the repo has been removed
  await expect(await page.locator(repoHTMLId).count() === 1).toBeFalsy()

  //closing the browser
  await page.close();
});
