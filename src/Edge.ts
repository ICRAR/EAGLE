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
    private _id : string
    private srcNode: Node;
    private srcPort: Field;
    private destNode: Node;
    private destPort: Field;
    private dataType: string;
    private loopAware: boolean; // indicates the user is aware that the components at either end of the edge may differ in multiplicity
    private closesLoop: boolean; // indicates that this is a special type of edge that can be drawn in eagle to specify the start/end of groups.
    private selectionRelative: boolean // indicates if the edge is either selected or attached to a selected node

    constructor(srcNode: Node, srcPort: Field, destNode: Node, destPort: Field, dataType: string, loopAware: boolean, closesLoop: boolean, selectionRelative: boolean){
        this._id = Utils.uuidv4();

        this.srcNode = srcNode;
        this.srcPort = srcPort;
        this.destNode = destNode;
        this.destPort = destPort;

        this.dataType = dataType;
        this.loopAware = loopAware;
        this.closesLoop = closesLoop;
        this.selectionRelative = selectionRelative;
    }

    getId = () : string => {
        return this._id;
    }

    setId = (id: string) : void => {
        this._id = id;
    }

    getSrcNode = () : Node => {
        return this.srcNode;
    }

    setSrcNode = (srcNode: Node): void => {
        this.srcNode = srcNode;
    }

    getSrcPort = () : Field => {
        return this.srcPort;
    }

    setSrcPort = (srcPort: Field) : void => {
        this.srcPort = srcPort;
    }

    getDestNode = () : Node => {
        return this.destNode;
    }

    setDestNode = (destNode: Node): void => {
        this.destNode = destNode;
    }

    getDestPort = () : Field => {
        return this.destPort;
    }

    setDestPort = (destPort: Field) : void => {
        this.destPort = destPort;
    }

    getSelectionRelative = () : boolean => {
        return this.selectionRelative;
    }

    getDataType = () : string => {
        return this.dataType;
    }

    setDataType = (dataType: string) : void => {
        this.dataType = dataType;
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
        this.dataType = "";
        this.loopAware = false;
        this.closesLoop = false;
    }

    clone = () : Edge => {
        const result : Edge = new Edge(this.srcNode, this.srcPort, this.destNode, this.destPort, this.dataType, this.loopAware, this.closesLoop, this.selectionRelative);

        result._id = this._id;

        return result;
    }

    getErrorsWarnings = (eagle: Eagle): Errors.ErrorsWarnings => {
        const result: {warnings: Errors.Issue[], errors: Errors.Issue[]} = {warnings: [], errors: []};

        Edge.isValid(eagle, this._id, this.srcNode, this.srcPort, this.destNode, this.destPort, this.dataType, this.loopAware, this.closesLoop, false, false, result);

        return result;
    }

    static toOJSJson = (edge : Edge) : object => {
        return {
            from: edge.srcNode.getKey(),
            fromPort: edge.srcPort.getId(),
            to: edge.destNode.getKey(),
            toPort: edge.destPort.getId(),
            dataType: edge.dataType,
            loop_aware: edge.loopAware ? "1" : "0",
            closesLoop: edge.closesLoop
        };
    }

    static fromOJSJson = (linkData: any, nodes: Node[], errorsWarnings: Errors.ErrorsWarnings) : Edge => {
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

        // try to read the dataType attribute
        let dataType: string = Daliuge.DataType.Unknown;
        if (typeof linkData.dataType !== 'undefined'){
            dataType = linkData.dataType;
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

        // find source node and destination node in nodes
        let srcNode: Node = null;
        let destNode: Node = null;
        for (const node of nodes){
            if (node.getKey() === srcNodeKey){
                srcNode = node;
            }
            if (node.getKey() === destNodeKey){
                destNode = node;
            }
        }
        if (srcNode === null){
            console.warn("Could not find the source node", srcNodeKey);
        }
        if (destNode === null){
            console.warn("Could not find the destination node", destNodeKey);
        }

        // find the source port within the source node
        const srcPort: Field = srcNode.getFieldById(srcPortId);
        const destPort: Field = destNode.getFieldById(destPortId);

        return new Edge(srcNode, srcPort, destNode, destPort, dataType, loopAware, closesLoop, false);
    }

    static toV3Json = (edge : Edge) : object => {
        return {
            srcNode: edge.srcNode.getKey().toString(),
            srcPort: edge.srcPort.getId(),
            destNode: edge.destNode.getKey().toString(),
            destPort: edge.destPort.getId(),
            loop_aware: edge.loopAware ? "1" : "0",
            closesLoop: edge.closesLoop
        }
    }

    static fromV3Json = (edgeData: any, errorsWarnings: Errors.ErrorsWarnings): Edge => {
        return new Edge(edgeData.srcNode, edgeData.srcPort, edgeData.destNode, edgeData.destPort, "", edgeData.loop_aware === "1", edgeData.closesLoop, false);
    }

    static toAppRefJson = (edge : Edge, lg: LogicalGraph) : object => {
        const result : any = {
            from: edge.srcNodeKey,
            fromPort: edge.srcPortId,
            to: edge.destNodeKey,
            toPort: edge.destPortId,
            loopAware: edge.loopAware,
            closesLoop: edge.closesLoop,
            dataType: edge.dataType
        };

        // if srcNode is an embedded application, add a 'fromRef' attribute to the edge
        const srcNode : Node = edge.getSrcNode();
        if (srcNode.getEmbed() !== null){
            result.fromRef = srcNode.getEmbed().getKey();
        }

        // if destNode is an embedded application, add a 'toRef' attribute to the edge
        const destNode : Node = edge.getDestNode();
        if (destNode.getEmbed() !== null){
            result.toRef = destNode.getEmbed().getKey();
        }

        return result;
    }

    static fromAppRefJson = (edgeData: any, errorsWarnings: Errors.ErrorsWarnings): Edge => {
        return new Edge(edgeData.from, edgeData.fromPort, edgeData.to, edgeData.toPort, edgeData.dataType, edgeData.loopAware, edgeData.closesLoop, false);
    }

    static isValid = (eagle: Eagle, edgeId: string, sourceNode: Node, sourcePort: Field, destinationNode: Node, destinationPort: Field, dataType: string, loopAware: boolean, closesLoop: boolean, showNotification : boolean, showConsole : boolean, errorsWarnings: Errors.ErrorsWarnings) : Eagle.LinkValid => {
        // check for problems
        if (sourceNode === null){
            return Eagle.LinkValid.Unknown;
        }

        if (destinationNode === null){
            return Eagle.LinkValid.Unknown;
        }

        if (sourcePort === null){
            const issue = Errors.Fix("source port is null", function(){Utils.fixNodeFieldIds(eagle, sourceNode)}, "Generate ids for ports on source node");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        if (destinationPort === null){
            const issue = Errors.Fix("destination port is null", function(){Utils.fixNodeFieldIds(eagle, destinationNode)}, "Generate ids for ports on destination node");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        if (sourceNode === null || typeof sourceNode === "undefined" || destinationNode === null || typeof destinationNode === "undefined"){
            return Eagle.LinkValid.Unknown;
        }

        // check that we are not connecting a Data component to a Data component, that is not supported
        if (sourceNode.getCategoryType() === Category.Type.Data && destinationNode.getCategoryType() === Category.Type.Data){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Data nodes may not be connected directly to other Data nodes", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
            return Eagle.LinkValid.Invalid;
        }

        // if source node or destination node is a construct, then something is wrong, constructs should not have ports
        if (sourceNode.getCategoryType() === Category.Type.Construct){
            const issue: Errors.Issue = Errors.ShowFix("Edge (" + edgeId + ") cannot have a source node (" + sourceNode.getName() + ") that is a construct", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixMoveEdgeToEmbeddedApplication(eagle, edgeId)}, "Move edge to embedded application");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
        }
        if (destinationNode.getCategoryType() === Category.Type.Construct){
            const issue: Errors.Issue = Errors.ShowFix("Edge (" + edgeId + ") cannot have a destination node (" + destinationNode.getName() + ") that is a construct", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixMoveEdgeToEmbeddedApplication(eagle, edgeId)}, "Move edge to embedded application");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
        }

        // check that we are not connecting two ports within the same node
        if (sourceNode.getKey() === destinationNode.getKey()){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("sourceNodeKey and destinationNodeKey are the same", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        // if source node is a memory, and destination is a BashShellApp, OR
        // if source node is a memory, and destination is a Group with inputApplicationType BashShellApp
        // this is not supported. How would a BashShellApp read data from another process?
        if ((sourceNode.getCategory() === Category.Memory && destinationNode.getCategory() === Category.BashShellApp) ||
            (sourceNode.getCategory() === Category.Memory && destinationNode.isGroup() && destinationNode.getInputApplication() !== undefined && destinationNode.hasInputApplication() && destinationNode.getInputApplication().getCategory() === Category.BashShellApp)){
            const issue: Errors.Issue = Errors.ShowFix("output from Memory Node cannot be input into a BashShellApp or input into a Group Node with a BashShellApp inputApplicationType", function(){Utils.showNode(eagle, Eagle.FileType.Graph, sourceNode.getId())}, function(){Utils.fixNodeCategory(eagle, sourceNode, Category.File)}, "Change data component type to File");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, issue, showNotification, showConsole, errorsWarnings);
        }

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
        if (sourcePort.getId() === destinationPort.getId()){
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
        const isParent : boolean = sourceNode.getParent().getKey() === destinationNode.getKey();
        const isParentOfConstruct : boolean = sourceNode.getParent().getKey() === destinationNode.getEmbed().getKey() && sourceNode.getParent().getKey() !== null;
        const isChild : boolean = destinationNode.getParent().getKey() === sourceNode.getKey();
        const isChildOfConstruct : boolean = destinationNode.getParent().getKey() === sourceNode.getEmbed().getKey() && destinationNode.getParent().getKey() !== null;
        const isSibling : boolean = sourceNode.getParent().getKey() === destinationNode.getParent().getKey();
        let parentIsEFN : boolean = false;

        // determine if the new edge is crossing a ExclusiveForceNode boundary
        if (destinationNode.getParent().getKey() !== null){
            if (destinationNode.getParent() !== null){
                parentIsEFN = destinationNode.getParent().getCategory() === Category.ExclusiveForceNode;
            }
        }
        if (sourceNode.getParent().getKey() !== null){
            if (sourceNode.getParent() !== null){
                parentIsEFN = sourceNode.getParent().getCategory() === Category.ExclusiveForceNode;
            }
        }

        // debug
        //console.log("isParent", isParent, "isParentOfConstruct", isParentOfConstruct, "isChild", isChild, "isChildOfConstruct", isChildOfConstruct, "isSibling", isSibling, "parentIsEFN", parentIsEFN);

        // if a node is connecting to its parent, it must connect to the local port
        if (isParent && !destinationNode.hasLocalPortWithId(destinationPort.getId())){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Source port is connecting to its parent, yet destination port is not local", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        // if a node is connecting to a child, it must start from the local port
        if (isChild && !sourceNode.hasLocalPortWithId(sourcePort.getId())){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Source connecting to child, yet source port is not local", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        // if destination node is not a child, destination port cannot be a local port
        if (!parentIsEFN && !isParent && destinationNode.hasLocalPortWithId(destinationPort.getId())){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Source is not a child of destination, yet destination port is local", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        if (!parentIsEFN && !isChild && sourceNode.hasLocalPortWithId(sourcePort.getId())){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.Show("Destination is not a child of source, yet source port is local", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        if (sourcePort !== null && destinationPort !== null){
            // abort if source port and destination port have different data types
            if (!Utils.portsMatch(sourcePort, destinationPort)){
                const x = Errors.ShowFix("Source and destination ports don't match: sourcePort (" + sourcePort.getDisplayText() + ":" + sourcePort.getType() + ") destinationPort (" + destinationPort.getDisplayText() + ":" + destinationPort.getType() + ")", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixPortType(eagle, sourcePort, destinationPort);}, "Overwrite destination port type with source port type");
                Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }
        }

        // if link is not a parent, child or sibling, then warn user
        if (!parentIsEFN && !isParent && !isChild && !isSibling && !loopAware && !isParentOfConstruct && !isChildOfConstruct){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Warning, Errors.Show("Edge is not child->parent, parent->child or between siblings. It could be incorrect or computationally expensive", function(){Utils.showEdge(eagle, edgeId);}), showNotification, showConsole, errorsWarnings);
        }

        // check if the edge already exists in the graph, there is no point in a duplicate
        for (const edge of eagle.logicalGraph().getEdges()){
            if (edge.getSrcPort().getId() === sourcePort.getId() && edge.getDestPort().getId() === destinationPort.getId() && edge.getId() !== edgeId){
                const x = Errors.ShowFix("Edge is a duplicate. Another edge with the same source port and destination port already exists", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixDeleteEdge(eagle, edgeId);}, "Delete edge");
                Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }
        }

        // check that all edges have same data type as their source and destination ports
        if (sourcePort !== null && !Utils.typesMatch(dataType, sourcePort.getType())){
            const x = Errors.ShowFix("Edge data type (" + dataType + ") does not match start port (" + sourcePort.getDisplayText() + ") data type (" + sourcePort.getType() + ").", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixEdgeType(eagle, edgeId, sourcePort.getType());}, "Change edge data type to match source port type");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
        }

        if (destinationPort !== null && !Utils.typesMatch(dataType, destinationPort.getType())){
            const x = Errors.ShowFix("Edge data type (" + dataType + ") does not match end port (" + destinationPort.getDisplayText() + ") data type (" + destinationPort.getType() + ").", function(){Utils.showEdge(eagle, edgeId)}, function(){Utils.fixEdgeType(eagle, edgeId, destinationPort.getType());}, "Change edge data type to match destination port type");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
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
                const x = Errors.ShowFix("'Closes Loop' Edge (" + edgeId + ") start node (" + sourceNode.getName() + ") does not have 'group_end' set to true.", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixFieldValue(eagle, sourceNode, Daliuge.groupEndField, "true")}, "Set 'group_end' to true");
                Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errorsWarnings);
            }

            if (!destinationNode.hasFieldWithDisplayText(Daliuge.FieldName.GROUP_START) || !Utils.asBool(destinationNode.getFieldByDisplayText(Daliuge.FieldName.GROUP_START).getValue())){
                const x = Errors.ShowFix("'Closes Loop' Edge (" + edgeId + ") end node (" + destinationNode.getName() + ") does not have 'group_start' set to true.", function(){Utils.showEdge(eagle, edgeId);}, function(){Utils.fixFieldValue(eagle, destinationNode, Daliuge.groupStartField, "true")}, "Set 'group_start' to true");
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
