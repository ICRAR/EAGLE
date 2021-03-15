import * as ko from "knockout";
import * as d3 from "d3";
import * as $ from "jquery";

import {Eagle} from '../Eagle';
import {Palette} from '../Palette';
import {Node} from '../Node';

ko.bindingHandlers.paletteRenderer = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        //console.log("bindingHandlers.paletteRenderer.init()");
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        //console.log("bindingHandlers.paletteRenderer.update()");

        var palette : Palette = ko.unwrap(valueAccessor());

        if (palette === null){
            //console.warn("paletteRenderer update(): palette is null");
            return;
        }

        $(element).empty();

        render(palette, element.id, bindingContext.$root);
    }
};


function render(palette : Palette, elementId : string, eagle : Eagle){
    var nodeData = palette.getNodes();
    
    var selectedNodeIndex : number = -1;

    var svgContainer = d3.select("#" + elementId)
                        .append("svg");

    var background = svgContainer.append("rect")
                                    .attr("class", "background");

    // TODO: ideally we would not use the 'any' type here
    var nodes : any = svgContainer.selectAll("g")
                              .data(nodeData)
                              .enter()
                              .append("g")
                              .attr("transform", nodeGetTranslation)
                              .attr("class", "node")
                              .attr("id", function(node : Node, index : number){return "paletteNode" + index;});

    var rects = nodes.append("rect")
                              .attr("width", getWidth)
                              .attr("height", getHeight)
                              .attr("class", "paletteNode")
                              .on("click", nodeOnClick);

    // add a heading background to each node
    var headingBackgrounds = nodes.append("rect")
                                    .attr("class", "header-background")
                                    .attr("width", getWidth)
                                    .attr("height", 28)
                                    .style("fill", getColor)
                                    .on("click", nodeOnClick);

    // add a text heading to each node
    var text = nodes.append("text")
                     .attr("class", "header")
                     .attr("x", function(node : Node, index : number){return getWidth(node) /2;})
                     .attr("y", 20)
                     .style("fill", "white")
                     .text( function (node : Node) {return node.getCategoryType() + ":" + node.getName()});


    function tick(){
        //console.log("tick");

        // enter any new nodes
        svgContainer.selectAll("g.node")
                                .data(nodeData)
                                .enter()
                                .insert("g")
                                .attr("class", "node")
                                .attr("id", function(node : Node, index : number){return "paletteNode" + index;});

        // exit any old nodes
        svgContainer.selectAll("g.node")
                            .data(nodeData)
                            .exit()
                            .remove();

        // make sure we have references to all the objects of each type
        nodes = svgContainer.selectAll("g.node")
                                .data(nodeData);

        // TODO: update attributes of all nodes
        nodes.attr("transform", nodeGetTranslation);

        svgContainer.selectAll("g.node rect:not(.header-background)")
                                .data(nodeData)
                                .attr("class", nodeIsSelected)
                                .attr("width", getWidth)
                                .attr("height", getHeight)
                                .on("click", nodeOnClick);

        svgContainer.selectAll("g.node rect.header-background")
                                .data(nodeData)
                                .attr("width", getWidth)
                                .attr("height", 28)
                                .style("fill", getColor)
                                .style("stroke", function(node:Node){return node === eagle.selectedNode() ? "black" : "grey";});

        svgContainer.selectAll("g.node text.header")
                                .data(nodeData)
                                .attr("x", function(node : Node, index : number){return getWidth(node) /2;})
                                .attr("y", 20)
                                .style("fill", "white")
                                .text( function (node : Node) {return node.getCategoryType() + ":" + node.getName();});
    }

    function selectNode(index : number){
        //console.log("selectNode(" + index + ")");
        selectedNodeIndex = index;

        if (index !== -1){
            var node : Node = nodeData[index];
            eagle.setSelection(Eagle.RightWindowMode.NodeInspector, node);
        }
    }

    function buildTranslation(x : number, y : number) : string {
        return "translate(" + x.toString() + "," + y.toString() + ")";
    }

    function nodeGetTranslation(node : Node, index : number) : string {
        return buildTranslation(500, (index * 54) + 24); // use 50 (instead of 48) here to account for border
    }

    function getWidth(node : Node) : number {
        return 400;
    }

    function getHeight(node : Node) : number {
        return 48;
    }

    function getColor(node : Node) : string {
        return node.getColor();
    }

    function nodeIsSelected(data : any, index : number){
        return index === selectedNodeIndex ? "paletteNode selected" : "paletteNode";
    }

    function nodeOnClick(node : Node, index : number) : void {
        //console.log("clicked on node", index, "key", node.getKey(), "name", node.getName());
        selectNode(index);
        tick();
    }
}
