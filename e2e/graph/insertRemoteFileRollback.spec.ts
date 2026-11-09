import { test, expect } from '@playwright/test';
import { TestHelpers } from '../TestHelpers';

type TestIssue = {message: string};
type TestErrorsWarnings = {errors: TestIssue[], warnings: TestIssue[]};
type TestEagle = {
    logicalGraph: () => {fileInfo: () => {name: string}};
    insertGraph: (...args: unknown[]) => Promise<void>;
    insertRemoteFile: (file: unknown) => Promise<void>;
    _handleLoadingErrors: (
        errorsWarnings: TestErrorsWarnings,
        fileName: string,
        service: string,
        loadSucceeded: boolean
    ) => void;
};

test('A remote insert failure is reported through the loading-error handler', async ({ page }) => {
    const graphData = {
        modelData: {type: 'Graph', schemaVersion: 'V4', name: 'remote insert failure'},
        nodes: {},
    };
    await page.route('**/openRemoteGithubFile', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({data: JSON.stringify(graphData)}),
        });
    });
    await page.goto('http://localhost:8888/?tutorial=none');
    await TestHelpers.waitForV4GraphSchema(page);

    const result = await page.evaluate(async () => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        eagle.logicalGraph().fileInfo().name = 'existing graph';
        const report: {
            errors: string[];
            warnings: string[];
            fileName: string;
            service: string;
            loadSucceeded: boolean;
        } = {errors: [], warnings: [], fileName: '', service: '', loadSucceeded: true};
        let fetching = false;
        eagle.insertGraph = async () => {
            throw new Error('forced insert failure');
        };
        eagle._handleLoadingErrors = (errorsWarnings, fileName, service, loadSucceeded) => {
            report.errors = errorsWarnings.errors.map((issue) => issue.message);
            report.warnings = errorsWarnings.warnings.map((issue) => issue.message);
            report.fileName = fileName;
            report.service = service;
            report.loadSucceeded = loadSucceeded;
        };

        await eagle.insertRemoteFile({
            name: 'remote.graph',
            path: '',
            repository: {service: 'GitHub', name: 'example/repo', branch: 'main'},
            isFetching: (value: boolean) => {
                fetching = value;
            },
        });
        return {...report, fetching};
    });

    expect(result.errors.some((error) => error.includes('forced insert failure'))).toBe(true);
    expect(result.warnings).toContain('The graph contains no nodes.');
    expect(result.fileName).toBe('remote.graph');
    expect(result.service).toBe('GitHub');
    expect(result.loadSucceeded).toBe(false);
    expect(result.fetching).toBe(false);
    await page.close();
});
