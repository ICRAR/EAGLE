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

    static toOJSJson = (edge : Edge) : object => {
        return {
            from: -1,
            fromPort: edge.srcPortId,
            to: -1,
            toPort: edge.destPortId,
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

    static fromV3Json = (edgeData: any, errorsWarnings: Eagle.ErrorsWarnings): Edge => {
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

    static fromAppRefJson = (edgeData: any, errorsWarnings: Eagle.ErrorsWarnings): Edge => {
        return new Edge(edgeData.from, edgeData.fromPort, edgeData.to, edgeData.toPort, edgeData.dataType, edgeData.loopAware, edgeData.closesLoop);
    }

    static isValid = (graph : LogicalGraph, edgeId: string, sourceNodeKey : number, sourcePortId : string, destinationNodeKey : number, destinationPortId : string, loopAware: boolean, showNotification : boolean, showConsole : boolean, errors: string[], warnings: string[]) : Eagle.LinkValid => {
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
        const sourceNode : Node = graph.findNodeByKey(sourceNodeKey);
        const destinationNode : Node = graph.findNodeByKey(destinationNodeKey);

        if (sourceNode === null || typeof sourceNode === "undefined" || destinationNode === null || typeof destinationNode === "undefined"){
            return Eagle.LinkValid.Unknown;
        }

        // if destination is a service construct, then pretty much anything is valid
        if (destinationNode.getCategory() === Eagle.Category.Service){
            return Eagle.LinkValid.Valid;
        }

        // check that we are not connecting two ports within the same node
        if (sourceNodeKey === destinationNodeKey){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, "sourceNodeKey and destinationNodeKey are the same", "danger", showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // if source node is a memory, and destination is a BashShellApp, OR
        // if source node is a memory, and destination is a Group with inputApplicationType BashShellApp
        // this is not supported. How would a BashShellApp read data from another process?
        if ((sourceNode.getCategory() === Eagle.Category.Memory && destinationNode.getCategory() === Eagle.Category.BashShellApp) ||
            (sourceNode.getCategory() === Eagle.Category.Memory && destinationNode.isGroup() && destinationNode.getInputApplication() !== undefined && destinationNode.hasInputApplication() && destinationNode.getInputApplication().getCategory() === Eagle.Category.BashShellApp)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, "output from Memory Node cannot be input into a BashShellApp or input into a Group Node with a BashShellApp inputApplicationType", "danger", showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        const sourcePort : Field = sourceNode.findPortById(sourcePortId);
        const destinationPort : Field = destinationNode.findPortById(destinationPortId);

        if (sourcePort === null || destinationPort === null){
            return Eagle.LinkValid.Unknown;
        }

        // check that we are not connecting a port to itself
        if (sourcePortId === destinationPortId){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, "sourcePort and destinationPort are the same", "danger", showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // check that source and destination are not both input or both output
        if (sourceNode.findPortIsInputById(sourcePortId) === destinationNode.findPortIsInputById(destinationPortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, "sourcePort and destinationPort are both input or both output", "danger", showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // check that source and destination port are both event, or both not event
        if ((sourcePort.getIsEvent() && !destinationPort.getIsEvent()) || (!sourcePort.getIsEvent() && destinationPort.getIsEvent())){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, "sourcePort and destinationPort are mix of event and non-event ports", "danger", showNotification, showConsole, errors, warnings);
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
            if (graph.findNodeByKey(destinationNode.getParentKey()) !== null){
                parentIsEFN = graph.findNodeByKey(destinationNode.getParentKey()).getCategory() === Eagle.Category.ExclusiveForceNode;
            }
        }
        if (sourceNode.getParentKey() !== null){
            if (graph.findNodeByKey(sourceNode.getParentKey()) !== null){
                parentIsEFN = graph.findNodeByKey(sourceNode.getParentKey()).getCategory() === Eagle.Category.ExclusiveForceNode;
            }
        }

        // debug
        //console.log("isParent", isParent, "isParentOfConstruct", isParentOfConstruct, "isChild", isChild, "isChildOfConstruct", isChildOfConstruct, "isSibling", isSibling, "parentIsEFN", parentIsEFN);

        // if a node is connecting to its parent, it must connect to the local port
        if (isParent && !destinationNode.hasLocalPortWithId(destinationPortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, "Source port is connecting to its parent, yet destination port is not local", "danger", showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // if a node is connecting to a child, it must start from the local port
        if (isChild && !sourceNode.hasLocalPortWithId(sourcePortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, "Source connecting to child, yet source port is not local", "danger", showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // if destination node is not a child, destination port cannot be a local port
        if (!parentIsEFN && !isParent && destinationNode.hasLocalPortWithId(destinationPortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, "Source is not a child of destination, yet destination port is local", "danger", showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        if (!parentIsEFN && !isChild && sourceNode.hasLocalPortWithId(sourcePortId)){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, "Destination is not a child of source, yet source port is local", "danger", showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // abort if source port and destination port have different data types
        if (sourcePort.getIdText() !== destinationPort.getIdText()){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Invalid, "Port names don't match: sourcePortName:" + sourcePort.getIdText() + " destinationPortName:" + destinationPort.getIdText(), "danger", showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Invalid;
        }

        // if link is not a parent, child or sibling, then warn user
        if (!parentIsEFN && !isParent && !isChild && !isSibling && !loopAware && !isParentOfConstruct && !isChildOfConstruct){
            Edge.isValidLog(edgeId, Eagle.LinkValid.Warning, "Edge is not child->parent, parent->child or between siblings. It could be incorrect or computationally expensive", "warning", showNotification, showConsole, errors, warnings);
            return Eagle.LinkValid.Warning;
        }

        return Eagle.LinkValid.Valid
    }

    private static isValidLog = (edgeId : string, linkValid : Eagle.LinkValid, message : string, type : "success" | "info" | "warning" | "danger", showNotification : boolean, showConsole : boolean, errors: string[], warnings: string[]) : void => {
        // determine correct title
        let title = "Edge Invalid";
        if (linkValid === Eagle.LinkValid.Warning){
            title = "Edge Warning";
        }

        // add edge id to message, if id is known
        if (edgeId !== null){
            message = "Edge (" + edgeId + ") " + message;
        }

        // add log message to correct location(s)
        if (showNotification)
            Utils.showNotification(title, message, type);
        if (showConsole)
            console.warn(title + ":" + message);
        if (type === "danger" && errors !== null){
            errors.push(message);
        }
        if (type === "warning" && warnings !== null){
            warnings.push(message);
        }
    }
}
