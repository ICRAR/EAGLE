import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

test('Parameter Tables and keyboard Shortcuts', async ({ page }) => {
  await test.step('Set up a graph with an editable node', async () => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await expect(page).toHaveTitle(/EAGLE/);
    await TestHelpers.setUIMode(page, "Expert");
    await TestHelpers.expandPalette(page, 0);
    await page.locator('#addPaletteNodeHelloWorldApp').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'OK' }).click();
  });

  await test.step('Create and configure a parameter', async () => {
    await page.press('body','t');
    await page.getByRole('button', { name: 'Add Parameter' }).click();
    await page.getByRole('cell', { name: 'New Parameter' }).getByPlaceholder('New Parameter').click();
    await page.getByRole('row', { name: 'New Parameter' }).getByPlaceholder('New Parameter').selectText();
    await page.getByRole('row', { name: 'New Parameter' }).getByPlaceholder('New Parameter').pressSequentially('test parameter');
    await expect(page.getByRole('row').last().locator('.column_DisplayText input')).toHaveValue('test parameter');
    await page.getByRole('row').last().locator('.column_Type').getByRole('button').click();
    await page.getByRole('row').last().locator('.dropdown-menu').getByText('Integer').click();
    await expect(page.getByRole('row').last().locator('.typesInput')).toHaveValue('Integer');
    await page.getByRole('row').last().locator('.column_ParamType').getByRole('combobox').selectOption('Application');
    await expect(page.getByRole('row').last().locator('.column_ParamType').getByRole('combobox')).toHaveValue('Application');
    await page.getByRole('row').last().locator('.column_Usage').getByRole('combobox').selectOption('OutputPort');
    await expect(page.getByRole('row').last().locator('.column_Usage').getByRole('combobox')).toHaveValue('OutputPort');
  });

  await test.step('Exercise parameter duplication, flags, and key status', async () => {
    await page.getByRole('row').last().locator('.duplicate').click();
    await page.getByRole('row').last().locator('.column_Flags').getByText('diamond').click();
    await page.getByRole('row').last().locator('.column_Flags').getByText('location_on').click();
    await page.getByRole('row').last().locator('.column_Flags').getByText('alarm_off').click();
    await page.getByRole('row').last().locator('.column_Flags').getByText('lock_open').click();
    const countBefore = await page.getByRole('row').count();
    await page.getByRole('row').last().locator('.delete').click();
    const countAfter = await page.getByRole('row').count();
    await expect(countBefore - countAfter === 1).toBeTruthy();
    await expect(page.getByRole('row').last().locator('.column_DisplayText input')).not.toHaveValue('test parameter copy');
    await page.getByRole('row').last().locator('.column_DisplayText').hover();
    await page.getByRole('row').last().locator('.column_DisplayText button').click();
  });

  await test.step('Verify the graph parameter table', async () => {
    await page.waitForTimeout(800);
    await page.locator('.closeBottomWindowBtn button').click();
    await page.locator('#openGraphConfigurationTable').click();
    await page.waitForTimeout(500);
    await expect(await page.locator('.parameterTable tbody').getByRole('row').count()===0).toBeFalsy();
  });

  await page.close();
});
