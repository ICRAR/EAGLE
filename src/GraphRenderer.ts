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
import { Daliuge } from "./Daliuge";
import { Eagle } from './Eagle';
import { Errors } from './Errors';
import { EagleConfig } from "./EagleConfig";
import { Edge } from "./Edge";
import { Field } from './Field';
import { LogicalGraph } from './LogicalGraph';
import { Node } from './Node';
import { Utils } from './Utils';
import { Setting } from './Setting';
import { RightClick } from "./RightClick";
import { ParameterTable } from "./ParameterTable";

ko.bindingHandlers.nodeRenderHandler = {
    // TODO: element any (more around)
    init: function(element:any, valueAccessor) {
        const node: Node = ko.unwrap(valueAccessor())
        
        if(node.isData()){
            $(element).find('.body').css('background-color:#575757','color:white')
        }
    },
    update: function (element:any, valueAccessor) {
        let node: Node = ko.unwrap(valueAccessor());

        // set size
        $(element).css({'height':node.getRadius()*2+'px','width':node.getRadius()*2+'px'});

        if(node.isLoop()){
            $(element).children().children().children('.body').css({'border-style':'dotted','border-width':'4px'})
        }
        if(node.isGather()){
            $(element).children().children().children('.body').css({'border-style':'dashed','border-width':'5px'})
        }
        if(node.isScatter()){
            $(element).children().children().children('.body').css({'border-style':'double','border-width':'7px'})
        }
        if(node.isExclusiveForceNode()){
            $(element).children().children().children('.body').css({'background-color':'white'})
        }

        const pos = node.getPosition() // this line is needed because referencing position here causes this update function to run when the node position gets updated aka. when we are dragging a node on the graph
        if(node.isConstruct() || node.getParentId() != null ){
            if(!node.isConstruct()){
                const eagle : Eagle = Eagle.getInstance();
                node = eagle.logicalGraph().findNodeById(node.getParentId())
            }
            GraphRenderer.resizeConstruct(node)
        }
    },
};

ko.bindingHandlers.embeddedAppPosition = {
    update: function (element:any, valueAccessor) {
        const eagle : Eagle = Eagle.getInstance();
        const applicationNode: Node = ko.utils.unwrapObservable(valueAccessor()).applicationNode;
        const input: boolean = ko.utils.unwrapObservable(valueAccessor()).input;

        // find the node in which the applicationNode has been embedded
        const parentNode: Node = eagle.logicalGraph().findNodeByIdQuiet(applicationNode.getEmbedId());

        // determine all the adjacent nodes
        // TODO: earlier abort if field is null
        const adjacentNodes: Node[] = GraphRenderer.getAdjacentNodes(applicationNode, input);
        const connectedField: boolean = adjacentNodes.length > 0;

        // for branch nodes the ports are inset from the outer radius a little bit in their design
        const parentNodeRadius = parentNode.getRadius();

        // determine port position
        const parentNodePosition = parentNode.getPosition();
        let portPosition;

        if(connectedField){
            // calculate angles to all adjacent nodes
            const angles: number[] = [];
            for (const adjacentNode of adjacentNodes){
                const adjacentNodePos = adjacentNode.getPosition()
                const edgeAngle = GraphRenderer.calculateConnectionAngle(parentNodePosition, adjacentNodePos)
                angles.push(edgeAngle);
            }

            // average the angles
            const averageAngle = GraphRenderer.averageAngles(angles);
            portPosition = GraphRenderer.calculatePortPos(averageAngle, parentNodeRadius, parentNodeRadius)
        }else{
            // find a default position for the port when not connected
            if (input){
                portPosition=GraphRenderer.calculatePortPos(Math.PI, parentNodeRadius, parentNodeRadius)
            } else {
                portPosition=GraphRenderer.calculatePortPos(0, parentNodeRadius, parentNodeRadius)
            }
        }

        // we are saving the embedded application's position data here using the offset we calculated
        const newPos = {
            x: parentNodePosition.x - parentNodeRadius + portPosition.x,
            y: parentNodePosition.y - parentNodeRadius + portPosition.y
        }
        applicationNode.setPosition(newPos.x,newPos.y)

        portPosition = {
            x: portPosition.x - parentNodeRadius,
            y: portPosition.y - parentNodeRadius
        }

        // applying the offset to the element
        $(element).css({
            'top': portPosition.y+'px',
            'left':portPosition.x+'px'
        });
    }
};

ko.bindingHandlers.graphRendererPortPosition = {
    update: function (element:any, valueAccessor) {
        //this handler is for a PORT position, meaning it will run twice for a field that has both input and output ports
        //the update function is called initially and then whenever a change to a utilised observable occurs
        const eagle : Eagle = Eagle.getInstance();
        const n: Node = ko.utils.unwrapObservable(valueAccessor()).n;
        const f: Field = ko.utils.unwrapObservable(valueAccessor()).f;
        const dataType: string = ko.utils.unwrapObservable(valueAccessor()).type;
        // determine the 'node' and 'field' attributes (for this way of using this binding)
        let node : Node 
        let field : Field

        switch(dataType){
            case 'inputPort':
            case 'outputPort':
                node = eagle.logicalGraph().findNodeByIdQuiet(f.getNodeId())
                field = f
                break;
            case 'comment':
                node = n
                field = null
                break;
        }

        // determine all the adjacent nodes
        const adjacentNodes: Node[] = [];
        let connectedField:boolean=false;

        switch(dataType){
            case 'comment': {
                if(n.getSubjectId() === null){
                    return
                }

                const adjacentNode: Node = eagle.logicalGraph().findNodeByIdQuiet(n.getSubjectId());

                if (adjacentNode === null){
                     console.warn("Could not find adjacentNode for comment with subjectId", n.getSubjectId());
                    return;
                }

                adjacentNodes.push(adjacentNode);
                break;
            }
            case 'inputPort':
                for(const edge of eagle.logicalGraph().getEdges()){
                    if(field != null && field.getId()===edge.getDestPortId()){
                        const adjacentNode: Node = eagle.logicalGraph().findNodeByIdQuiet(edge.getSrcNodeId());
                        
                        if (adjacentNode === null){
                            console.warn("Could not find adjacentNode for inputPort or inputApp with SrcNodeId", edge.getSrcNodeId());
                            return;
                        }

                        connectedField=true
                        adjacentNodes.push(adjacentNode);
                    }
                }
                break;

            case 'outputPort':
                for(const edge of eagle.logicalGraph().getEdges()){
                    if(field.getId()===edge.getSrcPortId()){
                        const adjacentNode: Node = eagle.logicalGraph().findNodeByIdQuiet(edge.getDestNodeId());

                        if (adjacentNode === null){
                            console.warn("Could not find adjacentNode for outputPort or outputApp with DestNodeId", edge.getDestNodeId());
                            return;
                        }

                        connectedField=true
                        adjacentNodes.push(adjacentNode);
                    }
                }
                break;
        }
        
        // determine port position
        const currentNodePos = node.getPosition();
        let averageAngle

        if(connectedField || dataType === 'comment'){

            // calculate angles to all adjacent nodes
            const angles: number[] = [];
            for (const adjacentNode of adjacentNodes){
                const adjacentNodePos = adjacentNode.getPosition()
                const edgeAngle = GraphRenderer.calculateConnectionAngle(currentNodePos, adjacentNodePos)
                angles.push(edgeAngle);
            }

            // average the angles
            averageAngle = GraphRenderer.averageAngles(angles);
            if(averageAngle<0){
                averageAngle = Math.PI*2 - Math.abs(averageAngle)
            }

            if (dataType === 'inputPort'){
                field.setInputAngle(averageAngle)
            } else if (dataType === 'outputPort'){
                field.setOutputAngle(averageAngle)
            }
        }else{
            // find a default position for the port when not connected
            switch (dataType){
                case 'inputPort':
                    // portPosition=GraphRenderer.calculatePortPos(Math.PI, nodeRadius, nodeRadius)
                    averageAngle = 3.14159
                    field.setInputAngle(averageAngle)
                    break;
                case 'outputPort':
                    // portPosition=GraphRenderer.calculatePortPos(0, nodeRadius, nodeRadius)
                    averageAngle = 0
                    field.setOutputAngle(averageAngle)
                    break;
                default:
                    console.warn("disconnected field with dataType:", dataType);
                    break;
            }
        }
        //checking for port collisions if connected
        if(!node.isComment()){
            //checking if the ports are linked 
            const portIsLinked = eagle.logicalGraph().portIsLinked(node.getId(), field.getId())
            field.setInputConnected(portIsLinked.input)
            field.setOutputConnected(portIsLinked.output)

            GraphRenderer.sortAndOrganizePorts(node)
        }

        //align the port titles to the correct side of the node, depending on node angle
        //clear style since it doesn't seem to overwrite
        $(element).find(".portTitle").removeAttr( "style" )

        //convert negative radian angles to positive
        if(averageAngle<0){
            averageAngle= averageAngle+2*Math.PI
        }

        //apply the correct css
        if(averageAngle>1.5708 && averageAngle<4.7123){
            $(element).find(".portTitle").css({'text-align':'right','left':-5+'px','transform':'translateX(-100%)'})
        }else{
            $(element).find(".portTitle").css({'text-align':'left','right':-5+'px','transform':'translateX(100%)'})
        }
    }
};

export class GraphRenderer {
    static nodeData : Node[] = null

    // TODO: group all the dragging variables. move into a structure?
    static isDragging : ko.Observable<boolean> = ko.observable(false);
    static draggingNode : ko.Observable<Node> = ko.observable(null);
    static draggingPaletteNode : boolean = false;

    //port drag handler globals
    static draggingPort : boolean = false;
    static isDraggingPortValid: ko.Observable<Errors.Validity> = ko.observable(Errors.Validity.Unknown);
    static destinationNode : Node = null;
    static destinationPort : Field = null;
    
    static portDragSourceNode : ko.Observable<Node> = ko.observable(null);
    static portDragSourcePort : ko.Observable<Field> = ko.observable(null);
    static portDragSourcePortIsInput: boolean = false;

    static portDragSuggestedNode : ko.Observable<Node> = ko.observable(null);
    static portDragSuggestedField : ko.Observable<Field> = ko.observable(null);
    static portDragSuggestionValidity : ko.Observable<Errors.Validity> = ko.observable(Errors.Validity.Unknown) // this is necessary because we cannot keep the validity on the ege as it does not exist
    static createEdgeSuggestedPorts : {field:Field,node:Node,validity: Errors.Validity}[] = []
    static portMatchCloseEnough :ko.Observable<boolean> = ko.observable(false);

    //node drag handler globals
    static NodeParentRadiusPreDrag : number = null;
    static nodeDragElement : any = null
    static nodeDragNode : Node = null
    static dragStartPosition : any = null
    static dragCurrentPosition : any = null
    static dragSelectionHandled : any = ko.observable(true)
    static dragSelectionDoubleClick :boolean = false;

    static findParent : boolean = false;
    static parentTimeout : boolean = false;

    //drag selection region globals
    static altSelect : boolean = false;
    static shiftSelect : boolean = false;
    static isDraggingSelectionRegion :boolean = false;
    static selectionRegionStart = {x:0, y:0};
    static selectionRegionEnd = {x:0, y:0};
    static ctrlDrag:boolean = null;
    static editNodeName:boolean = false;
    static portDragStartPos = {x:0, y:0};
    static simpleSelect : boolean = true; // used for node dragging/selecting. if the cursor position hasn't moved far when click/dragging a node. we wont update the node's position and handle it as a simple select action

    static mousePosX : ko.Observable<number> = ko.observable(-1);
    static mousePosY : ko.Observable<number> = ko.observable(-1);
    static legacyGraph : boolean = false; //used for marking a graph when its nodes don't have a radius set. in this case we will do some conversion

    static renderDraggingPortEdge : ko.Observable<boolean> = ko.observable(false);


    static averageAngles(angles: number[]) : number {
        let x: number = 0;
        let y: number = 0;

        for (const angle of angles) {
            x += Math.cos(angle)
            y += Math.sin(angle)
        }

        return Math.atan2(y, x);
    }

    static calculatePortPositionX (mode : string, field : Field, node : Node) : number {
        
        let portPosX :number
        if(mode==='input'){
            portPosX = field.getInputPosition().x
        }else{
            portPosX = field.getOutputPosition().x
        }
        
        const x = portPosX + node.getPosition().x - node.getRadius()
        return x
    }

    static calculatePortPositionY (mode:string, field : Field, node : Node) {
        
        let portPosY :number
        if(mode==='input'){
            portPosY = field.getInputPosition().y
        }else{
            portPosY = field.getOutputPosition().y
        }
        
        const y = portPosY + node.getPosition().y - node.getRadius()
        return y
    }

    static sortAndOrganizePorts (node:Node) : void {
        //calculating the minimum port distance as an angle. we save this min distance as a pixel distance between ports
        const minimumPortDistance:number = Number(Math.asin(EagleConfig.PORT_MINIMUM_DISTANCE/node.getRadius()).toFixed(6))
        
        const connectedFields : {angle:number, field:Field,mode:string}[] = []
        const danglingPorts : {angle:number, field:Field, mode:string}[] = []
        const nodeRadius = node.getRadius()

        //building a list of connected and not connected ports on the node in question
        node.getFields().forEach(function(field){

            //making sure the field we are looking at is a port
            if(!field.isInputPort() && !field.isOutputPort()){
                return
            }
            

            //sorting the connected ports via angle into the connectedFields array
            if (field.getInputConnected()){

                if(connectedFields.length === 0){
                    connectedFields.push({angle:field.getInputAngle(),field:field,mode:'input'})
                }else{
                    let i = 0

                    for(const connectedField of connectedFields){
                        i++
                        if(connectedField.angle>field.getInputAngle()){
                            connectedFields.splice(i-1,0,{angle:field.getInputAngle(),field:field,mode:'input'})
                            break
                        }else if(connectedFields.length === i){
                            connectedFields.push({angle:field.getInputAngle(),field:field,mode:'input'})
                            break
                        }
                    }
                }
            }
            
            if (field.getOutputConnected()){
                if(connectedFields.length === 0){
                    connectedFields.push({angle:field.getOutputAngle(),field:field,mode:'output'})
                }else{
                    let i = 0
                    for(const connectedField of connectedFields){
                        i++
                        if(connectedField.angle>field.getOutputAngle()){
                            connectedFields.splice(i-1,0,{angle:field.getOutputAngle(),field:field,mode:'output'})
                            break
                        }else if(connectedFields.length === i){
                            connectedFields.push({angle:field.getOutputAngle(),field:field,mode:'output'})
                            break
                        }
                    }
                }
            }

            //otherwise adding to dangling ports list
            if(!field.getInputConnected() && field.isInputPort()){
                danglingPorts.push({angle:Math.PI, field:field, mode:'input'})
            }

            if(!field.getOutputConnected() && field.isOutputPort()){
                danglingPorts.push({angle:0, field:field, mode:'output'})
            }
        })

        //spacing out the connected ports
        let i = 0
        for(const connectedField of connectedFields){
            if(i != 0){
                if(connectedField.angle - minimumPortDistance< connectedFields[i-1].angle || connectedField.angle<connectedFields[i-1].angle){
                    connectedField.angle = connectedFields[i-1].angle+minimumPortDistance
                }
            }

            //setting the spaced out connected ports' positions with the organised and spaced out ones
            GraphRenderer.applyPortAngle(connectedField.mode,connectedField.angle,nodeRadius,node,connectedField.field)

            i++
        }

        //looking for space where we can place the dangling ports
        for (const danglingPort of danglingPorts){
            const newAngle = GraphRenderer.findClosestMatchingAngle(node,danglingPort.angle,minimumPortDistance,danglingPort.field,danglingPort.mode)

            GraphRenderer.applyPortAngle(danglingPort.mode,newAngle,nodeRadius,node,danglingPort.field)
            if(danglingPort.mode === 'input'){
                danglingPort.field.setInputAngle(newAngle)
            }else{
                danglingPort.field.setOutputAngle(newAngle)
            }
        }
    }

    static applyPortAngle (mode:string, angle:number, nodeRadius: number, node:Node, field:Field) : void {
        let portPosition
        if (mode === 'input'){
            portPosition = GraphRenderer.calculatePortPos(angle, nodeRadius, nodeRadius)      
            //a little 1px reduction is needed to center ports for some reason
            if(!node.isBranch()){
                portPosition = {x:portPosition.x-1,y:portPosition.y-1}
            }  

            field.setInputPosition(portPosition.x, portPosition.y);
        } 
        if (mode === 'output'){
            portPosition = GraphRenderer.calculatePortPos(angle, nodeRadius, nodeRadius)

            //a little 1px reduction is needed to center ports for some reason
            if(!node.isBranch()){
                portPosition = {x:portPosition.x-1,y:portPosition.y-1}
            }

            field.setOutputPosition(portPosition.x, portPosition.y);
        }
    }

    static findClosestMatchingAngle (node:Node, angle:number, minPortDistance:number,field:Field,mode:string) : number {
        let result = 0
        let minAngle 
        let maxAngle

        let currentAngle = angle
        let noMatch = true
        let circles = 0

        //checking max angle
        while(noMatch && circles<10){
            const collidingPortAngle:number = GraphRenderer.checkForPortUsingAngle(node,currentAngle,minPortDistance, field,mode)
            if(collidingPortAngle === null){
                maxAngle = currentAngle // we've found our closest gap when adding to our angle
                noMatch = false
            }else{
                //if the colliding angle is not 0, that means the checkForPortUsingAngle function has found and returned the angle of a port we are colliding with
                //we will use this colliding port angle and add the minimum port distance as well as a little extra to prevent math errors when comparing
                currentAngle = collidingPortAngle + minPortDistance + 0.01
                
                if(currentAngle<0){
                    currentAngle = 2*Math.PI - Math.abs(currentAngle)
                }

                circles++
            }
        }
        
        //resetting runtime vars
        noMatch = true
        circles = 0
        currentAngle = angle

        //checking min angle
        while(noMatch && circles<10){
            const collidingPortAngle:number = GraphRenderer.checkForPortUsingAngle(node,currentAngle,minPortDistance, field,mode)
            if(collidingPortAngle === null){
                minAngle = currentAngle // we've found our closest gap when adding to our angle
                noMatch = false
            }else{
                //if the colliding angle is not 0, that means the checkForPortUsingAngle function has found and returned the angle of a port we are colliding with
                //we will use this colliding port angle and subtract the minimum port distance as well as a little extra to prevent math errors when comparing
                currentAngle = collidingPortAngle - minPortDistance - 0.01
                
                if(currentAngle<0){
                    currentAngle = 2*Math.PI - Math.abs(currentAngle)
                }

                circles++
            }
        }

        //maxing sure min and max angles are on the same side of the 0 point eg. if max angle is 0.2 and min angle is 5.8 we need to convert the min angle to be a negative number in order to compare them by subtracting 2*PI
        if(minAngle + minPortDistance> 2*Math.PI && angle - minPortDistance < 0){
            minAngle =  minAngle - 2*Math.PI
        }
        if(maxAngle - minPortDistance < 0 && angle + minPortDistance > 2*Math.PI){
            maxAngle = 2*Math.PI - maxAngle
        }
        
        // making sure the angle is within the 0 - 2*PI range
        if(minAngle<0){
            minAngle = 2*Math.PI - Math.abs(minAngle)
        }
        if(maxAngle>2*Math.PI){
            maxAngle = maxAngle - 2*Math.PI 
        }

        // checking if the min or max angle is closer to the port's preferred location
        if(Math.abs(minAngle-angle)>Math.abs(maxAngle-angle)){
            result = maxAngle
        }else{
            result = minAngle
        }
        
        return result
    }

    static checkForPortUsingAngle (node:Node, angle:number, minPortDistance:number, activeField:Field, mode:string) : number {
        //we check if there are any ports within range of the desired angle. if there are we will return the angle of the port we collided with
        let result:number = null

        //dangling ports will collide with all other ports including other dandling ports, connected ports take priority and will push dangling ones out of the way
        let danglingActivePort = false
        if(mode === "input"){
            danglingActivePort = !activeField.getInputConnected()
        }
        if( mode === "output"){
            danglingActivePort = !activeField.getOutputConnected()
        }

        node.getFields().forEach(function(field){
            //going through all fields on the node to check for taken angles

            //making sure the field we are looking at is a port
            if(!field.isInputPort() && !field.isOutputPort()){
                return
            }

            //if the result is not null that means we are colliding with a port, there is no reason to continue checking
            if( result != null){
                return
            }

            //either comparing with other connected ports || if the active port is dangling, compare with all other ports
            if(field.getOutputConnected() || danglingActivePort){
                let fieldAngle = field.getOutputAngle()
                //doing some converting if the ports we are comparing are on either side of the 0 point eg. 0.2 and 6.1 are too close to each other, we convert 6.1 - 2* PI = roughly -0.18. now we can compare them
                if(fieldAngle - minPortDistance<0 && angle + minPortDistance>2 * Math.PI){
                    fieldAngle = 2 * Math.PI + fieldAngle
                }else if(fieldAngle + minPortDistance>2 * Math.PI && angle - minPortDistance<0){
                    fieldAngle = fieldAngle - 2*Math.PI
                }

                if(field.getId() === activeField.getId() && mode === 'output'){
                    //this is the same exact port, don't compare!
                }else{
                    if(fieldAngle-angle > -minPortDistance && fieldAngle-angle < minPortDistance || field.getOutputAngle()-angle > -minPortDistance && field.getOutputAngle()-angle < minPortDistance){
                        //we have found a port that is within the minimum port distance, return the angle of the port we are colliding with
                        result = field.getOutputAngle()
                        if(!danglingActivePort && field.getInputConnected() === false){
                            field.flagInputAngleMutated()
                        }
                        return
                    }
                }
            }
            
            if(field.getInputConnected() || danglingActivePort){
                let fieldAngle = field.getInputAngle()
                //doing some converting if the ports we are comparing are on either side of the 0 point eg. 0.2 and 6.1 are too close to each other, we convert 6.1 - 2* PI = roughly -0.18. now we can compare them
                if(fieldAngle - minPortDistance<0 && angle + minPortDistance>2 * Math.PI){
                    fieldAngle = 2 * Math.PI + fieldAngle
                }else if(fieldAngle + minPortDistance>2 * Math.PI && angle - minPortDistance<0){
                    fieldAngle = fieldAngle - 2*Math.PI
                }

                if(field.getId() === activeField.getId() && mode === 'input'){
                    //this is the same exact port, don't compare!
                }else{
                    if(fieldAngle-angle > -minPortDistance && fieldAngle-angle < minPortDistance || field.getInputAngle()-angle > -minPortDistance && field.getInputAngle()-angle < minPortDistance){
                        //we have found a port that is within the minimum port distance, return the angle of the port we are colliding with
                        result = field.getInputAngle()
                        if(!danglingActivePort){
                            field.flagInputAngleMutated()
                        }
                        return
                    }
                }
            }
        })

        return result
    }

    static getAdjacentNodes(node: Node, input: boolean): Node[] {
        const eagle: Eagle = Eagle.getInstance();

        // find a single port of the correct type to consider when looking for adjacentNodes
        // TODO: why do we select a single port here, why not consider all ports (if multiple exist)?
        let field : Field;
        for(const port of node.getFields()){
            if (input && port.isInputPort()){
                field = port;
                break;
            }
            if (!input && port.isOutputPort()){
                field = port;
                break;
            }
        }

        // abort if no field is found
        if (field === undefined){
            return [];
        }

        // determine all the adjacent nodes
        const adjacentNodes: Node[] = [];

        if (input){
            for(const edge of eagle.logicalGraph().getEdges()){
                if(field.getId()===edge.getDestPortId()){
                    const adjacentNode: Node = eagle.logicalGraph().findNodeByIdQuiet(edge.getSrcNodeId());
                    adjacentNodes.push(adjacentNode);
                }
            }
        } else {
            for(const edge of eagle.logicalGraph().getEdges()){
                if(field.getId()===edge.getSrcPortId()){
                    const adjacentNode: Node = eagle.logicalGraph().findNodeByIdQuiet(edge.getDestNodeId());
                    adjacentNodes.push(adjacentNode);
                }
            }
        }

        return adjacentNodes;
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

    static createBezier(straightEdgeForce:boolean,addArrowForce:boolean, edge:Edge, srcNodeRadius:number, destNodeRadius:number, srcNodePosition: {x: number, y: number}, destNodePosition: {x: number, y: number}, srcField: Field, destField: Field, sourcePortIsInput: boolean) : string {

        //since the svg parent is translated -50% to center our working area, we need to add half of its size to correct the positions
        const svgTranslationCorrection = EagleConfig.EDGE_SVG_SIZE/2
        destNodePosition={x:destNodePosition.x+svgTranslationCorrection,y:destNodePosition.y+svgTranslationCorrection}
        srcNodePosition={x:srcNodePosition.x+svgTranslationCorrection,y:srcNodePosition.y+svgTranslationCorrection}

        // calculate the angle for the src and dest ports
        const srcPortAngle: number = GraphRenderer.calculateConnectionAngle(srcNodePosition, destNodePosition);
        const destPortAngle: number = srcPortAngle + Math.PI;
        
        // -------------calculate port positions---------------
        
        // calculate the offset for the src and dest ports, based on the angles
        let srcPortOffset;
        let destPortOffset;
        if (srcField){
            if (sourcePortIsInput){
                srcPortOffset = srcField.getInputPosition();
            } else {
                srcPortOffset = srcField.getOutputPosition();
            }
        } else {
            srcPortOffset = GraphRenderer.calculatePortPos(srcPortAngle, srcNodeRadius, srcNodeRadius);
        }
        
        if (destField){
            if (sourcePortIsInput){
                destPortOffset = destField.getOutputPosition();
            } else {
                destPortOffset = destField.getInputPosition();
            }
        } else {
            destPortOffset = GraphRenderer.calculatePortPos(destPortAngle, destNodeRadius, destNodeRadius);
        }

        // calculate the coordinates of the start and end of the edge
        const x1 = srcNodePosition.x + srcPortOffset.x;
        const y1 = srcNodePosition.y + srcPortOffset.y;
        const x2 = destNodePosition.x + destPortOffset.x;
        const y2 = destNodePosition.y + destPortOffset.y;
        
        
        // -------------calculate if the edge is a short edge---------------
        
        // determine if the edge falls below a certain length threshold
        // const edgeLength = Math.sqrt((destNodePosition.x - srcNodePosition.x)**2 + (destNodePosition.y - srcNodePosition.y)**2);
        const edgeLength = Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);

        //determining if the edge's length is below a certain threshold. if it is we will draw the edge straight and remove the arrow
        const isShortEdge: boolean = edgeLength < EagleConfig.STRAIGHT_EDGE_SWITCH_DISTANCE;

        if (edge !== null){
            edge.setIsShortEdge(isShortEdge)
        }

        
        // -------------generate bezier curve control points---------------
        
        // calculate the length from the src and dest nodes at which the control points will be placed
        const lengthToControlPoints = edgeLength * EagleConfig.EDGE_BEZIER_CURVE_MULT;

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

        //the edge parameter is null if we are rendering a comment edge and this is not needed
        if(edge != null || addArrowForce){
            let arrowContainer

            if(addArrowForce){
                arrowContainer = $('#draggingEdge polygon')
            }else{
                arrowContainer = $('#'+edge.getId() +" polygon")
            }

            //we are hiding the arrows if the edge is too short
            if(!isShortEdge){
                //were adding the position and shape of the arrow to the edges
                const arrowPosX =  GraphRenderer.getCoordinateOnBezier(0.5,x1,c1x,c2x,x2)
                const arrowPosY =  GraphRenderer.getCoordinateOnBezier(0.5,y1,c1y,c2y,y2)

                //generating the points for the arrow polygon
                const P1x = arrowPosX+EagleConfig.EDGE_ARROW_SIZE
                const P1y = arrowPosY
                const P2x = arrowPosX-EagleConfig.EDGE_ARROW_SIZE
                const P2y = arrowPosY+EagleConfig.EDGE_ARROW_SIZE
                const P3x = arrowPosX-EagleConfig.EDGE_ARROW_SIZE
                const P3y = arrowPosY-EagleConfig.EDGE_ARROW_SIZE

                //we are calculating the angle the arrow should be pointing by getting two positions on either side of the center of the bezier curve then calculating the angle 
                const  anglePos1x =  GraphRenderer.getCoordinateOnBezier(0.45,x1,c1x,c2x,x2)
                const  anglePos1y =  GraphRenderer.getCoordinateOnBezier(0.45,y1,c1y,c2y,y2)
                const  anglePos2x =  GraphRenderer.getCoordinateOnBezier(0.55,x1,c1x,c2x,x2)
                const  anglePos2y =  GraphRenderer.getCoordinateOnBezier(0.55,y1,c1y,c2y,y2)

                const arrowAngle = GraphRenderer.calculateConnectionAngle({x:anglePos1x,y:anglePos1y}, {x:anglePos2x,y:anglePos2y})
                
                arrowContainer.show()
                arrowContainer.attr('points', P1x +','+P1y+', '+ P2x +','+P2y +', '+ P3x +','+P3y)
                // the rotate argument takes three inputs, (angle in deg, x , y coordinates for the midpoint to rotate around)
                arrowContainer.attr({'transform':'rotate('+arrowAngle*(180/Math.PI)*-1+','+arrowPosX+','+arrowPosY +')'});
            }else{
                arrowContainer.hide()
            }
        }

        // if edge is short, use simplified rendering
        if (isShortEdge || straightEdgeForce){
            return "M " + x1 + " " + y1 + " L " + x2 + " " + y2;
        }

        return "M " + x1 + " " + y1 + " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + x2 + " " + y2;
    }

    static getCoordinateOnBezier(t:number,p1:number,p2:number,p3:number,p4:number) : number {
        //t is a number from 0-1 that specifies where on the curve we want the coordinates. 0.5 is the center.
        return (1-t)*(1-t)*(1-t)*p1 + 3*(1-t)*(1-t)*t*p2 + 3*(1-t)*t*t*p3 + t*t*t*p4;
    }

    static getPath(edge: Edge) : string {
        const lg: LogicalGraph = Eagle.getInstance().logicalGraph();

        const srcNode: Node = lg.findNodeByIdQuiet(edge.getSrcNodeId());
        const destNode: Node = lg.findNodeByIdQuiet(edge.getDestNodeId());
        if(srcNode===null||destNode===null){
            return ''
        }
        const srcField: Field = srcNode.findFieldById(edge.getSrcPortId());
        const destField: Field = destNode.findFieldById(edge.getDestPortId());

        return GraphRenderer._getPath(edge,srcNode, destNode, srcField, destField);
    }

    static getPathComment(commentNode: Node) : string {
        const lg: LogicalGraph = Eagle.getInstance().logicalGraph();

        const srcNode: Node = commentNode;
        const destNode: Node = lg.findNodeByIdQuiet(commentNode.getSubjectId());

        if(srcNode === null || destNode === null){
            return ''
        }

        return GraphRenderer._getPath(null,srcNode, destNode, null, null);
    }

    static getPathDraggingEdge : ko.PureComputed<string> = ko.pureComputed(() => {
        if (GraphRenderer.portDragSourceNode() === null){
            return '';
        }

        const srcNodeRadius: number = GraphRenderer.portDragSourceNode().getRadius();
        const destNodeRadius: number = 0;
        const srcX: number = GraphRenderer.portDragSourceNode().getPosition().x - srcNodeRadius;
        const srcY: number = GraphRenderer.portDragSourceNode().getPosition().y - srcNodeRadius;
        const destX: number = GraphRenderer.mousePosX();
        const destY: number = GraphRenderer.mousePosY();

        const srcField: Field = GraphRenderer.portDragSourcePort();
        const destField: Field = null;

        //if we are dragging from an input port well pass the dragSrcPort(the input port) as the destination of edge. this is so the flow arrow on the edge is point in the correct direction in terms of graph flow
        if(GraphRenderer.portDragSourcePortIsInput){
            return GraphRenderer.createBezier(false,true, null, destNodeRadius, srcNodeRadius, {x:destX, y:destY}, {x:srcX, y:srcY}, destField, srcField, !GraphRenderer.portDragSourcePortIsInput);
        }else{
            return GraphRenderer.createBezier(false,true, null, srcNodeRadius, destNodeRadius, {x:srcX, y:srcY}, {x:destX, y:destY}, srcField, destField, GraphRenderer.portDragSourcePortIsInput);
        }
    }, this);

    static getPathSuggestedEdge : ko.PureComputed<string> = ko.pureComputed(() => {
        if (GraphRenderer.portDragSuggestedNode() === null){
            return '';
        }

        //this is a global variable to contains a port on mouse over. if we are mousing over a port we don't need to draw an edge
        if(GraphRenderer.destinationPort !== null){
            return '';
        }

        const srcNodeRadius: number = 0;
        const destNodeRadius: number = GraphRenderer.portDragSuggestedNode().getRadius();
        const srcX: number = GraphRenderer.mousePosX();
        const srcY: number = GraphRenderer.mousePosY();
        const destX = GraphRenderer.portDragSuggestedNode().getPosition().x - destNodeRadius;
        const destY = GraphRenderer.portDragSuggestedNode().getPosition().y - destNodeRadius;
        const srcField: Field = null;
        const destField: Field = GraphRenderer.portDragSuggestedField();

        return GraphRenderer.createBezier(true,false,  null, srcNodeRadius, destNodeRadius, {x:srcX, y:srcY}, {x:destX, y:destY}, srcField, destField, GraphRenderer.portDragSourcePortIsInput);
    }, this);

    static _getPath(edge:Edge, srcNode: Node, destNode: Node, srcField: Field, destField: Field) : string {
        if (srcNode === null || destNode === null){
            console.warn("Cannot getPath between null nodes. srcNode:", srcNode, "destNode:", destNode);
            return "";
        }

        const srcNodeRadius = srcNode.getRadius()
        const destNodeRadius = destNode.getRadius()

        // we subtract node radius from all these numbers to account for the transform translate(-50%, -50%) css on the nodes
        const srcX = srcNode.getPosition().x -srcNodeRadius;
        const srcY = srcNode.getPosition().y -srcNodeRadius;
        const destX = destNode.getPosition().x -destNodeRadius;
        const destY = destNode.getPosition().y -destNodeRadius;

        return GraphRenderer.createBezier(false,false, edge, srcNodeRadius, destNodeRadius,{x:srcX, y:srcY}, {x:destX, y:destY}, srcField, destField, false);
    }

    static scrollZoom(eagle: Eagle, event: JQuery.TriggeredEvent) : void {
        const e: WheelEvent = event.originalEvent as WheelEvent;

        const wheelDelta = e.deltaY;
        const zoomDivisor = Setting.findValue(Setting.GRAPH_ZOOM_DIVISOR);

        const xsb = GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(null)
        const ysb = GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(null)

        eagle.globalScale(eagle.globalScale()*(1-(wheelDelta/zoomDivisor)));

        if(eagle.globalScale()<0){
            //prevent negative scale which results in an inverted graph
            eagle.globalScale(Math.abs(eagle.globalScale()))
        }

        const xsa = GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(null)
        const ysa = GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(null)

        const moveX = xsa-xsb
        const moveY = ysa-ysb

        eagle.globalOffsetX(eagle.globalOffsetX()+moveX)
        eagle.globalOffsetY(eagle.globalOffsetY()+moveY)
    }

    static editNodeTitleInGraph (data:Node,event: JQuery.TriggeredEvent) : void {
        GraphRenderer.editNodeName = true //used to prevent other drag functions if this feature is active
        const target = event.target
        $(target).hide()
        const input = $(target).parent().find('.header-input')
        input.show().trigger('focus').addClass('changingHeader').trigger('select')
    }

    static closeEditTitleInGraph () : void {
        GraphRenderer.editNodeName = false;
        $('.changingHeader').hide()
        $('.changingHeader').parent().find('.header-name').show()
        $('.changingHeader').removeClass('changingHeader')
    }

    static nodeNameEditorKeybinds (data:Node,event: JQuery.TriggeredEvent) : void  {
        if(event.key === 'Enter' || event.key === 'Escape'){
            GraphRenderer.closeEditTitleInGraph()
        }
    }

    static preventBubbling () : void {
        //calling this function using native JS using onmousedown, onmouseup or onmousemove prevents bubbling these events up without loosing default event handling far any of those events
        //use this if you want only a click event and prevent any other ko events from being called aka drag, mousedown etc
        event.stopPropagation()
    }

    static startDrag(node: Node, event: MouseEvent) : void {
        //if we click on the title of a node, cancel the drag handler
        console.log(event.target)
        if($(event.target).hasClass('changingHeader')){
            event.preventDefault()
            event.stopPropagation()
            return
        }else if(GraphRenderer.editNodeName){
            if(!$(event.target).hasClass('changingHeader')){
                GraphRenderer.closeEditTitleInGraph()
            }
        }
        
        const eagle = Eagle.getInstance();

        // resetting the shift event
        GraphRenderer.dragSelectionHandled(false)

        // these two are needed to keep track of these modifiers for the mouse move and release event
        GraphRenderer.altSelect = event.altKey
        GraphRenderer.shiftSelect = event.shiftKey

        // if no node is selected, or we are dragging using middle mouse, then we are dragging the background
        if(node === null || event.button === 1){
            GraphRenderer.dragSelectionHandled(true)
            GraphRenderer.isDragging(true);
        } else if(!node.isEmbedded()){
            // embedded nodes, aka input and output applications of constructs, cant be dragged
            //initiating node dragging
            GraphRenderer.isDragging(true);
            GraphRenderer.draggingNode(node);
            GraphRenderer.nodeDragElement = event.target
            GraphRenderer.nodeDragNode = node
            GraphRenderer.dragStartPosition = {x:event.pageX,y:event.pageY}
            GraphRenderer.dragCurrentPosition = {x:event.pageX,y:event.pageY}
            
            //checking if the node is inside of a construct, if so, fetching it's parent
            if(node.getParentId() != null){
                const parentNode = eagle.logicalGraph().findNodeByIdQuiet(node.getParentId())
                $('#'+parentNode.getId()).removeClass('transition')
                GraphRenderer.NodeParentRadiusPreDrag = parentNode.getRadius()
            }
        }

        // select handlers
        if(node !== null && event.button != 1 && !event.shiftKey){

            // check if shift key is down, if so, add or remove selected node to/from current selection | keycode 2 is the middle mouse button
            if (node !== null && event.shiftKey && !event.altKey){
                GraphRenderer.dragSelectionHandled(true)
                eagle.editSelection(node, Eagle.FileType.Graph);
            } else if(!eagle.objectIsSelected(node)) {
                eagle.setSelection(node, Eagle.FileType.Graph);
            }

            //check for alt clicking, if so, add the target node and its children to the selection
            if(event.altKey&&node.isGroup()||GraphRenderer.dragSelectionDoubleClick&&node.isGroup()){
                GraphRenderer.selectNodeAndChildren(node,GraphRenderer.shiftSelect)
            }

            //switch back to the node parameter table if a node is selected
        if(Setting.findValue(Setting.BOTTOM_WINDOW_VISIBLE) === true && Setting.findValue(Setting.BOTTOM_WINDOW_MODE) !== Eagle.BottomWindowMode.NodeParameterTable){
                ParameterTable.openTable(Eagle.BottomWindowMode.NodeParameterTable, ParameterTable.SelectType.Normal)
            }
        }else{
            if(event.shiftKey && event.button === 0){
                //initiating drag selection region handler
                GraphRenderer.initiateDragSelection()
            }else{
                //if node is null, the empty canvas has been clicked. clear the selection
                eagle.setSelection(null, Eagle.FileType.Graph);
            }
        }

        //this is the timeout for the double click that is used to select the children of constructs
        GraphRenderer.dragSelectionDoubleClick = true
        setTimeout(function () {
            GraphRenderer.dragSelectionDoubleClick = false
        }, 200)
    }

    static mouseMove(eagle: Eagle, event: JQuery.TriggeredEvent) : void {
        const e: MouseEvent = event.originalEvent as MouseEvent;
        GraphRenderer.ctrlDrag = event.ctrlKey;

        //ive found that using the event.movementX and Y mouse tracking we were using, is not accurate when browser level zoom is applied. so i am calculating the movement per tick myself
        //this is done by comparing the current position, with the position recorded by the previous tick of this function
        let moveDistance = {x:0,y:0}
        if(GraphRenderer.dragCurrentPosition){
            moveDistance = {x:e.pageX - GraphRenderer.dragCurrentPosition?.x, y: e.pageY - GraphRenderer.dragCurrentPosition?.y}
        }
        
        GraphRenderer.dragCurrentPosition = {x:e.pageX,y:e.pageY}

        if (GraphRenderer.isDragging()){
            if (GraphRenderer.draggingNode() !== null && !GraphRenderer.isDraggingSelectionRegion ){
                //check and note if the mouse has moved
                GraphRenderer.simpleSelect = GraphRenderer.dragStartPosition.x - moveDistance.x < 5 && GraphRenderer.dragStartPosition.y - moveDistance.y < 5
                
                //this is to prevent the de-parent transition effect, which we don't want in this case
                $('.node.transition').removeClass('transition')

                // move node if the mouse has moved during the drag event
                if(!GraphRenderer.simpleSelect){
                    eagle.selectedObjects().forEach(function(obj){
                        if(obj instanceof Node){
                            obj.changePosition(moveDistance.x/eagle.globalScale(), moveDistance.y/eagle.globalScale());
                        }
                    })
                }

                //look for a construct at the current location that we would parent to
                //the outermost node is the outermost construct for multi-selection 
                GraphRenderer.lookForParent()
            } else if(GraphRenderer.isDraggingSelectionRegion){
                
                //update selection region position then draw the rectangle
                GraphRenderer.selectionRegionEnd = {x:GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(null), y:GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(null)}
                GraphRenderer.drawSelectionRectangle()
            }else{
                // move background
                eagle.globalOffsetX(eagle.globalOffsetX() + moveDistance.x/eagle.globalScale());
                eagle.globalOffsetY(eagle.globalOffsetY() + moveDistance.y/eagle.globalScale());
            }
        }

        if(GraphRenderer.draggingPort){
            GraphRenderer.portDragging()
        }
    }

    static endDrag(node: Node) : void {
        const eagle = Eagle.getInstance();

        // if we dragged a selection region
        if (GraphRenderer.isDraggingSelectionRegion){
            const nodes: Node[] = GraphRenderer.findNodesInRegion(GraphRenderer.selectionRegionStart.x, GraphRenderer.selectionRegionEnd.x, GraphRenderer.selectionRegionStart.y, GraphRenderer.selectionRegionEnd.y);
            
            //checking if there was no drag distance, if so we are clicking a single object and we will toggle its selection
            if(Math.abs(GraphRenderer.selectionRegionStart.x-GraphRenderer.selectionRegionEnd.x)+Math.abs(GraphRenderer.selectionRegionStart.y - GraphRenderer.selectionRegionEnd.y)<3){
                if(GraphRenderer.altSelect){
                    GraphRenderer.selectNodeAndChildren(node,GraphRenderer.shiftSelect)
                }
                eagle.editSelection(node,Eagle.FileType.Graph);
            }else{
                GraphRenderer.selectInRegion(nodes);
            }

            //resetting some helper variables
            GraphRenderer.ctrlDrag = false;
            
            GraphRenderer.selectionRegionStart.x = 0;
            GraphRenderer.selectionRegionStart.y = 0;
            GraphRenderer.selectionRegionEnd.x = 0;
            GraphRenderer.selectionRegionEnd.y = 0;
            
            GraphRenderer.isDraggingSelectionRegion = false;

            //hide the selection rectangle
            $('#selectionRectangle').hide()

            // necessary to make un-collapsed nodes show up
            eagle.logicalGraph.valueHasMutated();
        }

        // if we aren't multi selecting and the node has moved by a larger amount
        if (!GraphRenderer.isDraggingSelectionRegion && !GraphRenderer.simpleSelect){
            // check if moving whole graph, or just a single node
            if (node !== null){
                eagle.undo().pushSnapshot(eagle, "Move '" + node.getName() + "' node");
            }
        }

        //reset helper globals defaults
        GraphRenderer.simpleSelect = true;
        GraphRenderer.dragSelectionHandled(true)
        GraphRenderer.isDragging(false);
        GraphRenderer.draggingNode(null);
        
        //this is to make affected constructs re calculate their size
        eagle.selectedObjects.valueHasMutated()
    }

    static initiateDragSelection() : void {
        GraphRenderer.isDraggingSelectionRegion = true
        GraphRenderer.selectionRegionStart = {x:GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(null),y:GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(null)}
        GraphRenderer.selectionRegionEnd = {x:GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(null),y:GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(null)}

        //making the selection box visible
        $('#selectionRectangle').show()

        //setting start and end region to current mouse co-ordinates
        $('#selectionRectangle').css({'left':GraphRenderer.selectionRegionStart.x+'px','top':GraphRenderer.selectionRegionStart.y+'px'})
        const containerWidth = $('#logicalGraph').width()
        const containerHeight = $('#logicalGraph').height()

        //turning the graph coordinates into a distance from bottom/right for css inset before applying
        const selectionBottomOffset = containerHeight - GraphRenderer.selectionRegionEnd.y
        const selectionRightOffset = containerWidth - GraphRenderer.selectionRegionEnd.x
        $('#selectionRectangle').css({'right':selectionRightOffset+'px','bottom':selectionBottomOffset+'px'})
    }

    static drawSelectionRectangle() : void {
        const containerWidth = $('#logicalGraph').width()
        const containerHeight = $('#logicalGraph').height()

        if(GraphRenderer.selectionRegionEnd.x>GraphRenderer.selectionRegionStart.x){
            $('#selectionRectangle').css({'left':GraphRenderer.selectionRegionStart.x+'px','right':containerWidth - GraphRenderer.selectionRegionEnd.x+'px'})
        }else{
            $('#selectionRectangle').css({'left':GraphRenderer.selectionRegionEnd.x+'px','right':containerWidth - GraphRenderer.selectionRegionStart.x+'px'})
        }

        if(GraphRenderer.selectionRegionEnd.y>GraphRenderer.selectionRegionStart.y){
            $('#selectionRectangle').css({'top':GraphRenderer.selectionRegionStart.y+'px','bottom':containerHeight - GraphRenderer.selectionRegionEnd.y+'px'})
        }else{
            $('#selectionRectangle').css({'top':GraphRenderer.selectionRegionEnd.y+'px','bottom':containerHeight - GraphRenderer.selectionRegionStart.y+'px'})
        }
    }

    static selectInRegion(nodes:Node[]) : void {
        const eagle = Eagle.getInstance()
        const edges: Edge[] = GraphRenderer.findEdgesContainedByNodes(eagle.logicalGraph().getEdges(), nodes);
        const objects: (Node | Edge)[] = [];

        // depending on if its shift+ctrl or just shift we are either only adding or only removing nodes
        if(!GraphRenderer.ctrlDrag){
            for (const node of nodes){
                if (!eagle.objectIsSelected(node)){
                    objects.push(node);
                }
            }
            for (const edge of edges){
                if (!eagle.objectIsSelected(edge)){
                    objects.push(edge);
                }
            }
        }else{
            for (const node of nodes){
                if (eagle.objectIsSelected(node)){
                    objects.push(node);
                }
            }
            for (const edge of edges){
                if (eagle.objectIsSelected(edge)){
                    objects.push(edge);
                }
            }
        }

        objects.forEach(function(element){
            eagle.editSelection(element, Eagle.FileType.Graph )
        })
    }

    static lookForParent() : void {
        const eagle = Eagle.getInstance()
        const outermostNodes : Node[] = eagle.getOutermostSelectedNodes()
        
        for (const outermostNode of outermostNodes){
            const oldParent: Node = eagle.logicalGraph().findNodeByIdQuiet(outermostNode.getParentId());
            let parentingSuccessful = false; //if the detected parent of one node in the selection changes, we assign the new parent to the whole selection and exit this loop

            // the parent construct is only allowed to grow by the amount specified(eagleConfig.construct_drag_out_distance) before allowing its children to escape
            if(outermostNode.getParentId() != null && oldParent.getRadius()>GraphRenderer.NodeParentRadiusPreDrag+EagleConfig.CONSTRUCT_DRAG_OUT_DISTANCE){
                $('#'+oldParent.getId()).addClass('transition')
                GraphRenderer.parentSelection(outermostNodes, null);
                parentingSuccessful = true;
            }

            // check for nodes underneath the node
            const parent: Node = eagle.logicalGraph().checkForNodeAt(outermostNode.getPosition().x, outermostNode.getPosition().y, outermostNode.getRadius(), true);

            // check if new candidate parent is already a descendent of the node, this would cause a circular hierarchy which would be bad
            const ancestorOfParent = GraphRenderer.isAncestor(parent, outermostNode);

            if(!ancestorOfParent && parent != oldParent && parent != null){
                // setting the new parent for all outermost selected nodes
                GraphRenderer.parentSelection(outermostNodes, parent)
                parentingSuccessful = true;
            }

            if (parent === null && !outermostNode.isEmbedded() && oldParent !== null){
                // moved out of a construct
                $('#'+oldParent.getId()).addClass('transition')
                GraphRenderer.parentSelection(outermostNodes, null);
                parentingSuccessful = true;
            }
            
            if(parentingSuccessful){
                eagle.logicalGraph().fileInfo().modified = true;
                return
            }
        }
    }

    static parentSelection(outermostNodes : Node[], parent:Node) : void {

        const allowGraphEditing = Setting.findValue(Setting.ALLOW_GRAPH_EDITING);
        outermostNodes.forEach(function(object){
            if(object instanceof Node){
                if(!object.isEmbedded() && parent === null){
                    GraphRenderer.updateNodeParent(object, null,  allowGraphEditing);
                }else if(object.getId() != parent?.getId() && !object.isEmbedded()){
                    GraphRenderer.updateNodeParent(object, parent?.getId(), allowGraphEditing);
                }
            }
        })

        // resizing the parent construct to fit its new children
        GraphRenderer.resizeConstruct(parent)

        //updating the parent construct's "pre-drag" size at the end of parenting all the nodes
        GraphRenderer.NodeParentRadiusPreDrag = Eagle.getInstance().logicalGraph().findNodeByIdQuiet(parent?.getId())?.getRadius()
    }

    static findNodesInRegion(left: number, right: number, top: number, bottom: number): Node[] {
        const eagle = Eagle.getInstance();
        const result: Node[] = [];
        const nodeData : Node[] = GraphRenderer.depthFirstTraversalOfNodes(eagle.logicalGraph(), eagle.showDataNodes());

        // re-assign left, right, top, bottom in case selection region was not dragged in the typical NW->SE direction
        const realLeft = left <= right ? left : right;
        const realRight = left <= right ? right : left;
        const realTop = top <= bottom ? top : bottom;
        const realBottom = top <= bottom ? bottom : top;

        for (let i = nodeData.length - 1; i >= 0 ; i--){
            const node : Node = nodeData[i];

            // use center of node as position
            const centerX : number = node.getPosition().x
            const centerY : number = node.getPosition().y
            const nodeRadius : number = node.getRadius()

            //checking if the node is fully inside the selection box
            if (centerX+-nodeRadius >= realLeft && realRight+-nodeRadius >= centerX && centerY+-nodeRadius >= realTop && realBottom+-nodeRadius >= centerY){
                result.push(node);
            }
        }

        return result;
    }

    static selectNodeAndChildren(node:Node, additive:boolean) : void {
        const eagle = Eagle.getInstance();
        GraphRenderer.dragSelectionHandled(true)

        //if shift is not clicked, we first clear the selection
        if(!additive){
            eagle.setSelection(null, Eagle.FileType.Graph);
            eagle.editSelection(node, Eagle.FileType.Graph);
        }

        //getting all children, including children of child constructs etc..
        const constructs : Node[] = [node];
        let i = 0
        
        while(constructs.length > i){
            const construct = constructs[i]
            eagle.logicalGraph().getNodes().forEach(function(obj){
                if(obj.getParentId()===construct.getId()){
                    eagle.editSelection(obj, Eagle.FileType.Graph);

                    if(obj.isGroup()){
                        constructs.push(obj)
                    }
                }
            })
            i++
        }
    }

    static findEdgesContainedByNodes(edges: Edge[], nodes: Node[]): Edge[]{
        const result: Edge[] = [];

        for (const edge of edges){
            const srcId = edge.getSrcNodeId();
            const destId = edge.getDestNodeId();
            let srcFound = false;
            let destFound = false;

            for (const node of nodes){
                if ((node.getId() === srcId) ||
                    (node.hasInputApplication() && node.getInputApplication().getId() === srcId) ||
                    (node.hasOutputApplication() && node.getOutputApplication().getId() === srcId)){
                    srcFound = true;
                }

                if ((node.getId() === destId) ||
                    (node.hasInputApplication() && node.getInputApplication().getId() === destId) ||
                    (node.hasOutputApplication() && node.getOutputApplication().getId() === destId)){
                    destFound = true;
                }
            }

            if (srcFound && destFound){
                result.push(edge);
            }
        }

        return result;
    }

    static centerConstructs(construct:Node, graphNodes:Node[]) : void {
        const constructsList : Node[]=[]
        if(construct === null){
            graphNodes.forEach(function(node){
                if(node.isGroup()){
                    constructsList.push(node)
                }
            })
        }
        let findConstructId
        const orderedConstructList:Node[] = []

        constructsList.forEach(function(construct){
            if(construct.getParentId()===null){
                let finished = false // while there are child construct found in this construct nest group

                findConstructId = construct.getId()
                orderedConstructList.unshift(construct)
                while(!finished){
                    let found = false
                    for(const entry of constructsList){
                        if(entry.getParentId() === findConstructId){
                            orderedConstructList.unshift(entry)
                            findConstructId = entry.getId()
                            found = true
                        }
                    }
                    if(!found){
                        finished = true
                    }
                }
            }
        })

        orderedConstructList.forEach(function(constr){
            GraphRenderer.centerConstruct(constr,graphNodes)
        })
    }

    static centerConstruct(construct:Node,graphNodes:Node[]) : void {
        if(!construct){
            Utils.showNotification('Error','A single Construct node must be selected!',"warning")
            return
        }
        
        let childCount = 0

        let minX : number = Number.MAX_VALUE;
        let minY : number = Number.MAX_VALUE;
        let maxX : number = -Number.MAX_VALUE;
        let maxY : number = -Number.MAX_VALUE;
        for (const node of graphNodes){
            
            if (!node.isEmbedded() && node.getParentId() === construct.getId()){
                childCount++
                if (node.getPosition().x - node.getRadius() < minX){
                    minX = node.getPosition().x - node.getRadius();
                }
                if (node.getPosition().y - node.getRadius() < minY){
                    minY = node.getPosition().y - node.getRadius();
                }
                if (node.getPosition().x + node.getRadius() > maxX){
                    maxX = node.getPosition().x + node.getRadius();
                }
                if (node.getPosition().y + node.getRadius() > maxY){
                    maxY = node.getPosition().y + node.getRadius();
                }
            }
        }
        
        if(childCount === 0){
            return
        }

        // determine the centroid of the construct
        const centroidX = minX + ((maxX - minX) / 2);
        const centroidY = minY + ((maxY - minY) / 2);

        construct.setPosition(centroidX,centroidY)
        GraphRenderer.resizeConstruct(construct)
    }

    // TODO: mode parameter could be a boolean?
    static setNewEmbeddedApp(nodeId: NodeId, mode: string) :void {
        const eagle = Eagle.getInstance()
        const parentNode = eagle.selectedNode()
        RightClick.closeCustomContextMenu(true)

        // try to find the node (by nodeId) in the palettes
        let node = Utils.getPaletteComponentById(nodeId);

        // if node not found yet, try find in the graph
        if (node === null){
            node = eagle.logicalGraph().findNodeById(nodeId);
        }

        //double checking to keep gitAI happy
        if(node === null){
            Utils.showNotification("Error", "Could not find the node we are trying to add", "warning");
            return
        }

        const newNode = Utils.duplicateNode(node)

        if(mode==='addEmbeddedOutputApp'){
            parentNode.setOutputApplication(newNode)
        }else if(mode === 'addEmbeddedInputApp'){
            parentNode.setInputApplication(newNode)
        }else{
            console.warn('mode is not supported: ',mode)
        }
    }

    static translateLegacyGraph() : void {
        const eagle = Eagle.getInstance();
        //we are moving each node by half its radius to counter the fact that the new graph renderer treats the node's visual center as node position, previously the node position was in its top left.
        if(GraphRenderer.legacyGraph){
            //we need to calculate the construct radius in relation to it's children
            eagle.logicalGraph().getNodes().forEach(function(node){
                if(!node.isGroup()&&!node.isEmbedded()){
                    node.setPosition(node.getPosition().x+node.getRadius()/2,node.getPosition().y + node.getRadius()/2)
                }
            })
            GraphRenderer.centerConstructs(null,eagle.logicalGraph().getNodes())
        }
        GraphRenderer.legacyGraph = false
    }

    static moveChildNodes(node: Node, deltaX : number, deltaY : number) : void {
        const eagle = Eagle.getInstance();

        // get id of parent nodeIndex
        const parentId: NodeId = node.getId();

        // loop through all nodes, if they belong to the parent's group, move them too
        for (const node of eagle.logicalGraph().getNodes()){
            if (node.getParentId() === parentId){
                node.changePosition(deltaX, deltaY);
                GraphRenderer.moveChildNodes(node, deltaX, deltaY);
            }
        }
    }

    static isAncestor(node : Node, possibleAncestor : Node) : boolean {
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
            if (n.getId() === possibleAncestor.getId()){
                return true;
            }

            // otherwise keep traversing upwards
            const newKey: NodeId = n.getParentId();

            // if we reach a null parent, we are done looking
            if (newKey === null){
                return false;
            }

            n = eagle.logicalGraph().findNodeById(newKey);
        }
    }

    // update the parent of the given node
    // however, if allowGraphEditing is false, then don't update
    static updateNodeParent(node: Node, parentId: NodeId, allowGraphEditing: boolean): void {
        if (node.getParentId() !== parentId && allowGraphEditing){
            node.setParentId(parentId);
            Eagle.getInstance().checkGraph()   
        }
    }

    // resize a construct so that it contains its children
    // NOTE: does not move the construct
    static resizeConstruct = (construct: Node): void => {
        if(construct === null){
            return
        }

        const eagle = Eagle.getInstance();
        let maxDistance = 0;

        // loop through all nodes to fund children - then check to find distance from center of construct
        for (const node of eagle.logicalGraph().getNodes()){
            if(GraphRenderer.ctrlDrag && eagle.objectIsSelected(node) && !eagle.objectIsSelectedById(node.getParentId())){
                continue
            }
            if (node.getParentId() === construct.getId()){
                const dx = construct.getPosition().x - node.getPosition().x;
                const dy = construct.getPosition().y - node.getPosition().y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                const paddedDistance = distance + node.getRadius() + EagleConfig.CONSTRUCT_MARGIN;

                maxDistance = Math.max(maxDistance, paddedDistance);
            }
        }

        // make sure constructs are never below minimum size
        maxDistance = Math.max(maxDistance, EagleConfig.MINIMUM_CONSTRUCT_RADIUS);

        if(construct.isGroup()){
            construct.setRadius(maxDistance);
        }
    }

    static updateMousePos(): void {
        // grab and convert mouse position to graph coordinates
        GraphRenderer.mousePosX(GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(null));
        GraphRenderer.mousePosY(GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(null));
    }

    // TODO: can we use the Daliuge.FieldUsage type here for the 'usage' parameter?
    static portDragStart(port:Field, usage:string) : void {
        const eagle = Eagle.getInstance();
        const e:any = event; //somehow the event here will always log in the console as a mouseevent. this allows the following line to access the button attribute.
        //furter down we are calling stopPropagation on the same event object and it works, eventhough stopPropagation shouldnt exist on a mouseEvent. this is why i created a constant of type any. its working as it should but i dont kow how.
        if(e.button === 1){
            //we return if the button pressed is a middle mouse button, and allow the other drag events to handle this event. middle mouse is used for panning the canvas.
            return
        }

        GraphRenderer.updateMousePos();

        //prevents moving the node when dragging the port
        e.stopPropagation();
        
        //preparing necessary port info
        GraphRenderer.draggingPort = true
        GraphRenderer.portDragSourceNode(eagle.logicalGraph().findNodeById(port.getNodeId()));
        GraphRenderer.portDragSourcePort(port);
        GraphRenderer.portDragSourcePortIsInput = usage === 'input';      
        GraphRenderer.renderDraggingPortEdge(true);
        GraphRenderer.createEdgeSuggestedPorts = []
        
        //take not of the start drag position
        GraphRenderer.portDragStartPos = {x:GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(null),y:GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(null)}

        //setting up the port event listeners
        $('#logicalGraphParent').on('mouseup.portDrag',function(){GraphRenderer.portDragEnd()})
        $('.node .body').on('mouseup.portDrag',function(){GraphRenderer.portDragEnd()})

        if(GraphRenderer.portDragSourcePortIsInput){
            port.setInputPeek(true)
        }else{
            port.setOutputPeek(true)
        }

        // build the list of all ports in the graph that are a valid end-point for an edge starting at this port
        GraphRenderer.createEdgeSuggestedPorts = GraphRenderer.findMatchingPorts(GraphRenderer.portDragSourceNode(), GraphRenderer.portDragSourcePort());
    }

    static portDragging() : void {
        GraphRenderer.updateMousePos();

        // check for nearest matching port in the nearby nodes
        const match: {node: Node, field: Field, validity:Errors.Validity} = GraphRenderer.findNearestMatchingPort(GraphRenderer.mousePosX(), GraphRenderer.mousePosY(), GraphRenderer.portDragSourceNode(), GraphRenderer.portDragSourcePort(), GraphRenderer.portDragSourcePortIsInput);

        if (match.field !== null){
            GraphRenderer.portDragSuggestedNode(match.node);
            GraphRenderer.portDragSuggestedField(match.field);
            GraphRenderer.portDragSuggestionValidity(match.validity)
        } else {
            GraphRenderer.portDragSuggestedNode(null);
            GraphRenderer.portDragSuggestedField(null);
            GraphRenderer.portDragSuggestionValidity(Errors.Validity.Unknown)
        }
    }

    static portDragEnd() : void {
        const eagle = Eagle.getInstance();

        GraphRenderer.draggingPort = false;
        // cleaning up the port drag event listeners
        $('#logicalGraphParent').off('mouseup.portDrag')
        $('.node .body').off('mouseup.portDrag')

        //here
        if(Math.abs(GraphRenderer.portDragStartPos.x - GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(null))+Math.abs(GraphRenderer.portDragStartPos.y - GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(null))<3){
            //identify a click, if we click a port, we will open the parameter table and highlight the port
            ParameterTable.openTableAndSelectField(GraphRenderer.portDragSourceNode(), GraphRenderer.portDragSourcePort())
            GraphRenderer.clearEdgeVars();
        }else{
            if ((GraphRenderer.destinationPort !== null || GraphRenderer.portDragSuggestedField() !== null) && GraphRenderer.portMatchCloseEnough()){
                const srcNode: Node = GraphRenderer.portDragSourceNode();
                const srcPort: Field = GraphRenderer.portDragSourcePort();
    
                let destNode: Node = null;
                let destPort: Field = null;
    
                if (GraphRenderer.destinationPort !== null){
                    destNode = GraphRenderer.destinationNode;
                    destPort = GraphRenderer.destinationPort;
                } else {
                    destNode = GraphRenderer.portDragSuggestedNode();
                    destPort = GraphRenderer.portDragSuggestedField();
                }
    
                GraphRenderer.createEdge(srcNode, srcPort, destNode, destPort);
    
                // we can stop rendering the dragging edge
                GraphRenderer.renderDraggingPortEdge(false);
                GraphRenderer.clearEdgeVars();
            } else {
                if (GraphRenderer.destinationPort === null){
                    GraphRenderer.showUserNodeSelectionContextMenu();
                } else {
                    // connect to destination port
                    const srcNode: Node = GraphRenderer.portDragSourceNode();
                    const srcPort: Field = GraphRenderer.portDragSourcePort();
                    const destNode: Node = GraphRenderer.destinationNode;
                    const destPort: Field = GraphRenderer.destinationPort;
    
                    GraphRenderer.createEdge(srcNode, srcPort, destNode, destPort);
    
                    // we can stop rendering the dragging edge
                    GraphRenderer.renderDraggingPortEdge(false);
                    GraphRenderer.clearEdgeVars();
                }
            }
            GraphRenderer.portDragSourcePort()?.setInputPeek(false)
            GraphRenderer.portDragSourcePort()?.setOutputPeek(false)
        }

        //resetting some global cached variables
        GraphRenderer.createEdgeSuggestedPorts.forEach(function(matchingPort){
            matchingPort.field.setInputPeek(false)
            matchingPort.field.setOutputPeek(false)
        })

        GraphRenderer.createEdgeSuggestedPorts = []
        eagle.logicalGraph.valueHasMutated();
    }

    static createEdge(srcNode: Node, srcPort: Field, destNode: Node, destPort: Field){
        const eagle = Eagle.getInstance();

        // check if edge is back-to-front (input-to-output), if so, swap the source and destination
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
        const linkValid : Errors.Validity = Edge.isValid(eagle, true, null, realSourceNode.getId(), realSourcePort.getId(), realDestinationNode.getId(), realDestinationPort.getId(), false, false, true, true, {errors:[], warnings:[]});

        // abort if edge is invalid
        if ((Setting.findValue(Setting.ALLOW_INVALID_EDGES) && linkValid === Errors.Validity.Error) || linkValid === Errors.Validity.Valid || linkValid === Errors.Validity.Warning || linkValid === Errors.Validity.Fixable){
            if (linkValid === Errors.Validity.Warning){
                GraphRenderer.addEdge(realSourceNode, realSourcePort, realDestinationNode, realDestinationPort, true, false);
            } else {
                GraphRenderer.addEdge(realSourceNode, realSourcePort, realDestinationNode, realDestinationPort, false, false);
            }
        } else {
            console.warn("link not valid, result", linkValid);
        }
    }

    static showUserNodeSelectionContextMenu(){
        const eagle: Eagle = Eagle.getInstance();

        //hiding the suggested node edge while the right click menu shows up
        GraphRenderer.portDragSuggestedNode(null)
        GraphRenderer.portDragSuggestedField(null)

        // check if source port is a 'dummy' port
        // if so, consider all components as eligible, to ease the creation of new graphs
        const sourcePortIsDummy: boolean = GraphRenderer.portDragSourcePort().getDisplayText() === Daliuge.FieldName.DUMMY;

        let eligibleComponents: Node[];

        // get all nodes with at least one port with opposite "direction" (input/output) from the source node
        eligibleComponents = [];

        //add all nodes from the palettes 
        eagle.palettes().forEach(function(palette){
            palette.getNodes().forEach(function(node){
                if (GraphRenderer.portDragSourcePortIsInput){
                    if (node.getOutputPorts().length > 0){
                        eligibleComponents.push(node);
                    }
                } else {
                    if (node.getInputPorts().length > 0){
                        eligibleComponents.push(node);
                    }
                }
            })
        });

        //add all the nodes from the graph
        eagle.logicalGraph().getNodes().forEach(function(graphNode){
            if (GraphRenderer.portDragSourcePortIsInput){
                if (graphNode.getOutputPorts().length > 0){
                    eligibleComponents.push(graphNode);
                }
            } else {
                if (graphNode.getInputPorts().length > 0){
                    eligibleComponents.push(graphNode);
                }
            }
        })

        //if enabled, filter the list 
        if (Setting.findValue(Setting.FILTER_NODE_SUGGESTIONS)){
            // getting matches from both the graph and the palettes list
            const filteredComponents = Utils.getComponentsWithMatchingPort(eligibleComponents, !GraphRenderer.portDragSourcePortIsInput, GraphRenderer.portDragSourcePort().getType());
            eligibleComponents = filteredComponents
        }
        
        // check we found at least one eligible component
        if (eligibleComponents.length === 0){
            Utils.showNotification("Not Found", "No eligible components found for connection to port of this type (" + GraphRenderer.portDragSourcePort().getType() + ")", "info");

            // stop rendering the dragging edge
            GraphRenderer.renderDraggingPortEdge(false);
        } else {

            // NOTE: create copy in right click ts because we are using the right click menus to handle the node selection
            RightClick.edgeDropSrcNode = GraphRenderer.portDragSourceNode();
            RightClick.edgeDropSrcPort = GraphRenderer.portDragSourcePort();
            RightClick.edgeDropSrcIsInput = GraphRenderer.portDragSourcePortIsInput;

            Eagle.selectedRightClickPosition = {x:GraphRenderer.mousePosX(), y:GraphRenderer.mousePosY()};

            RightClick.edgeDropCreateNode(eligibleComponents)
        }
    }

    static showPort(node: Node, field: Field) : boolean {
        const eagle = Eagle.getInstance();
        if(!GraphRenderer.dragSelectionHandled()){
            return false
        }else if(node.isPeek()){
            return true
        }else if(eagle.objectIsSelected(node)){
            return true
        }else if(field.isInputPeek() || field.isOutputPeek()){
            return true
        }else{
            return false
        }
    }
    
    static SCREEN_TO_GRAPH_POSITION_X(x:number) : number {
        const eagle = Eagle.getInstance();
        if(x===null && GraphRenderer.dragCurrentPosition){
            x = GraphRenderer.dragCurrentPosition.x
        }
        return x/eagle.globalScale() - eagle.globalOffsetX();
    }

    static SCREEN_TO_GRAPH_POSITION_Y(y:number) : number {
        const eagle = Eagle.getInstance();
        if(y===null && GraphRenderer.dragCurrentPosition){
            y = GraphRenderer.dragCurrentPosition.y
        }
        return (y-83.77)/eagle.globalScale() -eagle.globalOffsetY();
    }

    static SCREEN_TO_GRAPH_SCALE(n: number) : number {
        const eagle = Eagle.getInstance();
        return n * eagle.globalScale();
    }

    static GRAPH_TO_SCREEN_POSITION_X(x: number) : number {
        const eagle = Eagle.getInstance();
        return(x + eagle.globalOffsetX()) * eagle.globalScale()
    }

    static GRAPH_TO_SCREEN_POSITION_Y(y: number) : number {
        const eagle = Eagle.getInstance();
        return (y+eagle.globalOffsetY())*eagle.globalScale()+83.77
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
                if (edge.getDestNodeId() === node.getId()){
                    nodeHasConnectedInput = true;
                }

                if (edge.getSrcNodeId() === node.getId()){
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
        let nodeId: NodeId;
        let nodeParentId: NodeId = node.getParentId();
        let iterations = 0;

        // follow the chain of parents
        while (nodeParentId != null){
            if (iterations > 10){
                console.error("too many iterations in findDepthOfNode()");
                break;
            }

            iterations += 1;
            depth += 1;
            depth += node.getDrawOrderHint() / 10;
            nodeId = node.getId();
            nodeParentId = node.getParentId();

            if (nodeParentId === null){
                return depth;
            }

            // TODO: could we use 
            node = GraphRenderer.findNodeWithId(nodeParentId, nodes);

            if (node === null){
                console.error("Node", nodeId, "has parentId", nodeParentId, "but call to findNodeWithId(", nodeParentId, ") returned null");
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

    // TODO: can we just use LogicalGraph.findNodeById() instead of this function
    static findNodeWithId(id: NodeId, nodes: Node[]) : Node {
        if (id === null){
            return null;
        }

        for (const node of nodes){
            if (node.getId() === id){
                return node;
            }

            // check if the node's inputApp has a matching key
            if (node.hasInputApplication()){
                if (node.getInputApplication().getId() === id){
                    return node.getInputApplication();
                }
            }

            // check if the node's outputApp has a matching key
            if (node.hasOutputApplication()){
                if (node.getOutputApplication().getId() === id){
                    return node.getOutputApplication();
                }
            }
        }

        console.warn("Cannot find node with id", id);
        return null;
    }

    static findMatchingPorts(sourceNode: Node, sourcePort: Field): {node: Node, field: Field, validity: Errors.Validity}[]{
        const eagle = Eagle.getInstance();
        const result: {node: Node, field: Field,validity:Errors.Validity}[] = [];

        const minValidity: Errors.Validity = Setting.findValue(Setting.AUTO_COMPLETE_EDGES_LEVEL);
        const minValidityIndex: number = Object.values(Errors.Validity).indexOf(minValidity);

        const potentialNodes :Node[] = []

        for (const node of eagle.logicalGraph().getNodes()){
            potentialNodes.push(node)
            if(node.isConstruct && node.getInputApplication()){
                potentialNodes.push(node.getInputApplication())
            }
            if(node.isConstruct && node.getOutputApplication()){
                potentialNodes.push(node.getOutputApplication())
            }
        }

        for(const node of potentialNodes){
            for (const port of node.getPorts()){
                let isValid: Errors.Validity
                if(!GraphRenderer.portDragSourcePortIsInput){
                    isValid = Edge.isValid(eagle, true, null, sourceNode.getId(), sourcePort.getId(), node.getId(), port.getId(), false, false, false, false, {errors:[], warnings:[]});
                }else{
                    isValid = Edge.isValid(eagle, true, null, node.getId(), port.getId(), sourceNode.getId(), sourcePort.getId(), false, false, false, false, {errors:[], warnings:[]});
                }
                const isValidIndex: number = Object.values(Errors.Validity).indexOf(isValid);

                if (isValidIndex >= minValidityIndex){
                    result.push({node: node, field: port,validity: isValid});
                    if(GraphRenderer.portDragSourcePortIsInput){
                        port.setOutputPeek(true)
                    }else{
                        port.setInputPeek(true)
                    }
                }
            }
        }

        return result;
    }
    
    static findNearestMatchingPort(positionX: number, positionY: number, sourceNode: Node, sourcePort: Field, sourcePortIsInput: boolean) : {node: Node, field: Field, validity: Errors.Validity} {
        let minDistance: number = Number.MAX_SAFE_INTEGER;
        let minNode: Node = null;
        let minPort: Field = null;
        let minValidity: Errors.Validity = Errors.Validity.Unknown;
        GraphRenderer.portMatchCloseEnough(false)

        const portList = GraphRenderer.createEdgeSuggestedPorts
        for (const portInfo of portList){
            const port = portInfo.field
            const node = portInfo.node
            const validity = portInfo.validity

            // get position of port
            let portX
            let portY
            if (sourcePortIsInput){
                portX = port.getOutputPosition().x;
                portY = port.getOutputPosition().y;
            } else {
                portX = port.getInputPosition().x;
                portY = port.getInputPosition().y;
            }
            portX = node.getPosition().x - node.getRadius() + portX
            portY = node.getPosition().y - node.getRadius() + portY

            // get distance to port
            const distance = Math.sqrt( Math.pow(portX - positionX, 2) + Math.pow(portY - positionY, 2) );

            if(distance > EagleConfig.NODE_SUGGESTION_RADIUS){
                continue
            }

            // remember this port if it the best so far
            if (distance < minDistance){
                minPort = port;
                minNode = node;
                minDistance = distance;
                minValidity = validity;
            }
        }
        if (minDistance<EagleConfig.NODE_SUGGESTION_SNAP_RADIUS){
            GraphRenderer.portMatchCloseEnough(true)
        }

        return {node: minNode, field: minPort, validity: minValidity};
    }
    
    static mouseEnterPort(usage:string, port : Field) : void {
        if (!GraphRenderer.draggingPort){
            return;
        }

        const eagle = Eagle.getInstance();
        GraphRenderer.destinationPort = port;
        GraphRenderer.destinationNode = eagle.logicalGraph().findNodeById(port.getNodeId());

        //if the port we are dragging from and are hovering one are the same type of port return an error
        if(usage === 'input' && GraphRenderer.portDragSourcePortIsInput || usage === 'output' && !GraphRenderer.portDragSourcePortIsInput){
            if(port.isInputPort() && port.isOutputPort()){
                GraphRenderer.isDraggingPortValid(Errors.Validity.Fixable)
            }else{
                GraphRenderer.isDraggingPortValid(Errors.Validity.Impossible)
            }
            return
        }
        let isValid: Errors.Validity

        if(!GraphRenderer.portDragSourcePortIsInput){
            isValid = Edge.isValid(eagle, true, null, GraphRenderer.portDragSourceNode().getId(), GraphRenderer.portDragSourcePort().getId(), GraphRenderer.destinationNode.getId(), GraphRenderer.destinationPort.getId(), false, false, false, false, {errors:[], warnings:[]});
        }else{
            isValid = Edge.isValid(eagle, true, null, GraphRenderer.destinationNode.getId(), GraphRenderer.destinationPort.getId(), GraphRenderer.portDragSourceNode().getId(), GraphRenderer.portDragSourcePort().getId(), false, false, false, false, {errors:[], warnings:[]});
        }
        GraphRenderer.isDraggingPortValid(isValid);
    }

    static mouseLeavePort(port : Field) : void {
        GraphRenderer.destinationPort = null;
        GraphRenderer.destinationNode = null;

        GraphRenderer.isDraggingPortValid(Errors.Validity.Unknown);
    }

    static draggingEdgeGetStrokeColor: ko.PureComputed<string> = ko.pureComputed(() => {
        let edgeTargetValidity = GraphRenderer.isDraggingPortValid()

        //if this is the case, we are not hovering on a port and want the validity of the suggested connection to determine the edge color
        if(edgeTargetValidity===Errors.Validity.Unknown){
            edgeTargetValidity = GraphRenderer.portDragSuggestionValidity()

            //we are coloring the edge according to suggested connections, but the suggestion is not close enough
            if(!GraphRenderer.portMatchCloseEnough()){
                return EagleConfig.getColor("edgeDefault")
            }
        }

        switch (edgeTargetValidity){
            case Errors.Validity.Unknown:
                return EagleConfig.getColor("edgeDefault");
            case Errors.Validity.Fixable:
                return EagleConfig.getColor("edgeFixable")
            case Errors.Validity.Impossible:
            case Errors.Validity.Error:
                return EagleConfig.getColor("edgeInvalid");
            case Errors.Validity.Warning:
                return EagleConfig.getColor("edgeWarning");
            case Errors.Validity.Valid:
                return EagleConfig.getColor("edgeValid");
            default:
                return EagleConfig.getColor("edgeDefault");
        }
    }, this);

    static suggestedEdgeGetStrokeColor() : string {
        if(GraphRenderer.portMatchCloseEnough()){
            return EagleConfig.getColor("edgeAutoComplete");
        }else{
            return EagleConfig.getColor("edgeAutoCompleteSuggestion");
        }
    }

    static draggingEdgeGetStrokeType() : string {
        return '';
    }

    static suggestedEdgeGetStrokeType() : string {
        return '';
    }

    static async addEdge(srcNode: Node, srcPort: Field, destNode: Node, destPort: Field, loopAware: boolean, closesLoop: boolean): Promise<void> {
        const eagle = Eagle.getInstance();
        if (srcPort.getId() === destPort.getId()){
            console.warn("Abort addLink() from port to itself!");
            return;
        }

        await eagle.addEdge(srcNode, srcPort, destNode, destPort, loopAware, closesLoop);
        eagle.checkGraph();
        eagle.undo().pushSnapshot(eagle, "Added edge from " + srcNode.getName() + " to " + destNode.getName());
        eagle.logicalGraph().fileInfo().modified = true;
        eagle.logicalGraph.valueHasMutated();
        GraphRenderer.clearEdgeVars();
    }

    static clearEdgeVars(){
        GraphRenderer.portDragSourcePort(null)
        GraphRenderer.portDragSourceNode(null)
        GraphRenderer.portDragSourcePortIsInput = false
        GraphRenderer.destinationPort = null
        GraphRenderer.destinationNode = null
        GraphRenderer.portDragSuggestedNode(null)
        GraphRenderer.portDragSuggestedField(null)
    }

    static selectEdge(edge: Edge, event: MouseEvent){
        const eagle = Eagle.getInstance();
        if (edge !== null){
            if (event.shiftKey){
                eagle.editSelection(edge, Eagle.FileType.Graph);
            } else {
                eagle.setSelection(edge, Eagle.FileType.Graph);
            }
        }
    }

    static clearPortPeek() : void {
        const eagle = Eagle.getInstance();
        eagle.logicalGraph().getNodes().forEach(function(node){
            if(node.isConstruct()){
                if(node.getInputApplication() != null){
                    node.getInputApplication().getFields().forEach(function(inputAppField){
                       inputAppField.setInputPeek(false) 
                       inputAppField.setOutputPeek(false) 
                    })
                }
                if(node.getOutputApplication() != null){
                    node.getOutputApplication().getFields().forEach(function(outputAppField){
                        outputAppField.setInputPeek(false) 
                        outputAppField.setOutputPeek(false) 
                    })
                }
            }

            node.getFields().forEach(function(field){
                field.setInputPeek(false) 
                field.setOutputPeek(false) 
            })  
        })  
    }

    static setPortPeekForEdge(edge:Edge, value:boolean) : void {
        const eagle = Eagle.getInstance();
        const inputPort = eagle.logicalGraph().findNodeByIdQuiet(edge.getSrcNodeId()).findFieldById(edge.getSrcPortId())
        const outputPort = eagle.logicalGraph().findNodeByIdQuiet(edge.getDestNodeId()).findFieldById(edge.getDestPortId())
        
        // if the input port found, set peek
        if (inputPort !== null){
            inputPort.setOutputPeek(value);
        } else {
            console.warn("Could not find input port of edge. Unable to set peek.")
        }

        // if the output port found, set peek
        if (outputPort !== null){
            outputPort.setInputPeek(value);
        } else {
            console.warn("Could not find output port of edge. Unable to set peek.")
        }
    }

    static edgeGetStrokeColor(edge: Edge) : string {
        const eagle = Eagle.getInstance();

        let normalColor: string = EagleConfig.getColor('edgeDefault');
        let selectedColor: string = EagleConfig.getColor('edgeDefaultSelected');

        // check if source node is an event, if so, draw in blue
        const srcNode : Node = eagle.logicalGraph().findNodeById(edge.getSrcNodeId());

        if (srcNode !== null){
            const srcPort : Field = srcNode.findFieldById(edge.getSrcPortId());

            if (srcPort !== null && srcPort.getIsEvent()){
                normalColor = EagleConfig.getColor('edgeEvent');
                selectedColor = EagleConfig.getColor('edgeEventSelected');
            }
        }

        // check if link has a warning or is invalid
        // const linkValid : Errors.Validity = Edge.isValid(eagle,false, edge.getId(), edge.getSrcNodeId(), edge.getSrcPortId(), edge.getDestNodeId(), edge.getDestPortId(), edge.isLoopAware(), edge.isClosesLoop(), false, false, {errors:[], warnings:[]});
        const linkValid : Errors.Validity = Utils.worstEdgeError(edge.getErrorsWarnings());

        if (linkValid === Errors.Validity.Error || linkValid === Errors.Validity.Impossible){
            normalColor = EagleConfig.getColor('edgeInvalid');
            selectedColor = EagleConfig.getColor('edgeInvalidSelected');
        }

        if (linkValid === Errors.Validity.Warning){
            normalColor = EagleConfig.getColor('edgeWarning');
            selectedColor = EagleConfig.getColor('edgeWarningSelected');
        }

        return eagle.objectIsSelected(edge) ? selectedColor : normalColor;
    }

    static edgeGetStrokeType(edge:Edge) : string {
        if(edge.isClosesLoop()){
            return ' 15, 8, 5, 8'
        }else if(edge.isPath()){
            return '1,4'
        }else if(edge.isLoopAware()){
            return '4,6'
        }else{
            return ''
        }
    }
}
