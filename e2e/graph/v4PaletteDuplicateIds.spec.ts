import { test, expect } from '@playwright/test';

const NODE = '11111111-aaaa-4bbb-8ccc-dddddddddddd';
const NODE_KEY_1 = '22222222-aaaa-4bbb-8ccc-dddddddddddd';
const NODE_KEY_2 = '33333333-aaaa-4bbb-8ccc-dddddddddddd';
const FIELD = '44444444-aaaa-4bbb-8ccc-dddddddddddd';

type TestIssue = {message: string};
type TestErrorsWarnings = {errors: TestIssue[], warnings: TestIssue[]};
type TestPalette = {
    getNumNodes: () => number;
    fileInfo: () => {type: string};
};
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
    name: 'duplicate-ids.palette',
    type: 'Palette',
};

test('Duplicate palette node IDs warn and are skipped', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    const paletteData = {
        modelData: {type: 'Palette', schemaVersion: 'V4', name: 'duplicate palette ids'},
        nodes: {
            [NODE_KEY_1]: {
                id: NODE,
                category: 'Data',
                name: 'node-1',
                fields: {
                    [FIELD]: {id: FIELD, name: 'p1', type: 'string'},
                },
            },
            [NODE_KEY_2]: {
                id: NODE,
                category: 'Data',
                name: 'node-2',
                fields: {
                    [FIELD]: {id: FIELD, name: 'p2', type: 'string'},
                },
            },
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
            fileType: palette.fileInfo().type,
            warnings: errorsWarnings.warnings.map((issue) => issue.message),
            errors: errorsWarnings.errors.map((issue) => issue.message),
        };
    }, {paletteData, file: PALETTE_FILE});

    expect(result.nodeCount).toBe(1);
    expect(result.fileType).toBe('Palette');
    expect(result.warnings.some((warning) => warning.includes('duplicate node id'))).toBe(true);

    await page.close();
});
