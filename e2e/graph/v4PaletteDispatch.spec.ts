import { test, expect } from '@playwright/test';

const NODE = '11111111-aaaa-4bbb-8ccc-dddddddddddd';
const FIELD = '22222222-aaaa-4bbb-8ccc-dddddddddddd';

type TestIssue = {message: string};
type TestErrorsWarnings = {errors: TestIssue[], warnings: TestIssue[]};
type TestPalette = {
    getNumNodes: () => number;
    fileInfo: () => {type: string};
};
type TestEagle = {
    loadPalettes: (paletteList: {name: string, filename: string, readonly: boolean, expanded: boolean}[]) =>
        Promise<{palettes: TestPalette[], errorsWarnings: TestErrorsWarnings}>;
};
type TestUtils = {
    httpPostText: (...args: unknown[]) => Promise<string>;
};

const PALETTE_DATA = {
    modelData: {type: 'Palette', schemaVersion: 'V4', name: 'v4 palette'},
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
};

test('A V4 palette fetched by loadPalettes uses the V4 parser', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    const result = await page.evaluate(async ({paletteData}: {paletteData: object}) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const utils = (window as unknown as {Utils: TestUtils}).Utils;
        const original = utils.httpPostText;
        utils.httpPostText = async () => JSON.stringify(paletteData);

        try {
            const {palettes, errorsWarnings} = await eagle.loadPalettes([
                {name: 'V4 Palette', filename: 'v4-success.palette', readonly: true, expanded: false},
            ]);
            return {
                nodeCount: palettes[0].getNumNodes(),
                fileType: palettes[0].fileInfo().type,
                errors: errorsWarnings.errors.map((issue) => issue.message),
                warnings: errorsWarnings.warnings.map((issue) => issue.message),
            };
        } finally {
            utils.httpPostText = original;
            localStorage.removeItem('v4-success.palette');
        }
    }, {paletteData: PALETTE_DATA});

    expect(result.nodeCount).toBe(1);
    expect(result.fileType).toBe('Palette');
    await page.close();
});

test('A cached V4 palette fallback uses the V4 parser', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');

    const result = await page.evaluate(async ({paletteData}: {paletteData: object}) => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const utils = (window as unknown as {Utils: TestUtils}).Utils;
        const original = utils.httpPostText;
        const filename = 'v4-fallback.palette';
        localStorage.setItem(filename, JSON.stringify(paletteData));
        utils.httpPostText = async () => {
            throw new Error('palette unavailable');
        };

        try {
            const {palettes, errorsWarnings} = await eagle.loadPalettes([
                {name: 'V4 Fallback Palette', filename, readonly: true, expanded: false},
            ]);
            return {
                nodeCount: palettes[0].getNumNodes(),
                fileType: palettes[0].fileInfo().type,
                errors: errorsWarnings.errors.map((issue) => issue.message),
                warnings: errorsWarnings.warnings.map((issue) => issue.message),
            };
        } finally {
            utils.httpPostText = original;
            localStorage.removeItem(filename);
        }
    }, {paletteData: PALETTE_DATA});

    expect(result.nodeCount).toBe(1);
    expect(result.fileType).toBe('Palette');
    await page.close();
});
