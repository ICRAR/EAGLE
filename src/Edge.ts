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

import { Category } from './Category';
import { Daliuge } from './Daliuge';
import { Eagle } from './Eagle';
import { LogicalGraph } from './LogicalGraph';
import { Node } from './Node';
import { Field } from './Field';
import { Utils } from './Utils';
import { Errors } from './Errors';
import * as ko from "knockout";
import { EagleConfig } from './EagleConfig';

export class Edge {
    private id: EdgeId;    
    private comment : ko.Observable<string>;
    private srcNodeId: NodeId;
    private srcPortId: FieldId;
    private destNodeId: NodeId;
    private destPortId: FieldId;
    private loopAware : ko.Observable<boolean>; // indicates the user is aware that the components at either end of the edge may differ in multiplicity
    private closesLoop : ko.Observable<boolean>; // indicates that this is a special type of edge that can be drawn in eagle to specify the start/end of groups.
    private selectionRelative : boolean // indicates if the edge is either selected or attached to a selected node
    private isShortEdge : ko.Observable<boolean>;
    private issues : ko.ObservableArray<{issue:Errors.Issue, validity:Errors.Validity}> //keeps track of edge errors

    constructor(comment:string ,srcNodeId: NodeId, srcPortId: FieldId, destNodeId: NodeId, destPortId: FieldId, loopAware: boolean, closesLoop: boolean, selectionRelative : boolean){
        this.id = Utils.generateEdgeId();
        this.comment = ko.observable(comment);

        this.srcNodeId = srcNodeId;
        this.srcPortId = srcPortId;
        this.destNodeId = destNodeId;
        this.destPortId = destPortId;

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

    getComment = () : string => {
        return this.comment();
    }

    setComment = (comment: string) : void => {
        this.comment(comment);
    }

    getSrcNodeId = () : NodeId => {
        return this.srcNodeId;
    }

    setSrcNodeId = (id: NodeId): void => {
        this.srcNodeId = id;
    }

    getSrcPortId = () : FieldId => {
        return this.srcPortId;
    }

    setSrcPortId = (id: FieldId) : void => {
        this.srcPortId = id;
    }

    getDestNodeId = () : NodeId => {
        return this.destNodeId;
    }

    setDestNodeId = (id: NodeId): void => {
        this.destNodeId = id;
    }

    getDestPortId = () : FieldId => {
        return this.destPortId;
    }

    getSelectionRelative = () : boolean => {
        return this.selectionRelative;
    }

    setDestPortId = (id: FieldId) : void => {
        this.destPortId = id;
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
        const eagle = Eagle.getInstance()
        const srcPort = eagle.logicalGraph().findNodeByIdQuiet(this.getSrcNodeId())?.getFieldById(this.getSrcPortId())
        const destPort = eagle.logicalGraph().findNodeByIdQuiet(this.getDestNodeId())?.getFieldById(this.getDestPortId())

        if(srcPort?.getEncoding() === Daliuge.Encoding.Path){
            return true
        }else if(destPort?.getEncoding() === Daliuge.Encoding.Path){
            return true
        }

        return false
    }

    clear = () : void => {
        this.id = null;
        this.srcNodeId = null;
        this.srcPortId = null;
        this.destNodeId = null;
        this.destPortId = null;
        this.loopAware(false);
        this.closesLoop(false);
    }

    clone = () : Edge => {
        const result : Edge = new Edge(this.comment(), this.srcNodeId, this.srcPortId, this.destNodeId, this.destPortId, this.loopAware(), this.closesLoop(), this.selectionRelative);

        result.id = this.id;

        return result;
    }
    
    getCommentHTML : ko.PureComputed<string> = ko.pureComputed(() => {
        return Utils.markdown2html(this.comment());
    }, this);

    getInspectorCommentHTML : ko.PureComputed<string> = ko.pureComputed(() => {
        return 'Edit Edge Comment: </br>' + Utils.markdown2html(this.comment());
    }, this);

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
            comment: edge.comment(),
            from: edge.srcNodeId,
            fromPort: edge.srcPortId,
            to: edge.destNodeId,
            toPort: edge.destPortId,
            loop_aware: edge.loopAware() ? "1" : "0",
            closesLoop: edge.closesLoop()
        };
    }

    static fromOJSJson(linkData: any, errorsWarnings: Errors.ErrorsWarnings) : Edge {
        let comment = ''
        // get comment (if exists)
        if (typeof linkData.comment !== 'undefined'){
            comment = linkData.comment;
        }

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

        // TODO: validate ids
        return new Edge(comment, srcNodeId, srcPortId, destNodeId, destPortId, loopAware, closesLoop, false);
    }

    static isValid(eagle: Eagle, draggingPortMode: boolean, edgeId: EdgeId, sourceNodeId: NodeId, sourcePortId: FieldId, destinationNodeId: NodeId, destinationPortId: FieldId, loopAware: boolean, closesLoop: boolean, showNotification: boolean, showConsole: boolean, errorsWarnings: Errors.ErrorsWarnings) : Errors.Validity {
        let impossibleEdge : boolean = false;
        let draggingEdgeFixable : boolean = false;

        const edge = eagle.logicalGraph().findEdgeById(edgeId)
        if(edge){
            edge.issues([]) //clear old issues
        }

        if (sourcePortId === null){
            const issue = Errors.Fix("Source port has no id", function(){Utils.fixNodeFieldIds(eagle, sourceNodeId)}, "Generate ids for ports on source node");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            return Errors.Validity.Impossible;
        }

        if (destinationPortId === null){
            const issue = Errors.Fix("Destination port has no id", function(){Utils.fixNodeFieldIds(eagle, sourceNodeId)}, "Generate ids for ports on destination node");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            return Errors.Validity.Impossible;
        }

        if (sourcePortId === null){
            const issue = Errors.Fix("Source port id is null", function(){Utils.fixNodeFieldIds(eagle, sourceNodeId)}, "Generate ids for ports on source node");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            return Errors.Validity.Impossible;
        }

        if (destinationPortId === null){
            const issue = Errors.Fix("Destination port id is null", function(){Utils.fixNodeFieldIds(eagle, sourceNodeId)}, "Generate ids for ports on destination node");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            return Errors.Validity.Impossible;
        }

        // get references to actual source and destination nodes (from the ids)
        const sourceNode : Node = eagle.logicalGraph().findNodeById(sourceNodeId);
        const destinationNode : Node = eagle.logicalGraph().findNodeById(destinationNodeId);

        if (sourceNode === null || typeof sourceNode === "undefined" || destinationNode === null || typeof destinationNode === "undefined"){
            return Errors.Validity.Unknown;
        }

        // check that we are not connecting a Data component to a Data component, that is not supported
        if (sourceNode.getCategoryType() === Category.Type.Data && destinationNode.getCategoryType() === Category.Type.Data){
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, Errors.Show("Data nodes may not be connected directly to other Data nodes", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        // check that we are not connecting an Application component to an Application component, that is not supported
        if (sourceNode.getCategoryType() === Category.Type.Application && destinationNode.getCategoryType() === Category.Type.Application){
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Fixable, Errors.ShowFix("Application nodes may not be connected directly to other Application nodes", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixAppToAppEdge(eagle, edgeId);}, "Add intermediate Data node between edge's source and destination app nodes"), showNotification, showConsole, errorsWarnings);
        }

        // if source node or destination node is a construct, then something is wrong, constructs should not have ports
        if (sourceNode.getCategoryType() === Category.Type.Construct){
            const issue: Errors.Issue = Errors.ShowFix("Edge cannot have a source node (" + sourceNode.getName() + ") that is a construct", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixMoveEdgeToEmbeddedApplication(eagle, edgeId)}, "Move edge to embedded application");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, issue, showNotification, showConsole, errorsWarnings);
        }

        if (destinationNode.getCategoryType() === Category.Type.Construct){
            const issue: Errors.Issue = Errors.ShowFix("Edge cannot have a destination node (" + destinationNode.getName() + ") that is a construct", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixMoveEdgeToEmbeddedApplication(eagle, edgeId)}, "Move edge to embedded application");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, issue, showNotification, showConsole, errorsWarnings);
        }

        // if an edge ends with a PythonObject, it must have started from a PythonMemberFunction. Nothing else can create a PythonObject
        if (destinationNode.getCategory() === Category.PythonObject){
            if (sourceNode.getCategory() !== Category.PythonMemberFunction){
                const issue: Errors.Issue = Errors.Show("PythonObjects can only be generated by PythonMemberFunction components", function(){Utils.showNode(eagle, destinationNode.getId())});
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Warning, issue, showNotification, showConsole, errorsWarnings);
            }
        }

        const sourcePort : Field = sourceNode.findFieldById(sourcePortId);
        const destinationPort : Field = destinationNode.findFieldById(destinationPortId);

        // check if source port was found
        if (sourcePort === null) {
            const issue: Errors.Issue = Errors.ShowFix("Source port doesn't exist on source node (" + sourceNode.getName() + ")", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.addSourcePortToSourceNode(eagle, edgeId)}, "Add source port to source node");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            impossibleEdge = true;
            return Errors.Validity.Impossible;
        }

        // check if destination port was found
        if (destinationPort === null){
            const issue: Errors.Issue = Errors.ShowFix("Destination port doesn't exist on destination node (" + destinationNode.getName() + ")", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.addDestinationPortToDestinationNode(eagle, edgeId)}, "Add destination port to destination node");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            impossibleEdge = true;
            return Errors.Validity.Impossible;
        }

        // check that we are not connecting a port to itself
        if (sourceNodeId === destinationNodeId){
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, Errors.Show("Source port and destination port are the same", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
            impossibleEdge = true;
        }

        // check that source is output
        if (!sourcePort.isOutputPort()){
            const issue: Errors.Issue = Errors.ShowFix("Source port is not output port (" + sourcePort.getUsage() + ")", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixFieldUsage(eagle, sourcePort, Daliuge.FieldUsage.OutputPort)}, "Add output usage to source port");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            impossibleEdge = true;
        }

        // check that destination in input
        if (!destinationPort.isInputPort()){
            const issue: Errors.Issue = Errors.ShowFix("Destination port is not input port (" + destinationPort.getUsage() + ")", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixFieldUsage(eagle, destinationPort, Daliuge.FieldUsage.InputPort)}, "Add input usage to destination port");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            impossibleEdge = true;
        }

        if (sourcePort !== null && destinationPort !== null){
            // check that source and destination port are both event, or both not event
            if ((sourcePort.getIsEvent() && !destinationPort.getIsEvent()) || (!sourcePort.getIsEvent() && destinationPort.getIsEvent())){
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, Errors.Show("Source port and destination port are mix of event and non-event ports", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
            }
        }

        // check relationship of destination Node in relation to source node
        const isParentOfConstruct : boolean = sourceNode.getParentId() === destinationNode.getEmbedId() && sourceNode.getParentId() !== null; // is the connection from a child of a construct to an embedded app of the same construct
        const isChildOfConstruct : boolean = destinationNode.getParentId() === sourceNode.getEmbedId() && destinationNode.getParentId() !== null; //is the connections from an embedded app of a construct to a child of that same construct
        const isSibling : boolean = sourceNode.getParentId() === destinationNode.getParentId(); // do the two nodes have the same parent
        let associatedConstructType : Category = null; //the category type of the parent construct of the source or destination node

        //these checks are to see if the source or destination node are embedded apps whose parent is a sibling of the other source or destination node
        const destPortIsEmbeddedAppOfSibling : boolean = sourceNode.getParentId() !== null && destinationNode.getEmbedId() !== null && sourceNode.getParentId() === eagle.logicalGraph().findNodeByIdQuiet(destinationNode.getEmbedId())?.getParentId();
        const srcPortIsEmbeddedAppOfSibling : boolean = destinationNode.getParentId() !== null && sourceNode.getEmbedId() !== null && destinationNode.getParentId() === eagle.logicalGraph().findNodeByIdQuiet(sourceNode.getEmbedId())?.getParentId();

        //checking the type of the parent nodes
        if(!isSibling){
            const srcNodeParent = eagle.logicalGraph().findNodeByIdQuiet(sourceNode.getParentId())
            const destNodeParent = eagle.logicalGraph().findNodeByIdQuiet(destinationNode.getParentId())

            if(destNodeParent !== null && destNodeParent.getCategory() === Category.Loop || srcNodeParent !== null && srcNodeParent.getCategory() === Category.Loop){
                associatedConstructType = Category.Loop
            }else if(destNodeParent !== null && destNodeParent.getCategory() === Category.ExclusiveForceNode || srcNodeParent !== null && srcNodeParent.getCategory() === Category.ExclusiveForceNode){
                associatedConstructType = Category.ExclusiveForceNode
            }
        }

        if (sourcePort !== null && destinationPort !== null){
            // abort if source port and destination port have different data types
            if (!Utils.portsMatch(sourcePort, destinationPort)){
                const x = Errors.ShowFix("Source and destination ports don't match data types: sourcePort (" + sourcePort.getDisplayText() + ":" + sourcePort.getType() + ") destinationPort (" + destinationPort.getDisplayText() + ":" + destinationPort.getType() + ")", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixPortType(eagle, sourcePort, destinationPort);}, "Overwrite destination port type with source port type");
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, x, showNotification, showConsole, errorsWarnings);
            }
        }

        //checking if the edge is un-necessarily loopAware
        if(    isSibling && loopAware 
            || destPortIsEmbeddedAppOfSibling && loopAware
            || srcPortIsEmbeddedAppOfSibling && loopAware
            || sourceNode.getEmbedId() !== null && sourceNode.getEmbedId() === destinationNode.getParentId() && loopAware 
            || destinationNode.getEmbedId() !== null && destinationNode.getEmbedId() === sourceNode.getParentId() && loopAware
            || associatedConstructType !== Category.Loop && loopAware
        ){
            const x = Errors.ShowFix("Edge between two siblings should not be loop aware", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixDisableEdgeLoopAware(eagle, edgeId);}, "Disable loop aware on the edge.");
            Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Warning, x, showNotification, showConsole, errorsWarnings);
        }

        // if link is not a parent, child or sibling, then warn user
        if (associatedConstructType !== Category.ExclusiveForceNode && associatedConstructType !== Category.Loop && !isSibling && !isParentOfConstruct && !isChildOfConstruct && !destPortIsEmbeddedAppOfSibling && !srcPortIsEmbeddedAppOfSibling){
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Warning, Errors.Show("Edge is not between siblings, or between a child and its parent's embedded Application. It could be incorrect or computationally expensive", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        // check if the edge already exists in the graph, there is no point in a duplicate
        for (const edge of eagle.logicalGraph().getEdges()){
            const isSrcMatch = edge.getSrcNodeId() === sourceNodeId && edge.getSrcPortId() === sourcePortId;
            const isDestMatch = edge.getDestNodeId() === destinationNodeId && edge.getDestPortId() === destinationPortId;

            if ( isSrcMatch && isDestMatch && edge.getId() !== edgeId){
                const x = Errors.ShowFix("Edge is a duplicate. Another edge with the same source port and destination port already exists", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixDeleteEdge(eagle, edgeId);}, "Delete edge");
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
                const x = Errors.Show("Closes Loop Edge does not start from a Data component.", function(){Utils.showEdge(eagle, edgeId);});
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, x, showNotification, showConsole, errorsWarnings);
            }

            if (!destinationNode.isApplication()){
                const x = Errors.Show("Closes Loop Edge does not end at an Application component.", function(){Utils.showEdge(eagle, edgeId);});
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, x, showNotification, showConsole, errorsWarnings);
            }

            if (!sourceNode.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_END) || !Utils.asBool(sourceNode.getFieldByDisplayText(Daliuge.FieldName.GROUP_END).getValue())){
                const x = Errors.ShowFix("'Closes Loop' Edge start node (" + sourceNode.getName() + ") does not have 'group_end' set to true.", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixFieldValue(eagle, sourceNode, Daliuge.groupEndField, "true")}, "Set 'group_end' to true");
                Edge.isValidLog(edge, draggingPortMode, Errors.Validity.Error, x, showNotification, showConsole, errorsWarnings);
            }

            if (!destinationNode.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_START) || !Utils.asBool(destinationNode.getFieldByDisplayText(Daliuge.FieldName.GROUP_START).getValue())){
                const x = Errors.ShowFix("'Closes Loop' Edge end node (" + destinationNode.getName() + ") does not have 'group_start' set to true.", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixFieldValue(eagle, destinationNode, Daliuge.groupStartField, "true")}, "Set 'group_start' to true");
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
        let message = "";

        switch (linkValid){
            case Errors.Validity.Warning:
                title = "Edge Warning";
                type = "warning";
                break;
            case Errors.Validity.Impossible:
                title = "Edge Impossible";
                type = "danger";
                break;
            case Errors.Validity.Error:
                title = "Edge Invalid";
                type = "danger";
                break;
            case Errors.Validity.Fixable:
                title = "Edge Fixed";
                type = "info";
                break;
        }

        // add edge id to message, if id is known
        if (edge !== null && edge.getId() !== null){
            message = "Edge (" + edge.getId() + ") " + issue.message;
        } else {
            message = issue.message;
        }

        // add log message to correct location(s)
        if (showNotification)
            Utils.showNotification(title, message, type);
        if (showConsole)
            console.warn(title + ":" + message);
        if (type === "danger" && errorsWarnings !== null){
            errorsWarnings.errors.push(issue);
        }
        if (type === "warning" && errorsWarnings !== null){
            errorsWarnings.warnings.push(issue);
        }

        // TODO: maybe this should not be in the logging function, but there doesn't seem to be a better place for it?
        if(!draggingPortMode){
            if (edge !== null){
                edge.issues.push({issue:issue, validity:linkValid})
            }
        }
    }
}
