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

import {Eagle} from './Eagle';
import {Edge} from './Edge';
import {Errors} from './Errors';
import {Field} from './Field';
import {FileInfo} from './FileInfo';
import {GraphUpdater} from './GraphUpdater';
import {Node} from './Node';
import {RepositoryFile} from './RepositoryFile';
import {Setting} from './Setting';
import {Utils} from './Utils';

export class LogicalGraph {
    fileInfo : ko.Observable<FileInfo>;
    private nodes : ko.ObservableArray<Node>;
    private edges : ko.ObservableArray<Edge>;

    constructor(){
        this.fileInfo = ko.observable(new FileInfo());
        this.fileInfo().type = Eagle.FileType.Graph;
        this.nodes = ko.observableArray([]);
        this.edges = ko.observableArray([]);
    }

    static toOJSJson = (graph : LogicalGraph, forTranslation : boolean) : object => {
        const result : any = {};

        result.modelData = FileInfo.toOJSJson(graph.fileInfo());
        result.modelData.schemaVersion = Eagle.DALiuGESchemaVersion.OJS;
        result.modelData.numLGNodes = graph.getNodes().length;

        // add nodes
        result.nodeDataArray = [];
        for (const node of graph.getNodes()){
            const nodeData : any = Node.toOJSGraphJson(node);
            result.nodeDataArray.push(nodeData);
        }

        // add links
        result.linkDataArray = [];
        for (const edge of graph.getEdges()){
            if (forTranslation && Setting.findValue(Utils.SKIP_CLOSE_LOOP_EDGES)){
                if (edge.isClosesLoop()){
                    continue;
                }
            }

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

    static fromOJSJson = (dataObject : any, file : RepositoryFile, errorsWarnings : Errors.ErrorsWarnings) : LogicalGraph => {
        // create new logical graph object
        const result : LogicalGraph = new LogicalGraph();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromOJSJson(dataObject.modelData, errorsWarnings));

        // add nodes
        for (const nodeData of dataObject.nodeDataArray){
            const extraUsedKeys: number[] = [];

            const newNode = Node.fromOJSJson(nodeData, errorsWarnings, (): number => {
                const resultKeys: number[] = Utils.getUsedKeys(result.nodes());
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
                result.nodes()[i].setParentKey(result.nodes()[parentIndex].getKey());
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
                errorsWarnings.errors.push(Errors.Message(error));
                continue;
            }

            // find source port on source node
            let srcPort : Field = srcNode.findPortById(linkData.fromPort);

            // if source port was not found on source node, check the source node's embedded application nodes
            // and if found on one of those, update the port's nodeKey to reflect the actual node it is on
            if (srcPort === null){
                const found: {key: number, port: Field} = srcNode.findPortInApplicationsById(linkData.fromPort);
                if (found.port !== null){
                    const message: string = "Updated edge " + i + " source node from construct " + linkData.from + " to embedded application node " + found.key+ " and port " + found.port.getId();
                    srcPort = found.port;
                    linkData.from = found.key;
                    errorsWarnings.warnings.push(Errors.Message(message));
                }
            }

            // abort if source port not found
            if (srcPort === null){
                const error : string = "Unable to find port " + linkData.fromPort + " on node " + linkData.from + " used in link " + i;
                errorsWarnings.errors.push(Errors.Message(error));
                continue;
            }

            // find destination node
            const destNode : Node = result.findNodeByKey(linkData.to);

            // abort if dest node not found
            if (destNode === null){
                const error : string = "Unable to find node with key " + linkData.to + " used as destination node in link " + i + ". Discarding link!";
                errorsWarnings.errors.push(Errors.Message(error));
                continue;
            }

            // find dest port on dest node
            let destPort : Field = destNode.findPortById(linkData.toPort);

            // if destination port was not found on destination node, check the destination node's embedded application nodes
            // and if found on one of those, update the port's nodeKey to reflect the actual node it is on
            if (destPort === null){
                const found: {key: number, port: Field} = destNode.findPortInApplicationsById(linkData.toPort);
                if (found.port !== null){
                    const message: string = "Updated edge " + i + " destination node from construct " + linkData.to + " to embedded application node " + found.key + " and port " + found.port.getId();
                    destPort = found.port;
                    linkData.to = found.key;
                    errorsWarnings.warnings.push(Errors.Message(message));
                }
            }

            // abort if dest port not found
            if (destPort === null){
                const error : string = "Unable to find port " + linkData.toPort + " on node " + linkData.to + " used in link " + i;
                errorsWarnings.errors.push(Errors.Message(error));
                continue;
            }

            // try to read the dataType attribute
            let dataType: string = Eagle.DataType_Unknown;
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

            let closesLoop: boolean = false;
            if (typeof linkData.closesLoop !== 'undefined'){
                closesLoop = linkData.closesLoop;
            }

            result.edges.push(new Edge(linkData.from, linkData.fromPort, linkData.to, linkData.toPort, linkData.dataType, loopAware, closesLoop, false));
        }

        // check for missing name
        if (result.fileInfo().name === ""){
            const error : string = "FileInfo.name is empty. Setting name to " + file.name;
            errorsWarnings.errors.push(Errors.Message(error));

            result.fileInfo().name = file.name;
        }

        // move all the nodes into the
        //const hadNegativePositions : boolean = GraphUpdater.correctOJSNegativePositions(result);

        return result;
    }

/*
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
    */

/*
    static fromV3Json = (dataObject : any, file : RepositoryFile, errorsWarnings : Eagle.ErrorsWarnings) : LogicalGraph => {
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
            const node = Node.fromV3NodeJson(dlgg.nodeData[key], key, errorsWarnings);

            Node.fromV3ComponentJson(dlgg.componentData[key], node, errorsWarnings);

            result.nodes.push(node);
        }

        for (const key in dlgg.linkData){
            const edge = Edge.fromV3Json(dlgg.linkData[key], errorsWarnings);
            result.edges.push(edge);
        }

        return result;
    }
*/
/*
    static toAppRefJson = (graph : LogicalGraph) : object => {
        const result : any = {};

        result.modelData = FileInfo.toOJSJson(graph.fileInfo());
        result.modelData.schemaVersion = Eagle.DALiuGESchemaVersion.AppRef;
        result.modelData.numLGNodes = graph.getNodes().length;

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
        }

        // add links
        result.linkDataArray = [];
        for (const edge of graph.getEdges()){
            result.linkDataArray.push(Edge.toAppRefJson(edge, graph));
        }

        return result;
    }
*/
/*
    static fromAppRefJson = (dataObject : any, file : RepositoryFile, errorsWarnings : Eagle.ErrorsWarnings) : LogicalGraph => {
        // create new logical graph object
        const result : LogicalGraph = new LogicalGraph();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromOJSJson(dataObject.modelData, errorsWarnings));

        // add nodes
        for (const nodeData of dataObject.nodeDataArray){
            let node;

            // check if node is an embedded node, if so, don't push to nodes array
            if (nodeData.embedKey === null){
                node = Node.fromAppRefJson(nodeData, errorsWarnings);
            } else {
                // skip node
                continue;
            }

            // check if this node has an embedded input application, if so, find and copy it now
            if (typeof nodeData.inputApplicationRef !== 'undefined'){
                const inputAppNodeData = LogicalGraph._findNodeDataWithKey(dataObject.nodeDataArray, nodeData.inputApplicationRef);
                node.setInputApplication(Node.fromAppRefJson(inputAppNodeData, errorsWarnings));
            }
            // check if this node has an embedded output application, if so, find and copy it now
            if (typeof nodeData.outputApplicationRef !== 'undefined'){
                const outputAppNodeData = LogicalGraph._findNodeDataWithKey(dataObject.nodeDataArray, nodeData.outputApplicationRef);
                node.setOutputApplication(Node.fromAppRefJson(outputAppNodeData, errorsWarnings));
            }

            result.nodes.push(node);
        }

        // add edges
        for (const linkData of dataObject.linkDataArray){
            result.edges.push(Edge.fromAppRefJson(linkData, errorsWarnings));
        }

        // check for missing name
        if (result.fileInfo().name === ""){
            const error : string = "FileInfo.name is empty. Setting name to " + file.name;
            console.warn(error);
            errorsWarnings.errors.push(error);

            result.fileInfo().name = file.name;
        }

        return result;
    }
*/

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
        return this.nodes();
    }

    getNumNodes = () : number => {
        return this.nodes().length;
    }

    addEdgeComplete = (edge : Edge) => {
        this.edges.push(edge);
    }

    getEdges = () : Edge[] => {
        return this.edges();
    }

    getNumEdges = () : number => {
        return this.edges().length;
    }

    clear = () : void => {
        this.fileInfo().clear();
        this.fileInfo().type = Eagle.FileType.Graph;
        this.nodes([]);
        this.edges([]);
    }

    clone = () : LogicalGraph => {
        const result : LogicalGraph = new LogicalGraph();

        result.fileInfo(this.fileInfo().clone());

        // copy nodes
        for (const node of this.nodes()){
            result.nodes.push(node.clone());
        }

        // copy edges
        for (const edge of this.edges()){
            result.edges.push(edge.clone());
        }

        return result;
    }

    /**
     * Opens a dialog for selecting a data component type.
     */
    addDataComponentDialog = (eligibleComponents : Node[], callback : (node: Node) => void) : void => {
        /*
        let eligibleTypes: Eagle.Category[] = [];

        // build list of data categories
        const dataCategories : Eagle.Category[] = Utils.buildComponentList((cData: Eagle.CategoryData) => {
            return cData.isData;
        });

        // loop through dataCategories and store in eligibleTypes, except where category appears in ineligibleTypes
        for (const dataCategory of dataCategories){
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
        */
        const eligibleComponentNames: string[] = [];
        for (const component of eligibleComponents){
            eligibleComponentNames.push(component.getName());
        }


        // ask the user to choose from the eligibleTypes
        Utils.requestUserChoice("Add Data Component", "Select data component type", eligibleComponentNames, 0, false, "", (completed : boolean, userChoiceIndex : number) => {
            if (!completed)
                return;
            callback(eligibleComponents[userChoiceIndex]);
        });
    }

    /**
     * Adds data component to the graph (with a new id)
     */
    addDataComponentToGraph = (node: Node, location : {x: number, y:number}) : Node => {
        // clone the template node, set position and add to logicalGraph
        const newNode: Node = node.clone();
        newNode.setPosition(location.x, location.y);
        this.nodes.push(newNode);

        return newNode;
    }

    findNodeByKey = (key : number) : Node => {
        for (let i = this.nodes().length - 1; i >= 0 ; i--){

            // check if the node itself has a matching key
            if (this.nodes()[i].getKey() === key){
                return this.nodes()[i];
            }

            // check if the node's inputApp has a matching key
            if (this.nodes()[i].hasInputApplication()){
                if (this.nodes()[i].getInputApplication().getKey() === key){
                    return this.nodes()[i].getInputApplication();
                }
            }

            // check if the node's outputApp has a matching key
            if (this.nodes()[i].hasOutputApplication()){
                if (this.nodes()[i].getOutputApplication().getKey() === key){
                    return this.nodes()[i].getOutputApplication();
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

        // delete the node
        for (let i = this.nodes().length - 1; i >= 0 ; i--){
            if (this.nodes()[i].getKey() === key){
                this.nodes.splice(i, 1);
            }
        }

        // delete children
        for (let i = this.nodes().length - 1; i >= 0 ; i--){
            // check that iterator still points to a valid element in the nodes array
            // a check like this wouldn't normally be necessary, but we are deleting elements from the array within the loop, so it might be shorter than we expect
            if (i >= this.nodes().length){
                continue;
            }

            if (this.nodes()[i].getParentKey() === key){
                this.removeNode(this.nodes()[i]);
            }
        }
    }

    findEdgeById = (id: string) : Edge => {
        for (let i = this.edges().length - 1; i >= 0 ; i--){
            if (this.edges()[i].getId() === id){
                return this.edges()[i];
            }
        }
        return null;
    }

    removeEdgeById = (id: string) : void => {
        for (let i = this.edges().length - 1; i >= 0 ; i--){
            if (this.edges()[i].getId() === id){
                this.edges.splice(i, 1);
            }
        }
    }

    // delete edges that start from or end at the node with the given key
    removeEdgesByKey = (key: number) : void => {
        for (let i = this.edges().length - 1 ; i >= 0; i--){
            const edge : Edge = this.edges()[i];
            if (edge.getSrcNodeKey() === key || edge.getDestNodeKey() === key){
                this.edges.splice(i, 1);
            }
        }
    }

    portIsLinked = (nodeKey : number, portId : string) : boolean => {
        for (const edge of this.edges()){
            if (edge.getSrcNodeKey() === nodeKey && edge.getSrcPortId() === portId ||
                edge.getDestNodeKey() === nodeKey && edge.getDestPortId() === portId){
                return true;
            }
        }

        return false;
    }

    // TODO: shrinkNode and normaliseNodes seem to share some common code, maybe factor out or combine?
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
        minX -= Node.CONSTRUCT_MARGIN_LEFT;
        minY -= Node.CONSTRUCT_MARGIN_TOP;
        maxX += Node.CONSTRUCT_MARGIN_RIGHT;
        maxY += Node.CONSTRUCT_MARGIN_BOTTOM;

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

    checkForNodeAt = (x: number, y: number, width: number, height: number, ignoreKey: number, groupsOnly: boolean = false) : Node => {
        const overlaps : Node[] = [];

        // find all the overlapping nodes
        for (const node of this.nodes()){
            // abort if checking for self!
            if (node.getKey() === ignoreKey){
                continue;
            }

            // abort if node is not a group
            if (groupsOnly && !node.isGroup()){
                continue;
            }

            if (Utils.nodesOverlap(x, y, width, height, node.getPosition().x, node.getPosition().y, node.getWidth(), node.getHeight())){
                overlaps.push(node);
            }
        }

        // once found all the overlaps, we return the most-leaf (highest depth) node
        let maxDepth: number = -1;
        let maxDepthOverlap: Node = null;

        for (const overlap of overlaps){
            const depth = this.findDepthByKey(overlap.getKey());

            if (depth > maxDepth){
                maxDepth = depth;
                maxDepthOverlap = overlap;
            }
        }

        return maxDepthOverlap;
    }

    findDepthByKey = (key: number) : number => {
        const node = this.findNodeByKey(key);
        let parentKey = node.getParentKey();
        let depth = 0;
        let iterations = 0;

        while (parentKey !== null){
            if (iterations > 10){
                console.error("too many iterations in findDepthByKey()");
                break;
            }

            iterations += 1;
            depth += 1;
            parentKey = this.findNodeByKey(parentKey).getParentKey();
        }

        return depth;
    }

    // similar to getChildrenOfNodeByKey() (below) except treats key as null always, and is computed
    getRootNodes : ko.PureComputed<Node[]> = ko.pureComputed(() : Node[] => {
        const result: Node[] = [];

        for (const node of this.nodes()){
            if (node.getParentKey() === null){
                result.push(node);
            }
        }

        return result;
    }, this);

    getChildrenOfNodeByKey = (key: number) : Node[] => {
        const result: Node[] = [];

        for (const node of this.nodes()){
            if (node.getParentKey() === key){
                result.push(node);
            }
        }

        return result;
    }

    static normaliseNodes = (nodes: Node[]) : {x: number, y: number} => {
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
            node.setPosition(pos.x - minX + Node.CONSTRUCT_MARGIN_LEFT, pos.y - minY + Node.CONSTRUCT_MARGIN_TOP);
        }

        return {x: maxX - minX + Node.CONSTRUCT_MARGIN_LEFT + Node.CONSTRUCT_MARGIN_RIGHT, y: maxY - minY + Node.CONSTRUCT_MARGIN_TOP + Node.CONSTRUCT_MARGIN_BOTTOM};
    }
}
