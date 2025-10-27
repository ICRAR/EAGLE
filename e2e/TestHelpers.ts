import fs from 'fs';
import https from 'https';
import path from 'path';

export class TestHelpers {
    // Set the specified UI mode
    static async setUIMode(page, mode: 'Student' | 'Minimal' | 'Graph' | 'Component' | 'Expert') {
        // open settings modal
        await page.locator('#settings').click()

        // enable specified mode
        const uiModeSelect = await page.getByPlaceholder('uiMode')
        uiModeSelect.selectOption({value: mode})

        // close settings modal (wait is needed, bootstrap is not ready to close the modal again that quickly)
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: 'OK' }).click();
        await page.waitForTimeout(500);
    }

    static async createNewGraph(page): Promise<void> {
        // click 'New Graph' from the 'File' menu
        await page.locator('#navbarDropdownGraph').click();
        await page.locator('#navbarDropdownGraphNew').hover();
        await page.locator('#createNewGraph').click();
        await page.waitForTimeout(500);

        // agree to create a new graph with it's auto-generated name
        await page.getByRole('button', { name: 'OK' }).click();
        await page.waitForTimeout(500);

        // wait for the notification to appear and then dismiss it
        await page.locator('div[data-notify="container"]').waitFor({state: 'attached'});
        await page.locator('button[data-notify="dismiss"]').click();
    }

    static async setShortDescription(page, description: string): Promise<void> {
        await page.evaluate( (description: string) => {
            (window as any).eagle.logicalGraph().fileInfo().shortDescription = description;
            (window as any).eagle.checkGraph();
        }, description);
    }

    static async setDetailedDescription(page, description: string): Promise<void> {
        await page.evaluate( (description: string) => {
            (window as any).eagle.logicalGraph().fileInfo().detailedDescription = description;
            (window as any).eagle.checkGraph();
        }, description);
    }

    // Set the content of the editor in the modal
    static setEditorContent(content): void {
        const editor = $('#inputCodeModal').data('editor');
        editor.setValue(content);
    }

    // Get the content of the editor in the modal
    static getEditorContent(): string {
        const editor = $('#inputCodeModal').data('editor');
        return editor.getValue();
    }

    // Read a graph file from disk
    static readGraph(filename: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            fs.readFile(path.join(__dirname, filename), 'utf8', (err, data) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    // Fetch a graph file from a remote URL
    static fetchGraph(url: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
        const req = https.request(url, res => {
            let rawData: string = "";

            res.on('data', (d) => {
            rawData += d;
            });

            res.on('end', () => {
            resolve(rawData);
            });
        });

        req.on('error', e => {
            console.error(e);
            reject(e);
        });

        req.end();
        });
    }

    // Load a graph from a string into the app via the modal
    static async loadGraphFromString(page, s: string) {
        // click 'create new graph from JSON' from the 'Graph' menu
        await page.locator('#navbarDropdownGraph').click();
        await page.locator('#navbarDropdownGraphNew').hover();
        await page.locator('#createNewGraphFromJson').click();
        await page.waitForTimeout(500);

        // set the content of the editor in the modal
        await page.evaluate(TestHelpers.setEditorContent, s);
        await page.waitForTimeout(500);

        // click 'OK' to save the graph
        await page.locator('#inputCodeModal .modal-footer button.btn-primary').click();
        await page.waitForTimeout(500);

        // wait for the notification to appear and then dismiss it
        await page.locator('div[data-notify="container"]').waitFor({state: 'attached'});
        await page.locator('button[data-notify="dismiss"]').click();

        // wait for the notification to be dismissed
        await page.locator('div[data-notify="container"]').waitFor({state: 'detached'});
    }

    // Load a graph from a string into the app via the modal
    static async insertGraphFromString(page, s: string) {
        // click 'create new graph from JSON' from the 'Graph' menu
        await page.locator('#navbarDropdownGraph').click();
        await page.locator('#navbarDropdownGraphEdit').hover();
        await page.locator('#insertGraphFromJson').click();
        await page.waitForTimeout(500);

        // set the content of the editor in the modal
        await page.evaluate(TestHelpers.setEditorContent, s);
        await page.waitForTimeout(500);

        // click 'OK' to save the graph
        await page.locator('#inputCodeModal .modal-footer button.btn-primary').click();
        await page.waitForTimeout(500);

        // wait for the notification to appear and then dismiss it
        await page.locator('div[data-notify="container"]').waitFor({state: 'attached'});
        await page.locator('button[data-notify="dismiss"]').click();

        // wait for the notification to be dismissed
        await page.locator('div[data-notify="container"]').waitFor({state: 'detached'});
    }

    static async saveGraphToString(page): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            // click 'display as JSON' from the 'Graph' menu
            await page.locator('#navbarDropdownGraph').click();
            await page.locator('#displayGraphAsJson').click();
            await page.waitForTimeout(500);

            // get JSON from modal
            const outputOJS: string = await page.evaluate(TestHelpers.getEditorContent);

            await page.waitForTimeout(500);
            await page.locator('#inputCodeModal button.affirmativeBtn').click()
            await page.waitForTimeout(500);

            resolve(outputOJS);
        });
    }

    // Set the schema version in the app (OJS or V4)
    static async setSchemaVersion(page, format: 'OJS' | 'V4') {
        await page.locator('#settings').click();
        await page.waitForTimeout(500);
        await page.locator('#settingCategoryDeveloper').click();
        await page.locator('#settingDaliugeSchemaVersionValue').selectOption({value: format});
        await page.locator('#settingsModalAffirmativeAnswer').click();
        await page.waitForTimeout(500);
    }

    static async getNodeCount(page): Promise<number> {
        return await page.evaluate( () => {
            return (window as any).eagle.logicalGraph().nodes().size;
        });
    }

    static async undo(page): Promise<void> {
        return await page.press('body','z');
    }

    static async redo(page): Promise<void> {
        return await page.press('body','Shift+z');
    }

    // Check if an object is empty
    static isEmpty(o) {
        for (const p in o) {
        if (o.hasOwnProperty(p)) { return false; }
        }
        return true;
    }

    // Compare two objects and return the differences
    static compareObj(obj1, obj2) {
        const ret = {};
        let rett;
        for (const i in obj2) {
        rett = {};
        if (typeof obj2[i] === 'object' && typeof obj1 !== 'undefined') {
            rett = TestHelpers.compareObj(obj1[i], obj2[i]);
            if (!TestHelpers.isEmpty(rett)) {
            ret[i] = rett;
            }
        } else {
            if (!obj1 || !obj1.hasOwnProperty(i) || obj2[i] !== obj1[i]) {
            ret[i] = obj2[i];
            }
        }
        }
        return ret;
    }

    static async getNumWarningsErrors(page): Promise<number> {
        return await page.evaluate(() => {
            return (window as any).eagle.graphWarnings().length + (window as any).eagle.graphErrors().length;
        });
    }
}