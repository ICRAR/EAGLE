/*
#
#    ICRAR - International Centre for Radio Astronomy Research
#    (c) UWA - The University of Western Australia, 2016
#    Copyright by UWA (in the framework of the ICRAR)
#    All rights reserved
#
#    This library is free software; you can redistribute it and/or
#    modify it under the terms of the GNU Lesser General Public
#    License as published by the Free Software Foundation; either
#    version 2.1 of the License, or (at your option) any later version.
#
#    This library is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
#    Lesser General Public License for more details.
#
#    You should have received a copy of the GNU Lesser General Public
#    License along with this library; if not, write to the Free Software
#    Foundation, Inc., 59 Temple Place, Suite 330, Boston,
#    MA 02111-1307  USA
#
*/

import * as ko from "knockout";

import { Category } from './Category';
import { Eagle } from './Eagle';
import { Edge } from "./Edge";
import { Field } from './Field';
import { GraphConfig } from './graphConfig';
import { LogicalGraph } from './LogicalGraph';
import { Node } from './Node';
import { Utils } from './Utils';
import { CategoryData} from './CategoryData';
import {Setting, SettingsGroup} from './Setting';
import { RightClick } from "./RightClick";

ko.bindingHandlers.nodeRenderHandler = {
    init: function(element:any, valueAccessor, allBindings) {
        const node: Node = ko.unwrap(valueAccessor())

        //overwriting css variables using colours from graphConfig.ts. I am using this for simple styling to avoid excessive css data binds in the node html files
        $("#logicalGraphParent").get(0).style.setProperty("--selectedBg", GraphConfig.getColor('selectBackground'));
        $("#logicalGraphParent").get(0).style.setProperty("--selectedConstructBg", GraphConfig.getColor('selectConstructBackground'));
        $("#logicalGraphParent").get(0).style.setProperty("--nodeBorder", GraphConfig.getColor('bodyBorder'));
        $("#logicalGraphParent").get(0).style.setProperty("--nodeBg", GraphConfig.getColor('nodeBg'));
        $("#logicalGraphParent").get(0).style.setProperty("--graphText", GraphConfig.getColor('graphText'));
        $("#logicalGraphParent").get(0).style.setProperty("--branchBg", GraphConfig.getColor('branchBg'));
        $("#logicalGraphParent").get(0).style.setProperty("--constructBg", GraphConfig.getColor('constructBg'));
        $("#logicalGraphParent").get(0).style.setProperty("--constructIcon", GraphConfig.getColor('constructIcon'));
        $("#logicalGraphParent").get(0).style.setProperty("--commentEdgeColor", GraphConfig.getColor('commentEdge'));
        
        if( node.isData()){
            $(element).find('.body').css('background-color:#575757','color:white')
        }
    },
    update: function (element:any, valueAccessor, allBindings, viewModel, bindingContext) {
        const eagle : Eagle = Eagle.getInstance();

        GraphRenderer.nodeData = GraphRenderer.depthFirstTraversalOfNodes(eagle.logicalGraph(), eagle.showDataNodes());
        const node: Node = ko.unwrap(valueAccessor());

        // set size
        $(element).css({'height':node.getRadius()*2+'px','width':node.getRadius()*2+'px'});
    },
};

ko.bindingHandlers.graphRendererPortPosition = {
    init: function(element:any, valueAccessor, allBindings) {

    },
    update: function (element:any, valueAccessor) {
        //the update function is called initially and then whenever a change to a utilised observable occurs
        const eagle : Eagle = Eagle.getInstance();
        
        const data = ko.utils.unwrapObservable(valueAccessor()).data;
        const dataType: string = ko.utils.unwrapObservable(valueAccessor()).type;

        const portOnEmbeddedApp = false //used to identify when we are calculating the port position for a port on an embedded application

        // determine the 'node' and 'field' attributes (for this way of using this binding)
        let node : Node 
        let field : Field

        switch(dataType){
            case 'inputApp':
                // console.log(data.getName(), 'is input app')
                node = eagle.logicalGraph().findNodeByKeyQuiet(data.getEmbedKey())
                for(const port of data.getFields()){
                    if (port.isInputPort()){
                        field = port
                    }
                }
                break;
            case 'outputApp':
                // console.log(data.getName(), 'is output app')
                node = eagle.logicalGraph().findNodeByKeyQuiet(data.getEmbedKey())
                for(const port of data.getFields()){
                    if (port.isOutputPort()){
                        field = port
                    }
                }
                break;
            case 'inputPort':
            case 'outputPort':
                node = eagle.logicalGraph().findNodeByKeyQuiet(data.getNodeKey())
                field = data
                break;
            case 'comment':
                node = data
                field = null
                break;
        }

        // clearing the saved port angles array
        node.resetPortAngles()

        // determine all the adjacent nodes
        const adjacentNodes: Node[] = [];
        let connectedField:boolean=false;

        switch(dataType){
            case 'comment':
                const adjacentNode: Node = eagle.logicalGraph().findNodeByKeyQuiet(data.getSubjectKey());

                if (adjacentNode === null){
                    console.warn("Could not find adjacentNode for comment with subjectKey", data.getSubjectKey());
                    return;
                }

                adjacentNodes.push(adjacentNode);
                break;

            case 'inputApp':
            case 'inputPort':
                for(const edge of eagle.logicalGraph().getEdges()){
                    if(field.getId()===edge.getDestPortId()){
                        const adjacentNode: Node = eagle.logicalGraph().findNodeByKeyQuiet(edge.getSrcNodeKey());
                        connectedField=true
                        adjacentNodes.push(adjacentNode);
                        continue;
                    }
                }
                break;

            case 'outputApp':
            case 'outputPort':
                for(const edge of eagle.logicalGraph().getEdges()){
                    if(field.getId()===edge.getSrcPortId()){
                        const adjacentNode: Node = eagle.logicalGraph().findNodeByKeyQuiet(edge.getDestNodeKey());
                        connectedField=true
                        adjacentNodes.push(adjacentNode);
                        continue;
                    }
                }
                break;
        }

        //for branch nodes the ports are inset from the outer radius a little bit in their design
        let nodeRadius = node.getRadius()
        if(portOnEmbeddedApp){
            // if we are working with ports of an embedded app, we need to use the parent construct to calculate the angle, but we want to use the radius of the embedded app to place the port
            nodeRadius = eagle.logicalGraph().findNodeByKeyQuiet(data.getNodeKey()).getRadius()
        }

        // determine port position
        const currentNodePos = node.getPosition();
        let portPosition;

        if(connectedField || dataType === 'comment'){

            // calculate angles to all adjacent nodes
            const angles: number[] = [];
            for (const adjacentNode of adjacentNodes){
                const adjacentNodePos = adjacentNode.getPosition()
                const edgeAngle = GraphRenderer.calculateConnectionAngle(currentNodePos, adjacentNodePos)
                angles.push(edgeAngle);
            }

            // average the angles
            const averageAngle = GraphRenderer.averageAngles(angles);

            node.addPortAngle(averageAngle);
            portPosition = GraphRenderer.calculatePortPos(averageAngle, nodeRadius, nodeRadius)
        }else{
            // find a default position for the port when not connected
            switch (dataType){
                case 'inputApp':
                case 'inputPort':
                    portPosition=GraphRenderer.calculatePortPos(Math.PI, nodeRadius, nodeRadius)
                    break;
                case 'outputApp':
                case 'outputPort':
                    portPosition=GraphRenderer.calculatePortPos(0, nodeRadius, nodeRadius)
                    break;
                default:
                    console.warn("disconnected field with dataType:", dataType);
                    portPosition=GraphRenderer.calculatePortPos(Math.PI/2, nodeRadius, nodeRadius)
                    break;
            }
        }

        //a little 1px reduction is needed to center ports for some reason
        if(!node.isBranch()){
            portPosition = {x:portPosition.x-1,y:portPosition.y-1}
        }

        if (dataType === 'inputPort'){
            field.setInputPosition(portPosition.x, portPosition.y);
        } else if (dataType === 'outputPort'){
            field.setOutputPosition(portPosition.x, portPosition.y);
        }else if (dataType === 'inputApp' || dataType === 'outputApp'){
            //we are saving the embedded application's position data here using the offset we calculated
            const newPos = {x: node.getPosition().x-nodeRadius+portPosition.x, y:node.getPosition().y-nodeRadius+portPosition.y}
            data.setPosition(newPos.x,newPos.y)
            portPosition = {x:portPosition.x-nodeRadius,y:portPosition.y-nodeRadius}
        }

        //applying the offset to the element
        $(element).css({'top':portPosition.y+'px','left':portPosition.x+'px'})
    }
};

export class GraphRenderer {

    static nodeData : Node[] =null

    //port drag handler globals
    static draggingPort : boolean = false
    static destinationPort : Field = null;
    static destinationNode : Node = null;
    static portDragSourceNode : Node = null;
    static portDragSourcePort : Field = null;
    static portDragSourcePortIsInput :boolean =false;
    static portDragSuggestedNode : Node |null = null;
    static portDragSuggestedField : Field |null = null;

    //node drag handler globals
    static NodeParentRadiusPreDrag : number = null;
    static nodeDragElement : any = null
    // static isDraggingPortValid : Eagle.LinkValid = Eagle.LinkValid.Unknown;


    static graphMousePos = { x: -1, y: -1 };


    static averageAngles(angles: number[]) : number {
        let x: number = 0;
        let y: number = 0;

        for (const angle of angles) {
            x += Math.cos(angle)
            y += Math.sin(angle)
        }

        return Math.atan2(y, x);
    }

    static directionOffset(x: boolean, direction: Eagle.Direction){
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
    
    static calculateConnectionAngle(currentNodePos:any, linkedNodePos:any) : number {
        const xDistance = linkedNodePos.x-currentNodePos.x
        const yDistance = currentNodePos.y-linkedNodePos.y
        const angle = Math.atan2(yDistance, xDistance)
        return angle
    }
    
    static calculatePortPos(angle:number, nodeRadius:number, portRadius:number) : {x:number, y:number} {
        const newX = nodeRadius+(portRadius*Math.cos(angle))
        const newY = nodeRadius-(portRadius*Math.sin(angle))

        return {x: newX, y: newY};
    }
    
    static getCurveDirection(angle:any) : any {
        let result 
        if(angle > Math.PI/4 && angle < 3*Math.PI/4){
            result = Eagle.Direction.Up
        }else if(angle < -Math.PI/4 && angle > -3*Math.PI/4){
            result = Eagle.Direction.Down
        }else if(angle > -Math.PI/4 && angle < Math.PI/4){
            result = Eagle.Direction.Right
        }else{
            result = Eagle.Direction.Left
        }
        return result
    }

    static edgeDirectionAngle(angle: number): number {
        const PiOver2: number = Math.PI / 2;
        const PiOver4: number = Math.PI / 4;

        // find the nearest compass angle
        const nearestCompassAngle = PiOver2 * Math.round(angle / PiOver2);

        // find the difference between the given angle and the nearest compass angle
        const diffAngle = Math.abs(angle - nearestCompassAngle);

        // the maximum difference will be PI/4, so get the turn the difference into a ratio between 0 and 1.
        const diffRatio = diffAngle / PiOver4;

        // now interpolate between the original angle, and the nearest compass angle, using the ratio calculated above
        // this "weights" the interpolation towards the compass directions 
        const interpolatedAngle = (diffRatio * angle) + ((1-diffRatio) * nearestCompassAngle);

        return interpolatedAngle;
    }

    static createBezier(edge:Edge, srcNodeRadius:number, destNodeRadius:number, srcNodePosition: {x: number, y: number}, destNodePosition: {x: number, y: number}, srcField: Field, destField: Field) : string {
        //console.log("createBezier", srcNodePosition, destNodePosition);

        //since the svg parent is translated -50% to center our working area, we need to add half of its width to correct the positions
        destNodePosition={x:destNodePosition.x+5000,y:destNodePosition.y+5000}
        srcNodePosition={x:srcNodePosition.x+5000,y:srcNodePosition.y+5000}

        // determine if the edge falls below a certain length threshold
        const edgeLength = Math.sqrt((destNodePosition.x - srcNodePosition.x)**2 + (destNodePosition.y - srcNodePosition.y)**2);
        const isShortEdge: boolean = edgeLength < srcNodeRadius * 3;

        // calculate the length from the src and dest nodes at which the control points will be placed
        const lengthToControlPoints = edgeLength * 0.4;

        // calculate the angle for the src and dest ports
        const srcPortAngle: number = GraphRenderer.calculateConnectionAngle(srcNodePosition, destNodePosition);
        const destPortAngle: number = srcPortAngle + Math.PI;

        // calculate the offset for the src and dest ports, based on the angles
        let srcPortOffset;
        let destPortOffset;
        if (srcField){
            srcPortOffset = srcField.getOutputPosition();
        } else {
            srcPortOffset = GraphRenderer.calculatePortPos(srcPortAngle, srcNodeRadius, srcNodeRadius);
        }
        if (destField){
            destPortOffset = destField.getInputPosition();
        } else {
            destPortOffset = GraphRenderer.calculatePortPos(destPortAngle, destNodeRadius, destNodeRadius);
        }

        // calculate the coordinates of the start and end of the edge
        const x1 = srcNodePosition.x + srcPortOffset.x;
        const y1 = srcNodePosition.y + srcPortOffset.y;
        const x2 = destNodePosition.x + destPortOffset.x;
        const y2 = destNodePosition.y + destPortOffset.y;

        // if edge is short, use simplified rendering
        if (isShortEdge){
            return "M " + x1 + " " + y1 + " L " + x2 + " " + y2;
        }

        // otherwise, calculate an angle for the src and dest control points
        const srcCPAngle = GraphRenderer.edgeDirectionAngle(srcPortAngle);
        const destCPAngle = GraphRenderer.edgeDirectionAngle(destPortAngle);

        // calculate the offset for the src and dest control points, based on the angles
        const srcCPOffset = GraphRenderer.calculatePortPos(srcCPAngle, srcNodeRadius, lengthToControlPoints);
        const destCPOffset = GraphRenderer.calculatePortPos(destCPAngle, destNodeRadius, lengthToControlPoints);

        // calculate the coordinates of the two control points
        const c1x = srcNodePosition.x + srcCPOffset.x;
        const c1y = srcNodePosition.y + srcCPOffset.y;
        const c2x = destNodePosition.x + destCPOffset.x;
        const c2y = destNodePosition.y + destCPOffset.y;


        //the edge paramter is null if we are rendering a comment edge
        if(edge != null){
            //we are hiding the arrows if the edge is too short
            if(edgeLength > GraphConfig.EDGE_DISTANCE_ARROW_VISIBILITY){
                //were adding the position and shape of the arrow to the edges
                const arrowPosx =  GraphRenderer.getCoordinateOnBezier(0.5,x1,c1x,c2x,x2)
                const arrowPosy =  GraphRenderer.getCoordinateOnBezier(0.5,y1,c1y,c2y,y2)

                //generating the points for the arrow polygon
                let P1x = arrowPosx+GraphConfig.EDGE_ARROW_SIZE
                let P1y = arrowPosy
                let P2x = arrowPosx-GraphConfig.EDGE_ARROW_SIZE
                let P2y = arrowPosy+GraphConfig.EDGE_ARROW_SIZE
                let P3x = arrowPosx-GraphConfig.EDGE_ARROW_SIZE
                let P3y = arrowPosy-GraphConfig.EDGE_ARROW_SIZE

                //we are calculating the angle the arrow should be pointing by getting two positions on either sider of the center of the bezier curve then calculating the angle 
                const  anglePos1x =  GraphRenderer.getCoordinateOnBezier(0.45,x1,c1x,c2x,x2)
                const  anglePos1y =  GraphRenderer.getCoordinateOnBezier(0.45,y1,c1y,c2y,y2)
                const  anglePos2x =  GraphRenderer.getCoordinateOnBezier(0.55,x1,c1x,c2x,x2)
                const  anglePos2y =  GraphRenderer.getCoordinateOnBezier(0.55,y1,c1y,c2y,y2)

                const arrowAngle = GraphRenderer.calculateConnectionAngle({x:anglePos1x,y:anglePos1y}, {x:anglePos2x,y:anglePos2y})

                $('#'+edge.getId() +" polygon").show()
                $('#'+edge.getId() +" polygon").attr('points', P1x +','+P1y+', '+ P2x +','+P2y +', '+ P3x +','+P3y)
                // the rotate argument takes three inputs, (angle in deg, x , y coordinates for the mipoint to rotate around)
                $('#'+edge.getId() +" polygon").attr({'transform':'rotate('+arrowAngle*(180/Math.PI)*-1+','+arrowPosx+','+arrowPosy +')'});
            }else{
                $('#'+edge.getId() +" polygon").hide()
            }
        }


        return "M " + x1 + " " + y1 + " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + x2 + " " + y2;
    }

    static getCoordinateOnBezier(t:number,p1:number,p2:number,p3:number,p4:number) : number {
        //t is a number from 0-1 that specifies where on the curve we want the coordinates. 0.5 is the center.
        return (1-t)*(1-t)*(1-t)*p1 + 3*(1-t)*(1-t)*t*p2 + 3*(1-t)*t*t*p3 + t*t*t*p4;
    }

    static getPath(edge: Edge) : string {
        const eagle: Eagle = Eagle.getInstance();
        const lg: LogicalGraph = eagle.logicalGraph();

        const srcNode: Node = lg.findNodeByKeyQuiet(edge.getSrcNodeKey());
        const destNode: Node = lg.findNodeByKeyQuiet(edge.getDestNodeKey());

        const srcField: Field = srcNode.findFieldById(edge.getSrcPortId());
        const destField: Field = destNode.findFieldById(edge.getDestPortId());

        return this._getPath(edge,srcNode, destNode, srcField, destField, eagle);
    }

    static getPathComment(commentNode: Node) : string {
        const eagle: Eagle = Eagle.getInstance();
        const lg: LogicalGraph = eagle.logicalGraph();

        const srcNode: Node = commentNode;
        const destNode: Node = lg.findNodeByKeyQuiet(commentNode.getSubjectKey());

        return this._getPath(null,srcNode, destNode, null, null, eagle);
    }

    static _getPath(edge:Edge,srcNode: Node, destNode: Node, srcField: Field, destField: Field, eagle: Eagle) : string {
        if (srcNode === null || destNode === null){
            console.warn("Cannot getPath between null nodes. srcNode:", srcNode, "destNode:", destNode);
            return "";
        }

        const srcNodeRadius = srcNode.getRadius()
        const destNodeRadius = destNode.getRadius()

        // get offset and scale
        const offsetX: number = eagle.globalOffsetX();
        const offsetY: number = eagle.globalOffsetY();

        // we subtract node radius from all these numbers to account for the transform translate(-50%, -50%) css on the nodes
        const srcX = srcNode.getPosition().x + offsetX -srcNodeRadius;
        const srcY = srcNode.getPosition().y + offsetY -srcNodeRadius;
        const destX = destNode.getPosition().x + offsetX -destNodeRadius;
        const destY = destNode.getPosition().y + offsetY -destNodeRadius;

        return GraphRenderer.createBezier(edge,srcNodeRadius, destNodeRadius,{x:srcX, y:srcY}, {x:destX, y:destY}, srcField, destField);
    }

    static mouseMove = (eagle: Eagle, event: JQueryEventObject) : void => {
        const mouseEvent: MouseEvent = <MouseEvent>event.originalEvent;

        if (eagle.isDragging()){
            if (eagle.draggingNode() !== null){
                const node:Node = eagle.draggingNode()

                // remember node parent from before things change
                const oldParent: Node = eagle.logicalGraph().findNodeByKeyQuiet(node.getParentKey());

                if(oldParent != null){
                }

                // move node
                eagle.selectedObjects().forEach(function(obj){
                    if(obj instanceof Node){
                        obj.changePosition(mouseEvent.movementX/eagle.globalScale(), mouseEvent.movementY/eagle.globalScale());
                        // GraphRenderer.moveChildNodes(obj, mouseEvent.movementX/eagle.globalScale(), mouseEvent.movementY/eagle.globalScale());
                    }
                })


                //construct resizing 
                if(node.getParentKey() != null){
                    if(oldParent.getRadius()>GraphRenderer.NodeParentRadiusPreDrag+GraphConfig.CONSTRUCT_DRAG_OUT_DISTANCE){
                        // GraphRenderer._updateNodeParent(node, null, false, allowGraphEditing);

                        oldParent.setRadius(GraphRenderer.NodeParentRadiusPreDrag)
                    }

                }
                    // check for nodes underneath the node we dropped
                    const parent: Node = eagle.logicalGraph().checkForNodeAt(node.getPosition().x, node.getPosition().y, node.getRadius(), node.getKey(), true);

                    // check if new candidate parent is already a descendent of the node, this would cause a circular hierarchy which would be bad
                    const ancestorOfParent = GraphRenderer.isAncestor(parent, node);

                    // keep track of whether we would update any node parents
                    const updated = {parent: false};
                    const allowGraphEditing = Setting.findValue(Setting.ALLOW_GRAPH_EDITING);

                    // if a parent was found, update
                    if (parent !== null && node.getParentKey() !== parent.getKey() && node.getKey() !== parent.getKey() && !ancestorOfParent && !node.isEmbedded()){
                        GraphRenderer._updateNodeParent(node, parent.getKey(), updated, allowGraphEditing);
                    }

                    // if no parent found, update
                    if (parent === null && node.getParentKey() !== null && !node.isEmbedded()){
                        GraphRenderer._updateNodeParent(node, null, updated, allowGraphEditing);
                    }

                    // recalculate size of parent (or oldParent)
                    if (parent === null){
                        if (oldParent !== null){
                            // moved out of a construct
                            $('#'+oldParent.getId()).addClass('transition')
                            eagle.resizeConstructs();
                        }
                    } else {
                        // moved into or within a construct
                        $('#'+parent.getId()).removeClass('transition')
                        eagle.resizeConstructs();
                    }

            } else {
                // move background
                eagle.globalOffsetX(eagle.globalOffsetX() + mouseEvent.movementX/eagle.globalScale());
                eagle.globalOffsetY(eagle.globalOffsetY() + mouseEvent.movementY/eagle.globalScale());
            }
        }

        if(GraphRenderer.draggingPort){
            GraphRenderer.portDragging(event)
        }
        
    }

    static scrollZoom = (eagle: Eagle, event: JQueryEventObject) : void => {
        const wheelEvent: WheelEvent = <WheelEvent>event.originalEvent;

        if (wheelEvent.deltaY < 0){
            eagle.zoomIn();
        } else {
            eagle.zoomOut();
        }
    }

    static startDrag = (node: Node, event: MouseEvent) : void => {
        const eagle = Eagle.getInstance();
        if(node === null){
            eagle.isDragging(true);

        } else if(!node.isEmbedded()){
           //embedded nodes, aka input and output applications of constructs, cant be dragged
            eagle.isDragging(true);
            eagle.draggingNode(node);
            GraphRenderer.nodeDragElement = event.target

            if(node.getParentKey() != null){
                const parentNode = eagle.logicalGraph().findNodeByKeyQuiet(node.getParentKey())
                $('#'+parentNode.getId()).removeClass('transition')
                GraphRenderer.NodeParentRadiusPreDrag = parentNode.getRadius()
            }
        }

        //select handlers

        if(node !== null){
            // check if shift key is down, if so, add or remove selected node to/from current selection
            if (node !== null && event.shiftKey && !event.altKey){
                eagle.editSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Graph);
            } else if(!eagle.objectIsSelected(node)) {
                eagle.setSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Graph);
            }

            //check for alt clicking, if so, add the target node and its children to the selection
            if(!event.altKey&&node.isConstruct()){
                //if shift is not clicked, we first clear the selection
                if(!event.shiftKey){
                    eagle.setSelection(Eagle.RightWindowMode.Inspector, null, Eagle.FileType.Graph);
                    eagle.editSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Graph);
                }

                //getting all children, including children of child constructs etc..
                let childIsConstruct = true
                let constructs : Node[]= [node]
                
                while(childIsConstruct){
                    let constructFound = false
                    let i = -1
                    constructs.forEach(function(construct){
                        i++
                        eagle.logicalGraph().getNodes().forEach(function(obj){
                            if(obj.getParentKey()===construct.getKey()){
                                eagle.editSelection(Eagle.RightWindowMode.Inspector, obj, Eagle.FileType.Graph);
    
                                if(obj.isConstruct()){
                                    constructFound = true
                                    constructs.push(obj)
                                }
                            }
                        })
                        constructs.splice(i,1)
                    })
                    if(!constructFound){
                        childIsConstruct = false
                    }
                }
            }
        }else{
            //if node is null, the empty canvas has been clicked. clear the selection
            eagle.setSelection(Eagle.RightWindowMode.Inspector, null, Eagle.FileType.Graph);
        }
       
    }

    static endDrag = (node: Node, event: MouseEvent) : void => {
        const eagle = Eagle.getInstance();

        //console.log("endDrag", node ? node.getName() : node)
        eagle.isDragging(false);
        eagle.draggingNode(null);

        if (node != null && node.getParentKey() != null){
            const parentNode = eagle.logicalGraph().findNodeByKeyQuiet(node.getParentKey())
        }
    }

    static moveChildNodes = (node: Node, deltax : number, deltay : number) : void => {
        const eagle = Eagle.getInstance();

        // get id of parent nodeIndex
        const parentKey : number = node.getKey();

        // loop through all nodes, if they belong to the parent's group, move them too
        for (let i = 0 ; i < eagle.logicalGraph().getNodes().length ; i++){
            const node = eagle.logicalGraph().getNodes()[i];
            if (node.getParentKey() === parentKey){
                node.changePosition(deltax, deltay);
                GraphRenderer.moveChildNodes(node, deltax, deltay);
            }
        }
    }

    static isAncestor = (node : Node, possibleAncestor : Node) : boolean => {
        const eagle = Eagle.getInstance();
        let n : Node = node;
        let iterations = 0;

        if (n === null){
            return false;
        }

        while (true){
            if (iterations > 32){
                console.error("too many iterations in isDescendent()");
                return null;
            }

            iterations += 1;

            // check if found
            if (n.getKey() === possibleAncestor.getKey()){
                return true;
            }

            // otherwise keep traversing upwards
            const newKey = n.getParentKey();

            // if we reach a null parent, we are done looking
            if (newKey === null){
                return false;
            }

            //n = findNodeWithKey(newKey, nodeData);
            n = eagle.logicalGraph().findNodeByKey(newKey);
        }
    }

    // update the parent of the given node
    // however, if allGraphEditing is false, then don't update
    // always keep track of whether an update would have happened, sp we can warn user
    static _updateNodeParent = (node: Node, parentKey: number, updated: {parent: boolean}, allowGraphEditing: boolean): void => {
        if (node.getParentKey() !== parentKey){
            if (allowGraphEditing){
                node.setParentKey(parentKey);
            }
            updated.parent = true;
        }
    }

    // resize a construct so that it contains its children
    // NOTE: does not move the construct
    static resizeConstruct = (construct: Node, allowMovement: boolean = false): void => {
        const eagle = Eagle.getInstance();
        let maxDistance = 0;
        let numChildren = 0;
        // loop through all children - compute centroid
        if (allowMovement){
            let sumX = 0;
            let sumY = 0;

            for (const node of eagle.logicalGraph().getNodes()){
                if (!node.isEmbedded && node.getParentKey() === construct.getKey()){
                    sumX += node.getPosition().x;
                    sumY += node.getPosition().y;

                    numChildren = numChildren + 1;
                }
            }

            const centerX = sumX / numChildren;
            const centerY = sumY / numChildren;

            //disabled this bit of code for now because it was badly positioning constructs on graphs i designed using the new editor
            // construct.setPosition(centerX, centerY);
        }

        // loop through all children - find distance from center of construct
        for (const node of eagle.logicalGraph().getNodes()){
            if (node.getParentKey() === construct.getKey()){
                const dx = construct.getPosition().x - node.getPosition().x;
                const dy = construct.getPosition().y - node.getPosition().y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                //console.log("distance to", node.getName(), distance);

                const paddedDistance = distance + node.getRadius() + GraphConfig.CONSTRUCT_MARGIN;
                //console.log("paddedDistance to", node.getName(), paddedDistance, "(", node.getRadius(), ")");

                maxDistance = Math.max(maxDistance, paddedDistance);
            }
        }

        // make sure constructs are never below minimum size
        maxDistance = Math.max(maxDistance, GraphConfig.MINIMUM_CONSTRUCT_RADIUS);

        //console.log("Resize", construct.getName(), "radius to", maxDistance, "to contain", numChildren, "children");
        construct.setRadius(maxDistance);
    }

    static portDragStart = (port:Field,usage:string) : void => {
        const eagle = Eagle.getInstance();

        console.log('start')
        //prevents moving the node when dragging the port
        event.stopPropagation();
        
        //preparing neccessary port info 
        GraphRenderer.draggingPort = true
        GraphRenderer.portDragSourceNode = eagle.logicalGraph().findNodeByKey(port.getNodeKey());
        GraphRenderer.portDragSourcePort = port;
        GraphRenderer.portDragSourcePortIsInput = usage === 'input';

        //setting up the port event listeners
        $('#logicalGraphParent').on('mouseup.portDrag',function(){GraphRenderer.portDragEnd()})
        $('.node .body').on('mouseup.portDrag',function(){GraphRenderer.portDragEnd()})
    }

    static portDragging = (event:any) : void => {
        const eagle = Eagle.getInstance();
        console.log('drag');
        const d3DivOffset = $('#logicalGraphD3Div').offset();

        // grab and convert mouse position to graph coordinates
        const mouseX = event.pageX - d3DivOffset.left;
        const mouseY = event.pageY - d3DivOffset.top;

        GraphRenderer.graphMousePos.x = GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(mouseX);
        GraphRenderer.graphMousePos.y = GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(mouseY);
        console.log('mouse', mouseX, mouseY, 'graph', GraphRenderer.graphMousePos.x, GraphRenderer.graphMousePos.y, 'global scale', eagle.globalScale(), 'offset', eagle.globalOffsetX(), eagle.globalOffsetY())

        // check for nearby nodes
        const nearbyNodes = GraphRenderer.findNodesInRange(GraphRenderer.graphMousePos.x, GraphRenderer.graphMousePos.y, GraphConfig.NODE_SUGGESTION_RADIUS, GraphRenderer.portDragSourceNode.getKey());

        
        // check for nearest matching port in the nearby nodes
        const matchingPort: Field = GraphRenderer.findNearestMatchingPort(GraphRenderer.graphMousePos.x, GraphRenderer.graphMousePos.y, nearbyNodes, GraphRenderer.portDragSourceNode, GraphRenderer.portDragSourcePort, GraphRenderer.portDragSourcePortIsInput);

        if (matchingPort !== null){
            GraphRenderer.portDragSuggestedNode = eagle.logicalGraph().findNodeByKey(matchingPort.getNodeKey());
            GraphRenderer.portDragSuggestedField = matchingPort;
        } else {
            GraphRenderer.portDragSuggestedNode = null;
            GraphRenderer.portDragSuggestedField = null;
        }
        console.log(nearbyNodes.map(function(node){return node.getName()}),matchingPort)

        // debug - draw a red dot at the mouse position
        const screenX = GraphRenderer.GRAPH_TO_SCREEN_POSITION_X(GraphRenderer.graphMousePos.x);
        const screenY = GraphRenderer.GRAPH_TO_SCREEN_POSITION_Y(GraphRenderer.graphMousePos.y);
        //const screenX = GraphRenderer.graphMousePos.x + eagle.globalOffsetX();
        //const screenY = GraphRenderer.graphMousePos.y + eagle.globalOffsetY();

        console.log("screen:", screenX, screenY, d3DivOffset);
        $('.portport').remove()
        $('#logicalGraphD3Div').append('<div class="portport" style="z-index:200;background-color:red;height:5px;width:5px;top:'+screenY+'px;left:'+screenX+'px;position:absolute;"></div>')
    }

    static portDragEnd = () : void => {
        const eagle = Eagle.getInstance();
        console.log('end')

        GraphRenderer.draggingPort = false

        // cleaning up the port drag event listeners
        $('#logicalGraphParent').off('mouseup.portDrag')
        $('.node .body').off('mouseup.portDrag')

        console.log(GraphRenderer.destinationPort,GraphRenderer.portDragSuggestedField)
        if (GraphRenderer.destinationPort !== null || GraphRenderer.portDragSuggestedField !== null){
            const srcNode = GraphRenderer.portDragSourceNode;
            const srcPort = GraphRenderer.portDragSourcePort;

            let destNode;
            let destPort;

            if (GraphRenderer.destinationPort !== null){
                destNode = GraphRenderer.destinationNode;
                destPort = GraphRenderer.destinationPort;
            } else {
                destNode = GraphRenderer.portDragSuggestedNode;
                destPort = GraphRenderer.portDragSuggestedField;
            }

            // check if edge is back-to-front (input-to-output), if so, swap the source and destination
            //const backToFront : boolean = (srcPortType === "input" || srcPortType === "outputLocal") && (destPortType === "output" || destPortType === "inputLocal");
            const backToFront : boolean = GraphRenderer.portDragSourcePortIsInput;
            const realSourceNode: Node       = backToFront ? destNode : srcNode;
            const realSourcePort: Field      = backToFront ? destPort : srcPort;
            const realDestinationNode: Node  = backToFront ? srcNode  : destNode;
            const realDestinationPort: Field = backToFront ? srcPort  : destPort;

            // notify user
            if (backToFront){
                Utils.showNotification("Automatically reversed edge direction", "The edge began at an input port and ended at an output port, so the direction was reversed.", "info");
            }

            // check if link is valid
            const linkValid : Eagle.LinkValid = Edge.isValid(eagle, null, realSourceNode.getKey(), realSourcePort.getId(), realDestinationNode.getKey(), realDestinationPort.getId(), realSourcePort.getType(), false, false, true, true, {errors:[], warnings:[]});

            // abort if edge is invalid
            if (Setting.findValue(Setting.ALLOW_INVALID_EDGES) || linkValid === Eagle.LinkValid.Valid || linkValid === Eagle.LinkValid.Warning){
                if (linkValid === Eagle.LinkValid.Warning){
                    GraphRenderer.addEdge(realSourceNode, realSourcePort, realDestinationNode, realDestinationPort, true, false);
                } else {
                    GraphRenderer.addEdge(realSourceNode, realSourcePort, realDestinationNode, realDestinationPort, false, false);
                }
            } else {
                console.warn("link not valid, result", linkValid);
            }
        } else {
            // no destination, ask user to choose a new node
            const dataEligible = GraphRenderer.portDragSourceNode.getCategoryType() !== Category.Type.Data;
            //getting matches from both the graph and the palettes list
            const eligibleComponents = Utils.getComponentsWithMatchingPort('palette graph', !GraphRenderer.portDragSourcePortIsInput, GraphRenderer.portDragSourcePort.getType(), dataEligible);
            
            // console.log("Found", eligibleComponents.length, "eligible automatically suggested components that have a " + (sourcePortIsInput ? "output" : "input") + " port of type:", sourcePort.getType());

            // check we found at least one eligible component
            if (eligibleComponents.length === 0){
                Utils.showNotification("Not Found", "No eligible components found for connection to port of this type (" + GraphRenderer.portDragSourcePort.getType() + ")", "info");
            } else {

                // get list of strings from list of eligible components
                const eligibleComponentNames : Node[] = [];
                for (const c of eligibleComponents){
                    eligibleComponentNames.push(c);
                }

                // NOTE: create copy in right click ts because we are using the right click menus to handle the node selection
                RightClick.edgeDropSrcNode = GraphRenderer.portDragSourceNode;
                RightClick.edgeDropSrcPort = GraphRenderer.portDragSourcePort;
                RightClick.edgeDropSrcIsInput = GraphRenderer.portDragSourcePortIsInput;

                Eagle.selectedRightClickPosition = {x:GraphRenderer.graphMousePos.x, y:GraphRenderer.graphMousePos.y};

                RightClick.edgeDropCreateNode(eligibleComponentNames,null)
            }
        }

        GraphRenderer.clearEdgeVars();
        eagle.logicalGraph.valueHasMutated();

    }
    
    static SCREEN_TO_GRAPH_POSITION_X(x: number) : number {
        const eagle = Eagle.getInstance();
        return (x - eagle.globalOffsetX())*eagle.globalScale();
    }

    static SCREEN_TO_GRAPH_POSITION_Y(y: number) : number {
        const eagle = Eagle.getInstance();
        return (y - eagle.globalOffsetY())*eagle.globalScale();
    }

    static SCREEN_TO_GRAPH_SCALE(n: number) : number {
        const eagle = Eagle.getInstance();
        return n * eagle.globalScale();
    }

    static GRAPH_TO_SCREEN_POSITION_X(x: number) : number {
        const eagle = Eagle.getInstance();
        return (x / eagle.globalScale()) + eagle.globalOffsetX();
        //return (x + eagle.globalOffsetX())/eagle.globalScale();
    }

    static GRAPH_TO_SCREEN_POSITION_Y(y: number) : number {
        const eagle = Eagle.getInstance();
        return (y / eagle.globalScale()) + eagle.globalOffsetY();
        //return (y + eagle.globalOffsetY())/eagle.globalScale();
    }

    static findNodesInRange(positionX: number, positionY: number, range: number, sourceNodeKey: number): Node[]{
        const result: Node[] = [];
        const nodeData : Node[] = GraphRenderer.nodeData

        //console.log("findNodesInRange(): sourceNodeKey", sourceNodeKey);

        for (let i = 0; i < nodeData.length; i++){
            // skip the source node
            if (nodeData[i].getKey() === sourceNodeKey){
                continue;
            }

            // fetch categoryData for the node
            const categoryData = CategoryData.getCategoryData(nodeData[i].getCategory());
            let possibleInputs = categoryData.maxInputs;
            let possibleOutputs = categoryData.maxOutputs;

            // add categoryData for embedded apps (if they exist)
            if (nodeData[i].hasInputApplication()){
                const inputApp = nodeData[i].getInputApplication();
                const inputAppCategoryData = CategoryData.getCategoryData(inputApp.getCategory());
                possibleInputs += inputAppCategoryData.maxInputs;
                possibleOutputs += inputAppCategoryData.maxOutputs;
            }
            if (nodeData[i].hasOutputApplication()){
                const outputApp = nodeData[i].getOutputApplication();
                const outputAppCategoryData = CategoryData.getCategoryData(outputApp.getCategory());
                possibleInputs += outputAppCategoryData.maxInputs;
                possibleOutputs += outputAppCategoryData.maxOutputs;
            }

            // skip nodes that can't have inputs or outputs
            if (possibleInputs === 0 && possibleOutputs === 0){
                continue;
            }

            // determine distance from position to this node
            const distance = Utils.positionToNodeDistance(positionX, positionY, nodeData[i]);

            if (distance <= range){
                //console.log("distance to", nodeData[i].getName(), nodeData[i].getKey(), "=", distance);
                result.push(nodeData[i]);
            }
        }

        return result;
    }

    static depthFirstTraversalOfNodes(graph: LogicalGraph, showDataNodes: boolean) : Node[] {
        const indexPlusDepths : {index:number, depth:number}[] = [];
        const result : Node[] = [];

        // populate key plus depths
        for (let i = 0 ; i < graph.getNodes().length ; i++){
            let nodeHasConnectedInput: boolean = false;
            let nodeHasConnectedOutput: boolean = false;
            const node = graph.getNodes()[i];

            // check if node has connected input and output
            for (const edge of graph.getEdges()){
                if (edge.getDestNodeKey() === node.getKey()){
                    nodeHasConnectedInput = true;
                }

                if (edge.getSrcNodeKey() === node.getKey()){
                    nodeHasConnectedOutput = true;
                }
            }

            // skip data nodes, if showDataNodes is false
            if (!showDataNodes && node.isData() && nodeHasConnectedInput && nodeHasConnectedOutput){
                continue;
            }

            const depth = GraphRenderer.findDepthOfNode(i, graph.getNodes());

            indexPlusDepths.push({index:i, depth:depth});
        }

        // sort nodes in depth ascending
        indexPlusDepths.sort(function(a, b){
            return a.depth - b.depth;
        });

        // write nodes to result in sorted order
        for (const indexPlusDepth of indexPlusDepths){
            result.push(graph.getNodes()[indexPlusDepth.index]);
        }

        return result;
    }

    static findDepthOfNode(index: number, nodes : Node[]) : number {
        const eagle = Eagle.getInstance();
        if (index >= nodes.length){
            console.warn("findDepthOfNode() with node index outside range of nodes. index:", index, "nodes.length", nodes.length);
            return 0;
        }

        let depth : number = 0;
        let node : Node = nodes[index];
        let nodeKey : number;
        let nodeParentKey : number = node.getParentKey();
        let iterations = 0;

        // follow the chain of parents
        while (nodeParentKey != null){
            if (iterations > 10){
                console.error("too many iterations in findDepthOfNode()");
                break;
            }

            iterations += 1;
            depth += 1;
            depth += node.getDrawOrderHint() / 10;
            nodeKey = node.getKey();
            nodeParentKey = node.getParentKey();

            if (nodeParentKey === null){
                return depth;
            }

            node = GraphRenderer.findNodeWithKey(nodeParentKey, nodes);

            if (node === null){
                console.error("Node", nodeKey, "has parentKey", nodeParentKey, "but call to findNodeWithKey(", nodeParentKey, ") returned null");
                return depth;
            }

            // if parent is selected, add more depth, so that it will appear on top
            if (eagle.objectIsSelected(node)){
                depth += 10;
            }
        }

        depth += node.getDrawOrderHint() / 10;

        // if node is selected, add more depth, so that it will appear on top
        if (eagle.objectIsSelected(node)){
            depth += 10;
        }

        return depth;
    }

    static findNodeWithKey(key: number, nodes: Node[]) : Node {
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
        }

        console.warn("Cannot find node with key", key);
        return null;
    }

    
    static findNearestMatchingPort(positionX: number, positionY: number, nearbyNodes: Node[], sourceNode: Node, sourcePort: Field, sourcePortIsInput: boolean) : Field {
        //console.log("findNearestMatchingPort(), sourcePortIsInput", sourcePortIsInput);
        let minDistance = Number.MAX_SAFE_INTEGER;
        let minPort = null;

        for (const node of nearbyNodes){
            let portList: Field[] = [];

            // if source node is Data, then no nearby Data nodes can have matching ports
            if (sourceNode.getCategoryType() === Category.Type.Data && node.getCategoryType() === Category.Type.Data){
                continue;
            }

            // if sourcePortIsInput, we should search for output ports, and vice versa
            if (sourcePortIsInput){
                portList = portList.concat(node.getOutputPorts());
            } else {
                portList = portList.concat(node.getInputPorts());
            }

            // get inputApplication ports
            if (sourcePortIsInput){
                portList = portList.concat(node.getInputApplicationOutputPorts());
            } else {
                portList = portList.concat(node.getInputApplicationInputPorts());
            }

            // get outputApplication ports
            if (sourcePortIsInput){
                portList = portList.concat(node.getOutputApplicationOutputPorts());
            } else {
                portList = portList.concat(node.getOutputApplicationInputPorts());
            }

            for (const port of portList){
                if (!Utils.portsMatch(port, sourcePort)){
                    continue;
                }

                // if port has no id (broken) then don't consider it as a auto-complete target
                if (port.getId() === ""){
                    continue;
                }

                // get position of port
                const portX = node.getPosition().x;
                const portY = node.getPosition().y;

                // get distance to port
                const distance = Math.sqrt( Math.pow(portX - positionX, 2) + Math.pow(portY - positionY, 2) );

                // remember this port if it the best so far
                if (distance < minDistance){
                    minPort = port;
                    minDistance = distance;
                }
            }
        }

        return minPort;
    }

    static mouseEnterPort(port : Field) : void {
        // if (!GraphRenderer.draggingPort){
        //     return;
        // }
        // const eagle = Eagle.getInstance();
        // GraphRenderer.destinationPort = port;
        // GraphRenderer.destinationNode = eagle.logicalGraph().findNodeByKey(port.getNodeKey());

        // GraphRenderer.isDraggingPortValid = Edge.isValid(eagle, null, GraphRenderer.portDragSourceNode.getKey(), GraphRenderer.portDragSourcePort.getId(), GraphRenderer.destinationNode.getKey(), GraphRenderer.destinationPort.getId(), GraphRenderer.portDragSourcePort.getType(), false, false, false, false, {errors:[], warnings:[]});
    }

    static mouseLeavePort(port : Field) : void {
        // GraphRenderer.destinationPort = null;
        // GraphRenderer.destinationNode = null;

        // GraphRenderer.isDraggingPortValid = Eagle.LinkValid.Unknown;
    }
    
    static draggingEdgeGetStrokeColor(edge: Edge, index: number) : string {
        // switch (isDraggingPortValid){
        //     case Eagle.LinkValid.Unknown:
        //         return "black";
        //     case Eagle.LinkValid.Invalid:
        //         return LINK_COLORS.INVALID;
        //     case Eagle.LinkValid.Warning:
        //         return LINK_COLORS.WARNING;
        //     case Eagle.LinkValid.Valid:
        //         return LINK_COLORS.VALID;
        // }
        return ''
    }

    static addEdge(srcNode: Node, srcPort: Field, destNode: Node, destPort: Field, loopAware: boolean, closesLoop: boolean) : void {
        const eagle = Eagle.getInstance();
        if (srcPort.getId() === destPort.getId()){
            console.warn("Abort addLink() from port to itself!");
            return;
        }

        eagle.addEdge(srcNode, srcPort, destNode, destPort, loopAware, closesLoop, (edge : Edge) : void => {
            eagle.checkGraph();
            eagle.logicalGraph.valueHasMutated();
            GraphRenderer.clearEdgeVars();
        });
    }

    static clearEdgeVars(){
        GraphRenderer.portDragSourcePort = null
        GraphRenderer.portDragSourceNode = null
        GraphRenderer.portDragSourcePortIsInput = null
        GraphRenderer.destinationPort = null
        GraphRenderer.destinationNode = null
        GraphRenderer.portDragSuggestedNode = null
        GraphRenderer.portDragSuggestedNode = null
    }

    static selectEdge(edge : Edge,event:any){
        const eagle = Eagle.getInstance();

        if (edge !== null){
            if (event.shiftKey){
                eagle.editSelection(Eagle.RightWindowMode.Inspector, edge, Eagle.FileType.Graph);
            } else {
                eagle.setSelection(Eagle.RightWindowMode.Inspector, edge, Eagle.FileType.Graph);
            }
        }
    }

    static edgeGetStrokeColor(edge: Edge, event: any) : string {
        const eagle = Eagle.getInstance();

        let normalColor: string = GraphConfig.getColor('edgeDefault');
        let selectedColor: string = GraphConfig.getColor('edgeDefaultSelected');

        // check if source node is an event, if so, draw in blue
        const srcNode : Node = eagle.logicalGraph().findNodeByKey(edge.getSrcNodeKey());

        if (srcNode !== null){
            const srcPort : Field = srcNode.findFieldById(edge.getSrcPortId());

            if (srcPort !== null && srcPort.getIsEvent()){
                normalColor = GraphConfig.getColor('edgeEvent');
                selectedColor = GraphConfig.getColor('edgeEventSelected');
            }
        }

        // check if link has a warning or is invalid
        const linkValid : Eagle.LinkValid = Edge.isValid(eagle, edge.getId(), edge.getSrcNodeKey(), edge.getSrcPortId(), edge.getDestNodeKey(), edge.getDestPortId(), edge.getDataType(), edge.isLoopAware(), edge.isClosesLoop(), false, false, {errors:[], warnings:[]});

        if (linkValid === Eagle.LinkValid.Invalid){
            normalColor = GraphConfig.getColor('edgeInvalid');
            selectedColor = GraphConfig.getColor('edgeInvalidSelected');
        }

        if (linkValid === Eagle.LinkValid.Warning){
            normalColor = GraphConfig.getColor('edgeWarning');
            selectedColor = GraphConfig.getColor('edgeWarningSelected');
        }

        // check if the edge is a "closes loop" edge
        if (edge.isClosesLoop()){
            normalColor = GraphConfig.getColor('edgeClosesLoop');
            selectedColor = GraphConfig.getColor('edgeClosesLoopSelected');
        }

        return eagle.objectIsSelected(edge) ? selectedColor : normalColor;
    }

    static edgeGetStrokeType(edge:Edge, event:any) : string {
        if(edge.isClosesLoop()){
            return ' 15, 8, 5, 8'
        }else{
            return ''
        }
    }
}
