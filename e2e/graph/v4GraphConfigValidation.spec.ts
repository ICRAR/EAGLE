import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

const NODE = '11111111-aaaa-4bbb-8ccc-dddddddddddd';
const FIELD = '22222222-aaaa-4bbb-8ccc-dddddddddddd';
const GRAPH_CONFIG = '33333333-aaaa-4bbb-8ccc-dddddddddddd';

type TestFileLocation = {
    repositoryService: (value?: string) => string;
    repositoryBranch: (value?: string) => string;
    repositoryName: (value?: string) => string;
    repositoryPath: (value?: string) => string;
    repositoryFileName: (value?: string) => string;
    commitHash: (value?: string) => string;
    downloadUrl: (value?: string) => string;
};
type TestGraph = {
    fileInfo: () => {name: string, location: TestFileLocation};
    getNumGraphConfigs: () => number;
};
type TestIssue = {message: string};
type TestErrorsWarnings = {errors: TestIssue[], warnings: TestIssue[]};
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
    _loadGraphConfig: (dataObject: object, file: unknown) => Promise<void>;
    _handleLoadingErrors: (
        errorsWarnings: TestErrorsWarnings,
        fileName: string,
        service: string,
        loadSucceeded: boolean
    ) => void;
};

const GRAPH_LOCATION = {
    repositoryService: 'File',
    repositoryBranch: '',
    repositoryName: '',
    repositoryPath: '',
    repositoryFileName: 'host.graph',
    commitHash: '',
    downloadUrl: '',
};

test('A V4 graph config with a recoverable extra attribute warns and still loads', async ({ page }) => {
    const graphData = {
        modelData: {
            type: 'Graph',
            schemaVersion: 'V4',
            name: 'host graph',
            location: GRAPH_LOCATION,
            graphLocation: GRAPH_LOCATION,
        },
        nodes: {
            [NODE]: {
                id: NODE,
                category: 'Data',
                name: 'node-1',
                fields: {
                    [FIELD]: {id: FIELD, name: 'p1', type: 'string'},
                },
            },
        },
        edges: {},
        visuals: {},
        graphConfigurations: {},
        activeGraphConfigId: null,
    };

    const configData = {
        modelData: {
            type: 'GraphConfig',
            name: 'valid config',
            graphLocation: GRAPH_LOCATION,
        },
        id: GRAPH_CONFIG,
        nodes: {
            [NODE]: {
                fields: {
                    [FIELD]: {value: 'configured', comment: 'test'},
                },
                bogusAttribute: 'extra',
            },
        },
    };

    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const result = await page.evaluate(async ({graphData, configData}: {graphData: object, configData: object}) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const report = {
            loaded: false,
            loadSucceeded: true,
            warnings: [] as string[],
            errors: [] as string[],
            graphConfigCount: 0,
        };

        eagle._handleLoadingErrors = (errorsWarnings, _fileName, _service, loadSucceeded) => {
            report.warnings = errorsWarnings.warnings.map((issue) => issue.message);
            report.errors = errorsWarnings.errors.map((issue) => issue.message);
            report.loadSucceeded = loadSucceeded;
        };

        const loaded = await eagle._loadGraphJSON(JSON.stringify(graphData), 'host.graph', (graph) => {
            eagle.logicalGraph(graph);
        });
        if (!loaded) {
            return report;
        }

        report.loaded = true;
        await eagle._loadGraphConfig(configData, {
            name: 'valid.graphConfig',
            repository: {service: 'GitHub'},
        });
        report.graphConfigCount = eagle.logicalGraph().getNumGraphConfigs();
        return report;
    }, {graphData, configData});

    expect(result.loaded).toBe(true);
    expect(result.loadSucceeded).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some((warning) => warning.includes('Schema validation'))).toBe(true);
    expect(result.graphConfigCount).toBe(1);

    await page.close();
});
