import { test, expect } from '@playwright/test';

type TestVisual = {getColor: () => string};
type TestGraph = {getVisualById: (id: string) => TestVisual | undefined};
type TestEagle = {
    _loadGraphJSON: (
        json: string,
        fileName: string,
        loadCallback: (graph: TestGraph) => void
    ) => Promise<boolean>;
};

test('A V4 group visual without color keeps the configured background default', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    const result = await page.evaluate(async () => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const graphData = {
            modelData: {type: 'Graph', schemaVersion: 'V4', name: 'visual default color'},
            nodes: {},
            edges: {},
            visuals: {
                '00000000-0000-4000-8000-000000000001': {
                    type: 'Group',
                    content: '',
                },
            },
            graphConfigurations: {},
            activeGraphConfigId: null,
        };
        let visualColor: string | null = null;
        const loaded = await eagle._loadGraphJSON(JSON.stringify(graphData), 'visual-default-color.graph', (graph) => {
            visualColor = graph.getVisualById('00000000-0000-4000-8000-000000000001')?.getColor() ?? null;
        });
        return {loaded: Boolean(loaded), visualColor};
    });

    expect(result.loaded).toBe(true);
    expect(result.visualColor).toBe('#b4d4ff');

    await page.close();
});
