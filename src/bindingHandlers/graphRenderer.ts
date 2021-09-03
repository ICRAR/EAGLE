/* eslint-enable @typescript-eslint/no-unused-vars */

import * as ko from "knockout";
import * as d3 from "d3";
import * as $ from "jquery";

import {Eagle} from '../Eagle';
import {LogicalGraph} from '../LogicalGraph';
import {Node} from '../Node';
import {Edge} from '../Edge';
import {Port} from '../Port';
import {Utils} from '../Utils';

ko.bindingHandlers.graphRenderer = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        //console.log("bindingHandlers.graphRenderer.init()");
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        //console.log("bindingHandlers.graphRenderer.update()");

        const graph : LogicalGraph = ko.unwrap(valueAccessor());

        if (graph === null){
            //console.warn("graphRenderer update(): graph is null");
            return;
        }

        $(element).empty();

        render(graph, element.id, bindingContext.$root);
    }
};

const LINK_COLORS:{[key:string]:string} = {
    LINK_DEFAULT_COLOR: 'dimgrey',
    LINK_DEFAULT_SELECTED_COLOR: 'black',
    LINK_WARNING_COLOR: 'orange',
    LINK_WARNING_SELECTED_COLOR: 'tomato',
    LINK_INVALID_COLOR: 'red',
    LINK_INVALID_SELECTED_COLOR: 'firebrick',
    LINK_VALID_COLOR: 'limegreen',
    LINK_EVENT_COLOR: 'rgb(128,128,255)',
    LINK_EVENT_SELECTED_COLOR: 'blue'
}

function render(graph: LogicalGraph, elementId : string, eagle : Eagle){
    const startTime: number = performance.now();
    eagle.rendererFrameCountRender = eagle.rendererFrameCountRender + 1;

    // sort the nodes array so that groups appear first, this ensures that child nodes are drawn on top of the group their parents
    const nodeData : Node[] = depthFirstTraversalOfNodes(graph.getNodes());
    const linkData : Edge[] = graph.getEdges();

    let hasDraggedBackground : boolean = false;
    let isDraggingNode : boolean = false;
    let isDraggingSelectionRegion : boolean = false;
    let sourcePortId : string | null = null;
    let sourceNodeKey : number | null = null;
    let sourceDataType : string | null = null;
    let destinationPortId : string | null = null;
    let destinationNodeKey : number | null = null;
    let isDraggingPort : boolean = false;
    let isDraggingPortValid : Eagle.LinkValid = Eagle.LinkValid.Unknown;
    let isDraggingWithAlt : boolean = false;

    const mousePosition = {x:0, y:0};
    const selectionRegionStart = {x:0, y:0};
    const selectionRegionEnd = {x:0, y:0};

    const DOUBLE_CLICK_DURATION : number = 200;

    const APPS_HEIGHT : number = 28;
    const PORT_HEIGHT : number = 24;

    const NODE_STROKE_WIDTH : number = 3;
    const HEADER_INSET : number = NODE_STROKE_WIDTH - 1;

    const PORT_OFFSET_X : number = 2;
    const PORT_ICON_HEIGHT : number = 8;
    const PORT_INSET : number = 10;

    const RESIZE_CONTROL_SIZE : number = 16;
    const SHRINK_BUTTON_SIZE : number = 16;

    const RESIZE_BUTTON_LABEL : string = "\u25F2";
    const SHRINK_BUTTON_LABEL : string = "\u21B9";

    const HEADER_TEXT_FONT_SIZE : number = 16;
    const CONTENT_TEXT_FONT_SIZE : number = 14;
    const PORT_LABEL_FONT_SIZE : number = 14;
    const RESIZE_BUTTON_LABEL_FONT_SIZE : number = 24;
    const HEADER_BUTTON_LABEL_FONT_SIZE : number = 12;


    const SHRINK_BUTTONS_ENABLED : boolean = true;

    const HEADER_OFFSET_Y_MEMORY : number = 16;
    const SUBHEADER_OFFSET_Y_MEMORY : number = -6;
    const HEADER_OFFSET_Y_FILE : number = 4;
    const SUBHEADER_OFFSET_Y_FILE : number = 8;
    const HEADER_OFFSET_Y_S3 : number = 4;
    const SUBHEADER_OFFSET_Y_S3 : number = 8;
    const HEADER_OFFSET_Y_NGAS : number = 4;
    const SUBHEADER_OFFSET_Y_NGAS : number = 8;
    const HEADER_OFFSET_Y_PLASMA : number = 4;
    const SUBHEADER_OFFSET_Y_PLASMA : number = 8;


    //console.log("pre-sort", printDrawOrder(graph.getNodes()));
    //console.log("render()", printDrawOrder(nodeData));

    const svgContainer = d3
        .select("#" + elementId)
        .append("svg");

    // add a root node to the SVG, we'll scale this root node
    const rootContainer = svgContainer
        .append("g")
        .attr("transform", rootScaleTranslation)
        .attr("class", "root")
        .attr("id", "root");
        
    // add def for markers
    const defs = rootContainer.append("defs");

    //generating defs from colors array
    Object.keys(LINK_COLORS).forEach(function (value, i) {
        const x = defs
            .append("marker")
            .attr("id", value)
            .attr("viewBox", "0 0 10 10")
            .attr("refX", "7")
            .attr("refY", "5")
            .attr("markerUnits", "strokeWidth")
            .attr("markerWidth","8")
            .attr("markerHeight", "6")
            .attr("orient", "auto"); 
        
        x
            .append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 z")
            .attr("stroke", "none")
            .attr("fill",LINK_COLORS[value]);
    })

    // background
    rootContainer
        .append("rect")
        .attr("class", "background");

    const backgroundDragHandler = d3
        .drag()
        .on("start", function (node : Node) {
            hasDraggedBackground = false;

            if (d3.event.sourceEvent.shiftKey || d3.event.sourceEvent.altKey){
                isDraggingSelectionRegion = true;
                selectionRegionStart.x = d3.event.x;
                selectionRegionStart.y = d3.event.y;
            }

            if (d3.event.sourceEvent.altKey){
                isDraggingWithAlt = true;
            } else {
                isDraggingWithAlt = false;
            }
        })
        .on("end", function(){
            const hadPreviousSelection: boolean = eagle.selectedObjects().length > 0;

            // if we just clicked on a node
            if (!hasDraggedBackground && !isDraggingSelectionRegion){
                eagle.setSelection(<Eagle.RightWindowMode>eagle.rightWindow().mode(), null, Eagle.FileType.Unknown);
                hasDraggedBackground = false;

                if (hadPreviousSelection){
                    eagle.rightWindow().mode(Eagle.RightWindowMode.Hierarchy);
                }
            }

            // if we dragged a selection region
            if (isDraggingSelectionRegion){
                const nodes: Node[] = findNodesInRegion(selectionRegionStart.x, selectionRegionEnd.x, selectionRegionStart.y, selectionRegionEnd.y);

                const edges: Edge[] = findEdgesContainedByNodes(eagle.logicalGraph().getEdges(), nodes);
                console.log("Found", nodes.length, "nodes and", edges.length, "edges in region");
                const objects: (Node | Edge)[] = [];

                objects.push(...nodes);
                objects.push(...edges);

                eagle.selectedObjects(objects);
                eagle.selectedLocation(Eagle.FileType.Graph);
                eagle.rightWindow().mode(Eagle.RightWindowMode.Inspector);

                if (isDraggingWithAlt){
                    for (const node of nodes){
                        node.setShowPorts(true);
                    }
                }

                selectionRegionStart.x = 0;
                selectionRegionStart.y = 0;
                selectionRegionEnd.x = 0;
                selectionRegionEnd.y = 0;

                // necessary to make uncollapsed nodes show up
                eagle.logicalGraph.valueHasMutated();
            }
        })
        .on("drag", function(){
            if (isDraggingSelectionRegion){
                selectionRegionEnd.x = d3.event.x;
                selectionRegionEnd.y = d3.event.y;
            } else {
                // move background
                eagle.globalOffsetX += d3.event.sourceEvent.movementX;
                eagle.globalOffsetY += d3.event.sourceEvent.movementY;
                hasDraggedBackground = true;
            }

            tick();
        });

    const backgroundZoomHandler = d3
        .zoom()
        .scaleExtent([0.5, 3.0])
        .translateExtent([[0, 0], [$('#logicalGraphD3Div').width(), $('#logicalGraphD3Div').height()]])
        .extent([[0, 0], [$('#logicalGraphD3Div').width(), $('#logicalGraphD3Div').height()]])
        .on("zoom", function(){
            // TODO: Try to centre the zoom on mouse position rather than upper left corner.
            // Somehow only the eagle.globalScale does something...
            //const tx = d3.mouse(svgContainer.node())[0];
            //const ty = d3.mouse(svgContainer.node())[1];
            const wheelDelta = d3.event.sourceEvent.deltaY;

            //eagle.globalScale = d3.event.transform.k;
            eagle.globalScale -= wheelDelta/100;

            // limit scaling
            eagle.globalScale = Math.max(Math.min(eagle.globalScale, 3.0), 0.5);

            tick();
        });

    backgroundDragHandler(rootContainer.selectAll("rect.background"));
    backgroundZoomHandler(rootContainer.selectAll("rect.background"));

    let nodes : any = rootContainer
        .selectAll("g.node")
        .data(nodeData)
        .enter()
        .append("g")
        .attr("transform", nodeGetTranslation)
        .attr("class", "node")
        .attr("id", function(node : Node, index : number){return "node" + index;})
        .style("display", getNodeDisplay);

    // rects
    nodes
        .append("rect")
        .attr("width", function(node:Node){return getWidth(node);})
        .attr("height", function(node:Node){return getHeight(node);})
        .style("display", getNodeRectDisplay)
        .style("fill", nodeGetFill)
        .style("stroke", nodeGetStroke)
        .style("stroke-width", NODE_STROKE_WIDTH)
        .attr("stroke-dasharray", nodeGetStrokeDashArray);

    // custom-shaped nodes
    nodes
        .append("polygon")
        .attr("points", getNodeCustomShapePoints)
        .style("display", getNodeCustomShapeDisplay)
        .style("fill", nodeGetColor)
        .style("stroke", nodeGetStroke)
        .style("stroke-width", NODE_STROKE_WIDTH)
        .attr("stroke-dasharray", nodeGetStrokeDashArray);

    const nodeDragHandler = d3
        .drag()
        .on("start", function (node : Node) {
            isDraggingNode = false;

            // new click time
            const newTime = Date.now();
            const elapsedTime = newTime - Eagle.lastClickTime;
            Eagle.lastClickTime = newTime;

            // check if this is a double click
            if (elapsedTime < DOUBLE_CLICK_DURATION){
                if (node.isData()){
                    console.log("Double click data");
                    node.toggleShowPorts();
                    eagle.logicalGraph.valueHasMutated();
                }
                if (node.isGroup()){
                    console.log("Double click group");
                    node.toggleCollapsed();
                }
            }

            // if node not selected, then select it
            if (!eagle.objectIsSelected(node)){
                selectNode(node, d3.event.sourceEvent.shiftKey);
            }

            //tick();
        })
        .on("drag", function (node : Node, index : number) {
            if (!isDraggingNode){
                isDraggingNode = true;

                if (d3.event.sourceEvent.altKey){
                    isDraggingWithAlt = true;
                } else {
                    isDraggingWithAlt = false;
                }
            }

            // transform change in x,y position using current scale factor
            const dx = DISPLAY_TO_REAL_SCALE(d3.event.sourceEvent.movementX);
            const dy = DISPLAY_TO_REAL_SCALE(d3.event.sourceEvent.movementY);

            // move all selected nodes, skip edges (they just follow nodes anyway)
            for (const object of eagle.selectedObjects()){
                if (object instanceof Node){
                    object.changePosition(dx, dy);

                    if (!isDraggingWithAlt){
                        moveChildNodes(object, dx, dy);
                    }
                }
            }

            // trigger updates
            eagle.flagActiveFileModified();
            eagle.logicalGraph.valueHasMutated();
            //tick();
        })
        .on("end", function(node : Node){
            // update location (in real node data, not sortedData)
            // guarding this behind 'isDraggingNode' is a hack to get around the fact that d3.event.x and d3.event.y behave strangely
            if (isDraggingNode){
                isDraggingNode = false;
            }

            // find location of mouse realtive to top-left of logicalGraphParent (translate to real coord system)
            const offset = $("#logicalGraphParent").offset();
            const x = DISPLAY_TO_REAL_POSITION_X(d3.event.sourceEvent.x - offset.left);
            const y = DISPLAY_TO_REAL_POSITION_Y(d3.event.sourceEvent.y - offset.top);

            // check for nodes underneath the top left corner of the node we dropped
            const parent : Node = checkForNodeAt(node, x, y);

            // if a parent was found, update
            if (parent !== null && node.getParentKey() !== parent.getKey() && node.getKey() !== parent.getKey()){
                //console.log("set parent", parent.getKey());
                node.setParentKey(parent.getKey());
            }

            // if no parent found, update
            if (parent === null && node.getParentKey() !== null){
                //console.log("set parent", null);
                node.setParentKey(null);
            }

            // also check that to see if current children are still in within the group
            if (isDraggingWithAlt && node.isGroup() && !node.isCollapsed()){
                // loop through all nodes, check if node is a child
                // if so, run checkForNodeAt and make sure result is parent
                for (let i = 0; i < nodeData.length ; i++){
                    const child : Node = nodeData[i];

                    if (child.getParentKey() === node.getKey()){
                        const parent : Node = checkForNodeAt(child, child.getPosition().x, child.getPosition().y);

                        // un-parent the child if no longer contained within the node we are dragging
                        if (parent === null || parent.getKey() !== node.getKey()){
                            child.setParentKey(null);
                        }
                    }
                }
            }

            //tick();
        });

    nodeDragHandler(rootContainer.selectAll("g.node"));

    // add a header background to each node
    nodes
        .append("rect")
        .attr("class", "header-background")
        .attr("width", function(node:Node){return getHeaderBackgroundWidth(node);})
        .attr("height", function(node:Node){return getHeaderBackgroundHeight(node);})
        .attr("x", HEADER_INSET)
        .attr("y", HEADER_INSET)
        .style("fill", nodeGetColor)
        .style("stroke", "grey")
        .style("display", getHeaderBackgroundDisplay);

    // add a text header to each node
    nodes
        .append("text")
        .attr("class", "header")
        .attr("x", function(node:Node){return getHeaderPositionX(node);})
        .attr("y", function(node:Node){return getHeaderPositionY(node);})
        .attr("eagle-wrap-width", getWrapWidth)
        .style("fill", getHeaderFill)
        .style("font-size", HEADER_TEXT_FONT_SIZE + "px")
        .style("font-weight", getHeaderFontWeight)
        .style("display", getHeaderDisplay)
        .text(getHeaderText)
        .call(wrap, false);

    // add subheader text
    nodes
        .append("text")
        .attr("class", "subheader")
        .attr("x", function(node:Node){return getHeaderPositionX(node);})
        .attr("y", function(node:Node){return getSubHeaderPositionY(node);})
        .style("fill", getHeaderFill)
        .style("font-size", HEADER_TEXT_FONT_SIZE + "px")
        .style("display", getSubHeaderDisplay)
        .text(getSubHeaderText);

    // add a app names background to each node
    nodes
        .append("rect")
        .attr("class", "apps-background")
        .attr("width", function(node:Node){return getAppsBackgroundWidth(node);})
        .attr("height", function(node:Node){return getAppsBackgroundHeight(node);})
        .attr("x", HEADER_INSET)
        .attr("y", function(node:Node){return HEADER_INSET + getHeaderBackgroundHeight(node);})
        .style("fill", nodeGetColor)
        .style("stroke", "grey")
        .style("display", getAppsBackgroundDisplay);

    // add the input name text
    nodes
        .append("text")
        .attr("class", "inputAppName")
        .attr("x", function(node:Node){return getInputAppPositionX(node);})
        .attr("y", function(node:Node){return getInputAppPositionY(node);})
        .style("fill", getHeaderFill)
        .style("font-size", HEADER_TEXT_FONT_SIZE + "px")
        .style("display", getAppsBackgroundDisplay)
        .text(getInputAppText);

    // add the output name text
    nodes
        .append("text")
        .attr("class", "outputAppName")
        .attr("x", function(node:Node){return getOutputAppPositionX(node);})
        .attr("y", function(node:Node){return getOutputAppPositionY(node);})
        .style("fill", getHeaderFill)
        .style("font-size", HEADER_TEXT_FONT_SIZE + "px")
        .style("display", getAppsBackgroundDisplay)
        .text(getOutputAppText);

    // add the exit name text
    nodes
        .append("text")
        .attr("class", "exitAppName")
        .attr("x", function(node:Node){return getExitAppPositionX(node);})
        .attr("y", function(node:Node){return getExitAppPositionY(node);})
        .style("fill", getHeaderFill)
        .style("font-size", HEADER_TEXT_FONT_SIZE + "px")
        .style("display", getAppsBackgroundDisplay)
        .text(getExitAppText);

    // add the content text
    nodes
        .append("text")
        .attr("class", "content")
        .attr("x", function(node:Node){return getContentPositionX(node);})
        .attr("y", function(node:Node){return getContentPositionY(node);})
        .attr("eagle-wrap-width", getWrapWidth)
        .style("fill", getContentFill)
        .style("font-size", CONTENT_TEXT_FONT_SIZE + "px")
        .style("display", getContentDisplay)
        .text(getContentText)
        .call(wrap, true);

    // add the svg icon
    nodes
        .append("svg:image")
        .attr("href", getDataIcon)
        .attr("width", Node.DATA_COMPONENT_WIDTH)
        .attr("height", Node.DATA_COMPONENT_HEIGHT)
        .attr("x", function(node:Node){return getIconLocationX(node);})
        .attr("y", function(node:Node){return getIconLocationY(node);})

    // add the resize controls
    nodes
        .append("rect")
        .attr("class", "resize-control")
        .attr("width", RESIZE_CONTROL_SIZE)
        .attr("height", RESIZE_CONTROL_SIZE)
        .attr("x", function(node : Node){return getWidth(node) - RESIZE_CONTROL_SIZE;})
        .attr("y", function(node : Node){return getHeight(node) - RESIZE_CONTROL_SIZE;})
        .style("display", getResizeControlDisplay);

    // add the resize labels
    nodes
        .append("text")
        .attr("class", "resize-control-label")
        .attr('x', function(node : Node){return getWidth(node) - RESIZE_CONTROL_SIZE;})
        .attr('y', function(node : Node){return getHeight(node) - 2;})
        .style('font-size', RESIZE_BUTTON_LABEL_FONT_SIZE + 'px')
        .style('display', getResizeControlDisplay)
        .style('user-select', 'none')
        .style('cursor', 'nwse-resize')
        .text(RESIZE_BUTTON_LABEL);

    const resizeDragHandler = d3
        .drag()
        .on("start", function (node : Node) {
            selectNode(node, false);
            tick();
        })
        .on("drag", function (node : Node) {
            let newWidth = node.getWidth() + DISPLAY_TO_REAL_SCALE(d3.event.sourceEvent.movementX);
            let newHeight = node.getHeight() + DISPLAY_TO_REAL_SCALE(d3.event.sourceEvent.movementY);

            // ensure node are of at least a minimum size
            newWidth = Math.max(newWidth, Node.MINIMUM_WIDTH);
            newHeight = Math.max(newHeight, Node.MINIMUM_HEIGHT);

            node.setWidth(newWidth);
            node.setHeight(newHeight);

            eagle.logicalGraph.valueHasMutated();
            //tick();
        });

    resizeDragHandler(rootContainer.selectAll("g.node rect.resize-control"));
    resizeDragHandler(rootContainer.selectAll("g.node text.resize-control-label"));

    // add shrink buttons
    nodes
        .append("rect")
        .attr("class", "shrink-button")
        .attr("width", SHRINK_BUTTON_SIZE)
        .attr("height", SHRINK_BUTTON_SIZE)
        .attr("x", function(node : Node){return getWidth(node) - SHRINK_BUTTON_SIZE - HEADER_INSET - 4;})
        .attr("y", HEADER_INSET + 4)
        .style("display", getShrinkControlDisplay)
        .on("click", shrinkOnClick);

    // add shrink button labels
    nodes
        .append("text")
        .attr("class", "shrink-button-label")
        .attr('x', function(node : Node){return getWidth(node) - SHRINK_BUTTON_SIZE - HEADER_INSET - 2;})
        .attr('y', HEADER_INSET + 8 + (SHRINK_BUTTON_SIZE/2))
        .style('font-size', HEADER_BUTTON_LABEL_FONT_SIZE + 'px')
        .style('fill', 'black')
        .style('display', getShrinkControlDisplay)
        .style('user-select', 'none')
        .text(SHRINK_BUTTON_LABEL)
        .on("click", shrinkOnClick);

    // add the left-side ports (by default, the input ports)
    const inputPortGroups = nodes
        .append("g")
        .attr("class", getInputPortGroupClass)
        .attr("transform", getInputPortGroupTransform)
        .style("display", getPortsDisplay);

    // add input ports
    inputPortGroups
        .selectAll("g")
        .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
        .enter()
        .append("text")
        .attr("class", getPortClass)
        .attr("x", getInputPortPositionX)
        .attr("y", getInputPortPositionY)
        .style("font-size", PORT_LABEL_FONT_SIZE + "px")
        .text(function (port : Port) {return port.getName();});

    const inputCircles = inputPortGroups
        .selectAll("g")
        .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
        .enter()
        .append("circle")
        .attr("data-id", function(port : Port){return port.getId();})
        .attr("cx", getInputPortCirclePositionX)
        .attr("cy", getInputPortCirclePositionY)
        .attr("r", 6)
        .attr("data-node-key", function(port : Port){return port.getNodeKey();})
        .on("mouseenter", mouseEnterPort)
        .on("mouseleave", mouseLeavePort);

    // add the input local ports
    const inputLocalPortGroups = nodes
        .append("g")
        .attr("class", getInputLocalPortGroupClass)
        .attr("transform", getInputLocalPortGroupTransform)
        .style("display", getPortsDisplay);

    inputLocalPortGroups
        .selectAll("g")
        .data(function(node : Node){return node.getInputApplicationOutputPorts();})
        .enter()
        .append("text")
        .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
        .attr("x", getInputLocalPortPositionX)
        .attr("y", getInputLocalPortPositionY)
        .style("font-size", PORT_LABEL_FONT_SIZE + "px")
        .text(function (port : Port) {return port.getName();});

    const inputLocalCircles = inputLocalPortGroups
        .selectAll("g")
        .data(function(node : Node){return node.getInputApplicationOutputPorts();})
        .enter()
        .append("circle")
        .attr("data-id", function(port : Port){return port.getId();})
        .attr("cx", getInputLocalPortCirclePositionX)
        .attr("cy", getInputLocalPortCirclePositionY)
        .attr("r", 6)
        .attr("data-node-key", function(port : Port){return port.getNodeKey();})
        .on("mouseenter", mouseEnterPort)
        .on("mouseleave", mouseLeavePort);

    // add the output ports
    const outputPortGroups = nodes
        .append("g")
        .attr("class", getOutputPortGroupClass)
        .attr("transform", getOutputPortGroupTransform)
        .style("display", getPortsDisplay);

    outputPortGroups
        .selectAll("g")
        .data(function(node : Node, index : number){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
        .enter()
        .append("text")
        .attr("class", getPortClass)
        .attr("x", getOutputPortPositionX)
        .attr("y", getOutputPortPositionY)
        .style("font-size", PORT_LABEL_FONT_SIZE + "px")
        .text(function (port : Port) {return port.getName();});

    const outputCircles = outputPortGroups
        .selectAll("g")
        .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
        .enter()
        .append("circle")
        .attr("data-id", function(port : Port){return port.getId();})
        .attr("cx", getOutputPortCirclePositionX)
        .attr("cy", getOutputPortCirclePositionY)
        .attr("r", 6)
        .attr("data-node-key", function(port : Port){return port.getNodeKey();})
        .on("mouseenter", mouseEnterPort)
        .on("mouseleave", mouseLeavePort);

    // add the output local ports
    const outputLocalPortGroups = nodes
        .append("g")
        .attr("class", getOutputLocalPortGroupClass)
        .attr("transform", getOutputLocalPortGroupTransform)
        .style("display", getPortsDisplay);

    outputLocalPortGroups
        .selectAll("g")
        .data(function(node : Node){return node.getOutputApplicationInputPorts();})
        .enter()
        .append("text")
        .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
        .attr("x", getOutputLocalPortPositionX)
        .attr("y", getOutputLocalPortPositionY)
        .style("font-size", PORT_LABEL_FONT_SIZE + "px")
        .text(function (port : Port) {return port.getName();});

    const outputLocalCircles = outputLocalPortGroups
        .selectAll("g")
        .data(function(node : Node){return node.getOutputApplicationInputPorts();})
        .enter()
        .append("circle")
        .attr("data-id", function(port : Port){return port.getId();})
        .attr("cx", getOutputLocalPortCirclePositionX)
        .attr("cy", getOutputLocalPortCirclePositionY)
        .attr("r", 6)
        .attr("data-node-key", function(port : Port){return port.getNodeKey();})
        .on("mouseenter", mouseEnterPort)
        .on("mouseleave", mouseLeavePort);

    // add the exit ports
    const exitPortGroups = nodes
        .append("g")
        .attr("class", getExitPortGroupClass)
        .attr("transform", getExitPortGroupTransform)
        .style("display", getPortsDisplay);

    exitPortGroups
        .selectAll("g")
        .data(function(node : Node, index : number){return node.getExitApplicationOutputPorts();})
        .enter()
        .append("text")
        .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
        .attr("x", getExitPortPositionX)
        .attr("y", getExitPortPositionY)
        .style("font-size", PORT_LABEL_FONT_SIZE + "px")
        .text(function (port : Port) {return port.getName();});

    exitPortGroups
        .selectAll("g")
        .data(function(node : Node){return node.getExitApplicationOutputPorts();})
        .enter()
        .append("circle")
        .attr("data-id", function(port : Port){return port.getId();})
        .attr("cx", getExitPortCirclePositionX)
        .attr("cy", getExitPortCirclePositionY)
        .attr("r", 6)
        .attr("data-node-key", function(port : Port){return port.getNodeKey();})
        .on("mouseenter", mouseEnterPort)
        .on("mouseleave", mouseLeavePort);

    // add the exit local ports
    const exitLocalPortGroups = nodes.append("g")
                                .attr("class", getExitLocalPortGroupClass)
                                .attr("transform", getExitLocalPortGroupTransform)
                                .style("display", getPortsDisplay);

    exitLocalPortGroups
        .selectAll("g")
        .data(function(node : Node){return node.getExitApplicationInputPorts();})
        .enter()
        .append("text")
        .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
        .attr("x", getExitLocalPortPositionX)
        .attr("y", getExitLocalPortPositionY)
        .style("font-size", PORT_LABEL_FONT_SIZE + "px")
        .text(function (port : Port) {return port.getName();});

    exitLocalPortGroups
        .selectAll("g")
        .data(function(node : Node){return node.getExitApplicationInputPorts();})
        .enter()
        .append("circle")
        .attr("data-id", function(port : Port){return port.getId();})
        .attr("cx", getExitLocalPortCirclePositionX)
        .attr("cy", getExitLocalPortCirclePositionY)
        .attr("r", 6)
        .attr("data-node-key", function(port : Port){return port.getNodeKey();})
        .on("mouseenter", mouseEnterPort)
        .on("mouseleave", mouseLeavePort);


    const portDragHandler = d3.drag()
                            .on("start", function (port : Port) {
                                console.log("drag start", "nodeKey", port.getNodeKey(), "portId", port.getId(), "portName", port.getName());
                                isDraggingPort = true;
                                sourceNodeKey = port.getNodeKey();
                                sourcePortId = port.getId();
                                sourceDataType = port.getName();
                            })
                            .on("drag", function () {
                                //console.log("drag from port", data.Id);
                                mousePosition.x = d3.mouse(svgContainer.node())[0];
                                mousePosition.y = d3.mouse(svgContainer.node())[1];
                                tick();
                            })
                            .on("end", function(port : Port){
                                console.log("drag end", port.getId());
                                isDraggingPort = false;

                                if (destinationPortId !== null){
                                    // check if link is valid
                                    const linkValid : Eagle.LinkValid = Edge.isValid(graph, sourceNodeKey, sourcePortId, destinationNodeKey, destinationPortId, false, true, true);

                                    // check if we should allow invalid edges
                                    const allowInvalidEdges : boolean = Eagle.findSettingValue(Utils.ALLOW_INVALID_EDGES);

                                    // abort if source port and destination port have different data types
                                    if (allowInvalidEdges || linkValid === Eagle.LinkValid.Valid || linkValid === Eagle.LinkValid.Warning){
                                        if (linkValid === Eagle.LinkValid.Warning){
                                            addEdge(sourceNodeKey, sourcePortId, destinationNodeKey, destinationPortId, sourceDataType, true);
                                        } else {
                                            addEdge(sourceNodeKey, sourcePortId, destinationNodeKey, destinationPortId, sourceDataType, false);
                                        }
                                    } else {
                                        console.warn("link not valid, result", linkValid);
                                    }
                                } else {
                                    console.warn("destination port is null!", destinationPortId);
                                }

                                clearEdgeVars();
                                tick();
                            });

    portDragHandler(inputCircles);
    portDragHandler(inputLocalCircles);
    portDragHandler(outputCircles);
    portDragHandler(outputLocalCircles);

    // draw link extras (these a invisble wider links that assist users in selecting the edges)
    // TODO: ideally we would not use the 'any' type here
    const linkExtras : any = rootContainer
        .selectAll("path.linkExtra")
        .data(linkData)
        .enter()
        .append("path");

    linkExtras
        .attr("class", "linkExtra")
        .attr("d", createLink)
        .attr("stroke", "transparent")
        .attr("stroke-width", "10px")
        .attr("fill", "transparent")
        .style("display", getEdgeDisplay)
        .on("click", edgeOnClick);

    // draw links
    // TODO: ideally we would not use the 'any' type here
    let links : any = rootContainer
        .selectAll("path.link")
        .data(linkData)
        .enter()
        .append("path");

    links
        .attr("class", "link")
        .attr("d", createLink)
        .attr("stroke", edgeGetStrokeColor)
        .attr("stroke-dasharray", edgeGetStrokeDashArray)
        .attr("fill", "transparent")
        .attr("marker-end", getArrowType)
        .style("display", getEdgeDisplay)
        .on("click", edgeOnClick);

    // draw comment links
    let commentLinks : any = rootContainer
        .selectAll("path.commentLink")
        .data(nodeData)
        .enter()
        .append("path");

    commentLinks
        .attr("class", "commentLink")
        .attr("d", createCommentLink)
        .attr("stroke", LINK_COLORS["LINK_DEFAULT_COLOR"])
        .attr("fill", "transparent")
        .attr("marker-end", "url(#LINK_DEFAULT_COLOR)")
        .style("display", getCommentLinkDisplay);

    // create one link that is only used during the creation of a new link
    // this new link follows the mouse pointer to indicate the position
    const draggingLink = rootContainer
        .append("line")
        .attr("class", "draggingLink")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 0)
        .attr("y2", 0)
        .attr("stroke", draggingEdgeGetStrokeColor);

    const selectionRegion = rootContainer
        .append("rect")
        .attr("class", "selection-region")
        .attr("width", 0)
        .attr("height", 0)
        .attr("x", 0)
        .attr("y", 0)
        .attr("stroke", "black")
        .attr("fill", "transparent")
        .style("display", "inline");

    function determineDirection(source: boolean, node: Node, portIndex: number, portType: string): Eagle.Direction {
        if (source){
            if (node.isBranch()){
                if (portIndex === 0){
                    return Eagle.Direction.Down;
                }
                if (portIndex === 1){
                    return Eagle.Direction.Right;
                }
            }

            if (portType === "output" || portType === "inputLocal"){
                return node.isFlipPorts() ? Eagle.Direction.Left : Eagle.Direction.Right;
            } else {
                return node.isFlipPorts() ? Eagle.Direction.Right : Eagle.Direction.Left;
            }
        } else {
            if (node.isBranch()){
                return Eagle.Direction.Down;
            }

            if (portType === "input" || portType === "outputLocal"){
                return node.isFlipPorts() ? Eagle.Direction.Left : Eagle.Direction.Right;
            } else {
                return node.isFlipPorts() ? Eagle.Direction.Right : Eagle.Direction.Left;
            }
        }
    }

    function createLink(edge : Edge) : string {
        // determine if edge is "forward" or not
        const srcNode : Node  = findNodeWithKey(edge.getSrcNodeKey(), nodeData);
        const destNode : Node = findNodeWithKey(edge.getDestNodeKey(), nodeData);

        if (srcNode === null || destNode === null){
            console.warn("Can't find srcNode or can't find destNode for edge.");
            return createBezier(0,0,0,0,Eagle.Direction.Down,Eagle.Direction.Down);
        }

        const srcPortType : string =  srcNode.findPortTypeById(edge.getSrcPortId());
        const destPortType : string = destNode.findPortTypeById(edge.getDestPortId());
        const srcPortIndex : number = srcNode.findPortIndexById(edge.getSrcPortId());
        const destPortIndex : number = destNode.findPortIndexById(edge.getDestPortId());

        let x1 = edgeGetX1(edge);
        let y1 = edgeGetY1(edge);
        let x2 = edgeGetX2(edge);
        let y2 = edgeGetY2(edge);

        console.assert(!isNaN(x1));
        console.assert(!isNaN(y1));
        console.assert(!isNaN(x2));
        console.assert(!isNaN(y2));

        // if coordinate isNaN, replace with a default, so at least the edge can be drawn
        if (isNaN(x1)) x1 = 0;
        if (isNaN(y1)) y1 = 0;
        if (isNaN(x2)) x2 = 0;
        if (isNaN(y2)) y2 = 0;

        const startDirection = determineDirection(true, srcNode, srcPortIndex, srcPortType);
        const endDirection = determineDirection(false, destNode, destPortIndex, destPortType);

        return createBezier(x1, y1, x2, y2, startDirection, endDirection);
    }

    function tick(){
        const startTime = performance.now();
        eagle.rendererFrameCountTick = eagle.rendererFrameCountTick + 1;

        // scale the root node
        rootContainer
            .attr("transform", rootScaleTranslation);

        // enter any new nodes
        rootContainer
            .selectAll("g.node")
            .data(nodeData)
            .enter()
            .insert("g")
            .attr("class", "node")
            .attr("id", function(node : Node, index : number){return "node" + index;});

        // exit any old nodes
        rootContainer
            .selectAll("g.node")
            .data(nodeData)
            .exit()
            .remove();

        // enter any new links
        rootContainer
            .selectAll("path.link")
            .data(linkData)
            .enter()
            .insert("path")
            .attr("class", "link")
            .style("display", getEdgeDisplay)
            .on("click", edgeOnClick);

        // exit any old links.
        rootContainer
            .selectAll("path.link")
            .data(linkData)
            .exit()
            .remove();

        // enter any new comment links
        rootContainer
            .selectAll("path.commentLink")
            .data(nodeData)
            .enter()
            .insert("path")
            .attr("class", "commentLink")
            .style("display", getCommentLinkDisplay);

        // exit any old comment links
        rootContainer
            .selectAll("path.commentLink")
            .data(nodeData)
            .exit()
            .remove();

        // make sure we have references to all the objects of each type
        nodes = rootContainer
            .selectAll("g.node")
            .data(nodeData)
            .style("display", getNodeDisplay);
        links = rootContainer
            .selectAll("path.link")
            .data(linkData);
        commentLinks = rootContainer
            .selectAll("path.commentLink")
            .data(nodeData);

        // TODO: update attributes of all nodes
        nodes.attr("transform", nodeGetTranslation);

        rootContainer
            .selectAll("g.node rect:not(.header-background):not(.apps-background):not(.resize-control):not(.shrink-button)")
            .data(nodeData)
            .attr("width", function(node:Node){return getWidth(node);})
            .attr("height", function(node:Node){return getHeight(node);})
            .style("display", getNodeRectDisplay)
            .style("fill", nodeGetFill)
            .style("stroke", nodeGetStroke)
            .style("stroke-width", NODE_STROKE_WIDTH)
            .attr("stroke-dasharray", nodeGetStrokeDashArray);

        rootContainer
            .selectAll("g.node polygon")
            .data(nodeData)
            .attr("points", getNodeCustomShapePoints)
            .style("display", getNodeCustomShapeDisplay)
            .style("fill", nodeGetColor)
            .style("stroke", nodeGetStroke)
            .style("stroke-width", NODE_STROKE_WIDTH)
            .attr("stroke-dasharray", nodeGetStrokeDashArray);

        rootContainer
            .selectAll("g.node rect.header-background")
            .data(nodeData)
            .attr("width", function(node:Node){return getHeaderBackgroundWidth(node);})
            .attr("height", function(node:Node){return getHeaderBackgroundHeight(node);})
            .attr("x", HEADER_INSET)
            .attr("y", HEADER_INSET)
            .style("fill", nodeGetColor)
            .style("stroke", "grey")
            .style("display", getHeaderBackgroundDisplay);

        rootContainer
            .selectAll("g.node text.header")
            .data(nodeData)
            .attr("x", function(node:Node){return getHeaderPositionX(node);})
            .attr("y", function(node:Node){return getHeaderPositionY(node);})
            .attr("eagle-wrap-width", getWrapWidth)
            .style("fill", getHeaderFill)
            .style("font-size", HEADER_TEXT_FONT_SIZE + "px")
            .style("font-weight", getHeaderFontWeight)
            .style("display", getHeaderDisplay)
            .text(getHeaderText)
            .call(wrap, false);

        rootContainer
            .selectAll("g.node text.subheader")
            .data(nodeData)
            .attr("x", function(node:Node){return getHeaderPositionX(node);})
            .attr("y", function(node:Node){return getSubHeaderPositionY(node);})
            .style("fill", getHeaderFill)
            .style("font-size", HEADER_TEXT_FONT_SIZE + "px")
            .style("display", getSubHeaderDisplay)
            .text(getSubHeaderText);

        rootContainer
            .selectAll("g.node rect.apps-background")
            .data(nodeData)
            .attr("width", function(node:Node){return getAppsBackgroundWidth(node);})
            .attr("height", function(node:Node){return getAppsBackgroundHeight(node);})
            .attr("x", HEADER_INSET)
            .attr("y", function(node:Node){return HEADER_INSET + getHeaderBackgroundHeight(node);})
            .style("fill", nodeGetColor)
            .style("stroke", "grey")
            .style("display", getAppsBackgroundDisplay);

        rootContainer
            .selectAll("g.node text.inputAppName")
            .data(nodeData)
            .attr("x", function(node:Node){return getInputAppPositionX(node);})
            .attr("y", function(node:Node){return getInputAppPositionY(node);})
            .style("fill", getHeaderFill)
            .style("font-size", HEADER_TEXT_FONT_SIZE + "px")
            .style("display", getAppsBackgroundDisplay)
            .text(getInputAppText);

        rootContainer
            .selectAll("g.node text.outputAppName")
            .data(nodeData)
            .attr("x", function(node:Node){return getOutputAppPositionX(node);})
            .attr("y", function(node:Node){return getOutputAppPositionY(node);})
            .style("fill", getHeaderFill)
            .style("font-size", HEADER_TEXT_FONT_SIZE + "px")
            .style("display", getAppsBackgroundDisplay)
            .text(getOutputAppText);

        rootContainer
            .selectAll("g.node text.exitAppName")
            .data(nodeData)
            .attr("x", function(node:Node){return getExitAppPositionX(node);})
            .attr("y", function(node:Node){return getExitAppPositionY(node);})
            .style("fill", getHeaderFill)
            .style("font-size", HEADER_TEXT_FONT_SIZE + "px")
            .style("display", getAppsBackgroundDisplay)
            .text(getExitAppText);

        rootContainer
            .selectAll("g.node text.content")
            .data(nodeData)
            .attr("x", function(node:Node){return getContentPositionX(node);})
            .attr("y", function(node:Node){return getContentPositionY(node);})
            .attr("eagle-wrap-width", getWrapWidth)
            .style("fill", getContentFill)
            .style("font-size", CONTENT_TEXT_FONT_SIZE + "px")
            .style("display", getContentDisplay)
            .text(getContentText)
            .call(wrap, true);

        rootContainer
            .selectAll("image")
            .data(nodeData)
            .attr("href", getDataIcon)
            .attr("width", Node.DATA_COMPONENT_HEIGHT)
            .attr("height", Node.DATA_COMPONENT_HEIGHT)
            .attr("x", function(node:Node){return getIconLocationX(node);})
            .attr("y", function(node:Node){return getIconLocationY(node);});

        rootContainer
            .selectAll("g.node rect.resize-control")
            .attr("width", RESIZE_CONTROL_SIZE)
            .attr("height", RESIZE_CONTROL_SIZE)
            .attr("x", function(node : Node){return getWidth(node) - RESIZE_CONTROL_SIZE;})
            .attr("y", function(node : Node){return getHeight(node) - RESIZE_CONTROL_SIZE;})
            .style("display", getResizeControlDisplay);

        rootContainer
            .selectAll("g.node text.resize-control-label")
            .attr('x', function(node : Node){return getWidth(node) - RESIZE_CONTROL_SIZE;})
            .attr('y', function(node : Node){return getHeight(node) - 2;})
            .style('font-size', RESIZE_BUTTON_LABEL_FONT_SIZE + 'px')
            .style('display', getResizeControlDisplay);

        rootContainer
            .selectAll("g.node rect.shrink-button")
            .attr("width", SHRINK_BUTTON_SIZE)
            .attr("height", SHRINK_BUTTON_SIZE)
            .attr("x", function(node : Node){return getWidth(node) - SHRINK_BUTTON_SIZE - HEADER_INSET - 4;})
            .attr("y", HEADER_INSET + 4)
            .style("display", getShrinkControlDisplay);

        rootContainer
            .selectAll("text.shrink-button-label")
            .attr('x', function(node : Node){return getWidth(node) - SHRINK_BUTTON_SIZE - HEADER_INSET - 2;})
            .attr('y', HEADER_INSET + 8 + (SHRINK_BUTTON_SIZE/2))
            .style('font-size', HEADER_BUTTON_LABEL_FONT_SIZE + 'px')
            .style('display', getShrinkControlDisplay);

        // inputPorts
        nodes
            .selectAll("g.inputPorts")
            .attr("transform", getInputPortGroupTransform)
            .style("display", getPortsDisplay);

        nodes
            .selectAll("g.inputPorts text")
            .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
            .enter()
            .select("g.inputPorts")
            .insert("text");

        nodes
            .selectAll("g.inputPorts text")
            .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
            .exit()
            .remove();

        nodes
            .selectAll("g.inputPorts text")
            .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
            .attr("class", getPortClass)
            .attr("x", getInputPortPositionX)
            .attr("y", getInputPortPositionY)
            .style("font-size", PORT_LABEL_FONT_SIZE + "px")
            .text(function (port : Port) {return port.getName();});

        nodes
            .selectAll("g.inputPorts circle")
            .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
            .enter()
            .select("g.inputPorts")
            .insert("circle");

        nodes
            .selectAll("g.inputPorts circle")
            .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
            .exit()
            .remove();

        nodes
            .selectAll("g.inputPorts circle")
            .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
            .attr("data-key", function(port : Port){return port.getId();})
            .attr("cx", getInputPortCirclePositionX)
            .attr("cy", getInputPortCirclePositionY)
            .attr("r", 6)
            .attr("data-node-key", function(port : Port){return port.getNodeKey();})
            .on("mouseenter", mouseEnterPort)
            .on("mouseleave", mouseLeavePort);

        // inputLocalPorts
        nodes
            .selectAll("g.inputLocalPorts")
            .attr("transform", getInputLocalPortGroupTransform)
            .style("display", getPortsDisplay);

        nodes
            .selectAll("g.inputLocalPorts text")
            .data(function(node : Node){return node.getInputApplicationOutputPorts();})
            .enter()
            .select("g.inputLocalPorts")
            .insert("text");

        nodes
            .selectAll("g.inputLocalPorts text")
            .data(function(node : Node){return node.getInputApplicationOutputPorts();})
            .exit()
            .remove();

        nodes
            .selectAll("g.inputLocalPorts text")
            .data(function(node : Node){return node.getInputApplicationOutputPorts();})
            .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
            .attr("x", getInputLocalPortPositionX)
            .attr("y", getInputLocalPortPositionY)
            .style("font-size", PORT_LABEL_FONT_SIZE + "px")
            .text(function (port : Port) {return port.getName();});

        nodes
            .selectAll("g.inputLocalPorts circle")
            .data(function(node : Node){return node.getInputApplicationOutputPorts();})
            .enter()
            .select("g.inputLocalPorts")
            .insert("circle");

        nodes
            .selectAll("g.inputLocalPorts circle")
            .data(function(node : Node){return node.getInputApplicationOutputPorts();})
            .exit()
            .remove();

        nodes
            .selectAll("g.inputLocalPorts circle")
            .data(function(node : Node){return node.getInputApplicationOutputPorts();})
            .attr("data-id", function(port : Port){return port.getId();})
            .attr("cx", getInputLocalPortCirclePositionX)
            .attr("cy", getInputLocalPortCirclePositionY)
            .attr("r", 6)
            .attr("data-node-key", function(port : Port){return port.getNodeKey();})
            .on("mouseenter", mouseEnterPort)
            .on("mouseleave", mouseLeavePort);

        // outputPorts
        nodes
            .selectAll("g.outputPorts")
            .attr("transform", getOutputPortGroupTransform)
            .style("display", getPortsDisplay);

        nodes
            .selectAll("g.outputPorts text")
            .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
            .enter()
            .select("g.outputPorts")
            .insert("text");

        nodes
            .selectAll("g.outputPorts text")
            .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
            .exit()
            .remove();

        nodes
            .selectAll("g.outputPorts text")
            .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
            .attr("class", getPortClass)
            .attr("x", getOutputPortPositionX)
            .attr("y", getOutputPortPositionY)
            .style("font-size", PORT_LABEL_FONT_SIZE + "px")
            .text(function (port : Port) {return port.getName()});

        nodes
            .selectAll("g.outputPorts circle")
            .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
            .enter()
            .select("g.outputPorts")
            .insert("circle");

        nodes
            .selectAll("g.outputPorts circle")
            .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
            .exit()
            .remove();

        nodes
            .selectAll("g.outputPorts circle")
            .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
            .attr("data-id", function(port : Port){return port.getId();})
            .attr("cx", getOutputPortCirclePositionX)
            .attr("cy", getOutputPortCirclePositionY)
            .attr("r", 6)
            .attr("data-node-key", function(port : Port){return port.getNodeKey();})
            .on("mouseenter", mouseEnterPort)
            .on("mouseleave", mouseLeavePort);

        // outputLocalPorts
        nodes
            .selectAll("g.outputLocalPorts")
            .attr("transform", getOutputLocalPortGroupTransform)
            .style("display", getPortsDisplay);

        nodes
            .selectAll("g.outputLocalPorts text")
            .data(function(node : Node){return node.getOutputApplicationInputPorts();})
            .enter()
            .select("g.outputLocalPorts")
            .insert("text");

        nodes
            .selectAll("g.outputLocalPorts text")
            .data(function(node : Node){return node.getOutputApplicationInputPorts();})
            .exit()
            .remove();

        nodes
            .selectAll("g.outputLocalPorts text")
            .data(function(node : Node){return node.getOutputApplicationInputPorts();})
            .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
            .attr("x", getOutputLocalPortPositionX)
            .attr("y", getOutputLocalPortPositionY)
            .style("font-size", PORT_LABEL_FONT_SIZE + "px")
            .text(function (port : Port) {return port.getName();});

        nodes
            .selectAll("g.outputLocalPorts circle")
            .data(function(node : Node){return node.getOutputApplicationInputPorts();})
            .enter()
            .select("g.outputLocalPorts")
            .insert("circle");

        nodes
            .selectAll("g.outputLocalPorts circle")
            .data(function(node : Node){return node.getOutputApplicationInputPorts();})
            .exit()
            .remove();

        nodes
            .selectAll("g.outputLocalPorts circle")
            .data(function(node : Node){return node.getOutputApplicationInputPorts();})
            .attr("data-id", function(port : Port){return port.getId();})
            .attr("cx", getOutputLocalPortCirclePositionX)
            .attr("cy", getOutputLocalPortCirclePositionY)
            .attr("r", 6)
            .attr("data-node-key", function(port : Port){return port.getNodeKey();})
            .on("mouseenter", mouseEnterPort)
            .on("mouseleave", mouseLeavePort);

        // exitPorts
        nodes
            .selectAll("g.exitPorts")
            .attr("transform", getExitPortGroupTransform)
            .style("display", getPortsDisplay);

        nodes
            .selectAll("g.exitPorts text")
            .data(function(node : Node){return node.getExitApplicationOutputPorts();})
            .enter()
            .select("g.exitPorts")
            .insert("text");

        nodes
            .selectAll("g.exitPorts text")
            .data(function(node : Node){return node.getExitApplicationOutputPorts();})
            .exit()
            .remove();

        nodes
            .selectAll("g.exitPorts text")
            .data(function(node : Node){return node.getExitApplicationOutputPorts();})
            .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
            .attr("x", getExitPortPositionX)
            .attr("y", getExitPortPositionY)
            .style("font-size", PORT_LABEL_FONT_SIZE + "px")
            .text(function (port : Port) {return port.getName()});

        nodes
            .selectAll("g.exitPorts circle")
            .data(function(node : Node){return node.getExitApplicationOutputPorts();})
            .enter()
            .select("g.exitPorts")
            .insert("circle");

        nodes
            .selectAll("g.exitPorts circle")
            .data(function(node : Node){return node.getExitApplicationOutputPorts();})
            .exit()
            .remove();

        nodes
            .selectAll("g.exitPorts circle")
            .data(function(node : Node){return node.getExitApplicationOutputPorts();})
            .attr("data-id", function(port : Port){return port.getId();})
            .attr("cx", getExitPortCirclePositionX)
            .attr("cy", getExitPortCirclePositionY)
            .attr("r", 6)
            .attr("data-node-key", function(port : Port){return port.getNodeKey();})
            .on("mouseenter", mouseEnterPort)
            .on("mouseleave", mouseLeavePort);


        // exitLocalPorts
        nodes
            .selectAll("g.exitLocalPorts")
            .attr("transform", getExitLocalPortGroupTransform)
            .style("display", getPortsDisplay);

        nodes
            .selectAll("g.exitLocalPorts text")
            .data(function(node : Node){return node.getExitApplicationInputPorts();})
            .enter()
            .select("g.exitLocalPorts")
            .insert("text");

        nodes
            .selectAll("g.exitLocalPorts text")
            .data(function(node : Node){return node.getExitApplicationInputPorts();})
            .exit()
            .remove();

        nodes
            .selectAll("g.exitLocalPorts text")
            .data(function(node : Node){return node.getExitApplicationInputPorts();})
            .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
            .attr("x", getExitLocalPortPositionX)
            .attr("y", getExitLocalPortPositionY)
            .style("font-size", PORT_LABEL_FONT_SIZE + "px")
            .text(function (port : Port) {return port.getName();});

        nodes
            .selectAll("g.exitLocalPorts circle")
            .data(function(node : Node){return node.getExitApplicationInputPorts();})
            .enter()
            .select("g.exitLocalPorts")
            .insert("circle");

        nodes
            .selectAll("g.exitLocalPorts circle")
            .data(function(node : Node){return node.getExitApplicationInputPorts();})
            .exit()
            .remove();

        nodes
            .selectAll("g.exitLocalPorts circle")
            .data(function(node : Node){return node.getExitApplicationInputPorts();})
            .attr("data-id", function(port : Port){return port.getId();})
            .attr("cx", getExitLocalPortCirclePositionX)
            .attr("cy", getExitLocalPortCirclePositionY)
            .attr("r", 6)
            .attr("data-node-key", function(port : Port){return port.getNodeKey();})
            .on("mouseenter", mouseEnterPort)
            .on("mouseleave", mouseLeavePort);


        // update attributes of all links
        linkExtras
            .attr("class", "linkExtra")
            .attr("d", createLink)
            .attr("fill", "transparent")
            .attr("stroke", "transparent")
            .attr("stroke-width", "10px")
            .style("display", getEdgeDisplay);

        // update attributes of all links
        links
            .attr("class", "link")
            .attr("d", createLink)
            .attr("stroke", edgeGetStrokeColor)
            .attr("stroke-dasharray", edgeGetStrokeDashArray)
            .attr("fill", "transparent")
            .attr("marker-end", getArrowType)
            .style("display", getEdgeDisplay);

        // update attributes of all comment links
        commentLinks
            .attr("class", "commentLink")
            .attr("d", createCommentLink)
            .attr("stroke", LINK_COLORS["LINK_DEFAULT_COLOR"])
            .attr("fill", "transparent")
            .attr("marker-end", "ur(#LINK_DEFAULT_COLOR)")
            .style("display", getCommentLinkDisplay);

        // dragging link
        if (isDraggingPort){
            const tempEdge: Edge = new Edge(sourceNodeKey, sourcePortId, 0, "", "", false);
            const x1 : number = edgeGetX1(tempEdge);
            const y1 : number = edgeGetY1(tempEdge);
            let x2 : number = DISPLAY_TO_REAL_POSITION_X(mousePosition.x); //d2r?
            let y2 : number = DISPLAY_TO_REAL_POSITION_Y(mousePosition.y);

            // offset x2/y2 so that the draggingLink is not right underneath the cursor (interfering with mouseenter/mouseleave events)
            if (x1 > x2)
                x2 += 4;
            else
                x2 -= 4;
            if (y1 > y2)
                y2 += 4;
            else
                y2 -= 4;

            // TODO: this is kind of hacky, creating a single-use edge just so that we can determine it's starting position
            draggingLink.attr("x1", x1)
                        .attr("y1", y1)
                        .attr("x2", x2)
                        .attr("y2", y2)
                        .attr("stroke", draggingEdgeGetStrokeColor);
        } else {
            draggingLink.attr("x1", 0)
                        .attr("y1", 0)
                        .attr("x2", 0)
                        .attr("y2", 0)
                        .attr("stroke", "none");
        }

        // selection region
        // make sure to send the lesser of the two coordinates as the top left point
        selectionRegion
            .attr("width", Math.abs(selectionRegionEnd.x - selectionRegionStart.x))
            .attr("height", Math.abs(selectionRegionEnd.y - selectionRegionStart.y))
            .attr("x", selectionRegionStart.x <= selectionRegionEnd.x ? selectionRegionStart.x : selectionRegionEnd.x)
            .attr("y", selectionRegionStart.y <= selectionRegionEnd.y ? selectionRegionStart.y : selectionRegionEnd.y)
            .attr("stroke", "black")
            .attr("fill", "transparent")
            .style("display", "inline");

        const elapsedTime = performance.now() - startTime;
        if (elapsedTime > eagle.rendererFrameMax){eagle.rendererFrameMax = elapsedTime;}
        eagle.rendererFrameDisplay("tick " + elapsedTime.toFixed(2) + "ms (max " + eagle.rendererFrameMax.toFixed(2) + "ms) Renders " + eagle.rendererFrameCountRender + " Ticks " + eagle.rendererFrameCountTick);
    }

    function selectEdge(edge : Edge, addToSelection: boolean){
        if (edge !== null){
            if (addToSelection){
                eagle.editSelection(Eagle.RightWindowMode.Inspector, edge, Eagle.FileType.Graph);
            } else {
                eagle.setSelection(Eagle.RightWindowMode.Inspector, edge, Eagle.FileType.Graph);
            }
        }
    }

    function selectNode(node : Node, addToSelection: boolean){
        if (node !== null){
            if (addToSelection){
                eagle.editSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Graph);
            } else {
                eagle.setSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Graph);
            }
        }
    }

    function buildTranslation(x : number, y : number) : string {
        return "translate(" + x.toString() + "," + y.toString() + ")";
    }

    function getContentText(data : Node) : string {
        return data.getCustomData();
    }

    function rootScaleTranslation(data : Node) : string {
        //console.log("rootScaleTranslation()", eagle.globalOffsetX, eagle.globalOffsetY, eagle.globalScale);
        return "translate(" + eagle.globalOffsetX + "," + eagle.globalOffsetY + ")scale(" + eagle.globalScale + ")";
    }

    function nodeGetTranslation(data : Node) : string {
        //return buildTranslation(REAL_TO_DISPLAY_POSITION_X(data.getPosition().x), REAL_TO_DISPLAY_POSITION_Y(data.getPosition().y));
        return buildTranslation(data.getPosition().x, data.getPosition().y);
    }

    function getX(node : Node) : number {
        return node.getPosition().x;
    }

    function getY(node : Node) : number {
        return node.getPosition().y;
    }

    function getWidth(node : Node) : number {
        return node.getDisplayWidth();
    }

    function getHeight(node : Node) : number {
        return node.getDisplayHeight();
    }

    function getIconLocationX(node : Node) : number {
        return node.getWidth()/2 - Node.DATA_COMPONENT_WIDTH/2;
    }

    function getIconLocationY(node : Node) : number {
        return Node.DATA_COMPONENT_HEIGHT/4;
    }

    function getHeaderBackgroundDisplay(node : Node) : string {
        // don't show header background for comment, description and ExclusiveForceNode nodes
        if (node.getCategory() === Eagle.Category.Comment ||
            node.getCategory() === Eagle.Category.Description ||
            node.getCategory() === Eagle.Category.ExclusiveForceNode ||
            node.getCategory() === Eagle.Category.Branch) {
            return "none";
        }

        return node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts() ? "none" : "inline";
    }

    function getHeaderBackgroundWidth(node : Node) : number {
        return getWidth(node) - HEADER_INSET*2;
    }

    function getHeaderBackgroundHeight(node : Node) : number {
        if (node.isGroup() && node.isCollapsed()){
            return Node.COLLAPSED_HEIGHT - HEADER_INSET*2;
        }

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return Node.DATA_COMPONENT_HEIGHT;
        }

        // default height
        return 8 + (20 * node.getNameNumLines(node.getDisplayWidth()));
    }

    function getHeaderDisplay(node : Node) : string {
        // don't show header background for comment and description nodes
        if (node.getCategory() === Eagle.Category.Comment || node.getCategory() === Eagle.Category.Description){
            return "none";
        } else {
            return "inline";
        }
    }

    function getHeaderText(data : Node) : string {
        return data.getName();
    }

    function getHeaderPositionX(node : Node) : number {

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return node.getWidth()/2;
        }

        return getWidth(node) /2;
    }

    function getHeaderPositionY(node : Node) : number {
        if (node.isGroup() && node.isCollapsed()){

            // decide how many lines this will be and move upwards some amount
            if (node.getNameNumLines(node.getDisplayWidth()) > 1){
                return Node.COLLAPSED_HEIGHT / 3;
            }


            return Node.COLLAPSED_HEIGHT / 2;
        }

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            switch(node.getCategory()){
                case Eagle.Category.Memory:
                    return HEADER_OFFSET_Y_MEMORY;
                case Eagle.Category.File:
                    return HEADER_OFFSET_Y_FILE;
                case Eagle.Category.S3:
                    return HEADER_OFFSET_Y_S3;
                case Eagle.Category.NGAS:
                    return HEADER_OFFSET_Y_NGAS;
                case Eagle.Category.Plasma:
                    return HEADER_OFFSET_Y_PLASMA;
                case Eagle.Category.PlasmaFlight:
                    return HEADER_OFFSET_Y_PLASMA;
            }
        }

        if (node.getCategory() === Eagle.Category.Branch){
            return 54;
        }

        return 20;
    }

    function getHeaderFill(node : Node) : string {
        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return "black";
        }

        if (node.getCategory() === Eagle.Category.ExclusiveForceNode){
            return "black";
        }

        return "white";
    }

    function getHeaderFontWeight(node : Node) : string {
        //if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts() &&  eagle.objectIsSelected(node)){
        if (eagle.objectIsSelected(node)){
            return "bold";
        }

        return "normal";
    }

    function getSubHeaderDisplay(node : Node) : string {
        // don't show header background for comment and description nodes
        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return "inline";
        } else {
            return "none";
        }
    }

    function getSubHeaderText(data : Node) : string {
        return "";
    }

    function getSubHeaderPositionY(node : Node) : number {
        if (node.isGroup() && node.isCollapsed()){
            return Node.COLLAPSED_HEIGHT / 2;
        }

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            let y = (3 * Node.DATA_COMPONENT_HEIGHT / 2);

            switch (node.getCategory()){
                case Eagle.Category.Memory:
                    y += SUBHEADER_OFFSET_Y_MEMORY;
                    break;
                case Eagle.Category.File:
                    y +=  SUBHEADER_OFFSET_Y_FILE;
                    break;
                case Eagle.Category.S3:
                    y += SUBHEADER_OFFSET_Y_S3;
                    break;
                case Eagle.Category.NGAS:
                    y += SUBHEADER_OFFSET_Y_NGAS;
                    break;
                case Eagle.Category.Plasma:
                    y += SUBHEADER_OFFSET_Y_PLASMA;
                    break;
                case Eagle.Category.PlasmaFlight:
                    y += SUBHEADER_OFFSET_Y_PLASMA;
                    break;
            }

            return y;
        }

        return 20;
    }

    function getAppsBackgroundDisplay(node : Node) : string {
        // if node is collapsed, return 'none'
        if (node.isCollapsed()){
            return "none";
        }

        // if node has input or output apps, return 'inline' else 'none'
        if (Node.canHaveInputApp(node) || Node.canHaveOutputApp(node) ){
            return "inline";
        }

        return "none";
    }

    function getAppsBackgroundWidth(node : Node) : number {
        return getWidth(node) - HEADER_INSET*2;
    }

    function getAppsBackgroundHeight(node : Node) : number {
        if (node.isGroup() && node.isCollapsed()){
            return Node.COLLAPSED_HEIGHT;
        }

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return Node.DATA_COMPONENT_HEIGHT;
        }

        // default height
        return APPS_HEIGHT;
    }

    function getInputAppText(node:Node) : string {
        if (!Node.canHaveInputApp(node)){
            return "";
        }

        const inputApplication : Node = node.getInputApplication();

        if (typeof inputApplication === "undefined" || inputApplication === null){
            return Node.NO_APP_STRING;
        }

        return inputApplication.getName();
    }

    function getInputAppPositionX(node : Node) : number {
        return 8;
    }

    function getInputAppPositionY(node : Node) : number {
        return getHeaderBackgroundHeight(node) + 20;
    }

    function getOutputAppText(node:Node) : string {
        if (!Node.canHaveOutputApp(node)){
            return "";
        }

        const outputApplication : Node = node.getOutputApplication();

        if (typeof outputApplication === "undefined" || outputApplication === null){
            return Node.NO_APP_STRING;
        }

        return outputApplication.getName();
    }

    function getOutputAppPositionX(node : Node) : number {
        return node.getWidth() - 8;
    }

    function getOutputAppPositionY(node : Node) : number {
        return getHeaderBackgroundHeight(node) + 20;
    }

    function getExitAppText(node:Node) : string {
        if (!Node.canHaveExitApp(node)){
            return "";
        }

        const exitApplication : Node = node.getExitApplication();

        if (typeof exitApplication === "undefined" || exitApplication === null){
            return Node.NO_APP_STRING;
        }

        return exitApplication.getName();
    }

    function getExitAppPositionX(node : Node) : number {
        return node.getWidth() - 8;
    }

    function getExitAppPositionY(node : Node) : number {
        return getHeaderBackgroundHeight(node) + 20;
    }

    function getInputPortGroupClass(node : Node) : string {
        if (node.isFlipPorts()){
            return "inputPorts flipped";
        } else {
            return "inputPorts no-flip";
        }
    }

    function getOutputPortGroupClass(node : Node) : string {
        if (node.isFlipPorts()){
            return "outputPorts flipped";
        } else {
            return "outputPorts no-flip";
        }
    }

    function getExitPortGroupClass(node : Node) : string {
        if (node.isFlipPorts()){
            return "exitPorts flipped";
        } else {
            return "exitPorts no-flip";
        }
    }

    function getInputLocalPortGroupClass(node : Node) : string {
        if (node.isFlipPorts()){
            return "inputLocalPorts flipped";
        } else {
            return "inputLocalPorts no-flip";
        }
    }

    function getOutputLocalPortGroupClass(node : Node) : string {
        if (node.isFlipPorts()){
            return "outputLocalPorts flipped";
        } else {
            return "outputLocalPorts no-flip";
        }
    }

    function getExitLocalPortGroupClass(node : Node) : string {
        if (node.isFlipPorts()){
            return "exitLocalPorts flipped";
        } else {
            return "exitLocalPorts no-flip";
        }
    }

    function getPortClass(port : Port, index: number): string {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);
        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return "";
        }

        if (node.isBranch()){
            if (index === 0){
                return port.isEvent() ? "event middle" : "middle";
            }
            if (index === 1){
                return port.isEvent() ? "event" : "";
            }
        }

        return port.isEvent() ? "event" : "";
    }

    function getInputPortGroupTransform(node : Node) : string {
        if (node.isBranch()){
            return buildTranslation(0, 0);
        }

        if (node.isFlipPorts()){
            return getRightSidePortGroupTransform(node);
        } else {
            return getLeftSidePortGroupTransform(node);
        }
    }

    function getOutputPortGroupTransform(node : Node) : string {
        if (node.isBranch()){
            return buildTranslation(0, 0);
        }

        if (node.isFlipPorts()){
            return getLeftSidePortGroupTransform(node);
        } else {
            return getRightSidePortGroupTransform(node);
        }
    }

    function getExitPortGroupTransform(node : Node) : string {
        if (node.isFlipPorts()){
            return getLeftSidePortGroupTransform(node);
        } else {
            return getRightSidePortGroupTransform(node);
        }
    }

    function getInputLocalPortGroupTransform(node : Node) : string {
        if (node.isFlipPorts()){
            return getRightSideLocalPortGroupTransform(node);
        } else {
            return getLeftSideLocalPortGroupTransform(node);
        }
    }

    function getOutputLocalPortGroupTransform(node : Node) : string {
        if (node.isFlipPorts()){
            return getLeftSideLocalPortGroupTransform(node);
        } else {
            return getRightSideLocalPortGroupTransform(node);
        }
    }

    function getExitLocalPortGroupTransform(node : Node) : string {
        if (node.isFlipPorts()){
            return getLeftSideLocalPortGroupTransform(node);
        } else {
            return getRightSideLocalPortGroupTransform(node);
        }
    }

    function getLeftSidePortGroupTransform(node : Node) : string {
        if (Node.canHaveInputApp(node) || Node.canHaveOutputApp(node) || Node.canHaveExitApp(node)){
            return buildTranslation(PORT_OFFSET_X, getHeaderBackgroundHeight(node) + APPS_HEIGHT);
        } else {
            return buildTranslation(PORT_OFFSET_X, getHeaderBackgroundHeight(node));
        }
    }

    function getRightSidePortGroupTransform(node : Node) : string {
        if (Node.canHaveInputApp(node) || Node.canHaveOutputApp(node) || Node.canHaveExitApp(node)){
            return buildTranslation(getWidth(node)-PORT_OFFSET_X, getHeaderBackgroundHeight(node) + APPS_HEIGHT);
        } else {
            return buildTranslation(getWidth(node)-PORT_OFFSET_X, getHeaderBackgroundHeight(node));
        }
    }

    function getLeftSideLocalPortGroupTransform(node : Node) : string {
        if (Node.canHaveInputApp(node) || Node.canHaveOutputApp(node) || Node.canHaveExitApp(node)){
            return buildTranslation(PORT_OFFSET_X, getHeaderBackgroundHeight(node) + APPS_HEIGHT + node.getInputApplicationInputPorts().length * PORT_HEIGHT);
        } else {
            return buildTranslation(PORT_OFFSET_X, getHeaderBackgroundHeight(node) + node.getInputPorts().length * PORT_HEIGHT);
        }
    }

    function getRightSideLocalPortGroupTransform(node : Node) : string {
        if (Node.canHaveInputApp(node) || Node.canHaveOutputApp(node) || Node.canHaveExitApp(node)){
            return buildTranslation(getWidth(node)-PORT_OFFSET_X, getHeaderBackgroundHeight(node) + APPS_HEIGHT + (node.getOutputApplicationOutputPorts().length + node.getExitApplicationOutputPorts().length) * PORT_HEIGHT);
        } else {
            return buildTranslation(getWidth(node)-PORT_OFFSET_X, getHeaderBackgroundHeight(node) + node.getOutputPorts().length * PORT_HEIGHT);
        }
    }

    // TODO: one level of indirection here (getInput/Output -> getLeft/Right -> position)
    function getInputPortPositionX(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getLeftSidePortPositionX(port, index);
        }

        if (node.isBranch()){
            const numPorts = node.getInputApplicationInputPorts().length;
            return 100 - 76 * portIndexRatio(index, numPorts);
        }

        if (node.isFlipPorts()){
            return getRightSidePortPositionX(port, index);
        } else {
            return getLeftSidePortPositionX(port, index);
        }
    }

    function getInputPortPositionY(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getPortPositionY(port, index);
        }

        if (node.isBranch()){
            const numPorts = node.getInputApplicationInputPorts().length;
            return 24 + 30 * portIndexRatio(index, numPorts);
        }

        return getPortPositionY(port, index);
    }

    function getOutputPortPositionX(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getRightSidePortPositionX(port, index);
        }

        if (node.isBranch()){
            if (index === 0){
                return 200 / 2;
            }
            if (index === 1){
                return 200 - 24;
            }
        }

        if (node.isFlipPorts()){
            return getLeftSidePortPositionX(port, index);
        } else {
            return getRightSidePortPositionX(port, index);
        }
    }

    function getOutputPortPositionY(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getPortPositionY(port, index);
        }

        if (node.isBranch()){
            if (index === 0){
                return 100 - 16;
            }
            if (index === 1){
                return 54;
            }
        }

        return getPortPositionY(port, index);
    }

    function getExitPortPositionX(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getRightSidePortPositionX(port, index);
        }

        if (node.isFlipPorts()){
            return getLeftSidePortPositionX(port, index);
        } else {
            return getRightSidePortPositionX(port, index);
        }
    }

    function getExitPortPositionY(port : Port, index : number) : number {
        return getPortPositionY(port, index);
    }

    function getInputLocalPortPositionX(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getLeftSidePortPositionX(port, index);
        }

        if (node.isBranch()){
            if (index === 0){
                return 200 / 2;
            }
            if (index === 1){
                return 200 - 24;
            }
        }

        if (node.isFlipPorts()){
            return getRightSidePortPositionX(port, index);
        } else {
            return getLeftSidePortPositionX(port, index);
        }
    }

    function getInputLocalPortPositionY(port : Port, index : number) : number {
        return getPortPositionY(port, index);
    }

    function getOutputLocalPortPositionX(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getRightSidePortPositionX(port, index);
        }

        if (node.isFlipPorts()){
            return getLeftSidePortPositionX(port, index);
        } else {
            return getRightSidePortPositionX(port, index);
        }
    }

    function getOutputLocalPortPositionY(port : Port, index : number) : number {
        return getPortPositionY(port, index);
    }

    function getExitLocalPortPositionX(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getRightSidePortPositionX(port, index);
        }

        if (node.isFlipPorts()){
            return getLeftSidePortPositionX(port, index);
        } else {
            return getRightSidePortPositionX(port, index);
        }
    }

    function getExitLocalPortPositionY(port : Port, index : number) : number {
        return getPortPositionY(port, index);
    }

    function getLeftSidePortPositionX(port : Port, index : number) : number {
        return 20;
    }

    function getPortPositionY(port : Port, index : number) : number {
        return (index + 1) * PORT_HEIGHT;
    }

    function getRightSidePortPositionX(port : Port, index : number) : number {
        return -20;
    }




    // port circle positions
    function getInputPortCirclePositionX(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getLeftSidePortCirclePositionX(port, index);
        }

        if (node.isBranch()){
            const numPorts = node.getInputPorts().length;
            return 100 - 100 * portIndexRatio(index, numPorts);
        }

        if (node.isFlipPorts()){
            return getRightSidePortCirclePositionX(port, index);
        } else {
            return getLeftSidePortCirclePositionX(port, index);
        }
    }
    function getInputPortCirclePositionY(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getPortCirclePositionY(port, index);
        }

        if (node.isBranch()){
            const numPorts = node.getInputPorts().length;
            return 50 * portIndexRatio(index, numPorts);
        }

        return getPortCirclePositionY(port, index);
    }
    function getOutputPortCirclePositionX(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getRightSidePortCirclePositionX(port, index);
        }

        if (node.isBranch()){
            if (index === 0){
                return 200 / 2;
            }
            if (index === 1){
                return 200;
            }
        }

        if (node.isFlipPorts()){
            return getLeftSidePortCirclePositionX(port, index);
        } else {
            return getRightSidePortCirclePositionX(port, index);
        }
    }
    function getOutputPortCirclePositionY(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getPortCirclePositionY(port, index);
        }

        if (node.isBranch()){
            // TODO: magic number
            if (index === 0){
                return 100;
            }
            if (index === 1){
                return 100 / 2;
            }
        }

        return getPortCirclePositionY(port, index);
    }
    function getExitPortCirclePositionX(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getRightSidePortCirclePositionX(port, index);
        }

        if (node.isFlipPorts()){
            return getLeftSidePortCirclePositionX(port, index);
        } else {
            return getRightSidePortCirclePositionX(port, index);
        }
    }
    function getExitPortCirclePositionY(port : Port, index : number) : number {
        return getPortCirclePositionY(port, index);
    }
    function getInputLocalPortCirclePositionX(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getLeftSidePortCirclePositionX(port, index);
        }

        if (node.isFlipPorts()){
            return getRightSidePortCirclePositionX(port, index);
        } else {
            return getLeftSidePortCirclePositionX(port, index);
        }
    }
    function getInputLocalPortCirclePositionY(port : Port, index : number) : number {
        return getPortCirclePositionY(port, index);
    }
    function getOutputLocalPortCirclePositionX(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getRightSidePortCirclePositionX(port, index);
        }

        if (node.isFlipPorts()){
            return getLeftSidePortCirclePositionX(port, index);
        } else {
            return getRightSidePortCirclePositionX(port, index);
        }
    }
    function getOutputLocalPortCirclePositionY(port : Port, index : number) : number {
        return getPortCirclePositionY(port, index);
    }
    function getExitLocalPortCirclePositionX(port : Port, index : number) : number {
        const node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getRightSidePortCirclePositionX(port, index);
        }

        if (node.isFlipPorts()){
            return getLeftSidePortCirclePositionX(port, index);
        } else {
            return getRightSidePortCirclePositionX(port, index);
        }
    }
    function getExitLocalPortCirclePositionY(port : Port, index : number) : number {
        return getPortCirclePositionY(port, index);
    }

    function getLeftSidePortCirclePositionX(port : Port, index : number) : number {
        return 8;
    }

    function getPortCirclePositionY(port : Port, index : number) : number {
        return (index + 1) * PORT_HEIGHT - 5;
    }

    function getRightSidePortCirclePositionX(port : Port, index : number) : number {
        return -8;
    }





    function getContentPositionX(node : Node) : number {
        // left justified
        return 8;
    }

    function getContentPositionY(node : Node) : number {
        // top
        return 16;
    }

    function getContentFill() : string {
        return "black";
    }

    function getContentDisplay(node : Node) : string {
        // only show content for comment and description nodes
        if (node.getCategory() === Eagle.Category.Comment || node.getCategory() === Eagle.Category.Description){
            return "inline";
        } else {
            return "none";
        }
    }

    function getDataIcon(node : Node) : string {
        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            switch (node.getCategory()){
                case Eagle.Category.File:
                    return "/static/assets/svg/hard-drive.svg";
                case Eagle.Category.Memory:
                    return "/static/assets/svg/memory.svg";
                case Eagle.Category.S3:
                    return "/static/assets/svg/s3_bucket.svg";
                case Eagle.Category.NGAS:
                    return "/static/assets/svg/ngas.svg";
                case Eagle.Category.Plasma:
                    return "/static/assets/svg/plasma.svg";
                case Eagle.Category.PlasmaFlight:
                    return "/static/assets/svg/plasmaflight.svg";
                default:
                    console.warn("No icon available for node category", node.getCategory());
                    return "";
            }
        }

        return "";
    }

    function nodeGetColor(node : Node) : string {
        return node.getColor();
    }

    function nodeGetFill(node : Node) : string {
        //console.log("nodeGetFill() category", node.getCategory());

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return "none";
        }

        // no fill color for "ExclusiveForceNode" nodes
        if (node.getCategory() === Eagle.Category.ExclusiveForceNode){
            return "white";
        }

        return "rgba(180,180,180,1)";
    }

    function nodeGetStroke(node : Node) : string {
        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return "none";
        }

        if (eagle.objectIsSelected(node)){
            return "black";
        }

        return "grey";
    }

    function nodeGetStrokeDashArray(node: Node) : string {
        if (node.getCategory() === Eagle.Category.ExclusiveForceNode){
            return "8";
        }
        return "";
    }

    function findDepthOfNode(index: number, nodes : Node[]) : number {
        if (index >= nodes.length){
            console.warn("findDepthOfNode() with node index outside range of nodes. index:", index, "nodes.length", nodes.length);
            return 0;
        }

        let depth : number = 0;
        let node : Node = nodes[index];
        let nodeKey : number;
        let nodeParentKey : number = node.getParentKey();

        while (nodeParentKey != null){
            depth += 1;
            depth += node.getDrawOrderHint() / 10;
            nodeKey = node.getKey();
            nodeParentKey = node.getParentKey();

            if (nodeParentKey === null){
                return depth;
            }

            node = findNodeWithKey(nodeParentKey, nodes);

            if (node === null){
                console.error("Node", nodeKey, "has parentKey", nodeParentKey, "but call to findNodeWithKey(", nodeParentKey, ") returned null");
                return depth;
            }
        }

        depth += node.getDrawOrderHint() / 10;

        return depth;
    }

    function depthFirstTraversalOfNodes(nodes: Node[]) : Node[] {
        const indexPlusDepths : {index:number, depth:number}[] = [];
        const result : Node[] = [];

        // populate key plus depths
        for (let i = 0 ; i < nodes.length ; i++){
            const depth = findDepthOfNode(i, nodes);

            indexPlusDepths.push({index:i, depth:depth});
        }

        // sort nodes in depth ascending
        indexPlusDepths.sort(function(a, b){
            return a.depth - b.depth;
        });

        // write nodes to result in sorted order
        for (const indexPlusDepth of indexPlusDepths){
            result.push(nodes[indexPlusDepth.index]);
        }

        return result;
    }

    function findNodeWithKey(key: number, nodes: Node[]) : Node {
        if (key === null){
            return null;
        }

        for (const node of nodes){
            if (node.getKey() === key){
                return node;
            }

            // check if the node's inputApp has a matching key
            if (node.hasInputApplication()){
                if (node.getInputApplication().getKey() === key){
                    return node.getInputApplication();
                }
            }

            // check if the node's outputApp has a matching key
            if (node.hasOutputApplication()){
                if (node.getOutputApplication().getKey() === key){
                    return node.getOutputApplication();
                }
            }

            // check if the node's exitApp has a matching key
            if (node.hasExitApplication()){
                if (node.getExitApplication().getKey() === key){
                    return node.getExitApplication();
                }
            }
        }

        console.warn("Cannot find node with key", key);
        return null;
    }

    function getEdgeDisplay(edge : Edge) : string {
        const srcNode : Node = findNodeWithKey(edge.getSrcNodeKey(), nodeData);
        const destNode : Node = findNodeWithKey(edge.getDestNodeKey(), nodeData);

        if (srcNode === null || destNode === null){
            return "none";
        }

        if (findAncestorCollapsedNode(srcNode) !== null && findAncestorCollapsedNode(destNode) !== null){
            return "none";
        }

        // also collapse if source port is local port of collapsed node
        if (srcNode.hasLocalPortWithId(edge.getSrcPortId()) && srcNode.isCollapsed()){
            return "none";
        }

        return "inline";
    }

    function edgeGetX1(edge: Edge) : number {
        const node : Node = findNodeWithKey(edge.getSrcNodeKey(), nodeData);

        // check if an ancestor is collapsed, if so, use center of ancestor
        const collapsedAncestor : Node = findAncestorCollapsedNode(node);
        if (collapsedAncestor !== null){
            return collapsedAncestor.getPosition().x + Node.COLLAPSED_WIDTH;
        }

        if (node.isCollapsed() && !node.isData()){
            if (node.isBranch()){
                return node.getPosition().x + node.getWidth()/2;
            }

            if (node.isFlipPorts()){
                return node.getPosition().x;
            } else {
                return node.getPosition().x + node.getWidth();
            }
        }

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            if (node.isFlipPorts()){
                return node.getPosition().x + getIconLocationX(node);
            } else {
                return node.getPosition().x + getIconLocationX(node) + Node.DATA_COMPONENT_WIDTH;
            }
        }

        if (node.isBranch()){
            const portIndex = findNodePortIndex(node, edge.getSrcPortId());

            if (portIndex === 0){
                return node.getPosition().x + node.getWidth()/2;
            }
            if (portIndex === 1){
                return node.getPosition().x + node.getWidth();
            }
        }

        // check if node is an embedded app, if so, use position of the construct in which the app is embedded
        if (node.isEmbedded()){
            const containingConstruct : Node = findNodeWithKey(node.getEmbedKey(), nodeData);
            return findNodePortPosition(containingConstruct, edge.getSrcPortId(), true).x;
        }

        return findNodePortPosition(node, edge.getSrcPortId(), true).x;
    }

    function edgeGetY1(edge: Edge) : number {
        const node : Node = findNodeWithKey(edge.getSrcNodeKey(), nodeData);

        // check if an ancestor is collapsed, if so, use center of ancestor
        const collapsedAncestor : Node = findAncestorCollapsedNode(node);
        if (collapsedAncestor !== null){
            return collapsedAncestor.getPosition().y;
        }

        if (node.isCollapsed() && !node.isData()){
            if (node.isBranch()){
                return node.getPosition().y + 100;
            }

            return node.getPosition().y;
        }

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return node.getPosition().y + getIconLocationY(node) + Node.DATA_COMPONENT_HEIGHT/2;
        }


        if (node.isBranch()){
            const portIndex = findNodePortIndex(node, edge.getSrcPortId());

            if (portIndex === 0){
                // TODO: magic number
                return node.getPosition().y + 100;
            }
            if (portIndex === 1){
                // TODO: magic number
                return node.getPosition().y + 50;
            }
        }

        // check if node is an embedded app, if so, use position of the construct in which the app is embedded
        if (node.isEmbedded()){
            const containingConstruct : Node = findNodeWithKey(node.getEmbedKey(), nodeData);
            return findNodePortPosition(containingConstruct, edge.getSrcPortId(), true).y - PORT_ICON_HEIGHT;
        }

        return findNodePortPosition(node, edge.getSrcPortId(), true).y - PORT_ICON_HEIGHT;
    }

    function edgeGetX2(edge: Edge) : number {
        const node : Node = findNodeWithKey(edge.getDestNodeKey(), nodeData);

        // check if an ancestor is collapsed, if so, use center of ancestor
        const collapsedAncestor : Node = findAncestorCollapsedNode(node);
        if (collapsedAncestor !== null){
            return collapsedAncestor.getPosition().x;
        }

        if (node.isCollapsed() && !node.isData()){
            if (node.isBranch()){
                return node.getPosition().x + node.getWidth()/2;
            }

            if (node.isFlipPorts()){
                return node.getPosition().x + node.getWidth();
            } else {
                return node.getPosition().x;
            }
        }

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            if (node.isFlipPorts()){
                return node.getPosition().x + getIconLocationX(node) + Node.DATA_COMPONENT_WIDTH;
            } else {
                return node.getPosition().x + getIconLocationX(node);
            }
        }

        if (node.isBranch()){
            const portIndex = findNodePortIndex(node, edge.getDestPortId());
            const numPorts = node.getInputPorts().length;

            return node.getPosition().x + node.getWidth()/2 - node.getWidth()/2 * portIndexRatio(portIndex, numPorts);
        }

        // check if node is an embedded app, if so, use position of the construct in which the app is embedded
        if (node.isEmbedded()){
            const containingConstruct : Node = findNodeWithKey(node.getEmbedKey(), nodeData);
            return findNodePortPosition(containingConstruct, edge.getDestPortId(), false).x;
        }

        return findNodePortPosition(node, edge.getDestPortId(), false).x;
    }

    function edgeGetY2(edge: Edge) : number {
        const node : Node = findNodeWithKey(edge.getDestNodeKey(), nodeData);

        // check if an ancestor is collapsed, if so, use center of ancestor
        const collapsedAncestor : Node = findAncestorCollapsedNode(node);
        if (collapsedAncestor !== null){
            return collapsedAncestor.getPosition().y;
        }

        if (node.isCollapsed() && !node.isData()){
            if (node.isBranch()){
                return node.getPosition().y;
            }

            return node.getPosition().y;
        }

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return node.getPosition().y + getIconLocationY(node) + Node.DATA_COMPONENT_HEIGHT/2;
        }

        if (node.isBranch()){
            const portIndex = findNodePortIndex(node, edge.getDestPortId());
            const numPorts = node.getInputPorts().length;

            return node.getPosition().y + 50 * portIndexRatio(portIndex, numPorts);
        }

        // check if node is an embedded app, if so, use position of the construct in which the app is embedded
        if (node.isEmbedded()){
            const containingConstruct : Node = findNodeWithKey(node.getEmbedKey(), nodeData);
            return findNodePortPosition(containingConstruct, edge.getDestPortId(), false).y - PORT_ICON_HEIGHT;
        }

        return findNodePortPosition(node, edge.getDestPortId(), false).y - PORT_ICON_HEIGHT;
    }

    function portIndexRatio(portIndex: number, numPorts: number){
        if (numPorts <= 1){
            return 0;
        }

        return portIndex / (numPorts - 1);
    }

    function findNodePortPosition(node : Node, portId: string, inset: boolean) : {x: number, y: number} {
        let local : boolean;
        let input : boolean;
        let index : number;
        const flipped : boolean = node.isFlipPorts();
        const position = {x: node.getPosition().x, y: node.getPosition().y};

        // find the port within the node
        for (let i = 0 ; i < node.getInputPorts().length ; i++){
            const port : Port = node.getInputPorts()[i];
            if (port.getId() === portId){
                local = false;
                input = true;
                index = i;
            }
        }

        for (let i = 0 ; i < node.getOutputPorts().length ; i++){
            const port : Port = node.getOutputPorts()[i];
            if (port.getId() === portId){
                local = false;
                input = false;
                index = i;
            }
        }

        // check input application ports
        for (let i = 0 ; i < node.getInputApplicationInputPorts().length ; i++){
            const port : Port = node.getInputApplicationInputPorts()[i];
            if (port.getId() === portId){
                local = false;
                input = true;
                index = i;
            }
        }

        for (let i = 0 ; i < node.getInputApplicationOutputPorts().length ; i++){
            const port : Port = node.getInputApplicationOutputPorts()[i];
            if (port.getId() === portId){
                local = true;
                input = true;
                index = i + node.getInputApplicationInputPorts().length;
            }
        }

        // check output application ports
        for (let i = 0 ; i < node.getOutputApplicationInputPorts().length ; i++){
            const port : Port = node.getOutputApplicationInputPorts()[i];
            if (port.getId() === portId){
                local = true;
                input = false;
                index = i + node.getOutputApplicationOutputPorts().length;
            }
        }
        for (let i = 0 ; i < node.getOutputApplicationOutputPorts().length ; i++){
            const port : Port = node.getOutputApplicationOutputPorts()[i];
            if (port.getId() === portId){
                local = false;
                input = false;
                index = i;
            }
        }

        // check exit application ports
        for (let i = 0 ; i < node.getExitApplicationInputPorts().length ; i++){
            const port : Port = node.getExitApplicationInputPorts()[i];
            if (port.getId() === portId){
                local = true;
                input = false;
                index = i + node.getExitApplicationOutputPorts().length;
            }
        }
        for (let i = 0 ; i < node.getExitApplicationOutputPorts().length ; i++){
            const port : Port = node.getExitApplicationOutputPorts()[i];
            if (port.getId() === portId){
                local = false;
                input = false;
                index = i;
            }
        }

        // determine whether we need to move down an extra amount to clear the apps display title row
        let appsOffset : number = 0;
        if (Node.canHaveInputApp(node) || Node.canHaveOutputApp(node) || Node.canHaveExitApp(node)){
            appsOffset = APPS_HEIGHT;
        }

        const headerHeight: number = getHeaderBackgroundHeight(node);

        // translate the three pieces of info into the x,y position
        // outer if is an XOR
        if ((input && !flipped) || (!input && flipped)){
            // left hand side
            if (inset){
                position.x += PORT_INSET;
            }
            if (local){
                position.y += headerHeight + appsOffset + (node.getInputPorts().length + index + 1) * PORT_HEIGHT;
            } else {
                position.y += headerHeight + appsOffset + (index + 1) * PORT_HEIGHT;
            }
        } else {
            // right hand side
            if (inset){
                position.x += node.getWidth() - PORT_INSET;
            } else {
                position.x += node.getWidth();
            }
            if (local){
                position.y += headerHeight + appsOffset + (node.getOutputPorts().length + index + 1) * PORT_HEIGHT;
            } else {
                position.y += headerHeight + appsOffset + (index + 1) * PORT_HEIGHT;
            }
        }

        return position;
    }

    function findNodePortIndex(node: Node, portId: string){
        // find the port within the node
        for (let i = 0 ; i < node.getInputPorts().length ; i++){
            const port : Port = node.getInputPorts()[i];
            if (port.getId() === portId){
                return i;
            }
        }

        for (let i = 0 ; i < node.getOutputPorts().length ; i++){
            const port : Port = node.getOutputPorts()[i];
            if (port.getId() === portId){
                return i;
            }
        }

        return -1;
    }

    function edgeGetStrokeColor(edge: Edge, index: number) : string {
        let normalColor: string = LINK_COLORS['LINK_DEFAULT_COLOR'];
        let selectedColor: string = LINK_COLORS['LINK_DEFAULT_SELECTED_COLOR'];

        // check if source node is an event, if so, draw in blue
        const srcNode : Node = eagle.logicalGraph().findNodeByKey(edge.getSrcNodeKey());

        if (srcNode !== null){
            const srcPort : Port = srcNode.findPortById(edge.getSrcPortId());

            if (srcPort !== null && srcPort.isEvent()){
                normalColor = LINK_COLORS['LINK_EVENT_COLOR'];
                selectedColor = LINK_COLORS['LINK_EVENT_SELECTED_COLOR'];
            }
        }

        // check if link has a warning or is invalid
        const linkValid : Eagle.LinkValid = Edge.isValid(graph, edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.isLoopAware(), false, false);

        if (linkValid === Eagle.LinkValid.Invalid){
            normalColor = LINK_COLORS['LINK_INVALID_COLOR'];
            selectedColor = LINK_COLORS['LINK_INVALID_SELECTED_COLOR'];
        }

        if (linkValid === Eagle.LinkValid.Warning){
            normalColor = LINK_COLORS['LINK_WARNING_COLOR'];
            selectedColor = LINK_COLORS['LINK_WARNING_SELECTED_COLOR'];
        }
        return eagle.objectIsSelected(edge) ? selectedColor : normalColor;
    }

    function getArrowType(edge: Edge, index: number) {
        const x = edgeGetStrokeColor(edge, index)
        return "url(#"+Object.keys(LINK_COLORS).find(key => LINK_COLORS[key] === x)+")";
    }

    function edgeGetStrokeDashArray(edge: Edge, index: number) : string {
        const srcNode : Node  = eagle.logicalGraph().findNodeByKey(edge.getSrcNodeKey());
        const destNode : Node = eagle.logicalGraph().findNodeByKey(edge.getDestNodeKey());

        // if we can't find the edge
        if (srcNode === null){
            return "";
        }
        if (destNode === null){
            return "";
        }

        if (srcNode.isStreaming() || destNode.isStreaming()){
            return "8";
        } else {
            return "";
        }
    }

    function draggingEdgeGetStrokeColor(edge: Edge, index: number) : string {
        switch (isDraggingPortValid){
            case Eagle.LinkValid.Unknown:
                return "black";
            case Eagle.LinkValid.Invalid:
                return LINK_COLORS['LINK_INVALID_COLOR'];
            case Eagle.LinkValid.Warning:
                return LINK_COLORS['LINK_WARNING_COLOR'];
            case Eagle.LinkValid.Valid:
                return LINK_COLORS['LINK_VALID_COLOR'];
        }
    }

    function addEdge(srcNodeKey : number, srcPortId : string, destNodeKey : number, destPortId : string, dataType : string, loopAware: boolean) : void {
        console.log("addLink()", "port", srcPortId, "on node", srcNodeKey, "to port", destPortId, "on node", destNodeKey, "loopAware", loopAware);

        if (srcPortId === destPortId){
            console.warn("Abort addLink() from port to itself!");
            return;
        }

        graph.addEdge(srcNodeKey, srcPortId, destNodeKey, destPortId, dataType, loopAware, (edge : Edge) : void =>{
            eagle.logicalGraph.valueHasMutated();
            clearEdgeVars();
        });
    }

    function clearEdgeVars(){
        sourcePortId = null;
        sourceNodeKey = null;
        sourceDataType = null;
        destinationPortId = null;
        destinationNodeKey = null;
    }

    function edgeOnClick(edge : Edge, index : number){
        selectEdge(edge, d3.event.shiftKey);
        tick();
    }

    function createCommentLink(node : Node){
        // abort if node is not comment
        if (node.getCategory() !== Eagle.Category.Comment){
            return "";
        }

        // abort if comment node has no subject
        if (node.getSubjectKey() === null){
            return "";
        }

        // find subject node
        const subjectNode : Node = findNodeWithKey(node.getSubjectKey(), nodeData);

        let x1, y1, x2, y2;

        if (node.isFlipPorts()){
            x1 = REAL_TO_DISPLAY_POSITION_X(node.getPosition().x);
            y1 = REAL_TO_DISPLAY_POSITION_Y(node.getPosition().y);
        } else {
            x1 = REAL_TO_DISPLAY_POSITION_X(node.getPosition().x + node.getWidth());
            y1 = REAL_TO_DISPLAY_POSITION_Y(node.getPosition().y);
        }

        if (subjectNode.isFlipPorts()){
            x2 = REAL_TO_DISPLAY_POSITION_X(subjectNode.getPosition().x + subjectNode.getWidth());
            y2 = REAL_TO_DISPLAY_POSITION_Y(subjectNode.getPosition().y);
        } else {
            x2 = REAL_TO_DISPLAY_POSITION_X(subjectNode.getPosition().x);
            y2 = REAL_TO_DISPLAY_POSITION_Y(subjectNode.getPosition().y);
        }

        if (subjectNode.getCategoryType() === Eagle.CategoryType.Data && !subjectNode.isShowPorts()){
            if (node.isFlipPorts()){
                x2 = REAL_TO_DISPLAY_POSITION_X(subjectNode.getPosition().x + getIconLocationX(subjectNode) + Node.DATA_COMPONENT_WIDTH);
                y2 = REAL_TO_DISPLAY_POSITION_Y(subjectNode.getPosition().y + getIconLocationY(subjectNode) + Node.DATA_COMPONENT_HEIGHT/2);
            } else {
                x2 = REAL_TO_DISPLAY_POSITION_X(subjectNode.getPosition().x + getIconLocationX(subjectNode));
                y2 = REAL_TO_DISPLAY_POSITION_Y(subjectNode.getPosition().y + getIconLocationY(subjectNode) + Node.DATA_COMPONENT_HEIGHT/2);
            }
        }

        if (subjectNode.isBranch()){
            x2 = REAL_TO_DISPLAY_POSITION_X(subjectNode.getPosition().x + subjectNode.getWidth()/2);
            y2 = REAL_TO_DISPLAY_POSITION_Y(subjectNode.getPosition().y);
        }

        // determine incident directions for start and end of edge
        const startDirection = node.isFlipPorts() ? Eagle.Direction.Left : Eagle.Direction.Right;
        let endDirection = subjectNode.isFlipPorts() ? Eagle.Direction.Left : Eagle.Direction.Right;

        if (subjectNode.isBranch()){
            endDirection = Eagle.Direction.Down;
        }

        return createBezier(x1, y1, x2, y2, startDirection, endDirection);
    }

    function getCommentLinkDisplay(node : Node) : string {
        if (node.getCategory() !== Eagle.Category.Comment){
            return "none";
        }

        if (node.getSubjectKey() === null){
            return "none";
        }

        return "inline";
    }

    function directionOffset(x: boolean, direction: Eagle.Direction){
        if (x){
            switch (direction){
                case Eagle.Direction.Left:
                    return -50;
                case Eagle.Direction.Right:
                    return 50;
                default:
                    return 0;
            }
        } else {
            switch (direction){
                case Eagle.Direction.Up:
                    return -50;
                case Eagle.Direction.Down:
                    return 50;
                default:
                    return 0;
            }
        }
    }

    function createBezier(x1: number, y1: number, x2: number, y2: number, startDirection: Eagle.Direction, endDirection: Eagle.Direction) : string {
        // find control points
        const c1x = x1 + directionOffset(true, startDirection);
        const c1y = y1 + directionOffset(false, startDirection);
        const c2x = x2 - directionOffset(true, endDirection);
        const c2y = y2 - directionOffset(false, endDirection);

        return "M " + x1 + " " + y1 + " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + x2 + " " + y2;
    }

    function shrinkOnClick(node : Node, index : number){
        console.log("shrink node", index);

        eagle.logicalGraph().shrinkNode(node);
        eagle.logicalGraph.valueHasMutated();
    }

    function moveChildNodes(node: Node, deltax: number, deltay: number) : void {
        // get id of parent node
        const parentKey : number = node.getKey();

        // loop through all nodes, if they belong to the parent's group, move them too
        for (const n of nodeData){
            // skip selected nodes, they are handled in the main drag code
            if (eagle.objectIsSelected(n)){
                continue;
            }

            if (n.getParentKey() === parentKey){
                moveNode(n, deltax, deltay);
                moveChildNodes(n, deltax, deltay);
            }
        }
    }

    function moveNode(node : Node, deltax : number, deltay : number) : void {
        node.setPosition(getX(node) + deltax, getY(node) + deltay);
    }

    function findAncestorCollapsedNode(node : Node) : Node {
        let n : Node = node;
        let iterations = 0;

        while (true){
            if (iterations > 32){
                console.error("too many iterations in findAncestorCollapsedNode()");
                return null;
            }

            // debug
            if (n.getKey() === n.getParentKey()){
                console.error("node", n.getKey(), "is own parent! parentKey", n.getParentKey(), n.getName());
                return null;
            }

            iterations += 1;

            const oldKey : number = n.getKey();

            // move up one level (preference using the node's embed key, then the parent key)
            if (n.getEmbedKey() !== null){
                n = findNodeWithKey(n.getEmbedKey(), nodeData);
            } else {
                n = findNodeWithKey(n.getParentKey(), nodeData);
            }

            // if node is null, return "inline"
            if (n === null){
                return null;
            }
            else {
                if (n.getKey() === oldKey){
                    console.warn("move up did not move, aborting");
                    return null;
                }

                // if node is non-null, but collapsed, return "none"
                if (n.isCollapsed()){
                    return n;
                }
            }

            // otherwise continue while loop
        }
    }

    function getNodeDisplay(node : Node) : string {
        // hide if node has collapsed ancestor
        if (findAncestorCollapsedNode(node) !== null){
            return "none";
        }

        return "inline";
    }

    function getNodeRectDisplay(node: Node): string {
        if (node.isBranch()){
            return "none";
        }
        return "inline";
    }

    function getNodeCustomShapeDisplay(node: Node): string {
        if (node.isBranch()){
            return "inline";
        }
        return "none";
    }

    function getNodeCustomShapePoints(node: Node): string {
        switch(node.getCategory()){
            case Eagle.Category.Branch:
                const half_width = 200 / 2;
                const half_height = 100 / 2;

                return half_width + ", " + 0 + " " + half_width*2 + ", " + half_height + " " + half_width + ", " + half_height*2 + " " + 0 + ", " + half_height;
            default:
                return "";
        }
    }

    function getResizeControlDisplay(node : Node) : string {
        if (node.isCollapsed()){
            return "none";
        }

        return node.isResizable() ? "inline" : "none";
    }

    function getShrinkControlDisplay(node : Node) : string {
        if (SHRINK_BUTTONS_ENABLED){
            if (node.isGroup()){
                return node.isCollapsed() ? "none" : "inline";
            } else {
                return "none";
            }
        } else {
            return "none";
        }
    }

    // whether or not an object in the graph should be rendered or not
    function getPortsDisplay(node : Node) : string {
        if (node.isCollapsed()){
            return "none";
        }

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return "none";
        }

        return "inline";
    }

    // TODO: try to use LogicalGraph.checkForNodeAt() instead
    function checkForNodeAt(child: Node, x: number, y: number) : Node {
        for (let i = nodeData.length - 1; i >= 0 ; i--){
            const node : Node = nodeData[i];

            // abort if checking for self!
            if (node.getKey() === child.getKey()){
                continue;
            }

            // abort if node is not a group
            if (!node.isGroup()){
                continue;
            }

            // find bounds of possible parent
            const left: number = node.getPosition().x;
            const right: number = node.getPosition().x + getWidth(node);
            const top: number = node.getPosition().y;
            const bottom: number = node.getPosition().y + getHeight(node);

            // check if node is within bounds of possible parent
            if (x >= left && right >= x && y >= top && bottom >= y){
                return node;
            }
        }
        return null;
    }

    function findNodesInRegion(left: number, right: number, top: number, bottom: number): Node[] {
        const result: Node[] = [];

        // re-assign left, right, top, bottom in case selection region was not dragged in the typical NW->SE direction
        const realLeft = left <= right ? left : right;
        const realRight = left <= right ? right : left;
        const realTop = top <= bottom ? top : bottom;
        const realBottom = top <= bottom ? bottom : top;

        for (let i = nodeData.length - 1; i >= 0 ; i--){
            const node : Node = nodeData[i];
            const x : number = node.getPosition().x;
            const y : number = node.getPosition().y;

            if (x >= realLeft && realRight >= x && y >= realTop && realBottom >= y){
                result.push(node);
            }
        }

        return result;
    }

    function findEdgesContainedByNodes(edges: Edge[], nodes: Node[]): Edge[]{
        const result: Edge[] = [];

        for (const edge of edges){
            const srcKey = edge.getSrcNodeKey();
            const destKey = edge.getDestNodeKey();
            let srcFound = false;
            let destFound = false;

            for (const node of nodes){
                if ((node.getKey() === srcKey) ||
                    (node.hasInputApplication() && node.getInputApplication().getKey() === srcKey) ||
                    (node.hasOutputApplication() && node.getOutputApplication().getKey() === srcKey) ||
                    (node.hasExitApplication() && node.getExitApplication().getKey() === srcKey)){
                    srcFound = true;
                }

                if ((node.getKey() === destKey) ||
                    (node.hasInputApplication() && node.getInputApplication().getKey() === destKey) ||
                    (node.hasOutputApplication() && node.getOutputApplication().getKey() === destKey) ||
                    (node.hasExitApplication() && node.getExitApplication().getKey() === destKey)){
                    destFound = true;
                }
            }

            if (srcFound && destFound){
                result.push(edge);
            }
        }

        return result;
    }

    function mouseEnterPort(port : Port) : void {
        if (!isDraggingPort){
            return;
        }


        destinationPortId = port.getId();
        destinationNodeKey = port.getNodeKey();

        isDraggingPortValid = Edge.isValid(graph, sourceNodeKey, sourcePortId, destinationNodeKey, destinationPortId, true, true, true);
    }

    function mouseLeavePort(port : Port) : void {
        destinationPortId = null;
        destinationNodeKey = null;

        isDraggingPortValid = Eagle.LinkValid.Unknown;
    }

    function REAL_TO_DISPLAY_POSITION_X(x: number) : number {
        return eagle.globalOffsetX + (x * eagle.globalScale);
    }
    function REAL_TO_DISPLAY_POSITION_Y(y: number) : number {
        return eagle.globalOffsetY + (y * eagle.globalScale);
    }
    function REAL_TO_DISPLAY_SCALE(n: number, name: string = null) : number {

        if (name != null){
            console.log(name, n, eagle.globalScale, n * eagle.globalScale);
        }

        return n * eagle.globalScale;
    }
    function DISPLAY_TO_REAL_POSITION_X(x: number) : number {
        return (x - eagle.globalOffsetX)/eagle.globalScale;
    }
    function DISPLAY_TO_REAL_POSITION_Y(y: number) : number {
        return (y - eagle.globalOffsetY)/eagle.globalScale;
    }
    function DISPLAY_TO_REAL_SCALE(n: number) : number {
        return n / eagle.globalScale;
    }

    function printDrawOrder(ns : Node[]) : string {
        let s : string = "";

        // loop through all nodes, if they belong to the parent's group, move them too
        for (const node of ns){
            s += node.getKey() + ', ';
        }

        return s;
    }

    function getWrapWidth(node: Node) {
        if (node.isData()){
            return Number.POSITIVE_INFINITY;
        }

        return node.getDisplayWidth();
    }

    function wrap(text: any, padding: boolean) {
        text.each(function() {
            const text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                lineHeight = 1.1, // ems
                x = parseInt(text.attr("x"), 10),
                y = parseInt(text.attr("y"), 10),
                //dy = parseFloat(text.attr("dy")),
                dy = 0.0;

            let word;
            let wordWrapWidth = parseInt(text.attr("eagle-wrap-width"), 10);
            let line : string[] = [];
            let tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
            let lineNumber = 0;

            if (padding){
                wordWrapWidth = wordWrapWidth - x - x;
            }

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > wordWrapWidth) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
        });
    }

    // performance
    const elapsedTime = performance.now() - startTime;
    if (elapsedTime > eagle.rendererFrameMax){eagle.rendererFrameMax = elapsedTime;}
    eagle.rendererFrameDisplay("render " + elapsedTime.toFixed(2) + "ms (max " + eagle.rendererFrameMax.toFixed(2) + "ms) Renders " + eagle.rendererFrameCountRender + " Ticks " + eagle.rendererFrameCountTick);
}
