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
        console.log('classes ',element,node)
        
        switch(node.getCategory()){
            case Category.Branch: 
                console.log('branch node')
                node.setNodeRadius(GraphConfig.getBranchRadius())
                $(element).css({'height':node.getNodeRadius()+'px','width':node.getNodeRadius()+'px'})
                $(element).find('.innerRing').css({'height':node.getNodeRadius()-5+'px','width':node.getNodeRadius()-5+'px'})
                break
            
            default : 
                node.setNodeRadius(GraphConfig.getNormalRadius())
                $(element).css({'height':node.getNodeRadius()+'px','width':node.getNodeRadius()+'px'})
        }
        
        if(node.isBranch()){
            
        }
    },
    update: function (element:any, node) {

    },
};

ko.bindingHandlers.graphRendererPortPosition = {
    init: function(element:any, field, allBindings) {
       
    },
    update: function (element:any, field) {
        //the update function is called initially and then whenever a change to a utilised observable occurs
        
        const eagle : Eagle = Eagle.getInstance();
        const node : Node = eagle.logicalGraph().findNodeByKeyQuiet(field().getNodeKey())

        const currentNodePos = node.getPosition()
        const edges = eagle.logicalGraph().getEdges()
        let adjacentNode :Node;
        let connectedField:boolean=false;
        let PortPosition

        //clearing the saved port angles array
        node.resetPortAngles()


        //checking the edge node array to see if the port in hand is connected to another, if so we grab the adjacent node
        for(const edge of edges){
            if(field().getId()===edge.getDestPortId()){
                adjacentNode = eagle.logicalGraph().findNodeByKeyQuiet(edge.getSrcNodeKey())
                connectedField=true
            }else if(field().getId()===edge.getSrcPortId()){
                adjacentNode = eagle.logicalGraph().findNodeByKeyQuiet(edge.getDestNodeKey())
                connectedField=true
            }
        }

        console.log(GraphConfig.getNormalRadius())
        if(connectedField){
            const adjacentNodePos = adjacentNode.getPosition()
            const edgeAngle = GraphRenderer.calculateConnectionAngle(currentNodePos,adjacentNodePos)
            node.addPortAngle(edgeAngle)
            PortPosition=GraphRenderer.calculatePortPos(edgeAngle,GraphConfig.getNormalRadius()/2)
        }else{
            if(field().isInputPort()){
                PortPosition=GraphRenderer.calculatePortPos(3.14159,GraphConfig.getNormalRadius()/2)
            }else{
                PortPosition=GraphRenderer.calculatePortPos(0,GraphConfig.getNormalRadius()/2)
            }
        }
        field().setPosition(PortPosition[0],PortPosition[1])

        $(element).css({'top':PortPosition[1]+'px','left':PortPosition[0]+'px'})

    }
};

export class GraphRenderer {

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
    
    static calculatePortPos(angle:any, radius:any) : any {
        const newX = radius+(radius*Math.cos(angle))
        const newY = radius-(radius*Math.sin(angle))
        const result = [newX,newY]
        return result
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

    static createBezier(x1: number, y1: number, x2: number, y2: number, startDirection: number, endDirection:number,radiusOffset:number) : string {
        // find control points
        const startOffset = GraphRenderer.calculatePortPos(endDirection,radiusOffset)
        const endOffset = GraphRenderer.calculatePortPos(endDirection,radiusOffset)
        // console.log('port offsets',startOffset)

        const c1x = x1 + startOffset[0];
        const c1y = y1 + startOffset[1];
        const c2x = x2 - endOffset[0];
        const c2y = y2 - endOffset[1];

        return "M " + x1 + " " + y1 + " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + x2 + " " + y2;
    }

    static getPath(edge: Edge, eagle: Eagle) : string {
        const lg : LogicalGraph = eagle.logicalGraph();
        let srcNode : Node  = lg.findNodeByKey(edge.getSrcNodeKey());
        let destNode : Node = lg.findNodeByKey(edge.getDestNodeKey());

        let srcPort :Field = srcNode.getFieldById(edge.getSrcPortId())
        let destPort :Field = destNode.getFieldById(edge.getDestPortId())

        // if the src or dest nodes are embedded nodes, use the position of the construct instead
        if (srcNode.isEmbedded()){
            srcNode = lg.findNodeByKey(srcNode.getEmbedKey());
        }
        if (destNode.isEmbedded()){
            destNode = lg.findNodeByKey(destNode.getEmbedKey());
        }

        // get offset and scale
        const offsetX = eagle.globalOffsetX();
        const offsetY = eagle.globalOffsetY();

        const currentNodePos = srcPort.getPosition()
        const adjacentNodePos = destPort.getPosition()

        const srcEdgeAngle = GraphRenderer.calculateConnectionAngle(currentNodePos,adjacentNodePos)
        const srcPortPos = GraphRenderer.calculatePortPos(srcEdgeAngle,GraphConfig.getNormalRadius()/2)

        const destEdgeAngle = GraphRenderer.calculateConnectionAngle(adjacentNodePos,currentNodePos)
        const destPortPos = GraphRenderer.calculatePortPos(destEdgeAngle,GraphConfig.getNormalRadius()/2)
        const bezierDirection = GraphRenderer.getCurveDirection(srcEdgeAngle)

        const edgeSrcAngle = GraphRenderer.edgeDirectionAngle(srcEdgeAngle)
        const edgeDestAngle = GraphRenderer.edgeDirectionAngle(destEdgeAngle)
        // console.log(srcNode.getName(),'->',destNode.getName(),srcEdgeAngle,destEdgeAngle,'|',edgeSrcAngle,edgeDestAngle)

        // find positions of the nodes
        //need to offset using the port calculation
        const srcX = (srcNode.getPosition().x+currentNodePos.x-GraphConfig.getNormalRadius()/2  + offsetX);
        const srcY = (srcNode.getPosition().y+currentNodePos.y-GraphConfig.getNormalRadius()/2 + offsetY);
        // const srcDirection
        const destX = (destNode.getPosition().x+adjacentNodePos.x-GraphConfig.getNormalRadius()/2 + offsetX);
        const destY = (destNode.getPosition().y+adjacentNodePos.y-GraphConfig.getNormalRadius()/2  + offsetY);
        console.log('srcx',srcX,srcY,destX,destY)
    
        //calculating a percentage of the distance between nodes to use as affset for the bezier curve points
        const radiusOffset = Math.sqrt((srcX-destX)**2+(srcY-destY)**2)*.2
        
        //return "M234,159.5C280,159.5,280,41.5,330,41.5";
        return GraphRenderer.createBezier(srcX, srcY, destX, destY, edgeSrcAngle, edgeDestAngle,radiusOffset);

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

    static mouseWheel = (eagle: Eagle, event: JQueryEventObject) : void => {
        const wheelEvent: WheelEvent = <WheelEvent>event.originalEvent;

        eagle.globalScale(eagle.globalScale() - wheelEvent.deltaY/1000);
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
