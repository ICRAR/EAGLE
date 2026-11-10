import { test, expect } from '@playwright/test';

const NODE = '11111111-aaaa-4bbb-8ccc-dddddddddddd';
const OTHER_NODE = '22222222-aaaa-4bbb-8ccc-dddddddddddd';
const GRAPH_CONFIG = '33333333-aaaa-4bbb-8ccc-dddddddddddd';

type TestIssue = {message: string};
type TestErrorsWarnings = {errors: TestIssue[], warnings: TestIssue[]};
type TestGraph = {
    fileInfo: () => {name: string};
    getNumGraphConfigs: () => number;
};
type TestEagle = {
    logicalGraph: () => TestGraph;
    _loadGraphConfig: (dataObject: object, file: unknown) => Promise<void>;
    _handleLoadingErrors: (
        errorsWarnings: TestErrorsWarnings,
        fileName: string,
        service: string,
        loadSucceeded: boolean
    ) => void;
};

test('A malformed graph config is rejected before it is added to the graph', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    const result = await page.evaluate(async ({nodeId, otherNodeId, graphConfigId}: {
        nodeId: string,
        otherNodeId: string,
        graphConfigId: string,
    }) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const graph = eagle.logicalGraph();
        graph.fileInfo().name = 'host graph';

        const report = {
            errors: [] as string[],
            warnings: [] as string[],
            loadSucceeded: true,
            graphConfigCount: graph.getNumGraphConfigs(),
        };

        eagle._handleLoadingErrors = (errorsWarnings, _fileName, _service, loadSucceeded) => {
            report.errors = errorsWarnings.errors.map((issue) => issue.message);
            report.warnings = errorsWarnings.warnings.map((issue) => issue.message);
            report.loadSucceeded = loadSucceeded;
        };

        const configData = {
            modelData: {type: 'GraphConfig', schemaVersion: 'V4', name: 'malformed config'},
            id: graphConfigId,
            nodes: {
                [nodeId]: null,
                [otherNodeId]: [],
            },
        };

        await eagle._loadGraphConfig(configData, {
            name: 'malformed.graphConfig',
            repository: {service: 'GitHub'},
        });

        report.graphConfigCount = graph.getNumGraphConfigs();
        return report;
    }, {nodeId: NODE, otherNodeId: OTHER_NODE, graphConfigId: GRAPH_CONFIG});

    expect(result.loadSucceeded).toBe(false);
    expect(result.errors.some((error) => error.includes('invalid node data'))).toBe(true);
    expect(result.graphConfigCount).toBe(0);

    await page.close();
});
