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
import { Setting } from "./Setting";
import { Utils } from "./Utils";

ko.bindingHandlers.nodeRenderHandler = {
    init: function(element:any, valueAccessor, allBindings) {
        const node: Node = ko.unwrap(valueAccessor())

        //overwriting css variables using colours from graphConfig.ts. I am using this for simple styling to avoid excessive css data binds in the node html files
        $("#logicalGraphParent").get(0).style.setProperty("--selectedBg", GraphConfig.getColor('selectBackground'));
        $("#logicalGraphParent").get(0).style.setProperty("--nodeBorder", GraphConfig.getColor('bodyBorder'));
        $("#logicalGraphParent").get(0).style.setProperty("--nodeBg", GraphConfig.getColor('nodeBg'));
        $("#logicalGraphParent").get(0).style.setProperty("--graphText", GraphConfig.getColor('graphText'));
        $("#logicalGraphParent").get(0).style.setProperty("--branchBg", GraphConfig.getColor('branchBg'));
        $("#logicalGraphParent").get(0).style.setProperty("--constructBg", GraphConfig.getColor('constructBg'));
        $("#logicalGraphParent").get(0).style.setProperty("--constructIcon", GraphConfig.getColor('constructIcon'));
        $("#logicalGraphParent").get(0).style.setProperty("--edgeColor", GraphConfig.getColor('edgeColor'));
        $("#logicalGraphParent").get(0).style.setProperty("--commentEdgeColor", GraphConfig.getColor('commentEdgeColor'));
        

        switch(node.getCategory()){
            case Category.Branch: 
                node.setRadius(GraphConfig.BRANCH_NODE_RADIUS)
                $(element).css({'height':node.getRadius()*2+'px','width':node.getRadius()*2+'px'})
                break

            case Category.Scatter:
            case Category.Gather:
            case Category.MKN:
            case Category.GroupBy:
            case Category.Loop:
            case Category.SubGraph:
                node.setRadius(GraphConfig.CONSTRUCT_NODE_RADIUS)
                $(element).css({'height':node.getRadius()*2+'px','width':node.getRadius()*2+'px'})

                break
            
            
            default : 
                node.setRadius(GraphConfig.NORMAL_NODE_RADIUS)
                $(element).css({'height':node.getRadius()*2+'px','width':node.getRadius()*2+'px'})
        }
    },
    update: function (element:any, valueAccessor, allBindings, viewModel, bindingContext) {
        const node: Node = ko.unwrap(valueAccessor());

        switch(node.getCategory()){
            case Category.Scatter:
            case Category.Gather:
            case Category.MKN:
            case Category.GroupBy:
            case Category.Loop:
            case Category.SubGraph:
                $(element).css({'height':node.getRadius()*2+'px','width':node.getRadius()*2+'px'});
                break;
        }
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

        $(element).css({'top':portPosition.y+'px','left':portPosition.x+'px'})
    }
};

export class GraphRenderer {
    static normalNodeRadius = 25

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

    static createBezier(srcNodeRadius:number, destNodeRadius:number, srcNodePosition: {x: number, y: number}, destNodePosition: {x: number, y: number}, srcField: Field, destField: Field) : string {
        //console.log("createBezier", srcNodePosition, destNodePosition);

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

        return "M " + x1 + " " + y1 + " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + x2 + " " + y2;
    }

    static getPath(edge: Edge) : string {
        const eagle: Eagle = Eagle.getInstance();
        const lg: LogicalGraph = eagle.logicalGraph();

        const srcNode: Node = lg.findNodeByKeyQuiet(edge.getSrcNodeKey());
        const destNode: Node = lg.findNodeByKeyQuiet(edge.getDestNodeKey());

        const srcField: Field = srcNode.findFieldById(edge.getSrcPortId());
        const destField: Field = destNode.findFieldById(edge.getDestPortId());

        return this._getPath(srcNode, destNode, srcField, destField, eagle);
    }

    static getPathComment(commentNode: Node) : string {
        const eagle: Eagle = Eagle.getInstance();
        const lg: LogicalGraph = eagle.logicalGraph();

        const srcNode: Node = commentNode;
        const destNode: Node = lg.findNodeByKeyQuiet(commentNode.getSubjectKey());

        return this._getPath(srcNode, destNode, null, null, eagle);
    }

    static _getPath(srcNode: Node, destNode: Node, srcField: Field, destField: Field, eagle: Eagle) : string {
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

        return GraphRenderer.createBezier(srcNodeRadius, destNodeRadius,{x:srcX, y:srcY}, {x:destX, y:destY}, srcField, destField);
    }

    static mouseMove = (eagle: Eagle, event: JQueryEventObject) : void => {
        const mouseEvent: MouseEvent = <MouseEvent>event.originalEvent;

        if (eagle.isDragging()){
            if (eagle.draggingNode() !== null){
                // move node
                eagle.draggingNode().changePosition(mouseEvent.movementX/eagle.globalScale(), mouseEvent.movementY/eagle.globalScale());
                GraphRenderer.moveChildNodes(eagle.draggingNode(), mouseEvent.movementX/eagle.globalScale(), mouseEvent.movementY/eagle.globalScale());
            } else {
                // move background
                eagle.globalOffsetX(eagle.globalOffsetX() + mouseEvent.movementX/eagle.globalScale());
                eagle.globalOffsetY(eagle.globalOffsetY() + mouseEvent.movementY/eagle.globalScale());
            }
        }
    }

    static scrollZoom = (eagle: Eagle, event: JQueryEventObject) : void => {
        const wheelEvent: WheelEvent = <WheelEvent>event.originalEvent;

        eagle.globalScale(Math.abs(eagle.globalScale() - eagle.globalScale()/wheelEvent.deltaY*20));
        $('#logicalGraphD3Div').css('transform','scale('+eagle.globalScale()+')')
    }

    static startDrag = (node: Node, event: MouseEvent) : void => {
        const eagle = Eagle.getInstance();
        if(node === null || !node.isEmbedded()){
           //only non-embedded nodes can be dragged
            eagle.isDragging(true);
            eagle.draggingNode(node);
        }
        
        // check if shift key is down, if so, add selected node to current selection
        if (node !== null && event.shiftKey){
            eagle.editSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Graph);
        } else {
            eagle.setSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Graph);
        }
    }

    static endDrag = (node: Node, event: MouseEvent) : void => {
        const eagle = Eagle.getInstance();

        //console.log("endDrag", node ? node.getName() : node)
        eagle.isDragging(false);
        eagle.draggingNode(null);

        // remember node parent from before things change
        const oldParent: Node = eagle.logicalGraph().findNodeByKeyQuiet(node.getParentKey());

        // check for nodes underneath the node we dropped
        const parent: Node = eagle.logicalGraph().checkForNodeAt(node.getPosition().x, node.getPosition().y, node.getRadius(), node.getKey(), true);

        // check if new candidate parent is already a descendent of the node, this would cause a circular hierarchy which would be bad
        const ancestorOfParent = GraphRenderer.isAncestor(parent, node);

        // keep track of whether we would update any node parents
        const updated = {parent: false};
        const allowGraphEditing = Setting.findValue(Setting.ALLOW_GRAPH_EDITING);

        // if a parent was found, update
        if (parent !== null && node.getParentKey() !== parent.getKey() && node.getKey() !== parent.getKey() && !ancestorOfParent){
            GraphRenderer._updateNodeParent(node, parent.getKey(), updated, allowGraphEditing);
        }

        // if no parent found, update
        if (parent === null && node.getParentKey() !== null){
            GraphRenderer._updateNodeParent(node, null, updated, allowGraphEditing);
        }

        // recalculate size of parent (or oldParent)
        if (parent === null){
            if (oldParent !== null){
                // moved out of a construct
                GraphRenderer.resizeConstruct(oldParent);
            }
        } else {
            // moved into or within a construct
            GraphRenderer.resizeConstruct(parent);
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
    static resizeConstruct = (construct: Node): void => {
        const eagle = Eagle.getInstance();
        let maxDistance = 0;
        let numChildren = 0;
        
        // loop through all children
        for (const node of eagle.logicalGraph().getNodes()){
            if (node.getParentKey() === construct.getKey()){
                const dx = construct.getPosition().x - node.getPosition().x;
                const dy = construct.getPosition().y - node.getPosition().y;
                const distance = Math.sqrt(dx*dx + dy*dy);

                maxDistance = Math.max(maxDistance, distance + node.getRadius() + GraphConfig.CONSTRUCT_MARGIN);
                numChildren = numChildren + 1;
            }
        }

        // make sure constructs are never below minimum size
        maxDistance = Math.max(maxDistance, GraphConfig.MINIMUM_CONSTRUCT_RADIUS);

        //console.log("Resize", construct.getName(), "radius to", maxDistance, "to contain", numChildren, "children");
        construct.setRadius(maxDistance);
    }
}
