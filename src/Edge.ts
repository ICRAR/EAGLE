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
import {Field} from './Field';
import {Utils} from './Utils';
import {Errors} from './Errors';

export class Edge {
    private _id : string
    private srcNodeKey : number;
    private srcPortId : string;
    private destNodeKey : number;
    private destPortId : string;
    private dataType : string;
    private loopAware : boolean; // indicates the user is aware that the components at either end of the edge may differ in multiplicity
    private closesLoop : boolean; // indicates that this is a special type of edge that can be drawn in eagle to specify the start/end of groups.

    constructor(srcNodeKey : number, srcPortId : string, destNodeKey : number, destPortId : string, dataType : string, loopAware: boolean, closesLoop: boolean){
        this._id = Utils.uuidv4();

        this.srcNodeKey = srcNodeKey;
        this.srcPortId = srcPortId;
        this.destNodeKey = destNodeKey;
        this.destPortId = destPortId;

        this.dataType = dataType;
        this.loopAware = loopAware;
        this.closesLoop = closesLoop;
    }

    getId = () : string => {
        return this._id;
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

    setDestPortId = (id: string) : void => {
        this.destPortId = id;
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

    clear = () : void => {
        this._id = "";
        this.srcNodeKey = 0;
        this.srcPortId = "";
        this.destNodeKey = 0;
        this.destPortId = "";
        this.dataType = "";
        this.loopAware = false;
        this.closesLoop = false;
    }

    clone = () : Edge => {
        const result : Edge = new Edge(this.srcNodeKey, this.srcPortId, this.destNodeKey, this.destPortId, this.dataType, this.loopAware, this.closesLoop);

        result._id = this._id;

        return result;
    }

    getErrorsWarnings = (eagle: Eagle): Errors.ErrorsWarnings => {
        const result: {warnings: Errors.Issue[], errors: Errors.Issue[]} = {warnings: [], errors: []};

        Edge.isValid(eagle, this._id, this.srcNodeKey, this.srcPortId, this.destNodeKey, this.destPortId, this.dataType, this.loopAware, false, false, result.errors, result.warnings);

        return result;
    }

    validClass = (eagle: Eagle) : string => {
        const linkValid: Eagle.LinkValid = Edge.isValid(eagle, this._id, this.srcNodeKey, this.srcPortId, this.destNodeKey, this.destPortId, this.dataType, this.loopAware, false, false, null, null);

        if (linkValid === Eagle.LinkValid.Invalid){
            return "alert alert-danger";
        }
        if (linkValid === Eagle.LinkValid.Warning){
            return "alert alert-warning";
        }

        return "alert alert-success";
    }

    // TODO: probably, this should be something like validHTML, and should return some HTML for each error or warning.
    // TODO: don't just use error 0 and warning 0
    validText = (eagle: Eagle) : string => {
        const warnings: Errors.Issue[] = [];
        const errors: Errors.Issue[] = [];
        const linkValid: Eagle.LinkValid = Edge.isValid(eagle, this._id, this.srcNodeKey, this.srcPortId, this.destNodeKey, this.destPortId, this.dataType, this.loopAware, false, false, errors, warnings);

        console.log("validText() linkValid", linkValid, "errors length", errors.length, "warnings length", warnings.length);

        if (linkValid === Eagle.LinkValid.Invalid || linkValid === Eagle.LinkValid.Warning){
            if (errors.length > 0){
                return errors[0].message;
            }
            if (warnings.length > 0){
                return warnings[0].message;
            }
            return "Unknown error!";
        }

        return "Edge is valid";
    }

    getFix = (eagle: Eagle): () => void => {
        const warnings: Errors.Issue[] = [];
        const errors: Errors.Issue[] = [];
        const linkValid: Eagle.LinkValid = Edge.isValid(eagle, this._id, this.srcNodeKey, this.srcPortId, this.destNodeKey, this.destPortId, this.dataType, this.loopAware, false, false, errors, warnings);

        console.log("getFix() linkValid", linkValid, "errors length", errors.length, "warnings length", warnings.length);

        if (linkValid === Eagle.LinkValid.Invalid || linkValid === Eagle.LinkValid.Warning){
            if (errors.length > 0){
                console.log("getFix() return error fix");
                return errors[0].fix;
            }
            if (warnings.length > 0){
                console.log("getFix() return warning fix");
                return warnings[0].fix;
            }
        }

        console.log("getFix() return null");
        return null;
    }

    getFixDescription = (eagle: Eagle): string => {
        const warnings: Errors.Issue[] = [];
        const errors: Errors.Issue[] = [];
        const linkValid: Eagle.LinkValid = Edge.isValid(eagle, this._id, this.srcNodeKey, this.srcPortId, this.destNodeKey, this.destPortId, this.dataType, this.loopAware, false, false, errors, warnings);

        if (linkValid === Eagle.LinkValid.Invalid || linkValid === Eagle.LinkValid.Warning){
            if (errors.length > 0){
                return errors[0].fixDescription;
            }
            if (warnings.length > 0){
                return warnings[0].fixDescription;
            }
        }

        return "";
    }

    static toOJSJson = (edge : Edge) : object => {
        return {
            from: -1,
            fromPort: edge.srcPortId,
            to: -1,
            toPort: edge.destPortId,
            dataType: edge.dataType,
            loop_aware: edge.loopAware ? "1" : "0",
            closesLoop: edge.closesLoop
        };
    }

    static toV3Json = (edge : Edge) : object => {
        return {
            srcNode: edge.srcNodeKey.toString(),
            srcPort: edge.srcPortId,
            destNode: edge.destNodeKey.toString(),
            destPort: edge.destPortId,
            loop_aware: edge.loopAware ? "1" : "0",
            closesLoop: edge.closesLoop
        }
    }

    static fromV3Json = (edgeData: any, errorsWarnings: Errors.ErrorsWarnings): Edge => {
        return new Edge(edgeData.srcNode, edgeData.srcPort, edgeData.destNode, edgeData.destPort, "", edgeData.loop_aware === "1", edgeData.closesLoop);
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

    static fromAppRefJson = (edgeData: any, errorsWarnings: Errors.ErrorsWarnings): Edge => {
        return new Edge(edgeData.from, edgeData.fromPort, edgeData.to, edgeData.toPort, edgeData.dataType, edgeData.loopAware, edgeData.closesLoop);
    }

    // TODO: modify to accept an ErrorsWarnings object instead of a errors array and a warnings array?
    static isValid = (eagle: Eagle, edgeId: string, sourceNodeKey : number, sourcePortId : string, destinationNodeKey : number, destinationPortId : string, dataType: string, loopAware: boolean, showNotification : boolean, showConsole : boolean, errors: Errors.Issue[], warnings: Errors.Issue[]) : Eagle.LinkValid => {
        // check for problems
        if (isNaN(sourceNodeKey)){
            return Eagle.LinkValid.Unknown;
        }

        if (isNaN(destinationNodeKey)){
            return Eagle.LinkValid.Unknown;
        }

        if (sourcePortId === ""){
            return Eagle.LinkValid.Unknown;
        }

        if (destinationPortId === ""){
            return Eagle.LinkValid.Unknown;
        }

        if (sourcePortId === null){
            return Eagle.LinkValid.Unknown;
        }

        if (destinationPortId === null){
            return Eagle.LinkValid.Unknown;
        }

        // get references to actual source and destination nodes (from the keys)
        const sourceNode : Node = eagle.logicalGraph().findNodeByKey(sourceNodeKey);
        const destinationNode : Node = eagle.logicalGraph().findNodeByKey(destinationNodeKey);

        if (sourceNode === null || typeof sourceNode === "undefined" || destinationNode === null || typeof destinationNode === "undefined"){
            return Eagle.LinkValid.Unknown;
        }

        // if destination is a service construct, then pretty much anything is valid
        if (destinationNode.getCategory() === Eagle.Category.Service){
            return Eagle.LinkValid.Valid;
        }

        // check that we are not connecting two ports within the same node
        if (sourceNodeKey === destinationNodeKey){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.NoFix("sourceNodeKey and destinationNodeKey are the same"), showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // if source node is a memory, and destination is a BashShellApp, OR
        // if source node is a memory, and destination is a Group with inputApplicationType BashShellApp
        // this is not supported. How would a BashShellApp read data from another process?
        if ((sourceNode.getCategory() === Eagle.Category.Memory && destinationNode.getCategory() === Eagle.Category.BashShellApp) ||
            (sourceNode.getCategory() === Eagle.Category.Memory && destinationNode.isGroup() && destinationNode.getInputApplication() !== undefined && destinationNode.hasInputApplication() && destinationNode.getInputApplication().getCategory() === Eagle.Category.BashShellApp)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.NoFix("output from Memory Node cannot be input into a BashShellApp or input into a Group Node with a BashShellApp inputApplicationType"), showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        const sourcePort : Field = sourceNode.findPortById(sourcePortId);
        const destinationPort : Field = destinationNode.findPortById(destinationPortId);

        if (sourcePort === null || destinationPort === null){
            return Eagle.LinkValid.Unknown;
        }

        // check that we are not connecting a port to itself
        if (sourcePortId === destinationPortId){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.NoFix("sourcePort and destinationPort are the same"), showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // check if source and destination are both input
        if (sourceNode.findPortIsInputById(sourcePortId) && destinationNode.findPortIsInputById(destinationPortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.NoFix("sourcePort and destinationPort are both input"), showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // check if source and destination are both output
        if (!sourceNode.findPortIsInputById(sourcePortId) && !destinationNode.findPortIsInputById(destinationPortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.NoFix("sourcePort and destinationPort are both output"), showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // check that source and destination port are both event, or both not event
        if ((sourcePort.getIsEvent() && !destinationPort.getIsEvent()) || (!sourcePort.getIsEvent() && destinationPort.getIsEvent())){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.NoFix("sourcePort and destinationPort are mix of event and non-event ports"), showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
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
                parentIsEFN = eagle.logicalGraph().findNodeByKey(destinationNode.getParentKey()).getCategory() === Eagle.Category.ExclusiveForceNode;
            }
        }
        if (sourceNode.getParentKey() !== null){
            if (eagle.logicalGraph().findNodeByKey(sourceNode.getParentKey()) !== null){
                parentIsEFN = eagle.logicalGraph().findNodeByKey(sourceNode.getParentKey()).getCategory() === Eagle.Category.ExclusiveForceNode;
            }
        }

        // debug
        //console.log("isParent", isParent, "isParentOfConstruct", isParentOfConstruct, "isChild", isChild, "isChildOfConstruct", isChildOfConstruct, "isSibling", isSibling, "parentIsEFN", parentIsEFN);

        // if a node is connecting to its parent, it must connect to the local port
        if (isParent && !destinationNode.hasLocalPortWithId(destinationPortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.NoFix("Source port is connecting to its parent, yet destination port is not local"), showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // if a node is connecting to a child, it must start from the local port
        if (isChild && !sourceNode.hasLocalPortWithId(sourcePortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.NoFix("Source connecting to child, yet source port is not local"), showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // if destination node is not a child, destination port cannot be a local port
        if (!parentIsEFN && !isParent && destinationNode.hasLocalPortWithId(destinationPortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.NoFix("Source is not a child of destination, yet destination port is local"), showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        if (!parentIsEFN && !isChild && sourceNode.hasLocalPortWithId(sourcePortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, Errors.NoFix("Destination is not a child of source, yet source port is local"), showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // abort if source port and destination port have different data types
        if (!Utils.portsMatch(sourcePort, destinationPort)){
            const x = Errors.Fix("Ports don't match: sourcePort (" + sourcePort.getDisplayText() + ":" + sourcePort.getType() + ") destinationPort (" + destinationPort.getDisplayText() + ":" + destinationPort.getType() + ")", function(){Utils.visitNode(eagle, sourceNode.getKey());}, function(){Utils.fixPortType(eagle, sourcePort, destinationPort);}, "Overwrite destination port type with source port type");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // if link is not a parent, child or sibling, then warn user
        if (!parentIsEFN && !isParent && !isChild && !isSibling && !loopAware && !isParentOfConstruct && !isChildOfConstruct){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Warning, Errors.NoFix("Edge is not child->parent, parent->child or between siblings. It could be incorrect or computationally expensive"), showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Warning;
        }

        // check if the edge already exists in the graph, there is no point in a duplicate
        for (const edge of eagle.logicalGraph().getEdges()){
            if (edge.getSrcPortId() === sourcePortId && edge.getDestPortId() === destinationPortId && edge.getId() !== edgeId){
                const x = Errors.Fix("Edge is a duplicate. Another edge with the same source port and destination port already exists", function(){Utils.visitEdge(eagle, edgeId);}, function(){Utils.fixDeleteEdge(eagle, edgeId);}, "Delete edge");
                Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errors, warnings);
                return Eagle.LinkValid.Invalid;
            }
        }

        // check that all edges have same data type as their source and destination ports
        if (dataType !== sourcePort.getType()){
            const x = Errors.Fix("Edge data type (" + dataType + ") does not match start port (" + sourcePort.getDisplayText() + ") data type (" + sourcePort.getType() + ").", function(){Utils.visitEdge(eagle, edgeId)}, function(){Utils.fixEdgeType(eagle, edgeId, sourcePort.getType());}, "Change edge data type to match source port type");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        if (dataType !== destinationPort.getType()){
            const x = Errors.Fix("Edge data type (" + dataType + ") does not match end port (" + destinationPort.getDisplayText() + ") data type (" + destinationPort.getType() + ").", function(){Utils.visitEdge(eagle, edgeId)}, function(){Utils.fixEdgeType(eagle, edgeId, destinationPort.getType());}, "Change edge data type to match destination port type");
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, x, showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        return Eagle.LinkValid.Valid
    }

    private static isValidLog = (edgeId : string, linkValid : Eagle.LinkValid, issue: Errors.Issue, showNotification : boolean, showConsole : boolean, errors: Errors.Issue[], warnings: Errors.Issue[]) : void => {
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
        }

        // add log message to correct location(s)
        if (showNotification)
            Utils.showNotification(title, message, type);
        if (showConsole)
            console.warn(title + ":" + message);
        if (type === "danger" && errors !== null){
            errors.push(issue);
        }
        if (type === "warning" && warnings !== null){
            warnings.push(issue);
        }
    }
}
