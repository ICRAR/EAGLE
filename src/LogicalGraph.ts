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

import { Category } from './Category';
import { Daliuge } from "./Daliuge";
import { Eagle } from './Eagle';
import { EagleConfig } from "./EagleConfig";
import { Edge } from './Edge';
import { Errors } from './Errors';
import { Field } from './Field';
import { FileInfo } from './FileInfo';
import { GraphConfig } from './GraphConfig';
import { GraphUpdater } from './GraphUpdater';
import { Node } from './Node';
import { ParameterTable } from "./ParameterTable";
import { RepositoryFile } from './RepositoryFile';
import { Setting } from './Setting';
import { Utils } from './Utils';
import { GraphConfigurationsTable } from "./GraphConfigurationsTable";

export class LogicalGraph {
    fileInfo : ko.Observable<FileInfo>;
    private nodes : ko.ObservableArray<Node>;
    private edges : ko.ObservableArray<Edge>;
    private graphConfigs : ko.ObservableArray<GraphConfig>;
    private activeGraphConfigId : ko.Observable<GraphConfig.Id>

    private issues : ko.ObservableArray<{issue:Errors.Issue, validity:Errors.Validity}> //keeps track of higher level errors on the graph
    

    constructor(){
        this.fileInfo = ko.observable(new FileInfo());
        this.fileInfo().type = Eagle.FileType.Graph;
        this.fileInfo().readonly = false;
        this.fileInfo().builtIn = false;
        this.nodes = ko.observableArray([]);
        this.edges = ko.observableArray([]);
        this.graphConfigs = ko.observableArray([]);
        this.activeGraphConfigId = ko.observable(null); // can be null, or an id (can't be undefined)
        this.issues = ko.observableArray([])
    }

    static toOJSJson(graph : LogicalGraph, forTranslation : boolean) : object {
        const result : any = {};

        result.modelData = FileInfo.toOJSJson(graph.fileInfo());
        result.modelData.schemaVersion = Daliuge.SchemaVersion.OJS;
        result.modelData.numLGNodes = graph.nodes().length;

        // add nodes
        result.nodeDataArray = [];
        for (const node of graph.nodes()){
            const nodeData : any = Node.toOJSGraphJson(node);
            result.nodeDataArray.push(nodeData);
        }

        // add links
        result.linkDataArray = [];
        for (const edge of graph.getEdges()){

            // depending on the settings and purpose, skip close-loop edges
            if (forTranslation && Setting.findValue(Setting.SKIP_CLOSE_LOOP_EDGES)){
                if (edge.isClosesLoop()){
                    continue;
                }
            }

            const linkData : any = Edge.toOJSJson(edge);

            let srcId = edge.getSrcNodeId();
            let destId = edge.getDestNodeId();

            const srcNode = graph.findNodeById(srcId);
            const destNode = graph.findNodeById(destId);

            // if source and destination node could not be found, skip edge
            if (srcNode === null){
                console.warn("Could not find edge (", srcId, "->", destId, ") source node by id (", srcId, "), skipping");
                continue;
            }
            if (destNode === null){
                console.warn("Could not find edge (", srcId, "->", destId, ") destination node by key (", destId, "), skipping");
                continue;
            }

            // for OJS format, we actually store links using the node keys of the construct, not the node keys of the embedded applications
            if (srcNode.isEmbedded()){
                srcId = srcNode.getEmbedId();
            }
            if (destNode.isEmbedded()){
                destId = destNode.getEmbedId();
            }

            linkData.from = srcId;
            linkData.to   = destId;

            result.linkDataArray.push(linkData);
        }

        // add graph configurations
        result.graphConfigurations = {};
        for (const gc of graph.graphConfigs()){
            result.graphConfigurations[gc.getId()] = GraphConfig.toJson(gc, graph);
        }

        // saving the id of the active graph configuration
        result.activeGraphConfigId = Eagle.getInstance().logicalGraph().activeGraphConfigId();

        return result;
    }

    static toOJSJsonString(graph : LogicalGraph, forTranslation : boolean) : string {
        let result: string = "";
        const json: any = LogicalGraph.toOJSJson(graph, forTranslation);

        // NOTE: manually build the JSON so that we can enforce ordering of attributes (modelData first)
        result += "{\n";
        result += '"modelData": ' + JSON.stringify(json.modelData, null, EagleConfig.JSON_INDENT) + ",\n";
        result += '"activeGraphConfigId": ' + JSON.stringify(json.activeGraphConfigId) + ',\n';

        // if we are sending this graph for translation, then only provide the "active" graph configuration, or an empty array if none exist
        // otherwise, add all graph configurations
        if (forTranslation){
            if (graph.activeGraphConfigId() === null){
                result += '"graphConfigurations": {},\n';
            } else {
                const graphConfigurations: any = {};
                graphConfigurations[graph.activeGraphConfigId().toString()] = GraphConfig.toJson(graph.getActiveGraphConfig(), graph);

                result += '"graphConfigurations": ' + JSON.stringify(graphConfigurations, null, EagleConfig.JSON_INDENT) + ",\n";
            }
        } else {
            result += '"graphConfigurations": ' + JSON.stringify(json.graphConfigurations, null, EagleConfig.JSON_INDENT) + ",\n";
        }

        result += '"nodeDataArray": ' + JSON.stringify(json.nodeDataArray, null, EagleConfig.JSON_INDENT) + ",\n";
        result += '"linkDataArray": ' + JSON.stringify(json.linkDataArray, null, EagleConfig.JSON_INDENT) + "\n";
        result += "}\n";

        return result;
    }

    static _determineNodeParentId(nodeData: any){
        if (typeof nodeData.parentId !== 'undefined'){
            return nodeData.parentId;
        }
        if (typeof nodeData.group !== 'undefined'){
            return nodeData.group;
        }
    }

    static fromOJSJson(dataObject : any, file : RepositoryFile, errorsWarnings : Errors.ErrorsWarnings) : LogicalGraph {
        // create new logical graph object
        const result : LogicalGraph = new LogicalGraph();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromOJSJson(dataObject.modelData, errorsWarnings));

        // add nodes
        for (const nodeData of dataObject.nodeDataArray){
            const newNode = Node.fromOJSJson(nodeData, errorsWarnings, false);

            if (newNode === null){
                continue;
            }

            result.nodes.push(newNode);
        }

        // set ids for all embedded nodes
        Utils.setEmbeddedApplicationNodeIds(result);

        // make sure to set parent for all nodes
        for (let i = 0 ; i < dataObject.nodeDataArray.length ; i++){
            const nodeData = dataObject.nodeDataArray[i];
            const parentId = this._determineNodeParentId(nodeData);

            // if parentId cannot be found, skip this node
            if (typeof parentId === 'undefined'){
                continue;
            }

            const parentIndex = GraphUpdater.findIndexOfNodeDataArrayWithId(dataObject.nodeDataArray, parentId);
            if (parentIndex !== -1){
                const parentNode: Node = result.nodes()[parentIndex];
                result.nodes()[i].setParentId(parentNode.getId());
            }
        }

        // add edges
        for (const linkData of dataObject.linkDataArray){       
            const newEdge = Edge.fromOJSJson(linkData, errorsWarnings);

            if (newEdge === null){
                continue;
            }

            result.edges.push(newEdge);
        }

        // load configs (if present)
        if (typeof dataObject.graphConfigurations !== 'undefined'){
            for (const gcId in dataObject["graphConfigurations"]){
                const gco = dataObject["graphConfigurations"][gcId];
                const gc = GraphConfig.fromJson(gco, errorsWarnings);
                gc.setId(gcId as GraphConfig.Id);
                result.graphConfigs.push(gc);
            }

            //if the saved 'activeGraphConfigId' is empty or missing, we use the last one in the array, else we set the saved one as active                
            if(typeof dataObject.activeGraphConfigId === 'undefined' || dataObject.activeGraphConfigId === ''){
                result.activeGraphConfigId(null);
            }else{
                result.activeGraphConfigId(dataObject.activeGraphConfigId);
            }
        }

        // check for missing name
        if (result.fileInfo().name === ""){
            const error : string = "FileInfo.name is empty. Setting name to " + file.name;
            errorsWarnings.warnings.push(Errors.Message(error));

            result.fileInfo().name = file.name;
        }

        // add a step here to check that no edges are incident on constructs, and move any edges found to the embedded applications
        // add warnings to errorsWarnings
        for (const edge of result.edges()){
            // get references to actual source and destination nodes (from the keys)
            const sourceNode : Node = result.findNodeById(edge.getSrcNodeId());
            const destinationNode : Node = result.findNodeById(edge.getDestNodeId());

            // check that source and destination nodes were found
            if (sourceNode === null || destinationNode === null){
                console.error("Could not find source (" + edge.getSrcNodeId() + ") or destination (" + edge.getDestNodeId() + ") node of edge " + edge.getId());
                continue;
            }

            if (sourceNode === null || destinationNode === null){
                console.warn("Can't find sourceNode or destinationNode for edge", edge.getId());
                continue;
            }

            // if source node or destination node is a construct, then something is wrong, constructs should not have ports
            if (sourceNode.getCategoryType() === Category.Type.Construct){
                const srcIdAndPort = sourceNode.findPortInApplicationsById(edge.getSrcPortId());
                const warning = "Updated source node of edge " + edge.getId() + " from construct " + edge.getSrcNodeId() + " to embedded application " + srcIdAndPort.id;
                errorsWarnings.warnings.push(Errors.Message(warning));
                edge.setSrcNodeId(srcIdAndPort.id);
            }
            if (destinationNode.getCategoryType() === Category.Type.Construct){
                const destKeyAndPort = destinationNode.findPortInApplicationsById(edge.getDestPortId());
                const warning = "Updated destination node of edge " + edge.getId() + " from construct " + edge.getDestNodeId() + " to embedded application " + destKeyAndPort.id;
                errorsWarnings.warnings.push(Errors.Message(warning));
                edge.setDestNodeId(destKeyAndPort.id);
            }
        }

        // move all the nodes into the
        //const hadNegativePositions : boolean = GraphUpdater.correctOJSNegativePositions(result);

        return result;
    }

    static _findNodeDataWithKey(nodeDataArray: any[], key: number): any {
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

    getAllNodes = () : Node[] => {
        const nodes : Node[] =[]
        this.nodes().forEach(function(node){
            nodes.push(node)
            if(node.isConstruct()){
                if(node.getInputApplication()!= null){
                    nodes.push(node.getInputApplication())
                }
                if(node.getOutputApplication() != null){
                    nodes.push(node.getOutputApplication())
                }
            }
        })
        return nodes;
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

    getCommentNodes = () : Node[] => {
        const commentNodes: Node[] = [];

        for (const node of this.nodes()){
            if (node.isComment()){
                commentNodes.push(node);
            }
        }

        return commentNodes;
    }

    setGraphConfigs = (graphConfigs: GraphConfig[]): void => {
        this.graphConfigs(graphConfigs);
    }

    getGraphConfigs = (): GraphConfig[] => {
        return this.graphConfigs();
    }
    
    getGraphConfigById = (id: GraphConfig.Id): GraphConfig => {
        for(let i = 0 ; i < this.graphConfigs().length ; i++){
            if(this.graphConfigs()[i].getId() === id){
                return this.graphConfigs()[i]
            }
        }
        return null
    }

    addGraphConfig = (config: GraphConfig): void => {
        this.graphConfigs.push(config);
        Eagle.getInstance().undo().pushSnapshot(Eagle.getInstance(), "Added a new graph config");
    }

    duplicateGraphConfig = (config: GraphConfig): void => {
        const clone = config.clone();

        clone.setId(Utils.generateGraphConfigId());
        clone.setName(Utils.generateGraphConfigName(clone));

        // duplicate, set active and graph as modified
        this.addGraphConfig(clone)
        this.activeGraphConfigId(clone.getId())
        this.fileInfo().modified = true;

        Utils.showNotification("Duplicated Config", "as '" + clone.getName() + "' and set to active config", "success");

        //focus on and select the name field of the newly duplicated config, ready to rename. this requires a little wait, to allow the ui to update
        setTimeout(() => {
            $('#graphConfigurationsTableWrapper .activeConfig .column-name input').focus().select()
        }, 100);

        Eagle.getInstance().undo().pushSnapshot(Eagle.getInstance(), "Duplicated a graph config" + clone.getName());
    }

    removeGraphConfig = (config: GraphConfig): void => {
        // find index of graph config to remove
        let index = -1;
        for (let i = 0 ; i < this.graphConfigs().length ; i++){
            if (this.graphConfigs()[i].getId() === config.getId()){
                index = i;
            }
        }

        // if not found, warn user and abort
        if (index === -1){
            console.warn("Graph config can't be removed, not found. id = ", config.getId());
            return;
        }

        // cache name, id of graph configuration
        const name: string = this.graphConfigs()[index].getName();
        const id: GraphConfig.Id = this.graphConfigs()[index].getId();

        // remove graph config
        this.graphConfigs.splice(index, 1);

        // if the removed graph config is also the active config, then we need to unset the active config
        if (this.activeGraphConfigId() === id){
            this.activeGraphConfigId(null);
        }

        // create undo snapshot
        const eagle: Eagle = Eagle.getInstance();
        eagle.undo().pushSnapshot(eagle, "Removed graph configuration " + name);

        // check graph
        eagle.checkGraph();
    }

    getActiveGraphConfig = (): GraphConfig => {
        return this.getGraphConfigById(this.activeGraphConfigId())
    }

    setActiveGraphConfig = (configId: GraphConfig.Id): void => {
        this.activeGraphConfigId(configId)
    }

    countEdgesIncidentOnNode = (node : Node) : number => {
        let result: number = 0;

        for (const edge of this.edges()){
            if ((edge.getSrcNodeId() === node.getId() ) || ( edge.getDestNodeId() === node.getId() )){
                result += 1;
            }
        }

        return result;
    }

    clear = () : void => {
        this.fileInfo().clear();
        this.fileInfo().type = Eagle.FileType.Graph;
        this.nodes([]);
        this.edges([]);
        this.graphConfigs([]);
        this.activeGraphConfigId(null)
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

        // copy graph configs
        for (const graphConfig of this.graphConfigs()){
            result.graphConfigs.push(graphConfig.clone());
        }

        //copy active graph config id state
        result.activeGraphConfigId(this.activeGraphConfigId());

        return result;
    }

    getIssues = (): {issue:Errors.Issue, validity:Errors.Validity}[] => {
        return this.issues();
    }

    addIssue = (issue:Errors.Issue, validity:Errors.Validity): void => {
        this.issues().push({issue:issue,validity:validity})
    }

    /**
     * Opens a dialog for selecting a data component type.
     */
    addDataComponentDialog = async (eligibleComponents : Node[]): Promise<Node> => {
        return new Promise(async(resolve, reject) => {
            const eligibleComponentNames: string[] = [];
            for (const component of eligibleComponents){
                eligibleComponentNames.push(component.getName());
            }

            // ask the user to choose from the eligibleTypes
            const userChoice: string = await Utils.requestUserChoice("Add Data Component", "Select data component type", eligibleComponentNames, 0, false, "");
            
            if (userChoice === null){
                return;
            }

            // find choice withing eligibleComponents
            for (const ec of eligibleComponents){
                if (ec.getName() === userChoice){
                    resolve(ec);
                    return;
                }
            }

            reject("Could not find user choice");
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

    findNodeByIdQuiet = (id: NodeId) : Node => {
        //used temporarily for the table modals to prevent console spam relating to too many calls when changing selected objects
        for (let i = this.nodes().length - 1; i >= 0 ; i--){

            // check if the node itself has a matching key
            if (this.nodes()[i].getId() === id){
                return this.nodes()[i];
            }

            // check if the node's inputApp has a matching key
            if (this.nodes()[i].hasInputApplication()){
                if (this.nodes()[i].getInputApplication().getId() === id){
                    return this.nodes()[i].getInputApplication();
                }
            }

            // check if the node's outputApp has a matching key
            if (this.nodes()[i].hasOutputApplication()){
                if (this.nodes()[i].getOutputApplication().getId() === id){
                    return this.nodes()[i].getOutputApplication();
                }
            }
        }
        return null;
    }

    findNodeById = (id: NodeId) : Node => {
        const node = this.findNodeByIdQuiet(id);

        if (node === null){
            console.warn("findNodeById(): could not find node with id (", id, ")");
        }

        return node;
    }

    findNodeGraphIdByNodeName = (name:string) :string =>{
        for (const node of this.nodes()){
            if (node.getName() === name){
                return node.getId();
            }
        }

        return null;
    }

    removeNode = (node: Node) : void => {
        const id = node.getId();

        // first, delete any field in any graph config, that belongs to this node
        for (const graphConfig of this.graphConfigs()){
            graphConfig.removeNodeById(node.getId());
        }

        // NOTE: this section handles an unusual case where:
        //  - the removed node is an embedded node within a construct
        //  - there are edge(s) connected to a port on the embedded node
        //  - but the edge(s) have source or destination node id of the construct
        // This situation should not occur in a well-formed graph, but does occur in many existing graphs
        const that = this
        if(node.isEmbedded()){
            node.getFields().forEach(function(field:Field){
                if(field.isInputPort() || field.isOutputPort()){
                    that.getEdges().forEach(function(edge:Edge){
                        if(edge.getDestPortId() === field.getId() || edge.getSrcPortId() === field.getId()){
                            that.removeEdgeById(edge.getId())
                        }
                    })
                }
            })
        }

        // delete edges incident on this node
        this.removeEdgesById(id);

        // delete edges incident on the embedded apps of this node
        if (node.hasInputApplication()){
            this.removeEdgesById(node.getInputApplication().getId());
        }
        if (node.hasOutputApplication()){
            this.removeEdgesById(node.getOutputApplication().getId());
        }

        // search through nodes in graph, looking for one with the correct key
        for (let i = this.nodes().length - 1; i >= 0 ; i--){
            // delete the node
            if (this.nodes()[i].getId() === id){
                this.nodes.splice(i, 1);
                continue;
            }

            // delete the input application
            if (this.nodes()[i].hasInputApplication() && this.nodes()[i].getInputApplication().getId() === id){
                this.nodes()[i].setInputApplication(null);
            }

            // delete the output application
            if (this.nodes()[i].hasOutputApplication() && this.nodes()[i].getOutputApplication().getId() === id){
                this.nodes()[i].setOutputApplication(null);
            }
        }

        // delete children
        for (let i = this.nodes().length - 1; i >= 0 ; i--){
            // check that iterator still points to a valid element in the nodes array
            // a check like this wouldn't normally be necessary, but we are deleting elements from the array within the loop, so it might be shorter than we expect
            if (i >= this.nodes().length){
                continue;
            }

            if (this.nodes()[i].getParentId() === id){
                this.removeNode(this.nodes()[i]);
            }
        }
    }

    findEdgeById = (id: EdgeId) : Edge => {
        for (let i = this.edges().length - 1; i >= 0 ; i--){
            if (this.edges()[i].getId() === id){
                return this.edges()[i];
            }
        }
        return null;
    }

    removeEdgeById = (id: EdgeId) : void => {
        let found = false;

        for (let i = this.edges().length - 1; i >= 0 ; i--){
            if (this.edges()[i].getId() === id){
                found = true;
                this.edges.splice(i, 1);
            }
        }

        if (!found){
            console.warn("Could not removeEdgeById(), edge not found with id:", id);
        }
    }

    // delete edges that start from or end at the node with the given id
    removeEdgesById = (id: NodeId) : void => {
        for (let i = this.edges().length - 1 ; i >= 0; i--){
            const edge : Edge = this.edges()[i];
            if (edge.getSrcNodeId() === id || edge.getDestNodeId() === id){
                this.edges.splice(i, 1);
            }
        }
    }

    removeFieldFromNodeById = (node : Node, id: FieldId) : void => {
        if (node === null){
            console.warn("Could not remove port from null node");
            return;
        }

        // remove port
        node.removeFieldById(id);

        // remove any edges connected to that port
        const edges: ko.ObservableArray<Edge> = this.edges;

        for (let i = edges().length - 1; i >= 0; i--){
            const edge: Edge = edges()[i];

            if (edge.getSrcPortId() === id || edge.getDestPortId() === id){
                edges.splice(i, 1);
            }
        }

        // get reference to EAGLE
        const eagle: Eagle = Eagle.getInstance();

        eagle.checkGraph();
        eagle.undo().pushSnapshot(eagle, "Remove port from node");
        eagle.flagActiveFileModified();
        eagle.selectedObjects.valueHasMutated();
    }

    portIsLinked = (nodeId: NodeId, portId: FieldId) : any => {
        let result:{input:boolean,output:boolean} = {'input':false,'output':false}
        let input = false
        let output = false
        for (const edge of this.edges()){
            if(edge.getSrcNodeId() === nodeId && edge.getSrcPortId() === portId){
                output = true
            }
            if(edge.getDestNodeId() === nodeId && edge.getDestPortId() === portId){
                input = true
            }
        }
        result= {'input':input,'output':output}

        return result ;
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

            if (n.getParentId() === null){
                break;
            }

            n = this.findNodeById(n.getParentId());

            if (n === null){
                break;
            }

            result *= n.getLocalMultiplicity();
        }

        return result;
    }

    checkForNodeAt = (x: number, y: number, radius: number, findEligibleGroups: boolean = false) : Node => {
        const overlaps : Node[] = [];
        const eagle = Eagle.getInstance();

        // find all the overlapping nodes
        for (const node of this.nodes()){

            if(findEligibleGroups){

                let nodeIsSelected = false
                
                for(const object of eagle.selectedObjects()){
                    // abort if checking for self!
                    if (object instanceof Node && object.getId() === node.getId()){
                        nodeIsSelected=true
                        break
                    }
                }

                if(nodeIsSelected){
                    continue;
                }
                
            }

            // abort if node is not a group
            if (findEligibleGroups && !node.isGroup()){
                continue;
            }

            if(findEligibleGroups){
                //when finding eligable parent groups for nodes, we want to know if the centroid of the node we are dragging has entered a constuct
                if(Utils.nodeCentroidOverlaps(node.getPosition().x, node.getPosition().y,node.getRadius(), x,y)){
                    overlaps.push(node);
                }
            }else{
                //if we are adding nodes to the graph we want to know if two nodes are touching at all so we can space them out accordingly
                if (Utils.nodesOverlap(x, y, radius, node.getPosition().x, node.getPosition().y, node.getRadius())){
                    overlaps.push(node);
                }
            }   
        }

        // once found all the overlaps, we return the most-leaf (highest depth) node
        let maxDepth: number = -1;
        let maxDepthOverlap: Node = null;

        for (const overlap of overlaps){
            const depth = this.findDepthById(overlap.getId());

            if (depth > maxDepth){
                maxDepth = depth;
                maxDepthOverlap = overlap;
            }
        }

        return maxDepthOverlap;
    }

    findDepthById = (id: NodeId) : number => {
        const node = this.findNodeById(id);
        let parentId: NodeId = node.getParentId();
        let depth = 0;
        let iterations = 0;

        while (parentId !== null){
            if (iterations > 10){
                console.error("too many iterations in findDepthByKey()");
                break;
            }

            iterations += 1;
            depth += 1;
            parentId = this.findNodeById(parentId).getParentId();
        }

        return depth;
    }

    // similar to getChildrenOfNodeById() (below) except treats id as null always
    getRootNodes = () : Node[] => {
        return this.getChildrenOfNodeById(null);
    }

    getChildrenOfNodeById = (id: NodeId) : Node[] => {
        const result: Node[] = [];

        for (const node of this.nodes()){
            if (node.getParentId() === id){
                result.push(node);
            }
        }

        return result;
    }

    getNodesDrawOrdered : ko.PureComputed<Node[]> = ko.pureComputed(() => {
        const indexPlusDepths : {index:number, depth:number}[] = [];
        const result : Node[] = [];

        // populate index plus depths
        for (let i = 0 ; i < this.nodes().length ; i++){
            const node = this.nodes()[i];

            const depth = this.findDepthById(node.getId());

            indexPlusDepths.push({index:i, depth:depth});
        }

        // sort nodes in depth ascending
        indexPlusDepths.sort(function(a, b){
            return a.depth - b.depth;
        });

        // write nodes to result in sorted order
        for (const indexPlusDepth of indexPlusDepths){
            result.push(this.nodes()[indexPlusDepth.index]);
        }

        return result;
    }, this);

    static normaliseNodes(nodes: Node[]) : number {
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

            if (node.getPosition().x + node.getRadius() > maxX){
                maxX = node.getPosition().x + node.getRadius();
            }

            if (node.getPosition().y + node.getRadius() > maxY){
                maxY = node.getPosition().y + node.getRadius();
            }
        }
        
        const radius = Math.max(maxX - minX,maxY - minY)

        // move all nodes so that the top left corner of the graph starts at the origin 0,0
        for (const node of nodes){
            const pos = node.getPosition();
            node.setPosition(pos.x - minX + EagleConfig.CONSTRUCT_MARGIN, pos.y - minY + EagleConfig.CONSTRUCT_MARGIN+(radius/4));
        }

        return radius;
    }

    static isValid () : void {
        //here should be the higher level graph wide checks for graph validity
        const eagle = Eagle.getInstance()
        const graph = eagle.logicalGraph()

        // clear old issues
        graph.issues([]);

        // check that all node, edge, field, and config ids are unique
        const ids : string[] = [];

        // loop over graph nodes
        for (const node of graph.getNodes()){
            if (ids.includes(node.getId())){
                const issue: Errors.Issue = Errors.ShowFix(
                    "Node (" + node.getName() + ") does not have a unique id",
                    function(){Utils.showNode(eagle, node.getId())},
                    function(){node.setId(Utils.generateNodeId())},
                    "Assign node a new id"
                );
                graph.issues.push({issue : issue, validity : Errors.Validity.Error})
            }
            ids.push(node.getId());

            // loop over fields within graphs
            for (const field of node.getFields()){
                if (ids.includes(field.getId())){
                    const issue: Errors.Issue = Errors.ShowFix(
                        "Field (" + field.getDisplayText() + ") on node (" + node.getName() + ") does not have a unique id",
                        function(){Utils.showNode(eagle, node.getId())},
                        function(){Utils.newFieldId(eagle, node, field)},
                        "Assign field a new id"
                    );
                    graph.issues.push({issue : issue, validity : Errors.Validity.Error})
                }
                ids.push(field.getId());
            }
        }

        // loop over graph edges
        for (const edge of graph.getEdges()){
            if (ids.includes(edge.getId())){
                const issue: Errors.Issue = Errors.ShowFix(
                    "Edge (" + edge.getId() + ") does not have a unique id",
                    function(){Utils.showEdge(eagle, edge.getId())},
                    function(){edge.setId(Utils.generateEdgeId())},
                    "Assign edge a new id"
                );
                graph.issues.push({issue : issue, validity : Errors.Validity.Error})
            }
            ids.push(edge.getId());
        }

        // loop over the graph configs
        for (const graphConfig of graph.getGraphConfigs()){
            if (ids.includes(graphConfig.getId())){
                const issue: Errors.Issue = Errors.ShowFix(
                    "Graph Config (" + graphConfig.getId() + ") does not have a unique id",
                    function(){Utils.showGraphConfig(eagle, graphConfig.getId())},
                    function(){graphConfig.setId(Utils.generateGraphConfigId())},
                    "Assign graph config a new id"
                );
                graph.issues.push({issue : issue, validity : Errors.Validity.Error})
            }

            ids.push(graphConfig.getId());
        }

        // check that active graph config id actually refers to a graph config in the graphConfigs dict
        if (graph.activeGraphConfigId() !== null){
            if (graph.getActiveGraphConfig() === null){
                const issue: Errors.Issue = Errors.Fix(
                    "Active Graph Config Id (" + graph.activeGraphConfigId() + ") does not match a known graph config",
                    function(){
                        // if there are no graph config, set active id to undefined
                        // otherwise, just set the active id to the id of the first graph config in the list
                        if (graph.getGraphConfigs().length === 0){
                            graph.setActiveGraphConfig(null);
                        } else {
                            graph.setActiveGraphConfig(graph.getGraphConfigs()[0].getId());
                        }
                    },
                    "Make first graph config active, or set undefined if no graph configs present"
                );
                graph.issues.push({issue : issue, validity : Errors.Validity.Error})
            }
        }

        // check that all fields, in all nodes, in all graph configs are actually present in the graph
        for (const graphConfig of graph.getGraphConfigs()){
            for (const graphConfigNode of graphConfig.getNodes()){
                // check that node exists in graph
                const graphNode: Node = graph.findNodeByIdQuiet(graphConfigNode.getId());

                if (graphNode === null){
                    const issue: Errors.Issue = Errors.Fix(
                        "Node in graph config (" + graphConfig.getName() + ") is not present in Logical Graph",
                        function(){
                            graphConfig.removeNode(graphConfigNode);
                        },
                        "Delete node from graph config"
                    );
                    graph.issues.push({issue : issue, validity : Errors.Validity.Error});
                    break;
                }

                for (const graphConfigField of graphConfigNode.getFields()){
                    const graphField: Field = graphNode.findFieldById(graphConfigField.getId());

                    if (graphField === null){
                        const issue: Errors.Issue = Errors.Fix(
                            "Field in graph config (" + graphConfig.getName() + ", " + graphNode.getName() + ") is not present in Logical Graph",
                            function(){
                                graphConfigNode.removeFieldById(graphConfigField.getId());
                            },
                            "Delete field from node in graph config"
                        );
                        graph.issues.push({issue: issue, validity: Errors.Validity.Error});
                    }
                }
            }
        }
    }
}
