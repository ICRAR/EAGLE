import { test, expect } from '@playwright/test';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { TestHelpers } from './TestHelpers';

const INPUT_GRAPH_LOCATION: string = "data/LoopWithBranch.graph";
//const INPUT_GRAPH_LOCATION: string = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/graph_patterns/LoopWithBranch.graph";

test('Load/Save JSON Match', async ({ page }) => {
  //const graphJSON = await fetchGraph(graph);
  const graphJSON = await TestHelpers.readGraph(INPUT_GRAPH_LOCATION);

  await page.goto('http://localhost:8888/?tutorial=none');

  // load graph from string
  await TestHelpers.loadGraphFromString(page, graphJSON);

  // save graph to string
  const outputJSON: string = await TestHelpers.saveGraphToString(page);
  
  const obj1 = JSON.parse(graphJSON);
  const obj2 = JSON.parse(outputJSON);

  const result0 = TestHelpers.compareObj(obj1, obj2);
  const result1 = TestHelpers.compareObj(obj2, obj1);

  // !!!!!!!!!!!!! CHECK FOR MATCH
  await expect(JSON.stringify(result0)).toBe("{}");
  await expect(JSON.stringify(result1)).toBe("{}");

  //closing the browser
  await page.close();
});