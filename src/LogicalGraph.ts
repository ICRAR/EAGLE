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

import {Utils} from './Utils';
import {GraphUpdater} from './GraphUpdater';

import {Eagle} from './Eagle';
import {Node} from './Node';
import {Edge} from './Edge';
import {Port} from './Port';
import {FileInfo} from './FileInfo';
import {RepositoryFile} from './RepositoryFile';

export class LogicalGraph {
    fileInfo : ko.Observable<FileInfo>;
    private nodes : Node[];
    private edges : Edge[];

    constructor(){
        this.fileInfo = ko.observable(new FileInfo());
        this.fileInfo().type = Eagle.FileType.Graph;
        this.nodes = [];
        this.edges = [];
    }

    static toOJSJson = (graph : LogicalGraph) : object => {
        var result : any = {};

        //result.class = "go.GraphLinksModel";

        result.modelData = FileInfo.toOJSJson(graph.fileInfo());
        result.modelData.schemaVersion = Eagle.DALiuGESchemaVersion.OJS;

        // add nodes
        result.nodeDataArray = [];
        for (var i = 0 ; i < graph.getNodes().length ; i++){
            var node : Node = graph.getNodes()[i];
            var nodeData : any = Node.toOJSJson(node);

            result.nodeDataArray.push(nodeData);
        }

        // add links
        result.linkDataArray = [];
        for (var i = 0 ; i < graph.getEdges().length ; i++){
            var edge : Edge = graph.getEdges()[i];
            var linkData : any = Edge.toOJSJson(edge);

            var srcKey = edge.getSrcNodeKey();
            var destKey = edge.getDestNodeKey();

            var srcNode = graph.findNodeByKey(srcKey);
            var destNode = graph.findNodeByKey(destKey);

            // for OJS format, we actually store links using the node keys of the construct, not the node keys of the embedded applications
            if (srcNode.isEmbedded()){
                srcKey = srcNode.getEmbedKey();
            }
            if (destNode.isEmbedded()){
                destKey = destNode.getEmbedKey();
            }

            linkData.from = srcKey;
            linkData.to   = destKey;

            result.linkDataArray.push(linkData);
        }

        return result;
    }

    static fromOJSJson = (dataObject : any, file : RepositoryFile, errors : string[]) : LogicalGraph => {
        // create new logical graph object
        var result : LogicalGraph = new LogicalGraph();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromOJSJson(dataObject.modelData, errors));

        // add nodes
        for (var i = 0 ; i < dataObject.nodeDataArray.length ; i++){
            var nodeData = dataObject.nodeDataArray[i];
            let extraUsedKeys: number[] = [];

            let newNode = Node.fromOJSJson(nodeData, errors, (): number => {
                let resultKeys: number[] = Utils.getUsedKeys(result.nodes);
                let nodeDataKeys: number[] = Utils.getUsedKeysFromNodeData(dataObject.nodeDataArray);
                let combinedKeys: number[] = resultKeys.concat(nodeDataKeys.concat(extraUsedKeys));
                //console.log("resultKeys", resultKeys, "nodeDataKeys", nodeDataKeys, "extraUsedKeys", extraUsedKeys);
                //console.log("combinedKeys", combinedKeys);

                let newKey = Utils.findNewKey(combinedKeys);
                //console.log("generated new key", newKey);
                extraUsedKeys.push(newKey);
                return newKey;
            });

            if (newNode === null){
                continue;
            }

            result.nodes.push(newNode);
        }

        // set keys for all embedded nodes
        Utils.setEmbeddedApplicationNodeKeys(result);

        // make sure to set parentId for all nodes
        for (var i = 0 ; i < dataObject.nodeDataArray.length ; i++){
            var nodeData = dataObject.nodeDataArray[i];
            var parentIndex = GraphUpdater.findIndexOfNodeDataArrayWithKey(dataObject.nodeDataArray, nodeData.group);

            if (parentIndex !== -1){
                result.nodes[i].setParentKey(result.nodes[parentIndex].getKey());
            }
        }

        // add edges
        for (var i = 0 ; i < dataObject.linkDataArray.length ; i++){
            var linkData = dataObject.linkDataArray[i];

            // find source node
            let srcNode : Node = result.findNodeByKey(linkData.from);

            // abort if source node not found
            if (srcNode === null){
                var error : string = "Unable to find node with key " + linkData.from + " used as source node in link " + i + ". Discarding link!";
                console.warn(error);
                errors.push(error);
                continue;
            }

            // find source port on source node
            var srcPort : Port = srcNode.findPortById(linkData.fromPort);

            // if source port was not found on source node, check the source node's embedded application nodes
            // and if found on one of those, update the port's nodeKey to reflect the actual node it is on
            if (srcPort === null){
                let found: {key: number, port: Port} = srcNode.findPortInApplicationsById(linkData.fromPort);
                if (found.port !== null){
                    var error: string = "Updated edge " + i + " source node from construct " + linkData.from + " to embedded application node " + found.key;
                    srcPort = found.port;
                    linkData.from = found.key;
                    console.warn(error);
                    errors.push(error);
                }
            }

            // abort if source port not found
            if (srcPort === null){
                var error : string = "Unable to find port " + linkData.fromPort + " on node " + linkData.from + " used in link " + i;
                console.warn(error);
                errors.push(error);
                continue;
            }

            // find destination node
            let destNode : Node = result.findNodeByKey(linkData.to);

            // abort if dest node not found
            if (destNode === null){
                var error : string = "Unable to find node with key " + linkData.to + " used as destination node in link " + i + ". Discarding link!";
                console.warn(error);
                errors.push(error);
                continue;
            }

            // find dest port on dest node
            var destPort : Port = destNode.findPortById(linkData.toPort);

            // if destination port was not found on destination node, check the destination node's embedded application nodes
            // and if found on one of those, update the port's nodeKey to reflect the actual node it is on
            if (destPort === null){
                let found: {key: number, port: Port} = destNode.findPortInApplicationsById(linkData.toPort);
                if (found.port !== null){
                    var error: string = "Updated edge " + i + " destination node from construct " + linkData.to + " to embedded application node " + found.key;
                    destPort = found.port;
                    linkData.to = found.key;
                    console.warn(error);
                    errors.push(error);
                }
            }

            // abort if dest port not found
            if (destPort === null){
                var error : string = "Unable to find port " + linkData.toPort + " on node " + linkData.to + " used in link " + i;
                console.warn(error);
                errors.push(error);
                continue;
            }

            var newEdge : Edge = new Edge(linkData.from, linkData.fromPort, linkData.to, linkData.toPort, srcPort.getName());

            // try to read loop_aware attribute
            if (typeof linkData.loop_aware !== 'undefined'){
                newEdge.setLoopAware(linkData.loop_aware !== "0");
            }

            result.edges.push(newEdge);
        }

        // check for missing name
        if (result.fileInfo().name === ""){
            var error : string = "FileInfo.name is empty. Setting name to " + file.name;
            console.warn(error);
            errors.push(error);

            result.fileInfo().name = file.name;
        }

        var hadNegativePositions : boolean = GraphUpdater.correctOJSNegativePositions(result);
        if (hadNegativePositions){
            console.log("Adjusting position of all nodes to move to positive quadrant.");
        }

        return result;
    }

    static toV3Json = (graph : LogicalGraph) : object => {
        var result : any = {};

        result.DALiuGEGraph = {};
        var dlgg = result.DALiuGEGraph;

        // top level element info
        dlgg.type = Eagle.DALiuGEFileType.LogicalGraph;
        dlgg.name = graph.fileInfo().name;
        dlgg.schemaVersion = Eagle.DALiuGESchemaVersion.V3;
        dlgg.commitHash = graph.fileInfo().sha;
        dlgg.repositoryService = graph.fileInfo().repositoryService;
        dlgg.repositoryBranch = graph.fileInfo().repositoryBranch;
        dlgg.repositoryName = graph.fileInfo().repositoryName;
        dlgg.repositoryPath = graph.fileInfo().path;

        // add nodes
        dlgg.nodeData = {};
        for (var i = 0 ; i < graph.getNodes().length ; i++){
            var node : Node = graph.getNodes()[i];
            var nodeData : any = Node.toV3NodeJson(node, i);

            dlgg.nodeData[node.getKey()] = nodeData;
        }

        // add links
        dlgg.linkData = {};
        for (let i = 0 ; i < graph.getEdges().length ; i++){
            let edge : Edge = graph.getEdges()[i];
            let linkData : any = Edge.toV3Json(edge);

            dlgg.linkData[i] = linkData;
        }

        // add components
        dlgg.componentData = {};
        for (var i = 0 ; i < graph.getNodes().length ; i++){
            var node : Node = graph.getNodes()[i];
            var componentData : any = Node.toV3ComponentJson(node);

            dlgg.componentData[node.getKey()] = componentData;
        }

        return result;
    }

    static fromV3Json = (dataObject : any, file : RepositoryFile, errors : string[]) : LogicalGraph => {
        var result: LogicalGraph = new LogicalGraph();
        var dlgg = dataObject.DALiuGEGraph;

        result.fileInfo().type = dlgg.type;
        result.fileInfo().name = dlgg.name;
        result.fileInfo().schemaVersion = dlgg.schemaVersion;
        result.fileInfo().sha = dlgg.commitHash;
        result.fileInfo().repositoryService = dlgg.repositoryService;
        result.fileInfo().repositoryBranch = dlgg.repositoryBranch;
        result.fileInfo().repositoryName = dlgg.repositoryName;
        result.fileInfo().path = dlgg.repositoryPath;

        for (var key in dlgg.nodeData){
            var node = Node.fromV3NodeJson(dlgg.nodeData[key], key, errors);

            Node.fromV3ComponentJson(dlgg.componentData[key], node, errors);

            result.nodes.push(node);
        }

        for (var key in dlgg.linkData){
            var edge = Edge.fromV3Json(dlgg.linkData[key], errors);
            result.edges.push(edge);
        }

        return result;
    }

    static toAppRefJson = (graph : LogicalGraph) : object => {
        var result : any = {};

        //result.class = "go.GraphLinksModel";

        result.modelData = FileInfo.toOJSJson(graph.fileInfo());
        result.modelData.schemaVersion = Eagle.DALiuGESchemaVersion.AppRef;

        // add nodes
        result.nodeDataArray = [];
        for (var i = 0 ; i < graph.getNodes().length ; i++){
            var node : Node = graph.getNodes()[i];
            var nodeData : any = Node.toAppRefJson(node);

            result.nodeDataArray.push(nodeData);
        }

        // add embedded nodes
        for (var i = 0 ; i < graph.getNodes().length ; i++){
            var node : Node = graph.getNodes()[i];

            if (node.hasInputApplication()){
                var nodeData : any = Node.toAppRefJson(node.getInputApplication());

                // update ref in parent
                result.nodeDataArray[i].inputApplicationRef = nodeData.key;

                // add child to nodeDataArray
                result.nodeDataArray.push(nodeData);
            }

            if (node.hasOutputApplication()){
                var nodeData : any = Node.toAppRefJson(node.getOutputApplication());

                // update ref in parent
                result.nodeDataArray[i].outputApplicationRef = nodeData.key;

                // add child to nodeDataArray
                result.nodeDataArray.push(nodeData);
            }

            if (node.hasExitApplication()){
                var nodeData : any = Node.toAppRefJson(node.getExitApplication());

                // update ref in parent
                result.nodeDataArray[i].exitApplicationRef = nodeData.key;

                // add child to nodeDataArray
                result.nodeDataArray.push(nodeData);
            }
        }

        // add links
        result.linkDataArray = [];
        for (var i = 0 ; i < graph.getEdges().length ; i++){
            var edge : Edge = graph.getEdges()[i];
            result.linkDataArray.push(Edge.toAppRefJson(edge));
        }

        return result;
    }

    static fromAppRefJson = (dataObject : any, file : RepositoryFile, errors : string[]) : LogicalGraph => {
        // create new logical graph object
        var result : LogicalGraph = new LogicalGraph();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromOJSJson(dataObject.modelData, errors));

        // add nodes
        for (var i = 0 ; i < dataObject.nodeDataArray.length ; i++){
            var nodeData = dataObject.nodeDataArray[i];
            let node;

            // check if node is an embedded node, if so, don't push to nodes array
            //console.log("node index", i, "key", nodeData.key, "embedKey", nodeData.embedKey);
            if (nodeData.embedKey === null){
                node = Node.fromAppRefJson(nodeData, errors);
            } else {
                // skip node
                continue;
            }

            // check if this node has an embedded input application, if so, find and copy it now
            if (typeof nodeData.inputApplicationRef !== 'undefined'){
                let inputAppNodeData = LogicalGraph._findNodeDataWithKey(dataObject.nodeDataArray, nodeData.inputApplicationRef);
                node.setInputApplication(Node.fromAppRefJson(inputAppNodeData, errors));
            }
            // check if this node has an embedded output application, if so, find and copy it now
            if (typeof nodeData.outputApplicationRef !== 'undefined'){
                let outputAppNodeData = LogicalGraph._findNodeDataWithKey(dataObject.nodeDataArray, nodeData.outputApplicationRef);
                node.setOutputApplication(Node.fromAppRefJson(outputAppNodeData, errors));
            }
            // check if this node has an embedded exit application, if so, find and copy it now
            if (typeof nodeData.exitApplicationRef !== 'undefined'){
                let exitAppNodeData = LogicalGraph._findNodeDataWithKey(dataObject.nodeDataArray, nodeData.exitApplicationRef);
                node.setExitApplication(Node.fromAppRefJson(exitAppNodeData, errors));
            }

            result.nodes.push(node);
        }

        // set keys for all embedded nodes
        //Utils.setEmbeddedApplicationNodeKeys(result);

        // make sure to set parentId for all nodes
        //for (var i = 0 ; i < dataObject.nodeDataArray.length ; i++){
        //    var nodeData = dataObject.nodeDataArray[i];
        //    var parentIndex = GraphUpdater.findIndexOfNodeDataArrayWithKey(dataObject.nodeDataArray, nodeData.group);
        //
        //    if (parentIndex !== -1){
        //        result.nodes[i].setParentKey(result.nodes[parentIndex].getKey());
        //    }
        //}

        // add edges
        for (var i = 0 ; i < dataObject.linkDataArray.length ; i++){
            var linkData = dataObject.linkDataArray[i];

            result.edges.push(Edge.fromAppRefJson(linkData, errors));
        }

        // check for missing name
        if (result.fileInfo().name === ""){
            var error : string = "FileInfo.name is empty. Setting name to " + file.name;
            console.warn(error);
            errors.push(error);

            result.fileInfo().name = file.name;
        }

        return result;
    }

    static _findNodeDataWithKey = (nodeDataArray: any[], key: number): any => {
        for (var i = 0 ; i < nodeDataArray.length ; i++){
            if (nodeDataArray[i].key === key){
                return nodeDataArray[i];
            }
        }
        return null;
    }

    addNodeComplete = (node : Node) => {
        this.nodes.push(node);
    }

    getNodes = () : Node[] => {
        return this.nodes;
    }

    getNumNodes = () : number => {
        return this.nodes.length;
    }

    addEdgeComplete = (edge : Edge) => {
        this.edges.push(edge);
    }

    getEdges = () : Edge[] => {
        return this.edges;
    }

    clear = () : void => {
        this.fileInfo().clear();
        this.fileInfo().type = Eagle.FileType.Graph;
        this.nodes = [];
        this.edges = [];
    }

    clone = () : LogicalGraph => {
        var result : LogicalGraph = new LogicalGraph();

        result.fileInfo(this.fileInfo().clone());

        // copy nodes
        for (var i = 0 ; i < this.nodes.length ; i++){
            var n_clone = this.nodes[i].clone();
            result.nodes.push(n_clone);
        }

        // copy edges
        for (var i = 0 ; i < this.edges.length ; i++){
            result.edges.push(this.edges[i].clone());
        }

        return result;
    }

    addNode = (node : Node, x: number, y: number, callback : (node: Node) => void) : void => {
        //console.log("addNode()", node.getName());

        // copy node
        var newNode : Node = node.clone();

        // set appropriate key for node (one that is not already in use)
        newNode.setKey(Utils.newKey(this.getNodes()));
        newNode.setPosition(x, y);

        // convert start of end nodes to data components
        if (node.getCategory() === Eagle.Category.Start || node.getCategory() === Eagle.Category.End) {
            // Store the node's location.
            var nodePosition = newNode.getPosition();

            // ask the user which data type should be added
            this.addDataComponentDialog([], (category: Eagle.Category) : void => {
                if (category !== null) {
                    // Add a data component to the graph.
                    newNode = this.addDataComponentToGraph(category, nodePosition);

                    // copy name from the original node
                    newNode.setName(node.getName());

                    // Remove the redundant input/output port.
                    switch(node.getCategory()){
                        case Eagle.Category.Start:
                            newNode.removePortByIndex(0, true);
                            break;
                        case Eagle.Category.End:
                            newNode.removePortByIndex(0, false);
                            break;
                    }

                    // flag that the logical graph has been modified
                    this.fileInfo().modified = true;
                    this.fileInfo.valueHasMutated();

                    if (callback !== null) callback(newNode);
                }
            });
        } else {
            this.nodes.push(newNode);

            // set new keys for embedded applications within node
            if (newNode.hasInputApplication()){
                newNode.getInputApplication().setKey(Utils.newKey(this.getNodes()));
            }
            if (newNode.hasOutputApplication()){
                newNode.getOutputApplication().setKey(Utils.newKey(this.getNodes()));
            }
            if (newNode.hasExitApplication()){
                newNode.getExitApplication().setKey(Utils.newKey(this.getNodes()));
            }

            // flag that the logical graph has been modified
            this.fileInfo().modified = true;
            this.fileInfo.valueHasMutated();

            if (callback !== null) callback(newNode);
        }
    }

    /**
     * Opens a dialog for selecting a data component type.
     */
    addDataComponentDialog = (ineligibleTypes : Eagle.Category[], callback : (dataType: string) => void) : void => {
        // remove the ineligible types from Eagle.dataCategories and store in eligibleTypes
        var eligibleTypes : string[] = [];
        for (var i = 0 ; i < Eagle.dataCategories.length ; i++){
            var ineligible : boolean = false;
            for (var j = 0; j < ineligibleTypes.length ; j++){
                if (Eagle.dataCategories[i] === ineligibleTypes[j]){
                    ineligible = true;
                    break;
                }
            }
            if (!ineligible){
                eligibleTypes.push(Eagle.dataCategories[i]);
            }
        }

        // ask the user to choose from the eligibleTypes
        Utils.requestUserChoice("Add Data Component", "Select data component type", eligibleTypes, 0, false, "", (completed : boolean, userString : string) => {
            if (!completed)
                return;
            callback(userString);
        });
    }

    // TODO: rather than pass just the category, perhaps we should pass the nodeData
    //       then we won't need a reference to Eagle.dataNodes
    /**
     * Adds data component to the graph
     */
    addDataComponentToGraph = (category : Eagle.Category, location : {x: number, y:number}) : Node => {
        // select the correct data component based on the category
        var templateNode : Node;
        for (var i = 0 ; i < Eagle.dataNodes.length ; i++){
            if (Eagle.dataNodes[i].getCategory() === category){
                templateNode = Eagle.dataNodes[i];
            }
        }

        // error if we could not find a node with the correct category in the dataNodes list
        if (templateNode === null){
            console.error("Could not find node with category", category, "in the dataNodes list");
            return null;
        }

        // clone the template node, set position and add to logicalGraph
        var newNode: Node = templateNode.clone();
        newNode.setKey(Utils.newKey(this.getNodes()));
        newNode.setPosition(location.x, location.y);
        this.nodes.push(newNode);

        return newNode;
    }

    findNodeByKey = (key : number) : Node => {
        for (var i = this.nodes.length - 1; i >= 0 ; i--){

            // check if the node itself has a matching key
            if (this.nodes[i].getKey() === key){
                return this.nodes[i];
            }

            // check if the node's inputApp has a matching key
            if (this.nodes[i].hasInputApplication()){
                if (this.nodes[i].getInputApplication().getKey() === key){
                    return this.nodes[i].getInputApplication();
                }
            }

            // check if the node's outputApp has a matching key
            if (this.nodes[i].hasOutputApplication()){
                if (this.nodes[i].getOutputApplication().getKey() === key){
                    return this.nodes[i].getOutputApplication();
                }
            }

            // check if the node's exitApp has a matching key
            if (this.nodes[i].hasExitApplication()){
                if (this.nodes[i].getExitApplication().getKey() === key){
                    return this.nodes[i].getExitApplication();
                }
            }
        }

        console.warn("findNodeByKey(): could not find node with key (", key, ")");
        return null;
    }

    removeNodeByKey = (key : number) : void => {
        // delete edges that start from or end at this node
        for (var i = this.edges.length - 1 ; i >= 0; i--){
            var edge : Edge = this.edges[i];
            if (edge.getSrcNodeKey() === key || edge.getDestNodeKey() === key){
                this.edges.splice(i, 1);
            }
        }

        // delete the node
        for (var i = this.nodes.length - 1; i >= 0 ; i--){
            if (this.nodes[i].getKey() === key){
                this.nodes.splice(i, 1);
            }
        }

        // delete children
        for (var i = this.nodes.length - 1; i >= 0 ; i--){
            if (this.nodes[i].getParentKey() === key){
                this.removeNodeByKey(this.nodes[i].getKey());
            }
        }
    }

    addEdge = (srcNodeKey : number, srcPortId : string, destNodeKey : number, destPortId : string, dataType : string, callback : (edge: Edge) => void) : void => {
        // check if edge is connecting two application components, if so, we should insert a data component (of type chosen by user)
        var srcNode : Node = this.findNodeByKey(srcNodeKey);
        var destNode : Node = this.findNodeByKey(destNodeKey);

        var srcPort : Port = srcNode.findPortById(srcPortId);
        var destPort : Port = destNode.findPortById(destPortId);

        var edgeConnectsTwoApplications : boolean =
            (srcNode.getCategoryType() === Eagle.CategoryType.Application || srcNode.getCategoryType() === Eagle.CategoryType.Group) &&
            (destNode.getCategoryType() === Eagle.CategoryType.Application || destNode.getCategoryType() === Eagle.CategoryType.Group);

        var twoEventPorts : boolean = srcPort.isEvent() && destPort.isEvent();

        // if edge DOES NOT connect two applications, process normally
        if (!edgeConnectsTwoApplications || twoEventPorts){
            var edge : Edge = new Edge(srcNodeKey, srcPortId, destNodeKey, destPortId, dataType);
            this.edges.push(edge);
            if (callback !== null) callback(edge);
            return;
        }

        // by default, use the positions of the nodes themselves to calculate position of new node
        let srcNodePosition = srcNode.getPosition();
        let destNodePosition = destNode.getPosition();

        // if source or destination node is an embedded application, use position of parent construct node
        if (srcNode.isEmbedded()){
            srcNodePosition = this.findNodeByKey(srcNode.getEmbedKey()).getPosition();
        }
        if (destNode.isEmbedded()){
            destNodePosition = this.findNodeByKey(destNode.getEmbedKey()).getPosition();
        }

        // calculate a position for a new data component, halfway between the srcPort and destPort
        var dataComponentPosition = {
            x: (srcNodePosition.x + destNodePosition.x) / 2.0,
            y: (srcNodePosition.y + destNodePosition.y) / 2.0
        };

        // if destination node is a BashShellApp, then the inserted data component may not be a Memory
        var ineligibleTypes : Eagle.Category[] = [];
        if (destNode.getCategory() === Eagle.Category.BashShellApp){
            ineligibleTypes.push(Eagle.Category.Memory);
        }

        // if edge DOES connect two applications, insert data component (of type chosen by user except ineligibleTypes)
        this.addDataComponentDialog(ineligibleTypes, (category : Eagle.Category) : void => {
            if (category !== null) {
                // Add a data component to the graph.
                var newNode : Node = this.addDataComponentToGraph(category, dataComponentPosition);
                var newNodeKey : number = newNode.getKey();

                // set name of new node
                newNode.setName(dataType);

                // add input port and output port for dataType (if they don't exist)
                if (!newNode.hasPortWithName(dataType, true, false)){
                    newNode.addPort(new Port(Utils.uuidv4(), dataType, false, srcPort.getType()), true);
                }
                if (!newNode.hasPortWithName(dataType, false, false)){
                    newNode.addPort(new Port(Utils.uuidv4(), dataType, false, destPort.getType()), false);
                }

                // set the parent of the new node
                // by default, set parent to parent of source node,
                newNode.setParentKey(srcNode.getParentKey());

                // if source node is a child of dest node, make the new node a child too
                if (srcNode.getParentKey() === destNode.getKey()){
                    newNode.setParentKey(destNode.getKey());
                }

                // if dest node is a child of source node, make the new node a child too
                if (destNode.getParentKey() === srcNode.getKey()){
                    newNode.setParentKey(srcNode.getKey());
                }

                // get references to input port and output port
                var newInputPortId : string = newNode.findPortByName(dataType, true, false).getId();
                var newOutputPortId : string = newNode.findPortByName(dataType, false, false).getId();

                // create TWO edges, one from src to data component, one from data component to dest
                var firstEdge : Edge = new Edge(srcNodeKey, srcPortId, newNodeKey, newInputPortId, dataType);
                var secondEdge : Edge = new Edge(newNodeKey, newOutputPortId, destNodeKey, destPortId, dataType);

                this.edges.push(firstEdge);
                this.edges.push(secondEdge);

                // reply with one of the edges
                if (callback !== null) callback(firstEdge);
            }
        });
    }

    findEdgeById = (id: string) : Edge => {
        for (var i = this.edges.length - 1; i >= 0 ; i--){
            if (this.edges[i].getId() === id){
                return this.edges[i];
            }
        }
        return null;
    }

    removeEdgeById = (id: string) : void => {
        for (var i = this.edges.length - 1; i >= 0 ; i--){
            if (this.edges[i].getId() === id){
                this.edges.splice(i, 1);
            }
        }
    }

    portIsLinked = (nodeKey : number, portId : string) : boolean => {
        for (var i = 0 ; i < this.edges.length; i++){
            var edge : Edge = this.edges[i];

            if (edge.getSrcNodeKey() === nodeKey && edge.getSrcPortId() === portId ||
                edge.getDestNodeKey() === nodeKey && edge.getDestPortId() === portId){
                return true;
            }
        }

        return false;
    }

    shrinkNode = (node : Node) : void => {
        // abort shrink of non-group node
        if (!node.isGroup()){
            return;
        }

        var nodes : Node[] = this.getNodes();
        var minX : number = Number.MAX_SAFE_INTEGER;
        var minY : number = Number.MAX_SAFE_INTEGER;
        var maxX : number = Number.MIN_SAFE_INTEGER;
        var maxY : number = Number.MIN_SAFE_INTEGER;
        var numChildren : number = 0;

        // loop through all nodes, finding all children and determining minimum bounding box to contain all children
        for (var i = 0 ; i < nodes.length ; i++){
            var n = nodes[i];

            if (n.getParentKey() === node.getKey()){
                numChildren += 1;

                if (n.getPosition().x < minX){
                    minX = n.getPosition().x;
                }
                if (n.getPosition().y < minY){
                    minY = n.getPosition().y;
                }
                if (n.getPosition().x + n.getDisplayWidth() > maxX){
                    maxX = n.getPosition().x + n.getDisplayWidth();
                }
                if (n.getPosition().y + n.getDisplayHeight() > maxY){
                    maxY = n.getPosition().y + n.getDisplayHeight();
                }
            }
        }

        //console.log("minX", minX, "minY", minY, "maxX", maxX, "maxY", maxY, "numChildren", numChildren);

        // if no children were found, set to default size
        if (numChildren === 0){
            node.setWidth(Node.DEFAULT_WIDTH);
            node.setHeight(Node.DEFAULT_HEIGHT);
            return;
        }

        // TODO: add some padding
        minX -= 24;
        minY -= 96;
        maxX += 24;
        maxY += 16;

        // set the size of the node
        node.setPosition(minX, minY);
        node.setWidth(maxX - minX);
        node.setHeight(maxY - minY);
    }
}
