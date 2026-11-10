import { test, expect } from '@playwright/test';

const NODE = '11111111-aaaa-4bbb-8ccc-dddddddddddd';
const FIELD = '22222222-aaaa-4bbb-8ccc-dddddddddddd';

type TestNotification = {title: string, message: string, type: string};
type TestUtils = {
    showNotification: (...args: unknown[]) => void;
};
type TestEagle = {
    openRemoteFile: (file: unknown) => Promise<void>;
};

test('A successful palette load reports success, not an error', async ({ page }) => {
    const paletteData = {
        modelData: {type: 'Palette', schemaVersion: 'V4', name: 'clean palette'},
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

    await page.route('**/openRemoteGithubFile', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({data: JSON.stringify(paletteData)}),
        });
    });
    await page.goto('http://localhost:8888/?tutorial=none');

    const result = await page.evaluate(async () => {
        const eagle = (window as unknown as {eagle: TestEagle}).eagle;
        const utils = (window as unknown as {Utils: TestUtils}).Utils;
        const notifications: TestNotification[] = [];
        const original = utils.showNotification;

        utils.showNotification = (title: unknown, message: unknown, type: unknown) => {
            notifications.push({title: String(title), message: String(message), type: String(type)});
        };

        try {
            await eagle.openRemoteFile({
                name: 'clean.palette',
                path: '',
                type: 'Palette',
                repository: {service: 'GitHub', name: 'example/repo', branch: 'main'},
                isFetching: (_value: boolean) => { void _value; },
            });
        } finally {
            utils.showNotification = original;
        }

        return notifications;
    });

    expect(result.some((notification) => notification.title === 'Success' && notification.type === 'success')).toBe(true);
    expect(result.some((notification) => notification.title === 'Error' && notification.type === 'danger')).toBe(false);

    await page.close();
});
