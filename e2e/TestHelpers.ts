import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { test, expect, type Page } from '@playwright/test';

export class TestHelpers {
    //How many times we will attempt to run a tutorial step before failing the test.
    private static readonly MAX_ATTEMPTS_PER_STEP = 5;
    public static readonly UI_SETTLE_TIMEOUT = 500;
    public static readonly SHORT_TIMEOUT = 5000;
    public static readonly LONG_TIMEOUT = 10000;
    // Mirrors TutorialStep.Type values from src/Tutorial.ts without importing browser-only app code.
    private static readonly TutorialStepType = {
        Info: "Info",
        Press: "Press",
        Input: "Input",
        Condition: "Condition",
    } as const;

    // Set the specified UI mode
    static async setUIMode(page: Page, mode: 'Student' | 'Minimal' | 'Graph' | 'Component' | 'Expert') {
        // open settings modal
        await page.locator('#settings').click()

        // enable specified mode
        const uiModeSelect = await page.getByPlaceholder('uiMode')
        uiModeSelect.selectOption({value: mode})

        // close settings modal (wait is needed, bootstrap is not ready to close the modal again that quickly)
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);
        await page.getByRole('button', { name: 'OK' }).click();
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);
    }

    static async waitForTutorialStep(page: Page, title: string): Promise<void> {
        await page.locator('#tutorialInfoPopUp').waitFor({ state: 'attached', timeout: TestHelpers.LONG_TIMEOUT });
        await expect(page.locator('#tutorialInfoPopUp .tutorialInfoTitle h4')).toContainText(title, { timeout: TestHelpers.SHORT_TIMEOUT });
    }

    static async clickTutorialNext(page: Page): Promise<void> {
        await page.locator('#tutorialInfoPopUp .tutNextBtn').click();
        await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: TestHelpers.SHORT_TIMEOUT });
    }

    static async runTutorialInfoStep(page: Page, title: string): Promise<void> {
        await test.step(`Tutorial info step: ${title}`, async () => {
            await TestHelpers.waitForTutorialStep(page, title);
            await TestHelpers.clickTutorialNext(page);
        });
    }

    static async runTutorialPressStep(page: Page, title: string, selector: string): Promise<void> {
        await test.step(`Tutorial press step: ${title}`, async () => {
            await TestHelpers.waitForTutorialStep(page, title);
            await page.locator(selector).click();
            await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: TestHelpers.SHORT_TIMEOUT });
        });
    }

    static async runTutorialByName(page: Page, tutorialName: string): Promise<void> {
        //.step is creating a test step. this is so we know exactly where we failed if something goes wrong.
        await test.step(`Start tutorial: ${tutorialName}`, async () => {
            await page.evaluate((name: string) => (window as any).TutorialSystem.initiateTutorial(name), tutorialName);
            await page.locator('#tutorialInfoPopUp').waitFor({ state: 'attached', timeout: TestHelpers.LONG_TIMEOUT });
        });

        console.log(`[tutorial] started: ${tutorialName}`);
        const stepAttempts = new Map<string, number>();

        while (true) {
            // Snapshot all step fields together (including testStepFunction) because the active tutorial step can
            // advance while Playwright awaits; this keeps one coherent current-step view, not mixed next-step data.
            const stepInfo = await page.evaluate(() => {
                const tutSystem = (window as any).TutorialSystem;
                const currentStep = tutSystem?.activeTutCurrentStep;

                return {
                    hasActiveTutorial: tutSystem?.activeTut !== null,
                    title: currentStep?.getTitle?.() ?? '',
                    stepType: currentStep?.getType?.(),
                    expectedInput: currentStep?.getExpectedInput?.() ?? '',
                    testStepFunction: currentStep?.getTestStepFunction?.() ?? null,
                    index: tutSystem?.activeTutCurrentStepIndex ?? -1,
                    total: tutSystem?.activeTutNumSteps ?? -1,
                };
            });

            if (!stepInfo.hasActiveTutorial) {
                return;
            }

            const stepKey = `${stepInfo.index}:${stepInfo.title}:${stepInfo.stepType}`;
            const attemptCount = (stepAttempts.get(stepKey) ?? 0) + 1;
            stepAttempts.set(stepKey, attemptCount);

            if (attemptCount > TestHelpers.MAX_ATTEMPTS_PER_STEP) {
                throw new Error(`Tutorial '${tutorialName}' exceeded ${TestHelpers.MAX_ATTEMPTS_PER_STEP} attempts on step '${stepInfo.title}' (${stepInfo.index + 1}/${stepInfo.total}).`);
            }

            try {
                await test.step(`Tutorial step ${stepInfo.index + 1}/${stepInfo.total}: ${stepInfo.title}`, async () => {
                    // tutorialInfoPopUp can be recreated between steps, so always wait for it here
                    await page.locator('#tutorialInfoPopUp').waitFor({ state: 'attached', timeout: TestHelpers.LONG_TIMEOUT });

                    switch (stepInfo.stepType) {
                        case TestHelpers.TutorialStepType.Info: {
                            const nextBtn = page.locator('#tutorialInfoPopUp .tutNextBtn');

                            if (await nextBtn.count() > 0) {
                                const clickedNext = await TestHelpers.clickElementBoundingRectCenter(page, '#tutorialInfoPopUp .tutNextBtn');
                                if (!clickedNext) {
                                    await nextBtn.click();
                                }
                                try {
                                    await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: TestHelpers.SHORT_TIMEOUT });
                                } catch {
                                    await page.keyboard.press('ArrowRight');
                                    await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: TestHelpers.SHORT_TIMEOUT });
                                }
                                return;
                            }

                            // Last Info step has no Next button; end the tutorial.
                            const clickedEnd = await TestHelpers.clickElementBoundingRectCenter(page, '#tutorialInfoPopUp .tutEndBtn');
                            if (!clickedEnd) {
                                await page.locator('#tutorialInfoPopUp .tutEndBtn').click();
                            }
                            try {
                                await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: TestHelpers.SHORT_TIMEOUT });
                            } catch {
                                await page.keyboard.press('Escape');
                                await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: TestHelpers.SHORT_TIMEOUT });
                            }
                            break;
                        }

                        case TestHelpers.TutorialStepType.Press: {
                            // Press steps are advanced by clicking the tutorial target element, simulating real user clicks.
                            // This is more realistic than synthetic keyboard events.
                            const clickedTarget = await TestHelpers.clickTutorialPressTarget(page);
                            if (!clickedTarget) {
                                // Fallback for legacy tutorial steps that only listen for Enter key events.
                                await page.keyboard.press('Enter');
                            }
                            await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: TestHelpers.SHORT_TIMEOUT });
                            break;
                        }

                        case TestHelpers.TutorialStepType.Input: {
                            if (stepInfo.testStepFunction) {
                                await TestHelpers.runTutorialCustomStep(page, stepInfo.testStepFunction);
                            } else {
                                const inputText = TestHelpers.getTutorialInputText(stepInfo.title, stepInfo.expectedInput);
                                const submittedToTarget = await TestHelpers.submitTutorialInputToTarget(page, inputText);

                                // Fallback if tutorial target is unavailable.
                                if (!submittedToTarget) {
                                    if (inputText.length > 0) {
                                        await page.keyboard.type(inputText);
                                    }
                                    await page.keyboard.press('Enter');
                                }
                            }

                            await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: TestHelpers.LONG_TIMEOUT });
                            break;
                        }

                        case TestHelpers.TutorialStepType.Condition: {
                            if (!stepInfo.testStepFunction) {
                                throw new Error(`Condition step '${stepInfo.title}' requires a test hook. Add .setTestStepFunction(...) in the tutorial definition.`);
                            }

                            await TestHelpers.runTutorialCustomStep(page, stepInfo.testStepFunction);
                            await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: TestHelpers.LONG_TIMEOUT });
                            break;
                        }

                        default:
                            throw new Error(`Unsupported tutorial step type ${stepInfo.stepType} at step '${stepInfo.title}'`);
                    }
                });
            } catch (error) {
                if (error instanceof Error) {
                    const stepDescriptor = `${tutorialName} | ${stepInfo.index + 1}/${stepInfo.total} | ${stepInfo.title} | type=${stepInfo.stepType}`;
                    error.message = `Tutorial step failed: ${stepDescriptor}. ${error.message}`;
                }
                throw error;
            }

            const isStillActive = await page.evaluate(() => (window as any).TutorialSystem?.activeTut !== null);
            if (!isStillActive) {
                await expect(page.locator('#tutorialInfoPopUp')).toHaveCount(0);
                return;
            }
        }
    }

    private static async runTutorialCustomStep(page: Page, testStepFunction: { command: string; args?: string[] }): Promise<void> {

        const command = testStepFunction.command;
        const args = testStepFunction.args ?? [];
        const [arg1, arg2] = args;

        if (command === 'centerGraph') {
            await TestHelpers.centerGraphOnCanvas(page);
            return;
        }

        if (command === 'openCanvasContextMenu') {
            await TestHelpers.openCanvasContextMenu(page);
            return;
        }

        if (command === 'addNodeFromContextMenu') {
            if (!arg1) {
                throw new Error(`Missing search term in test step function '${testStepFunction}'`);
            }

            await page.locator('#rightClickSearchBar').fill(arg1);
            await page.keyboard.press('Enter');
            return;
        }

        if (command === 'selectNode') {
            if (!arg1) {
                throw new Error(`Missing node name in test step function '${testStepFunction}'`);
            }

            await TestHelpers.selectNodeByName(page, arg1);
            return;
        }

        if (command === 'connectNodes') {
            if (!arg1 || !arg2) {
                throw new Error(`Missing source/destination node names in test step function '${testStepFunction}'`);
            }

            await TestHelpers.dragEdge(page, arg1, arg2);
            return;
        }

        throw new Error(`Unknown tutorial test step function '${testStepFunction}'`);
    }

    private static async openCanvasContextMenu(page: Page): Promise<void> {
        const menuLocator = page.locator('#customContextMenu .searchBarContainer');

        if (await menuLocator.count() > 0) {
            return;
        }

        const canvas = page.locator('#logicalGraphParent').first();
        await canvas.waitFor({ state: 'visible', timeout: TestHelpers.SHORT_TIMEOUT });

        // find a free position on the graph canvas to right-click for context menu
        const { x, y } = await TestHelpers.findUnoccupiedCanvasClickPoint(page);

        // Use Playwright mouse so the app receives real pointer coordinates.
        await page.mouse.click(x, y, { button: 'right' });

        // Fallback if overlay/event handlers swallowed the native click.
        if (await menuLocator.count() === 0) {
            await page.evaluate(({ x, y }) => {
                const target = document.querySelector('#logicalGraphParent');
                if (!target) {
                    return;
                }

                const evt = new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    button: 2,
                    clientX: x,
                    clientY: y,
                });

                target.dispatchEvent(evt);
            }, { x, y });
        }

        await menuLocator.waitFor({ state: 'attached', timeout: TestHelpers.SHORT_TIMEOUT });
    }

    private static async findUnoccupiedCanvasClickPoint(page: Page): Promise<{ x: number; y: number }> {
        return await page.evaluate(() => {
            const w = window as any;
            const eagle = w.eagle;
            const eagleConfig = w.EagleConfig;
            const graphRenderer = w.GraphRenderer;

            // find a free position on the graph canvas to right-click for context menu
            const freePosition = eagle.getNewNodePosition(eagleConfig.NORMAL_NODE_RADIUS);

            // convert graph coordinates to screen coordinates for playwright mouse click
            const screenX = Math.floor(graphRenderer.GRAPH_TO_SCREEN_POSITION_X(freePosition.x));
            const screenY = Math.floor(graphRenderer.GRAPH_TO_SCREEN_POSITION_Y(freePosition.y));

            return {
                x: screenX,
                y: screenY,
            };
        });
    }

    private static async centerGraphOnCanvas(page: Page): Promise<void> {
        // Shortcut from KeyboardShortcut.ts: center_graph => key "c"
        await page.press('body', 'c');
    }

    private static getTutorialInputText(title: string, expectedInput: string): string {
        if (expectedInput && expectedInput.trim().length > 0) {
            return expectedInput;
        }

        return 'Automated tutorial text.';
    }

    /**
     * Clicks the current tutorial Press step's target element using Playwright mouse interaction.
     * This simulates real user click behavior more accurately than synthetic Enter key presses.
     * 
     * @param page - Playwright page object
     * @returns true if the target was clicked, false if no clickable target was found
     * 
     * Strategy:
     * 1. Resolve the tutorial target via TutorialSystem.activeTutCurrentStep.getTargetFunc()
     * 2. Prefer clickable child elements (buttons, links, inputs, node bodies) over the container
     * 3. Calculate viewport-relative coordinates (center of the element)
     * 4. Use Playwright mouse.click() to trigger real pointer events
     */
    private static async clickTutorialPressTarget(page: Page): Promise<boolean> {
        const clickPosition = await page.evaluate(() => {
            // Get the tutorial target element from the active step.
            const tutorialTarget = (window as any).TutorialSystem?.activeTutCurrentStep?.getTargetFunc?.();
            if (!tutorialTarget || tutorialTarget.length === 0) {
                return null;
            }

            const targetEl = tutorialTarget.first().get(0) as HTMLElement | undefined;
            if (!targetEl) {
                return null;
            }

            // Prefer native interactive elements (buttons, links, inputs) or graph nodes (.body)
            // over the container itself, as these are what a user would actually click.
            const preferredClickable = targetEl.querySelector('button, a, input, textarea, select, .body') as HTMLElement | null;
            const clickable = preferredClickable ?? targetEl;
            const rect = clickable.getBoundingClientRect();

            // Ensure the element is visible and has dimensions.
            if (rect.width <= 0 || rect.height <= 0) {
                return null;
            }

            // Return center point in viewport coordinates for Playwright mouse interaction.
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            };
        });

        if (!clickPosition) {
            return false;
        }

        // Use Playwright's mouse API to dispatch real pointer events.
        await page.mouse.click(clickPosition.x, clickPosition.y);
        return true;
    }

    private static async clickElementBoundingRectCenter(page: Page, selector: string): Promise<boolean> {
        const clickPosition = await page.evaluate((targetSelector: string) => {
            const el = document.querySelector(targetSelector) as HTMLElement | null;
            if (!el) {
                return null;
            }

            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
                return null;
            }

            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            };
        }, selector);

        if (!clickPosition) {
            return false;
        }

        await page.mouse.click(clickPosition.x, clickPosition.y);
        return true;
    }

    private static async submitTutorialInputToTarget(page: Page, value: string): Promise<boolean> {
        return await page.evaluate((inputValue: string) => {
            const w = window as any;
            const tutStep = w.TutorialSystem?.activeTutCurrentStep;
            const targetFunc = tutStep?.getTargetFunc?.();

            if (!targetFunc || targetFunc.length === 0) {
                return false;
            }

            const target = targetFunc.first();
            if (!target || target.length === 0) {
                return false;
            }

            const nativeEl = target.get(0) as HTMLElement | undefined;
            if (!nativeEl) {
                return false;
            }

            // Set the value directly on the native element
            if (inputValue.length > 0) {
                if (nativeEl instanceof HTMLInputElement || nativeEl instanceof HTMLTextAreaElement) {
                    nativeEl.value = inputValue;
                    nativeEl.dispatchEvent(new Event('input', { bubbles: true }));
                    nativeEl.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // Create and dispatch a proper KeyboardEvent with key property
            const keydownEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true,
            });

            nativeEl.dispatchEvent(keydownEvent);
            return true;
        }, value);
    }

    private static async selectNodeByName(page: Page, nodeName: string): Promise<void> {
        const isRequestedNodeSelected = async (): Promise<boolean> => {
            return await page.evaluate((name: string) => {
                const selectedNode = (window as any).eagle?.selectedNode?.();
                return selectedNode !== null && selectedNode?.getName?.() === name;
            }, nodeName);
        };

        const waitForRequestedSelection = async (): Promise<boolean> => {
            try {
                await page.waitForFunction((name: string) => {
                    const selectedNode = (window as any).eagle?.selectedNode?.();
                    return selectedNode !== null && selectedNode?.getName?.() === name;
                }, nodeName, { timeout: TestHelpers.SHORT_TIMEOUT });
                return true;
            } catch {
                return false;
            }
        };

        if (await isRequestedNodeSelected()) {
            return;
        }

        // Primary path: use Eagle graph data to resolve node id, then click the rendered node element via Playwright.
        const nodeInfo = await page.evaluate((name: string) => {
            const eagle = (window as any).eagle;
            const graph = eagle?.logicalGraph?.();
            const node = graph?.findNodeByName?.(name);

            if (!node) {
                return null;
            }

            const nodeId = node.getId?.();
            const graphPosition = node?.getPosition?.();
            const graphToScreen = (window as any).GraphRenderer;

            let clickPos: { x: number; y: number } | null = null;
            if (graphPosition && graphToScreen?.GRAPH_TO_SCREEN_POSITION_X && graphToScreen?.GRAPH_TO_SCREEN_POSITION_Y) {
                clickPos = {
                    x: graphToScreen.GRAPH_TO_SCREEN_POSITION_X(graphPosition.x),
                    y: graphToScreen.GRAPH_TO_SCREEN_POSITION_Y(graphPosition.y),
                };
            }

            return {
                selectors: [
                    `#logicalGraphParent .node[id="${nodeId}"] .body`,
                    `#logicalGraph .node[id="${nodeId}"] .body`,
                    `#logicalGraphParent .node[id="${nodeId}"]`,
                    `#logicalGraph .node[id="${nodeId}"]`,
                ],
                clickPos,
            };
        }, nodeName);

        if (nodeInfo) {
            //attempt to click the node using the selectors first, then fallback to clicking the position stored on the node if the selectors fail to find the node.
            for (const selector of nodeInfo.selectors) {
                const target = page.locator(selector).first();
                if (await target.count() > 0) {
                    await target.click({ force: true, timeout: TestHelpers.SHORT_TIMEOUT });
                    if (await waitForRequestedSelection()) {
                        return;
                    }
                }
            }

            if (nodeInfo.clickPos) {
                await page.mouse.click(nodeInfo.clickPos.x, nodeInfo.clickPos.y);
                if (await waitForRequestedSelection()) {
                    return;
                }
            }
        }

        //check if the node is selected, if not throw an error with debug info

        if (!(await isRequestedNodeSelected())) {
            const debugInfo = await page.evaluate((name: string) => {
                const eagle = (window as any).eagle;
                const selected = eagle?.selectedNode?.();
                const nodeNames = eagle?.logicalGraph?.()?.getNodes?.()
                    ? Array.from(eagle.logicalGraph().getNodes()).map((node: any) => node.getName())
                    : [];

                const tutorialTarget = (window as any).TutorialSystem?.activeTutCurrentStep?.getTargetFunc?.();
                const targetId = tutorialTarget && tutorialTarget.length > 0 ? tutorialTarget.get(0).id : null;

                const diagnostics = targetId ? {
                    nodeBodyMatches: document.querySelectorAll(`#logicalGraph .node[id="${targetId}"] .body`).length,
                    nodeMatches: document.querySelectorAll(`#logicalGraph .node[id="${targetId}"]`).length,
                    containerMatches: document.querySelectorAll(`#logicalGraph [id="${targetId}"].container`).length,
                } : null;

                return {
                    requestedName: name,
                    selectedName: selected?.getName?.() ?? null,
                    graphNodeNames: nodeNames,
                    targetId,
                    diagnostics,
                };
            }, nodeName);

            throw new Error(`Could not select node '${nodeName}' via interface selectors. selected=${debugInfo.selectedName}; nodes=${JSON.stringify(debugInfo.graphNodeNames)}; targetId=${debugInfo.targetId}; selectors=${JSON.stringify(debugInfo.diagnostics)}`);
        }
    }

    static async createNewGraph(page: Page): Promise<void> {
        // click 'New Graph' from the 'File' menu
        await page.locator('#navbarDropdownGraph').click();
        await page.locator('#navbarDropdownGraphNew').hover();
        await page.locator('#createNewGraph').click();
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);

        // agree to create a new graph with it's auto-generated name
        await page.getByRole('button', { name: 'OK' }).click();
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);

        // wait for the notification to appear and then dismiss it
        await page.locator('div[data-notify="container"]').first().waitFor({state: 'attached'});
        await page.locator('button[data-notify="dismiss"]').first().click();
    }

    static async setShortDescription(page: Page, description: string): Promise<void> {
        await page.evaluate( (description: string) => {
            (window as any).eagle.logicalGraph().fileInfo().shortDescription = description;
            (window as any).eagle.checkEagle();
        }, description);
    }

    static async setDetailedDescription(page: Page, description: string): Promise<void> {
        await page.evaluate( (description: string) => {
            (window as any).eagle.logicalGraph().fileInfo().detailedDescription = description;
            (window as any).eagle.checkEagle();
        }, description);
    }

    // Set the content of the editor in the modal
    static setEditorContent(content: string): void {
        const editor = ($('#inputCodeModal') as JQuery<HTMLElement>).data('editor');
        editor.setValue(content);
    }

    // Get the content of the editor in the modal
    static getEditorContent(): string {
        const editor = ($('#inputCodeModal') as JQuery<HTMLElement>).data('editor');
        return editor.getValue();
    }

    // Read a graph file from disk
    static readGraph(filename: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            fs.readFile(path.join(__dirname, filename), 'utf8', (err: NodeJS.ErrnoException | null, data: any) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve(data as string);
                }
            });
        });
    }

    // Fetch a graph file from a remote URL
    static fetchGraph(url: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
        const req = https.request(url, (res: http.IncomingMessage) => {
            let rawData: string = "";

            res.on('data', (d: Buffer) => {
            rawData += d;
            });

            res.on('end', () => {
            resolve(rawData);
            });
        });

        req.on('error', (e: Error) => {
            console.error(e);
            reject(e);
        });

        req.end();
        });
    }

    // Load a graph from a string into the app via the modal
    static async loadGraphFromString(page: Page, s: string) {
        // click 'create new graph from JSON' from the 'Graph' menu
        await page.locator('#navbarDropdownGraph').click();
        await page.locator('#navbarDropdownGraphNew').hover();
        await page.locator('#createNewGraphFromJson').click();
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);

        // set the content of the editor in the modal
        await page.evaluate(TestHelpers.setEditorContent, s);
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);

        // click 'OK' to save the graph
        await page.locator('#inputCodeModal .modal-footer button.btn-primary').click();
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);

        // wait for the notification to appear and then dismiss it
        await page.locator('div[data-notify="container"]').first().waitFor({state: 'attached'});
        await page.locator('button[data-notify="dismiss"]').first().click();

        // wait for the notification to be dismissed
        await page.locator('div[data-notify="container"]').first().waitFor({state: 'detached'});
    }

    // Load a graph from a string into the app via the modal
    static async insertGraphFromString(page: Page, s: string) {
        // click 'create new graph from JSON' from the 'Graph' menu
        await page.locator('#navbarDropdownGraph').click();
        await page.locator('#navbarDropdownGraphEdit').hover();
        await page.locator('#insertGraphFromJson').click();
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);

        // set the content of the editor in the modal
        await page.evaluate(TestHelpers.setEditorContent, s);
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);

        // click 'OK' to save the graph
        await page.locator('#inputCodeModal .modal-footer button.btn-primary').click();
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);

        // wait for the notification to appear and then dismiss it
        await page.locator('div[data-notify="container"]').first().waitFor({state: 'attached'});
        await page.locator('button[data-notify="dismiss"]').first().click();

        // wait for the notification to be dismissed
        await page.locator('div[data-notify="container"]').first().waitFor({state: 'detached'});
    }

    static async saveGraphToString(page: Page): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            // click 'display as JSON' from the 'Graph' menu
            await page.locator('#navbarDropdownGraph').click();
            await page.locator('#displayGraphAsJson').click();
            await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);

            // get JSON from modal
            const outputOJS: string = await page.evaluate(TestHelpers.getEditorContent);

            await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);
            await page.locator('#inputCodeModal button.affirmativeBtn').click()
            await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);

            resolve(outputOJS);
        });
    }

    // Set the schema version in the app (OJS or V4)
    static async setSchemaVersion(page: Page, format: 'OJS' | 'V4') {
        await page.locator('#settings').click();
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);
        await page.locator('#settingCategoryDeveloper').click();
        await page.locator('#settingDaliugeSchemaVersionValue').selectOption({value: format});
        await page.locator('#settingsModalAffirmativeAnswer').click();
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);
    }

    static async getNodeCount(page: Page): Promise<number> {
        return await page.evaluate( () => {
            return (window as any).eagle.logicalGraph().nodes().size;
        });
    }

    static async getEdgeCount(page: Page): Promise<number> {
        return await page.evaluate( () => {
            return (window as any).eagle.logicalGraph().getNumEdges();
        });
    }

    static async undo(page: Page): Promise<void> {
        return await page.press('body','z');
    }

    static async redo(page: Page): Promise<void> {
        return await page.press('body','Shift+z');
    }

    // Check if an object is empty
    static isEmpty(o: Record<string, any>): boolean {
        for (const p in o) {
        if (o.hasOwnProperty(p)) { return false; }
        }
        return true;
    }

    // Compare two objects and return the differences
    static compareObj(obj1: Record<string, any>, obj2: Record<string, any>): Record<string, any> {
        const ret: Record<string, any> = {};
        let rett: Record<string, any>;
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

    static async getNumWarningsErrors(page: Page): Promise<number> {
        return await page.evaluate(() => {
            return (window as any).eagle.graphWarnings().length + (window as any).eagle.graphErrors().length;
        });
    }

    // Expand a palette accordion by index
    static async expandPalette(page: Page, paletteIndex: number): Promise<void> {
        await page.locator('#palette' + paletteIndex).click();
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);
    }

    // Fill the custom name field in the choice modal and confirm
    static async enterCustomChoiceName(page: Page, name: string): Promise<void> {
        await page.getByRole('textbox', { name: 'Custom Port Name' }).click();
        await page.getByRole('textbox', { name: 'Custom Port Name' }).fill(name);
        await page.waitForTimeout(TestHelpers.UI_SETTLE_TIMEOUT);
        await page.getByRole('button', { name: 'OK' }).click();
    }

    static async waitForNotificationAndDismiss(page: Page): Promise<void> {
        await page.locator('div[data-notify="container"]').first().waitFor({state: 'attached'});
        await page.locator('button[data-notify="dismiss"]').first().click();
        await page.locator('div[data-notify="container"]').first().waitFor({state: 'detached'});
    }

    static async openGraphMenuAndSelect(page: Page, menuItemId: string): Promise<void> {
        await page.locator('#navbarDropdownGraph').click();
        await page.locator('#' + menuItemId).click();
    }

    static async dragEdge(page: Page, sourceNodeName: string, destNodeName: string): Promise<void> {
        // draw an edge from source output to destination input
        const srcPort = page.locator('#' + sourceNodeName + ' .outputPort');
        const destPort = page.locator('#' + destNodeName + ' .inputPort');
    
        await expect(srcPort, 'source port should be visible before dragging').toBeVisible();
        await expect(destPort, 'destination port should be visible before dragging').toBeVisible();
    
        const requireBox = (box: { width: number; height: number } | null, message: string) => {
            expect(box, message).not.toBeNull();
            return box as { width: number; height: number };
        };
    
        const [srcPortBox, destPortBox] = [
            requireBox(await srcPort.boundingBox(), 'source port should have a bounding box before dragging'),
            requireBox(await destPort.boundingBox(), 'destination port should have a bounding box before dragging')
        ];
    
        await srcPort.dragTo(destPort, {
            sourcePosition: { x: srcPortBox.width / 2, y: srcPortBox.height / 2 },
            targetPosition: { x: destPortBox.width / 2, y: destPortBox.height / 2 }
        });
    }
}