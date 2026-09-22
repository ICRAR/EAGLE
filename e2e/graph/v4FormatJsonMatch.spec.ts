import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

//const INPUT_GRAPH_LOCATION: string = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/graph_patterns/genericScatter.graph";
//const INPUT_GRAPH_LOCATION: string = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/examples/ArrayIngest_Demo.graph";
const INPUT_GRAPH_LOCATION: string = "data/LoopWithBranch.graph";

test('V4 Format JSON Match', async ({ page }) => {
  let inputOJS: string;
  let outputOJS: string;

  await test.step('Load the input graph', async () => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.setUIMode(page, 'Expert');
    inputOJS = await TestHelpers.readGraph(INPUT_GRAPH_LOCATION);
    await TestHelpers.loadGraphFromString(page, inputOJS);
  });

  await test.step('Round-trip the graph through V4', async () => {
    await TestHelpers.setSchemaVersion(page, 'V4');
    const outputV4 = await TestHelpers.saveGraphToString(page);
    await TestHelpers.loadGraphFromString(page, outputV4);
    await TestHelpers.setSchemaVersion(page, 'OJS');
    outputOJS = await TestHelpers.saveGraphToString(page);
  });

  await test.step('Compare the round-tripped graph', async () => {
    const obj1 = JSON.parse(inputOJS);
    const obj2 = JSON.parse(outputOJS);
    const result0 = TestHelpers.compareObj(obj1, obj2);
    const result1 = TestHelpers.compareObj(obj2, obj1);
    await expect(JSON.stringify(result0)).toBe("{}");
    await expect(JSON.stringify(result1)).toBe("{}");
  });

  // close the browser
  await page.close();
});
