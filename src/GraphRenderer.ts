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

import {Eagle} from './Eagle';
import {LogicalGraph} from './LogicalGraph';
import {Node} from './Node';
import {Edge} from './Edge';
import {Field} from './Field';
import * as ko from "knockout";
import { Category } from './Category';
import { GraphConfig } from './graphConfig';

ko.bindingHandlers.nodeRenderHandler = {
    init: function(element:any, valueAccessor, allBindings) {

        
        const node :Node = ko.unwrap(valueAccessor())

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
                node.setNodeRadius(GraphConfig.getBranchRadius())
                $(element).css({'height':node.getNodeRadius()*2+'px','width':node.getNodeRadius()*2+'px'})
                break

            case Category.Scatter:
            case Category.Gather:
            case Category.MKN: 
            case Category.GroupBy:
            case Category.Loop:
            case Category.SubGraph:
                node.setNodeRadius(GraphConfig.getConstructRadius())
                $(element).css({'height':node.getNodeRadius()*2+'px','width':node.getNodeRadius()*2+'px'})

                break
            
            
            default : 
                node.setNodeRadius(GraphConfig.getNormalRadius())
                $(element).css({'height':node.getNodeRadius()*2+'px','width':node.getNodeRadius()*2+'px'})
        }
        
        if(node.isBranch()){
            
        }
    },
    update: function (element:any, node) {

    },
};

ko.bindingHandlers.graphRendererPortPosition = {
    init: function(element:any, valueAccessor, allBindings) {
       
    },
    update: function (element:any, valueAccessor) {
        //the update function is called initially and then whenever a change to a utilised observable occurs
        const eagle : Eagle = Eagle.getInstance();
        
        const data = ko.utils.unwrapObservable(valueAccessor()).data
        const dataType = ko.utils.unwrapObservable(valueAccessor()).type

        let node : Node 
        let field : Field
        let adjacentNode :Node;
        let connectedField:boolean=false;
        let PortPosition
        let portOnEmbeddedApp = false //used to identify when we are calculating the port position for a port on an embedded application

        if(dataType === 'inputApp'){
            // console.log(data.getName(), 'is input app')
            node = eagle.logicalGraph().findNodeByKeyQuiet(data.getEmbedKey())
            for(const port of data.getFields()){
                if (port.isInputPort()){
                    field = port
                }
            }
            console.log(data.getName(),node.getName(),field.getDisplayText())
        }else if(dataType === 'outputApp'){
            // console.log(data.getName(), 'is output app')
            node = eagle.logicalGraph().findNodeByKeyQuiet(data.getEmbedKey())
            for(const port of data.getFields()){
                if (port.isOutputPort()){
                    field = port
                }
            }
        }else if (dataType === 'port'){
            node = eagle.logicalGraph().findNodeByKeyQuiet(data.getNodeKey())
            if (node.isEmbedded()){
                node = eagle.logicalGraph().findNodeByKeyQuiet(node.getEmbedKey())
                portOnEmbeddedApp = true
            }
            field = data
        }else if (dataType  === 'comment'){
            node = data
            adjacentNode = eagle.logicalGraph().findNodeByKeyQuiet(data.getSubjectKey())    
        }

        const currentNodePos = node.getPosition()
        const edges = eagle.logicalGraph().getEdges()

        //clearing the saved port angles array
        node.resetPortAngles()

        //checking if we are dealing with a connected port, if so we grab the adjacent node
        if(dataType != 'comment'){
            for(const edge of edges){
                if(field.getId()===edge.getDestPortId()){
                    adjacentNode = eagle.logicalGraph().findNodeByKeyQuiet(edge.getSrcNodeKey())
                    connectedField=true
                }else if(field.getId()===edge.getSrcPortId()){
                    adjacentNode = eagle.logicalGraph().findNodeByKeyQuiet(edge.getDestNodeKey())
                    connectedField=true
                }
            }
        }

        //for branch nodes the ports are inset from the outer radius a little bit in their design
        let nodeRadius = node.getNodeRadius()
        if(portOnEmbeddedApp){
            // if we are working with ports of an embedded app, we need to use the parent construct to calculate the angle, but we want to use the radius of the embedded app to place the port
            nodeRadius = eagle.logicalGraph().findNodeByKeyQuiet(data.getNodeKey()).getNodeRadius() 
        }

        if(connectedField){
            const adjacentNodePos = adjacentNode.getPosition()
            const edgeAngle = GraphRenderer.calculateConnectionAngle(currentNodePos,adjacentNodePos)
            node.addPortAngle(edgeAngle)
            PortPosition=GraphRenderer.calculatePortPos(edgeAngle,nodeRadius, nodeRadius)
        }else if(dataType === 'comment'){
            const adjacentNodePos = adjacentNode.getPosition()
            const edgeAngle = GraphRenderer.calculateConnectionAngle(currentNodePos,adjacentNodePos)
            node.addPortAngle(edgeAngle)
            PortPosition=GraphRenderer.calculatePortPos(edgeAngle,nodeRadius, nodeRadius)
        }else{
            if(field.isInputPort() || field.isOutputPort()){
                PortPosition=GraphRenderer.calculatePortPos(Math.PI, nodeRadius, nodeRadius)
            }else{
                PortPosition=GraphRenderer.calculatePortPos(0, nodeRadius, nodeRadius)
            }
        }

        if (dataType === 'port'){
            field.setPosition(PortPosition.x, PortPosition.y)
        }else if (dataType === 'inputApp' || dataType === 'outputApp'){
            //we are saving the embedded application's position data here using the offset we calculated
            let newPos = {x: node.getPosition().x-nodeRadius+PortPosition.x, y:node.getPosition().y-nodeRadius+PortPosition.y}
            data.setPosition(newPos.x,newPos.y)
        }

        $(element).css({'top':PortPosition.y+'px','left':PortPosition.x+'px'})

    }
};

export class GraphRenderer {
    static normalNodeRadius = 25

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

    static createBezier(srcNodeRadius:number,destNodeRadius:number, srcNodePosition: {x: number, y: number}, destNodePosition: {x: number, y: number}) : string {
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
        const srcPortOffset = GraphRenderer.calculatePortPos(srcPortAngle, srcNodeRadius, srcNodeRadius);
        const destPortOffset = GraphRenderer.calculatePortPos(destPortAngle, destNodeRadius, destNodeRadius);

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

    static getPath(srcNode:Node,destNode:Node, eagle: Eagle) : string {
        const lg: LogicalGraph = eagle.logicalGraph();

        const srcNodeRadius = srcNode.getNodeRadius()
        const destNodeRadius = destNode.getNodeRadius()

        // get offset and scale
        const offsetX: number = eagle.globalOffsetX();
        const offsetY: number = eagle.globalOffsetY();

        // we subtract node radius from all these numbers to account for the transform translate(-50%, -50%) css on the nodes
        const srcX = srcNode.getPosition().x + offsetX -srcNodeRadius;
        const srcY = srcNode.getPosition().y + offsetY -srcNodeRadius;
        const destX = destNode.getPosition().x + offsetX -destNodeRadius;
        const destY = destNode.getPosition().y + offsetY -destNodeRadius;

        return GraphRenderer.createBezier(srcNodeRadius,destNodeRadius,{x:srcX, y:srcY}, {x:destX, y:destY});
    }

    static mouseMove = (eagle: Eagle, event: JQueryEventObject) : void => {
        const mouseEvent: MouseEvent = <MouseEvent>event.originalEvent;

        if (eagle.isDragging()){
            if (eagle.draggingNode() !== null){
                // move node
                eagle.draggingNode().changePosition(mouseEvent.movementX, mouseEvent.movementY);
                GraphRenderer.moveChildNodes(eagle.draggingNode(), mouseEvent.movementX, mouseEvent.movementY);

            } else {
                // move background
                eagle.globalOffsetX(eagle.globalOffsetX() + mouseEvent.movementX);
                eagle.globalOffsetY(eagle.globalOffsetY() + mouseEvent.movementY);
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

        // console.log("startDrag", node ? node.getName() : node, event);
        eagle.isDragging(true);
        eagle.draggingNode(node);

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
}
