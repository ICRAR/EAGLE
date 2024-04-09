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
import { Edge } from "./Edge";
import { Field } from './Field';
import { GraphConfig } from './graphConfig';
import { LogicalGraph } from './LogicalGraph';
import { Node } from './Node';
import { Utils } from './Utils';
import { CategoryData} from './CategoryData';
import { Setting } from './Setting';
import { RightClick } from "./RightClick";

ko.bindingHandlers.nodeRenderHandler = {
    init: function(element:any, valueAccessor) {
        const node: Node = ko.unwrap(valueAccessor())

        //overwriting css variables using colours from graphConfig.ts. I am using this for simple styling to avoid excessive css data binds in the node html files
        $("#logicalGraphParent").get(0).style.setProperty("--selectedBg", GraphConfig.getColor('selectBackground'));
        $("#logicalGraphParent").get(0).style.setProperty("--selectedConstructBg", GraphConfig.getColor('selectConstructBackground'));
        $("#logicalGraphParent").get(0).style.setProperty("--nodeBorder", GraphConfig.getColor('bodyBorder'));
        $("#logicalGraphParent").get(0).style.setProperty("--nodeBg", GraphConfig.getColor('nodeBg'));
        $("#logicalGraphParent").get(0).style.setProperty("--graphText", GraphConfig.getColor('graphText'));
        $("#logicalGraphParent").get(0).style.setProperty("--branchBg", GraphConfig.getColor('branchBg'));
        $("#logicalGraphParent").get(0).style.setProperty("--constructBg", GraphConfig.getColor('constructBg'));
        $("#logicalGraphParent").get(0).style.setProperty("--embeddedApp", GraphConfig.getColor('embeddedApp'));
        $("#logicalGraphParent").get(0).style.setProperty("--constructIcon", GraphConfig.getColor('constructIcon'));
        $("#logicalGraphParent").get(0).style.setProperty("--commentEdgeColor", GraphConfig.getColor('commentEdge'));
        $("#logicalGraphParent").get(0).style.setProperty("--matchingEdgeColor", GraphConfig.getColor('edgeAutoComplete'));
        
        if( node.isData()){
            $(element).find('.body').css('background-color:#575757','color:white')
        }
    },
    update: function (element:any, valueAccessor) {
        const node: Node = ko.unwrap(valueAccessor());

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

        if(node.isGroup()|| node.getParentKey() != null){
            GraphRenderer.resizeConstruct(node,false)
        }
    },
};

//port html elements will have a data bind to the port position saved on the field - This is an observable

//save the calculated connection angle on the field (this is the ideal position)
//then check if this is abvailable using a node.getfields.getangle Loop
//if so, write it into the port position, this will trigger the html data-bind to draw/redraw the port
//if not available we add a set amount to the closest port's position, repeating until we find an available spot, saving each port we are colliding with
//this set amount is a dinstance we need to keep. we will have to calculate an angle based on the radius of a node to keep this distance
//we then do the same but subtracting the set amount
//use the lower distance
//figure out the mean angle of this 'port group' and center them. update all of their port positions

//first dangling port, check for biggest gap
//check if half of the biggest gap is still bigger than the second biggest gap
//if so use the center of half of the biggest gap in input ports left bound, output right
//place the dangling port
//if another dangling port is updated, check if a dangling port of the same type has already been placed(input of output)
//if so have them share the space, if not enough space is available, find another spot

ko.bindingHandlers.embeddedAppPosition = {
    update: function (element:any, valueAccessor) {
        const eagle : Eagle = Eagle.getInstance();
        const applicationNode: Node = ko.utils.unwrapObservable(valueAccessor()).applicationNode;
        const input: boolean = ko.utils.unwrapObservable(valueAccessor()).input;

        // find the node in which the applicationNode has been embedded
        const parentNode: Node = eagle.logicalGraph().findNodeByKeyQuiet(applicationNode.getEmbedKey());

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
                node = eagle.logicalGraph().findNodeByKeyQuiet(f.getNodeKey())
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
            case 'comment':
                const adjacentNode: Node = eagle.logicalGraph().findNodeByKeyQuiet(n.getSubjectKey());

                if (adjacentNode === null){
                    console.warn("Could not find adjacentNode for comment with subjectKey", n.getSubjectKey());
                    return;
                }

                adjacentNodes.push(adjacentNode);
                break;

            case 'inputPort':
                for(const edge of eagle.logicalGraph().getEdges()){
                    if(field != null && field.getId()===edge.getDestPortId()){
                        const adjacentNode: Node = eagle.logicalGraph().findNodeByKeyQuiet(edge.getSrcNodeKey());
                        
                        if (adjacentNode === null){
                            console.warn("Could not find adjacentNode for inputPort or inputApp with SrcNodeKey", edge.getSrcNodeKey());
                            return;
                        }

                        connectedField=true
                        adjacentNodes.push(adjacentNode);
                        continue;
                    }
                }
                break;

            case 'outputPort':
                for(const edge of eagle.logicalGraph().getEdges()){
                    if(field.getId()===edge.getSrcPortId()){
                        const adjacentNode: Node = eagle.logicalGraph().findNodeByKeyQuiet(edge.getDestNodeKey());

                        if (adjacentNode === null){
                            console.warn("Could not find adjacentNode for  outputPort or outputApp with DestNodeKey", edge.getDestNodeKey());
                            return;
                        }

                        connectedField=true
                        adjacentNodes.push(adjacentNode);
                        continue;
                    }
                }
                break;
        }

        // get node radius
        const nodeRadius = node.getRadius()
        // determine port position
        const currentNodePos = node.getPosition();
        let portPosition;
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
                    portPosition=GraphRenderer.calculatePortPos(Math.PI/2, nodeRadius, nodeRadius)
                    break;
            }
        }
        //checking for port colisions if connected
        if(!node.isComment()){
            // //calculating the minimum port distance as an angle. we save this min distance as a pixel distance between ports
            // const minimumPortDistance:number = Number(Math.asin(GraphConfig.PORT_MINIMUM_DISTANCE/node.getRadius()).toFixed(6))

            //checking if the ports are linked 
            const portIsLinked = eagle.logicalGraph().portIsLinked(node.getKey(),field.getId())
            field.setInputConnected(portIsLinked.input)
            field.setOutputConnected(portIsLinked.output)


            GraphRenderer.sortAndOrganizePorts(node)

            // if(dataType === 'inputPort'){//for input ports
            //     const newInputPortAngle = GraphRenderer.findClosestMatchingAngle(node,field.getInputAngle(),minimumPortDistance,field,'input')
            //     field.setInputAngle(newInputPortAngle)
            // }
            
            // if(dataType === 'outputPort'){//for output ports
            //     const newOutputPortAngle = GraphRenderer.findClosestMatchingAngle(node,field.getOutputAngle(),minimumPortDistance,field,'output')
            //     field.setOutputAngle(newOutputPortAngle)
            // }
        }
        
        // if (dataType === 'inputPort'){
        //     portPosition = GraphRenderer.calculatePortPos(field.getInputAngle(), nodeRadius, nodeRadius)      
        //     //a little 1px reduction is needed to center ports for some reason
        //     if(!node.isBranch()){
        //         portPosition = {x:portPosition.x-1,y:portPosition.y-1}
        //     }  

        //     field.setInputPosition(portPosition.x, portPosition.y);
        // } 
        // if (dataType === 'outputPort'){
        //     portPosition = GraphRenderer.calculatePortPos(field.getOutputAngle(), nodeRadius, nodeRadius)

        //     //a little 1px reduction is needed to center ports for some reason
        //     if(!node.isBranch()){
        //         portPosition = {x:portPosition.x-1,y:portPosition.y-1}
        //     }

        //     field.setOutputPosition(portPosition.x, portPosition.y);
        // }

        //align the port titles to the correct side of the node, depending on node angle
        //clear style since it doesnt seem to overwrite
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

    //port drag handler globals
    static draggingPort : boolean = false;
    static isDraggingPortValid: ko.Observable<Eagle.LinkValid> = ko.observable(<Eagle.LinkValid>"Unknown");
    static destinationNode : Node = null;
    static destinationPort : Field = null;
    
    static portDragSourceNode : ko.Observable<Node> = ko.observable(null);
    static portDragSourcePort : ko.Observable<Field> = ko.observable(null);
    static portDragSourcePortIsInput: boolean = false;

    static portDragSuggestedNode : ko.Observable<Node> = ko.observable(null);
    static portDragSuggestedField : ko.Observable<Field> = ko.observable(null);
    static matchingPortList : {field:Field,node:Node}[] = []
    static portMatchCloseEnough :ko.Observable<boolean> = ko.observable(false);

    //node drag handler globals
    static NodeParentRadiusPreDrag : number = null;
    static nodeDragElement : any = null
    static nodeDragNode : Node = null
    static dragStartPosition : any = null
    static dragCurrentPosition : any = null
    static dragSelectionHandled : any = ko.observable(true)
    static dragSelectionDoubleClick :boolean = false;

    //drag selection region globals
    static altSelect : boolean = false;
    static shiftSelect : boolean = false;
    static isDraggingSelectionRegion :boolean = false;
    static selectionRegionStart = {x:0, y:0};
    static selectionRegionEnd = {x:0, y:0};

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
        const eagle : Eagle = Eagle.getInstance();
        
        //calculating the minimum port distance as an angle. we save this min distance as a pixel distance between ports
        const minimumPortDistance:number = Number(Math.asin(GraphConfig.PORT_MINIMUM_DISTANCE/node.getRadius()).toFixed(6))
        
        const connectedFields : {angle:number, field:Field,mode:string}[] = []
        const danglingPorts : {field:Field, mode:string}[] = []
        const nodeRadius = node.getRadius()

        //building a list of connected and not connected ports on the node in question
        node.getFields().forEach(function(field){

            //making sure the field we are looking at is a port
            if(!field.isInputPort() && !field.isOutputPort()){
                return
            }
            
            console.log(node.getName(), field.getDisplayText())

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
                            return
                        }else if(connectedFields.length === i){
                            connectedFields.push({angle:field.getInputAngle(),field:field,mode:'input'})
                            return
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
                            return
                        }else if(connectedFields.length === i){
                            connectedFields.push({angle:field.getOutputAngle(),field:field,mode:'output'})
                            return
                        }
                    }
                }
            }
            
            //otherwise adding to dangling ports list
            if(!field.getInputConnected() && field.isInputPort()){
                danglingPorts.push({field:field,mode:'input'})
            }

            if(!field.getOutputConnected() && field.isOutputPort()){
                danglingPorts.push({field:field,mode:'output'})
            }
        })
        console.log(node.getName(), 'arrays before', connectedFields, danglingPorts)

        //spacing out the connected ports
        let i = 0
        console.log('min port distance = ',minimumPortDistance, 'array length= ',connectedFields.length)
        for(const connectedField of connectedFields){
            console.log(i)
            if(i != 0){
                console.log(connectedField.angle,connectedField.angle-minimumPortDistance,connectedFields[i-1].angle)
                if(connectedField.angle - minimumPortDistance< connectedFields[i-1].angle || connectedField.angle<connectedFields[i-1].angle){
                    connectedField.angle = connectedFields[i-1].angle+minimumPortDistance
                }
            }

            //setting the spaced out connected ports' positions with the organised and spaced out ones
            let portPosition
            if (connectedField.mode === 'input'){
                portPosition = GraphRenderer.calculatePortPos(connectedField.angle, nodeRadius, nodeRadius)      
                //a little 1px reduction is needed to center ports for some reason
                if(!node.isBranch()){
                    portPosition = {x:portPosition.x-1,y:portPosition.y-1}
                }  

                connectedField.field.setInputPosition(portPosition.x, portPosition.y);
            } 
            if (connectedField.mode === 'output'){
                portPosition = GraphRenderer.calculatePortPos(connectedField.angle, nodeRadius, nodeRadius)

                //a little 1px reduction is needed to center ports for some reason
                if(!node.isBranch()){
                    portPosition = {x:portPosition.x-1,y:portPosition.y-1}
                }

                connectedField.field.setOutputPosition(portPosition.x, portPosition.y);
            }

            i++
        }
        console.log(node.getName(), 'arrays after', connectedFields, danglingPorts)
                
    }

    static findClosestMatchingAngle (node:Node, angle:number, minPortDistance:number,field:Field,mode:string) : number {
        let result = 0
        let minAngle 
        let maxAngle

        let currentAngle = angle
        let noMatch = true
        let cicles = 0

        //checking max angle
        while(noMatch && cicles<10){
            const collidingPortAngle:number = GraphRenderer.checkForPortUsingAngle(node,currentAngle,minPortDistance, field,mode)
            if(collidingPortAngle === null){
                maxAngle = currentAngle //weve found our closest gap when adding to our angle
                noMatch = false
            }else{
                //if the colliding angle is not 0, that means the checkForPortUsingAngle function has found and returned the angle of a port we are colliding with
                //we will use this colliding port angle and add the minimum port distance as well as a little extra to prevent math errors when comparing
                currentAngle = collidingPortAngle + minPortDistance + 0.01
                
                if(currentAngle<0){
                    currentAngle = 2*Math.PI - Math.abs(currentAngle)
                }

                cicles++
            }
        }
        
        //resetting runtime vars
        noMatch = true
        cicles = 0
        currentAngle = angle

        //checking min angle
        while(noMatch && cicles<10){
            const collidingPortAngle:number = GraphRenderer.checkForPortUsingAngle(node,currentAngle,minPortDistance, field,mode)
            if(collidingPortAngle === null){
                minAngle = currentAngle //weve found our closest gap when adding to our angle
                noMatch = false
            }else{
                //if the colliding angle is not 0, that means the checkForPortUsingAngle function has found and returned the angle of a port we are colliding with
                //we will use this colliding port angle and subtract the minimum port distance as well as a little extra to prevent math errors when comparing
                currentAngle = collidingPortAngle - minPortDistance - 0.01
                
                if(currentAngle<0){
                    currentAngle = 2*Math.PI - Math.abs(currentAngle)
                }

                cicles++
            }
        }

        //maxing sure min and max angles are on the same side of the 0 point eg. if max angle is 0.2 and min angle is 5.8 we need to convert the min angle to be a negative number in order to compare them by subtracting 2*PI
        if(minAngle + minPortDistance> 2*Math.PI && angle - minPortDistance < 0){
            minAngle =  minAngle - 2*Math.PI
        }
        if(maxAngle - minPortDistance < 0 && angle + minPortDistance > 2*Math.PI){
            maxAngle = 2*Math.PI - maxAngle
        }
        
        //checking if the min or max angle is closer to the port's preferred location
        if(Math.abs(minAngle-angle)>Math.abs(maxAngle-angle)){
            result = maxAngle
        }else{
            result = minAngle
        }
        
        //making sure the angle is within the 0 - 2*PI range
        if(minAngle<0){
            minAngle = 2*Math.PI - Math.abs(minAngle)
        }
        if(maxAngle>2*Math.PI){
            maxAngle = maxAngle - 2*Math.PI 
        }
        
        return result
    }

    static checkForPortUsingAngle (node:Node, angle:number, minPortDistance:number, activeField:Field,mode:string) : number {
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
                    //this is the same exact port, dont compare!
                }else{
                    if(fieldAngle-angle > -minPortDistance && fieldAngle-angle < minPortDistance || field.getOutputAngle()-angle > -minPortDistance && field.getOutputAngle()-angle < minPortDistance){
                        //we have found a port that is within the minimum port dinstance, return the angle of the port we are colliding with
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
                    //this is the same exact port, dont compare!
                }else{
                    if(fieldAngle-angle > -minPortDistance && fieldAngle-angle < minPortDistance || field.getInputAngle()-angle > -minPortDistance && field.getInputAngle()-angle < minPortDistance){
                        //we have found a port that is within the minimum port dinstance, return the angle of the port we are colliding with
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

        // determine all the adjacent nodes
        // TODO: earlier abort if field is null
        const adjacentNodes: Node[] = [];

        if (input){
            for(const edge of eagle.logicalGraph().getEdges()){
                if(field != null && field.getId()===edge.getDestPortId()){
                    const adjacentNode: Node = eagle.logicalGraph().findNodeByKeyQuiet(edge.getSrcNodeKey());
                    adjacentNodes.push(adjacentNode);
                    continue;
                }
            }
        } else {
            for(const edge of eagle.logicalGraph().getEdges()){
                if(field.getId()===edge.getSrcPortId()){
                    const adjacentNode: Node = eagle.logicalGraph().findNodeByKeyQuiet(edge.getDestNodeKey());
                    adjacentNodes.push(adjacentNode);
                    continue;
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

    static createBezier(edge:Edge, srcNodeRadius:number, destNodeRadius:number, srcNodePosition: {x: number, y: number}, destNodePosition: {x: number, y: number}, srcField: Field, destField: Field, sourcePortIsInput: boolean) : string {

        //since the svg parent is translated -50% to center our working area, we need to add half of its width to correct the positions
        // TODO: remove magic numbers here (5000)
        destNodePosition={x:destNodePosition.x+5000,y:destNodePosition.y+5000}
        srcNodePosition={x:srcNodePosition.x+5000,y:srcNodePosition.y+5000}

        // determine if the edge falls below a certain length threshold
        const edgeLength = Math.sqrt((destNodePosition.x - srcNodePosition.x)**2 + (destNodePosition.y - srcNodePosition.y)**2);

        //determining if the edge's length is below a certain threshhold. if it is we will draw the edge straight and remove the arrow
        const isShortEdge: boolean = edgeLength < srcNodeRadius * GraphConfig.SWITCH_TO_STRAIGHT_EDGE_MULTIPLIER;

        if (edge !== null){
            edge.setIsShortEdge(isShortEdge)
        }

        // calculate the length from the src and dest nodes at which the control points will be placed
        const lengthToControlPoints = edgeLength * 0.4;

        // calculate the angle for the src and dest ports
        const srcPortAngle: number = GraphRenderer.calculateConnectionAngle(srcNodePosition, destNodePosition);
        const destPortAngle: number = srcPortAngle + Math.PI;

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


        //the edge parameter is null if we are rendering a comment edge and this is not needed
        if(edge != null){
            //we are hiding the arrows if the edge is too short
            if(edgeLength > GraphConfig.EDGE_DISTANCE_ARROW_VISIBILITY){
                //were adding the position and shape of the arrow to the edges
                const arrowPosx =  GraphRenderer.getCoordinateOnBezier(0.5,x1,c1x,c2x,x2)
                const arrowPosy =  GraphRenderer.getCoordinateOnBezier(0.5,y1,c1y,c2y,y2)

                //generating the points for the arrow polygon
                const P1x = arrowPosx+GraphConfig.EDGE_ARROW_SIZE
                const P1y = arrowPosy
                const P2x = arrowPosx-GraphConfig.EDGE_ARROW_SIZE
                const P2y = arrowPosy+GraphConfig.EDGE_ARROW_SIZE
                const P3x = arrowPosx-GraphConfig.EDGE_ARROW_SIZE
                const P3y = arrowPosy-GraphConfig.EDGE_ARROW_SIZE

                //we are calculating the angle the arrow should be pointing by getting two positions on either sider of the center of the bezier curve then calculating the angle 
                const  anglePos1x =  GraphRenderer.getCoordinateOnBezier(0.45,x1,c1x,c2x,x2)
                const  anglePos1y =  GraphRenderer.getCoordinateOnBezier(0.45,y1,c1y,c2y,y2)
                const  anglePos2x =  GraphRenderer.getCoordinateOnBezier(0.55,x1,c1x,c2x,x2)
                const  anglePos2y =  GraphRenderer.getCoordinateOnBezier(0.55,y1,c1y,c2y,y2)

                const arrowAngle = GraphRenderer.calculateConnectionAngle({x:anglePos1x,y:anglePos1y}, {x:anglePos2x,y:anglePos2y})

                $('#'+edge.getId() +" polygon").show()
                $('#'+edge.getId() +" polygon").attr('points', P1x +','+P1y+', '+ P2x +','+P2y +', '+ P3x +','+P3y)
                // the rotate argument takes three inputs, (angle in deg, x , y coordinates for the midpoint to rotate around)
                $('#'+edge.getId() +" polygon").attr({'transform':'rotate('+arrowAngle*(180/Math.PI)*-1+','+arrowPosx+','+arrowPosy +')'});
            }else{
                $('#'+edge.getId() +" polygon").hide()
            }
        }


        return "M " + x1 + " " + y1 + " C " + c1x + " " + c1y + ", " + c2x + " " + c2y + ", " + x2 + " " + y2;
        // return "M " + x1 + " " + y1 +  ", " + x2 + " " + y2; //straighten edges
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
        if(srcNode===null||destNode===null){
            return ''
        }
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

    static getPathDraggingEdge : ko.PureComputed<string> = ko.pureComputed(() => {
        if (GraphRenderer.portDragSourceNode() === null){
            console.warn('GraphRenderer.getPathDraggingEdge(): no source node detected')
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

        return GraphRenderer.createBezier(null, srcNodeRadius, destNodeRadius, {x:srcX, y:srcY}, {x:destX, y:destY}, srcField, destField, GraphRenderer.portDragSourcePortIsInput);
    }, this);

    static getPathSuggestedEdge : ko.PureComputed<string> = ko.pureComputed(() => {
        if (GraphRenderer.portDragSuggestedNode() === null){
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

        return GraphRenderer.createBezier(null, srcNodeRadius, destNodeRadius, {x:srcX, y:srcY}, {x:destX, y:destY}, srcField, destField, GraphRenderer.portDragSourcePortIsInput);
    }, this);

    static _getPath(edge:Edge, srcNode: Node, destNode: Node, srcField: Field, destField: Field, eagle: Eagle) : string {
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

        return GraphRenderer.createBezier(edge, srcNodeRadius, destNodeRadius,{x:srcX, y:srcY}, {x:destX, y:destY}, srcField, destField, false);
    }

    static scrollZoom = (eagle: Eagle, event: JQueryEventObject) : void => {
        const e: WheelEvent = <WheelEvent>event.originalEvent;

        const wheelDelta = e.deltaY;
        const zoomDivisor = Setting.findValue(Setting.GRAPH_ZOOM_DIVISOR);

        const xsb = this.SCREEN_TO_GRAPH_POSITION_X(null)
        const ysb = this.SCREEN_TO_GRAPH_POSITION_Y(null)

        eagle.globalScale(eagle.globalScale()*(1-(wheelDelta/zoomDivisor)));

        if(eagle.globalScale()<0){
            //prevent negative scale which results in an inverted graph
            eagle.globalScale(Math.abs(eagle.globalScale()))
        }

        const xsa = this.SCREEN_TO_GRAPH_POSITION_X(null)
        const ysa = this.SCREEN_TO_GRAPH_POSITION_Y(null)

        const movex = xsa-xsb
        const movey = ysa-ysb

        eagle.globalOffsetX(eagle.globalOffsetX()+movex)
        eagle.globalOffsetY(eagle.globalOffsetY()+movey)
    }

    static startDrag = (node: Node, event: MouseEvent) : void => {
        const eagle = Eagle.getInstance();
        //resetting the shift event
        GraphRenderer.dragSelectionHandled(false)
        //these  two are needed to keep track of these modifiers for the mouse move and release event
        GraphRenderer.altSelect = event.altKey
        GraphRenderer.shiftSelect = event.shiftKey

        if(node === null || event.which === 2){
            //if no node is selected or we are dragging using middle mouse, we are dragging the background
            GraphRenderer.dragSelectionHandled(true)
            eagle.isDragging(true);
        } else if(!node.isEmbedded()){
           //embedded nodes, aka input and output applications of constructs, cant be dragged
            eagle.isDragging(true);
            eagle.draggingNode(node);
            GraphRenderer.nodeDragElement = event.target
            GraphRenderer.nodeDragNode = node
            GraphRenderer.dragStartPosition = {x:event.pageX,y:event.pageY}
            GraphRenderer.dragCurrentPosition = {x:event.pageX,y:event.pageY}
            
            if(node.getParentKey() != null){
                const parentNode = eagle.logicalGraph().findNodeByKeyQuiet(node.getParentKey())
                $('#'+parentNode.getId()).removeClass('transition')
                GraphRenderer.NodeParentRadiusPreDrag = parentNode.getRadius()
            }
        }

        //select handlers
        if(node !== null && event.which != 2 && !event.shiftKey){

            // check if shift key is down, if so, add or remove selected node to/from current selection | keycode 2 is the middle mouse button
            if (node !== null && event.shiftKey && !event.altKey){
                GraphRenderer.dragSelectionHandled(true)
                eagle.editSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Graph);
            } else if(!eagle.objectIsSelected(node)) {
                eagle.setSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Graph);
            }

            //check for alt clicking, if so, add the target node and its children to the selection
            if(event.altKey&&node.isGroup()||GraphRenderer.dragSelectionDoubleClick&&node.isGroup()){
                GraphRenderer.selectNodeAndChildren(node,this.shiftSelect)
            }
        }else{
            if(event.shiftKey){
                //drag selection region handler
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
            }else{
                //if node is null, the empty canvas has been clicked. clear the selection
                eagle.setSelection(Eagle.RightWindowMode.Hierarchy, null, Eagle.FileType.Graph);

            }
        }

        //this is the timeout for the double click that is used to select the children of constructs
        GraphRenderer.dragSelectionDoubleClick = true
        setTimeout(function () {
            GraphRenderer.dragSelectionDoubleClick = false
        }, 200)
    }

    static mouseMove = (eagle: Eagle, event: JQueryEventObject) : void => {
        const mouseEvent: MouseEvent = <MouseEvent>event.originalEvent;
        GraphRenderer.dragCurrentPosition = {x:event.pageX,y:event.pageY}
        if (eagle.isDragging()){
            if (eagle.draggingNode() !== null && !GraphRenderer.isDraggingSelectionRegion ){
                const node:Node = eagle.draggingNode()
                $('.node.transition').removeClass('transition')

                // remember node parent from before things change
                const oldParent: Node = eagle.logicalGraph().findNodeByKeyQuiet(node.getParentKey());

                // move node
                eagle.selectedObjects().forEach(function(obj){
                    if(obj instanceof Node){
                        obj.changePosition(mouseEvent.movementX/eagle.globalScale(), mouseEvent.movementY/eagle.globalScale());
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
                if (oldParent !== null){
                    // moved out of a construct
                    $('#'+oldParent.getId()).addClass('transition')
                }
                // recalculate size of parent (or oldParent)
                if (parent === null){
                    
                } else {
                    // moved into or within a construct
                    $('#'+parent.getId()).removeClass('transition')
                }

            } else if(GraphRenderer.isDraggingSelectionRegion){
                GraphRenderer.selectionRegionEnd = {x:GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(null), y:this.SCREEN_TO_GRAPH_POSITION_Y(null)}
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

            }else{
                // move background
                eagle.globalOffsetX(eagle.globalOffsetX() + mouseEvent.movementX/eagle.globalScale());
                eagle.globalOffsetY(eagle.globalOffsetY() + mouseEvent.movementY/eagle.globalScale());
            }
        }

        if(GraphRenderer.draggingPort){
            GraphRenderer.portDragging(event)
        }
        
    }

    static endDrag = (node: Node) : void => {
        const eagle = Eagle.getInstance();
        
        // if we dragged a selection region
        if (GraphRenderer.isDraggingSelectionRegion){
            const nodes: Node[] = GraphRenderer.findNodesInRegion(GraphRenderer.selectionRegionStart.x, GraphRenderer.selectionRegionEnd.x, GraphRenderer.selectionRegionStart.y, GraphRenderer.selectionRegionEnd.y);

            //checking if there was no drag distance, if so we are clicking a single object and we will toggle its seletion
            if(Math.abs(GraphRenderer.selectionRegionStart.x-GraphRenderer.selectionRegionEnd.x)+Math.abs(GraphRenderer.selectionRegionStart.y - GraphRenderer.selectionRegionEnd.y)<3){
                if(GraphRenderer.altSelect){
                    GraphRenderer.selectNodeAndChildren(node,this.shiftSelect)
                }
                eagle.editSelection(Eagle.RightWindowMode.Inspector, node,Eagle.FileType.Graph);
            }else{
                const edges: Edge[] = GraphRenderer.findEdgesContainedByNodes(eagle.logicalGraph().getEdges(), nodes);
                const objects: (Node | Edge)[] = [];
    
                // only add those objects which are not already selected
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
    
                objects.forEach(function(element){
                    eagle.editSelection(Eagle.RightWindowMode.Hierarchy, element, Eagle.FileType.Graph )
                })
            }

            GraphRenderer.selectionRegionStart.x = 0;
            GraphRenderer.selectionRegionStart.y = 0;
            GraphRenderer.selectionRegionEnd.x = 0;
            GraphRenderer.selectionRegionEnd.y = 0;

            // finish selecting a region
            GraphRenderer.isDraggingSelectionRegion = false;

            //hide the selection rectangle
            $('#selectionRectangle').hide()

            // necessary to make un-collapsed nodes show up
            eagle.logicalGraph.valueHasMutated();
        }

        // if we dragged a node
        if (!GraphRenderer.isDraggingSelectionRegion){
            // check if moving whole graph, or just a single node
            if (node !== null){
                eagle.undo().pushSnapshot(eagle, "Move '" + node.getName() + "' node");
            }
        }

        GraphRenderer.dragSelectionHandled(true)
        eagle.isDragging(false);
        eagle.draggingNode(null)
        
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

    static selectNodeAndChildren(node:Node,addative:boolean) : void {
        const eagle = Eagle.getInstance();
        GraphRenderer.dragSelectionHandled(true)
                //if shift is not clicked, we first clear the selection
                if(!addative){
                    eagle.setSelection(Eagle.RightWindowMode.Inspector, null, Eagle.FileType.Graph);
                    eagle.editSelection(Eagle.RightWindowMode.Inspector, node, Eagle.FileType.Graph);
                }

                //getting all children, including children of child constructs etc..
                let childIsConstruct = true
                const constructs : Node[] = [node];
                
                while(childIsConstruct){
                    let constructFound = false
                    let i = -1
                    constructs.forEach(function(construct){
                        i++
                        eagle.logicalGraph().getNodes().forEach(function(obj){
                            if(obj.getParentKey()===construct.getKey()){
                                eagle.editSelection(Eagle.RightWindowMode.Inspector, obj, Eagle.FileType.Graph);
    
                                if(obj.isGroup()){
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

    static getEdges(graph: LogicalGraph, showDataNodes: boolean): Edge[]{
        if (showDataNodes){
            return graph.getEdges();
        } else {
            //return [graph.getEdges()[0]];
            const edges: Edge[] = [];

            for (const edge of graph.getEdges()){
                let srcHasConnectedInput: boolean = false;
                let destHasConnectedOutput: boolean = false;

                for (const e of graph.getEdges()){
                    if (e.getDestNodeKey() === edge.getSrcNodeKey()){
                        srcHasConnectedInput = true;
                    }
                    if (e.getSrcNodeKey() === edge.getDestNodeKey()){
                        destHasConnectedOutput = true;
                    }
                }

                const srcIsDataNode: boolean = GraphRenderer.findNodeWithKey(edge.getSrcNodeKey(), graph.getNodes()).isData();
                const destIsDataNode: boolean = GraphRenderer.findNodeWithKey(edge.getDestNodeKey(), graph.getNodes()).isData();
                //console.log("edge", edge.getId(), "srcIsDataNode", srcIsDataNode, "srcHasConnectedInput", srcHasConnectedInput, "destIsDataNode", destIsDataNode, "destHasConnectedOutput", destHasConnectedOutput);

                if (destIsDataNode){
                    if (!destHasConnectedOutput){
                        // draw edge as normal
                        edges.push(edge);
                    }
                    continue;
                }

                if (srcIsDataNode){
                    if (srcHasConnectedInput){
                        // build a new edge
                        const newSrc = GraphRenderer.findInputToDataNode(graph.getEdges(), edge.getSrcNodeKey());
                        edges.push(new Edge(newSrc.nodeKey, newSrc.portId, edge.getDestNodeKey(), edge.getDestPortId(), edge.getDataType(), edge.isLoopAware(), edge.isClosesLoop(), false));
                    } else {
                        // draw edge as normal
                        edges.push(edge);
                    }
                }
            }

            return edges;
        }
    }

    static findEdgesContainedByNodes(edges: Edge[], nodes: Node[]): Edge[]{
        const result: Edge[] = [];

        for (const edge of edges){
            const srcKey = edge.getSrcNodeKey();
            const destKey = edge.getDestNodeKey();
            let srcFound = false;
            let destFound = false;

            for (const node of nodes){
                if ((node.getKey() === srcKey) ||
                    (node.hasInputApplication() && node.getInputApplication().getKey() === srcKey) ||
                    (node.hasOutputApplication() && node.getOutputApplication().getKey() === srcKey)){
                    srcFound = true;
                }

                if ((node.getKey() === destKey) ||
                    (node.hasInputApplication() && node.getInputApplication().getKey() === destKey) ||
                    (node.hasOutputApplication() && node.getOutputApplication().getKey() === destKey)){
                    destFound = true;
                }
            }

            if (srcFound && destFound){
                result.push(edge);
            }
        }

        return result;
    }


    static findInputToDataNode(edges: Edge[], nodeKey: number) : {nodeKey:number, portId: string}{
        for (const edge of edges){
            if (edge.getDestNodeKey() === nodeKey){
                return {
                    nodeKey: edge.getSrcNodeKey(),
                    portId: edge.getSrcPortId()
                };
            }
        }

        return null;
    }

    static centerConstructs = (construct:Node, graphNodes:Node[]) :void => {
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

        constructsList.forEach(function(x){
            if(x.getParentKey()===null){
                let finished = false // while there are child construct found in this construct nest group

                findConstructId = x.getKey()
                orderedConstructList.unshift(x)
                while(!finished){
                    let found = false
                    for(const entry of constructsList){
                        if(entry.getParentKey() === findConstructId){
                            orderedConstructList.unshift(entry)
                            findConstructId = entry.getKey()
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

    static centerConstruct = (construct:Node,graphNodes:Node[]) : void => {
        let childCount = 0

        let minX : number = Number.MAX_VALUE;
        let minY : number = Number.MAX_VALUE;
        let maxX : number = -Number.MAX_VALUE;
        let maxY : number = -Number.MAX_VALUE;
        for (const node of graphNodes){
            
            if (!node.isEmbedded() && node.getParentKey() === construct.getKey()){
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

        // determine the centroid of the contruct
        const centroidX = minX + ((maxX - minX) / 2);
        const centroidY = minY + ((maxY - minY) / 2);

        construct.setPosition(centroidX,centroidY)
        GraphRenderer.resizeConstruct(construct)
    }

    static translateLegacyGraph = () : void =>{
        const eagle = Eagle.getInstance();
        //we are moving each node by half its radius to counter the fact that the new graph renderer treats the node's visual center as node position, previously the node position was in its top left.
        if(GraphRenderer.legacyGraph){
            //we need to calculate the construct radius in relation to it's children
            eagle.logicalGraph().getNodes().forEach(function(node){
                if(!node.isGroup()&&!node.isEmbedded()){
                    node.setPosition(node.getPosition().x+node.getRadius()/2,node.getPosition().y + node.getRadius()/2,false)
                }
            })
            GraphRenderer.centerConstructs(null,eagle.logicalGraph().getNodes())
        }
        GraphRenderer.legacyGraph = false
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
        if(construct.isGroup()){
            construct.setRadius(maxDistance);
        }
    }

    static updateMousePos = (): void => {
        // grab and convert mouse position to graph coordinates
        const divOffset = $('#logicalGraph').offset();
        const mouseX = (<any>event).pageX - divOffset.left;
        const mouseY = (<any>event).pageY - divOffset.top;
        GraphRenderer.mousePosX(GraphRenderer.SCREEN_TO_GRAPH_POSITION_X(null));
        GraphRenderer.mousePosY(GraphRenderer.SCREEN_TO_GRAPH_POSITION_Y(null));
    }

    static portDragStart = (port:Field, usage:string) : void => {
        const eagle = Eagle.getInstance();

        GraphRenderer.updateMousePos();

        //prevents moving the node when dragging the port
        event.stopPropagation();
        
        //preparing necessary port info
        GraphRenderer.draggingPort = true
        GraphRenderer.portDragSourceNode(eagle.logicalGraph().findNodeByKey(port.getNodeKey()));
        GraphRenderer.portDragSourcePort(port);
        GraphRenderer.portDragSourcePortIsInput = usage === 'input';      
        GraphRenderer.renderDraggingPortEdge(true);

        //setting up the port event listeners
        $('#logicalGraphParent').on('mouseup.portDrag',function(){GraphRenderer.portDragEnd()})
        $('.node .body').on('mouseup.portDrag',function(){GraphRenderer.portDragEnd()})

        
        // check for nearby nodes
        const matchingNodes = GraphRenderer.findMatchingNodes(GraphRenderer.portDragSourceNode().getKey());

        // check for nearest matching port in the nearby nodes
        const matchingPorts = GraphRenderer.findMatchingPorts(GraphRenderer.mousePosX(), GraphRenderer.mousePosY(), matchingNodes, GraphRenderer.portDragSourceNode(), GraphRenderer.portDragSourcePort(), GraphRenderer.portDragSourcePortIsInput);
        GraphRenderer.matchingPortList = matchingPorts
    }

    static portDragging = (event:any) : void => {
        GraphRenderer.updateMousePos();

        // check for nearest matching port in the nearby nodes
        const match: {node: Node, field: Field} = GraphRenderer.findNearestMatchingPort(GraphRenderer.mousePosX(), GraphRenderer.mousePosY(), GraphRenderer.portDragSourceNode(), GraphRenderer.portDragSourcePort(), GraphRenderer.portDragSourcePortIsInput);

        if (match.field !== null){
            GraphRenderer.portDragSuggestedNode(match.node);
            GraphRenderer.portDragSuggestedField(match.field);
        } else {
            GraphRenderer.portDragSuggestedNode(null);
            GraphRenderer.portDragSuggestedField(null);
        }
    }

    static portDragEnd = () : void => {
        const eagle = Eagle.getInstance();

        GraphRenderer.draggingPort = false;
        // cleaning up the port drag event listeners
        $('#logicalGraphParent').off('mouseup.portDrag')
        $('.node .body').off('mouseup.portDrag')

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

            this.createEdge(srcNode, srcPort, destNode, destPort);

            // we can stop rendering the dragging edge
            GraphRenderer.renderDraggingPortEdge(false);
            GraphRenderer.clearEdgeVars();
        } else {
            if (GraphRenderer.destinationPort === null){
                this.showUserNodeSelectionContextMenu();
            } else {
                // connect to destination port
                const srcNode: Node = GraphRenderer.portDragSourceNode();
                const srcPort: Field = GraphRenderer.portDragSourcePort();
                const destNode: Node = GraphRenderer.destinationNode;
                const destPort: Field = GraphRenderer.destinationPort;

                this.createEdge(srcNode, srcPort, destNode, destPort);

                // we can stop rendering the dragging edge
                GraphRenderer.renderDraggingPortEdge(false);
                GraphRenderer.clearEdgeVars();
            }
        }

        //resetting some global cached variables
        GraphRenderer.matchingPortList.forEach(function(x){
            x.field.setPeek(false)
        })

        GraphRenderer.matchingPortList = []
        eagle.logicalGraph.valueHasMutated();
    }

    static createEdge(srcNode: Node, srcPort: Field, destNode: Node, destPort: Field){
        const eagle = Eagle.getInstance();

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
        if ((Setting.findValue(Setting.ALLOW_INVALID_EDGES) && linkValid === Eagle.LinkValid.Invalid) || linkValid === Eagle.LinkValid.Valid || linkValid === Eagle.LinkValid.Warning){
            if (linkValid === Eagle.LinkValid.Warning){
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
        // no destination, ask user to choose a new node
        const dataEligible: boolean = GraphRenderer.portDragSourceNode().getCategoryType() !== Category.Type.Data;

        // check if source port is a 'dummy' port
        // if so, consider all components as eligible, to ease the creation of new graphs
        const sourcePortIsDummy: boolean = GraphRenderer.portDragSourcePort().getDisplayText() === Daliuge.FieldName.DUMMY;

        let eligibleComponents: Node[];

        if (!sourcePortIsDummy && Setting.findValue(Setting.FILTER_NODE_SUGGESTIONS)){
            // getting matches from both the graph and the palettes list
            eligibleComponents = Utils.getComponentsWithMatchingPort('palette graph', !GraphRenderer.portDragSourcePortIsInput, GraphRenderer.portDragSourcePort().getType(), dataEligible);
        } else {
            // get all nodes with at least one port with opposite "direction" (input/output) from the source node
            eligibleComponents = [];

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
        }
        
        // check we found at least one eligible component
        if (eligibleComponents.length === 0){
            Utils.showNotification("Not Found", "No eligible components found for connection to port of this type (" + GraphRenderer.portDragSourcePort().getType() + ")", "info");

            // stop rendering the dragging edge
            GraphRenderer.renderDraggingPortEdge(false);
        } else {

            // get list of strings from list of eligible components
            const eligibleComponentNames : Node[] = [];
            for (const c of eligibleComponents){
                eligibleComponentNames.push(c);
            }

            // NOTE: create copy in right click ts because we are using the right click menus to handle the node selection
            RightClick.edgeDropSrcNode = GraphRenderer.portDragSourceNode();
            RightClick.edgeDropSrcPort = GraphRenderer.portDragSourcePort();
            RightClick.edgeDropSrcIsInput = GraphRenderer.portDragSourcePortIsInput;

            Eagle.selectedRightClickPosition = {x:GraphRenderer.mousePosX(), y:GraphRenderer.mousePosY()};

            RightClick.edgeDropCreateNode(eligibleComponentNames, null)
        }
    }

    static showPort(node: Node, field: Field) :boolean {
        const eagle = Eagle.getInstance();
        if(!GraphRenderer.dragSelectionHandled()){
            return false
        }else if(node.isPeek()){
            return true
        }else if(eagle.objectIsSelected(node)){
            return true
        }else if(field.isPeek()){
            return true
        }else{
            return false
        }
    }
    
    static SCREEN_TO_GRAPH_POSITION_X(x:number) : number {
        const eagle = Eagle.getInstance();
        if(x===null){
            x = GraphRenderer.dragCurrentPosition.x
        }
        return x/eagle.globalScale() - eagle.globalOffsetX();
    }

    static SCREEN_TO_GRAPH_POSITION_Y(y:number) : number {
        const eagle = Eagle.getInstance();
        if(y===null){
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
        // return (x * eagle.globalScale()) + eagle.globalOffsetX() ;
        return(x + eagle.globalOffsetX()) * eagle.globalScale()
        // return (x + eagle.globalOffsetX())/eagle.globalScale();
    }

    static GRAPH_TO_SCREEN_POSITION_Y(y: number) : number {
        const eagle = Eagle.getInstance();
        // return (y * eagle.globalScale()) + eagle.globalOffsetY();
        // return (y + eagle.globalOffsetY())/eagle.globalScale();
        return (y+eagle.globalOffsetY())*eagle.globalScale()+83.77
    }

    static findMatchingNodes(sourceNodeKey: number): Node[]{
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
            // const distance = Utils.positionToNodeDistance(positionX, positionY, nodeData[i]);

            // if (distance <= range){
                //console.log("distance to", nodeData[i].getName(), nodeData[i].getKey(), "=", distance);
                result.push(nodeData[i]);
            // }
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

    
    static findMatchingPorts(positionX: number, positionY: number, nearbyNodes: Node[], sourceNode: Node, sourcePort: Field, sourcePortIsInput: boolean) : {node: Node, field: Field}[] {
        //console.log("findNearestMatchingPort(), sourcePortIsInput", sourcePortIsInput);
        const eagle = Eagle.getInstance();
        const result :{field:Field, node:Node}[]= []
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

                //this is needed for embedded apps, as the node variable is still the construct
                const realNode = eagle.logicalGraph().findNodeByKeyQuiet(port.getNodeKey())
                
                result.push({field:port,node:realNode})
                port.setPeek(true)
            }
        }

        return result
    }
    
    static findNearestMatchingPort(positionX: number, positionY: number, sourceNode: Node, sourcePort: Field, sourcePortIsInput: boolean) : {node: Node, field: Field} {
        let minDistance: number = Number.MAX_SAFE_INTEGER;
        let minNode: Node = null;
        let minPort: Field = null;
        GraphRenderer.portMatchCloseEnough(false)

        const portList = GraphRenderer.matchingPortList
        for (const x of portList){
            const port = x.field
            const node = x.node

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
            portX = node.getPosition().x + portX
            portY = node.getPosition().y + portY

            // get distance to port
            const distance = Math.sqrt( Math.pow(portX - positionX, 2) + Math.pow(portY - positionY, 2) );

            if(distance > GraphConfig.NODE_SUGGESTION_RADIUS){
                continue
            }

            // remember this port if it the best so far
            if (distance < minDistance){
                minPort = port;
                minNode = node;
                minDistance = distance;
            }
        }
        if (minDistance<GraphConfig.NODE_SUGGESTION_SNAP_RADIUS){
            GraphRenderer.portMatchCloseEnough(true)
        }

        return {node: minNode, field: minPort};
    }
    
    static mouseEnterPort(port : Field) : void {
        if (!GraphRenderer.draggingPort){
            return;
        }

        const eagle = Eagle.getInstance();
        GraphRenderer.destinationPort = port;
        GraphRenderer.destinationNode = eagle.logicalGraph().findNodeByKey(port.getNodeKey());

        const isValid = Edge.isValid(eagle, null, GraphRenderer.portDragSourceNode().getKey(), GraphRenderer.portDragSourcePort().getId(), GraphRenderer.destinationNode.getKey(), GraphRenderer.destinationPort.getId(), GraphRenderer.portDragSourcePort().getType(), false, false, false, false, {errors:[], warnings:[]});
        GraphRenderer.isDraggingPortValid(isValid);
    }

    static mouseLeavePort(port : Field) : void {
        GraphRenderer.destinationPort = null;
        GraphRenderer.destinationNode = null;

        GraphRenderer.isDraggingPortValid(Eagle.LinkValid.Unknown);
    }

    static draggingEdgeGetStrokeColor: ko.PureComputed<string> = ko.pureComputed(() => {
        switch (GraphRenderer.isDraggingPortValid()){
            case Eagle.LinkValid.Unknown:
                return "black";
            case Eagle.LinkValid.Impossible:
            case Eagle.LinkValid.Invalid:
                return GraphConfig.getColor("edgeInvalid");
            case Eagle.LinkValid.Warning:
                return GraphConfig.getColor("edgeWarning");
            case Eagle.LinkValid.Valid:
                return GraphConfig.getColor("edgeValid");
        }
    }, this);

    static suggestedEdgeGetStrokeColor() : string {
        if(GraphRenderer.portMatchCloseEnough()){
            return GraphConfig.getColor("edgeAutoComplete");
        }else{
            return GraphConfig.getColor("edgeAutoCompleteSuggestion");
        }
    }

    static draggingEdgeGetStrokeType() : string {
        return '';
    }

    static suggestedEdgeGetStrokeType() : string {
        return '';
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
        GraphRenderer.portDragSourcePort(null)
        GraphRenderer.portDragSourceNode(null)
        GraphRenderer.portDragSourcePortIsInput = false
        GraphRenderer.destinationPort = null
        GraphRenderer.destinationNode = null
        GraphRenderer.portDragSuggestedNode(null)
        GraphRenderer.portDragSuggestedField(null)
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

    static clearPortPeek() : void {
        const eagle = Eagle.getInstance();
        eagle.logicalGraph().getNodes().forEach(function(node){
            if(node.isConstruct()){
                if(node.getInputApplication() != null){
                    node.getInputApplication().getFields().forEach(function(inputAppField){
                       inputAppField.setPeek(false) 
                    })
                }
                if(node.getOutputApplication() != null){
                    node.getOutputApplication().getFields().forEach(function(outputAppField){
                        outputAppField.setPeek(false) 
                    })
                }
            }

            node.getFields().forEach(function(field){
                field.setPeek(false)
            })  
        })  
    }

    static setPortPeekForEdge(edge:Edge, value:boolean) : void {
        const eagle = Eagle.getInstance();
        const inputPort = eagle.logicalGraph().findNodeByKeyQuiet(edge.getSrcNodeKey()).findFieldById(edge.getSrcPortId())
        const outputPort = eagle.logicalGraph().findNodeByKeyQuiet(edge.getDestNodeKey()).findFieldById(edge.getDestPortId())
        
        inputPort.setPeek(value)
        outputPort.setPeek(value)
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

        if (linkValid === Eagle.LinkValid.Invalid || linkValid === Eagle.LinkValid.Impossible){
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
