import { test, expect, type Page } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

type TestIssue = {message: string};
type TestGraph = {
    getNumNodes: () => number;
    getNumGraphConfigs: () => number;
    activeGraphConfigId: () => string | null;
};
type TestErrorsWarnings = {errors: TestIssue[], warnings: TestIssue[]};
type TestEagle = {
    _loadGraphJSON: (
        json: string,
        fileName: string,
        loadCallback: (graph: TestGraph, errorsWarnings: TestErrorsWarnings) => void | Promise<void>
    ) => Promise<boolean>;
};

// graph-config id + node id must be valid v4-shaped uuids (4XXX-8/9ab) to satisfy the schema
const GC_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DANGLING_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

type CaseResult = {key: string, loaded: boolean, activeGraphConfigId: string | null, warnings: string[]};

const loadCase = async (page: Page, activeGraphConfigId: string | null): Promise<Omit<CaseResult, 'key'>> => {
    const graphData = {
        modelData: {type: 'Graph', schemaVersion: 'V4', name: 'active config test'},
        nodes: {},
        edges: {},
        visuals: {},
        graphConfigurations: {
            [GC_ID]: {modelData: {type: 'Graph', schemaVersion: 'V4', name: 'gc'}, nodes: {}},
        },
        activeGraphConfigId,
    };

    return page.evaluate(async (arg: {data: object}) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        let activeGraphConfigId: string | null = null;
        let warnings: string[] = [];
        const loaded = await eagle._loadGraphJSON(JSON.stringify(arg.data), 'active-config.graph', (graph, ew) => {
            activeGraphConfigId = graph.activeGraphConfigId();
            warnings = ew.warnings.map((warning) => warning.message);
        });
        return {
            loaded: Boolean(loaded),
            activeGraphConfigId,
            warnings,
        };
    }, {data: graphData});
};

test('A V4 activeGraphConfigId that matches a graph configuration loads without a warning', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const result = await loadCase(page, GC_ID);

    expect(result.loaded).toBe(true);
    expect(result.activeGraphConfigId).toBe(GC_ID);
    expect(result.warnings.some((warning) => warning.includes('activeGraphConfigId'))).toBe(false);

    await page.close();
});

test('A V4 activeGraphConfigId that matches no graph configuration warns and sets none active', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const result = await loadCase(page, DANGLING_ID);

    expect(result.loaded, JSON.stringify(result)).toBe(true);
    expect(result.activeGraphConfigId).toBeNull();
    expect(result.warnings.some((warning) =>
        warning.includes('activeGraphConfigId') && warning.includes(DANGLING_ID))).toBe(true);

    await page.close();
});

test('A V4 graph with no activeGraphConfigId does not warn about it', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const result = await loadCase(page, null);

    expect(result.loaded).toBe(true);
    expect(result.activeGraphConfigId).toBeNull();
    expect(result.warnings.some((warning) => warning.includes('activeGraphConfigId'))).toBe(false);

    await page.close();
});
