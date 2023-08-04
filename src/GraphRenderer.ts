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

    static createBezier(x1: number, y1: number, x2: number, y2: number, startDirection: Eagle.Direction, endDirection: Eagle.Direction) : string {
        // find control points
        const c1x = x1 + GraphRenderer.directionOffset(true, startDirection);
        const c1y = y1 + GraphRenderer.directionOffset(false, startDirection);
        const c2x = x2 - GraphRenderer.directionOffset(true, endDirection);
        const c2y = y2 - GraphRenderer.directionOffset(false, endDirection);

        return "M " + x1 + " " + y1 + " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + x2 + " " + y2;
    }

    static getPath(edge: Edge, eagle: Eagle) : string {
        const lg : LogicalGraph = eagle.logicalGraph();
        let srcNode : Node  = lg.findNodeByKey(edge.getSrcNodeKey());
        let destNode : Node = lg.findNodeByKey(edge.getDestNodeKey());

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
        //const scale   = eagle.globalScale();
        const scale = 1;

        // find positions of the nodes
        const srcX = (srcNode.getPosition().x + srcNode.getDisplayWidth() + offsetX) * scale;
        const srcY = (srcNode.getPosition().y + offsetY) * scale;
        const destX = (destNode.getPosition().x + offsetX) * scale;
        const destY = (destNode.getPosition().y + destNode.getDisplayHeight() + offsetY) * scale;

        //return "M234,159.5C280,159.5,280,41.5,330,41.5";
        return GraphRenderer.createBezier(srcX, srcY, destX, destY, Eagle.Direction.Right, Eagle.Direction.Right);
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

        console.log("mouseWheel wheelEvent", wheelEvent, wheelEvent.deltaY);

        eagle.globalScale(eagle.globalScale() + wheelEvent.deltaY/1000);
        console.log("globalScale", eagle.globalScale());

    }

    static startDrag = (node: Node) : void => {
        const eagle = Eagle.getInstance();

        //console.log("startDrag", node ? node.getName() : node)
        eagle.isDragging(true);
        eagle.draggingNode(node);

        eagle.setSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Graph);
    }

    static endDrag = (node: Node) : void => {
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
