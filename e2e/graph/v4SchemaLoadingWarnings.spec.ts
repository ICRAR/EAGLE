import { test, expect, type Page } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';
import type { Eagle } from '../../src/Eagle';
import type { Setting } from '../../src/Setting';
import type { Utils } from '../../src/Utils';

type TestField = { id: string; encoding?: string; changeable?: boolean };
type TestGraph = { nodes: Record<string, { fields: Record<string, TestField> }> };

async function setLoadingOptions(page: Page, showWarnings: boolean, disableValidation: boolean): Promise<void> {
  await page.evaluate(({ showWarnings, disableValidation }) => {
    const setting = Reflect.get(window, 'Setting') as typeof Setting;
    setting.setValue(setting.SHOW_FILE_LOADING_WARNINGS, showWarnings);
    setting.setValue(setting.DISABLE_JSON_VALIDATION, disableValidation);
  }, { showWarnings, disableValidation });
}

test('V4 schema violations are separate non-blocking loading warnings', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('http://localhost:8888/?tutorial=none');
  await TestHelpers.setUIMode(page, 'Expert');
  await TestHelpers.loadGraphFromString(page, await TestHelpers.readGraph('data/LoopWithBranch.graph'));
  await TestHelpers.setSchemaVersion(page, 'V4');

  const graph = JSON.parse(await TestHelpers.saveGraphToString(page)) as TestGraph;
  const fields = Object.values(graph.nodes).flatMap(node => Object.values(node.fields));
  expect(fields.length).toBeGreaterThanOrEqual(2);

  const validate = async (input: TestGraph) => page.evaluate((data) => {
    const utils = Reflect.get(window, 'Utils') as typeof Utils;
    return utils._validateJSON(data, 'V4' as Parameters<typeof Utils._validateJSON>[1], 'Graph' as Parameters<typeof Utils._validateJSON>[2]);
  }, input);

  expect(await validate(graph)).toEqual({ valid: true, errors: [] });
  await setLoadingOptions(page, true, false);
  await TestHelpers.loadGraphFromString(page, JSON.stringify(graph));
  await expect(page.locator('#issuesModal')).toBeHidden();

  fields[0].encoding = '';
  fields[1].encoding = '';
  delete fields[0].changeable;
  const result = await validate(graph);
  expect(result.valid).toBe(false);
  expect(result.errors).toHaveLength(3);
  expect(result.errors.filter(error => error.includes('encoding'))).toHaveLength(2);
  expect(result.errors.filter(error => error.includes('changeable'))).toHaveLength(1);

  await page.locator('#navbarDropdownGraph').click();
  await page.locator('#navbarDropdownGraphNew').hover();
  await page.locator('#createNewGraphFromJson').click();
  await expect(page.locator('#inputCodeModal')).toBeVisible();
  await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);
  await page.evaluate(TestHelpers.setCodeModalContent, JSON.stringify(graph));
  await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);
  await page.locator('#inputCodeModal .modal-footer button.btn-primary').click();
  await expect(page.locator('#issuesModal')).toBeVisible();
  expect(await TestHelpers.getNodeCount(page)).toBe(Object.keys(graph.nodes).length);
  const loadedFields = await page.evaluate((ids: string[]) => {
    const eagle = Reflect.get(window, 'eagle') as Eagle;
    return Array.from(eagle.logicalGraph().getNodes())
      .flatMap(node => Array.from(node.getFields()))
      .filter(field => ids.includes(String(field.getId())))
      .map(field => ({ id: String(field.getId()), encoding: field.getEncoding(), changeable: field.isChangeable() }));
  }, fields.slice(0, 2).map(field => field.id));
  expect(loadedFields).toHaveLength(2);
  expect(loadedFields.every(field => field.encoding === '')).toBe(true);
  expect(loadedFields.find(field => field.id === fields[0].id)?.changeable).toBe(true);

  const warnings = page.locator('#issuesModalWarningsAccordionBody li');
  await expect(warnings).toHaveCount(3);
  const messages = await warnings.allTextContents();
  for (const error of result.errors) {
    expect(messages.filter(message => message.includes(error))).toHaveLength(1);
  }
  for (const field of fields.slice(0, 2)) {
    expect(messages.some(message => message.includes(field.id) && message.includes('encoding'))).toBe(true);
  }
  await page.locator('#issuesModal .modal-footer button[data-bs-dismiss="modal"]').click();
  await expect(page.locator('#issuesModal')).toBeHidden();

  await setLoadingOptions(page, false, false);
  await TestHelpers.loadGraphFromString(page, JSON.stringify(graph));
  await expect(page.locator('#issuesModal')).toBeHidden();

  await setLoadingOptions(page, true, true);
  await TestHelpers.loadGraphFromString(page, JSON.stringify(graph));
  await expect(page.locator('#issuesModal')).toBeHidden();
  expect(await TestHelpers.getNodeCount(page)).toBe(Object.keys(graph.nodes).length);
});
