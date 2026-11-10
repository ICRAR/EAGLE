import { test, expect } from '@playwright/test';

const NODE = '11111111-aaaa-4bbb-8ccc-dddddddddddd';
const OTHER_NODE = '22222222-aaaa-4bbb-8ccc-dddddddddddd';

type TestIssue = {message: string};
type TestErrorsWarnings = {errors: TestIssue[], warnings: TestIssue[]};
type TestPalette = {getNumNodes: () => number};
type TestPaletteParser = {
    fromV4Json: (data: string, file: unknown, errorsWarnings: TestErrorsWarnings) => TestPalette;
};
type TestWindow = {
    require: (
        dependencies: string[],
        callback: (module: {Palette: TestPaletteParser}) => void,
        errorCallback?: (error: unknown) => void
    ) => void;
};

const PALETTE_FILE = {
    repository: {name: '', branch: '', service: 'Unknown'},
    path: '',
    name: 'malformed.palette',
    type: 'Palette',
};

test('Malformed V4 palette node entries warn instead of throwing', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    const paletteData = {
        modelData: {type: 'Palette', schemaVersion: 'V4', name: 'malformed palette'},
        nodes: {
            [NODE]: null,
            [OTHER_NODE]: [],
        },
    };

    const result = await page.evaluate(async ({paletteData, file}: {paletteData: object, file: object}) => {
        const testWindow = window as unknown as TestWindow;
        const paletteModule = await new Promise<{Palette: TestPaletteParser}>((resolve, reject) => {
            testWindow.require(['Palette'], resolve, reject);
        });
        const errorsWarnings: TestErrorsWarnings = {errors: [], warnings: []};

        const palette = paletteModule.Palette.fromV4Json(JSON.stringify(paletteData), file, errorsWarnings);
        return {
            nodeCount: palette.getNumNodes(),
            errors: errorsWarnings.errors.map((issue) => issue.message),
            warnings: errorsWarnings.warnings.map((issue) => issue.message),
        };
    }, {paletteData, file: PALETTE_FILE});

    expect(result.nodeCount).toBe(0);
    expect(result.errors.some((error) => error.includes('invalid JSON'))).toBe(true);

    await page.close();
});

test('A V4 palette with a missing nodes container warns instead of throwing', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    const paletteData = {
        modelData: {type: 'Palette', schemaVersion: 'V4', name: 'palette without nodes'},
    };

    const result = await page.evaluate(async ({paletteData, file}: {paletteData: object, file: object}) => {
        const testWindow = window as unknown as TestWindow;
        const paletteModule = await new Promise<{Palette: TestPaletteParser}>((resolve, reject) => {
            testWindow.require(['Palette'], resolve, reject);
        });
        const errorsWarnings: TestErrorsWarnings = {errors: [], warnings: []};

        const palette = paletteModule.Palette.fromV4Json(JSON.stringify(paletteData), file, errorsWarnings);
        return {
            nodeCount: palette.getNumNodes(),
            errors: errorsWarnings.errors.map((issue) => issue.message),
            warnings: errorsWarnings.warnings.map((issue) => issue.message),
        };
    }, {paletteData, file: {...PALETTE_FILE, name: 'missing-nodes.palette'}});

    expect(result.nodeCount).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some((warning) => warning.includes('Missing attribute') && warning.includes('nodes'))).toBe(true);

    await page.close();
});
