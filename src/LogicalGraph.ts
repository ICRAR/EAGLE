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
        const result : any = {};

        result.modelData = FileInfo.toOJSJson(graph.fileInfo());
        result.modelData.schemaVersion = Eagle.DALiuGESchemaVersion.OJS;

        // add nodes
        result.nodeDataArray = [];
        for (const node of graph.getNodes()){
            const nodeData : any = Node.toOJSJson(node);
            result.nodeDataArray.push(nodeData);
        }

        // add links
        result.linkDataArray = [];
        for (const edge of graph.getEdges()){
            const linkData : any = Edge.toOJSJson(edge);

            let srcKey = edge.getSrcNodeKey();
            let destKey = edge.getDestNodeKey();

            const srcNode = graph.findNodeByKey(srcKey);
            const destNode = graph.findNodeByKey(destKey);

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
        const result : LogicalGraph = new LogicalGraph();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromOJSJson(dataObject.modelData, errors));

        // add nodes
        for (const nodeData of dataObject.nodeDataArray){
            const extraUsedKeys: number[] = [];

            const newNode = Node.fromOJSJson(nodeData, errors, (): number => {
                const resultKeys: number[] = Utils.getUsedKeys(result.nodes);
                const nodeDataKeys: number[] = Utils.getUsedKeysFromNodeData(dataObject.nodeDataArray);
                const combinedKeys: number[] = resultKeys.concat(nodeDataKeys.concat(extraUsedKeys));

                const newKey = Utils.findNewKey(combinedKeys);

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
        for (let i = 0 ; i < dataObject.nodeDataArray.length ; i++){
            const nodeData = dataObject.nodeDataArray[i];
            const parentIndex = GraphUpdater.findIndexOfNodeDataArrayWithKey(dataObject.nodeDataArray, nodeData.group);

            if (parentIndex !== -1){
                result.nodes[i].setParentKey(result.nodes[parentIndex].getKey());
            }
        }

        // add edges
        for (let i = 0 ; i < dataObject.linkDataArray.length ; i++){
            const linkData = dataObject.linkDataArray[i];

            // find source node
            const srcNode : Node = result.findNodeByKey(linkData.from);

            // abort if source node not found
            if (srcNode === null){
                const error : string = "Unable to find node with key " + linkData.from + " used as source node in link " + i + ". Discarding link!";
                console.warn(error);
                errors.push(error);
                continue;
            }

            // find source port on source node
            let srcPort : Port = srcNode.findPortById(linkData.fromPort);

            // if source port was not found on source node, check the source node's embedded application nodes
            // and if found on one of those, update the port's nodeKey to reflect the actual node it is on
            if (srcPort === null){
                const found: {key: number, port: Port} = srcNode.findPortInApplicationsById(linkData.fromPort);
                if (found.port !== null){
                    const error: string = "Updated edge " + i + " source node from construct " + linkData.from + " to embedded application node " + found.key;
                    srcPort = found.port;
                    linkData.from = found.key;
                    console.warn(error);
                    errors.push(error);
                }
            }

            // abort if source port not found
            if (srcPort === null){
                const error : string = "Unable to find port " + linkData.fromPort + " on node " + linkData.from + " used in link " + i;
                console.warn(error);
                errors.push(error);
                continue;
            }

            // find destination node
            const destNode : Node = result.findNodeByKey(linkData.to);

            // abort if dest node not found
            if (destNode === null){
                const error : string = "Unable to find node with key " + linkData.to + " used as destination node in link " + i + ". Discarding link!";
                console.warn(error);
                errors.push(error);
                continue;
            }

            // find dest port on dest node
            let destPort : Port = destNode.findPortById(linkData.toPort);

            // if destination port was not found on destination node, check the destination node's embedded application nodes
            // and if found on one of those, update the port's nodeKey to reflect the actual node it is on
            if (destPort === null){
                const found: {key: number, port: Port} = destNode.findPortInApplicationsById(linkData.toPort);
                if (found.port !== null){
                    const error: string = "Updated edge " + i + " destination node from construct " + linkData.to + " to embedded application node " + found.key;
                    destPort = found.port;
                    linkData.to = found.key;
                    console.warn(error);
                    errors.push(error);
                }
            }

            // abort if dest port not found
            if (destPort === null){
                const error : string = "Unable to find port " + linkData.toPort + " on node " + linkData.to + " used in link " + i;
                console.warn(error);
                errors.push(error);
                continue;
            }

            // try to read loop_aware attribute
            let loopAware: boolean = false;
            if (typeof linkData.loop_aware !== 'undefined'){
                loopAware = linkData.loop_aware !== "0";
            }

            result.edges.push(new Edge(linkData.from, linkData.fromPort, linkData.to, linkData.toPort, srcPort.getName(), loopAware));
        }

        // check for missing name
        if (result.fileInfo().name === ""){
            const error : string = "FileInfo.name is empty. Setting name to " + file.name;
            console.warn(error);
            errors.push(error);

            result.fileInfo().name = file.name;
        }

        const hadNegativePositions : boolean = GraphUpdater.correctOJSNegativePositions(result);
        if (hadNegativePositions){
            console.log("Adjusting position of all nodes to move to positive quadrant.");
        }

        return result;
    }

    static toV3Json = (graph : LogicalGraph) : object => {
        const result : any = {};

        result.DALiuGEGraph = {};
        const dlgg = result.DALiuGEGraph;

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
        for (let i = 0 ; i < graph.getNodes().length ; i++){
            const node : Node = graph.getNodes()[i];
            const nodeData : any = Node.toV3NodeJson(node, i);

            dlgg.nodeData[node.getKey()] = nodeData;
        }

        // add links
        dlgg.linkData = {};
        for (let i = 0 ; i < graph.getEdges().length ; i++){
            const edge : Edge = graph.getEdges()[i];
            const linkData : any = Edge.toV3Json(edge);

            dlgg.linkData[i] = linkData;
        }

        // add components
        dlgg.componentData = {};
        for (const node of graph.getNodes()){
            dlgg.componentData[node.getKey()] = Node.toV3ComponentJson(node);
        }

        return result;
    }

    static fromV3Json = (dataObject : any, file : RepositoryFile, errors : string[]) : LogicalGraph => {
        const result: LogicalGraph = new LogicalGraph();
        const dlgg = dataObject.DALiuGEGraph;

        result.fileInfo().type = dlgg.type;
        result.fileInfo().name = dlgg.name;
        result.fileInfo().schemaVersion = dlgg.schemaVersion;
        result.fileInfo().sha = dlgg.commitHash;
        result.fileInfo().repositoryService = dlgg.repositoryService;
        result.fileInfo().repositoryBranch = dlgg.repositoryBranch;
        result.fileInfo().repositoryName = dlgg.repositoryName;
        result.fileInfo().path = dlgg.repositoryPath;

        for (const key in dlgg.nodeData){
            const node = Node.fromV3NodeJson(dlgg.nodeData[key], key, errors);

            Node.fromV3ComponentJson(dlgg.componentData[key], node, errors);

            result.nodes.push(node);
        }

        for (const key in dlgg.linkData){
            const edge = Edge.fromV3Json(dlgg.linkData[key], errors);
            result.edges.push(edge);
        }

        return result;
    }

    static toAppRefJson = (graph : LogicalGraph) : object => {
        const result : any = {};

        result.modelData = FileInfo.toOJSJson(graph.fileInfo());
        result.modelData.schemaVersion = Eagle.DALiuGESchemaVersion.AppRef;

        // add nodes
        result.nodeDataArray = [];
        for (const node of graph.getNodes()){
            const nodeData : any = Node.toAppRefJson(node);
            result.nodeDataArray.push(nodeData);
        }

        // add embedded nodes
        for (let i = 0 ; i < graph.getNodes().length ; i++){
            const node : Node = graph.getNodes()[i];

            if (node.hasInputApplication()){
                const nodeData : any = Node.toAppRefJson(node.getInputApplication());

                // update ref in parent
                result.nodeDataArray[i].inputApplicationRef = nodeData.key;

                // add child to nodeDataArray
                result.nodeDataArray.push(nodeData);
            }

            if (node.hasOutputApplication()){
                const nodeData : any = Node.toAppRefJson(node.getOutputApplication());

                // update ref in parent
                result.nodeDataArray[i].outputApplicationRef = nodeData.key;

                // add child to nodeDataArray
                result.nodeDataArray.push(nodeData);
            }

            if (node.hasExitApplication()){
                const nodeData : any = Node.toAppRefJson(node.getExitApplication());

                // update ref in parent
                result.nodeDataArray[i].exitApplicationRef = nodeData.key;

                // add child to nodeDataArray
                result.nodeDataArray.push(nodeData);
            }
        }

        // add links
        result.linkDataArray = [];
        for (const edge of graph.getEdges()){
            result.linkDataArray.push(Edge.toAppRefJson(edge, graph));
        }

        return result;
    }

    static fromAppRefJson = (dataObject : any, file : RepositoryFile, errors : string[]) : LogicalGraph => {
        // create new logical graph object
        const result : LogicalGraph = new LogicalGraph();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromOJSJson(dataObject.modelData, errors));

        // add nodes
        for (const nodeData of dataObject.nodeDataArray){
            let node;

            // check if node is an embedded node, if so, don't push to nodes array
            if (nodeData.embedKey === null){
                node = Node.fromAppRefJson(nodeData, errors);
            } else {
                // skip node
                continue;
            }

            // check if this node has an embedded input application, if so, find and copy it now
            if (typeof nodeData.inputApplicationRef !== 'undefined'){
                const inputAppNodeData = LogicalGraph._findNodeDataWithKey(dataObject.nodeDataArray, nodeData.inputApplicationRef);
                node.setInputApplication(Node.fromAppRefJson(inputAppNodeData, errors));
            }
            // check if this node has an embedded output application, if so, find and copy it now
            if (typeof nodeData.outputApplicationRef !== 'undefined'){
                const outputAppNodeData = LogicalGraph._findNodeDataWithKey(dataObject.nodeDataArray, nodeData.outputApplicationRef);
                node.setOutputApplication(Node.fromAppRefJson(outputAppNodeData, errors));
            }
            // check if this node has an embedded exit application, if so, find and copy it now
            if (typeof nodeData.exitApplicationRef !== 'undefined'){
                 const exitAppNodeData = LogicalGraph._findNodeDataWithKey(dataObject.nodeDataArray, nodeData.exitApplicationRef);
                node.setExitApplication(Node.fromAppRefJson(exitAppNodeData, errors));
            }

            result.nodes.push(node);
        }

        // add edges
        for (const linkData of dataObject.linkDataArray){
            result.edges.push(Edge.fromAppRefJson(linkData, errors));
        }

        // check for missing name
        if (result.fileInfo().name === ""){
            const error : string = "FileInfo.name is empty. Setting name to " + file.name;
            console.warn(error);
            errors.push(error);

            result.fileInfo().name = file.name;
        }

        return result;
    }

    static _findNodeDataWithKey = (nodeDataArray: any[], key: number): any => {
        for (const nodeData of nodeDataArray){
            if (nodeData.key === key){
                return nodeData;
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
        const result : LogicalGraph = new LogicalGraph();

        result.fileInfo(this.fileInfo().clone());

        // copy nodes
        for (const node of this.nodes){
            result.nodes.push(node.clone());
        }

        // copy edges
        for (const edge of this.edges){
            result.edges.push(edge.clone());
        }

        return result;
    }

    // NOTE: clones the node internally
    addNode = (node : Node, x: number, y: number, callback : (node: Node) => void) : void => {
        // copy node
        let newNode : Node = node.clone();

        // set appropriate key for node (one that is not already in use)
        newNode.setId(Utils.uuidv4());
        newNode.setKey(Utils.newKey(this.getNodes()));
        newNode.setPosition(x, y);
        newNode.setReadonly(false);
        newNode.setEmbedKey(null);

        // convert start of end nodes to data components
        if (newNode.getCategory() === Eagle.Category.Start || newNode.getCategory() === Eagle.Category.End) {
            // Store the node's location.
            const nodePosition = newNode.getPosition();

            // ask the user which data type should be added
            this.addDataComponentDialog([], (category: Eagle.Category) : void => {
                if (category !== null) {
                    // Add a data component to the graph.
                    newNode = this.addDataComponentToGraph(category, nodePosition);

                    // copy name from the original node
                    newNode.setName(node.getName());

                    // Remove the redundant input/output port.
                    switch(newNode.getCategory()){
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

            // set new ids for any ports in this node
            Utils.giveNodePortsNewIds(newNode);

            // set new keys for embedded applications within node, and new ids for ports within those embedded nodes
            if (newNode.hasInputApplication()){
                newNode.getInputApplication().setKey(Utils.newKey(this.getNodes()));
                newNode.getInputApplication().setEmbedKey(newNode.getKey());

                Utils.giveNodePortsNewIds(newNode.getInputApplication());
            }
            if (newNode.hasOutputApplication()){
                newNode.getOutputApplication().setKey(Utils.newKey(this.getNodes()));
                newNode.getOutputApplication().setEmbedKey(newNode.getKey());

                Utils.giveNodePortsNewIds(newNode.getOutputApplication());
            }
            if (newNode.hasExitApplication()){
                newNode.getExitApplication().setKey(Utils.newKey(this.getNodes()));
                newNode.getExitApplication().setEmbedKey(newNode.getKey());

                Utils.giveNodePortsNewIds(newNode.getExitApplication());
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
        const eligibleTypes : string[] = [];
        for (const dataCategory of Eagle.dataCategories){
            let ineligible : boolean = false;
            for (const ineligibleType of ineligibleTypes){
                if (dataCategory === ineligibleType){
                    ineligible = true;
                    break;
                }
            }
            if (!ineligible){
                eligibleTypes.push(dataCategory);
            }
        }

        // ask the user to choose from the eligibleTypes
        Utils.requestUserChoice("Add Data Component", "Select data component type", eligibleTypes, 0, false, "", (completed : boolean, userChoiceIndex : number) => {
            if (!completed)
                return;
            callback(eligibleTypes[userChoiceIndex]);
        });
    }

    // TODO: rather than pass just the category, perhaps we should pass the nodeData
    //       then we won't need a reference to Eagle.dataNodes
    /**
     * Adds data component to the graph
     */
    addDataComponentToGraph = (category : Eagle.Category, location : {x: number, y:number}) : Node => {
        // select the correct data component based on the category
        let templateNode : Node;
        for (const dataNode of Eagle.dataNodes){
            if (dataNode.getCategory() === category){
                templateNode = dataNode;
            }
        }

        // error if we could not find a node with the correct category in the dataNodes list
        if (templateNode === null){
            console.error("Could not find node with category", category, "in the dataNodes list");
            return null;
        }

        // clone the template node, set position and add to logicalGraph
        const newNode: Node = templateNode.clone();
        newNode.setKey(Utils.newKey(this.getNodes()));
        newNode.setPosition(location.x, location.y);
        this.nodes.push(newNode);

        return newNode;
    }

    findNodeByKey = (key : number) : Node => {
        for (let i = this.nodes.length - 1; i >= 0 ; i--){

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

    removeNode = (node: Node) : void => {
        const key = node.getKey();

        // delete edges incident on this node
        this.removeEdgesByKey(key);

        // delete edges incident on the embedded apps of this node
        if (node.hasInputApplication()){
            this.removeEdgesByKey(node.getInputApplication().getKey());
        }
        if (node.hasOutputApplication()){
            this.removeEdgesByKey(node.getOutputApplication().getKey());
        }
        if (node.hasExitApplication()){
            this.removeEdgesByKey(node.getExitApplication().getKey());
        }

        // delete the node
        for (let i = this.nodes.length - 1; i >= 0 ; i--){
            if (this.nodes[i].getKey() === key){
                this.nodes.splice(i, 1);
            }
        }

        // delete children
        for (let i = this.nodes.length - 1; i >= 0 ; i--){
            // check that iterator still points to a valid element in the nodes array
            // a check like this wouldn't normally be necessary, but we are deleting elements from the array within the loop, so it might be shorter than we expect
            if (i >= this.nodes.length){
                continue;
            }

            if (this.nodes[i].getParentKey() === key){
                this.removeNode(this.nodes[i]);
            }
        }
    }

    addEdge = (srcNodeKey : number, srcPortId : string, destNodeKey : number, destPortId : string, dataType : string, loopAware: boolean, callback : (edge: Edge) => void) : void => {
        // check if edge is connecting two application components, if so, we should insert a data component (of type chosen by user)
        const srcNode : Node = this.findNodeByKey(srcNodeKey);
        const destNode : Node = this.findNodeByKey(destNodeKey);

        const srcPort : Port = srcNode.findPortById(srcPortId);
        const destPort : Port = destNode.findPortById(destPortId);

        const edgeConnectsTwoApplications : boolean =
            (srcNode.getCategoryType() === Eagle.CategoryType.Application || srcNode.getCategoryType() === Eagle.CategoryType.Group) &&
            (destNode.getCategoryType() === Eagle.CategoryType.Application || destNode.getCategoryType() === Eagle.CategoryType.Group);

        const twoEventPorts : boolean = srcPort.isEvent() && destPort.isEvent();

        // if edge DOES NOT connect two applications, process normally
        if (!edgeConnectsTwoApplications || twoEventPorts){
            const edge : Edge = new Edge(srcNodeKey, srcPortId, destNodeKey, destPortId, dataType, loopAware);
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
        const dataComponentPosition = {
            x: (srcNodePosition.x + destNodePosition.x) / 2.0,
            y: (srcNodePosition.y + destNodePosition.y) / 2.0
        };

        // if destination node is a BashShellApp, then the inserted data component may not be a Memory
        const ineligibleTypes : Eagle.Category[] = [];
        if (destNode.getCategory() === Eagle.Category.BashShellApp){
            ineligibleTypes.push(Eagle.Category.Memory);
        }

        // if edge DOES connect two applications, insert data component (of type chosen by user except ineligibleTypes)
        this.addDataComponentDialog(ineligibleTypes, (category : Eagle.Category) : void => {
            if (category !== null) {
                // Add a data component to the graph.
                const newNode : Node = this.addDataComponentToGraph(category, dataComponentPosition);
                const newNodeKey : number = newNode.getKey();

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
                const newInputPortId : string = newNode.findPortByName(dataType, true, false).getId();
                const newOutputPortId : string = newNode.findPortByName(dataType, false, false).getId();

                // create TWO edges, one from src to data component, one from data component to dest
                const firstEdge : Edge = new Edge(srcNodeKey, srcPortId, newNodeKey, newInputPortId, dataType, loopAware);
                const secondEdge : Edge = new Edge(newNodeKey, newOutputPortId, destNodeKey, destPortId, dataType, loopAware);

                this.edges.push(firstEdge);
                this.edges.push(secondEdge);

                // reply with one of the edges
                if (callback !== null) callback(firstEdge);
            }
        });
    }

    findEdgeById = (id: string) : Edge => {
        for (let i = this.edges.length - 1; i >= 0 ; i--){
            if (this.edges[i].getId() === id){
                return this.edges[i];
            }
        }
        return null;
    }

    removeEdgeById = (id: string) : void => {
        for (let i = this.edges.length - 1; i >= 0 ; i--){
            if (this.edges[i].getId() === id){
                this.edges.splice(i, 1);
            }
        }
    }

    // delete edges that start from or end at the node with the given key
    removeEdgesByKey = (key: number) : void => {
        for (let i = this.edges.length - 1 ; i >= 0; i--){
            const edge : Edge = this.edges[i];
            if (edge.getSrcNodeKey() === key || edge.getDestNodeKey() === key){
                this.edges.splice(i, 1);
            }
        }
    }

    portIsLinked = (nodeKey : number, portId : string) : boolean => {
        for (const edge of this.edges){
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

        const nodes : Node[] = this.getNodes();
        let minX : number = Number.MAX_SAFE_INTEGER;
        let minY : number = Number.MAX_SAFE_INTEGER;
        let maxX : number = Number.MIN_SAFE_INTEGER;
        let maxY : number = Number.MIN_SAFE_INTEGER;
        let numChildren : number = 0;

        // loop through all nodes, finding all children and determining minimum bounding box to contain all children
        for (const n of nodes){
            if (n.getParentKey() === node.getKey()){
                numChildren += 1;

                if (n.getPosition().x < minX){
                    minX = n.getPosition().x;
                }
                if (n.getPosition().y < minY){
                    minY = n.getPosition().y;
                }
                if (n.getPosition().x + n.getWidth() > maxX){
                    maxX = n.getPosition().x + n.getWidth();
                }
                if (n.getPosition().y + n.getHeight() > maxY){
                    maxY = n.getPosition().y + n.getHeight();
                }
            }
        }

        // if no children were found, set to default size
        if (numChildren === 0){
            node.setWidth(Node.DEFAULT_WIDTH);
            node.setHeight(Node.DEFAULT_HEIGHT);
            return;
        }

        // add some padding
        minX -= 24;
        minY -= 96;
        maxX += 24;
        maxY += 16;

        // set the size of the node
        node.setPosition(minX, minY);
        node.setWidth(maxX - minX);
        node.setHeight(maxY - minY);
    }

    findMultiplicity = (node : Node) : number => {
        let n : Node = node;
        let result : number = 1;
        let iterations : number = 0;

        while (true){
            if (iterations > 10){
                console.error("too many iterations in findMultiplicity()");
                break;
            }

            iterations += 1;

            if (n.getParentKey() === null){
                break;
            }

            n = this.findNodeByKey(n.getParentKey());

            if (n === null){
                break;
            }

            result *= n.getLocalMultiplicity();
        }

        return result;
    }

    checkForNodeAt = (x: number, y: number, width: number, height: number, ignoreKey: number) : Node => {
        for (const node of this.nodes){
            // abort if checking for self!
            if (node.getKey() === ignoreKey){
                continue;
            }

            if (Utils.nodesOverlap(x, y, width, height, node.getPosition().x, node.getPosition().y, node.getWidth(), node.getHeight())){
                return node;
            }
        }
        return null;
    }

    static normaliseNodes = (nodes: Node[], marginX: number, marginY: number) : {x: number, y: number} => {
        let minX = Number.MAX_SAFE_INTEGER;
        let maxX = Number.MIN_SAFE_INTEGER;
        let minY = Number.MAX_SAFE_INTEGER;
        let maxY = Number.MIN_SAFE_INTEGER;

        // find the max and min extent of all nodes in the x and y axis
        for (const node of nodes){
            if (node.getPosition().x < minX){
                minX = node.getPosition().x;
            }

            if (node.getPosition().y < minY){
                minY = node.getPosition().y;
            }

            if (node.getPosition().x + node.getWidth() > maxX){
                maxX = node.getPosition().x + node.getWidth();
            }

            if (node.getPosition().y + node.getHeight() > maxY){
                maxY = node.getPosition().y + node.getHeight();
            }
        }

        // move all nodes so that the top left corner of the graph starts at the origin 0,0
        for (const node of nodes){
            const pos = node.getPosition();
            node.setPosition(pos.x - minX + marginX, pos.y - minY + marginY);
        }

        return {x: maxX - minX + marginX*2, y: maxY - minY + marginY*2};
    }
}
