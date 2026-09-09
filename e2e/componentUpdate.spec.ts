import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

const INPUT_GRAPH_PATH = path.join(__dirname, '../tests/data/component-update-test.graph');

test('Component updates replace stale component definitions', async ({ page }) => {
  const graphJSON = fs.readFileSync(INPUT_GRAPH_PATH, 'utf8');

  await page.goto('http://localhost:8888/?tutorial=none');
  await TestHelpers.setUIMode(page, 'Expert');
  await TestHelpers.loadGraphFromString(page, graphJSON);

  const staleNode = JSON.parse(graphJSON).nodeDataArray.find((node: { fields: { name: string; value: string }[] }) =>
    node.fields.some((field) => field.name === 'dropclass' && field.value === 'dlg.apps.simple.CopyAppBad'));
  expect(staleNode).toBeDefined();
  expect(staleNode.fields).toHaveLength(7);

  await page.locator('#checkForComponentUpdates').click();
  await expect(page.locator('div[data-notify="container"]').first()).toContainText('Successfully updated');

  const outputJSON = await TestHelpers.saveGraphToString(page);
  const updatedNode = JSON.parse(outputJSON).nodeDataArray.find((node: { fields: { name: string; value: string }[] }) =>
    node.fields.some((field) => field.name === 'dropclass' && field.value === 'dlg.apps.simple.CopyApp'));

  expect(updatedNode).toBeDefined();
  expect(updatedNode.fields).toHaveLength(12);
  expect(updatedNode.fields.map((field) => field.name)).toEqual(expect.arrayContaining([
    'hello',
    'bufsize',
    'log_level',
    'base_name',
    'n_tries',
    'io',
  ]));
});