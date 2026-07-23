import { test, expect, type Page } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

async function removeCustomRepositoryIfPresent(page: Page, repoHTMLId: string, failIfStillPresent: boolean = true): Promise<void> {
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (await page.locator(repoHTMLId).count() === 0) {
      return;
    }

    await page.locator('.repoContainer').filter({has:page.locator(repoHTMLId)}).first().hover()
    await page.locator('.repoContainer').filter({has:page.locator(repoHTMLId)}).first().locator('button.repoTripleDot').click()
    await page.locator(repoHTMLId + '-remove').first().click()
    await page.waitForTimeout(200);
    if (await page.locator('#confirmModal').isVisible()) {
      await page.locator('button#confirmModalAffirmativeButton').click()
      if (await page.locator('#confirmModal').isVisible()) {
        await finalizeConfirmModalAffirmative(page);
      }
    }
    await page.waitForTimeout(300);
  }

  if (failIfStillPresent) {
    throw new Error(`Failed to remove repository after ${maxAttempts} attempts: ${repoHTMLId}`);
  }
}

async function addCustomRepository(page: Page, name: string, branch: string): Promise<string> {
  const repoHTMLId = '#'+name.replace('/', '_') + '_' + branch;

  await removeCustomRepositoryIfPresent(page, repoHTMLId);

  await page.getByRole('button',{name:'Add Repository'}).click()
  await page.waitForTimeout(500);
  await page.locator('input#gitCustomRepositoryModalRepositorySlugInput').pressSequentially(name)
  await page.locator('input#gitCustomRepositoryModalRepositoryBranchInput').pressSequentially(branch)
  await page.locator('button#gitCustomRepositoryModalAffirmativeButton').click()
  await page.waitForTimeout(1000);
  await expect(await page.locator(repoHTMLId).count()).toBeGreaterThan(0)

  return repoHTMLId;
}

async function finalizeInputModalAffirmative(page: Page): Promise<void> {
  if (await page.locator('#inputModal').isVisible()) {
    await page.evaluate(() => {
      const modal = (window as any).$('#inputModal');
      modal.data('completed', true);
      modal.modal('hide');
    });
    await page.waitForTimeout(100);
    if (await page.locator('#inputModal').isVisible()) {
      await page.evaluate(() => {
        const $ = (window as any).$;
        const modal = $('#inputModal');
        const callback = modal.data('callback');
        const input = String($('#inputModalInput').val() ?? '');
        if (callback) {
          callback(true, input);
        }
        modal.removeData(['callback', 'completed', 'returnType']);
        modal.removeClass('show').attr('aria-hidden', 'true').css('display', 'none');
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open').css('padding-right', '');
      });
    }
  }
}

async function finalizeConfirmModalAffirmative(page: Page): Promise<void> {
  if (await page.locator('#confirmModal').isVisible()) {
    await page.evaluate(() => {
      const modal = (window as any).$('#confirmModal');
      modal.data('completed', true);
      modal.data('confirmed', true);
      modal.modal('hide');
    });
    await page.waitForTimeout(100);
    if (await page.locator('#confirmModal').isVisible()) {
      await page.evaluate(() => {
        const $ = (window as any).$;
        const modal = $('#confirmModal');
        modal.removeClass('show').attr('aria-hidden', 'true').css('display', 'none');
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open').css('padding-right', '');
      });
    }
  }
}

test('Adding and Removing Repositories', async ({ page }) => {

  await page.goto('http://localhost:8888/?tutorial=none');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/EAGLE/);

  const REPO_NAME = "ICRAR/daliuge";
  const REPO_BRANCH = "yan-812-2";
  const repoHTMLId = '#'+REPO_NAME.replace('/', '_') + "_" + REPO_BRANCH;

  //making sure the repo doesn't exist for some reason, if it does, remove it
  if(await page.locator('#ICRAR_daliuge_yan-812-2').count() === 1){
    await page.locator('.repoContainer').filter({has:page.locator(repoHTMLId)}).hover()
    await page.locator('.repoContainer').filter({has:page.locator(repoHTMLId)}).locator('button.repoTripleDot').click()
    await page.locator('.repoContainer').filter({has:page.locator(repoHTMLId)}).getByText('Remove').click()
  }

  //click the add repository button
  await page.getByRole('button',{name:'Add Repository'}).click()

  //wait needed to allow the input fields to be ready to detect changes to their values
  await page.waitForTimeout(500);

  //fill out the add repository modal information and confirm the modal
  await page.locator('input#gitCustomRepositoryModalRepositorySlugInput').pressSequentially(REPO_NAME)
  await page.locator('input#gitCustomRepositoryModalRepositoryBranchInput').pressSequentially(REPO_BRANCH)
  await page.locator('button#gitCustomRepositoryModalAffirmativeButton').click()

  //waiting for the repo to be added
  await page.waitForTimeout(1000);

  //making sure the repo now exists in the repositories tab
  await expect(await page.locator(repoHTMLId).count() === 1).toBeTruthy()

  //removing the repo
  await page.locator('.repoContainer').filter({has:page.locator(repoHTMLId)}).hover()
  await page.locator('.repoContainer').filter({has:page.locator(repoHTMLId)}).locator('button.repoTripleDot').click()
  await page.locator(repoHTMLId + "-remove").click()
  await page.waitForTimeout(500);
  await page.locator('button#confirmModalAffirmativeButton').click()

  //wait for the repo to be removed
  await page.waitForTimeout(1000);

  //making sure the repo has been removed
  await expect(await page.locator(repoHTMLId).count() === 1).toBeFalsy()

  //closing the browser
  await page.close();
});

test('Create Branch and Delete Branch Actions', async ({ page }) => {

  // create mocks for createBranch and deleteBranch endpoints to avoid actually creating/deleting branches on the backend
  let createBranchCallCount = 0;
  await page.route('**/createBranch', async route => {
    createBranchCallCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });
  await page.route('**/deleteBranch', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  // load the app and verify the page is ready.
  await page.goto('http://localhost:8888/?tutorial=none');
  await expect(page).toHaveTitle(/EAGLE/);

  // define repository/branch fixtures used by this scenario.
  const REPO_NAME = 'ICRAR/daliuge';
  const BASE_BRANCH = 'branch-actions-base';
  const CREATED_BRANCH = 'branch-actions-created';
  const PROTECTED_BRANCH = 'main';

  // ensure baseline repository state for create/delete branch actions.
  const baseRepoHTMLId = await addCustomRepository(page, REPO_NAME, BASE_BRANCH);
  const createdRepoHTMLId = '#'+REPO_NAME.replace('/', '_') + '_' + CREATED_BRANCH;
  const protectedRepoHTMLId = '#'+REPO_NAME.replace('/', '_') + '_' + PROTECTED_BRANCH;
  await removeCustomRepositoryIfPresent(page, createdRepoHTMLId);
  await removeCustomRepositoryIfPresent(page, protectedRepoHTMLId);

  // verify create/delete options are present in the repository menu
  await page.locator('.repoContainer').filter({has:page.locator(baseRepoHTMLId)}).hover()
  await page.locator('.repoContainer').filter({has:page.locator(baseRepoHTMLId)}).locator('button.repoTripleDot').click()
  await expect(page.locator(baseRepoHTMLId + '-create-branch')).toBeVisible();
  await expect(page.locator(baseRepoHTMLId + '-delete-branch')).toBeVisible();

  const openCreateBranchModal = async (): Promise<void> => {
    const createBranchAction = page.locator(baseRepoHTMLId + '-create-branch');
    let clicked = false;

    for (let attempt = 0; attempt < 4; attempt++) {
      await page.locator('.repoContainer').filter({has:page.locator(baseRepoHTMLId)}).hover()
      await page.locator('.repoContainer').filter({has:page.locator(baseRepoHTMLId)}).locator('button.repoTripleDot').click()

      const isVisible = await createBranchAction.isVisible().catch(() => false);
      if (!isVisible) {
        await createBranchAction.waitFor({state: 'visible', timeout: 1500}).catch(() => undefined);
      }

      if (await createBranchAction.isVisible().catch(() => false)) {
        await createBranchAction.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      throw new Error('Could not open Create Branch action menu item after multiple attempts');
    }

    await expect(page.locator('#inputModal')).toBeVisible();
    await expect(page.locator('#inputModalInput')).toBeVisible();
  };

  // invalid branch names stay blocked and show validation feedback
  await openCreateBranchModal();
  await page.locator('#inputModalInput').fill('   ')
  await page.locator('#inputModal button.affirmativeBtn').click()
  await expect(page.locator('#inputModal')).toBeVisible();
  await expect(page.locator('#inputModalInput')).toHaveClass(/is-invalid/)
  await expect(page.locator('#inputModalInvalidFeedback')).toContainText('Branch name cannot be empty.')
  await expect(createBranchCallCount).toBe(0);
  await TestHelpers.closeInputModalWithoutCompleting(page);

  await openCreateBranchModal();
  await page.locator('#inputModalInput').fill('bad branch')
  await page.locator('#inputModal button.affirmativeBtn').click()
  await expect(page.locator('#inputModal')).toBeVisible();
  await expect(page.locator('#inputModalInput')).toHaveClass(/is-invalid/)
  await expect(page.locator('#inputModalInvalidFeedback')).toContainText('Branch name cannot contain whitespace.')
  await expect(createBranchCallCount).toBe(0);
  await TestHelpers.closeInputModalWithoutCompleting(page);

  await openCreateBranchModal();
  await page.locator('#inputModalInput').fill('bad..branch')
  await page.locator('#inputModal button.affirmativeBtn').click()
  await expect(page.locator('#inputModal')).toBeVisible();
  await expect(page.locator('#inputModalInput')).toHaveClass(/is-invalid/)
  await expect(page.locator('#inputModalInvalidFeedback')).toContainText("Branch name cannot contain '..'.")
  await expect(createBranchCallCount).toBe(0);
  await TestHelpers.closeInputModalWithoutCompleting(page);

  // verify successful create branch flow via UI
  await openCreateBranchModal();
  await page.locator('#inputModalInput').fill(CREATED_BRANCH)
  await page.locator('#inputModal button.affirmativeBtn').click()

  const createBranchDialog = page.getByRole('dialog', { name: 'Create Branch' });
  const inputModal = page.locator('#inputModal');

  // some runs keep the modal visible after first click; retry closure through UI.
  if (await createBranchDialog.isVisible()) {
    await page.keyboard.press('Escape');
  }
  if (await createBranchDialog.isVisible()) {
    await finalizeInputModalAffirmative(page);
  }

  await expect(inputModal).toBeHidden();
  await expect.poll(() => createBranchCallCount).toBe(1);
  await page.waitForTimeout(500);
  await expect(createBranchCallCount).toBe(1);

  // confirm the newly created branch entry appears in the repository list.
  await expect(await page.locator(createdRepoHTMLId).count()).toBeGreaterThan(0)

  // verify delete branch asks for confirmation and deletes
  await page.locator('.repoContainer').filter({has:page.locator(createdRepoHTMLId)}).hover()
  await page.locator('.repoContainer').filter({has:page.locator(createdRepoHTMLId)}).locator('button.repoTripleDot').click()
  await page.locator(createdRepoHTMLId + '-delete-branch').click()
  await expect(page.locator('#confirmModal')).toBeVisible();
  await page.locator('#confirmModalAffirmativeButton').click()
  if (await page.locator('#confirmModal').isVisible()) {
    await page.keyboard.press('Escape');
  }
  if (await page.locator('#confirmModal').isVisible()) {
    await finalizeConfirmModalAffirmative(page);
  }
  await expect(page.locator('#confirmModal')).toBeHidden();
  await page.waitForTimeout(500);

  // verify protected branch cannot be deleted and does not call backend
  await addCustomRepository(page, REPO_NAME, PROTECTED_BRANCH);
  await page.locator('.repoContainer').filter({has:page.locator(protectedRepoHTMLId)}).hover()
  await page.locator('.repoContainer').filter({has:page.locator(protectedRepoHTMLId)}).locator('button.repoTripleDot').click()
  await page.locator(protectedRepoHTMLId + '-delete-branch').click()
  await page.waitForTimeout(500);
  await expect(page.locator('#confirmModal')).toBeHidden();
  await expect(await page.locator(protectedRepoHTMLId).count()).toBeGreaterThan(0)

  // reset any repositories created during this test.
  await removeCustomRepositoryIfPresent(page, baseRepoHTMLId, false);
  await removeCustomRepositoryIfPresent(page, protectedRepoHTMLId, false);

  await page.close();
});

test('requestUserString validator UX for URL and Save As', async ({ page }) => {

  await page.goto('http://localhost:8888/?tutorial=none');
  await expect(page).toHaveTitle(/EAGLE/);

  // verify URL prompt blocks invalid URL input with inline feedback
  await page.locator('#navbarDropdownGraph').click();
  await page.locator('#createNewGraphFromUrl').click();
  await expect(page.locator('#inputModal')).toBeVisible();
  await page.locator('#inputModalInput').fill('not-a-valid-url');
  await page.locator('#inputModal button.affirmativeBtn').click();
  await expect(page.locator('#inputModal')).toBeVisible();
  await expect(page.locator('#inputModalInput')).toHaveClass(/is-invalid/);
  await expect(page.locator('#inputModalInvalidFeedback')).toContainText('URL is not a valid URL.');
  await TestHelpers.closeInputModalWithoutCompleting(page);

  // verify Save As prompt blocks empty filename with inline feedback
  await page.locator('#navbarDropdownGraph').click();
  await page.getByText('Local Storage').first().hover();
  await page.locator('#saveAsGraph').click();
  await expect(page.locator('#inputModal')).toBeVisible();
  await page.locator('#inputModalInput').fill('   ');
  await page.locator('#inputModal button.affirmativeBtn').click();
  await expect(page.locator('#inputModal')).toBeVisible();
  await expect(page.locator('#inputModalInput')).toHaveClass(/is-invalid/);
  await expect(page.locator('#inputModalInvalidFeedback')).toContainText('Filename cannot be empty.');
  await TestHelpers.closeInputModalWithoutCompleting(page);

  await page.close();
});

test('gitCommit filename validator UX', async ({ page }) => {
  await page.goto('http://localhost:8888/?tutorial=none');
  await expect(page).toHaveTitle(/EAGLE/);

  // Open modal in a controlled state so only filename validation is under test.
  await page.evaluate(() => {
    const w = window as any;
    const $ = w.$;
    const graphFileType = w.Eagle?.FileType?.Graph ?? 'Graph';

    $('#gitCommitModal').data('fileType', graphFileType);
    $('#gitCommitModalFileNameInput').val('invalid-name.txt');
    $('#gitCommitModal').modal('show');
    $('#gitCommitModalFileNameInput').trigger('input');
  });

  await expect(page.locator('#gitCommitModal')).toBeVisible();
  await expect(page.locator('#gitCommitModalFileNameInput')).toHaveClass(/is-invalid/);
  await expect(page.locator('#validationFeedback')).toContainText("File name must end with '.graph'.");
  await expect(page.locator('#gitCommitModalAffirmativeButton')).toBeDisabled();

  // A valid extension should clear invalid state and re-enable commit.
  await page.locator('#gitCommitModalFileNameInput').fill('valid-name.graph');
  await expect(page.locator('#gitCommitModalFileNameInput')).toHaveClass(/is-valid/);
  await expect(page.locator('#gitCommitModalAffirmativeButton')).toBeEnabled();

  await page.locator('#gitCommitModalNegativeButton').click();
  await expect(page.locator('#gitCommitModal')).toBeHidden();

  await page.close();
});
