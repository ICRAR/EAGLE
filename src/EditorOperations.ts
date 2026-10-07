import type * as ko from "knockout";
import { CategoryName, CategoryType } from "./Category";
import type { CategoryData } from "./CategoryData";
import { DataType, Daliuge, FieldName, FieldUsage } from "./Daliuge";
import { EagleConfig } from "./EagleConfig";
import { Edge } from "./Edge";
import type { Eagle } from "./Eagle";
import { EagleAddNodeMode, EagleFileType } from "./EagleEnums";
import { Errors, type ErrorsWarnings } from "./Errors";
import { Field } from "./Field";
import { GraphRenderer } from "./GraphRenderer";
import { Id } from "./Id";
import { Node } from "./Node";
import { Palette } from "./Palette";
import { RightClick } from "./RightClick";
import { Setting } from "./Setting";
import { Utils } from "./Utils";
import { Visual, type VisualType } from "./Visual";

type EditorState = {
    selectedLocation: ko.Observable<EagleFileType>;
    selectedRightClickLocation: ko.Observable<EagleFileType>;
    selectedRightClickObject: ko.Observable<Node | Edge | Visual | null>;
    getSelectedRightClickPosition: () => {x: number, y: number};
    getNodeDropLocation: () => {x: number, y: number};
    setNodeDropLocation: (position: {x: number, y: number}) => void;
    getNodeDragInfo: () => {paletteIndex: number | null, componentId: NodeId | null};
};

export class EditorOperations {
    private eagle: Eagle;
    private state: EditorState;

    constructor(eagle: Eagle, state: EditorState) {
        this.eagle = eagle;
        this.state = state;
    }

    editSelection = (selection: Node | Edge | Visual, selectedLocation: EagleFileType): void => {
        if (selectedLocation !== this.state.selectedLocation() && this.eagle.selectedObjects().length > 0) {
            Utils.showNotification("Selection Error", "Can't add object from " + selectedLocation + " to existing selected objects in " + this.state.selectedLocation(), "warning");
            return;
        } else {
            this.state.selectedLocation(selectedLocation);
        }

        let alreadySelected = false;
        let index = -1;
        for (let i = 0; i < this.eagle.selectedObjects().length; i++) {
            if (selection === this.eagle.selectedObjects()[i]) {
                alreadySelected = true;
                index = i;
                break;
            }
        }

        if (alreadySelected) {
            this.eagle.selectedObjects.splice(index, 1);
        } else {
            this.eagle.selectedObjects.push(selection);
        }

        if (selection instanceof Edge) {
            GraphRenderer.setPortPeekForEdge(selection, !alreadySelected);
        }
    }

    duplicateSelection = async (mode: "normal" | "contextMenuRequest"): Promise<void> => {
        const eagle = this.eagle;
        if (mode === 'normal' && eagle.selectedObjects().length === 0) {
            Utils.showNotification('Unable to duplicate selection', 'No nodes are selected', 'warning');
            return;
        }

        let location: EagleFileType;
        let incomingNodes: (Node | Edge | Visual)[] = [];

        if (mode === 'normal') {
            location = this.state.selectedLocation();
            incomingNodes = eagle.selectedObjects();
        } else {
            location = this.state.selectedRightClickLocation();
            const selectedRightClickObject = this.state.selectedRightClickObject();
            if (selectedRightClickObject === null) {
                Utils.showNotification('Unable to duplicate selection', 'No node or edge was right-clicked', 'warning');
                return;
            }
            incomingNodes.push(selectedRightClickObject);
        }

        switch (location) {
            case EagleFileType.Graph: {
                if (!Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false)) {
                    Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "Duplicate Selection");
                    return;
                }

                const nodes: Node[] = [];
                const edges: Edge[] = [];
                const visuals: Visual[] = [];
                const errorsWarnings: ErrorsWarnings = {"errors": [], "warnings": []};

                for (const object of incomingNodes) {
                    if (object instanceof Node) {
                        nodes.push(object);
                    }
                    if (object instanceof Edge) {
                        edges.push(object);
                    }
                    if (object instanceof Visual) {
                        visuals.push(object);
                    }
                }

                const nodesToDuplicate = this._removeAlreadySelectedEmbeddedNodes(nodes);
                await eagle.insertGraph(nodesToDuplicate, edges, null, errorsWarnings);
                for (const visual of visuals) {
                    const visualClone = visual.clone();
                    visualClone.changePosition(visualClone.getWidth() / 4, visualClone.getHeight() / 4);
                    eagle.logicalGraph().addVisual(visualClone);
                }

                eagle.checkEagle();
                eagle.undo().pushSnapshot(eagle, "Duplicate selection");
                eagle.logicalGraph.valueHasMutated();
                break;
            }
            case EagleFileType.Palette: {
                if (!Setting.findValue<boolean>(Setting.ALLOW_PALETTE_EDITING, false)) {
                    Utils.showNotification("Unable to Duplicate Selection", "Palette Editing is disabled", "danger");
                    return;
                }

                const nodes: Node[] = [];
                for (const object of incomingNodes) {
                    if (object instanceof Node) {
                        nodes.push(object);
                    }
                }
                eagle.addNodesToPalette(nodes);
                break;
            }
            default:
                console.error("Unknown selectedLocation", this.state.selectedLocation());
                break;
        }
    }

    copySelectionToClipboard = (copyChildren: boolean): void => {
        const eagle = this.eagle;
        console.log("copySelectionToClipboard()");

        const nodes: Node[] = [];
        const edges: Edge[] = [];
        for (const object of eagle.selectedObjects()) {
            if (object instanceof Node) {
                if (copyChildren) {
                    this._addNodeAndChildren(object, nodes);
                } else {
                    this._addUniqueNode(nodes, object);
                }
            }
            if (object instanceof Edge) {
                edges.push(object);
            }
        }

        const nodesToCopy = this._removeAlreadySelectedEmbeddedNodes(nodes);
        if (copyChildren) {
            for (const edge of eagle.logicalGraph().getEdges()) {
                for (const node of nodes) {
                    if (node.getId() === edge.getSrcNode().getId() || node.getId() === edge.getDestNode().getId()) {
                        this._addUniqueEdge(edges, edge);
                    }
                }
            }
        }

        const serialisedNodes = [];
        for (const node of nodesToCopy) {
            serialisedNodes.push(Node.toOJSGraphJson(node));
        }
        const serialisedEdges = [];
        for (const edge of edges) {
            serialisedEdges.push(Edge.toOJSJson(edge));
        }

        const clipboard = {nodes: serialisedNodes, edges: serialisedEdges};
        navigator.clipboard.writeText(JSON.stringify(clipboard, null, EagleConfig.JSON_INDENT)).then(
            () => Utils.showNotification("Copied to clipboard", "Copied " + clipboard.nodes.length + " nodes and " + clipboard.edges.length + " edges.", "info"),
            () => Utils.showNotification("Unable to copy to clipboard", "Your browser does not allow access to the clipboard for security reasons", "danger")
        );
    }

    _removeAlreadySelectedEmbeddedNodes = (nodes: Node[]): Node[] => {
        const newNodes: Node[] = [];
        for (const node of nodes) {
            const nodeEmbed = node.getEmbed();
            if (nodeEmbed !== null && this.eagle.objectIsSelected(nodeEmbed)) {
                continue;
            }
            newNodes.push(node);
        }
        return newNodes;
    }

    _addNodeAndChildren = (node: Node, output: Node[]): void => {
        this._addUniqueNode(output, node);
        for (const child of node.getChildren()) {
            this._addNodeAndChildren(child, output);
        }
    }

    _addUniqueNode = (nodes: Node[], newNode: Node): void => {
        for (const node of nodes) {
            if (node.getId() === newNode.getId()) {
                return;
            }
        }
        nodes.push(newNode);
    }

    _addUniqueEdge = (edges: Edge[], newEdge: Edge): void => {
        for (const edge of edges) {
            if (edge.getId() === newEdge.getId()) {
                return;
            }
        }
        edges.push(newEdge);
    }

    pasteFromClipboard = async (): Promise<void> => {
        const eagle = this.eagle;
        console.log("pasteFromClipboard()");

        if (!Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false)) {
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "Paste from Clipboard");
            return;
        }

        if (typeof navigator.clipboard.readText === "undefined") {
            Utils.showNotification("Unable to paste data", "Your browser does not allow access to the clipboard for security reasons. Workaround this issue using the 'Graph > New > Add to Graph from JSON' menu item and pasting your clipboard manually", "danger");
            return;
        }

        let clipboard = null;
        try {
            clipboard = JSON.parse(await navigator.clipboard.readText());
        } catch (e) {
            const errorName = e instanceof Error ? e.name : "Unknown";
            const errorMessage = e instanceof Error ? e.message : String(e);
            Utils.showNotification("Unable to paste data", errorName + ": " + errorMessage, "danger");
            return;
        }

        const errorsWarnings: ErrorsWarnings = {"errors": [], "warnings": []};
        const nodes: Node[] = [];
        const edges: Edge[] = [];
        for (const n of clipboard.nodes) {
            nodes.push(Node.fromOJSJson(n, errorsWarnings, false));
        }
        for (const e of clipboard.edges) {
            const edge = Edge.fromOJSJson(e, nodes, errorsWarnings);
            if (edge !== null) {
                edges.push(edge);
            }
        }

        for (const n of clipboard.nodes) {
            const nodeId = Node.determineNodeId(n);
            const parentId = Node.determineNodeParentId(n);
            const node = nodes.find((candidate) => candidate.getId() === nodeId);
            const parentNode = nodes.find((candidate) => candidate.getId() === parentId);
            if (node === undefined) {
                console.warn("pasteFromClipboard(): node with id", nodeId, "not found in clipboard nodes");
                continue;
            }
            if (parentNode !== undefined) {
                node.setParent(parentNode);
            }
        }

        await eagle.insertGraph(nodes, edges, null, errorsWarnings);
        if (!Errors.hasErrors(errorsWarnings) && !Errors.hasWarnings(errorsWarnings)) {
            Utils.showNotification("Pasted from clipboard", "Pasted " + clipboard.nodes.length + " nodes and " + clipboard.edges.length + " edges.", "info");
        }

        eagle.checkEagle();
        eagle.undo().pushSnapshot(eagle, "Paste from Clipboard");
        eagle.logicalGraph.valueHasMutated();
    }

    tableDropdownClick = (newType: DataType, field: Field): void => {
        if (newType === DataType.Select && field.getOptions().length === 0) {
            const value = field.getValue();
            const defaultValue = field.getDefaultValue();
            if (value !== null) {
                field.addOption(value);
            }
            if (defaultValue !== null) {
                field.addOption(defaultValue);
            }
        }

        field.setType(newType);
        this.eagle.checkEagle();
    }

    editField = async (field: Field): Promise<void> => {
        const eagle = this.eagle;
        if (field === null || typeof field === 'undefined') {
            console.error("No field to edit");
            return;
        }

        const allFields: Field[] = Utils.getUniqueFieldsOfType(eagle.logicalGraph(), field.getParameterType());
        const allFieldNames: string[] = [];
        allFields.sort(Field.sortFunc);
        for (const currentField of allFields) {
            allFieldNames.push(currentField.getDisplayText() + " (" + currentField.getType() + ")");
        }

        const selectedNode = eagle.selectedNode();
        if (selectedNode === null) {
            console.error("No node selected while trying to edit field");
            return;
        }

        const title = selectedNode.getName() + " - " + field.getDisplayText() + " : " + Field.getHtmlTitleText(field.getParameterType(), field.getUsage());
        try {
            await Utils.requestUserEditField(eagle, field, title, allFieldNames);
        } catch (error) {
            console.error(error);
            return;
        }

        eagle.checkEagle();
        eagle.undo().pushSnapshot(eagle, "Edit Field");
        Utils.showField(eagle, this.state.selectedLocation(), field.getNode(), field);
    }

    nodeDropLogicalGraph = (_eagle: Eagle, event: JQuery.TriggeredEvent): void => {
        const eagle = this.eagle;
        const e = event.originalEvent as DragEvent;
        if (e.dataTransfer?.files.length) {
            e.preventDefault();
            eagle.loadDroppedFile(e.dataTransfer.files[0]);
            return;
        }

        this.state.setNodeDropLocation({x: GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(e.pageX), y: GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(e.pageY)});
        const sourceComponents: Node[] = [];
        const {paletteIndex, componentId} = this.state.getNodeDragInfo();
        if (paletteIndex === null || componentId === null) {
            return;
        }

        const selectedLocation = this.state.selectedLocation();
        if (selectedLocation === EagleFileType.Graph || selectedLocation === EagleFileType.Unknown) {
            const component = eagle.palettes()[paletteIndex].getNodeById(componentId);
            if (typeof component === 'undefined') {
                console.error("Unable to find dragged component in palette");
                return;
            }
            sourceComponents.push(component);
        }

        if (selectedLocation === EagleFileType.Palette) {
            for (const object of eagle.selectedObjects()) {
                if (object instanceof Node) {
                    sourceComponents.push(object);
                }
            }
        }

        for (const sourceComponent of sourceComponents) {
            eagle.addNodeToLogicalGraph(sourceComponent, null, EagleAddNodeMode.Default);
            const dropLocation = this.state.getNodeDropLocation();
            this.state.setNodeDropLocation({x: dropLocation.x + EagleConfig.DUPLICATE_OFFSET, y: dropLocation.y + EagleConfig.DUPLICATE_OFFSET});
        }

        this.state.setNodeDropLocation({x: 0, y: 0});
    }

    nodeDropPalette = (_eagle: Eagle, event: JQuery.TriggeredEvent): void => {
        const eagle = this.eagle;
        const sourceComponents: Node[] = [];
        const e = event.originalEvent as DragEvent;
        if (e.dataTransfer?.files.length) {
            e.preventDefault();
            eagle.loadDroppedFile(e.dataTransfer.files[0]);
            return;
        }

        const {paletteIndex, componentId} = this.state.getNodeDragInfo();
        if (paletteIndex === null || componentId === null) {
            return;
        }

        const selectedLocation = this.state.selectedLocation();
        if (selectedLocation === EagleFileType.Graph || selectedLocation === EagleFileType.Unknown) {
            const component = eagle.palettes()[paletteIndex].getNodeById(componentId);
            if (typeof component === 'undefined') {
                console.error("Unable to find dragged component in palette");
                return;
            }
            sourceComponents.push(component);
        }

        if (selectedLocation === EagleFileType.Palette) {
            for (const object of eagle.selectedObjects()) {
                if (object instanceof Node) {
                    sourceComponents.push(object);
                }
            }
        }

        const target = e.currentTarget as HTMLElement;
        const targetPaletteIndexData = target.getAttribute('data-palette-index');
        if (targetPaletteIndexData === null) {
            console.error("Unable to determine destination palette index from drop target");
            return;
        }
        const destinationPalette: Palette = eagle.palettes()[parseInt(targetPaletteIndexData, 10)];
        const allowReadonlyPaletteEditing = Setting.findValue<boolean>(Setting.ALLOW_READONLY_PALETTE_EDITING, false);
        if (destinationPalette.fileInfo().readonly && !allowReadonlyPaletteEditing) {
            Utils.showUserMessage("Error", "Unable to copy component(s) to readonly palette.");
            return;
        }

        for (const sourceComponent of sourceComponents) {
            if (destinationPalette.findNodeById(sourceComponent.getId()) !== null) {
                Utils.showUserMessage("Error", "Palette already contains an identical component.");
                return;
            }
            destinationPalette.addNode(sourceComponent, true);
            destinationPalette.fileInfo().modified = true;
        }
    }

    paletteComponentClick = (node: Node, event: JQuery.TriggeredEvent): void => {
        const e = event.originalEvent as PointerEvent;
        if (e && e.shiftKey) {
            this.editSelection(node, EagleFileType.Palette);
        } else {
            this.eagle.setSelection(node, EagleFileType.Palette);
        }
    }

    addVisualToLogicalGraph = async (type: VisualType, mode: EagleAddNodeMode): Promise<Visual> => {
        const eagle = this.eagle;
        return new Promise(async (resolve, reject) => {
            let pos = {x: 0, y: 0};
            if (!Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false)) {
                reject("Unable to Add Component. Graph Editing is disabled");
                return;
            }

            const newVisual = new Visual(type, '');
            if (mode === EagleAddNodeMode.ContextMenu) {
                pos = this.state.getSelectedRightClickPosition();
                RightClick.closeCustomContextMenu(true);
            }

            if (pos.x === 0 && pos.y === 0) {
                const dropLocation = this.state.getNodeDropLocation();
                if (dropLocation.x === 0 && dropLocation.y === 0) {
                    const position = this.getNewNodePosition(newVisual.getWidth());
                    pos = {x: position.x, y: position.y};
                } else {
                    pos = dropLocation;
                }
            }

            newVisual.setPosition(pos.x, pos.y);
            const addedVisual = await this.addVisual(newVisual);
            eagle.setSelection(addedVisual, EagleFileType.Graph);
            eagle.logicalGraph.valueHasMutated();
            resolve(addedVisual);
        });
    }

    addVisual = async (visual: Visual): Promise<Visual> => {
        const eagle = this.eagle;
        return new Promise(async (resolve, reject) => {
            if (!Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false)) {
                reject("Unable to Add Visual: Graph Editing is disabled");
                return;
            }

            try {
                await Utils.ensureGraphIsInitialized(eagle.logicalGraph());
            } catch (error) {
                console.warn(error);
                reject(error);
                return;
            }

            eagle.logicalGraph().addVisual(visual);
            eagle.checkEagle();
            eagle.undo().pushSnapshot(eagle, "Add Visual");
            eagle.logicalGraph().fileInfo().modified = true;
            eagle.logicalGraph.valueHasMutated();
            resolve(visual);
        });
    }

    getNewNodePosition = (radius: number): {x: number, y: number, extended: boolean} => {
        const eagle = this.eagle;
        const MARGIN = 100;
        const navBarHeight = 84;
        let suitablePositionFound = false;
        let numIterations = 0;
        let increaseSearchArea = false;
        const MAX_ITERATIONS_NARROW_SEARCH = 80;
        const MAX_ITERATIONS_WIDE_SEARCH = 150;
        const SEARCH_AREA_INCREASE = 300;
        let x = 0;
        let y = 0;

        while (!suitablePositionFound && numIterations <= MAX_ITERATIONS_WIDE_SEARCH) {
            const leftWindowVisible = Setting.findValue<boolean>(Setting.LEFT_WINDOW_VISIBLE, false);
            const rightWindowVisible = Setting.findValue<boolean>(Setting.RIGHT_WINDOW_VISIBLE, false);
            const bottomWindowVisible = Setting.findValue<boolean>(Setting.BOTTOM_WINDOW_VISIBLE, false);
            const logicalGraphParentWidth = Utils.getUIValue('#logicalGraphParent', 'width', 0);
            const logicalGraphParentHeight = Utils.getUIValue('#logicalGraphParent', 'height', 0);
            const bottomWindowHeight = Utils.getUIValue('#bottomWindow', 'height', 0);

            let minX = leftWindowVisible ? eagle.leftWindow().size() + MARGIN : MARGIN;
            let maxX = rightWindowVisible ? logicalGraphParentWidth - eagle.rightWindow().size() - MARGIN : logicalGraphParentWidth - MARGIN;
            let minY = navBarHeight + MARGIN;
            let maxY = logicalGraphParentHeight - MARGIN + navBarHeight;
            if (bottomWindowVisible) {
                maxY = logicalGraphParentHeight - bottomWindowHeight - MARGIN + navBarHeight;
            }

            if (increaseSearchArea) {
                minX -= SEARCH_AREA_INCREASE;
                maxX += SEARCH_AREA_INCREASE;
                minY -= SEARCH_AREA_INCREASE;
                maxY += SEARCH_AREA_INCREASE;
            }

            let randomX: number;
            let randomY: number;
            if (eagle.logicalGraph().getNumNodes() === 0) {
                randomX = minX + (maxX - minX) / 4;
                randomY = minY + (maxY - minY) / 2;
            } else {
                randomX = Math.floor(Math.random() * (maxX - minX + 1) + minX);
                randomY = Math.floor(Math.random() * (maxY - minY + 1) + minY);
            }

            x = GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(randomX);
            y = GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(randomY);
            suitablePositionFound = eagle.logicalGraph().checkForNodeAt(x, y, radius, false) === null;
            numIterations += 1;
            if (numIterations > MAX_ITERATIONS_NARROW_SEARCH) {
                increaseSearchArea = true;
            }
        }

        if (numIterations > MAX_ITERATIONS_WIDE_SEARCH) {
            console.warn("Tried to find suitable position for new node", numIterations, "times and failed, using the last try by default.");
        }

        return {x, y, extended: increaseSearchArea};
    }

    createSubgraphFromSelection = (): void => {
        const eagle = this.eagle;
        if (eagle.selectedObjects().length === 0) {
            Utils.showNotification('Error', 'At least one node must be selected!', 'warning');
            return;
        }

        if (!Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false)) {
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "Create Subgraph From Selection");
            return;
        }

        let parentNode: Node;
        const paletteComponent = Utils.getPaletteComponentByName(CategoryName.SubGraph);
        if (typeof paletteComponent !== 'undefined') {
            parentNode = paletteComponent.clone();
        } else {
            parentNode = new Node(CategoryName.SubGraph, "", "", CategoryName.SubGraph);
        }

        eagle.logicalGraph().addNodeComplete(parentNode);

        for (const node of eagle.selectedObjects()) {
            if (!(node instanceof Node)) {
                continue;
            }

            const nodeParent = node.getParent();
            if (nodeParent !== null && eagle.objectIsSelected(nodeParent)) {
                continue;
            }

            node.setParent(parentNode);
        }

        GraphRenderer.centerConstruct(parentNode, Array.from(eagle.logicalGraph().getNodes()));
        eagle.flagActiveFileModified();
        eagle.checkEagle();
        eagle.undo().pushSnapshot(eagle, "Create Subgraph from Selection");
        eagle.logicalGraph.valueHasMutated();
    }

    createConstructFromSelection = async (): Promise<void> => {
        const eagle = this.eagle;
        if (eagle.selectedObjects().length === 0) {
            Utils.showNotification('Error', 'At least one node must be selected', 'warning');
            return;
        }

        if (!Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false)) {
            Utils.notifyUserOfEditingIssue(EagleFileType.Graph, "Create Construct From Selection");
            return;
        }

        const constructs: string[] = Utils.buildComponentList((cData: ReturnType<typeof CategoryData.getCategoryInfo>) => {
            return cData.categoryType === CategoryType.Construct;
        });
        const userChoice: string = await Utils.requestUserChoice("Choose Construct", "Please choose a construct type to contain the selection", constructs, 0, false, "");

        let parentNode: Node;
        const paletteComponent = Utils.getPaletteComponentByName(userChoice);
        if (typeof paletteComponent !== 'undefined') {
            parentNode = paletteComponent.clone();
        } else {
            parentNode = new Node(userChoice, "", "", userChoice as CategoryName);
        }

        eagle.logicalGraph().addNodeComplete(parentNode);

        for (const node of eagle.selectedObjects()) {
            if (!(node instanceof Node)) {
                continue;
            }

            node.setParent(parentNode);
        }

        GraphRenderer.centerConstruct(parentNode, Array.from(eagle.logicalGraph().getNodes()));
        eagle.flagActiveFileModified();
        eagle.checkEagle();
        eagle.undo().pushSnapshot(eagle, "Add Selection to Construct");
        eagle.logicalGraph.valueHasMutated();
    }

    addEdge = async (srcNode: Node, srcPort: Field, destNode: Node, destPort: Field, loopAware: boolean, closesLoop: boolean, forceAutoRename: boolean = false): Promise<Edge> => {
        const eagle = this.eagle;
        return new Promise(async (resolve, reject) => {
            if (srcNode === null) {
                reject("addEdge(): srcNode is null");
                return;
            }
            if (srcPort === null) {
                reject("addEdge(): srcPort is null");
                return;
            }
            if (destNode === null) {
                reject("addEdge(): destNode is null");
                return;
            }
            if (destPort === null) {
                reject("addEdge(): destPort is null");
                return;
            }

            if (!Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false)) {
                reject("Unable to Add Edge: Graph Editing is disabled");
                return;
            }

            const edgeConnectsTwoApplications: boolean =
                (srcNode.isApplication() || srcNode.isGroup()) &&
                (destNode.isApplication() || destNode.isGroup());
            const twoEventPorts: boolean = srcPort.getIsEvent() && destPort.getIsEvent();

            if (!edgeConnectsTwoApplications || twoEventPorts) {
                const edge: Edge = new Edge('', srcNode, srcPort, destNode, destPort, loopAware, closesLoop, false);
                eagle.logicalGraph().addEdgeComplete(edge);

                if (!Setting.findValue<boolean>(Setting.DISABLE_RENAME_ON_EDGE_CONNECT, false) || forceAutoRename) {
                    if (srcNode.isApplication()) {
                        const newName = srcPort.getDisplayText();
                        const newDescription = srcPort.getDescription();
                        destNode.setName(newName);

                        if (destPort.isChangeable()) {
                            destPort.setDisplayText(newName);
                            destPort.setDescription(newDescription);
                        }
                    } else {
                        const newName = destPort.getDisplayText();
                        const newDescription = destPort.getDescription();
                        srcNode.setName(newName);

                        if (srcPort.isChangeable()) {
                            srcPort.setDisplayText(newName);
                            srcPort.setDescription(newDescription);
                        }
                    }
                }

                setTimeout(() => {
                    eagle.setSelection(edge, EagleFileType.Graph);
                }, EagleConfig.STANDARD_UI_TINY_TIMEOUT);
                resolve(edge);
                return;
            }

            const firstEdge = Utils.addIntermediateDataNodeForAppToAppEdge(eagle.logicalGraph(), srcNode, srcPort, destNode, destPort, loopAware, closesLoop);
            if (firstEdge === null) {
                Utils.showNotification("Add Edge Error", "Unable to find suitable port on intermediary component", "danger");
                reject("Unable to find suitable port on intermediary component");
                return;
            }

            resolve(firstEdge);
        });
    }

    addNode = async (node: Node, x: number, y: number): Promise<Node> => {
        const eagle = this.eagle;
        const newNode: Node = Utils.duplicateNode(node);

        try {
            await Utils.ensureGraphIsInitialized(eagle.logicalGraph());
        } catch (error) {
            console.warn(error);
        }

        newNode.setPosition(x, y);
        eagle.logicalGraph().addNodeComplete(newNode);
        eagle.logicalGraph().fileInfo().modified = true;
        eagle.logicalGraph().fileInfo.valueHasMutated();
        return newNode;
    }

    addNodeToLogicalGraphAndConnect = async (newNodeId: NodeId): Promise<void> => {
        const eagle = this.eagle;
        const nodes: Node[] = await this.addNodeToLogicalGraph(undefined, newNodeId, EagleAddNodeMode.ContextMenu);

        const realSourceNode: Node | null = RightClick.edgeDropSrcNode;
        const realSourcePort: Field | null = RightClick.edgeDropSrcPort;
        const realDestNode: Node = nodes[0];

        if (realSourceNode === null || realSourcePort === null) {
            Utils.showNotification("Error", "Unable to create edge: missing source node or port", "danger");
            return;
        }

        const usages: FieldUsage[] = [RightClick.edgeDropSrcIsInput ? FieldUsage.OutputPort : FieldUsage.InputPort, FieldUsage.InputOutput];
        let realDestPort: Field | null = realDestNode.findPortByMatchingType(realSourcePort.getType(), usages);

        if (realDestPort === null) {
            realDestPort = realDestNode.findPortOfAnyType(true);
        }

        if (realDestNode === null || realDestPort === null) {
            Utils.showNotification("Error", "Unable to create edge: missing destination node or port", "danger");
            return;
        }

        let edge: Edge;
        if (!RightClick.edgeDropSrcIsInput) {
            edge = await this.addEdge(realSourceNode, realSourcePort, realDestNode, realDestPort, false, false, true);
        } else {
            edge = await this.addEdge(realDestNode, realDestPort, realSourceNode, realSourcePort, false, false, true);
        }

        eagle.checkEagle();
        eagle.undo().pushSnapshot(eagle, "Add edge " + edge.getId());
        eagle.logicalGraph().fileInfo().modified = true;
        eagle.logicalGraph.valueHasMutated();
    }

    addNodeToLogicalGraph = (node: Node | undefined, nodeId: NodeId | null, mode: EagleAddNodeMode): Promise<Node[]> => {
        const eagle = this.eagle;
        return new Promise(async (resolve, reject) => {
            const result: Node[] = [];
            let pos: {x: number, y: number} = {x: 0, y: 0};
            let searchAreaExtended = false;

            if (!Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false)) {
                reject("Unable to Add Component. Graph Editing is disabled");
                return;
            }

            if (mode === EagleAddNodeMode.ContextMenu) {
                console.assert(node === null);
                if (nodeId === null) {
                    reject(new Error("nodeId is null"));
                    return;
                }

                node = Utils.getPaletteComponentById(nodeId);
                if (typeof node === 'undefined') {
                    node = eagle.logicalGraph().getNodeById(nodeId);
                    if (typeof node === 'undefined') {
                        reject(new Error("Unable to find node with specified id (" + nodeId + ") in palette(s) or graph."));
                        return;
                    }
                }

                pos = this.state.getSelectedRightClickPosition();
                RightClick.closeCustomContextMenu(true);
            }

            if (typeof node === 'undefined') {
                reject(new Error("Node is undefined"));
                return;
            }

            if (node.isGroup()) {
                node.setRadius(EagleConfig.MINIMUM_CONSTRUCT_RADIUS);
            }

            if (pos.x === 0 && pos.y === 0) {
                const nodeDropLocation = this.state.getNodeDropLocation();
                if (nodeDropLocation.x === 0 && nodeDropLocation.y === 0) {
                    const position = eagle.getNewNodePosition(node.getRadius());
                    searchAreaExtended = position.extended;
                    pos = {x: position.x, y: position.y};
                } else {
                    pos = nodeDropLocation;
                }
            }

            const parent: Node | null = eagle.logicalGraph().checkForNodeAt(pos.x, pos.y, EagleConfig.MINIMUM_CONSTRUCT_RADIUS, true);
            const newNode: Node = await this.addNode(node, pos.x, pos.y);
            result.push(newNode);
            newNode.setParent(parent);

            if (node.isGroup()) {
                const inputApplication = node.getInputApplication();
                const outputApplication = node.getOutputApplication();

                if (inputApplication !== null) {
                    const inputApp: Node = await this.addNode(inputApplication, 0, 0);
                    newNode.setInputApplication(inputApp);
                    result.push(inputApp);
                }
                if (outputApplication !== null) {
                    const outputApp: Node = await this.addNode(outputApplication, 0, 0);
                    newNode.setOutputApplication(outputApp);
                    result.push(outputApp);
                }
            }

            if (Daliuge.isPythonInitialiser(newNode)) {
                let poName: string = FieldName.SELF;
                const selfField = newNode.findFieldByDisplayText(FieldName.SELF);
                if (typeof selfField !== 'undefined') {
                    poName = selfField.getType();
                }

                const baseNameField = newNode.findFieldByDisplayText(FieldName.BASE_NAME);
                if (typeof baseNameField !== 'undefined') {
                    const value = baseNameField.getValue();
                    if (value !== null) {
                        poName = value;
                    }
                }

                const poNode: Node = new Node(poName, "Instance of " + poName, "", CategoryName.PythonObject);
                const OBJECT_OFFSET_X = 100;
                const OBJECT_OFFSET_Y = 100;
                const pythonObjectNode: Node = await this.addNode(poNode, pos.x + OBJECT_OFFSET_X, pos.y + OBJECT_OFFSET_Y);
                pythonObjectNode.setParent(newNode);
                result.push(pythonObjectNode);

                Utils.copyFieldsFromPrototype(pythonObjectNode, Palette.BUILTIN_PALETTE_NAME, CategoryName.PythonObject);
                let sourcePort = newNode.findPortByDisplayText(FieldName.SELF, false, false);
                if (typeof sourcePort === 'undefined') {
                    sourcePort = Daliuge.selfFieldComponent.clone().setId(Id.generateFieldId());
                    newNode.addField(sourcePort);
                    Utils.showNotification("Component Warning", "The PythonMemberFunction does not have a '" + FieldName.SELF + "' port. Added this port to enable connection.", "warning");
                }

                const inputOutputPort: Field = Daliuge.selfFieldComponent.clone().setId(Id.generateFieldId()).setType(sourcePort.getType());
                pythonObjectNode.addField(inputOutputPort);
                this.addEdge(newNode, sourcePort, pythonObjectNode, inputOutputPort, false, false, true);
            }

            eagle.setSelection(newNode, EagleFileType.Graph);
            eagle.checkEagle();
            eagle.undo().pushSnapshot(eagle, "Add node " + newNode.getName());
            eagle.logicalGraph.valueHasMutated();
            resolve(result);

            if (searchAreaExtended) {
                setTimeout(() => eagle.centerGraph(), EagleConfig.STANDARD_UI_SHORT_TIMEOUT);
            }
        });
    }
}
