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
import { Daliuge } from './Daliuge';
import { Eagle } from './Eagle';
import { EagleConfig } from './EagleConfig';
import { Errors } from './Errors';
import { Field } from './Field';
import { Node } from './Node';
import { Utils } from './Utils';
import { LogicalGraph } from "./LogicalGraph";

export class Edge {
    private id: EdgeId;
    private srcNode: Node;
    private srcPort: Field;
    private destNode: Node;
    private destPort: Field;
    private loopAware : ko.Observable<boolean>; // indicates the user is aware that the components at either end of the edge may differ in multiplicity
    private closesLoop : ko.Observable<boolean>; // indicates that this is a special type of edge that can be drawn in eagle to specify the start/end of groups.
    private selectionRelative : boolean // indicates if the edge is either selected or attached to a selected node
    private isShortEdge : ko.Observable<boolean>;
    private issues : ko.ObservableArray<{issue:Errors.Issue, validity:Errors.Validity}> //keeps track of edge errors

    constructor(srcNode: Node, srcPort: Field, destNode: Node, destPort: Field, loopAware: boolean, closesLoop: boolean, selectionRelative : boolean){
        this.id = Utils.generateEdgeId();

        this.srcNode = srcNode;
        this.srcPort = srcPort;
        this.destNode = destNode;
        this.destPort = destPort;

        this.loopAware = ko.observable(loopAware);
        this.closesLoop = ko.observable(closesLoop);
        this.selectionRelative = selectionRelative;
        this.isShortEdge = ko.observable(false)
        this.issues = ko.observableArray([]);
    }

    getId = () : EdgeId => {
        return this.id;
    }

    setId = (id: EdgeId) : void => {
        this.id = id;
    }

    getSrcNode = () : Node => {
        return this.srcNode;
    }

    setSrcNode = (node: Node): void => {
        this.srcNode = node;
    }

    getSrcPort = () : Field => {
        return this.srcPort;
    }

    setSrcPort = (field: Field) : void => {
        this.srcPort = field;
    }

    getDestNode = () : Node => {
        return this.destNode;
    }

    setDestNode = (node: Node): void => {
        this.destNode = node;
    }

    getDestPort = () : Field => {
        return this.destPort;
    }

    setDestPort = (field: Field) : void => {
        this.destPort = field;
    }

    getSelectionRelative = () : boolean => {
        return this.selectionRelative;
    }

    isLoopAware = () : boolean => {
        return this.loopAware();
    }

    setLoopAware = (value : boolean) : void => {
        this.loopAware(value);
    }

    toggleLoopAware = () : void => {
        this.loopAware(!this.loopAware());
    }

    isClosesLoop = () : boolean => {
        return this.closesLoop();
    }

    setClosesLoop = (value : boolean) : void => {
        this.closesLoop(value);
    }

    toggleClosesLoop = () : void => {
        this.closesLoop(!this.closesLoop());
    }

    setSelectionRelative = (value : boolean) : void => {
        this.selectionRelative = value
    }

    toggleSelectionRelative = () : void => {
        this.selectionRelative = !this.selectionRelative;
    }

    setIsShortEdge = (value:boolean) : void => {
        this.isShortEdge(value)
    }

    getIsShortEdge = () : boolean => {
        return this.isShortEdge()
    }

    getArrowVisibility = () : string => {
        if (this.isShortEdge()){
            return 'hidden' 
        }else{
            return 'visible'
        }
    }

    isPath = () : boolean => {
        const srcPort = this.getSrcPort();
        const destPort = this.getDestPort();

        if(srcPort?.getEncoding() === Daliuge.Encoding.Path){
            return true
        }else if(destPort?.getEncoding() === Daliuge.Encoding.Path){
            return true
        }

        return false
    }

    clear = () : void => {
        this.id = null;
        this.srcNode = null;
        this.srcPort = null;
        this.destNode = null;
        this.destPort = null;
        this.loopAware(false);
        this.closesLoop(false);
        this.selectionRelative = false;
        this.isShortEdge(false);
        this.issues([]);
    }

    clone = () : Edge => {
        const result : Edge = new Edge(this.srcNode, this.srcPort, this.destNode, this.destPort, this.loopAware(), this.closesLoop(), this.selectionRelative);

        result.id = this.id;

        return result;
    }

    getErrorsWarnings = (): Errors.ErrorsWarnings => {
        const errorsWarnings : Errors.ErrorsWarnings = {warnings: [], errors: []};
        
        this.getIssues().forEach(function(error){
            if(error.validity === Errors.Validity.Error || error.validity === Errors.Validity.Unknown){
                errorsWarnings.errors.push(error.issue)
            }else{
                errorsWarnings.warnings.push(error.issue)
            }
        })

        return errorsWarnings;
    }

    getIssues = () : {issue:Errors.Issue, validity:Errors.Validity}[] => {
        return this.issues();
    }

    getIconColor : ko.PureComputed<string> = ko.pureComputed(() => {
        const errorsWarnings = this.getErrorsWarnings()

        if(errorsWarnings.errors.length>0){
            return EagleConfig.getColor('graphError')
        }else if(errorsWarnings.warnings.length>0){
            return EagleConfig.getColor('graphWarning')
        }else{
            return 'transparent'
        }
    }, this);

    getNodeIssuesHtml : ko.PureComputed<string> = ko.pureComputed(() => {
        const errorsWarnings = this.getErrorsWarnings()
        return 'This Edge has **' + errorsWarnings.errors.length + '** errors and **' + errorsWarnings.warnings.length + '** warnings. \ Click to view the graph issues table.'
    }, this);

    static toOJSJson(edge : Edge) : object {
        return {
            from: edge.srcNode.getId(),
            fromPort: edge.srcPort.getId(),
            to: edge.destNode.getId(),
            toPort: edge.destPort.getId(),
            loop_aware: edge.loopAware() ? "1" : "0",
            closesLoop: edge.closesLoop()
        };
    }

    static toV4Json(edge: Edge) : object {
        return {
            id: edge.getId(),
            srcNodeId: edge.srcNode.getId(),
            srcPortId: edge.srcPort.getId(),
            destNodeId: edge.destNode.getId(),
            destPortId: edge.destPort.getId(),
            loopAware: edge.loopAware(),
            closesLoop: edge.closesLoop()
        }
    }

    static fromOJSJson(linkData: any, nodes: Node[], errorsWarnings: Errors.ErrorsWarnings) : Edge {
        // try to read source and destination nodes and ports
        let srcNodeId: NodeId = null;
        let srcPortId: FieldId = null;
        let destNodeId: NodeId = null;
        let destPortId: FieldId = null;

        if (typeof linkData.from === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'from' attribute"));
        } else {
            srcNodeId = linkData.from;
        }
        if (typeof linkData.fromPort === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'fromPort' attribute"));
        } else {
            srcPortId = linkData.fromPort;
        }
        if (typeof linkData.to === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'to' attribute"));
        } else {
            destNodeId = linkData.to;
        }
        if (typeof linkData.toPort === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'toPort' attribute"));
        } else {
            destPortId = linkData.toPort;
        }
        
        // try to read loop_aware attribute
        let loopAware: boolean = false;
        if (typeof linkData.loop_aware !== 'undefined'){
            loopAware = linkData.loop_aware !== "0";
        }
        if (typeof linkData.loopAware !== 'undefined'){
            loopAware = linkData.loopAware;
        }

        // try to read the closesLoop attribute
        let closesLoop: boolean = false;
        if (typeof linkData.closesLoop !== 'undefined'){
            closesLoop = linkData.closesLoop;
        }

        let srcNode: Node;
        let destNode: Node;
        let srcPort: Field;
        let destPort: Field;

        for (const node of nodes){
            if (node.getId() === srcNodeId){
                srcNode = node;

                // check input and output applications for srcPort
                const result = node.findPortInApplicationsById(srcPortId);
                if (result.node !== null){
                    srcNode = result.node;
                    srcPort = result.port;
                    continue;
                }

                srcPort = node.getFieldById(srcPortId);
            }

            if (node.getId() === destNodeId){
                destNode = node;

                // check input and output applications for destPort
                const result = node.findPortInApplicationsById(destPortId);
                if (result.node !== null){
                    destNode = result.node;
                    destPort = result.port;
                    continue;
                }

                destPort = node.getFieldById(destPortId);
            }
        }

        // check if source and destination nodes and ports were found
        if (typeof srcNode === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Could not find source node for edge"));
            return null;
        }
        if (typeof destNode === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Could not find destination node for edge"));
            return null;
        }
        if (typeof srcPort === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Could not find source port for edge"));
            return null;
        }
        if (typeof destPort === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Could not find destination port for edge"));
            return null;
        }

        return new Edge(srcNode, srcPort, destNode, destPort, loopAware, closesLoop, false);
    }

    static fromV4Json(edgeData: any, lg: LogicalGraph, errorsWarnings: Errors.ErrorsWarnings) : Edge {
        const loopAware: boolean = edgeData.loopAware;
        const closesLoop: boolean = edgeData.closesLoop;

        const srcNode: Node = lg.getNodeById(edgeData.srcNodeId);
        const destNode: Node = lg.getNodeById(edgeData.destNodeId);

        let errorFound: boolean = false;

        if (typeof srcNode === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("edge (" + edgeData.id + ") source node (" + edgeData.srcNodeId + ") could not be found, skipping"));
            errorFound = true;
        }
        if (typeof destNode === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("edge (" + edgeData.id + ") destination node (" + edgeData.destNodeId + ") could not be found, skipping"));
            errorFound = true;
        }
        if (errorFound){
            return null;
        }

        const srcPort: Field = srcNode.getFieldById(edgeData.srcPortId);
        const destPort: Field = destNode.getFieldById(edgeData.destPortId);

        if (typeof srcPort === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("edge (" + edgeData.id + ") source port (" + edgeData.srcPortId + ") could not be found, skipping"));
            errorFound = true;
        }
        if (typeof destPort === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("edge (" + edgeData.id + ") destination port (" + edgeData.destPortId + ") could not be found, skipping"));
            errorFound = true;
        }
        if (errorFound){
            return null;
        }

        return new Edge(srcNode, srcPort, destNode, destPort, loopAware, closesLoop, false);
    }

    static isValid(eagle: Eagle, draggingPortMode: boolean, edgeId: EdgeId, sourceNodeId: NodeId, sourcePortId: FieldId, destinationNodeId: NodeId, destinationPortId: FieldId, loopAware: boolean, closesLoop: boolean, showNotification: boolean, showConsole: boolean, errorsWarnings: Errors.ErrorsWarnings) : Errors.Validity {
        let impossibleEdge : boolean = false;
        let draggingEdgeFixable : boolean = false;

        const edge = eagle.logicalGraph().getEdgeById(edgeId);

        // if this is a real edge, then clear its issues, otherwise, if this is just a temp test edge, don't worry
        if(typeof edge !== 'undefined'){
            edge.issues([]);   
        }

        if (sourcePortId === null){
            const issue = Errors.Message("Source port id is null");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            return Errors.Validity.Impossible;
        }

        if (destinationPortId === null){
            const issue = Errors.Message("Destination port id is null");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            return Errors.Validity.Impossible;
        }

        // check that we are not connecting a node to itself
        if (sourceNodeId === destinationNodeId){
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, Errors.Show("Source node and destination node are the same", function(){Utils.showEdge(eagle, edge);}), showNotification, showConsole, errorsWarnings);
            impossibleEdge = true;
        }
        // check that we are not connecting a port to itself
        if (sourcePortId === destinationPortId){
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, Errors.Show("Source port and destination port are the same", function(){Utils.showEdge(eagle, edge);}), showNotification, showConsole, errorsWarnings);
            impossibleEdge = true;
        }

        // get references to actual source and destination nodes (from the ids)
        const sourceNode : Node = eagle.logicalGraph().getNodeById(sourceNodeId);
        const destinationNode : Node = eagle.logicalGraph().getNodeById(destinationNodeId);

        if (typeof sourceNode === "undefined" || typeof destinationNode === "undefined"){
            return Errors.Validity.Unknown;
        }

        // check that we are not connecting a Data component to a Data component, that is not supported
        if (sourceNode.getCategoryType() === Category.Type.Data && destinationNode.getCategoryType() === Category.Type.Data){
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, Errors.Show("Data nodes may not be connected directly to other Data nodes", function(){Utils.showEdge(eagle, edge);}), showNotification, showConsole, errorsWarnings);
        }

        // check that we are not connecting an Application component to an Application component, that is not supported
        if (sourceNode.getCategoryType() === Category.Type.Application && destinationNode.getCategoryType() === Category.Type.Application){
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Fixable, Errors.ShowFix("Application nodes may not be connected directly to other Application nodes", function(){Utils.showEdge(eagle, edge);}, function(){Utils.fixAppToAppEdge(eagle, edge);}, "Add intermediate Data node between edge's source and destination app nodes"), showNotification, showConsole, errorsWarnings);
        }

        // if source node or destination node is a construct, then something is wrong, constructs should not have ports
        if (sourceNode.getCategoryType() === Category.Type.Construct){
            const issue: Errors.Issue = Errors.ShowFix("Edge cannot have a source node (" + sourceNode.getName() + ") that is a construct", function(){Utils.showEdge(eagle, edge)}, function(){Utils.fixMoveEdgeToEmbeddedApplication(eagle, edge)}, "Move edge to embedded application");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, issue, showNotification, showConsole, errorsWarnings);
        }

        if (destinationNode.getCategoryType() === Category.Type.Construct){
            const issue: Errors.Issue = Errors.ShowFix("Edge cannot have a destination node (" + destinationNode.getName() + ") that is a construct", function(){Utils.showEdge(eagle, edge)}, function(){Utils.fixMoveEdgeToEmbeddedApplication(eagle, edge)}, "Move edge to embedded application");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, issue, showNotification, showConsole, errorsWarnings);
        }

        // if an edge ends with a PythonObject, it must have started from a PythonMemberFunction. Nothing else can create a PythonObject
        if (destinationNode.getCategory() === Category.PythonObject){
            if (sourceNode.getCategory() !== Category.PythonMemberFunction){
                const issue: Errors.Issue = Errors.Show("PythonObjects can only be generated by PythonMemberFunction components", function(){Utils.showNode(eagle, Eagle.FileType.Graph, destinationNode)});
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Warning, issue, showNotification, showConsole, errorsWarnings);
            }
        }

        const sourcePort : Field = sourceNode.getFieldById(sourcePortId);
        const destinationPort : Field = destinationNode.getFieldById(destinationPortId);

        // check if source port was found
        if (typeof sourcePort === 'undefined') {
            const issue: Errors.Issue = Errors.ShowFix("Source port doesn't exist on source node (" + sourceNode.getName() + ")", function(){Utils.showEdge(eagle, edge)}, function(){Utils.addSourcePortToSourceNode(eagle, edge)}, "Add source port to source node");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            impossibleEdge = true;
            return Errors.Validity.Impossible;
        }

        // check if destination port was found
        if (typeof destinationPort === 'undefined'){
            const issue: Errors.Issue = Errors.ShowFix("Destination port doesn't exist on destination node (" + destinationNode.getName() + ")", function(){Utils.showEdge(eagle, edge)}, function(){Utils.addDestinationPortToDestinationNode(eagle, edge)}, "Add destination port to destination node");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            impossibleEdge = true;
            return Errors.Validity.Impossible;
        }

        // check that source is output
        if (!sourcePort.isOutputPort()){
            const issue: Errors.Issue = Errors.ShowFix("Source port is not output port (" + sourcePort.getUsage() + ")", function(){Utils.showEdge(eagle, edge);}, function(){Utils.fixFieldUsage(eagle, sourcePort, Daliuge.FieldUsage.OutputPort)}, "Add output usage to source port");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            impossibleEdge = true;
        }

        // check that destination in input
        if (!destinationPort.isInputPort()){
            const issue: Errors.Issue = Errors.ShowFix("Destination port is not input port (" + destinationPort.getUsage() + ")", function(){Utils.showEdge(eagle, edge);}, function(){Utils.fixFieldUsage(eagle, destinationPort, Daliuge.FieldUsage.InputPort)}, "Add input usage to destination port");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            impossibleEdge = true;
        }

        if (sourcePort !== null && destinationPort !== null){
            // check that source and destination port are both event, or both not event
            if ((sourcePort.getIsEvent() && !destinationPort.getIsEvent()) || (!sourcePort.getIsEvent() && destinationPort.getIsEvent())){
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, Errors.Show("Source port and destination port are mix of event and non-event ports", function(){Utils.showEdge(eagle, edge);}), showNotification, showConsole, errorsWarnings);
            }
        }

        // check relationship of destination Node in relation to source node
        const sourceHasParent = sourceNode.getParent() !== null;
        const sourceHasEmbed = sourceNode.getEmbed() !== null;
        const destinationHasParent = destinationNode.getParent() !== null;
        const destinationHasEmbed = destinationNode.getEmbed() !== null;
        const isParentOfConstruct : boolean = sourceHasParent && destinationHasEmbed && sourceNode.getParent().getId() === destinationNode.getEmbed().getId(); // is the connection from a child of a construct to an embedded app of the same construct
        const isChildOfConstruct : boolean = destinationHasParent && sourceHasEmbed && destinationNode.getParent().getId() === sourceNode.getEmbed().getId(); //is the connections from an embedded app of a construct to a child of that same construct
        const isSibling : boolean = (sourceHasParent && destinationHasParent && sourceNode.getParent().getId() === destinationNode.getParent().getId()) || (!sourceHasParent && !destinationHasParent); // do the two nodes have the same parent
        let associatedConstructType : Category = null; //the category type of the parent construct of the source or destination node

        //these checks are to see if the source or destination node are embedded apps whose parent is a sibling of the other source or destination node
        const destPortIsEmbeddedAppOfSibling : boolean = sourceHasParent && destinationHasEmbed && sourceNode.getParent().getId() === destinationNode.getEmbed()?.getParent()?.getId();
        const srcPortIsEmbeddedAppOfSibling : boolean = destinationHasParent && sourceHasEmbed && destinationNode.getParent().getId() === sourceNode.getEmbed()?.getParent()?.getId();

        //checking the type of the parent nodes
        if(!isSibling){
            const srcNodeParent: Node = sourceNode.getParent()
            const destNodeParent: Node = destinationNode.getParent()

            if(destNodeParent !== null && destNodeParent.getCategory() === Category.Loop || srcNodeParent !== null && srcNodeParent.getCategory() === Category.Loop){
                associatedConstructType = Category.Loop
            }else if(destNodeParent !== null && destNodeParent.getCategory() === Category.ExclusiveForceNode || srcNodeParent !== null && srcNodeParent.getCategory() === Category.ExclusiveForceNode){
                associatedConstructType = Category.ExclusiveForceNode
            }
        }

        if (sourcePort !== null && destinationPort !== null){
            // abort if source port and destination port have different data types
            if (!Utils.portsMatch(sourcePort, destinationPort)){
                const x = Errors.ShowFix("Source and destination ports don't match data types: sourcePort (" + sourcePort.getDisplayText() + ":" + sourcePort.getType() + ") destinationPort (" + destinationPort.getDisplayText() + ":" + destinationPort.getType() + ")", function(){Utils.showEdge(eagle, edge);}, function(){Utils.fixPortType(eagle, sourcePort, destinationPort);}, "Overwrite destination port type with source port type");
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, x, showNotification, showConsole, errorsWarnings);
            }
        }

        //checking if the edge is un-necessarily loopAware
        if(    isSibling && loopAware 
            || destPortIsEmbeddedAppOfSibling && loopAware
            || srcPortIsEmbeddedAppOfSibling && loopAware
            || sourceNode.isEmbedded() && destinationNode.hasParent() && sourceNode.getEmbed().getId() === destinationNode.getParent().getId() && loopAware
            || destinationNode.isEmbedded() && sourceNode.hasParent() && destinationNode.getEmbed().getId() === sourceNode.getParent().getId() && loopAware
            || associatedConstructType !== Category.Loop && loopAware
        ){
            const x = Errors.ShowFix("Edge between two siblings should not be loop aware", function(){Utils.showEdge(eagle, edge);}, function(){Utils.fixDisableEdgeLoopAware(eagle, edgeId);}, "Disable loop aware on the edge.");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Warning, x, showNotification, showConsole, errorsWarnings);
        }

        // if link is not a parent, child or sibling, then warn user
        if (associatedConstructType !== Category.ExclusiveForceNode && associatedConstructType !== Category.Loop && !isSibling && !isParentOfConstruct && !isChildOfConstruct && !destPortIsEmbeddedAppOfSibling && !srcPortIsEmbeddedAppOfSibling){
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Warning, Errors.Show("Edge is not between siblings, or between a child and its parent's embedded Application. It could be incorrect or computationally expensive", function(){Utils.showEdge(eagle, edge);}), showNotification, showConsole, errorsWarnings);
        }

        // check if the edge already exists in the graph, there is no point in a duplicate
        for (const edge of eagle.logicalGraph().getEdges()){
            const isSrcMatch = edge.getSrcNode().getId() === sourceNodeId && edge.getSrcPort().getId() === sourcePortId;
            const isDestMatch = edge.getDestNode().getId() === destinationNodeId && edge.getDestPort().getId() === destinationPortId;

            if ( isSrcMatch && isDestMatch && edge.getId() !== edgeId){
                const x = Errors.ShowFix("Edge is a duplicate. Another edge with the same source port and destination port already exists", function(){Utils.showEdge(eagle, edge);}, function(){Utils.fixDeleteEdge(eagle, edgeId);}, "Delete edge");
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, x, showNotification, showConsole, errorsWarnings);
            }
        }

        // check that all "closes loop" edges:
        // - begin from a Data component
        // - end with a App component
        // - sourceNode has a 'group_end' field set to true
        // - destNode has a 'group_start' field set to true
        if (closesLoop){
            if (!sourceNode.isData()){
                const x = Errors.Show("Closes Loop Edge does not start from a Data component.", function(){Utils.showEdge(eagle, edge);});
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, x, showNotification, showConsole, errorsWarnings);
            }

            if (!destinationNode.isApplication()){
                const x = Errors.Show("Closes Loop Edge does not end at an Application component.", function(){Utils.showEdge(eagle, edge);});
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, x, showNotification, showConsole, errorsWarnings);
            }

            if (!sourceNode.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_END) || !Utils.asBool(sourceNode.getFieldByDisplayText(Daliuge.FieldName.GROUP_END).getValue())){
                const x = Errors.ShowFix("'Closes Loop' Edge start node (" + sourceNode.getName() + ") does not have 'group_end' set to true.", function(){Utils.showEdge(eagle, edge);}, function(){Utils.fixFieldValue(eagle, sourceNode, Daliuge.groupEndField, "true")}, "Set 'group_end' to true");
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, x, showNotification, showConsole, errorsWarnings);
            }

            if (!destinationNode.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_START) || !Utils.asBool(destinationNode.getFieldByDisplayText(Daliuge.FieldName.GROUP_START).getValue())){
                const x = Errors.ShowFix("'Closes Loop' Edge end node (" + destinationNode.getName() + ") does not have 'group_start' set to true.", function(){Utils.showEdge(eagle, edge);}, function(){Utils.fixFieldValue(eagle, destinationNode, Daliuge.groupStartField, "true")}, "Set 'group_start' to true");
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, x, showNotification, showConsole, errorsWarnings);
            }
        }

        //check for fixable issues during dragging port mode
        if(draggingPortMode){
            //if source and destination nodes are applications
            if(sourceNode.isApplication() && destinationNode.isApplication()){
                draggingEdgeFixable = true
            }
        }

        //the worst edge error function can only check for entries in errors or warnings, it isn't able to distinguish impossible from invalid
        if(impossibleEdge){
            return Errors.Validity.Impossible
        }else if(draggingEdgeFixable){
            return Errors.Validity.Fixable
        }else{
            return Utils.worstEdgeError(errorsWarnings);
        }
    }

    private static isValidLog(edge: Edge, draggingPortMode: boolean, linkValid: Errors.Validity, issue: Errors.Issue, showNotification: boolean, showConsole: boolean, errorsWarnings: Errors.ErrorsWarnings): void {
        // determine correct title
        let title = "Edge Valid";
        let type : "success" | "info" | "warning" | "danger" = "success";
        let consoleFunction = console.log;
        let message = "";

        switch (linkValid){
            case Errors.Validity.Warning:
                title = "Edge Warning";
                type = "warning";
                consoleFunction = console.warn;
                break;
            case Errors.Validity.Impossible:
                title = "Edge Impossible";
                type = "danger";
                consoleFunction = console.error;
                break;
            case Errors.Validity.Error:
                title = "Edge Invalid";
                type = "danger";
                consoleFunction = console.error;
                break;
            case Errors.Validity.Fixable:
                title = "Edge Fixed";
                type = "info";
                consoleFunction = console.info;
                break;
        }

        // add edge id to message, if id is known
        if (typeof edge !== 'undefined'){
            message = "Edge (" + edge.getId() + ") " + issue.message;
        } else {
            message = issue.message;
        }

        // add log message to correct location(s)
        if (showNotification)
            Utils.showNotification(title, message, type);
        if (showConsole)
            consoleFunction(title + ":" + message);
        if (type === "danger" && errorsWarnings !== null){
            errorsWarnings.errors.push(issue);
        }
        if (type === "warning" && errorsWarnings !== null){
            errorsWarnings.warnings.push(issue);
        }

        // TODO: maybe this should not be in the logging function, but there doesn't seem to be a better place for it?
        if(!draggingPortMode){
            if (typeof edge !== 'undefined'){
                edge.issues.push({issue:issue, validity:linkValid})
            }
        }
    }
}
