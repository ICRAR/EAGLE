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
import { CategoryData } from './CategoryData';

export class Edge {
    private id : string
    private srcNodeKey : number;
    private srcPortId : string;
    private destNodeKey : number;
    private destPortId : string;
    private loopAware : boolean; // indicates the user is aware that the components at either end of the edge may differ in multiplicity
    private closesLoop : boolean; // indicates that this is a special type of edge that can be drawn in eagle to specify the start/end of groups.
    private selectionRelative : boolean // indicates if the edge is either selected or attached to a selected node
    private isShortEdge : ko.Observable<boolean>;

    constructor(srcNodeKey : number, srcPortId : string, destNodeKey : number, destPortId : string, loopAware: boolean, closesLoop: boolean, selectionRelative : boolean){
        this.id = Utils.uuidv4();

        this.srcNodeKey = srcNodeKey;
        this.srcPortId = srcPortId;
        this.destNodeKey = destNodeKey;
        this.destPortId = destPortId;

        this.loopAware = loopAware;
        this.closesLoop = closesLoop;
        this.selectionRelative = selectionRelative;
        this.isShortEdge = ko.observable(false)
    }

    getId = () : string => {
        return this.id;
    }

    setId = (id: string) : void => {
        this.id = id;
    }

    getSrcNodeKey = () : number => {
        return this.srcNodeKey;
    }

    setSrcNodeKey = (key: number): void => {
        this.srcNodeKey = key;
    }

    getSrcPortId = () : string => {
        return this.srcPortId;
    }

    setSrcPortId = (id: string) : void => {
        this.srcPortId = id;
    }

    getDestNodeKey = () : number => {
        return this.destNodeKey;
    }

    setDestNodeKey = (key: number): void => {
        this.destNodeKey = key;
    }

    getDestPortId = () : string => {
        return this.destPortId;
    }

    getSelectionRelative = () : boolean => {
        return this.selectionRelative;
    }

    setDestPortId = (id: string) : void => {
        this.destPortId = id;
    }

    isLoopAware = () : boolean => {
        return this.loopAware;
    }

    setLoopAware = (value : boolean) : void => {
        this.loopAware = value;
    }

    toggleLoopAware = () : void => {
        this.loopAware = !this.loopAware;
    }

    isClosesLoop = () : boolean => {
        return this.closesLoop;
    }

    setClosesLoop = (value : boolean) : void => {
        this.closesLoop = value;
    }

    toggleClosesLoop = () : void => {
        this.closesLoop = !this.closesLoop;
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

    clear = () : void => {
        this.id = "";
        this.srcNodeKey = 0;
        this.srcPortId = "";
        this.destNodeKey = 0;
        this.destPortId = "";
        this.loopAware = false;
        this.closesLoop = false;
    }

    clone = () : Edge => {
        const result : Edge = new Edge(this.srcNodeKey, this.srcPortId, this.destNodeKey, this.destPortId, this.loopAware, this.closesLoop, this.selectionRelative);

        result.id = this.id;

        return result;
    }

    getErrorsWarnings = (eagle: Eagle): Errors.ErrorsWarnings => {
        const result: {warnings: Errors.Issue[], errors: Errors.Issue[]} = {warnings: [], errors: []};

        Edge.isValid(eagle, this.id, this.srcNodeKey, this.srcPortId, this.destNodeKey, this.destPortId, this.loopAware, this.closesLoop, false, false, result);

        return result;
    }

    static toOJSJson(edge : Edge) : object {
        return {
            from: edge.srcNodeKey,
            fromPort: edge.srcPortId,
            to: edge.destNodeKey,
            toPort: edge.destPortId,
            loop_aware: edge.loopAware ? "1" : "0",
            closesLoop: edge.closesLoop
        };
    }

    static fromOJSJson(linkData: any, errorsWarnings: Errors.ErrorsWarnings) : Edge {
        // try to read source and destination nodes and ports
        let srcNodeKey : number = 0;
        let srcPortId : string = "";
        let destNodeKey : number = 0;
        let destPortId : string = "";

        if (typeof linkData.from === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'from' attribute"));
        } else {
            srcNodeKey = linkData.from;
        }
        if (typeof linkData.fromPort === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'fromPort' attribute"));
        } else {
            srcPortId = linkData.fromPort;
        }
        if (typeof linkData.to === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'to' attribute"));
        } else {
            destNodeKey = linkData.to;
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

        return new Edge(srcNodeKey, srcPortId, destNodeKey, destPortId, loopAware, closesLoop, false);
    }

    static toV3Json(edge : Edge) : object {
        return {
            srcNode: edge.srcNodeKey.toString(),
            srcPort: edge.srcPortId,
            destNode: edge.destNodeKey.toString(),
            destPort: edge.destPortId,
            loop_aware: edge.loopAware ? "1" : "0",
            closesLoop: edge.closesLoop
        }
    }

    static fromV3Json(edgeData: any, errorsWarnings: Errors.ErrorsWarnings): Edge {
        return new Edge(edgeData.srcNode, edgeData.srcPort, edgeData.destNode, edgeData.destPort, edgeData.loop_aware === "1", edgeData.closesLoop, false);
    }

    static toAppRefJson(edge : Edge, lg: LogicalGraph) : object {
        const result : any = {
            from: edge.srcNodeKey,
            fromPort: edge.srcPortId,
            to: edge.destNodeKey,
            toPort: edge.destPortId,
            loopAware: edge.loopAware,
            closesLoop: edge.closesLoop
        };

        // if srcNode is an embedded application, add a 'fromRef' attribute to the edge
        const srcNode : Node = lg.findNodeByKey(edge.srcNodeKey);
        if (srcNode.getEmbedKey() !== null){
            result.fromRef = srcNode.getEmbedKey();
        }

        // if destNode is an embedded application, add a 'toRef' attribute to the edge
        const destNode : Node = lg.findNodeByKey(edge.destNodeKey);
        if (destNode.getEmbedKey() != null){
            result.toRef = destNode.getEmbedKey();
        }

        return result;
    }

    static fromAppRefJson(edgeData: any, errorsWarnings: Errors.ErrorsWarnings): Edge {
        return new Edge(edgeData.from, edgeData.fromPort, edgeData.to, edgeData.toPort, edgeData.loopAware, edgeData.closesLoop, false);
    }

    static isValid(eagle: Eagle, edgeId: string, sourceNodeKey : number, sourcePortId : string, destinationNodeKey : number, destinationPortId : string, loopAware: boolean, closesLoop: boolean, showNotification : boolean, showConsole : boolean, errorsWarnings: Errors.ErrorsWarnings) : Edge.Validity {
        // check for problems
        if (isNaN(sourceNodeKey)){
            return Edge.Validity.Unknown;
        }

        if (isNaN(destinationNodeKey)){
            return Edge.Validity.Unknown;
        }

        if (sourcePortId === ""){
            const issue = Errors.Fix("source port has no id", function(){Utils.fixNodeFieldIds(eagle, sourceNodeKey)}, "Generate ids for ports on source node");
            Edge.isValidLog(edgeId, Edge.Validity.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Edge.Validity.Invalid;
        }

        if (destinationPortId === ""){
            const issue = Errors.Fix("destination port has no id", function(){Utils.fixNodeFieldIds(eagle, sourceNodeKey)}, "Generate ids for ports on destination node");
            Edge.isValidLog(edgeId, Edge.Validity.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Edge.Validity.Invalid;
        }

        if (sourcePortId === null){
            const issue = Errors.Fix("source port id is null", function(){Utils.fixNodeFieldIds(eagle, sourceNodeKey)}, "Generate ids for ports on source node");
            Edge.isValidLog(edgeId, Edge.Validity.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Edge.Validity.Invalid;
        }

        if (destinationPortId === null){
            const issue = Errors.Fix("destination port id is null", function(){Utils.fixNodeFieldIds(eagle, sourceNodeKey)}, "Generate ids for ports on destination node");
            Edge.isValidLog(edgeId, Edge.Validity.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Edge.Validity.Invalid;
        }

        // get references to actual source and destination nodes (from the keys)
        const sourceNode : Node = eagle.logicalGraph().findNodeByKey(sourceNodeKey);
        const destinationNode : Node = eagle.logicalGraph().findNodeByKey(destinationNodeKey);

        // check that we are not connecting two ports within the same node
        if (sourceNodeKey === destinationNodeKey){
            Edge.isValidLog(edgeId, Edge.Validity.Impossible, Errors.Show("sourceNodeKey and destinationNodeKey are the same", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
            return Edge.Validity.Impossible;
        }

        if (sourceNode === null || typeof sourceNode === "undefined" || destinationNode === null || typeof destinationNode === "undefined"){
            return Edge.Validity.Unknown;
        }

        // check that we are not connecting a Data component to a Data component, that is not supported
        if (sourceNode.getCategoryType() === Category.Type.Data && destinationNode.getCategoryType() === Category.Type.Data){
            Edge.isValidLog(edgeId, Edge.Validity.Invalid, Errors.Show("Data nodes may not be connected directly to other Data nodes", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
            return Edge.Validity.Invalid;
        }

        // if source node or destination node is a construct, then something is wrong, constructs should not have ports
        if (sourceNode.getCategoryType() === Category.Type.Construct){
            const issue: Errors.Issue = Errors.ShowFix("Edge (" + edgeId + ") cannot have a source node (" + sourceNode.getName() + ") that is a construct", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixMoveEdgeToEmbeddedApplication(eagle, edgeId)}, "Move edge to embedded application");
            Edge.isValidLog(edgeId, Edge.Validity.Invalid, issue, showNotification, showConsole, errorsWarnings);
        }
        if (destinationNode.getCategoryType() === Category.Type.Construct){
            const issue: Errors.Issue = Errors.ShowFix("Edge (" + edgeId + ") cannot have a destination node (" + destinationNode.getName() + ") that is a construct", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixMoveEdgeToEmbeddedApplication(eagle, edgeId)}, "Move edge to embedded application");
            Edge.isValidLog(edgeId, Edge.Validity.Invalid, issue, showNotification, showConsole, errorsWarnings);
        }

        // if source node is a memory, and destination is a BashShellApp, OR
        // if source node is a memory, and destination is a Group with inputApplicationType BashShellApp
        // this is not supported. How would a BashShellApp read data from another process?
        if ((sourceNode.getCategory() === Category.Memory && destinationNode.getCategory() === Category.BashShellApp) ||
            (sourceNode.getCategory() === Category.Memory && destinationNode.isGroup() && destinationNode.getInputApplication() !== undefined && destinationNode.hasInputApplication() && destinationNode.getInputApplication().getCategory() === Category.BashShellApp)){
            const issue: Errors.Issue = Errors.ShowFix("output from Memory Node cannot be input into a BashShellApp or input into a Group Node with a BashShellApp inputApplicationType", function(){Utils.showNode(eagle, sourceNode.getId())}, function(){Utils.fixNodeCategory(eagle, sourceNode, Category.File, Category.Type.Data)}, "Change data component type to File");
            Edge.isValidLog(edgeId, Edge.Validity.Invalid, issue, showNotification, showConsole, errorsWarnings);
        }

        const sourcePort : Field = sourceNode.findFieldById(sourcePortId);
        const destinationPort : Field = destinationNode.findFieldById(destinationPortId);

        // check if source port was found
        if (sourcePort === null) {
            const issue: Errors.Issue = Errors.ShowFix("Source port (" + sourcePortId + ") doesn't exist on source node (" + sourceNode.getName() + ")", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.addSourcePortToSourceNode(eagle, edgeId)}, "Add source port to source node");
            Edge.isValidLog(edgeId, Edge.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            return Edge.Validity.Impossible;
        }

        // check if destination port was found
        if (destinationPort === null){
            const issue: Errors.Issue = Errors.ShowFix("Destination port (" + destinationPortId + ") doesn't exist on destination node (" + destinationNode.getName() + ")", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.addDestinationPortToDestinationNode(eagle, edgeId)}, "Add destination port to destination node");
            Edge.isValidLog(edgeId, Edge.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            return Edge.Validity.Impossible;
        }

        // check that we are not connecting a port to itself
        if (sourcePortId === destinationPortId){
            Edge.isValidLog(edgeId, Edge.Validity.Impossible, Errors.Show("Source port and destination port are the same", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
            return Edge.Validity.Impossible;
        }

        // check that source is output
        if (!sourcePort.isOutputPort()){
            const issue: Errors.Issue = Errors.ShowFix("Source port is not output port (" + sourcePort.getUsage() + ")", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixFieldUsage(eagle, sourcePort, Daliuge.FieldUsage.OutputPort)}, "Add output usage to source port");
            Edge.isValidLog(edgeId, Edge.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            return Edge.Validity.Impossible;
        }

        // check that destination in input
        if (!destinationPort.isInputPort()){
            const issue: Errors.Issue = Errors.ShowFix("Destination port is not input port (" + destinationPort.getUsage() + ")", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixFieldUsage(eagle, destinationPort, Daliuge.FieldUsage.InputPort)}, "Add input usage to destination port");
            Edge.isValidLog(edgeId, Edge.Validity.Impossible, issue, showNotification, showConsole, errorsWarnings);
            return Edge.Validity.Impossible;
        }

        if (sourcePort !== null && destinationPort !== null){
            // check that source and destination port are both event, or both not event
            if ((sourcePort.getIsEvent() && !destinationPort.getIsEvent()) || (!sourcePort.getIsEvent() && destinationPort.getIsEvent())){
                Edge.isValidLog(edgeId, Edge.Validity.Invalid, Errors.Show("Source port and destination port are mix of event and non-event ports", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
            }
        }

        // check relationship of destination Node in relation to source node
        const isParentOfConstruct : boolean = sourceNode.getParentKey() === destinationNode.getEmbedKey() && sourceNode.getParentKey() !== null; // is the connection from a child of a construct to an embedded app of the same construct
        const isChildOfConstruct : boolean = destinationNode.getParentKey() === sourceNode.getEmbedKey() && destinationNode.getParentKey() !== null; //is the connections from an embedded app of a construct to a child of that same construct
        const isSibling : boolean = sourceNode.getParentKey() === destinationNode.getParentKey(); // do the two nodes have the same parent
        let associatedConstructType : Category = null; //the category type of the parent construct of the source or destination node

        //these checks are to see if the source or destination node are embedded apps whose parent is a sibling of the other source or destination node
        const destPortIsEmbeddedAppOfSibling : boolean = sourceNode.getParentKey() !== null && destinationNode.getEmbedKey() !== null && sourceNode.getParentKey() === eagle.logicalGraph().findNodeByKeyQuiet(destinationNode.getEmbedKey())?.getParentKey();
        const srcPortIsEmbeddedAppOfSibling : boolean = destinationNode.getParentKey() !== null && sourceNode.getEmbedKey() !== null && destinationNode.getParentKey() === eagle.logicalGraph().findNodeByKeyQuiet(sourceNode.getEmbedKey())?.getParentKey();

        //checking the type of the parent nodes
        if(!isSibling){
            const srcNodeParent = eagle.logicalGraph().findNodeByKeyQuiet(sourceNode.getParentKey())
            const destNodeParent = eagle.logicalGraph().findNodeByKeyQuiet  (destinationNode.getParentKey())

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
                Edge.isValidLog(edgeId, Edge.Validity.Invalid, x, showNotification, showConsole, errorsWarnings);
            }
        }

        //checking if the edge is un-necessarily loopAware
        if(    isSibling && loopAware 
            || destPortIsEmbeddedAppOfSibling && loopAware
            || srcPortIsEmbeddedAppOfSibling && loopAware
            || sourceNode.getEmbedKey() !== null && sourceNode.getEmbedKey() === destinationNode.getParentKey() && loopAware 
            || destinationNode.getEmbedKey() !== null && destinationNode.getEmbedKey() === sourceNode.getParentKey() && loopAware
            || associatedConstructType !== Category.Loop && loopAware
        ){
            const x = Errors.ShowFix("An edge between two siblings should not be loop aware", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixDisableEdgeLoopAware(eagle, edgeId);}, "Disable loop aware on the edge.");
            Edge.isValidLog(edgeId, Edge.Validity.Warning, x, showNotification, showConsole, errorsWarnings);
        }

        // if link is not a parent, child or sibling, then warn user
        if (associatedConstructType !== Category.ExclusiveForceNode && associatedConstructType !== Category.Loop && !isSibling && !isParentOfConstruct && !isChildOfConstruct && !destPortIsEmbeddedAppOfSibling && !srcPortIsEmbeddedAppOfSibling){
                Edge.isValidLog(edgeId, Edge.Validity.Warning, Errors.Show("Edge is not between siblings, or between a child and its parent's embedded Application. It could be incorrect or computationally expensive", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        // check if the edge already exists in the graph, there is no point in a duplicate
        for (const edge of eagle.logicalGraph().getEdges()){
            const isSrcMatch = edge.getSrcNodeKey() === sourceNodeKey && edge.getSrcPortId() === sourcePortId;
            const isDestMatch = edge.getDestNodeKey() === destinationNodeKey && edge.getDestPortId() === destinationPortId;

            if ( isSrcMatch && isDestMatch && edge.getId() !== edgeId){
                const x = Errors.ShowFix("Edge is a duplicate. Another edge with the same source port and destination port already exists", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixDeleteEdge(eagle, edgeId);}, "Delete edge");
                Edge.isValidLog(edgeId, Edge.Validity.Invalid, x, showNotification, showConsole, errorsWarnings);
            }
        }

        // check that all "closes loop" edges:
        // - begin from a Data component
        // - end with a App component
        // - sourceNode has a 'group_end' field set to true
        // - destNode has a 'group_start' field set to true
        if (closesLoop){
            if (!sourceNode.isData()){
                const x = Errors.Show("Closes Loop Edge (" + edgeId + ") does not start from a Data component.", function(){Utils.showEdge(eagle, edgeId);});
                Edge.isValidLog(edgeId, Edge.Validity.Invalid, x, showNotification, showConsole, errorsWarnings);
            }

            if (!destinationNode.isApplication()){
                const x = Errors.Show("Closes Loop Edge (" + edgeId + ") does not end at an Application component.", function(){Utils.showEdge(eagle, edgeId);});
                Edge.isValidLog(edgeId, Edge.Validity.Invalid, x, showNotification, showConsole, errorsWarnings);
            }

            if (!sourceNode.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_END) || !Utils.asBool(sourceNode.getFieldByDisplayText(Daliuge.FieldName.GROUP_END).getValue())){
                const x = Errors.ShowFix("'Closes Loop' Edge (" + edgeId + ") start node (" + sourceNode.getName() + ") does not have 'group_end' set to true.", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixFieldValue(eagle, sourceNode, Daliuge.groupEndField, "true")}, "Set 'group_end' to true");
                Edge.isValidLog(edgeId, Edge.Validity.Invalid, x, showNotification, showConsole, errorsWarnings);
            }

            if (!destinationNode.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_START) || !Utils.asBool(destinationNode.getFieldByDisplayText(Daliuge.FieldName.GROUP_START).getValue())){
                const x = Errors.ShowFix("'Closes Loop' Edge (" + edgeId + ") end node (" + destinationNode.getName() + ") does not have 'group_start' set to true.", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixFieldValue(eagle, destinationNode, Daliuge.groupStartField, "true")}, "Set 'group_start' to true");
                Edge.isValidLog(edgeId, Edge.Validity.Invalid, x, showNotification, showConsole, errorsWarnings);
            }
        }

        return Utils.worstEdgeError(errorsWarnings);
    }

    private static isValidLog(edgeId : string, linkValid : Edge.Validity, issue: Errors.Issue, showNotification : boolean, showConsole : boolean, errorsWarnings: Errors.ErrorsWarnings) : void {
        // determine correct title
        let title = "Edge Valid";
        let type : "success" | "info" | "warning" | "danger" = "success";
        let message = "";

        switch (linkValid){
            case Edge.Validity.Warning:
                title = "Edge Warning";
                type = "warning";
                break;
            case Edge.Validity.Impossible:
                title = "Edge Impossible";
                type = "danger";
                break;
            case Edge.Validity.Invalid:
                title = "Edge Invalid";
                type = "danger";
                break;
        }

        // add edge id to message, if id is known
        if (edgeId !== null){
            message = "Edge (" + edgeId + ") " + issue.message;
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
    }
}

export namespace Edge {
    export enum Validity {
        Unknown = "Unknown",        // validity of the edge is unknown
        Impossible = "Impossible",  // never useful or valid
        Invalid = "Invalid",        // invalid, but possibly useful for expert users?
        Warning = "Warning",        // valid, but some issue that the user should be aware of
        Valid = "Valid"             // fine
    }
}
