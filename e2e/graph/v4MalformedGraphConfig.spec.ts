import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

const NODE = '11111111-aaaa-4bbb-8ccc-dddddddddddd';
const PORT = '22222222-aaaa-4bbb-8ccc-dddddddddddd';
const OTHER_NODE = '33333333-aaaa-4bbb-8ccc-dddddddddddd';
const GRAPH_CONFIG = '44444444-aaaa-4bbb-8ccc-dddddddddddd';

type TestGraph = object;
type TestIssue = {message: string};
type TestErrorsWarnings = {errors: TestIssue[], warnings: TestIssue[]};
type TestGraphConfig = {getNodes: () => Iterable<unknown>};
type TestGraphConfigParser = {
    fromJson: (data: object, graph: TestGraph, errorsWarnings: TestErrorsWarnings) => TestGraphConfig;
};
type TestEagle = {
    logicalGraph: {
        (): TestGraph;
        (graph: TestGraph): void;
    };
    _loadGraphJSON: (
        json: string,
        fileName: string,
        loadCallback: (graph: TestGraph) => void
    ) => Promise<boolean>;
};

const GRAPH_DATA = {
    modelData: {type: 'Graph', schemaVersion: 'V4', name: 'graph config host'},
    nodes: {
        [NODE]: {
            id: NODE,
            category: 'Data',
            name: 'node-1',
            fields: {
                [PORT]: {id: PORT, name: 'p1', type: 'string'},
            },
        },
    },
    edges: {},
    visuals: {},
    graphConfigurations: {},
    activeGraphConfigId: null,
};

test('Malformed standalone V4 graph-config data warns instead of throwing', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const result = await page.evaluate(async ({graphData, graphConfigId, nodeId, otherNodeId}: {graphData: object, graphConfigId: string, nodeId: string, otherNodeId: string}) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const graphConfigParser = (window as unknown as {GraphConfig: TestGraphConfigParser}).GraphConfig;

        const loaded = await eagle._loadGraphJSON(JSON.stringify(graphData), 'host.graph', (graph) => {
            eagle.logicalGraph(graph);
        });
        if (!loaded){
            return {loaded: false, error: 'host graph did not load'};
        }

        const errorsWarnings: TestErrorsWarnings = {errors: [], warnings: []};
        const configData = {
            modelData: {type: 'GraphConfig', schemaVersion: 'V4', name: 'malformed config'},
            id: graphConfigId,
            nodes: {
                [nodeId]: null,
                [otherNodeId]: [],
            },
        };

        const config = graphConfigParser.fromJson(configData, eagle.logicalGraph(), errorsWarnings);
        return {
            loaded: true,
            configNodeCount: Array.from(config.getNodes()).length,
            errors: errorsWarnings.errors.map((issue) => issue.message),
            warnings: errorsWarnings.warnings.map((issue) => issue.message),
        };
    }, {graphData: GRAPH_DATA, graphConfigId: GRAPH_CONFIG, nodeId: NODE, otherNodeId: OTHER_NODE});

    expect(result.loaded).toBe(true);
    expect(result.configNodeCount).toBe(0);
    expect(result.errors.some((error) => error.includes('invalid node data'))).toBe(true);

    await page.close();
});

test('Malformed legacy graph-config data warns instead of throwing', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const result = await page.evaluate(async ({graphData, graphConfigId, nodeId, otherNodeId: _otherNodeId}: {graphData: object, graphConfigId: string, nodeId: string, otherNodeId: string}) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const graphConfigParser = (window as unknown as {GraphConfig: TestGraphConfigParser}).GraphConfig;

        const loaded = await eagle._loadGraphJSON(JSON.stringify(graphData), 'host.graph', (graph) => {
            eagle.logicalGraph(graph);
        });
        if (!loaded){
            return {loaded: false, error: 'host graph did not load'};
        }

        const errorsWarnings: TestErrorsWarnings = {errors: [], warnings: []};
        const configData = {
            modelData: {type: 'GraphConfig', schemaVersion: 'OJS', name: 'legacy malformed config'},
            id: graphConfigId,
            nodes: {
                [nodeId]: null,
            },
        };

        const config = graphConfigParser.fromJson(configData, eagle.logicalGraph(), errorsWarnings);
        return {
            loaded: true,
            configNodeCount: Array.from(config.getNodes()).length,
            errors: errorsWarnings.errors.map((issue) => issue.message),
            warnings: errorsWarnings.warnings.map((issue) => issue.message),
        };
    }, {graphData: GRAPH_DATA, graphConfigId: GRAPH_CONFIG, nodeId: NODE, otherNodeId: OTHER_NODE});

    expect(result.loaded).toBe(true);
    expect(result.configNodeCount).toBe(0);
    expect(result.errors.some((error) => error.includes('invalid node data'))).toBe(true);

    await page.close();
});
