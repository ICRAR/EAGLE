import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

type TestV4Field = {
  id: string;
  encoding?: unknown;
  changeable?: unknown;
};

type TestV4Node = {
  name: string;
  fields: Record<string, TestV4Field>;
};

type TestV4Graph = {
  nodes: Record<string, TestV4Node>;
};

test('Load V4 graph with schema validation warnings', async ({ page }) => {
  await page.goto('http://localhost:8888/?tutorial=none');
  await TestHelpers.loadGraphFromString(page, await TestHelpers.readGraph('data/LoopWithBranch.graph'));

  await TestHelpers.setUIMode(page, 'Expert');
  await TestHelpers.setGraphSchema(page, 'V4');
  const graph = JSON.parse(await TestHelpers.saveGraphToString(page)) as TestV4Graph;
  const [nodeId, node] = Object.entries(graph.nodes).find(([, candidate]) => Object.keys(candidate.fields).length > 0) ?? [];
  expect(nodeId).toBeDefined();
  expect(node).toBeDefined();
  if (nodeId === undefined || node === undefined) {
    throw new Error('The input graph has no node with fields');
  }
  const field = Object.values(node.fields)[0];
  expect(field).toBeDefined();

  const marker = `${node.name} - reloaded`;
  expect(node.name).not.toBe(marker);
  node.name = marker;
  delete field.changeable;
  field.encoding = '';

  await TestHelpers.loadGraphFromString(page, JSON.stringify(graph));

  expect(await TestHelpers.getNodeCount(page)).toBe(Object.keys(graph.nodes).length);

  const loadedGraph = JSON.parse(await TestHelpers.saveGraphToString(page)) as TestV4Graph;
  expect(loadedGraph.nodes[nodeId].name).toBe(marker);
  const loadedField = Object.values(loadedGraph.nodes[nodeId].fields).find(candidate => candidate.id === field.id);
  expect(loadedField).toMatchObject({ encoding: '', changeable: true });

  await page.close();
});
