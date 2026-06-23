import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { expect, test, type Page } from '@playwright/test';

export class TestHelpers {
    private static contextMenuAnchorIndex = 0;
    private static lastContextMenuPoint: { x: number; y: number } | null = null;

    // Set the specified UI mode
    static async setUIMode(page: Page, mode: 'Student' | 'Minimal' | 'Graph' | 'Component' | 'Expert') {
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

    static async waitForTutorialStep(page: Page, title: string): Promise<void> {
        await page.locator('#tutorialInfoPopUp').waitFor({ state: 'attached', timeout: 10000 });
        await expect(page.locator('#tutorialInfoPopUp .tutorialInfoTitle h4')).toContainText(title, { timeout: 5000 });
    }

    static async clickTutorialNext(page: Page): Promise<void> {
        await page.locator('#tutorialInfoPopUp .tutNextBtn').click();
        await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: 5000 });
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
            await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: 5000 });
        });
    }

    static async runTutorialByName(page: Page, tutorialName: string, maxSteps = 100): Promise<void> {
        //.step is creating a test step. this is so we know exactly where we failed if something goes wrong.
        await test.step(`Start tutorial: ${tutorialName}`, async () => {
            await page.evaluate((name: string) => (window as any).TutorialSystem.initiateTutorial(name), tutorialName);
            await page.locator('#tutorialInfoPopUp').waitFor({ state: 'attached', timeout: 10000 });
        });

        console.log(`[tutorial] started: ${tutorialName}`);

        for (let i = 0; i < maxSteps; i++) {
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
                console.log(`[tutorial] completed: ${tutorialName}`);
                return;
            }

            const stepDescriptor = `${tutorialName} | ${stepInfo.index + 1}/${stepInfo.total} | ${stepInfo.title} | type=${stepInfo.stepType}`;
            console.log(`[tutorial-step] start: ${stepDescriptor}${stepInfo.testStepFunction ? ` | hook=${stepInfo.testStepFunction}` : ''}`);

            try {
                await test.step(`Tutorial step ${stepInfo.index + 1}/${stepInfo.total}: ${stepInfo.title}`, async () => {
                    // tutorialInfoPopUp can be recreated between steps, so always wait for it here
                    await page.locator('#tutorialInfoPopUp').waitFor({ state: 'attached', timeout: 7000 });

                    // TutorialStep.Type.Info = 0, Press = 1, Input = 2, Condition = 3
                    if (stepInfo.stepType === 0) {
                        const nextBtn = page.locator('#tutorialInfoPopUp .tutNextBtn');

                        if (await nextBtn.count() > 0) {
                            await nextBtn.click();
                            await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: 5000 });
                            return;
                        }

                        // Last Info step has no Next button; end the tutorial.
                        await page.locator('#tutorialInfoPopUp .tutEndBtn').click();
                        await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: 5000 });
                    } else if (stepInfo.stepType === 1) {
                        // Press steps are advanced by clicking the tutorial target element, simulating real user clicks.
                        // This is more realistic than synthetic keyboard events.
                        const clickedTarget = await TestHelpers.clickTutorialPressTarget(page);
                        if (!clickedTarget) {
                            // Fallback for legacy tutorial steps that only listen for Enter key events.
                            await page.keyboard.press('Enter');
                        }
                        await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: 5000 });
                    } else if (stepInfo.stepType === 2) {
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

                        await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: 10000 });
                    } else if (stepInfo.stepType === 3) {
                        if (!stepInfo.testStepFunction) {
                            throw new Error(`Condition step '${stepInfo.title}' requires a test hook. Add .setTestStepFunction(...) in the tutorial definition.`);
                        }

                        await TestHelpers.runTutorialCustomStep(page, stepInfo.testStepFunction);
                        await page.locator('#tutorialInfoPopUp').waitFor({ state: 'detached', timeout: 7000 });
                    } else {
                        throw new Error(`Unsupported tutorial step type ${stepInfo.stepType} at step '${stepInfo.title}'`);
                    }
                });
                console.log(`[tutorial-step] ok: ${stepDescriptor}`);
            } catch (error) {
                console.error(`[tutorial-step] FAILED: ${stepDescriptor}${stepInfo.testStepFunction ? ` | hook=${stepInfo.testStepFunction}` : ''}`);
                throw error;
            }

            const isStillActive = await page.evaluate(() => (window as any).TutorialSystem?.activeTut !== null);
            if (!isStillActive) {
                await expect(page.locator('#tutorialInfoPopUp')).toHaveCount(0);
                console.log(`[tutorial] completed: ${tutorialName}`);
                return;
            }
        }

        throw new Error(`Tutorial '${tutorialName}' did not complete within ${maxSteps} steps.`);
    }

    private static async runTutorialCustomStep(page: Page, testStepFunction: string): Promise<void> {
        const [command, arg1, arg2] = testStepFunction.split(':');

        if (command === 'centerGraph') {
            await TestHelpers.centerGraphOnCanvas(page);
            return;
        }

        if (command === 'openCanvasContextMenu') {
            const menuLocator = page.locator('#customContextMenu .searchBarContainer');

            if (await menuLocator.count() > 0) {
                return;
            }

            const canvas = page.locator('#logicalGraphParent').first();
            await canvas.waitFor({ state: 'visible', timeout: 5000 });

            // Right-click around viewport center with pseudo-random offsets and no immediate repeats.
            const viewport = page.viewportSize();
            const size = viewport ?? { width: 1280, height: 720 };

            const seed = TestHelpers.contextMenuAnchorIndex;
            TestHelpers.contextMenuAnchorIndex += 1;

            const angleDeg = (seed * 137.508) % 360;
            const angle = angleDeg * (Math.PI / 180);
            const radius = 80 + ((seed * 31) % 70);

            let x = Math.max(80, Math.min(size.width - 80, Math.floor(size.width / 2 + Math.cos(angle) * radius)));
            let y = Math.max(80, Math.min(size.height - 120, Math.floor(size.height / 2 + Math.sin(angle) * radius)));

            if (TestHelpers.lastContextMenuPoint && TestHelpers.lastContextMenuPoint.x === x && TestHelpers.lastContextMenuPoint.y === y) {
                x = Math.max(80, Math.min(size.width - 80, x + 35));
                y = Math.max(80, Math.min(size.height - 120, y + 20));
            }
            TestHelpers.lastContextMenuPoint = { x, y };

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

            await menuLocator.waitFor({ state: 'attached', timeout: 5000 });
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

            await TestHelpers.selectNodeByInterface(page, arg1);
            return;
        }

        if (command === 'connectNodes') {
            if (!arg1 || !arg2) {
                throw new Error(`Missing source/destination node names in test step function '${testStepFunction}'`);
            }

            await TestHelpers.connectNodesByName(page, arg1, arg2);
            return;
        }

        throw new Error(`Unknown tutorial test step function '${testStepFunction}'`);
    }

    private static async centerGraphOnCanvas(page: Page): Promise<void> {
        // Shortcut from KeyboardShortcut.ts: center_graph => key "c"
        await page.press('body', 'c');
    }

    private static getTutorialInputText(title: string, expectedInput: string): string {
        if (expectedInput && expectedInput.trim().length > 0) {
            return expectedInput;
        }

        // Some tutorial steps ask for a description but don't provide expectedInput.
        if (/description/i.test(title)) {
            return 'Automated tutorial description.';
        }

        return '';
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

    private static async selectNodeByInterface(page: Page, nodeName: string): Promise<void> {
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
                }, nodeName, { timeout: 1000 });
                return true;
            } catch {
                return false;
            }
        };

        if (await isRequestedNodeSelected()) {
            return;
        }

        // Attempt -2: resolve node by name in logicalGraph and click its rendered body on canvas.
        // This is the most direct Playwright path when we know the exact node name.
        const nodeBodySelector = await page.evaluate((name: string) => {
            const nodeId = (window as any).eagle?.logicalGraph?.()?.findNodeIdByNodeName?.(name);
            if (!nodeId) {
                return null;
            }

            return [
                `#logicalGraphParent .node[id="${nodeId}"] .body`,
                `#logicalGraph .node[id="${nodeId}"] .body`
            ];
        }, nodeName);

        if (nodeBodySelector) {
            for (const selector of nodeBodySelector) {
                const nodeBody = page.locator(selector).first();
                if (await nodeBody.count() > 0) {
                    await nodeBody.click({ force: true, timeout: 3000 });
                    if (await waitForRequestedSelection()) {
                        return;
                    }
                }
            }
        }

        // Attempt -1: extract ID from tutorial target and search for matching nodes on canvas.
        // Useful when the tutorial system knows which element to target but we need to verify it's rendered.
        const tutorialTargetSelector = await page.evaluate(() => {
            const tutorialTarget = (window as any).TutorialSystem?.activeTutCurrentStep?.getTargetFunc?.();
            if (!tutorialTarget || tutorialTarget.length === 0) {
                return null;
            }

            const targetEl = tutorialTarget.get(0) as HTMLElement;
            const targetId = targetEl.getAttribute('id');
            if (!targetId) {
                return null;
            }

            return {
                nodeBodySelectors: [
                    `#logicalGraphParent .node[id="${targetId}"] .body`,
                    `#logicalGraph .node[id="${targetId}"] .body`
                ],
                nodeSelectors: [
                    `#logicalGraphParent .node[id="${targetId}"]`,
                    `#logicalGraph .node[id="${targetId}"]`
                ],
                containerSelectors: [
                    `#logicalGraphParent [id="${targetId}"].container`,
                    `#logicalGraph [id="${targetId}"].container`
                ],
            };
        });

        if (tutorialTargetSelector) {
            for (const selector of tutorialTargetSelector.nodeBodySelectors) {
                const bodyLocator = page.locator(selector).first();
                if (await bodyLocator.count() > 0) {
                    await bodyLocator.click({ force: true, timeout: 3000 });
                    if (await waitForRequestedSelection()) {
                        return;
                    }
                }
            }

            for (const selector of tutorialTargetSelector.nodeSelectors) {
                const nodeLocator = page.locator(selector).first();
                if (await nodeLocator.count() > 0) {
                    await nodeLocator.click({ force: true, timeout: 3000 });
                    if (await waitForRequestedSelection()) {
                        return;
                    }
                }
            }

            for (const selector of tutorialTargetSelector.containerSelectors) {
                const containerLocator = page.locator(selector).first();
                if (await containerLocator.count() > 0) {
                    await containerLocator.click({ force: true, timeout: 3000 });
                    if (await waitForRequestedSelection()) {
                        return;
                    }
                }
            }
        }

        // Attempt 0: click tutorial target directly via viewport coordinates (Playwright mouse).
        // User-like interaction: resolves the element and clicks its center point.
        const targetClickPos = await page.evaluate(() => {
            const tutorialTarget = (window as any).TutorialSystem?.activeTutCurrentStep?.getTargetFunc?.();
            if (!tutorialTarget || tutorialTarget.length === 0) {
                return null;
            }

            const targetEl = tutorialTarget.get(0) as HTMLElement;
            const clickable = (targetEl.querySelector('.body') as HTMLElement | null) || targetEl;
            const rect = clickable.getBoundingClientRect();

            if (rect.width <= 0 || rect.height <= 0) {
                return null;
            }

            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            };
        });

        if (targetClickPos) {
            await page.mouse.click(targetClickPos.x, targetClickPos.y);
            if (await waitForRequestedSelection()) {
                return;
            }
        }

        // Attempt 1: find graph node labels matching the requested name and click them.
        // Fallback for when node selection target isn't directly available but labels are visible.
        const labelClickPos = await page.evaluate((name: string) => {
            const candidateSelectors = [
                '#logicalGraphParent .node p',
                '#logicalGraph .node p',
                '.node p',
            ];

            for (const selector of candidateSelectors) {
                const labels = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
                const label = labels.find((el) => (el.textContent || '').trim() === name);

                if (!label) {
                    continue;
                }

                const body = label.closest('.body') as HTMLElement | null;
                const target = body || label;
                const rect = target.getBoundingClientRect();

                if (rect.width > 0 && rect.height > 0) {
                    return {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                    };
                }
            }

            return null;
        }, nodeName);

        if (labelClickPos) {
            await page.mouse.click(labelClickPos.x, labelClickPos.y);
            if (await waitForRequestedSelection()) {
                return;
            }
        }

        // Attempt 2: use Playwright's text locator to find and click matching text (Playwright native).
        // Helpful when the node name appears as readable text in the UI.
        const textLocator = page.getByText(nodeName, { exact: true }).first();
        if (await textLocator.count() > 0) {
            await textLocator.click({ force: true, timeout: 3000 });
            if (await waitForRequestedSelection()) {
                return;
            }
        }

        // Attempt 3: navigate to Hierarchy panel and select the node via the UI.
        // Most reliable fallback: uses the app's own selection handler, avoids canvas hit-testing issues.
        const hierarchyTab = page.getByRole('button', { name: 'Hierarchy' }).first();
        if (await hierarchyTab.count() > 0) {
            await hierarchyTab.click({ force: true, timeout: 3000 });

            const hierarchyNode = page.locator(`.hierarchyNode:has-text("${nodeName}")`).first();
            if (await hierarchyNode.count() > 0) {
                const graphNodeSelector = await hierarchyNode.evaluate((el) => {
                    const hierarchyId = el.getAttribute('id');
                    if (!hierarchyId || !hierarchyId.startsWith('hierarchy-node-')) {
                        return null;
                    }

                    const graphNodeId = hierarchyId.replace('hierarchy-node-', '');
                    return `#logicalGraph .node[id="${graphNodeId}"] .body`;
                });

                if (graphNodeSelector) {
                    const graphNodeBody = page.locator(graphNodeSelector).first();
                    if (await graphNodeBody.count() > 0) {
                        await graphNodeBody.click({ force: true, timeout: 3000 });
                        if (await waitForRequestedSelection()) {
                            return;
                        }
                    }
                }
            }
        }

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

    private static async connectNodesByName(page: Page, sourceNodeName: string, destinationNodeName: string): Promise<void> {
        const sourceCandidates = [
            `#${sourceNodeName} .outputPort`,
            `#portContainer .${sourceNodeName} .outputPort`,
        ];
        const destinationCandidates = [
            `#${destinationNodeName} .inputPort`,
            `#portContainer .${destinationNodeName} .inputPort`,
        ];

        let sourcePort: string | null = null;
        let destinationPort: string | null = null;

        for (const selector of sourceCandidates) {
            if (await page.locator(selector).count() > 0) {
                sourcePort = selector;
                break;
            }
        }

        for (const selector of destinationCandidates) {
            if (await page.locator(selector).count() > 0) {
                destinationPort = selector;
                break;
            }
        }

        if (!sourcePort || !destinationPort) {
            throw new Error(`Could not find source '${sourceNodeName}' or destination '${destinationNodeName}' ports via interface selectors.`);
        }

        await page.locator(sourcePort).first().waitFor({ state: 'visible', timeout: 10000 });
        await page.locator(destinationPort).first().waitFor({ state: 'visible', timeout: 10000 });
        await page.dragAndDrop(sourcePort, destinationPort, { timeout: 10000 });
    }

    static async createNewGraph(page: Page): Promise<void> {
        // click 'New Graph' from the 'File' menu
        await page.locator('#navbarDropdownGraph').click();
        await page.locator('#navbarDropdownGraphNew').hover();
        await page.locator('#createNewGraph').click();
        await page.waitForTimeout(500);

        // agree to create a new graph with it's auto-generated name
        await page.getByRole('button', { name: 'OK' }).click();
        await page.waitForTimeout(500);

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
        await page.waitForTimeout(500);

        // set the content of the editor in the modal
        await page.evaluate(TestHelpers.setEditorContent, s);
        await page.waitForTimeout(500);

        // click 'OK' to save the graph
        await page.locator('#inputCodeModal .modal-footer button.btn-primary').click();
        await page.waitForTimeout(500);

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
        await page.waitForTimeout(500);

        // set the content of the editor in the modal
        await page.evaluate(TestHelpers.setEditorContent, s);
        await page.waitForTimeout(500);

        // click 'OK' to save the graph
        await page.locator('#inputCodeModal .modal-footer button.btn-primary').click();
        await page.waitForTimeout(500);

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
    static async setSchemaVersion(page: Page, format: 'OJS' | 'V4') {
        await page.locator('#settings').click();
        await page.waitForTimeout(500);
        await page.locator('#settingCategoryDeveloper').click();
        await page.locator('#settingDaliugeSchemaVersionValue').selectOption({value: format});
        await page.locator('#settingsModalAffirmativeAnswer').click();
        await page.waitForTimeout(500);
    }

    static async getNodeCount(page: Page): Promise<number> {
        return await page.evaluate( () => {
            return (window as any).eagle.logicalGraph().nodes().size;
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
}