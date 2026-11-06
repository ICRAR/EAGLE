import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

const NODE_ID = '00000000-0000-4000-8000-000000000001';
const FIELD_ID = '00000000-0000-4000-8000-000000000002';

type TestFieldGraph = {
    getNumNodes: () => number;
    getNodeById: (id: string) => {getFieldById: (id: string) => {isChangeable: () => boolean} | undefined} | undefined;
};
type TestLoadIssue = {message: string};
type TestEagle = {
    loadingErrors: () => TestLoadIssue[];
    _loadGraphJSON: (
        json: string,
        fileName: string,
        loadCallback: (graph: TestFieldGraph, errorsWarnings: {warnings: TestLoadIssue[], errors: TestLoadIssue[]}) => void
    ) => Promise<boolean>;
};
type TestGraphData = {
    modelData: {type: string, schemaVersion: string, name: string};
    nodes: Record<string, {category: string, name: string, fields: Record<string, {name: string, type: string, changeable?: unknown}>}>;
    edges: Record<string, unknown>;
    visuals: Record<string, unknown>;
    graphConfigurations: Record<string, unknown>;
    activeGraphConfigId: null;
};

const createGraphData = (changeable?: unknown): TestGraphData => {
    const field: TestGraphData['nodes'][string]['fields'][string] = {
        name: 'optional changeable field',
        type: 'string',
    };
    if (typeof changeable !== 'undefined'){
        field.changeable = changeable;
    }

    return {
        modelData: {type: 'Graph', schemaVersion: 'V4', name: 'field default graph'},
        nodes: {
            [NODE_ID]: {
                category: 'Data',
                name: 'Data node',
                fields: {[FIELD_ID]: field},
            },
        },
        edges: {},
        visuals: {},
        graphConfigurations: {},
        activeGraphConfigId: null,
    };
};

test('A V4 field without changeable loads and defaults to changeable', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const result = await page.evaluate(async (data: TestGraphData) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        let nodeCount: number | null = null;
        let fieldChangeable: boolean | null = null;
        let warnings: string[] = [];
        let errors: string[] = [];

        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), 'field-default.graph', (graph, errorsWarnings) => {
            nodeCount = graph.getNumNodes();
            const node = graph.getNodeById('00000000-0000-4000-8000-000000000001');
            const field = node?.getFieldById('00000000-0000-4000-8000-000000000002');
            fieldChangeable = field?.isChangeable() ?? null;
            warnings = errorsWarnings.warnings.map((warning) => warning.message);
            errors = errorsWarnings.errors.map((error) => error.message);
        });

        return {loaded: Boolean(loaded), nodeCount, fieldChangeable, warnings, errors};
    }, createGraphData());

    expect(result.loaded).toBe(true);
    expect(result.nodeCount).toBe(1);
    expect(result.fieldChangeable).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);

    await page.close();
});

test('A wrong-typed V4 field attribute warns and uses its parser default', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const result = await page.evaluate(async (data: TestGraphData) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        let fieldChangeable: boolean | null = null;
        let warnings: string[] = [];
        const loaded = await eagle._loadGraphJSON(JSON.stringify(data), 'invalid-field-attribute.graph', (graph, errorsWarnings) => {
            fieldChangeable = graph.getNodeById('00000000-0000-4000-8000-000000000001')
                ?.getFieldById('00000000-0000-4000-8000-000000000002')?.isChangeable() ?? null;
            warnings = errorsWarnings.warnings.map((warning) => warning.message);
        });
        const errors = eagle.loadingErrors().map((error) => error.message);
        return {loaded: Boolean(loaded), fieldChangeable, warnings, errors};
    }, createGraphData('false'));

    expect(result.loaded, JSON.stringify(result)).toBe(true);
    expect(result.fieldChangeable).toBe(true);
    expect(result.warnings.some((warning) => warning.includes(`nodes/${NODE_ID}/fields/${FIELD_ID}/changeable`))).toBe(true);

    await page.close();
});
