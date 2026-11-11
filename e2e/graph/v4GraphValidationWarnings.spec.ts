import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

type TestV4Field = {
  id: string;
  encoding?: unknown;
  changeable?: unknown;
};

type TestV4Node = {
  fields: Record<string, TestV4Field>;
};

type TestV4Graph = {
  nodes: Record<string, TestV4Node>;
};

test('Load V4 graph with schema validation warnings', async ({ page }) => {
  await page.goto('http://localhost:8888/?tutorial=none');
  await TestHelpers.loadGraphFromString(page, await TestHelpers.readGraph('data/LoopWithBranch.graph'));

  await TestHelpers.setUIMode(page, 'Expert');
  await TestHelpers.setSchemaVersion(page, 'V4');
  const graph = JSON.parse(await TestHelpers.saveGraphToString(page)) as TestV4Graph;
  const fields = Object.values(graph.nodes).flatMap(node => Object.values(node.fields));
  const field = fields[0];
  expect(field).toBeDefined();

  delete field.changeable;
  field.encoding = '';

  await TestHelpers.loadGraphFromString(page, JSON.stringify(graph));

  expect(await TestHelpers.getNodeCount(page)).toBe(Object.keys(graph.nodes).length);

  const loadedGraph = JSON.parse(await TestHelpers.saveGraphToString(page)) as TestV4Graph;
  const loadedField = Object.values(loadedGraph.nodes)
    .flatMap(node => Object.values(node.fields))
    .find(candidate => candidate.id === field.id);
  expect(loadedField?.changeable).toBe(true);

  await page.close();
});
