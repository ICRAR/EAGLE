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
import { Eagle } from './Eagle';
import { EagleConfig } from "./EagleConfig";
import { Edge } from './Edge';
import { Errors } from './Errors';
import { Field } from './Field';
import { FileInfo } from './FileInfo';
import { GraphConfig } from './GraphConfig';
import { GraphUpdater } from './GraphUpdater';
import { Node } from './Node';
import { RepositoryFile } from './RepositoryFile';
import { Setting } from './Setting';
import { Utils } from './Utils';

export class LogicalGraph {
    fileInfo : ko.Observable<FileInfo>;
    private nodes : ko.Observable<Map<NodeId, Node>>;
    private edges : ko.Observable<Map<EdgeId, Edge>>;
    private graphConfigs : ko.ObservableArray<GraphConfig>;
    private activeGraphConfigId : ko.Observable<GraphConfig.Id>

    private issues : ko.ObservableArray<{issue:Errors.Issue, validity:Errors.Validity}> //keeps track of higher level errors on the graph
    

    constructor(){
        this.fileInfo = ko.observable(new FileInfo());
        this.fileInfo().type = Eagle.FileType.Graph;
        this.fileInfo().readonly = false;
        this.fileInfo().builtIn = false;
        this.nodes = ko.observable(new Map<NodeId, Node>());
        this.edges = ko.observable(new Map<EdgeId, Edge>());
        this.graphConfigs = ko.observableArray([]);
        this.activeGraphConfigId = ko.observable(null); // can be null, or an id (can't be undefined)
        this.issues = ko.observableArray([])
    }

    static toOJSJson(graph : LogicalGraph, forTranslation : boolean) : object {
        const result : any = {};

        result.modelData = FileInfo.toOJSJson(graph.fileInfo());
        result.modelData.schemaVersion = Setting.SchemaVersion.OJS;
        result.modelData.numLGNodes = graph.getNumNodes();

        // add nodes
        result.nodeDataArray = [];
        for (const node of graph.nodes().values()){
            const nodeData : any = Node.toOJSGraphJson(node);
            result.nodeDataArray.push(nodeData);
        }

        // add links
        result.linkDataArray = [];
        for (const edge of graph.getEdges().values()){

            // depending on the settings and purpose, skip close-loop edges
            if (forTranslation && Setting.findValue(Setting.SKIP_CLOSE_LOOP_EDGES)){
                if (edge.isClosesLoop()){
                    continue;
                }
            }

            const linkData : any = Edge.toOJSJson(edge);

            let srcId = edge.getSrcNode().getId();
            let destId = edge.getDestNode().getId();

            const srcNode = graph.getNodes().get(srcId);
            const destNode = graph.getNodes().get(destId);

            // if source and destination node could not be found, skip edge
            if (typeof srcNode === 'undefined'){
                console.warn("Could not find edge (", srcId, "->", destId, ") source node by id (", srcId, "), skipping");
                continue;
            }
            if (typeof destNode === 'undefined'){
                console.warn("Could not find edge (", srcId, "->", destId, ") destination node by key (", destId, "), skipping");
                continue;
            }

            // for OJS format, we actually store links using the node keys of the construct, not the node keys of the embedded applications
            if (srcNode.isEmbedded()){
                srcId = srcNode.getEmbed().getId();
            }
            if (destNode.isEmbedded()){
                destId = destNode.getEmbed().getId();
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

    static toV4Json(graph: LogicalGraph, forTranslation: boolean) : object {
        const result : any = {};

        result.modelData = FileInfo.toV4Json(graph.fileInfo());
        result.modelData.schemaVersion = Setting.SchemaVersion.V4;

        // add nodes
        result.nodes = {};
        for (const [id, node] of graph.nodes()){
            const nodeData : any = Node.toV4GraphJson(node);
            result.nodes[id] = nodeData;
        }

        // edges
        // NOTE: we do not skip close loop edges
        result.edges = {};
        for (const [id, edge] of graph.edges()){
            const edgeData : any = Edge.toV4Json(edge);
            result.edges[id] = edgeData;
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

    static toV4JsonString(graph: LogicalGraph, forTranslation: boolean) : string {
        let result: string = "";

        const json: any = LogicalGraph.toV4Json(graph, forTranslation);

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

        result += '"nodes": ' + JSON.stringify(json.nodes, null, EagleConfig.JSON_INDENT) + ",\n";
        result += '"edges": ' + JSON.stringify(json.edges, null, EagleConfig.JSON_INDENT) + "\n";
        result += "}\n";

        return result;
    }

    static toJsonString(graph : LogicalGraph, forTranslation : boolean, version: Setting.SchemaVersion) : string {
        let result: string = "";

        switch(version){
            case Setting.SchemaVersion.OJS:
                result = LogicalGraph.toOJSJsonString(graph, forTranslation);
                break;
            case Setting.SchemaVersion.V4:
                result = LogicalGraph.toV4JsonString(graph, forTranslation);
                break;
            default:
                console.error("Unsupported graph format! (" + version + ")");
                return "";
        }

        return result;
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

            result.nodes().set(newNode.getId(), newNode);
            result.nodes.valueHasMutated();
        }

        // set ids for all embedded nodes
        Utils.setEmbeddedApplicationNodeIds(result);

        // make sure to set parent for all nodes
        for (let i = 0 ; i < dataObject.nodeDataArray.length ; i++){
            const nodeData = dataObject.nodeDataArray[i];
            const parentId = Node.determineNodeParentId(nodeData);

            // if parentId cannot be found, skip this node
            if (parentId === null){
                continue;
            }

            // find index of parent node, based on the id we found
            const parentIndex = GraphUpdater.findIndexOfNodeDataArrayWithId(dataObject.nodeDataArray, parentId);

            // if parentIndex === -1 (we couldn't find the parent, then warn)
            if (parentIndex === -1){
                const error : string = "Node " + i + " has a parent id (" + parentId + ") but that node is not found elsewhere in the graph.";
                errorsWarnings.warnings.push(Errors.Message(error));
                continue;
            }

            // use parentIndex to find parentNode, and update parent
            const parentNode: Node = Array.from(result.nodes().values())[parentIndex];
            Array.from(result.nodes().values())[i].setParent(parentNode);
        }

        // add edges
        for (const linkData of dataObject.linkDataArray){       
            const newEdge = Edge.fromOJSJson(linkData, Array.from(result.nodes().values()), errorsWarnings);

            if (newEdge === null){
                continue;
            }

            result.edges().set(newEdge.getId(), newEdge);
            newEdge.getSrcPort().addEdge(newEdge);
            newEdge.getDestPort().addEdge(newEdge);
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
        for (const edge of result.edges().values()){
            // get references to actual source and destination nodes (from the keys)
            const sourceNode : Node = edge.getSrcNode();
            const destinationNode : Node = edge.getDestNode();

            // check that source and destination nodes were found
            if (sourceNode === null || destinationNode === null){
                console.error("Could not find source (" + edge.getSrcNode().getId() + ") or destination (" + edge.getDestNode().getId() + ") node of edge " + edge.getId());
                continue;
            }

            if (sourceNode === null || destinationNode === null){
                console.warn("Can't find sourceNode or destinationNode for edge", edge.getId());
                continue;
            }

            // if source node or destination node is a construct, then something is wrong, constructs should not have ports
            if (sourceNode.getCategoryType() === Category.Type.Construct){
                const srcIdAndPort = sourceNode.findPortInApplicationsById(edge.getSrcPort().getId());
                const warning = "Updated source node of edge " + edge.getId() + " from construct " + edge.getSrcNode().getId() + " to embedded application " + srcIdAndPort.node.getId();
                errorsWarnings.warnings.push(Errors.Message(warning));
                edge.getSrcNode().setId(srcIdAndPort.node.getId());
            }
            if (destinationNode.getCategoryType() === Category.Type.Construct){
                const destKeyAndPort = destinationNode.findPortInApplicationsById(edge.getDestPort().getId());
                const warning = "Updated destination node of edge " + edge.getId() + " from construct " + edge.getDestNode().getId() + " to embedded application " + destKeyAndPort.node.getId();
                errorsWarnings.warnings.push(Errors.Message(warning));
                edge.getDestNode().setId(destKeyAndPort.node.getId());
            }
        }

        // move all the nodes into the
        //const hadNegativePositions : boolean = GraphUpdater.correctOJSNegativePositions(result);

        return result;
    }

    static fromV4Json(dataObject : any, file : RepositoryFile, errorsWarnings : Errors.ErrorsWarnings) : LogicalGraph {
        // create new logical graph object
        const result : LogicalGraph = new LogicalGraph();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromV4Json(dataObject.modelData, errorsWarnings));

        // TODO

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
        this.nodes().set(node.getId(), node);
        this.nodes.valueHasMutated();
    }

    getNodes = () : Map<NodeId, Node> => {
        return this.nodes();
    }

    getAllNodes = () : Node[] => {
        const nodes : Node[] =[]
        this.nodes().forEach(function(node: Node){
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
        return this.nodes().size;
    }

    addEdgeComplete = (edge : Edge) => {
        this.edges().set(edge.getId(), edge);
        this.edges.valueHasMutated();

        edge.getSrcPort().addEdge(edge);
        edge.getDestPort().addEdge(edge);
    }

    getEdges = () : Map<EdgeId, Edge> => {
        return this.edges();
    }

    getNumEdges = () : number => {
        return this.edges().size;
    }

    getCommentNodes = () : Node[] => {
        const commentNodes: Node[] = [];

        for (const node of this.nodes().values()){
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
        const newConfigName = Utils.generateGraphConfigName(config);
        const clone = config
            .clone()
            .setId(Utils.generateGraphConfigId())
            .setName(newConfigName);

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

        for (const edge of this.edges().values()){
            if ((edge.getSrcNode().getId() === node.getId() ) || ( edge.getDestNode().getId() === node.getId() )){
                result += 1;
            }
        }

        return result;
    }

    clear = () : void => {
        this.fileInfo().clear();
        this.fileInfo().type = Eagle.FileType.Graph;
        this.nodes().clear();
        this.edges().clear();
        this.graphConfigs([]);
        this.activeGraphConfigId(null)
    }

    clone = () : LogicalGraph => {
        const result : LogicalGraph = new LogicalGraph();

        result.fileInfo(this.fileInfo().clone());

        // copy nodes
        for (const [id, node] of this.nodes()){
            result.nodes().set(id, node.clone());
            result.nodes.valueHasMutated();
        }

        // copy edges
        for (const [id, edge] of this.edges()){
            result.edges().set(id, edge.clone());
            result.edges.valueHasMutated();

            edge.getSrcPort().addEdge(edge);
            edge.getDestPort().addEdge(edge);
        }

        // copy graph configs
        for (const graphConfig of this.graphConfigs()){
            result.graphConfigs.push(graphConfig.clone());
            // TODO: valueHasMutated()?
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
        // clone the template node, set position
        const newNode: Node = node
            .clone()
            .setPosition(location.x, location.y);

        // add to logicalGraph
        this.nodes().set(newNode.getId(), newNode);
        this.nodes.valueHasMutated();

        return newNode;
    }

    findNodeIdByNodeName = (name: string): NodeId => {
        for (const [id, node] of this.nodes()){
            if (node.getName() === name){
                return id;
            }
        }

        return null;
    }

    // TODO: check this!
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
                        if(edge.getDestPort().getId() === field.getId() || edge.getSrcPort().getId() === field.getId()){
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
        for (const node of this.nodes().values()){
            if (typeof node === 'undefined'){
                continue;
            }

            if (node.getId() === id){
                this.nodes().delete(id);
                this.nodes.valueHasMutated();
                break;
            }

            // delete the input application
            if (node.hasInputApplication() && node.getInputApplication().getId() === id){
                node.setInputApplication(null);
                break;
            }

            // delete the output application
            if (node.hasOutputApplication() && node.getOutputApplication().getId() === id){
                node.setOutputApplication(null);
                break;
            }
        }

        // delete children
        for (let i = this.nodes().size - 1; i >= 0 ; i--){
            // check that iterator still points to a valid element in the nodes array
            // a check like this wouldn't normally be necessary, but we are deleting elements from the array within the loop, so it might be shorter than we expect
            if (i >= this.nodes().size){
                continue;
            }

            // TODO: can we use an id here?
            const node: Node = Array.from(this.nodes().values())[i];
            const parent: Node = node.getParent();

            if (parent !== null && parent.getId() === id){
                this.removeNode(node);
            }
        }
    }

    removeEdgeById = (id: EdgeId) : void => {
        const edge = this.edges().get(id);

        this.edges().delete(id);
        this.edges.valueHasMutated();

        edge.getSrcPort().removeEdge(id);
        edge.getDestPort().removeEdge(id);
    }

    // delete edges that start from or end at the node with the given id
    removeEdgesById = (nodeId: NodeId) : void => {
        for (const [edgeId, edge] of this.edges()){
            if (edge.getSrcNode().getId() === nodeId || edge.getDestNode().getId() === nodeId){
                this.edges().delete(edgeId);
                this.edges.valueHasMutated();

                edge.getSrcPort().removeEdge(edgeId);
                edge.getDestPort().removeEdge(edgeId);
            }
        }
    }

    removeFieldFromNodeById = (node : Node, fieldId: FieldId) : void => {
        if (node === null){
            console.warn("Could not remove port from null node");
            return;
        }

        // remove port
        node.removeFieldById(fieldId);

        // remove any edges connected to that port
        for (const [edgeId, edge] of this.edges()){
            if (edge.getSrcPort().getId() === fieldId || edge.getDestPort().getId() === fieldId){
                this.edges().delete(edgeId);
                this.edges.valueHasMutated();

                edge.getSrcPort().removeEdge(edgeId);
                edge.getDestPort().removeEdge(edgeId);
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
        for (const edge of this.edges().values()){
            if(edge.getSrcNode().getId() === nodeId && edge.getSrcPort().getId() === portId){
                output = true
            }
            if(edge.getDestNode().getId() === nodeId && edge.getDestPort().getId() === portId){
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

            if (n.getParent() === null){
                break;
            }

            n = n.getParent();

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
        for (const node of this.nodes().values()){

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
                //when finding eligible parent groups for nodes, we want to know if the centroid of the node we are dragging has entered a construct
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

    // TODO: we might be able to just make this findDepth(node: Node)
    findDepthById = (id: NodeId) : number => {
        const node = this.nodes().get(id);
        let parent: Node = node.getParent();
        let depth = 0;
        let iterations = 0;

        while (parent !== null){
            if (iterations > 10){
                console.error("too many iterations in findDepthByKey()");
                break;
            }

            iterations += 1;
            depth += 1;
            parent = parent.getParent();
        }

        return depth;
    }

    // similar to getChildrenOfNodeById() (below) except treats id as null always
    getRootNodes = () : Node[] => {
        return this.getChildrenOfNodeById(null);
    }

    getChildrenOfNodeById = (id: NodeId) : Node[] => {
        const result: Node[] = [];

        for (const [nodeId, node] of this.nodes()){
            const parent = node.getParent();
            if ((id === null && parent === null) || (parent !== null && parent.getId() === id)){
                result.push(node);
            }
        }

        return result;
    }

    getNodesDrawOrdered : ko.PureComputed<Node[]> = ko.pureComputed(() => {
        const idPlusDepths : {id:NodeId, depth:number}[] = [];
        const result : Node[] = [];

        // populate index plus depths
        for (const nodeId of this.nodes().keys()){
            const depth = this.findDepthById(nodeId);

            idPlusDepths.push({id:nodeId, depth:depth});
        }

        // sort nodes in depth ascending
        idPlusDepths.sort(function(a, b){
            return a.depth - b.depth;
        });

        // write nodes to result in sorted order
        for (const idPlusDepth of idPlusDepths){
            result.push(this.nodes().get(idPlusDepth.id));
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
        for (const [nodeId, node] of graph.getNodes()){
            if (ids.includes(nodeId)){
                const issue: Errors.Issue = Errors.ShowFix(
                    "Node (" + node.getName() + ") does not have a unique id",
                    function(){Utils.showNode(eagle, Eagle.FileType.Graph, node)},
                    function(){node.setId(Utils.generateNodeId())},
                    "Assign node a new id"
                );
                graph.issues.push({issue : issue, validity : Errors.Validity.Error})
            }
            ids.push(nodeId);

            // loop over fields within graphs
            for (const [fieldId, field] of node.getFields()){
                if (ids.includes(fieldId)){
                    const issue: Errors.Issue = Errors.ShowFix(
                        "Field (" + field.getDisplayText() + ") on node (" + node.getName() + ") does not have a unique id",
                        function(){Utils.showNode(eagle, Eagle.FileType.Graph, node)},
                        function(){Utils.newFieldId(eagle, node, field)},
                        "Assign field a new id"
                    );
                    graph.issues.push({issue : issue, validity : Errors.Validity.Error})
                }
                ids.push(fieldId);
            }
        }

        // loop over graph edges
        for (const [id, edge] of graph.getEdges()){
            if (ids.includes(id)){
                const issue: Errors.Issue = Errors.ShowFix(
                    "Edge (" + id + ") does not have a unique id",
                    function(){Utils.showEdge(eagle, edge)},
                    function(){edge.setId(Utils.generateEdgeId())},
                    "Assign edge a new id"
                );
                graph.issues.push({issue : issue, validity : Errors.Validity.Error})
            }
            ids.push(id);
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

        // check all edges in the edges dict are also present in the srcPort or destPort edges dict
        for (const [id, edge] of graph.edges()){
            if (edge.getSrcPort().getEdges().get(id) === null && edge.getDestPort().getEdges().get(id) === null){
                const issue: Errors.Issue = Errors.Show("Edge (" + id + ") is not present in source or destination port edges list", function(){Utils.showEdge(eagle, edge)});
                graph.issues.push({issue:issue, validity: Errors.Validity.Error});
            }
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
                const graphNode: Node = graph.getNodes().get(graphConfigNode.getId());

                if (typeof graphNode === 'undefined'){
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
                    const graphField: Field = graphNode.getFields().get(graphConfigField.getId());

                    if (typeof graphField === 'undefined'){
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
