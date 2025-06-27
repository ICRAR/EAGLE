import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';

//const INPUT_GRAPH_LOCATION: string = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/graph_patterns/genericScatter.graph";
//const INPUT_GRAPH_LOCATION: string = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/examples/ArrayIngest_Demo.graph";
const INPUT_GRAPH_LOCATION: string = "data/LoopWithBranch.graph";

test('V4 Format JSON Match', async ({ page }) => {
  await page.goto('http://localhost:8888/?tutorial=none');

  await TestHelpers.setUIMode(page, 'Expert');

  // 1 - read input graph from file, and load it into the app
  const inputOJS = await TestHelpers.readGraph(INPUT_GRAPH_LOCATION);
  await TestHelpers.loadGraphFromString(page, inputOJS);

  // 2 - set schema to V4, and output graph to string
  await TestHelpers.setSchemaVersion(page, 'V4')
  const outputV4 = await TestHelpers.saveGraphToString(page);

  // 3 - load the V4 graph back into the app
  await TestHelpers.loadGraphFromString(page, outputV4)

  // 4 - set schema to OJS, and output graph to string
  await TestHelpers.setSchemaVersion(page, 'OJS');
  const outputOJS = await TestHelpers.saveGraphToString(page);

  // 5 - compare steps 1 and 4
  const obj1 = JSON.parse(inputOJS);
  const obj2 = JSON.parse(outputOJS);

  const result0 = TestHelpers.compareObj(obj1, obj2);
  const result1 = TestHelpers.compareObj(obj2, obj1);

  // !!!!!!!!!!!!! CHECK FOR MATCH
  await expect(JSON.stringify(result0)).toBe("{}");
  await expect(JSON.stringify(result1)).toBe("{}");

  // close the browser
  await page.close();
});
