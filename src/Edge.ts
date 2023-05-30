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
import { CategoryData } from './CategoryData';
import { Daliuge } from './Daliuge';
import { Eagle } from './Eagle';
import { LogicalGraph } from './LogicalGraph';
import { Node } from './Node';
import { Field } from './Field';
import { Utils } from './Utils';
import { Errors } from './Errors';

export class Edge {
    private id: string
    private srcNode: Node;
    private srcPort: Field;
    private destNode: Node;
    private destPort: Field;
    private loopAware: boolean; // indicates the user is aware that the components at either end of the edge may differ in multiplicity
    private closesLoop: boolean; // indicates that this is a special type of edge that can be drawn in eagle to specify the start/end of groups.
    private selectionRelative: boolean // indicates if the edge is either selected or attatched to a selected node

    constructor(srcNode: Node, srcPort: Field, destNode: Node, destPort: Field, loopAware: boolean, closesLoop: boolean, selectionRelative: boolean){
        this.id = Utils.uuidv4();

        this.srcNode = srcNode;
        this.srcPort = srcPort;
        this.destNode = destNode;
        this.destPort = destPort;

        this.loopAware = loopAware;
        this.closesLoop = closesLoop;
        this.selectionRelative = selectionRelative;
    }

    getId = () : string => {
        return this.id;
    }

    setId = (id: string) => {
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

    getSelectionRelative = () : boolean => {
        return this.selectionRelative;
    }

    setDestPort = (field: Field) : void => {
        this.destPort = field;
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

    clear = () : void => {
        this.id = "";
        this.srcNode = null;
        this.srcPort = null;
        this.destNode = null;
        this.destPort = null;
        this.loopAware = false;
        this.closesLoop = false;
    }

    clone = () : Edge => {
        const result : Edge = new Edge(this.srcNode, this.srcPort, this.destNode, this.destPort, this.loopAware, this.closesLoop, this.selectionRelative);

        result.id = this.id;

        return result;
    }

    getErrorsWarnings = (eagle: Eagle): Errors.ErrorsWarnings => {
        const result: {warnings: Errors.Issue[], errors: Errors.Issue[]} = {warnings: [], errors: []};

        Edge.isValid(eagle, this, false, false, result);

        return result;
    }

    static getUniqueKey = (index: number, srcNode: Node, destNode: Node): string => {
        return (index + 1) + ":" + srcNode.getName() + srcNode.getKey() + ">>" + destNode.getName() + destNode.getKey();
    }

    static toAppRefJson = (edge : Edge, srcPort: Field, destPort: Field) : object => {
        return {
            //srcNodeKey: edge.srcNodeKey,
            //destNodeKey: edge.destNodeKey,
            fromPort: srcPort.getId(),
            toPort: destPort.getId(),            
            loopAware: edge.loopAware,
            closesLoop: edge.closesLoop,
            id: edge.id,
            fromField: srcPort.getDisplayText(),
            toField: destPort.getDisplayText()
        };
    }

    static fromAppRefJson = (linkData: any, logicalGraph: LogicalGraph, errorsWarnings: Errors.ErrorsWarnings) : Edge => {
        let srcNodeKey : number = 0;
        let destNodeKey : number = 0;
        let srcPortId: string = "";
        let destPortId: string = "";
        let loopAware: boolean = false;
        let closesLoop: boolean = false;
        let id: string = "";
        let fromField: string = "";
        let toField: string = "";

        if (typeof linkData.from === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'from' attribute"));
        } else {
            srcNodeKey = linkData.from;
        }
        if (typeof linkData.to === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'to' attribute"));
        } else {
            destNodeKey = linkData.to;
        }

        if (typeof linkData.fromPort === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'fromPort' attribute"));
        } else {
            srcPortId = linkData.fromPort;
        }
        if (typeof linkData.toPort === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'toPort' attribute"));
        } else {
            destPortId = linkData.toPort;
        }

        // try to read loopAware attribute
        if (typeof linkData.loopAware !== 'undefined'){
            loopAware = linkData.loopAware;
        }

        // try to read the closesLoop attribute
        if (typeof linkData.closesLoop !== 'undefined'){
            closesLoop = linkData.closesLoop;
        }
        // try to read the id
        if (typeof linkData.id !== 'undefined'){
            id = linkData.id;
        } else {
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'id' attribute. Generating new id"));
            id = Utils.uuidv4();
        }

        if (typeof linkData.fromField === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'fromField' attribute"));
        } else {
            fromField = linkData.fromField;
        }
        if (typeof linkData.toField === 'undefined'){
            errorsWarnings.warnings.push(Errors.Message("Edge is missing a 'toField' attribute"));
        } else {
            toField = linkData.toField;
        }

        let srcNode: Node = null;
        if (srcNodeKey === 0){
            srcNode = logicalGraph.findNodeByFieldId(srcPortId);
        } else {
            srcNode = logicalGraph.findNodeByKey(srcNodeKey);
        }

        const fromPort: Field = srcNode.findFieldById(srcPortId);

        let destNode: Node = null;
        if (destNodeKey === 0){
            destNode = logicalGraph.findNodeByFieldId(destPortId);
        } else {
            destNode = logicalGraph.findNodeByKey(destNodeKey);
        }

        const toPort: Field = destNode.findFieldById(destPortId);

        const edge = new Edge(srcNode, fromPort, destNode, toPort, loopAware, closesLoop, false);
        edge.setId(id);

        return edge;
    }

    static toOJSJson = (edge: Edge): object => {
        return {
            from: edge.srcNode.getKey(),
            fromPort: edge.srcPort.getId(),
            to: edge.destNode.getKey(),
            toPort: edge.destPort.getId(),
            loop_aware: edge.loopAware ? "1" : "0",
            closesLoop: edge.closesLoop
        };
    }

    static fromOJSJson = (linkData: any, logicalGraph: LogicalGraph, errorsWarnings: Errors.ErrorsWarnings) : Edge => {
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

        const srcNode: Node = logicalGraph.findNodeByKey(srcNodeKey);
        const srcPort: Field = srcNode.findFieldById(srcPortId);
        const destNode: Node = logicalGraph.findNodeByKey(destNodeKey);
        const destPort: Field = destNode.findFieldById(destPortId);

        if (srcNode === null){
            errorsWarnings.warnings.push(Errors.Message("Edge couldn't find source node " + srcNodeKey + " for edge"));
        }

        if (destNode === null){
            errorsWarnings.warnings.push(Errors.Message("Couldn't find destination node " + destNodeKey + " for edge"));
        }

        if (srcPort === null){
            errorsWarnings.warnings.push(Errors.Message("Couldn't find source port " + srcPortId + " for edge"));
        }

        if (destPort === null){
            errorsWarnings.warnings.push(Errors.Message("Couldn't find destination port " + destPortId + " for edge"));
        }

        if (srcNode === null || destNode === null || srcPort === null || destPort === null){
            return null;
        } else {
            return new Edge(srcNode, srcPort, destNode, destPort, loopAware, closesLoop, false);
        }
    }

    // TODO: switch to input of nodes and fields instead of nodeKeys and fieldIds?
    static isValid = (eagle: Eagle, edge: Edge, showNotification : boolean, showConsole : boolean, errorsWarnings: Errors.ErrorsWarnings) : Eagle.LinkValid => {
        // check that the edge.srcNode and edge.destNode could be found
        if (edge.srcNode === null || typeof edge.srcNode === "undefined"){
            const issue = Errors.Fix("Edge (" + edge.id + ") edge.srcNode (" + edge.srcNode.getKey() + ") is null or undefined", function(){Utils.showEdge(eagle, edge.id)}, function(){Utils.fixDeleteEdge(eagle, edge.id)}, "Delete edge");
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }
        if (edge.destNode === null || typeof edge.destNode === "undefined"){
            const issue = Errors.Fix("Edge (" + edge.id + ") edge.destNodeKey (" + edge.destNode.getKey() + ") is null or undefined", function(){Utils.showEdge(eagle, edge.id)}, function(){Utils.fixDeleteEdge(eagle, edge.id)}, "Delete edge");
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        // check that we are not connecting a Data component to a Data component, that is not supported
        if (edge.srcNode.getCategoryType() === Category.Type.Data && edge.destNode.getCategoryType() === Category.Type.Data){
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, Errors.Show("Edge (" + edge.id + "): data nodes may not be connected directly to other data nodes", function(){Utils.showEdge(eagle, edge.id);}), showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        // if source node or destination node is a construct, then something is wrong, constructs should not have ports
        if (edge.srcNode.getCategoryType() === Category.Type.Construct){
            const issue: Errors.Issue = Errors.Fix("Edge (" + edge.id + ") cannot have a source node (" + edge.srcNode.getName() + ") that is a construct", function(){Utils.showEdge(eagle, edge.id)}, function(){Utils.fixMoveEdgeToEmbeddedApplication(eagle, edge.id)}, "Move edge to embedded application");
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
        }
        if (edge.destNode.getCategoryType() === Category.Type.Construct){
            const issue: Errors.Issue = Errors.Fix("Edge (" + edge.id + ") cannot have a destination node (" + edge.destNode.getName() + ") that is a construct", function(){Utils.showEdge(eagle, edge.id)}, function(){Utils.fixMoveEdgeToEmbeddedApplication(eagle, edge.id)}, "Move edge to embedded application");
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
        }

        // check that we are not connecting two ports within the same node
        if (edge.srcNode.getKey() === edge.destNode.getKey()){
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, Errors.Show("edge.srcNodeKey and edge.destNodeKey are the same", function(){Utils.showEdge(eagle, edge.id);}), showNotification, showConsole, errorsWarnings);
        }

        // if source node is a memory, and destination is a BashShellApp, OR
        // if source node is a memory, and destination is a Group with inputApplicationType BashShellApp
        // this is not supported. How would a BashShellApp read data from another process?
        if ((edge.srcNode.getCategory() === Category.Memory && edge.destNode.getCategory() === Category.BashShellApp) ||
            (edge.srcNode.getCategory() === Category.Memory && edge.destNode.isGroup() && edge.destNode.getInputApplication() !== undefined && edge.destNode.hasInputApplication() && edge.destNode.getInputApplication().getCategory() === Category.BashShellApp)){
            const issue: Errors.Issue = Errors.Fix("output from Memory Node cannot be input into a BashShellApp or input into a Group Node with a BashShellApp inputApplicationType", function(){Utils.showNode(eagle, edge.srcNode.getKey())}, function(){Utils.fixNodeCategory(eagle, edge.srcNode, Category.File)}, "Change data component type to File");
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
        }

        // check if source port was found
        if (edge.srcPort === null) {
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, Errors.Show("Source port doesn't exist on source node", function(){Utils.showEdge(eagle, edge.id);}), showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        // check if destination port was found
        if (edge.destPort === null){
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, Errors.Show("Destination port doesn't exist on destination node", function(){Utils.showEdge(eagle, edge.id);}), showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        // check that we are not connecting a port to itself
        if (edge.srcPort.getId() === edge.destPort.getId()){
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, Errors.Show("Source port and destination port are the same", function(){Utils.showEdge(eagle, edge.id);}), showNotification, showConsole, errorsWarnings);
        }

        // check that source is output
        if (!edge.srcPort.isOutputPort()){
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, Errors.Show("Source port is not output port (" + edge.srcPort.getUsage() + ")", function(){Utils.showEdge(eagle, edge.id);}), showNotification, showConsole, errorsWarnings);
        }

        // check that destination in input
        if (!edge.destPort.isInputPort()){
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, Errors.Show("Destination port is not input port (" + edge.destPort.getUsage() + ")", function(){Utils.showEdge(eagle, edge.id);}), showNotification, showConsole, errorsWarnings);
        }

        if (edge.srcPort !== null && edge.destPort !== null){
            // check that source and destination port are both event, or both not event
            if ((edge.srcPort.getIsEvent() && !edge.destPort.getIsEvent()) || (!edge.srcPort.getIsEvent() && edge.destPort.getIsEvent())){
                Edge.isValidLog(edge, Eagle.LinkValid.Invalid, Errors.Show("Source port and destination port are mix of event and non-event ports", function(){Utils.showEdge(eagle, edge.id);}), showNotification, showConsole, errorsWarnings);
            }
        }

        // check relationship between destination and source node
        const isParent : boolean = edge.srcNode.getParentKey() === edge.destNode.getKey();
        const isParentOfConstruct : boolean = edge.srcNode.getParentKey() === edge.destNode.getEmbedKey() && edge.srcNode.getParentKey() !== null;
        const isChild : boolean = edge.destNode.getParentKey() === edge.srcNode.getKey();
        const isChildOfConstruct : boolean = edge.destNode.getParentKey() === edge.srcNode.getEmbedKey() && edge.destNode.getParentKey() !== null;
        const isSibling : boolean = edge.srcNode.getParentKey() === edge.destNode.getParentKey();
        let parentIsEFN : boolean = false;

        // determine if the new edge is crossing a ExclusiveForceNode boundary
        if (edge.destNode.getParentKey() !== null){
            if (eagle.logicalGraph().findNodeByKey(edge.destNode.getParentKey()) !== null){
                parentIsEFN = eagle.logicalGraph().findNodeByKey(edge.destNode.getParentKey()).getCategory() === Category.ExclusiveForceNode;
            }
        }
        if (edge.srcNode.getParentKey() !== null){
            if (eagle.logicalGraph().findNodeByKey(edge.srcNode.getParentKey()) !== null){
                parentIsEFN = eagle.logicalGraph().findNodeByKey(edge.srcNode.getParentKey()).getCategory() === Category.ExclusiveForceNode;
            }
        }

        // debug
        //console.log("isParent", isParent, "isParentOfConstruct", isParentOfConstruct, "isChild", isChild, "isChildOfConstruct", isChildOfConstruct, "isSibling", isSibling, "parentIsEFN", parentIsEFN);

        // if a node is connecting to its parent, it must connect to the local port
        if (isParent && !edge.destNode.hasLocalPortWithId(edge.destPort.getId())){
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, Errors.Show("Source port is connecting to its parent, yet destination port is not local", function(){Utils.showEdge(eagle, edge.id);}), showNotification, showConsole, errorsWarnings);
        }

        // if a node is connecting to a child, it must start from the local port
        if (isChild && !edge.srcNode.hasLocalPortWithId(edge.srcPort.getId())){
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, Errors.Show("Source connecting to child, yet source port is not local", function(){Utils.showEdge(eagle, edge.id);}), showNotification, showConsole, errorsWarnings);
        }

        // if destination node is not a child, destination port cannot be a local port
        if (!parentIsEFN && !isParent && edge.destNode.hasLocalPortWithId(edge.destPort.getId())){
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, Errors.Show("Source is not a child of destination, yet destination port is local", function(){Utils.showEdge(eagle, edge.id);}), showNotification, showConsole, errorsWarnings);
        }

        if (!parentIsEFN && !isChild && edge.srcNode.hasLocalPortWithId(edge.srcPort.getId())){
            Edge.isValidLog(edge, Eagle.LinkValid.Invalid, Errors.Show("Destination is not a child of source, yet source port is local", function(){Utils.showEdge(eagle, edge.id);}), showNotification, showConsole, errorsWarnings);
        }

        if (edge.srcPort !== null && edge.destPort !== null){
            // abort if source port and destination port have different data types
            if (!Utils.portsMatch(edge.srcPort, edge.destPort)){
                const x = Errors.Fix("Source and destination ports don't match: edge.srcPort (" + edge.srcPort.getDisplayText() + ":" + edge.srcPort.getType() + ") edge.destPort (" + edge.destPort.getDisplayText() + ":" + edge.destPort.getType() + ")", function(){Utils.showEdge(eagle, edge.id);}, function(){Utils.fixPortType(eagle, edge.srcPort, edge.destPort);}, "Overwrite destination port type with source port type");
                Edge.isValidLog(edge, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }
        }

        // if link is not a parent, child or sibling, then warn user
        if (!parentIsEFN && !isParent && !isChild && !isSibling && !edge.isLoopAware() && !isParentOfConstruct && !isChildOfConstruct){
            Edge.isValidLog(edge, Eagle.LinkValid.Warning, Errors.Show("Edge is not child->parent, parent->child or between siblings. It could be incorrect or computationally expensive", function(){Utils.showEdge(eagle, edge.id);}), showNotification, showConsole, errorsWarnings);
        }

        // check if the edge already exists in the graph, there is no point in a duplicate
        for (const e of eagle.logicalGraph().getEdges()){
            if (e.getSrcPort().getId() === edge.srcPort.getId() && e.getDestPort().getId() === edge.destPort.getId() && e.getId() !== edge.id){
                const x = Errors.Fix("Edge is a duplicate. Another edge with the same source port and destination port already exists", function(){Utils.showEdge(eagle, edge.id);}, function(){Utils.fixDeleteEdge(eagle, edge.id);}, "Delete edge");
                Edge.isValidLog(edge, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }
        }

        // check that all "closes loop" edges:
        // - begin from a Data component
        // - end with a App component
        // - edge.srcNode has a 'group_end' field set to true
        // - destNode has a 'group_start' field set to true
        if (edge.closesLoop){
            if (!edge.srcNode.isData()){
                const x = Errors.Show("'Closes Loop' Edge (" + edge.id + ") does not start from a Data component.", function(){Utils.showEdge(eagle, edge.id);});
                Edge.isValidLog(edge, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }

            if (!edge.destNode.isApplication()){
                const x = Errors.Show("'Closes Loop' Edge (" + edge.id + ") does not end at an Application component.", function(){Utils.showEdge(eagle, edge.id);});
                Edge.isValidLog(edge, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }

            if (!edge.srcNode.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_END) || !Utils.asBool(edge.srcNode.getFieldByDisplayText(Daliuge.FieldName.GROUP_END).getValue())){
                const x = Errors.Fix("'Closes Loop' Edge (" + edge.id + ") start node (" + edge.srcNode.getName() + ") does not have 'group_end' set to true.", function(){Utils.showEdge(eagle, edge.id);}, function(){Utils.fixFieldValue(eagle, edge.srcNode, Daliuge.groupEndField, "true")}, "Set 'group_end' to true");
                Edge.isValidLog(edge, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }

            if (!edge.destNode.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_START) || !Utils.asBool(edge.destNode.getFieldByDisplayText(Daliuge.FieldName.GROUP_START).getValue())){
                const x = Errors.Fix("'Closes Loop' Edge (" + edge.id + ") end node (" + edge.destNode.getName() + ") does not have 'group_start' set to true.", function(){Utils.showEdge(eagle, edge.id);}, function(){Utils.fixFieldValue(eagle, edge.destNode, Daliuge.groupStartField, "true")}, "Set 'group_start' to true");
                Edge.isValidLog(edge, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }
        }

        return Utils.worstEdgeError(errorsWarnings);
    }

    private static isValidLog = (edge: Edge, linkValid : Eagle.LinkValid, issue: Errors.Issue, showNotification : boolean, showConsole : boolean, errorsWarnings: Errors.ErrorsWarnings) : void => {
        // determine correct title
        let title = "Edge Valid";
        let type : "success" | "info" | "warning" | "danger" = "success";
        let message = "";

        switch (linkValid){
            case Eagle.LinkValid.Warning:
            title = "Edge Warning";
            type = "warning";
            break;
            case Eagle.LinkValid.Invalid:
            title = "Edge Invalid";
            type = "danger";
            break;
        }

        // add edge id to message, if id is known
        if (edge !== null){
            message = "Edge (" + edge.id + ") " + issue.message;
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
