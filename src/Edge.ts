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
import {Port} from './Port';
import {Utils} from './Utils';

export class Edge {
    private _id : string
    private srcNodeKey : number;
    private srcPortId : string;
    private destNodeKey : number;
    private destPortId : string;
    private dataType : string;
    private loopAware : boolean;

    constructor(srcNodeKey : number, srcPortId : string, destNodeKey : number, destPortId : string, dataType : string){
        this._id = Utils.uuidv4();

        this.srcNodeKey = srcNodeKey;
        this.srcPortId = srcPortId;
        this.destNodeKey = destNodeKey;
        this.destPortId = destPortId;

        this.dataType = dataType;
        this.loopAware = false;
    }

    getId = () : string => {
        return this._id;
    }

    getSrcNodeKey = () : number => {
        return this.srcNodeKey;
    }

    getSrcPortId = () : string => {
        return this.srcPortId;
    }

    getDestNodeKey = () : number => {
        return this.destNodeKey;
    }

    getDestPortId = () : string => {
        return this.destPortId;
    }

    getDataType = () : string => {
        return this.dataType;
    }

    isLoopAware = () : boolean => {
        return this.loopAware;
    }

    setLoopAware = (value : boolean) => {
        this.loopAware = value;
    }

    toggleLoopAware = () : void => {
        this.loopAware = !this.loopAware;
    }

    clear = () : void => {
        this._id = "";
        this.srcNodeKey = 0;
        this.srcPortId = "";
        this.destNodeKey = 0;
        this.destPortId = "";
        this.dataType = "";
        this.loopAware = false;
    }

    clone = () : Edge => {
        var result : Edge = new Edge(this.srcNodeKey, this.srcPortId, this.destNodeKey, this.destPortId, this.dataType);

        result._id = this._id;
        result.loopAware = this.loopAware;

        return result;
    }

    static toOJSJson = (edge : Edge) : object => {
        return {
            from: -1,
            fromPort: edge.srcPortId,
            to: -1,
            toPort: edge.destPortId,
            loop_aware: edge.loopAware ? "1" : "0"
        };
    }

    static toV3Json = (edge : Edge) : object => {
        return {
            srcNode: edge.srcNodeKey.toString(),
            srcPort: edge.srcPortId,
            destNode: edge.destNodeKey.toString(),
            destPort: edge.destPortId,
            loop_aware: edge.loopAware ? "1" : "0"
        }
    }

    static fromV3Json = (edgeData: any, errors: string[]): Edge => {
        let edge = new Edge(edgeData.srcNode, edgeData.srcPort, edgeData.destNode, edgeData.destPort, Eagle.FieldDataType.Unknown);
        edge.loopAware = edgeData.loop_aware === "1";
        return edge;
    }

    static toAppRefJson = (edge : Edge) : object => {
        return {
            from: edge.srcNodeKey,
            fromPort: edge.srcPortId,
            to: edge.destNodeKey,
            toPort: edge.destPortId,
            loopAware: edge.loopAware,
            dataType: edge.dataType
        };
    }

    static fromAppRefJson = (edgeData: any, errors: string[]): Edge => {
        //console.log("Edge.fromAppRefJson()", edgeData);
        let edge = new Edge(edgeData.from, edgeData.fromPort, edgeData.to, edgeData.toPort, edgeData.dataType);
        edge.loopAware = edgeData.loopAware;
        return edge;
    }


    static isValid = (graph : LogicalGraph, sourceNodeKey : number, sourcePortId : string, destinationNodeKey : number, destinationPortId : string, showNotification : boolean, showConsole : boolean) : Eagle.LinkValid => {
        //console.log("IsValid()", "sourceNodeKey", sourceNodeKey, "sourcePortId", sourcePortId, "destinationNodeKey", destinationNodeKey, "destinationPortId", destinationPortId);

        var sourceNode : Node = graph.findNodeByKey(sourceNodeKey);
        var destinationNode : Node = graph.findNodeByKey(destinationNodeKey);

        if (sourceNode === null || typeof sourceNode === "undefined" || destinationNode === null || typeof destinationNode === "undefined"){
            //Utils.showNotification("Unknown Error", "sourceNode or destinationNode cannot be found", "danger");
            return Eagle.LinkValid.Unknown;
        }

        // if destination is a service construct, then pretty much anything is valid
        if (destinationNode.getCategory() === Eagle.Category.Service){
            return Eagle.LinkValid.Valid;
        }

        // check that we are not connecting two ports within the same node
        if (sourceNodeKey === destinationNodeKey){
            Edge.isValidLog("Invalid Edge", "sourceNodeKey and destinationNodeKey are the same", "danger", showNotification, showConsole);
            return Eagle.LinkValid.Invalid;
        }

        // if source node is a memory, and destination is a BashShellApp, OR
        // if source node is a memory, and destination is a Group with inputApplicationType BashShellApp
        // this is not supported. How would a BashShellApp read data from another process?
        if ((sourceNode.getCategory() === Eagle.Category.Memory && destinationNode.getCategory() === Eagle.Category.BashShellApp) ||
            (sourceNode.getCategory() === Eagle.Category.Memory && destinationNode.isGroup() && destinationNode.getInputApplication() !== undefined && destinationNode.hasInputApplication() && destinationNode.getInputApplication().getCategory() === Eagle.Category.BashShellApp)){
            Edge.isValidLog("Invalid Edge", "Memory Node cannot be input into a BashShellApp or input into a Group Node with a BashShellApp inputApplicationType", "danger", showNotification, showConsole);
            return Eagle.LinkValid.Invalid;
        }

        var sourcePort : Port = sourceNode.findPortById(sourcePortId);
        var destinationPort : Port = destinationNode.findPortById(destinationPortId);

        if (sourcePort === null || destinationPort === null){
            //Utils.showNotification("Unknown Error", "sourcePort or destinationPort cannot be found", "danger");
            return Eagle.LinkValid.Unknown;
        }

        // check that we are not connecting a port to itself
        if (sourcePortId === destinationPortId){
            Edge.isValidLog("Invalid Edge", "sourcePort and destinationPort are the same", "danger", showNotification, showConsole);
            return Eagle.LinkValid.Invalid;
        }

        // check that source and destination are not both input or both output
        if (sourceNode.findPortIsInputById(sourcePortId) === destinationNode.findPortIsInputById(destinationPortId)){
            Edge.isValidLog("Invalid Edge", "sourcePort and destinationPort are both input or both output", "danger", showNotification, showConsole);
            return Eagle.LinkValid.Invalid;
        }

        // check that source and destination port are both event, or both not event
        if ((sourcePort.isEvent() && !destinationPort.isEvent()) || (!sourcePort.isEvent() && destinationPort.isEvent())){
            if (showNotification)
                Utils.showNotification("Invalid Edge", "sourcePort and destinationPort are mix of event and non-event ports", "danger");
            return Eagle.LinkValid.Invalid;
        }

        // check relationship between destination and source node
        var isParent : boolean = sourceNode.getParentKey() === destinationNodeKey;
        var isChild : boolean = destinationNode.getParentKey() === sourceNodeKey;
        var isSibling : boolean = sourceNode.getParentKey() === destinationNode.getParentKey();
        var parentIsEFN : boolean = false;

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

        // if a node is connecting to its parent, it must connect to the local port
        if (isParent && !destinationNode.hasLocalPortWithId(destinationPortId)){
            Edge.isValidLog("Invalid Edge", "Source port is connecting to its parent, yet destination port is not local", "danger", showNotification, showConsole);
            return Eagle.LinkValid.Invalid;
        }

        // if a node is connecting to a child, it must start from the local port
        if (isChild && !sourceNode.hasLocalPortWithId(sourcePortId)){
            Edge.isValidLog("Invalid Edge", "Source connecting to child, yet source port is not local", "danger", showNotification, showConsole);
            return Eagle.LinkValid.Invalid;
        }

        // if destination node is not a child, destination port cannot be a local port
        if (!parentIsEFN && !isParent && destinationNode.hasLocalPortWithId(destinationPortId)){
            Edge.isValidLog("Invalid Edge", "Source is not a child of destination, yet destination port is local", "danger", showNotification, showConsole);
            return Eagle.LinkValid.Invalid;
        }

        if (!parentIsEFN && !isChild && sourceNode.hasLocalPortWithId(sourcePortId)){
            Edge.isValidLog("Invalid Edge", "Destination is not a child of source, yet source port is local", "danger", showNotification, showConsole);
            return Eagle.LinkValid.Invalid;
        }

        // abort if source port and destination port have different data types
        if (sourcePort.getName() !== destinationPort.getName()){
            Edge.isValidLog("Invalid Edge", "Port names don't match: sourcePortName:" + sourcePort.getName() + " destinationPortName:" + destinationPort.getName(), "danger", showNotification, showConsole);
            return Eagle.LinkValid.Invalid;
        }

        // if link is not a parent, child or sibling, then warn user
        if (!parentIsEFN && !isParent && !isChild && !isSibling){
            Edge.isValidLog("Warning", "Edge is not child->parent, parent->child or between siblings. It could be incorrect or computationally expensive", "warning", showNotification, showConsole);
            return Eagle.LinkValid.Warning;
        }

        return Eagle.LinkValid.Valid
    }

    private static isValidLog = (title : string, message : string, type : "success" | "info" | "warning" | "danger", showNotification : boolean, showConsole : boolean) : void => {
        if (showNotification)
            Utils.showNotification(title, message, type);
        if (showConsole)
            console.warn(title + ":" + message);
    }
}
