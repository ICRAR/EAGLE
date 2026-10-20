import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

const INPUT_GRAPH_LOCATION: string = "data/LoopWithBranch.graph";
//const INPUT_GRAPH_LOCATION: string = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/refs/heads/master/graph_patterns/LoopWithBranch.graph";

test('Load/Save JSON Match', async ({ page }) => {
  const graphJSON = await TestHelpers.readGraph(INPUT_GRAPH_LOCATION);
  let outputJSON: string;

  await test.step('Load and save the graph', async () => {
    await page.goto('http://localhost:8888/?tutorial=none');
    const loaded = await page.evaluate(async (json: string) => {
      type TestGraph = object;
      type TestEagle = {
        _loadGraphJSON: (data: string, fileName: string, loadCallback: (graph: TestGraph) => void) => Promise<boolean>;
        logicalGraph: (graph: TestGraph) => void;
      };
      const eagle = (window as unknown as {eagle: TestEagle}).eagle;
      return eagle._loadGraphJSON(json, 'round-trip.graph', (graph) => {
        eagle.logicalGraph(graph);
      });
    }, graphJSON);
    expect(loaded).toBe(true);
    outputJSON = await TestHelpers.saveGraphToString(page);
  });

  await test.step('Compare the saved JSON', async () => {
    const obj1 = JSON.parse(graphJSON) as Record<string, unknown>;
    const obj2 = JSON.parse(outputJSON) as Record<string, unknown>;
    const result0 = TestHelpers.compareObj(obj1, obj2);
    const result1 = TestHelpers.compareObj(obj2, obj1);
    expect(JSON.stringify(result0)).toBe("{}");
    expect(JSON.stringify(result1)).toBe("{}");
  });

  //closing the browser
  await page.close();
});