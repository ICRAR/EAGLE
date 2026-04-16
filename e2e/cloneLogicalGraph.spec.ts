import { test, expect } from '@playwright/test';
import { TestHelpers } from './TestHelpers';
import { Eagle } from '../src/Eagle';
import { Node } from '../src/Node';
import { Field } from '../src/Field';
import { Edge } from '../src/Edge';

test('LogicalGraph.clone() does not share references with original', async ({ page }) => {
    await page.goto('http://localhost:8888/?tutorial=none');
    await expect(page).toHaveTitle(/EAGLE/);

    // set Expert mode to access all features
    await TestHelpers.setUIMode(page, "Expert");

    // expand the Builtin Components palette
    await page.locator('#palette0').click();
    await page.waitForTimeout(250);

    // add a HelloWorldApp node
    await page.locator('#addPaletteNodeHelloWorldApp').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'OK' }).click();

    // add a File node
    await page.locator('#palette_0_File').scrollIntoViewIfNeeded();
    await page.locator('#addPaletteNodeFile').click();
    await page.waitForTimeout(500);

    // center the graph
    await page.getByRole('button', { name: 'filter_center_focus' }).click();
    await page.waitForTimeout(200);

    // draw an edge from HelloWorldApp output to File input
    await page.dragAndDrop('#HelloWorldApp .outputPort', '#File .inputPort', {
        sourcePosition: { x: 2, y: 2 },
        targetPosition: { x: 2, y: 2 }
    });
    await page.waitForTimeout(500);

    // verify we have nodes and edges to clone
    const preCheck = await page.evaluate(() => {
        const eagle = Eagle.getInstance();
        const lg = eagle.logicalGraph();
        return {
            numNodes: lg.getNumNodes(),
            numEdges: lg.getNumEdges()
        };
    });
    expect(preCheck.numNodes).toBeGreaterThanOrEqual(2);
    expect(preCheck.numEdges).toBeGreaterThanOrEqual(1);

    // clone the graph and verify no shared references
    const result = await page.evaluate(() => {
        const eagle = Eagle.getInstance();
        const original = eagle.logicalGraph();
        const cloned = original.clone();

        const issues: string[] = [];

        // check that cloned graph has the same number of nodes and edges
        if (original.getNumNodes() !== cloned.getNumNodes()) {
            issues.push(`Node count mismatch: original=${original.getNumNodes()}, cloned=${cloned.getNumNodes()}`);
        }
        if (original.getNumEdges() !== cloned.getNumEdges()) {
            issues.push(`Edge count mismatch: original=${original.getNumEdges()}, cloned=${cloned.getNumEdges()}`);
        }

        // collect original node and port object references
        const originalNodeRefs = new Set<Node>();
        const originalPortRefs = new Set<Field>();
        for (const node of original.getNodes()) {
            originalNodeRefs.add(node);
            for (const field of node.getFields()) {
                originalPortRefs.add(field);
            }
        }

        // check cloned nodes are not the same objects as original nodes
        for (const clonedNode of cloned.getNodes()) {
            if (originalNodeRefs.has(clonedNode)) {
                issues.push(`Cloned node "${clonedNode.getName()}" is same object reference as original`);
            }
            // check cloned fields are not the same objects as original fields
            for (const clonedField of clonedNode.getFields()) {
                if (originalPortRefs.has(clonedField)) {
                    issues.push(`Cloned port "${clonedField.getDisplayText()}" on node "${clonedNode.getName()}" is same object reference as original`);
                }
            }
        }

        // collect original edge object references
        const originalEdgeRefs = new Set<Edge>();
        for (const edge of original.getEdges()) {
            originalEdgeRefs.add(edge);
        }

        // check cloned edges are not the same objects and their node/port refs point into the cloned graph
        for (const clonedEdge of cloned.getEdges()) {
            if (originalEdgeRefs.has(clonedEdge)) {
                issues.push(`Cloned edge "${clonedEdge.getId()}" is same object reference as original`);
            }

            // edge's srcNode should be in the cloned graph, not the original
            const srcNode = clonedEdge.getSrcNode();
            if (originalNodeRefs.has(srcNode)) {
                issues.push(`Cloned edge "${clonedEdge.getId()}" srcNode references original graph's node`);
            }
            const destNode = clonedEdge.getDestNode();
            if (originalNodeRefs.has(destNode)) {
                issues.push(`Cloned edge "${clonedEdge.getId()}" destNode references original graph's node`);
            }

            // edge's srcPort should be in the cloned graph, not the original
            const srcPort = clonedEdge.getSrcPort();
            if (originalPortRefs.has(srcPort)) {
                issues.push(`Cloned edge "${clonedEdge.getId()}" srcPort references original graph's port`);
            }
            const destPort = clonedEdge.getDestPort();
            if (originalPortRefs.has(destPort)) {
                issues.push(`Cloned edge "${clonedEdge.getId()}" destPort references original graph's port`);
            }
        }

        // verify that cloning did not add duplicate edge refs to original graph's ports
        for (const node of original.getNodes()) {
            for (const field of node.getFields()) {
                const edgeIds: string[] = [];
                for (const edge of field.getEdges()) {
                    edgeIds.push(edge.getId());
                }
                const uniqueIds = new Set(edgeIds);
                if (edgeIds.length !== uniqueIds.size) {
                    issues.push(`Original port "${field.getDisplayText()}" on node "${node.getName()}" has duplicate edge references after clone`);
                }
            }
        }

        return { issues };
    });

    // all checks should pass with no issues
    expect(result.issues).toEqual([]);

    await page.close();
});
