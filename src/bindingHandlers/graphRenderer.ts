import * as ko from "knockout";
import * as d3 from "d3";
import * as $ from "jquery";

import {Eagle} from '../Eagle';
import {LogicalGraph} from '../LogicalGraph';
import {Node} from '../Node';
import {Edge} from '../Edge';
import {Port} from '../Port';
import {Utils} from '../Utils';
import {Config} from '../Config';

ko.bindingHandlers.graphRenderer = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        //console.log("bindingHandlers.graphRenderer.init()");
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        //console.log("bindingHandlers.graphRenderer.update()");

        var graph : LogicalGraph = ko.unwrap(valueAccessor());

        if (graph === null){
            //console.warn("graphRenderer update(): graph is null");
            return;
        }

        $(element).empty();

        render(graph, element.id, bindingContext.$root);
    }
};

function render(graph: LogicalGraph, elementId : string, eagle : Eagle){
    // sort the nodes array so that groups appear first, this ensures that child nodes are drawn on top of the group their parents
    var nodeData : Node[] = depthFirstTraversalOfNodes(graph.getNodes());
    var linkData : Edge[] = graph.getEdges();

    var deltaX : number;
    var deltaY : number;
    var isDraggingNode : boolean = false;
    var sourcePortId : string | null = null;
    var sourceNodeKey : number | null = null;
    var sourceDataType : string | null = null;
    var destinationPortId : string | null = null;
    var destinationNodeKey : number | null = null;
    var isDraggingPort : boolean = false;
    var isDraggingPortValid : Eagle.LinkValid = Eagle.LinkValid.Unknown;
    var mousePosition = {x:0, y:0};

    const HEADER_HEIGHT : number = 28;
    const APPS_HEIGHT : number = 28;
    const PORT_HEIGHT : number = 24;

    const NODE_STROKE_WIDTH : number = 3;
    const HEADER_INSET : number = NODE_STROKE_WIDTH - 1;

    const PORT_OFFSET_X : number = 2;
    const PORT_ICON_HEIGHT : number = 8;
    const PORT_INSET : number = 10;

    const RESIZE_CONTROL_SIZE : number = 16;
    const SHRINK_BUTTON_SIZE : number = 16;
    const COLLAPSE_BUTTON_SIZE : number = 16;
    const EXPAND_BUTTON_SIZE : number = 16;

    const RESIZE_BUTTON_LABEL : string = "\u25F2";
    const SHRINK_BUTTON_LABEL : string = "\u21B9";
    const COLLAPSE_BUTTON_LABEL : string = "\u25BC";
    const EXPAND_BUTTON_LABEL : string = "\u25B2";

    const HEADER_TEXT_FONT_SIZE : number = 16;
    const CONTENT_TEXT_FONT_SIZE : number = 14;
    const PORT_LABEL_FONT_SIZE : number = 14;
    const RESIZE_BUTTON_LABEL_FONT_SIZE : number = 24;
    const HEADER_BUTTON_LABEL_FONT_SIZE : number = 12;

    const LINK_WARNING_COLOR : string = "orange";
    const LINK_INVALID_COLOR : string = "red";
    const LINK_VALID_COLOR : string = "limegreen";

    const SHRINK_BUTTONS_ENABLED : boolean = true;
    const COLLAPSE_BUTTONS_ENABLED : boolean = true;

    const HEADER_OFFSET_Y_MEMORY : number = 16;
    const SUBHEADER_OFFSET_Y_MEMORY : number = -6;
    const HEADER_OFFSET_Y_FILE : number = 4;
    const SUBHEADER_OFFSET_Y_FILE : number = 8;
    const HEADER_OFFSET_Y_S3 : number = 4;
    const SUBHEADER_OFFSET_Y_S3 : number = 8;
    const HEADER_OFFSET_Y_NGAS : number = 4;
    const SUBHEADER_OFFSET_Y_NGAS : number = 8;

    //console.log("pre-sort", printDrawOrder(graph.getNodes()));
    //console.log("render()", printDrawOrder(nodeData));

    var svgContainer = d3.select("#" + elementId)
                        .append("svg");

    // add def for markers
    var defs = svgContainer.append("defs");

    var black_arrowhead = defs
                            .append("marker")
                            .attr("id", "black-arrowhead")
                            .attr("viewBox", "0 0 10 10")
                            .attr("refX", "7")
                            .attr("refY", "5")
                            .attr("markerUnits", "strokeWidth")
                            .attr("markerWidth","8")
                            .attr("markerHeight", "6")
                            .attr("orient", "auto");

    black_arrowhead.append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 z")
            .attr("stroke", "none")
            .attr("fill","black");

    // add def for markers
    var grey_arrowhead = defs
                            .append("marker")
                            .attr("id", "grey-arrowhead")
                            .attr("viewBox", "0 0 10 10")
                            .attr("refX", "7")
                            .attr("refY", "5")
                            .attr("markerUnits", "strokeWidth")
                            .attr("markerWidth","8")
                            .attr("markerHeight", "6")
                            .attr("orient", "auto");

    grey_arrowhead.append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 z")
            .attr("stroke", "none")
            .attr("fill","grey");

    var background = svgContainer.append("rect")
                                    .attr("class", "background");

    var backgroundDragHandler = d3.drag()
                                    .on("end", function(){
                                        console.log("setSelection(null)");
                                        eagle.setSelection(eagle.rightWindowMode(), null);
                                    })
                                    .on("drag", function(){
                                        eagle.globalOffsetX += d3.event.dx;
                                        eagle.globalOffsetY += d3.event.dy;
                                        tick();
                                    });

    var backgroundZoomHandler = d3.zoom()
                                    .on("zoom", function(){
                                        //console.log("zoom");
                                        eagle.globalScale -= d3.event.sourceEvent.deltaY * (d3.event.sourceEvent.deltaMode ? 120 : 1) / 1500;
                                        tick();
                                    });

    backgroundDragHandler(svgContainer.selectAll("rect.background"));
    backgroundZoomHandler(svgContainer.selectAll("rect.background"));

    // TODO: ideally we would not use the 'any' type here
    var nodes : any = svgContainer.selectAll("g")
                              .data(nodeData)
                              .enter()
                              .append("g")
                              .attr("transform", nodeGetTranslation)
                              .attr("class", "node")
                              .attr("id", function(node : Node, index : number){return "node" + index;})
                              .style("display", getNodeDisplay);

    var rects = nodes.append("rect")
                              .attr("width", function(node:Node){return REAL_TO_DISPLAY_SCALE(getWidth(node));})
                              .attr("height", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeight(node));})
                              .style("display", getNodeRectDisplay)
                              .style("fill", nodeGetFill)
                              .style("stroke", nodeGetStroke)
                              .style("stroke-width", NODE_STROKE_WIDTH)
                              .attr("stroke-dasharray", nodeGetStrokeDashArray)
                              .on("click", nodeOnClick);

    var customShapes = nodes.append("polygon")
                              .attr("points", getNodeCustomShapePoints)
                              .style("display", getNodeCustomShapeDisplay)
                              .style("fill", nodeGetColor)
                              .style("stroke", nodeGetStroke)
                              .style("stroke-width", NODE_STROKE_WIDTH)
                              .attr("stroke-dasharray", nodeGetStrokeDashArray)
                              .on("click", nodeOnClick);

    var nodeDragHandler = d3.drag()
                            .on("start", function (node : Node, index : number) {
                                deltaX = getX(node) - d3.event.x;
                                deltaY = getY(node) - d3.event.y;
                                isDraggingNode = false;
                                selectNode(node);
                                tick();
                            })
                            .on("drag", function (node : Node, index : number) {
                                isDraggingNode = true;

                                var dx = DISPLAY_TO_REAL_SCALE(d3.event.dx);
                                var dy = DISPLAY_TO_REAL_SCALE(d3.event.dy);

                                //node.setPosition(d3.event.x + deltaX, d3.event.y + deltaY);
                                node.changePosition(dx, dy);

                                // update children locations
                                moveChildNodes(index, dx, dy);
                                eagle.flagActiveFileModified();
                                tick();
                            })
                            .on("end", function(node : Node){
                                // update location (in real node data, not sortedData)
                                // guarding this behind 'isDraggingNode' is a hack to get around the fact that d3.event.x and d3.event.y behave strangely
                                if (isDraggingNode){
                                    isDraggingNode = false;
                                }

                                //var x = DISPLAY_TO_REAL_POSITION_X(d3.event.x);
                                //var y = DISPLAY_TO_REAL_POSITION_Y(d3.event.y);

                                // disable this code that attempts to guess the parent based on the drop location, it fails too often
                                /*
                                var parent : Node = checkForNodeAt(x, y);
                                console.log("node drag end at display", d3.event.x, d3.event.y, "real", x, y, "found", parent);

                                if (parent !== null && node.getParentKey() !== parent.getKey() && node.getKey() !== parent.getKey()){
                                    //console.log("set parent", parent.getKey());
                                    node.setParentKey(parent.getKey());
                                    reOrderNodes(parent.getKey(), node.getKey());
                                    eagle.flagActiveDiagramHasMutated();
                                }

                                if (parent === null && node.getParentKey() !== null){
                                    //console.log("set parent", null);
                                    node.setParentKey(null);
                                    eagle.flagActiveDiagramHasMutated();
                                }
                                */

                                tick();
                            });

    nodeDragHandler(svgContainer.selectAll("g.node"));

    // add a header background to each node
    var headerBackgrounds = nodes.append("rect")
                                    .attr("class", "header-background")
                                    .attr("width", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeaderBackgroundWidth(node));})
                                    .attr("height", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeaderBackgroundHeight(node));})
                                    .attr("x", HEADER_INSET)
                                    .attr("y", HEADER_INSET)
                                    .style("fill", nodeGetColor)
                                    .style("stroke", "grey")
                                    .style("display", getHeaderBackgroundDisplay);

    // add a text header to each node
    var text = nodes.append("text")
                     .attr("class", "header")
                     .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeaderPositionX(node));})
                     .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeaderPositionY(node));})
                     .style("fill", getHeaderFill)
                     .style("font-size", REAL_TO_DISPLAY_SCALE(HEADER_TEXT_FONT_SIZE) + "px")
                     .style("display", getHeaderDisplay)
                     .text(getHeaderText);
                     //.call(wrap, COLLAPSED_NODE_WIDTH);

    var subHeader = nodes.append("text")
                    .attr("class", "subheader")
                    .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getSubHeaderPositionX(node));})
                    .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getSubHeaderPositionY(node));})
                    .style("fill", getSubHeaderFill)
                    .style("font-size", REAL_TO_DISPLAY_SCALE(HEADER_TEXT_FONT_SIZE) + "px")
                    .style("display", getSubHeaderDisplay)
                    .text(getSubHeaderText);

    // add a app names background to each node
    var appsBackgrounds = nodes.append("rect")
                                    .attr("class", "apps-background")
                                    .attr("width", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeaderBackgroundWidth(node));})
                                    .attr("height", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeaderBackgroundHeight(node));})
                                    .attr("x", HEADER_INSET)
                                    .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(HEADER_INSET + getHeaderBackgroundHeight(node));})
                                    .style("fill", nodeGetColor)
                                    .style("stroke", "grey")
                                    .style("display", getAppsBackgroundDisplay);

    var inputAppName = nodes.append("text")
                     .attr("class", "inputAppName")
                     .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getInputAppPositionX(node));})
                     .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getInputAppPositionY(node));})
                     .style("fill", getHeaderFill)
                     .style("font-size", REAL_TO_DISPLAY_SCALE(HEADER_TEXT_FONT_SIZE) + "px")
                     .style("display", getAppsBackgroundDisplay)
                     .text(getInputAppText);

    var outputAppName = nodes.append("text")
                     .attr("class", "outputAppName")
                     .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getOutputAppPositionX(node));})
                     .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getOutputAppPositionY(node));})
                     .style("fill", getHeaderFill)
                     .style("font-size", REAL_TO_DISPLAY_SCALE(HEADER_TEXT_FONT_SIZE) + "px")
                     .style("display", getAppsBackgroundDisplay)
                     .text(getOutputAppText);

     var exitAppName = nodes.append("text")
                      .attr("class", "exitAppName")
                      .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getExitAppPositionX(node));})
                      .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getExitAppPositionY(node));})
                      .style("fill", getHeaderFill)
                      .style("font-size", REAL_TO_DISPLAY_SCALE(HEADER_TEXT_FONT_SIZE) + "px")
                      .style("display", getAppsBackgroundDisplay)
                      .text(getExitAppText);

    var content = nodes.append("text")
                     .attr("class", "content")
                     .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getContentPositionX(node));})
                     .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getContentPositionY(node));})
                     .style("fill", getContentFill)
                     .style("font-size", REAL_TO_DISPLAY_SCALE(CONTENT_TEXT_FONT_SIZE) + "px")
                     .style("display", getContentDisplay)
                     .text(getContentText)
                     .call(wrap, Node.DEFAULT_WIDTH);

    var icons = nodes.append("svg:image")
                    .attr("href", getDataIcon)
                    .attr("width", REAL_TO_DISPLAY_SCALE(Node.DATA_COMPONENT_WIDTH))
                    .attr("height", REAL_TO_DISPLAY_SCALE(Node.DATA_COMPONENT_HEIGHT))
                    .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getIconLocationX(node));})
                    .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getIconLocationY(node));})

    var resizeControls = nodes.append("rect")
                                .attr("class", "resize-control")
                                .attr("width", RESIZE_CONTROL_SIZE)
                                .attr("height", RESIZE_CONTROL_SIZE)
                                .attr("x", function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - RESIZE_CONTROL_SIZE);})
                                .attr("y", function(node : Node){return REAL_TO_DISPLAY_SCALE(getHeight(node) - RESIZE_CONTROL_SIZE);})
                                .style("display", getResizeControlDisplay);

    var resizeLabels = nodes.append("text")
                                .attr("class", "resize-control-label")
                                .attr('x', function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - RESIZE_CONTROL_SIZE);})
                                .attr('y', function(node : Node){return REAL_TO_DISPLAY_SCALE(getHeight(node) - 2);})
                                .style('font-size', REAL_TO_DISPLAY_SCALE(RESIZE_BUTTON_LABEL_FONT_SIZE) + 'px')
                                .style('display', getResizeControlDisplay)
                                .style('user-select', 'none')
                                .style('cursor', 'nwse-resize')
                                .text(RESIZE_BUTTON_LABEL);

    var resizeDragHandler = d3.drag()
                                .on("start", function (node : Node) {
                                    selectNode(node);
                                    tick();
                                })
                                .on("drag", function (node : Node) {
                                    var newWidth = node.getWidth() + DISPLAY_TO_REAL_SCALE(d3.event.dx);
                                    var newHeight = node.getHeight() + DISPLAY_TO_REAL_SCALE(d3.event.dy);
                                    node.setWidth(newWidth);
                                    node.setHeight(newHeight);
                                    tick();
                                });

    resizeDragHandler(svgContainer.selectAll("g.node rect.resize-control"));
    resizeDragHandler(svgContainer.selectAll("g.node text.resize-control-label"));

    var shrinkButtons = nodes.append("rect")
                                .attr("class", "shrink-button")
                                .attr("width", REAL_TO_DISPLAY_SCALE(SHRINK_BUTTON_SIZE))
                                .attr("height", REAL_TO_DISPLAY_SCALE(SHRINK_BUTTON_SIZE))
                                .attr("x", function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - SHRINK_BUTTON_SIZE - HEADER_INSET - 4);})
                                .attr("y", REAL_TO_DISPLAY_SCALE(HEADER_INSET + 4))
                                .style("display", getShrinkControlDisplay)
                                .on("click", shrinkOnClick);

    var shrinkLabels = nodes.append("text")
                                .attr("class", "shrink-button-label")
                                .attr('x', function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - SHRINK_BUTTON_SIZE - HEADER_INSET - 2);})
                                .attr('y', REAL_TO_DISPLAY_SCALE(HEADER_INSET + 8 + (COLLAPSE_BUTTON_SIZE/2)))
                                .style('font-size', REAL_TO_DISPLAY_SCALE(HEADER_BUTTON_LABEL_FONT_SIZE) + 'px')
                                .style('fill', 'black')
                                .style('display', getShrinkControlDisplay)
                                .style('user-select', 'none')
                                .text(SHRINK_BUTTON_LABEL)
                                .on("click", shrinkOnClick);

    var collapseButtons = nodes.append("rect")
                                .attr("class", "collapse-button")
                                .attr("width", REAL_TO_DISPLAY_SCALE(COLLAPSE_BUTTON_SIZE))
                                .attr("height", REAL_TO_DISPLAY_SCALE(COLLAPSE_BUTTON_SIZE))
                                .attr("x", function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - SHRINK_BUTTON_SIZE - 8 - COLLAPSE_BUTTON_SIZE - HEADER_INSET);})
                                .attr("y", REAL_TO_DISPLAY_SCALE(HEADER_INSET + 4))
                                .style("display", getCollapseButtonDisplay)
                                .on("click", collapseOnClick);

    var collapseLabels = nodes.append("text")
                                .attr("class", "collapse-button-label")
                                .attr('x', function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - SHRINK_BUTTON_SIZE - 5.5 - COLLAPSE_BUTTON_SIZE - HEADER_INSET);})
                                .attr('y', REAL_TO_DISPLAY_SCALE(HEADER_INSET + 8.5 + (COLLAPSE_BUTTON_SIZE/2)))
                                .style('font-size', REAL_TO_DISPLAY_SCALE(HEADER_BUTTON_LABEL_FONT_SIZE) + 'px')
                                .style('fill', 'black')
                                .style('display', getCollapseButtonDisplay)
                                .style('user-select', 'none')
                                .text(COLLAPSE_BUTTON_LABEL)
                                .on("click", collapseOnClick);

    var expandButtons = nodes.append("rect")
                                .attr("class", "expand-button")
                                .attr("width", REAL_TO_DISPLAY_SCALE(EXPAND_BUTTON_SIZE))
                                .attr("height", REAL_TO_DISPLAY_SCALE(EXPAND_BUTTON_SIZE))
                                .attr("x", function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - EXPAND_BUTTON_SIZE - HEADER_INSET - 4);})
                                .attr("y", REAL_TO_DISPLAY_SCALE(HEADER_INSET + 4))
                                .style("display", getExpandButtonDisplay)
                                .on("click", expandOnClick);

    var expandLabels = nodes.append("text")
                                .attr("class", "expand-button-label")
                                .attr('x', function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - (SHRINK_BUTTON_SIZE/2) - HEADER_INSET - 9.5);})
                                .attr('y', REAL_TO_DISPLAY_SCALE(HEADER_INSET + 8.5 + (COLLAPSE_BUTTON_SIZE/2)))
                                .attr('font-size', REAL_TO_DISPLAY_SCALE(HEADER_BUTTON_LABEL_FONT_SIZE) + 'px')
                                .style('fill', 'black')
                                .style('display', getExpandButtonDisplay)
                                .style('user-select', 'none')
                                .text(EXPAND_BUTTON_LABEL)
                                .on("click", expandOnClick);

    // add the left-side ports (by default, the input ports)
    var inputPortGroups = nodes.append("g")
                                .attr("class", getInputPortGroupClass)
                                .attr("transform", getInputPortGroupTransform)
                                .style("display", getPortsDisplay);

    var inputPorts = inputPortGroups.selectAll("g")
                            .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
                            .enter()
                            .append("text")
                            .attr("class", getInputPortClass)
                            .attr("x", getInputPortPositionX)
                            .attr("y", getInputPortPositionY)
                            .style("font-size", REAL_TO_DISPLAY_SCALE(PORT_LABEL_FONT_SIZE) + "px")
                            .text(function (port : Port) {return port.getName();});

    var inputCircles = inputPortGroups.selectAll("g")
                            .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
                            .enter()
                            .append("circle")
                            .attr("data-id", function(port : Port){return port.getId();})
                            .attr("cx", getInputPortCirclePositionX)
                            .attr("cy", getInputPortCirclePositionY)
                            .attr("r", REAL_TO_DISPLAY_SCALE(6))
                            .attr("data-node-key", function(port : Port){return port.getNodeKey();})
                            .on("mouseenter", mouseEnterPort)
                            .on("mouseleave", mouseLeavePort);

    // add the input local ports
    var inputLocalPortGroups = nodes.append("g")
                                .attr("class", getInputLocalPortGroupClass)
                                .attr("transform", getInputLocalPortGroupTransform)
                                .style("display", getPortsDisplay);

    var inputLocalPorts = inputLocalPortGroups.selectAll("g")
                            .data(function(node : Node){return node.getInputApplicationOutputPorts();})
                            .enter()
                            .append("text")
                            .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
                            .attr("x", getInputLocalPortPositionX)
                            .attr("y", getInputLocalPortPositionY)
                            .style("font-size", REAL_TO_DISPLAY_SCALE(PORT_LABEL_FONT_SIZE) + "px")
                            .text(function (port : Port) {return port.getName();});

    var inputLocalCircles = inputLocalPortGroups.selectAll("g")
                            .data(function(node : Node){return node.getInputApplicationOutputPorts();})
                            .enter()
                            .append("circle")
                            .attr("data-id", function(port : Port){return port.getId();})
                            .attr("cx", getInputLocalPortCirclePositionX)
                            .attr("cy", getInputLocalPortCirclePositionY)
                            .attr("r", REAL_TO_DISPLAY_SCALE(6))
                            .attr("data-node-key", function(port : Port){return port.getNodeKey();})
                            .on("mouseenter", mouseEnterPort)
                            .on("mouseleave", mouseLeavePort);

    // add the output ports
    var outputPortGroups = nodes.append("g")
                                .attr("class", getOutputPortGroupClass)
                                .attr("transform", getOutputPortGroupTransform)
                                .style("display", getPortsDisplay);

    var outputPorts = outputPortGroups.selectAll("g")
                            .data(function(node : Node, index : number){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
                            .enter()
                            .append("text")
                            .attr("class", getOutputPortClass)
                            .attr("x", getOutputPortPositionX)
                            .attr("y", getOutputPortPositionY)
                            .style("font-size", REAL_TO_DISPLAY_SCALE(PORT_LABEL_FONT_SIZE) + "px")
                            .text(function (port : Port) {return port.getName();});

    var outputCircles = outputPortGroups.selectAll("g")
                            .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
                            .enter()
                            .append("circle")
                            .attr("data-id", function(port : Port){return port.getId();})
                            .attr("cx", getOutputPortCirclePositionX)
                            .attr("cy", getOutputPortCirclePositionY)
                            .attr("r", REAL_TO_DISPLAY_SCALE(6))
                            .attr("data-node-key", function(port : Port){return port.getNodeKey();})
                            .on("mouseenter", mouseEnterPort)
                            .on("mouseleave", mouseLeavePort);

    // add the output local ports
    var outputLocalPortGroups = nodes.append("g")
                                .attr("class", getOutputLocalPortGroupClass)
                                .attr("transform", getOutputLocalPortGroupTransform)
                                .style("display", getPortsDisplay);

    var outputLocalPorts = outputLocalPortGroups.selectAll("g")
                            .data(function(node : Node){return node.getOutputApplicationInputPorts();})
                            .enter()
                            .append("text")
                            .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
                            .attr("x", getOutputLocalPortPositionX)
                            .attr("y", getOutputLocalPortPositionY)
                            .style("font-size", REAL_TO_DISPLAY_SCALE(PORT_LABEL_FONT_SIZE) + "px")
                            .text(function (port : Port) {return port.getName();});

    var outputLocalCircles = outputLocalPortGroups.selectAll("g")
                            .data(function(node : Node){return node.getOutputApplicationInputPorts();})
                            .enter()
                            .append("circle")
                            .attr("data-id", function(port : Port){return port.getId();})
                            .attr("cx", getOutputLocalPortCirclePositionX)
                            .attr("cy", getOutputLocalPortCirclePositionY)
                            .attr("r", REAL_TO_DISPLAY_SCALE(6))
                            .attr("data-node-key", function(port : Port){return port.getNodeKey();})
                            .on("mouseenter", mouseEnterPort)
                            .on("mouseleave", mouseLeavePort);

    // add the exit ports
    var exitPortGroups = nodes.append("g")
                                .attr("class", getExitPortGroupClass)
                                .attr("transform", getExitPortGroupTransform)
                                .style("display", getPortsDisplay);

    var exitPorts = exitPortGroups.selectAll("g")
                            .data(function(node : Node, index : number){return node.getExitApplicationOutputPorts();})
                            .enter()
                            .append("text")
                            .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
                            .attr("x", getExitPortPositionX)
                            .attr("y", getExitPortPositionY)
                            .style("font-size", REAL_TO_DISPLAY_SCALE(PORT_LABEL_FONT_SIZE) + "px")
                            .text(function (port : Port) {return port.getName();});

    var exitCircles = exitPortGroups.selectAll("g")
                            .data(function(node : Node){return node.getExitApplicationOutputPorts();})
                            .enter()
                            .append("circle")
                            .attr("data-id", function(port : Port){return port.getId();})
                            .attr("cx", getExitPortCirclePositionX)
                            .attr("cy", getExitPortCirclePositionY)
                            .attr("r", REAL_TO_DISPLAY_SCALE(6))
                            .attr("data-node-key", function(port : Port){return port.getNodeKey();})
                            .on("mouseenter", mouseEnterPort)
                            .on("mouseleave", mouseLeavePort);

    // add the exit local ports
    var exitLocalPortGroups = nodes.append("g")
                                .attr("class", getExitLocalPortGroupClass)
                                .attr("transform", getExitLocalPortGroupTransform)
                                .style("display", getPortsDisplay);

    var exitLocalPorts = exitLocalPortGroups.selectAll("g")
                            .data(function(node : Node){return node.getExitApplicationInputPorts();})
                            .enter()
                            .append("text")
                            .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
                            .attr("x", getExitLocalPortPositionX)
                            .attr("y", getExitLocalPortPositionY)
                            .style("font-size", REAL_TO_DISPLAY_SCALE(PORT_LABEL_FONT_SIZE) + "px")
                            .text(function (port : Port) {return port.getName();});

    var exitLocalCircles = exitLocalPortGroups.selectAll("g")
                            .data(function(node : Node){return node.getExitApplicationInputPorts();})
                            .enter()
                            .append("circle")
                            .attr("data-id", function(port : Port){return port.getId();})
                            .attr("cx", getExitLocalPortCirclePositionX)
                            .attr("cy", getExitLocalPortCirclePositionY)
                            .attr("r", REAL_TO_DISPLAY_SCALE(6))
                            .attr("data-node-key", function(port : Port){return port.getNodeKey();})
                            .on("mouseenter", mouseEnterPort)
                            .on("mouseleave", mouseLeavePort);


    var portDragHandler = d3.drag()
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
                                    var linkValid : Eagle.LinkValid = Edge.isValid(graph, sourceNodeKey, sourcePortId, destinationNodeKey, destinationPortId, true, true);

                                    // check if we should allow invalid edges
                                    var allowInvalidEdges : boolean = Eagle.findSettingValue(Utils.ALLOW_INVALID_EDGES);

                                    // abort if source port and destination port have different data types
                                    if (allowInvalidEdges || linkValid === Eagle.LinkValid.Valid || linkValid === Eagle.LinkValid.Warning){
                                        addEdge(sourceNodeKey, sourcePortId, destinationNodeKey, destinationPortId, sourceDataType);
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
    var linkExtras : any = svgContainer.selectAll("path.linkExtra")
                            .data(linkData)
                            .enter()
                            .append("path");

    var linkExtrasAttributes = linkExtras.attr("class", "linkExtra")
                            .attr("d", createLink)
                            .attr("stroke", edgeExtraGetStrokeColor)
                            .attr("stroke-dasharray", edgeGetStrokeDashArray)
                            .attr("fill", "transparent")
                            .style("display", getEdgeDisplay)
                            .on("click", edgeOnClick);

    // draw links
    // TODO: ideally we would not use the 'any' type here
    var links : any = svgContainer.selectAll("path.link")
                            .data(linkData)
                            .enter()
                            .append("path");

    var linkAttributes = links.attr("class", "link")
                            .attr("d", createLink)
                            .attr("stroke", edgeGetStrokeColor)
                            .attr("stroke-dasharray", edgeGetStrokeDashArray)
                            .attr("fill", "transparent")
                            .attr("marker-end", "url(#grey-arrowhead)")
                            .style("display", getEdgeDisplay)
                            .on("click", edgeOnClick);

    // draw comment links
    var commentLinks : any = svgContainer.selectAll("path.commentLink")
                            .data(nodeData)
                            .enter()
                            .append("path");

    var commentLinkAttributes = commentLinks.attr("class", "commentLink")
                            .attr("d", createCommentLink)
                            .attr("stroke", "black")
                            .attr("fill", "transparent")
                            .attr("marker-end", "url(#black-arrowhead)")
                            .style("display", getCommentLinkDisplay);

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
        //console.log("createLink()", edge.getSrcNodeKey(), edge.getSrcPortId(), "->", edge.getDestNodeKey(), edge.getDestPortId());

        // determine if edge is "forward" or not
        var srcNode : Node  = findNodeWithKey(edge.getSrcNodeKey(), nodeData);
        var destNode : Node = findNodeWithKey(edge.getDestNodeKey(), nodeData);

        if (srcNode === null || destNode === null){
            console.warn("Can't find srcNode or can't find destNode for edge.");
            return createBezier(0,0,0,0,Eagle.Direction.Down,Eagle.Direction.Down);
        }

        var srcPortType : string =  srcNode.findPortTypeById(edge.getSrcPortId());
        var destPortType : string = destNode.findPortTypeById(edge.getDestPortId());
        var srcPortIndex : number = srcNode.findPortIndexById(edge.getSrcPortId());
        var destPortIndex : number = destNode.findPortIndexById(edge.getDestPortId());

        let x1 = REAL_TO_DISPLAY_POSITION_X(edgeGetX1(edge));
        let y1 = REAL_TO_DISPLAY_POSITION_Y(edgeGetY1(edge));
        let x2 = REAL_TO_DISPLAY_POSITION_X(edgeGetX2(edge));
        let y2 = REAL_TO_DISPLAY_POSITION_Y(edgeGetY2(edge));

        //console.log("x1", x1, "y1", y1, "x2", x2, "y2", y2);
        console.assert(!isNaN(x1));
        console.assert(!isNaN(y1));
        console.assert(!isNaN(x2));
        console.assert(!isNaN(y2));

        let startDirection = determineDirection(true, srcNode, srcPortIndex, srcPortType);
        let endDirection = determineDirection(false, destNode, destPortIndex, destPortType);

        //console.log("edge", srcNode.getKey(), "->", destNode.getKey(), "start", startDirection, "end", endDirection);

        return createBezier(x1, y1, x2, y2, startDirection, endDirection);
    }

    // create one link that is only used during the creation of a new link
    // this new link follows the mouse pointer to indicate the position
    var draggingLink = svgContainer.append("line")
                                    .attr("class", "draggingLink")
                                    .attr("x1", 0)
                                    .attr("y1", 0)
                                    .attr("x2", 0)
                                    .attr("y2", 0)
                                    .attr("stroke", draggingEdgeGetStrokeColor);

    function tick(){
        //console.log("tick()");

        // enter any new nodes
        svgContainer.selectAll("g.node")
                                .data(nodeData)
                                .enter()
                                .insert("g")
                                .attr("class", "node")
                                .attr("id", function(node : Node, index : number){return "node" + index;});

        // exit any old nodes
        svgContainer.selectAll("g.node")
                            .data(nodeData)
                            .exit()
                            .remove();

        // enter any new links
        svgContainer.selectAll("path.link")
                                .data(linkData)
                                .enter()
                                .insert("path")
                                .attr("class", "link")
                                .style("display", getEdgeDisplay)
                                .on("click", edgeOnClick);

        // exit any old links.
        svgContainer.selectAll("path.link")
                                .data(linkData)
                                .exit()
                                .remove();

        // enter any new comment links
        svgContainer.selectAll("path.commentLink")
                                .data(nodeData)
                                .enter()
                                .insert("path")
                                .attr("class", "commentLink")
                                .style("display", getCommentLinkDisplay);

        // exit any old comment links
        svgContainer.selectAll("path.commentLink")
                                .data(nodeData)
                                .exit()
                                .remove();

        // make sure we have references to all the objects of each type
        nodes = svgContainer.selectAll("g.node")
                                .data(nodeData)
                                .style("display", getNodeDisplay);
        links = svgContainer.selectAll("path.link")
                                .data(linkData);
        commentLinks = svgContainer.selectAll("path.commentLink")
                                .data(nodeData);

        // TODO: update attributes of all nodes
        nodes.attr("transform", nodeGetTranslation);

        svgContainer.selectAll("g.node rect:not(.header-background):not(.apps-background):not(.resize-control):not(.shrink-button):not(.collapse-button):not(.expand-button)")
                                .data(nodeData)
                                .attr("width", function(node:Node){return REAL_TO_DISPLAY_SCALE(getWidth(node));})
                                .attr("height", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeight(node));})
                                .style("display", getNodeRectDisplay)
                                .style("fill", nodeGetFill)
                                .style("stroke", nodeGetStroke)
                                .style("stroke-width", NODE_STROKE_WIDTH)
                                .attr("stroke-dasharray", nodeGetStrokeDashArray)
                                .on("click", nodeOnClick);

        svgContainer.selectAll("g.node polygon")
                                .data(nodeData)
                                .attr("points", getNodeCustomShapePoints)
                                .style("display", getNodeCustomShapeDisplay)
                                .style("fill", nodeGetColor)
                                .style("stroke", nodeGetStroke)
                                .style("stroke-width", NODE_STROKE_WIDTH)
                                .attr("stroke-dasharray", nodeGetStrokeDashArray)
                                .on("click", nodeOnClick);

        svgContainer.selectAll("g.node rect.header-background")
                                .data(nodeData)
                                .attr("width", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeaderBackgroundWidth(node));})
                                .attr("height", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeaderBackgroundHeight(node));})
                                .attr("x", HEADER_INSET)
                                .attr("y", HEADER_INSET)
                                .style("fill", nodeGetColor)
                                .style("stroke", "grey")
                                .style("display", getHeaderBackgroundDisplay);

        svgContainer.selectAll("g.node text.header")
                                .data(nodeData)
                                .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeaderPositionX(node));})
                                .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeaderPositionY(node));})
                                .style("fill", getHeaderFill)
                                .style("font-size", REAL_TO_DISPLAY_SCALE(HEADER_TEXT_FONT_SIZE) + "px")
                                .style("display", getHeaderDisplay)
                                .text(getHeaderText);
                                //.call(wrap, COLLAPSED_NODE_WIDTH);

        svgContainer.selectAll("g.node text.subheader")
                                .data(nodeData)
                                .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getSubHeaderPositionX(node));})
                                .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getSubHeaderPositionY(node));})
                                .style("fill", getSubHeaderFill)
                                .style("font-size", REAL_TO_DISPLAY_SCALE(HEADER_TEXT_FONT_SIZE) + "px")
                                .style("display", getSubHeaderDisplay)
                                .text(getSubHeaderText);

        svgContainer.selectAll("g.node rect.apps-background")
                                .data(nodeData)
                                .attr("width", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeaderBackgroundWidth(node));})
                                .attr("height", function(node:Node){return REAL_TO_DISPLAY_SCALE(getHeaderBackgroundHeight(node));})
                                .attr("x", HEADER_INSET)
                                .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(HEADER_INSET + getHeaderBackgroundHeight(node));})
                                .style("fill", nodeGetColor)
                                .style("stroke", "grey")
                                .style("display", getAppsBackgroundDisplay);

        svgContainer.selectAll("g.node text.inputAppName")
                                .data(nodeData)
                                .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getInputAppPositionX(node));})
                                .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getInputAppPositionY(node));})
                                .style("fill", getHeaderFill)
                                .style("font-size", REAL_TO_DISPLAY_SCALE(HEADER_TEXT_FONT_SIZE) + "px")
                                .style("display", getAppsBackgroundDisplay)
                                .text(getInputAppText);

        svgContainer.selectAll("g.node text.outputAppName")
                                .data(nodeData)
                                .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getOutputAppPositionX(node));})
                                .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getOutputAppPositionY(node));})
                                .style("fill", getHeaderFill)
                                .style("font-size", REAL_TO_DISPLAY_SCALE(HEADER_TEXT_FONT_SIZE) + "px")
                                .style("display", getAppsBackgroundDisplay)
                                .text(getOutputAppText);

        svgContainer.selectAll("g.node text.exitAppName")
                                .data(nodeData)
                                .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getExitAppPositionX(node));})
                                .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getExitAppPositionY(node));})
                                .style("fill", getHeaderFill)
                                .style("font-size", REAL_TO_DISPLAY_SCALE(HEADER_TEXT_FONT_SIZE) + "px")
                                .style("display", getAppsBackgroundDisplay)
                                .text(getExitAppText);

        svgContainer.selectAll("g.node text.content")
                                .data(nodeData)
                                .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getContentPositionX(node));})
                                .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getContentPositionY(node));})
                                .style("fill", getContentFill)
                                .style("font-size", REAL_TO_DISPLAY_SCALE(CONTENT_TEXT_FONT_SIZE) + "px")
                                .style("display", getContentDisplay)
                                .text(getContentText)
                                .call(wrap, Node.DEFAULT_WIDTH);

        svgContainer.selectAll("image")
                                .data(nodeData)
                                .attr("href", getDataIcon)
                                .attr("width", REAL_TO_DISPLAY_SCALE(Node.DATA_COMPONENT_HEIGHT))
                                .attr("height", REAL_TO_DISPLAY_SCALE(Node.DATA_COMPONENT_HEIGHT))
                                .attr("x", function(node:Node){return REAL_TO_DISPLAY_SCALE(getIconLocationX(node));})
                                .attr("y", function(node:Node){return REAL_TO_DISPLAY_SCALE(getIconLocationY(node));});

        svgContainer.selectAll("g.node rect.resize-control")
                                .attr("width", REAL_TO_DISPLAY_SCALE(RESIZE_CONTROL_SIZE))
                                .attr("height", REAL_TO_DISPLAY_SCALE(RESIZE_CONTROL_SIZE))
                                .attr("x", function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - RESIZE_CONTROL_SIZE);})
                                .attr("y", function(node : Node){return REAL_TO_DISPLAY_SCALE(getHeight(node) - RESIZE_CONTROL_SIZE);})
                                .style("display", getResizeControlDisplay);

        svgContainer.selectAll("g.node text.resize-control-label")
                                .attr('x', function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - RESIZE_CONTROL_SIZE);})
                                .attr('y', function(node : Node){return REAL_TO_DISPLAY_SCALE(getHeight(node) - 2);})
                                .style('font-size', REAL_TO_DISPLAY_SCALE(RESIZE_BUTTON_LABEL_FONT_SIZE) + 'px')
                                .style('display', getResizeControlDisplay);

        svgContainer.selectAll("g.node rect.shrink-button")
                                .attr("width", REAL_TO_DISPLAY_SCALE(SHRINK_BUTTON_SIZE))
                                .attr("height", REAL_TO_DISPLAY_SCALE(SHRINK_BUTTON_SIZE))
                                .attr("x", function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - SHRINK_BUTTON_SIZE - HEADER_INSET - 4);})
                                .attr("y", REAL_TO_DISPLAY_SCALE(HEADER_INSET + 4))
                                .style("display", getShrinkControlDisplay);

        svgContainer.selectAll("text.shrink-button-label")
                                .attr('x', function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - SHRINK_BUTTON_SIZE - HEADER_INSET - 2);})
                                .attr('y', REAL_TO_DISPLAY_SCALE(HEADER_INSET + 8 + (COLLAPSE_BUTTON_SIZE/2)))
                                .style('font-size', REAL_TO_DISPLAY_SCALE(HEADER_BUTTON_LABEL_FONT_SIZE) + 'px')
                                .style('display', getShrinkControlDisplay);

        svgContainer.selectAll("g.node rect.collapse-button")
                                .attr("width", REAL_TO_DISPLAY_SCALE(COLLAPSE_BUTTON_SIZE))
                                .attr("height", REAL_TO_DISPLAY_SCALE(COLLAPSE_BUTTON_SIZE))
                                .attr("x", function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - SHRINK_BUTTON_SIZE - 8 - COLLAPSE_BUTTON_SIZE - HEADER_INSET);})
                                .attr("y", REAL_TO_DISPLAY_SCALE(HEADER_INSET + 4))
                                .style("display", getCollapseButtonDisplay);

        svgContainer.selectAll("text.collapse-button-label")
                                .attr('x', function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - SHRINK_BUTTON_SIZE - 5.5 - COLLAPSE_BUTTON_SIZE - HEADER_INSET);})
                                .attr('y', REAL_TO_DISPLAY_SCALE(HEADER_INSET + 8.5 + (COLLAPSE_BUTTON_SIZE/2)))
                                .style('font-size', REAL_TO_DISPLAY_SCALE(HEADER_BUTTON_LABEL_FONT_SIZE) + 'px')
                                .style('display', getCollapseButtonDisplay);

        svgContainer.selectAll("g.node rect.expand-button")
                                .attr("width", REAL_TO_DISPLAY_SCALE(EXPAND_BUTTON_SIZE))
                                .attr("height", REAL_TO_DISPLAY_SCALE(EXPAND_BUTTON_SIZE))
                                .attr("x", function(node : Node){return REAL_TO_DISPLAY_SCALE(getWidth(node) - EXPAND_BUTTON_SIZE - HEADER_INSET - 4);})
                                .attr("y", REAL_TO_DISPLAY_SCALE(HEADER_INSET + 4))
                                .style("display", getExpandButtonDisplay);

        // inputPorts
        nodes.selectAll("g.inputPorts")
                                .attr("transform", getInputPortGroupTransform)
                                .style("display", getPortsDisplay);

        nodes.selectAll("g.inputPorts text")
                                .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
                                .enter()
                                .select("g.inputPorts")
                                .insert("text");

        nodes.selectAll("g.inputPorts text")
                                .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
                                .exit()
                                .remove();

        nodes.selectAll("g.inputPorts text")
                                .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
                                .attr("class", getInputPortClass)
                                .attr("x", getInputPortPositionX)
                                .attr("y", getInputPortPositionY)
                                .style("font-size", REAL_TO_DISPLAY_SCALE(PORT_LABEL_FONT_SIZE) + "px")
                                .text(function (port : Port) {return port.getName();});

        nodes.selectAll("g.inputPorts circle")
                                .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
                                .enter()
                                .select("g.inputPorts")
                                .insert("circle");

        nodes.selectAll("g.inputPorts circle")
                                .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
                                .exit()
                                .remove();

        nodes.selectAll("g.inputPorts circle")
                                .data(function(node : Node){return node.hasInputApplication() ? node.getInputApplicationInputPorts() : node.getInputPorts();})
                                .attr("data-key", function(port : Port){return port.getId();})
                                .attr("cx", getInputPortCirclePositionX)
                                .attr("cy", getInputPortCirclePositionY)
                                .attr("r", REAL_TO_DISPLAY_SCALE(6))
                                .attr("data-node-key", function(port : Port){return port.getNodeKey();})
                                .on("mouseenter", mouseEnterPort)
                                .on("mouseleave", mouseLeavePort);

        // inputLocalPorts
        nodes.selectAll("g.inputLocalPorts")
                                .attr("transform", getInputLocalPortGroupTransform)
                                .style("display", getPortsDisplay);

        nodes.selectAll("g.inputLocalPorts text")
                                .data(function(node : Node){return node.getInputApplicationOutputPorts();})
                                .enter()
                                .select("g.inputLocalPorts")
                                .insert("text");

        nodes.selectAll("g.inputLocalPorts text")
                                .data(function(node : Node){return node.getInputApplicationOutputPorts();})
                                .exit()
                                .remove();

        nodes.selectAll("g.inputLocalPorts text")
                                .data(function(node : Node){return node.getInputApplicationOutputPorts();})
                                .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
                                .attr("x", getInputLocalPortPositionX)
                                .attr("y", getInputLocalPortPositionY)
                                .style("font-size", REAL_TO_DISPLAY_SCALE(PORT_LABEL_FONT_SIZE) + "px")
                                .text(function (port : Port) {return port.getName();});

        nodes.selectAll("g.inputLocalPorts circle")
                                .data(function(node : Node){return node.getInputApplicationOutputPorts();})
                                .enter()
                                .select("g.inputLocalPorts")
                                .insert("circle");

        nodes.selectAll("g.inputLocalPorts circle")
                                .data(function(node : Node){return node.getInputApplicationOutputPorts();})
                                .exit()
                                .remove();

        nodes.selectAll("g.inputLocalPorts circle")
                                .data(function(node : Node){return node.getInputApplicationOutputPorts();})
                                .attr("data-id", function(port : Port){return port.getId();})
                                .attr("cx", getInputLocalPortCirclePositionX)
                                .attr("cy", getInputLocalPortCirclePositionY)
                                .attr("r", REAL_TO_DISPLAY_SCALE(6))
                                .attr("data-node-key", function(port : Port){return port.getNodeKey();})
                                .on("mouseenter", mouseEnterPort)
                                .on("mouseleave", mouseLeavePort);

        // outputPorts
        nodes.selectAll("g.outputPorts")
                                .attr("transform", getOutputPortGroupTransform)
                                .style("display", getPortsDisplay);

        nodes.selectAll("g.outputPorts text")
                                .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
                                .enter()
                                .select("g.outputPorts")
                                .insert("text");

        nodes.selectAll("g.outputPorts text")
                                .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
                                .exit()
                                .remove();

        nodes.selectAll("g.outputPorts text")
                                .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
                                .attr("class", getOutputPortClass)
                                .attr("x", getOutputPortPositionX)
                                .attr("y", getOutputPortPositionY)
                                .style("font-size", REAL_TO_DISPLAY_SCALE(PORT_LABEL_FONT_SIZE) + "px")
                                .text(function (port : Port) {return port.getName()});

        nodes.selectAll("g.outputPorts circle")
                                .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
                                .enter()
                                .select("g.outputPorts")
                                .insert("circle");

        nodes.selectAll("g.outputPorts circle")
                                .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
                                .exit()
                                .remove();

        nodes.selectAll("g.outputPorts circle")
                                .data(function(node : Node){return node.hasOutputApplication() ? node.getOutputApplicationOutputPorts() : node.getOutputPorts();})
                                .attr("data-id", function(port : Port){return port.getId();})
                                .attr("cx", getOutputPortCirclePositionX)
                                .attr("cy", getOutputPortCirclePositionY)
                                .attr("r", REAL_TO_DISPLAY_SCALE(6))
                                .attr("data-node-key", function(port : Port){return port.getNodeKey();})
                                .on("mouseenter", mouseEnterPort)
                                .on("mouseleave", mouseLeavePort);


        // outputLocalPorts
        nodes.selectAll("g.outputLocalPorts")
                                .attr("transform", getOutputLocalPortGroupTransform)
                                .style("display", getPortsDisplay);

        nodes.selectAll("g.outputLocalPorts text")
                                .data(function(node : Node){return node.getOutputApplicationInputPorts();})
                                .enter()
                                .select("g.outputLocalPorts")
                                .insert("text");

        nodes.selectAll("g.outputLocalPorts text")
                                .data(function(node : Node){return node.getOutputApplicationInputPorts();})
                                .exit()
                                .remove();

        nodes.selectAll("g.outputLocalPorts text")
                                .data(function(node : Node){return node.getOutputApplicationInputPorts();})
                                .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
                                .attr("x", getOutputLocalPortPositionX)
                                .attr("y", getOutputLocalPortPositionY)
                                .style("font-size", REAL_TO_DISPLAY_SCALE(PORT_LABEL_FONT_SIZE) + "px")
                                .text(function (port : Port) {return port.getName();});

        nodes.selectAll("g.outputLocalPorts circle")
                                .data(function(node : Node){return node.getOutputApplicationInputPorts();})
                                .enter()
                                .select("g.outputLocalPorts")
                                .insert("circle");

        nodes.selectAll("g.outputLocalPorts circle")
                                .data(function(node : Node){return node.getOutputApplicationInputPorts();})
                                .exit()
                                .remove();

        nodes.selectAll("g.outputLocalPorts circle")
                                .data(function(node : Node){return node.getOutputApplicationInputPorts();})
                                .attr("data-id", function(port : Port){return port.getId();})
                                .attr("cx", getOutputLocalPortCirclePositionX)
                                .attr("cy", getOutputLocalPortCirclePositionY)
                                .attr("r", REAL_TO_DISPLAY_SCALE(6))
                                .attr("data-node-key", function(port : Port){return port.getNodeKey();})
                                .on("mouseenter", mouseEnterPort)
                                .on("mouseleave", mouseLeavePort);

        // exitPorts
        nodes.selectAll("g.exitPorts")
                                .attr("transform", getExitPortGroupTransform)
                                .style("display", getPortsDisplay);

        nodes.selectAll("g.exitPorts text")
                                .data(function(node : Node){return node.getExitApplicationOutputPorts();})
                                .enter()
                                .select("g.exitPorts")
                                .insert("text");

        nodes.selectAll("g.exitPorts text")
                                .data(function(node : Node){return node.getExitApplicationOutputPorts();})
                                .exit()
                                .remove();

        nodes.selectAll("g.exitPorts text")
                                .data(function(node : Node){return node.getExitApplicationOutputPorts();})
                                .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
                                .attr("x", getExitPortPositionX)
                                .attr("y", getExitPortPositionY)
                                .style("font-size", REAL_TO_DISPLAY_SCALE(PORT_LABEL_FONT_SIZE) + "px")
                                .text(function (port : Port) {return port.getName()});

        nodes.selectAll("g.exitPorts circle")
                                .data(function(node : Node){return node.getExitApplicationOutputPorts();})
                                .enter()
                                .select("g.exitPorts")
                                .insert("circle");

        nodes.selectAll("g.exitPorts circle")
                                .data(function(node : Node){return node.getExitApplicationOutputPorts();})
                                .exit()
                                .remove();

        nodes.selectAll("g.exitPorts circle")
                                .data(function(node : Node){return node.getExitApplicationOutputPorts();})
                                .attr("data-id", function(port : Port){return port.getId();})
                                .attr("cx", getExitPortCirclePositionX)
                                .attr("cy", getExitPortCirclePositionY)
                                .attr("r", REAL_TO_DISPLAY_SCALE(6))
                                .attr("data-node-key", function(port : Port){return port.getNodeKey();})
                                .on("mouseenter", mouseEnterPort)
                                .on("mouseleave", mouseLeavePort);


        // exitLocalPorts
        nodes.selectAll("g.exitLocalPorts")
                                .attr("transform", getExitLocalPortGroupTransform)
                                .style("display", getPortsDisplay);

        nodes.selectAll("g.exitLocalPorts text")
                                .data(function(node : Node){return node.getExitApplicationInputPorts();})
                                .enter()
                                .select("g.exitLocalPorts")
                                .insert("text");

        nodes.selectAll("g.exitLocalPorts text")
                                .data(function(node : Node){return node.getExitApplicationInputPorts();})
                                .exit()
                                .remove();

        nodes.selectAll("g.exitLocalPorts text")
                                .data(function(node : Node){return node.getExitApplicationInputPorts();})
                                .attr("class", function(port : Port){return port.isEvent() ? "event" : ""})
                                .attr("x", getExitLocalPortPositionX)
                                .attr("y", getExitLocalPortPositionY)
                                .style("font-size", REAL_TO_DISPLAY_SCALE(PORT_LABEL_FONT_SIZE) + "px")
                                .text(function (port : Port) {return port.getName();});

        nodes.selectAll("g.exitLocalPorts circle")
                                .data(function(node : Node){return node.getExitApplicationInputPorts();})
                                .enter()
                                .select("g.exitLocalPorts")
                                .insert("circle");

        nodes.selectAll("g.exitLocalPorts circle")
                                .data(function(node : Node){return node.getExitApplicationInputPorts();})
                                .exit()
                                .remove();

        nodes.selectAll("g.exitLocalPorts circle")
                                .data(function(node : Node){return node.getExitApplicationInputPorts();})
                                .attr("data-id", function(port : Port){return port.getId();})
                                .attr("cx", getExitLocalPortCirclePositionX)
                                .attr("cy", getExitLocalPortCirclePositionY)
                                .attr("r", REAL_TO_DISPLAY_SCALE(6))
                                .attr("data-node-key", function(port : Port){return port.getNodeKey();})
                                .on("mouseenter", mouseEnterPort)
                                .on("mouseleave", mouseLeavePort);


        // update attributes of all links
        linkExtras.attr("class", "linkExtra")
                                .attr("d", createLink)
                                .attr("fill", "transparent")
                                .attr("stroke", edgeExtraGetStrokeColor)
                                .attr("stroke-dasharray", edgeGetStrokeDashArray)
                                .style("display", getEdgeDisplay);

        // update attributes of all links
        links.attr("class", "link")
                                .attr("d", createLink)
                                .attr("stroke", edgeGetStrokeColor)
                                .attr("stroke-dasharray", edgeGetStrokeDashArray)
                                .attr("fill", "transparent")
                                .attr("marker-end", "url(#grey-arrowhead)")
                                .style("display", getEdgeDisplay);

        // update attributes of all comment links
        commentLinks.attr("class", "commentLink")
                                .attr("d", createCommentLink)
                                .attr("stroke", "black")
                                .attr("fill", "transparent")
                                .attr("marker-end", "url(#black-arrowhead)")
                                .style("display", getCommentLinkDisplay);

        // dragging link
        if (isDraggingPort){
            var x1 : number = REAL_TO_DISPLAY_POSITION_X(edgeGetX1(new Edge(sourceNodeKey, sourcePortId, 0, "", "")));
            var y1 : number = REAL_TO_DISPLAY_POSITION_Y(edgeGetY1(new Edge(sourceNodeKey, sourcePortId, 0, "", "")));
            var x2 : number = mousePosition.x;
            var y2 : number = mousePosition.y;

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
    }

    function selectEdge(edge : Edge){
        if (edge !== null){
            eagle.setSelection(Eagle.RightWindowMode.EdgeInspector, edge);
        }
    }

    function selectNode(node : Node){
        if (node !== null){
            //console.log("setSelection()", node.getName());
            eagle.setSelection(Eagle.RightWindowMode.NodeInspector, node);
        }
    }

    function buildTranslation(x : number, y : number) : string {
        return "translate(" + x.toString() + "," + y.toString() + ")";
    }

    function getContentText(data : Node) : string {
        return data.getCustomData();
    }

    function nodeGetTranslation(data : Node) : string {
        return buildTranslation(REAL_TO_DISPLAY_POSITION_X(data.getPosition().x), REAL_TO_DISPLAY_POSITION_Y(data.getPosition().y));
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
            return Node.COLLAPSED_HEIGHT;
        }

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return Node.DATA_COMPONENT_HEIGHT;
        }

        // default height
        return HEADER_HEIGHT;
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

    function getSubHeaderDisplay(node : Node) : string {
        // don't show header background for comment and description nodes
        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return "inline";
        } else {
            return "none";
        }
    }

    function getSubHeaderText(data : Node) : string {
        if (data.getCategoryType() === Eagle.CategoryType.Data && !data.isShowPorts()){
            var multiplicity : number = findMultiplicity(data);

            if (multiplicity === 1){
                return "";
            } else {
                return multiplicity.toString();
            }
        }

        return "";
    }

    function getSubHeaderPositionX(node : Node) : number {

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return node.getWidth()/2;
        }

        return getWidth(node) /2;
    }

    function getSubHeaderPositionY(node : Node) : number {
        if (node.isGroup() && node.isCollapsed()){
            return Node.COLLAPSED_HEIGHT / 2;
        }

        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            var y = (3 * Node.DATA_COMPONENT_HEIGHT / 2);

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
            }

            return y;
        }

        return 20;
    }

    function getSubHeaderFill(node : Node) : string {
        if (node.getCategoryType() === Eagle.CategoryType.Data && !node.isShowPorts()){
            return "black";
        }

        if (node.getCategory() === Eagle.Category.ExclusiveForceNode){
            return "black";
        }

        return "white";
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

    function getInputAppText(node:Node) : string {
        if (!Node.canHaveInputApp(node)){
            return "";
        }

        var inputApplication : Node = node.getInputApplication();

        if (typeof inputApplication === "undefined" || inputApplication === null){
            return Node.NO_APP_STRING;
        }

        return inputApplication.getName();
    }

    function getInputAppPositionX(node : Node) : number {
        return 8;
    }

    function getInputAppPositionY(node : Node) : number {
        // TODO: do something different if the node is collapsed
        //if (node.isGroup() && node.isCollapsed()){
        //    return Node.COLLAPSED_HEIGHT / 2;
        //}

        return HEADER_HEIGHT + 20;
    }

    function getOutputAppText(node:Node) : string {
        if (!Node.canHaveOutputApp(node)){
            return "";
        }

        var outputApplication : Node = node.getOutputApplication();

        if (typeof outputApplication === "undefined" || outputApplication === null){
            return Node.NO_APP_STRING;
        }

        return outputApplication.getName();
    }

    function getOutputAppPositionX(node : Node) : number {
        return node.getWidth() - 8;
    }

    function getOutputAppPositionY(node : Node) : number {
        // TODO: do something different if the node is collapsed
        //if (node.isGroup() && node.isCollapsed()){
        //    return Node.COLLAPSED_HEIGHT / 2;
        //}

        return HEADER_HEIGHT + 20;
    }

    function getExitAppText(node:Node) : string {
        if (!Node.canHaveExitApp(node)){
            return "";
        }

        var exitApplication : Node = node.getExitApplication();

        if (typeof exitApplication === "undefined" || exitApplication === null){
            return Node.NO_APP_STRING;
        }

        return exitApplication.getName();
    }

    function getExitAppPositionX(node : Node) : number {
        return node.getWidth() - 8;
    }

    function getExitAppPositionY(node : Node) : number {
        // TODO: do something different if the node is collapsed
        //if (node.isGroup() && node.isCollapsed()){
        //    return Node.COLLAPSED_HEIGHT / 2;
        //}

        return HEADER_HEIGHT + 20;
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

    function getInputPortClass(port : Port, index: number): string {
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);
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

    function getOutputPortClass(port : Port, index: number): string {
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);
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
            return buildTranslation(REAL_TO_DISPLAY_SCALE(PORT_OFFSET_X), REAL_TO_DISPLAY_SCALE(HEADER_HEIGHT + APPS_HEIGHT));
        } else {
            return buildTranslation(REAL_TO_DISPLAY_SCALE(PORT_OFFSET_X), REAL_TO_DISPLAY_SCALE(HEADER_HEIGHT));
        }
    }

    function getRightSidePortGroupTransform(node : Node) : string {
        if (Node.canHaveInputApp(node) || Node.canHaveOutputApp(node) || Node.canHaveExitApp(node)){
            return buildTranslation(REAL_TO_DISPLAY_SCALE(getWidth(node)-PORT_OFFSET_X), REAL_TO_DISPLAY_SCALE(HEADER_HEIGHT + APPS_HEIGHT));
        } else {
            return buildTranslation(REAL_TO_DISPLAY_SCALE(getWidth(node)-PORT_OFFSET_X), REAL_TO_DISPLAY_SCALE(HEADER_HEIGHT));
        }
    }

    function getLeftSideLocalPortGroupTransform(node : Node) : string {
        if (Node.canHaveInputApp(node) || Node.canHaveOutputApp(node) || Node.canHaveExitApp(node)){
            return buildTranslation(REAL_TO_DISPLAY_SCALE(PORT_OFFSET_X), REAL_TO_DISPLAY_SCALE(HEADER_HEIGHT + APPS_HEIGHT + node.getInputApplicationInputPorts().length * PORT_HEIGHT));
        } else {
            return buildTranslation(REAL_TO_DISPLAY_SCALE(PORT_OFFSET_X), REAL_TO_DISPLAY_SCALE(HEADER_HEIGHT + node.getInputPorts().length * PORT_HEIGHT));
        }
    }

    function getRightSideLocalPortGroupTransform(node : Node) : string {
        if (Node.canHaveInputApp(node) || Node.canHaveOutputApp(node) || Node.canHaveExitApp(node)){
            return buildTranslation(REAL_TO_DISPLAY_SCALE(getWidth(node)-PORT_OFFSET_X), REAL_TO_DISPLAY_SCALE(HEADER_HEIGHT + APPS_HEIGHT + (node.getOutputApplicationOutputPorts().length + node.getExitApplicationOutputPorts().length) * PORT_HEIGHT));
        } else {
            return buildTranslation(REAL_TO_DISPLAY_SCALE(getWidth(node)-PORT_OFFSET_X), REAL_TO_DISPLAY_SCALE(HEADER_HEIGHT + node.getOutputPorts().length * PORT_HEIGHT));
        }
    }

    // TODO: one level of indirection here (getInput/Output -> getLeft/Right -> position)
    function getInputPortPositionX(port : Port, index : number) : number {
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getLeftSidePortPositionX(port, index);
        }

        if (node.isBranch()){
            let numPorts = node.getInputPorts().length;
            return REAL_TO_DISPLAY_SCALE(100 - 76 * portIndexRatio(index, numPorts));
        }

        if (node.isFlipPorts()){
            return getRightSidePortPositionX(port, index);
        } else {
            return getLeftSidePortPositionX(port, index);
        }
    }

    function getInputPortPositionY(port : Port, index : number) : number {
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getPortPositionY(port, index);
        }

        if (node.isBranch()){
            let numPorts = node.getInputPorts().length;

            return REAL_TO_DISPLAY_SCALE(24 + 30 * portIndexRatio(index, numPorts));
        }

        return getPortPositionY(port, index);
    }

    function getOutputPortPositionX(port : Port, index : number) : number {
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getRightSidePortPositionX(port, index);
        }

        if (node.isBranch()){
            if (index === 0){
                return REAL_TO_DISPLAY_SCALE(200) / 2;
            }
            if (index === 1){
                return REAL_TO_DISPLAY_SCALE(200 - 24);
            }
        }

        if (node.isFlipPorts()){
            return getLeftSidePortPositionX(port, index);
        } else {
            return getRightSidePortPositionX(port, index);
        }
    }

    function getOutputPortPositionY(port : Port, index : number) : number {
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getPortPositionY(port, index);
        }

        if (node.isBranch()){
            if (index === 0){
                return REAL_TO_DISPLAY_SCALE(100 - 16);
            }
            if (index === 1){
                return REAL_TO_DISPLAY_SCALE(54);
            }
        }

        return getPortPositionY(port, index);
    }

    function getExitPortPositionX(port : Port, index : number) : number {
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

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
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getLeftSidePortPositionX(port, index);
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
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

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
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

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
        return REAL_TO_DISPLAY_SCALE(20);
    }

    function getPortPositionY(port : Port, index : number) : number {
        return REAL_TO_DISPLAY_SCALE((index + 1) * PORT_HEIGHT);
    }

    function getRightSidePortPositionX(port : Port, index : number) : number {
        return REAL_TO_DISPLAY_SCALE(-20);
    }




    // port circle positions
    function getInputPortCirclePositionX(port : Port, index : number) : number {
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getLeftSidePortCirclePositionX(port, index);
        }

        if (node.isBranch()){
            let numPorts = node.getInputPorts().length;

            return REAL_TO_DISPLAY_SCALE(100 - 100 * portIndexRatio(index, numPorts));
        }

        if (node.isFlipPorts()){
            return getRightSidePortCirclePositionX(port, index);
        } else {
            return getLeftSidePortCirclePositionX(port, index);
        }
    }
    function getInputPortCirclePositionY(port : Port, index : number) : number {
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getPortCirclePositionY(port, index);
        }

        if (node.isBranch()){
            let numPorts = node.getInputPorts().length;

            return REAL_TO_DISPLAY_SCALE(50 * portIndexRatio(index, numPorts));
        }

        return getPortCirclePositionY(port, index);
    }
    function getOutputPortCirclePositionX(port : Port, index : number) : number {
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getRightSidePortCirclePositionX(port, index);
        }

        if (node.isBranch()){
            if (index === 0){
                return REAL_TO_DISPLAY_SCALE(200) / 2;
            }
            if (index === 1){
                return REAL_TO_DISPLAY_SCALE(200);
            }
        }

        if (node.isFlipPorts()){
            return getLeftSidePortCirclePositionX(port, index);
        } else {
            return getRightSidePortCirclePositionX(port, index);
        }
    }
    function getOutputPortCirclePositionY(port : Port, index : number) : number {
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

        if (node === null){
            console.warn("Unable to find node from port's node key", port.getNodeKey());
            return getPortCirclePositionY(port, index);
        }

        if (node.isBranch()){
            // TODO: magic number
            if (index === 0){
                return REAL_TO_DISPLAY_SCALE(100);
            }
            if (index === 1){
                return REAL_TO_DISPLAY_SCALE(100) / 2;
            }
        }

        return getPortCirclePositionY(port, index);
    }
    function getExitPortCirclePositionX(port : Port, index : number) : number {
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

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
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

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
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

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
        let node: Node = findNodeWithKey(port.getNodeKey(), nodeData);

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
        return REAL_TO_DISPLAY_SCALE(8);
    }

    function getPortCirclePositionY(port : Port, index : number) : number {
        return REAL_TO_DISPLAY_SCALE((index + 1) * PORT_HEIGHT - 5);
    }

    function getRightSidePortCirclePositionX(port : Port, index : number) : number {
        return REAL_TO_DISPLAY_SCALE(-8);
    }





    function getContentPositionX(node : Node) : number {
        // left justified
        return 8;
    }

    function getContentPositionY(node : Node) : number {
        // top
        return 16;
    }

    function getContentFill(node : Node) : string {
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

        if (node.getKey() === Eagle.selectedNodeKey){
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

    function nodeIsSelected(node : Node){
        return node.getKey() === Eagle.selectedNodeKey ? "selected" : null;
    }

    function nodeOnClick(node : Node, index : number) : void {
        //console.log("clicked on node", index, "key", node.getKey(), "name", node.getName());
        selectNode(node);
        tick();
    }

    function findDepthOfNode(index: number, nodes : Node[]) : number {
        if (index >= nodes.length){
            console.warn("findDepthOfNode() with node index outside range of nodes. index:", index, "nodes.length", nodes.length);
            return 0;
        }

        var depth : number = 0;
        var node : Node = nodes[index];
        var nodeKey : number = node.getKey();
        var nodeParentKey : number = node.getParentKey();

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
        var indexPlusDepths : {index:number, depth:number}[] = [];
        var result : Node[] = [];

        // populate key plus depths
        for (var i = 0 ; i < nodes.length ; i++){
            var depth = findDepthOfNode(i, nodes);

            indexPlusDepths.push({index:i, depth:depth});
        }

        // sort nodes in depth ascending
        indexPlusDepths.sort(function(a, b){
            return a.depth - b.depth;
        });

        // write nodes to result in sorted order
        for (var i = 0 ; i < indexPlusDepths.length ; i++){
            result.push(nodes[indexPlusDepths[i].index]);
        }

        return result;
    }

    function findNodeWithKey(key: number, nodes: Node[]) : Node {
        if (key === null){
            return null;
        }

        for (var i = 0 ; i < nodes.length; i++){
            if (nodes[i].getKey() === key){
                //console.log("found node", i);
                return nodes[i];
            }

            // check if the node's inputApp has a matching key
            if (nodes[i].hasInputApplication()){
                if (nodes[i].getInputApplication().getKey() === key){
                    return nodes[i].getInputApplication();
                }
            }

            // check if the node's outputApp has a matching key
            if (nodes[i].hasOutputApplication()){
                if (nodes[i].getOutputApplication().getKey() === key){
                    return nodes[i].getOutputApplication();
                }
            }

            // check if the node's exitApp has a matching key
            if (nodes[i].hasExitApplication()){
                if (nodes[i].getExitApplication().getKey() === key){
                    return nodes[i].getExitApplication();
                }
            }
        }

        console.warn("Cannot find node with key", key);
        return null;
    }

    function findNodeIndexWithKey(key: number) : number {
        //console.log("findNodeIndexWithKey()", key);

        for (var i = 0 ; i < nodeData.length; i++){
            if (nodeData[i].getKey() === key){
                //console.log("found node", i);
                return i;
            }
        }
        return -1;
    }

    function getEdgeDisplay(edge : Edge) : string {
        var srcNode : Node = findNodeWithKey(edge.getSrcNodeKey(), nodeData);
        var destNode : Node = findNodeWithKey(edge.getDestNodeKey(), nodeData);

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
        var node : Node = findNodeWithKey(edge.getSrcNodeKey(), nodeData);

        // check if an ancestor is collapsed, if so, use center of ancestor
        var collapsedAncestor : Node = findAncestorCollapsedNode(node);
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
            let portIndex = findNodePortIndex(node, edge.getSrcPortId());

            if (portIndex === 0){
                return node.getPosition().x + node.getWidth()/2;
            }
            if (portIndex === 1){
                return node.getPosition().x + node.getWidth();
            }
        }

        // check if node is an embedded app, if so, use position of the construct in which the app is embedded
        if (node.isEmbedded()){
            let containingConstruct : Node = findNodeWithKey(node.getEmbedKey(), nodeData);
            return findNodePortPosition(containingConstruct, edge.getSrcPortId(), true).x;
        }

        return findNodePortPosition(node, edge.getSrcPortId(), true).x;
    }

    function edgeGetY1(edge: Edge) : number {
        var node : Node = findNodeWithKey(edge.getSrcNodeKey(), nodeData);

        // check if an ancestor is collapsed, if so, use center of ancestor
        var collapsedAncestor : Node = findAncestorCollapsedNode(node);
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
            let portIndex = findNodePortIndex(node, edge.getSrcPortId());

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
            let containingConstruct : Node = findNodeWithKey(node.getEmbedKey(), nodeData);
            return findNodePortPosition(containingConstruct, edge.getSrcPortId(), true).y - PORT_ICON_HEIGHT;
        }

        return findNodePortPosition(node, edge.getSrcPortId(), true).y - PORT_ICON_HEIGHT;
    }

    function edgeGetX2(edge: Edge) : number {
        var node : Node = findNodeWithKey(edge.getDestNodeKey(), nodeData);

        // check if an ancestor is collapsed, if so, use center of ancestor
        var collapsedAncestor : Node = findAncestorCollapsedNode(node);
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
            let portIndex = findNodePortIndex(node, edge.getDestPortId());
            let numPorts = node.getInputPorts().length;

            return node.getPosition().x + node.getWidth()/2 - node.getWidth()/2 * portIndexRatio(portIndex, numPorts);
        }

        // check if node is an embedded app, if so, use position of the construct in which the app is embedded
        if (node.isEmbedded()){
            let containingConstruct : Node = findNodeWithKey(node.getEmbedKey(), nodeData);
            return findNodePortPosition(containingConstruct, edge.getDestPortId(), false).x;
        }

        return findNodePortPosition(node, edge.getDestPortId(), false).x;
    }

    function edgeGetY2(edge: Edge) : number {
        var node : Node = findNodeWithKey(edge.getDestNodeKey(), nodeData);

        // check if an ancestor is collapsed, if so, use center of ancestor
        var collapsedAncestor : Node = findAncestorCollapsedNode(node);
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
            let portIndex = findNodePortIndex(node, edge.getDestPortId());
            let numPorts = node.getInputPorts().length;

            return node.getPosition().y + 50 * portIndexRatio(portIndex, numPorts);
        }

        // check if node is an embedded app, if so, use position of the construct in which the app is embedded
        if (node.isEmbedded()){
            let containingConstruct : Node = findNodeWithKey(node.getEmbedKey(), nodeData);
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
        var local : boolean;
        var input : boolean;
        var index : number;
        var flipped : boolean = node.isFlipPorts();
        var position = {x: node.getPosition().x, y: node.getPosition().y};

        // find the port within the node
        for (var i = 0 ; i < node.getInputPorts().length ; i++){
            var port : Port = node.getInputPorts()[i];
            if (port.getId() === portId){
                local = false;
                input = true;
                index = i;
            }
        }

        for (var i = 0 ; i < node.getOutputPorts().length ; i++){
            var port : Port = node.getOutputPorts()[i];
            if (port.getId() === portId){
                local = false;
                input = false;
                index = i;
            }
        }

        // check input application ports
        for (var i = 0 ; i < node.getInputApplicationInputPorts().length ; i++){
            var port : Port = node.getInputApplicationInputPorts()[i];
            if (port.getId() === portId){
                local = false;
                input = true;
                index = i;
            }
        }

        for (var i = 0 ; i < node.getInputApplicationOutputPorts().length ; i++){
            var port : Port = node.getInputApplicationOutputPorts()[i];
            if (port.getId() === portId){
                local = true;
                input = true;
                index = i + node.getInputApplicationInputPorts().length;
            }
        }

        // check output application ports
        for (var i = 0 ; i < node.getOutputApplicationInputPorts().length ; i++){
            var port : Port = node.getOutputApplicationInputPorts()[i];
            if (port.getId() === portId){
                local = true;
                input = false;
                index = i + node.getOutputApplicationOutputPorts().length;
            }
        }
        for (var i = 0 ; i < node.getOutputApplicationOutputPorts().length ; i++){
            var port : Port = node.getOutputApplicationOutputPorts()[i];
            if (port.getId() === portId){
                local = false;
                input = false;
                index = i;
            }
        }

        // check exit application ports
        for (var i = 0 ; i < node.getExitApplicationInputPorts().length ; i++){
            var port : Port = node.getExitApplicationInputPorts()[i];
            if (port.getId() === portId){
                local = true;
                input = false;
                index = i + node.getExitApplicationOutputPorts().length;
            }
        }
        for (var i = 0 ; i < node.getExitApplicationOutputPorts().length ; i++){
            var port : Port = node.getExitApplicationOutputPorts()[i];
            if (port.getId() === portId){
                local = false;
                input = false;
                index = i;
            }
        }

        //console.log("findNodePortPosition(): node.name", node.getName(), "portId", portId, "inset", inset, "local", local, "input", input, "index", index);

        // determine whether we need to move down an extra amount to clear the apps display title row
        var appsOffset : number = 0;
        if (Node.canHaveInputApp(node) || Node.canHaveOutputApp(node) || Node.canHaveExitApp(node)){
            appsOffset = APPS_HEIGHT;
        }

        // translate the three pieces of info into the x,y position
        // outer if is an XOR
        if ((input && !flipped) || (!input && flipped)){
            // left hand side
            if (inset){
                position.x += PORT_INSET;
            }
            if (local){
                position.y += HEADER_HEIGHT + appsOffset + (node.getInputPorts().length + index + 1) * PORT_HEIGHT;
            } else {
                position.y += HEADER_HEIGHT + appsOffset + (index + 1) * PORT_HEIGHT;
            }
        } else {
            // right hand side
            if (inset){
                position.x += node.getWidth() - PORT_INSET;
            } else {
                position.x += node.getWidth();
            }
            if (local){
                position.y += HEADER_HEIGHT + appsOffset + (node.getOutputPorts().length + index + 1) * PORT_HEIGHT;
            } else {
                position.y += HEADER_HEIGHT + appsOffset + (index + 1) * PORT_HEIGHT;
            }
        }

        return position;
    }

    function findNodePortIndex(node: Node, portId: string){
        // find the port within the node
        for (var i = 0 ; i < node.getInputPorts().length ; i++){
            var port : Port = node.getInputPorts()[i];
            if (port.getId() === portId){
                return i;
            }
        }

        for (var i = 0 ; i < node.getOutputPorts().length ; i++){
            var port : Port = node.getOutputPorts()[i];
            if (port.getId() === portId){
                return i;
            }
        }

        return -1;
    }

    function edgeGetStrokeColor(edge: Edge, index: number) : string {
        var linkValid : Eagle.LinkValid = Edge.isValid(graph, edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), false, false);

        if (linkValid === Eagle.LinkValid.Invalid)
            return LINK_INVALID_COLOR;
        if (linkValid === Eagle.LinkValid.Warning)
            return LINK_WARNING_COLOR;

        return edge === eagle.selectedEdge() ? "black" : "grey";
    }

    function edgeGetStrokeDashArray(edge: Edge, index: number) : string {
        let srcNode : Node = eagle.logicalGraph().findNodeByKey(edge.getSrcNodeKey());

        // if we can't find the edge
        if (srcNode === null){
            return "";
        }

        let srcPort : Port = srcNode.findPortById(edge.getSrcPortId());

        if (srcPort.isEvent()){
            return "8";
        } else {
            return "";
        }
    }

    function edgeExtraGetStrokeColor(edge: Edge, index: number) : string {
        return "grey"; // note: stroke-opacity is set to zero, so the color doesn't matter here
    }

    function draggingEdgeGetStrokeColor(edge: Edge, index: number) : string {
        switch (isDraggingPortValid){
            case Eagle.LinkValid.Unknown:
                return "black";
            case Eagle.LinkValid.Invalid:
                return LINK_INVALID_COLOR;
            case Eagle.LinkValid.Warning:
                return LINK_WARNING_COLOR;
            case Eagle.LinkValid.Valid:
                return LINK_VALID_COLOR;
        }
    }

    function addEdge(srcNodeKey : number, srcPortId : string, destNodeKey : number, destPortId : string, dataType : string) : void {
        console.log("addLink()", "port", srcPortId, "on node", srcNodeKey, "to port", destPortId, "on node", destNodeKey);

        if (srcPortId === destPortId){
            console.warn("Abort addLink() from port to itself!");
            return;
        }

        graph.addEdge(srcNodeKey, srcPortId, destNodeKey, destPortId, dataType, (edge : Edge) : void =>{
            eagle.flagActiveDiagramHasMutated();
            //eagle.setSelection(Eagle.RightWindowMode.EdgeInspector, edge);

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
        //console.log("clicked on edge", index, "fromNode", edge.getSrcNodeKey(), "toNode", edge.getDestNodeKey());
        selectEdge(edge);
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
        var subjectNode : Node = findNodeWithKey(node.getSubjectKey(), nodeData);

        let x1, y1, x2, y2;

        if (node.isFlipPorts()){
            x1 = REAL_TO_DISPLAY_POSITION_X(node.getPosition().x);
            y1 = REAL_TO_DISPLAY_POSITION_Y(node.getPosition().y);
        } else {
            x1 = REAL_TO_DISPLAY_POSITION_X(node.getPosition().x + node.getWidth());
            y1 = REAL_TO_DISPLAY_POSITION_Y(node.getPosition().y);
        }

        if (node.isFlipPorts()){
            x2 = REAL_TO_DISPLAY_POSITION_X(subjectNode.getPosition().x + subjectNode.getWidth());
            y2 = REAL_TO_DISPLAY_POSITION_Y(subjectNode.getPosition().y);
        } else {
            x2 = REAL_TO_DISPLAY_POSITION_X(subjectNode.getPosition().x);
            y2 = REAL_TO_DISPLAY_POSITION_Y(subjectNode.getPosition().y);
        }

        // determine incident directions for start and end of edge
        let startDirection = node.isFlipPorts() ? Eagle.Direction.Right : Eagle.Direction.Left;
        let endDirection = node.isFlipPorts() ? Eagle.Direction.Left : Eagle.Direction.Right;

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
        var c1x = x1 + directionOffset(true, startDirection);
        var c1y = y1 + directionOffset(false, startDirection);
        var c2x = x2 - directionOffset(true, endDirection);
        var c2y = y2 - directionOffset(false, endDirection);

        return "M " + x1 + " " + y1 + " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + x2 + " " + y2;
    }

    function shrinkOnClick(node : Node, index : number){
        console.log("shrink node", index);

        eagle.logicalGraph().shrinkNode(node);
        eagle.flagActiveDiagramHasMutated();
    }

    function collapseOnClick(node : Node, index : number){
        console.log("collapse node", index);

        // abort collapse of non-group node
        if (!node.isGroup()){
            return;
        }

        node.setCollapsed(true);
        eagle.flagActiveDiagramHasMutated();
    }

    function expandOnClick(node : Node, index : number){
        console.log("expand node", index);

        // abort expand of non-group node
        if (!node.isGroup()){
            return;
        }

        node.setCollapsed(false);
        eagle.flagActiveDiagramHasMutated();
    }

    // sort nodes depth first
    function reOrderNodes(parentKey : number, childKey : number) : void {
        //find indices of parent and child
        var parentIndex : number = findNodeIndexWithKey(parentKey);
        var childIndex : number = findNodeIndexWithKey(childKey);
        console.log("before: parent", parentIndex, "child", childIndex);

        // abort if child already occurs after parent (this is good)
        if (childIndex > parentIndex){
            return;
        }

        // move the child to the position after the parent
        var child : Node = nodeData.splice(childIndex, 1)[0];
        nodeData.splice(parentIndex, 0, child);

        // debug
        var postParentIndex : number = findNodeIndexWithKey(parentKey);
        var postChildIndex : number = findNodeIndexWithKey(childKey);
        console.log("after: parent", postParentIndex, "child", postChildIndex);
    }

    function moveChildNodes(nodeIndex : number, deltax : number, deltay : number) : void {
        // get id of parent nodeIndex
        var parentKey : number = nodeData[nodeIndex].getKey();

        // loop through all nodes, if they belong to the parent's group, move them too
        for (var i = 0 ; i < nodeData.length ; i++){
            var node = nodeData[i];

            if (node.getParentKey() === parentKey){
                moveNode(node, deltax, deltay);
                moveChildNodes(i, deltax, deltay);
            }
        }
    }

    function moveNode(node : Node, deltax : number, deltay : number) : void {
        node.setPosition(getX(node) + deltax, getY(node) + deltay);
    }

    function findAncestorCollapsedNode(node : Node) : Node {
        //console.log("findAncestorCollapsedNode()", node.getName(), node.getKey());

        var n : Node = node;
        var iterations = 0;

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

            var oldKey : number = n.getKey();
            //console.log("oldKey", oldKey);
            //console.log("parentKey", n.getParentKey());

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
                // DEBUG
                //console.log("newKey", n.getKey());
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

    function findMultiplicity(node : Node) : number {
        var n : Node = node;
        var result : number = 1;
        var iterations : number = 0;

        while (true){
            if (iterations > 10){
                console.error("too many iterations in findMultiplicity()");
                break;
            }

            iterations += 1;

            n = findNodeWithKey(n.getParentKey(), nodeData);

            if (n === null){
                break;
            }

            result *= n.getLocalMultiplicity();
        }

        return result;
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
                let half_width = REAL_TO_DISPLAY_SCALE(200) / 2;
                let half_height = REAL_TO_DISPLAY_SCALE(100) / 2;

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

    // whether or not the collapse button is visible
    function getCollapseButtonDisplay(node : Node) : string {
        if (COLLAPSE_BUTTONS_ENABLED){
            if (node.isGroup()){
                return node.isCollapsed() ? "none" : "inline";
            } else {
                return "none";
            }
        }
        else {
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

    // whether or not the expand button is visible
    function getExpandButtonDisplay(node : Node) : string {
        if (COLLAPSE_BUTTONS_ENABLED){
            if (node.isGroup()){
                return node.isCollapsed() ? "inline" : "none";
            } else {
                return "none";
            }
        }
        else {
            return "none";
        }
    }

    function checkForNodeAt(x: number, y: number) : Node {
        for (var i = nodeData.length - 1; i >= 0 ; i--){
            var node : Node = nodeData[i];

            // abort if node is not a group
            if (!node.isGroup()){
                continue;
            }

            //console.log("node", node.getName(), "real topleft", node.getPosition().x, node.getPosition().y, "bottomright", node.getPosition().x + getWidth(node), node.getPosition().y + getHeight(node));
            //console.log("node", node.getName(), "disp topleft", REAL_TO_DISPLAY_POSITION_X(node.getPosition().x), REAL_TO_DISPLAY_POSITION_Y(node.getPosition().y), "bottomright", REAL_TO_DISPLAY_POSITION_X(node.getPosition().x + getWidth(node)), REAL_TO_DISPLAY_POSITION_Y(node.getPosition().y + getHeight(node)));

            if (x >= node.getPosition().x && (node.getPosition().x + getWidth(node)) >= x &&
                y >= node.getPosition().y && (node.getPosition().y + getHeight(node)) >= y){
                return node;
            }
        }
        return null;
    }

    function mouseEnterPort(port : Port) : void {
        //console.log("mouseEnterPort nodeKey", port.getNodeKey(), "portId", port.getId());
        if (!isDraggingPort){
            return;
        }


        destinationPortId = port.getId();
        destinationNodeKey = port.getNodeKey();

        isDraggingPortValid = Edge.isValid(graph, sourceNodeKey, sourcePortId, destinationNodeKey, destinationPortId, true, true);
    }

    function mouseLeavePort(port : Port) : void {
        //console.log("mouseLeavePort nodeKey", null, "portId", null);

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
        var s : string = "";

        // loop through all nodes, if they belong to the parent's group, move them too
        for (var i = 0 ; i < ns.length ; i++){
            var node = ns[i];
            s += node.getKey() + ', ';
        }

        return s;
    }

    function wrap(text : any, width : number) {
        //console.log("wrap", width);
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line : string[] = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr("y"),
                //dy = parseFloat(text.attr("dy")),
                dy = 0.0,
                tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
        });
    }
}
