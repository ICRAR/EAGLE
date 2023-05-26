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
    private _id: string
    private srcNode: Node;
    private srcPort: Field;
    private destNode: Node;
    private destPort: Field;
    private loopAware: boolean; // indicates the user is aware that the components at either end of the edge may differ in multiplicity
    private closesLoop: boolean; // indicates that this is a special type of edge that can be drawn in eagle to specify the start/end of groups.
    private selectionRelative: boolean // indicates if the edge is either selected or attatched to a selected node

    constructor(srcNode: Node, srcPort: Field, destNode: Node, destPort: Field, loopAware: boolean, closesLoop: boolean, selectionRelative: boolean){
        this._id = Utils.uuidv4();

        this.srcNode = srcNode;
        this.srcPort = srcPort;
        this.destNode = destNode;
        this.destPort = destPort;

        this.loopAware = loopAware;
        this.closesLoop = closesLoop;
        this.selectionRelative = selectionRelative;
    }

    getId = () : string => {
        return this._id;
    }

    setId = (id: string) => {
        this._id = id;
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
        this._id = "";
        this.srcNode = null;
        this.srcPort = null;
        this.destNode = null;
        this.destPort = null;
        this.loopAware = false;
        this.closesLoop = false;
    }

    clone = () : Edge => {
        const result : Edge = new Edge(this.srcNode, this.srcPort, this.destNode, this.destPort, this.loopAware, this.closesLoop, this.selectionRelative);

        result._id = this._id;

        return result;
    }

    getErrorsWarnings = (eagle: Eagle): Errors.ErrorsWarnings => {
        const result: {warnings: Errors.Issue[], errors: Errors.Issue[]} = {warnings: [], errors: []};

        Edge.isValid(eagle, this._id, this.srcNode.getKey(), this.srcPort.getId(), this.destNode.getKey(), this.destPort.getId(), this.loopAware, this.closesLoop, false, false, result);

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
            id: edge._id,
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

        return new Edge(srcNode, srcPort, destNode, destPort, loopAware, closesLoop, false);
    }

    // TODO: switch to input of nodes and fields instead of nodeKeys and fieldIds?
    static isValid = (eagle: Eagle, edgeId: string, sourceNodeKey : number, sourcePortId : string, destinationNodeKey : number, destinationPortId : string, loopAware: boolean, closesLoop: boolean, showNotification : boolean, showConsole : boolean, errorsWarnings: Errors.ErrorsWarnings) : Eagle.LinkValid => {
        // check for problems
        if (isNaN(sourceNodeKey)){
            return Eagle.LinkValid.Unknown;
        }

        if (isNaN(destinationNodeKey)){
            return Eagle.LinkValid.Unknown;
        }

        if (sourcePortId === ""){
            const issue = Errors.Fix("source port has no id", function(){Utils.showNode(eagle, sourceNodeKey)}, function(){Utils.fixNodeFieldIds(eagle, sourceNodeKey)}, "Generate ids for ports on source node");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        if (destinationPortId === ""){
            const issue = Errors.Fix("destination port has no id", function(){Utils.showNode(eagle, destinationNodeKey)}, function(){Utils.fixNodeFieldIds(eagle, sourceNodeKey)}, "Generate ids for ports on destination node");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        if (sourcePortId === null){
            const issue = Errors.Fix("source port id is null", function(){Utils.showNode(eagle, sourceNodeKey)}, function(){Utils.fixNodeFieldIds(eagle, sourceNodeKey)}, "Generate ids for ports on source node");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        if (destinationPortId === null){
            const issue = Errors.Fix("destination port id is null", function(){Utils.showNode(eagle, destinationNodeKey)}, function(){Utils.fixNodeFieldIds(eagle, sourceNodeKey)}, "Generate ids for ports on destination node");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        if (sourceNodeKey === null){
            const issue = Errors.Fix("Edge (" + edgeId + ") sourceNodeKey is null", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixDeleteEdge(eagle, edgeId)}, "Delete edge");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        if (destinationNodeKey === null){
            const issue = Errors.Fix("Edge (" + edgeId + ") destinationNodeKey is null", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixDeleteEdge(eagle, edgeId)}, "Delete edge");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        // get references to actual source and destination nodes (from the keys)
        const sourceNode : Node = eagle.logicalGraph().findNodeByKey(sourceNodeKey);
        const destinationNode : Node = eagle.logicalGraph().findNodeByKey(destinationNodeKey);

        // check that the sourceNode and destinationNode could be found
        if (sourceNode === null || typeof sourceNode === "undefined"){
            const issue = Errors.Fix("Edge (" + edgeId + ") sourceNodeKey (" + sourceNodeKey + ") refers to a node that does not exist", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixDeleteEdge(eagle, edgeId)}, "Delete edge");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }
        if (destinationNode === null || typeof destinationNode === "undefined"){
            const issue = Errors.Fix("Edge (" + edgeId + ") destinationNodeKey (" + destinationNodeKey + ") refers to a node that does not exist", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixDeleteEdge(eagle, edgeId)}, "Delete edge");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        // check that we are not connecting a Data component to a Data component, that is not supported
        if (sourceNode.getCategoryType() === Category.Type.Data && destinationNode.getCategoryType() === Category.Type.Data){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Data nodes may not be connected directly to other Data nodes", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        // if source node or destination node is a construct, then something is wrong, constructs should not have ports
        if (sourceNode.getCategoryType() === Category.Type.Construct){
            const issue: Errors.Issue = Errors.Fix("Edge (" + edgeId + ") cannot have a source node (" + sourceNode.getName() + ") that is a construct", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixMoveEdgeToEmbeddedApplication(eagle, edgeId)}, "Move edge to embedded application");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
        }
        if (destinationNode.getCategoryType() === Category.Type.Construct){
            const issue: Errors.Issue = Errors.Fix("Edge (" + edgeId + ") cannot have a destination node (" + destinationNode.getName() + ") that is a construct", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixMoveEdgeToEmbeddedApplication(eagle, edgeId)}, "Move edge to embedded application");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
        }

        // check that we are not connecting two ports within the same node
        if (sourceNodeKey === destinationNodeKey){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("sourceNodeKey and destinationNodeKey are the same", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        // if source node is a memory, and destination is a BashShellApp, OR
        // if source node is a memory, and destination is a Group with inputApplicationType BashShellApp
        // this is not supported. How would a BashShellApp read data from another process?
        if ((sourceNode.getCategory() === Category.Memory && destinationNode.getCategory() === Category.BashShellApp) ||
            (sourceNode.getCategory() === Category.Memory && destinationNode.isGroup() && destinationNode.getInputApplication() !== undefined && destinationNode.hasInputApplication() && destinationNode.getInputApplication().getCategory() === Category.BashShellApp)){
            const issue: Errors.Issue = Errors.Fix("output from Memory Node cannot be input into a BashShellApp or input into a Group Node with a BashShellApp inputApplicationType", function(){Utils.showNode(eagle, sourceNodeKey)}, function(){Utils.fixNodeCategory(eagle, sourceNode, Category.File)}, "Change data component type to File");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
        }

        const sourcePort : Field = sourceNode.findFieldById(sourcePortId);
        const destinationPort : Field = destinationNode.findFieldById(destinationPortId);

        // check if source port was found
        if (sourcePort === null) {
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Source port doesn't exist on source node", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        // check if destination port was found
        if (destinationPort === null){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Destination port doesn't exist on destination node", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        // check that we are not connecting a port to itself
        if (sourcePortId === destinationPortId){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Source port and destination port are the same", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        // check that source is output
        if (!sourcePort.isOutputPort()){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Source port is not output port (" + sourcePort.getUsage() + ")", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        // check that destination in input
        if (!destinationPort.isInputPort()){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Destination port is not input port (" + destinationPort.getUsage() + ")", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        if (sourcePort !== null && destinationPort !== null){
            // check that source and destination port are both event, or both not event
            if ((sourcePort.getIsEvent() && !destinationPort.getIsEvent()) || (!sourcePort.getIsEvent() && destinationPort.getIsEvent())){
                Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Source port and destination port are mix of event and non-event ports", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
            }
        }

        // check relationship between destination and source node
        const isParent : boolean = sourceNode.getParentKey() === destinationNodeKey;
        const isParentOfConstruct : boolean = sourceNode.getParentKey() === destinationNode.getEmbedKey() && sourceNode.getParentKey() !== null;
        const isChild : boolean = destinationNode.getParentKey() === sourceNodeKey;
        const isChildOfConstruct : boolean = destinationNode.getParentKey() === sourceNode.getEmbedKey() && destinationNode.getParentKey() !== null;
        const isSibling : boolean = sourceNode.getParentKey() === destinationNode.getParentKey();
        let parentIsEFN : boolean = false;

        // determine if the new edge is crossing a ExclusiveForceNode boundary
        if (destinationNode.getParentKey() !== null){
            if (eagle.logicalGraph().findNodeByKey(destinationNode.getParentKey()) !== null){
                parentIsEFN = eagle.logicalGraph().findNodeByKey(destinationNode.getParentKey()).getCategory() === Category.ExclusiveForceNode;
            }
        }
        if (sourceNode.getParentKey() !== null){
            if (eagle.logicalGraph().findNodeByKey(sourceNode.getParentKey()) !== null){
                parentIsEFN = eagle.logicalGraph().findNodeByKey(sourceNode.getParentKey()).getCategory() === Category.ExclusiveForceNode;
            }
        }

        // debug
        //console.log("isParent", isParent, "isParentOfConstruct", isParentOfConstruct, "isChild", isChild, "isChildOfConstruct", isChildOfConstruct, "isSibling", isSibling, "parentIsEFN", parentIsEFN);

        // if a node is connecting to its parent, it must connect to the local port
        if (isParent && !destinationNode.hasLocalPortWithId(destinationPortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Source port is connecting to its parent, yet destination port is not local", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        // if a node is connecting to a child, it must start from the local port
        if (isChild && !sourceNode.hasLocalPortWithId(sourcePortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Source connecting to child, yet source port is not local", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        // if destination node is not a child, destination port cannot be a local port
        if (!parentIsEFN && !isParent && destinationNode.hasLocalPortWithId(destinationPortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Source is not a child of destination, yet destination port is local", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        if (!parentIsEFN && !isChild && sourceNode.hasLocalPortWithId(sourcePortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Destination is not a child of source, yet source port is local", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        if (sourcePort !== null && destinationPort !== null){
            // abort if source port and destination port have different data types
            if (!Utils.portsMatch(sourcePort, destinationPort)){
                const x = Errors.Fix("Source and destination ports don't match: sourcePort (" + sourcePort.getDisplayText() + ":" + sourcePort.getType() + ") destinationPort (" + destinationPort.getDisplayText() + ":" + destinationPort.getType() + ")", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixPortType(eagle, sourcePort, destinationPort);}, "Overwrite destination port type with source port type");
                Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }
        }

        // if link is not a parent, child or sibling, then warn user
        if (!parentIsEFN && !isParent && !isChild && !isSibling && !loopAware && !isParentOfConstruct && !isChildOfConstruct){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Warning, Errors.Show("Edge is not child->parent, parent->child or between siblings. It could be incorrect or computationally expensive", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        // check if the edge already exists in the graph, there is no point in a duplicate
        for (const edge of eagle.logicalGraph().getEdges()){
            if (edge.getSrcPort().getId() === sourcePortId && edge.getDestPort().getId() === destinationPortId && edge.getId() !== edgeId){
                const x = Errors.Fix("Edge is a duplicate. Another edge with the same source port and destination port already exists", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixDeleteEdge(eagle, edgeId);}, "Delete edge");
                Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
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
                Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }

            if (!destinationNode.isApplication()){
                const x = Errors.Show("Closes Loop Edge (" + edgeId + ") does not end at an Application component.", function(){Utils.showEdge(eagle, edgeId);});
                Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }

            if (!sourceNode.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_END) || !Utils.asBool(sourceNode.getFieldByDisplayText(Daliuge.FieldName.GROUP_END).getValue())){
                const x = Errors.Fix("'Closes Loop' Edge (" + edgeId + ") start node (" + sourceNode.getName() + ") does not have 'group_end' set to true.", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixFieldValue(eagle, sourceNode, Daliuge.groupEndField, "true")}, "Set 'group_end' to true");
                Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }

            if (!destinationNode.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_START) || !Utils.asBool(destinationNode.getFieldByDisplayText(Daliuge.FieldName.GROUP_START).getValue())){
                const x = Errors.Fix("'Closes Loop' Edge (" + edgeId + ") end node (" + destinationNode.getName() + ") does not have 'group_start' set to true.", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixFieldValue(eagle, destinationNode, Daliuge.groupStartField, "true")}, "Set 'group_start' to true");
                Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }
        }

        return Utils.worstEdgeError(errorsWarnings);
    }

    private static isValidLog = (edgeId : string, linkValid : Eagle.LinkValid, issue: Errors.Issue, showNotification : boolean, showConsole : boolean, errorsWarnings: Errors.ErrorsWarnings) : void => {
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
