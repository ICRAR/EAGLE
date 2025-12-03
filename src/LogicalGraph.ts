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
import { FileLocation } from "./FileLocation";
import { GraphConfig } from './GraphConfig';
import { GraphConfigurationsTable } from "./GraphConfigurationsTable";
import { Node } from './Node';
import { RepositoryFile } from './RepositoryFile';
import { Setting } from './Setting';
import { Utils } from './Utils';

export class LogicalGraph {
    fileInfo : ko.Observable<FileInfo>;
    private nodes : ko.Observable<Map<NodeId, Node>>;
    private edges : ko.Observable<Map<EdgeId, Edge>>;
    private graphConfigs : ko.Observable<Map<GraphConfigId, GraphConfig>>;
    private activeGraphConfigId : ko.Observable<GraphConfigId | null>;

    private issues : ko.ObservableArray<{issue:Errors.Issue, validity:Errors.Validity}> //keeps track of higher level errors on the graph
    

    constructor(){
        this.fileInfo = ko.observable(new FileInfo());
        this.fileInfo().type = Eagle.FileType.Graph;
        this.fileInfo().readonly = false;
        this.fileInfo().builtIn = false;
        this.nodes = ko.observable(new Map<NodeId, Node>());
        this.edges = ko.observable(new Map<EdgeId, Edge>());
        this.graphConfigs = ko.observable(new Map<GraphConfigId, GraphConfig>());
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
            if (node.isEmbedded()){
                continue;
            }

            const nodeData : any = Node.toOJSGraphJson(node);
            result.nodeDataArray.push(nodeData);
        }

        // add links
        result.linkDataArray = [];
        for (const edge of graph.edges().values()){

            // depending on the settings and purpose, skip close-loop edges
            if (forTranslation && Setting.findValue(Setting.SKIP_CLOSE_LOOP_EDGES)){
                if (edge.isClosesLoop()){
                    continue;
                }
            }

            const linkData : any = Edge.toOJSJson(edge);

            let srcId = edge.getSrcNode().getId();
            let destId = edge.getDestNode().getId();

            const srcNode = graph.nodes().get(srcId);
            const destNode = graph.nodes().get(destId);

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
            const srcEmbed = srcNode.getEmbed();
            const destEmbed = destNode.getEmbed();
            if (srcEmbed){
                srcId = srcEmbed.getId();
            }
            if (destEmbed){
                destId = destEmbed.getId();
            }

            linkData.from = srcId;
            linkData.to   = destId;

            result.linkDataArray.push(linkData);
        }

        // add graph configurations
        result.graphConfigurations = {};
        for (const gc of graph.graphConfigs().values()){
            result.graphConfigurations[gc.getId()] = GraphConfig.toJson(gc);
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

            const inputApplication = node.getInputApplication();
            const outputApplication = node.getOutputApplication();

            // add input and output applications to the top-level nodes dict
            if (inputApplication !== null){
                result.nodes[inputApplication.getId()] = Node.toV4GraphJson(inputApplication);
            }

            if (outputApplication !== null){
                result.nodes[outputApplication.getId()] = Node.toV4GraphJson(outputApplication);
            }
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
        for (const gc of graph.graphConfigs().values()){
            result.graphConfigurations[gc.getId()] = GraphConfig.toJson(gc);
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
            const activeGraphConfig = graph.getActiveGraphConfig();

            if (typeof activeGraphConfig === "undefined"){
                result += '"graphConfigurations": {},\n';
            } else {
                const graphConfigurations: any = {};
                graphConfigurations[activeGraphConfig.getId()] = GraphConfig.toJson(activeGraphConfig);
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
            const activeGraphConfig = graph.getActiveGraphConfig();

            if (typeof activeGraphConfig === "undefined"){
                result += '"graphConfigurations": {},\n';
            } else {
                const graphConfigurations: any = {};
                graphConfigurations[activeGraphConfig.getId()] = GraphConfig.toJson(activeGraphConfig);
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

    static fromOJSJson(dataObject : any, filename: string | null, errorsWarnings : Errors.ErrorsWarnings) : LogicalGraph {
        // create new logical graph object
        const result : LogicalGraph = new LogicalGraph();
        const nodeDataIdToNodeId: Map<string, NodeId> = new Map();

        // copy modelData into fileInfo
        const fileInfo: FileInfo = FileInfo.fromOJSJson(dataObject.modelData, errorsWarnings);
        result.fileInfo(fileInfo);

        // add nodes
        for (const nodeData of dataObject.nodeDataArray){
            const nodeDataId = Node.determineNodeId(nodeData);

            if (nodeDataId === null){
                continue;
            }

            const newNode = Node.fromOJSJson(nodeData, errorsWarnings, false);

            if (newNode === null){
                continue;
            }

            result.nodes().set(newNode.getId(), newNode);
            nodeDataIdToNodeId.set(nodeDataId, newNode.getId());

            const inputApplication = newNode.getInputApplication();
            const outputApplication = newNode.getOutputApplication();

            // add input and output applications to the top-level nodes list
            if (inputApplication !== null){
                result.nodes().set(inputApplication.getId(), inputApplication);
            }
            if (outputApplication !== null){
                result.nodes().set(outputApplication.getId(), outputApplication);
            }

            result.nodes.valueHasMutated();
        }

        // set ids for all embedded nodes
        Utils.setEmbeddedApplicationNodeIds(result);

        // make sure to set parent for all nodes
        for (let i = 0 ; i < dataObject.nodeDataArray.length ; i++){
            const nodeData = dataObject.nodeDataArray[i];
            const parentDataId = Node.determineNodeParentId(nodeData);

            // if parentId cannot be found, skip this node
            if (parentDataId === null){
                continue;
            }

            const nodeDataId = Node.determineNodeId(nodeData);

            if (nodeDataId === null){
                continue;
            }

            const nodeId = nodeDataIdToNodeId.get(nodeDataId);
            const parentId = nodeDataIdToNodeId.get(parentDataId);

            if (typeof nodeId === 'undefined' || typeof parentId === 'undefined'){
                continue;
            }

            const node = result.nodes().get(nodeId);
            const parent = result.nodes().get(parentId);

            if (typeof node === 'undefined' || typeof parent === 'undefined'){
                continue;
            }

            node.setParent(parent);
        }

        // add edges
        for (const linkData of dataObject.linkDataArray){       
            const newEdge = Edge.fromOJSJson(linkData, Array.from(result.nodes().values()), errorsWarnings);

            if (newEdge === null){
                continue;
            }

            result.edges().set(newEdge.getId(), newEdge);
            result.edges.valueHasMutated();

            newEdge.getSrcPort().addEdge(newEdge);
            newEdge.getDestPort().addEdge(newEdge);
        }

        // load configs (if present)
        if (typeof dataObject.graphConfigurations !== 'undefined'){
            for (const gcId in dataObject["graphConfigurations"]){
                const gco = dataObject["graphConfigurations"][gcId];
                const gc = GraphConfig.fromJson(gco, result, errorsWarnings);
                gc.setId(gcId as GraphConfigId);
                result.graphConfigs().set(gcId as GraphConfigId, gc);
            }
            result.graphConfigs.valueHasMutated();

            //if the saved 'activeGraphConfigId' is empty or missing, we use the last one in the array, else we set the saved one as active                
            if(typeof dataObject.activeGraphConfigId === 'undefined' || dataObject.activeGraphConfigId === ''){
                result.activeGraphConfigId(null);
            }else{
                result.activeGraphConfigId(dataObject.activeGraphConfigId);
            }
        }

        // check for missing name
        if (result.fileInfo().name === "" && filename !== null){
            const error : string = "FileInfo.name is empty. Setting name to " + filename;
            errorsWarnings.warnings.push(Errors.Message(error));

            result.fileInfo().name = filename;
            result.fileInfo().location.repositoryFileName(filename);
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

    static fromV4Json(dataObject : any, filename: string, errorsWarnings : Errors.ErrorsWarnings) : LogicalGraph {
        // create new logical graph object
        const result : LogicalGraph = new LogicalGraph();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromV4Json(dataObject.modelData, errorsWarnings));

        // add nodes
        for (const [nodeId, nodeData] of Object.entries(dataObject.nodes)){
            const node = Node.fromV4Json(nodeData, errorsWarnings, false);

            result.nodes().set(nodeId as NodeId, node);
            result.nodes.valueHasMutated();
        }

        // second pass through the nodes
        // used to set parent, embed, subject, inputApplication, outputApplication
        for (const [nodeId, nodeData] of Object.entries(dataObject.nodes)){
            const embed = result.getNodeById((<any>nodeData).embedId);
            const parent = result.getNodeById((<any>nodeData).parentId);
            const inputApplication = result.getNodeById((<any>nodeData).inputApplicationId);
            const outputApplication = result.getNodeById((<any>nodeData).outputApplicationId);

            const node = result.getNodeById(nodeId as NodeId);

            if (typeof node === 'undefined'){
                console.error("No node found with id " + nodeId);
                continue;
            }

            if (typeof embed !== 'undefined'){
                node.setEmbed(embed);
            }
            if (typeof parent !== 'undefined'){
                node.setParent(parent);
            }
            if (typeof inputApplication !== 'undefined'){
                node.setInputApplication(inputApplication);
            }
            if (typeof outputApplication !== 'undefined'){
                node.setOutputApplication(outputApplication);
            }
        }

        // add edges
        for (const [edgeId, edgeData] of Object.entries(dataObject.edges)){
            const edge = Edge.fromV4Json(edgeData, result, errorsWarnings);

            if (edge === null){
                continue;
            }

            result.edges().set(edgeId as EdgeId, edge);
            result.edges.valueHasMutated();

            // add edge to source and destination port edge dicts
            edge.getSrcPort().addEdge(edge);
            edge.getDestPort().addEdge(edge);
        }

        // load configs
        for (const [gcId, gcData] of Object.entries(dataObject.graphConfigurations)){
            const gc = GraphConfig.fromJson(gcData, result, errorsWarnings);
            gc.setId(gcId as GraphConfigId);
            result.graphConfigs().set(gcId as GraphConfigId, gc);
        }
        result.graphConfigs.valueHasMutated();

        //if the saved 'activeGraphConfigId' is empty or missing, we use the last one in the array, else we set the saved one as active                
        if(typeof dataObject.activeGraphConfigId === 'undefined' || dataObject.activeGraphConfigId === ''){
            result.activeGraphConfigId(null);
        }else{
            result.activeGraphConfigId(dataObject.activeGraphConfigId);
        }

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

    getNodes = () : MapIterator<Node> => {
        return this.nodes().values();
    }

    getAllNodes = () : Node[] => {
        const nodes : Node[] =[]
        this.nodes().forEach(function(node: Node){
            nodes.push(node)
            if(node.isConstruct()){
                const inputApplication = node.getInputApplication();
                const outputApplication = node.getOutputApplication();

                if(inputApplication != null){
                    nodes.push(inputApplication)
                }
                if(outputApplication != null){
                    nodes.push(outputApplication)
                }
            }
        })
        return nodes;
    }

    getNumNodes = () : number => {
        return this.nodes().size;
    }

    hasNode = (id: NodeId): boolean => {
        return this.nodes().has(id);
    }

    getNodeById = (id: NodeId): Node | undefined => {
        return this.nodes().get(id);
    }

    // NOTE: only returns the first node found with the given name, names are not unique
    getNodeByName = (name: string): Node | undefined => {
        for (const node of this.nodes().values()){
            if (node.getName() === name){
                return node;
            }
        }
        return undefined;
    }

    addEdgeComplete = (edge : Edge) => {
        this.edges().set(edge.getId(), edge);
        this.edges.valueHasMutated();

        edge.getSrcPort().addEdge(edge);
        edge.getDestPort().addEdge(edge);
    }

    getEdges = () : MapIterator<Edge> => {
        return this.edges().values();
    }

    getNumEdges = () : number => {
        return this.edges().size;
    }

    getEdgeById = (id: EdgeId): Edge | undefined => {
        return this.edges().get(id);
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

    getInspectorShortDescriptionHTML : ko.PureComputed<string> = ko.pureComputed(() => {
        let text = 'No short description available'
        if(this.fileInfo().shortDescription != ''){
            text = Utils.markdown2html(this.fileInfo().shortDescription)
        }

        return '***Open Short Graph Description:*** </br>' + text;
    }, this);

    getInspectorDetailedDescriptionHTML : ko.PureComputed<string> = ko.pureComputed(() => {
        let text = 'No detailed description available'
        if(this.fileInfo().detailedDescription != ''){
            text = Utils.markdown2html(this.fileInfo().detailedDescription)
        }
        
        return '***Open Detailed Graph Description:*** </br>' + text;
    }, this);

    getGraphConfigs = (): MapIterator<GraphConfig> => {
        return this.graphConfigs().values();
    }
    
    getNumGraphConfigs = (): number => {
        return this.graphConfigs().size;
    }

    getGraphConfigById = (id: GraphConfigId): GraphConfig | undefined => {
        return this.graphConfigs().get(id);
    }

    addGraphConfig = (config: GraphConfig): void => {
        // update fileInfo of config with data about the graph to which it was added
        config.fileInfo().graphLocation = this.fileInfo().location.clone();

        this.graphConfigs().set(config.getId(), config);
        this.graphConfigs.valueHasMutated();

        this.setActiveGraphConfig(config.getId());
        this.fileInfo().modified = true;

        // open the graph configurations table
        GraphConfigurationsTable.openTable();

        //focus on and select the name field of the newly added config in the configurations table, ready to rename. this requires a little wait, to allow the ui to update
        setTimeout(() => {
            $('#graphConfigurationsTableWrapper .activeConfig .column-name input').focus().select()
        }, 100);

        Utils.showNotification("Graph Config added to Logical Graph", config.fileInfo().name, "success");

        const eagle: Eagle = Eagle.getInstance();
        eagle.undo().pushSnapshot(eagle, "Added a new graph configuration (" + config.fileInfo().name + ")");
        eagle.checkGraph();
    }

    removeGraphConfig = (config: GraphConfig): void => {
        this.graphConfigs().delete(config.getId());
        this.graphConfigs.valueHasMutated();

        // if the removed graph config is also the active config, then we need to unset the active config
        if (this.activeGraphConfigId() === config.getId()){
            this.activeGraphConfigId(null);
        }

        // create undo snapshot
        const eagle: Eagle = Eagle.getInstance();
        eagle.undo().pushSnapshot(eagle, "Removed graph configuration " + name);

        // check graph
        eagle.checkGraph();
    }

    getActiveGraphConfig = (): GraphConfig | undefined => {
        const activeGraphConfigId = this.activeGraphConfigId();
        if (activeGraphConfigId === null){
            return undefined;
        }

        return this.getGraphConfigById(activeGraphConfigId);
    }

    setActiveGraphConfig = (configId: GraphConfigId | null): void => {
        this.activeGraphConfigId(configId)
    }

    toggleActiveGraphConfig = (configId: GraphConfigId): void => {
        if(this.activeGraphConfigId() === configId){
            this.activeGraphConfigId(null)
        }else{
            this.activeGraphConfigId(configId)
        }
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
        this.nodes.valueHasMutated();

        this.edges().clear();
        this.edges.valueHasMutated();

        this.graphConfigs().clear();
        this.graphConfigs.valueHasMutated();

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
        for (const graphConfig of this.graphConfigs().values()){
            const clone = graphConfig.clone();
            result.graphConfigs().set(clone.getId(), clone);
            result.graphConfigs.valueHasMutated();
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

    updateNodeId(oldId: NodeId, newId: NodeId): void {
        const node = this.nodes().get(oldId);

        if (typeof node === 'undefined'){
            console.warn("updateNodeId(): Could not find node with id", oldId);
            return;
        }

        this.nodes().delete(oldId);
        node.setId(newId);
        this.nodes().set(newId, node);
    }

    updateEdgeId(oldId: EdgeId, newId: EdgeId): void {
        const edge = this.edges().get(oldId);

        if (typeof edge === 'undefined'){
            console.warn("updateEdgeId(): Could not find edge with id", oldId);
            return;
        }

        this.edges().delete(oldId);
        edge.setId(newId);
        this.edges().set(newId, edge);
    }

    updateGraphConfigId(oldId: GraphConfigId, newId: GraphConfigId): void {
        const graphConfig = this.graphConfigs().get(oldId);

        if (typeof graphConfig === 'undefined'){
            console.warn("updateGraphConfigId(): Could not find graph config with id", oldId);
            return;
        }

        this.graphConfigs().delete(oldId);
        graphConfig.setId(newId);
        this.graphConfigs().set(newId, graphConfig);
    }

    removeNode = (node: Node) : void => {
        const id = node.getId();

        // first, delete any field in any graph config, that belongs to this node
        for (const graphConfig of this.graphConfigs().values()){
            graphConfig.removeNodeById(node.getId());
        }

        // NOTE: this section handles an unusual case where:
        //  - the removed node is an embedded node within a construct
        //  - there are edge(s) connected to a port on the embedded node
        //  - but the edge(s) have source or destination node id of the construct
        // This situation should not occur in a well-formed graph, but does occur in many existing graphs
        const that = this
        if(node.isEmbedded()){
            for (const field of node.getFields()){
                if(field.isInputPort() || field.isOutputPort()){
                    that.edges().forEach(function(edge:Edge){
                        if(edge.getDestPort().getId() === field.getId() || edge.getSrcPort().getId() === field.getId()){
                            that.removeEdgeById(edge.getId())
                        }
                    })
                }
            }
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
                this.nodes().delete(node.getInputApplication().getId());
                this.nodes.valueHasMutated();
                node.setInputApplication(null);
                break;
            }

            // delete the output application
            if (node.hasOutputApplication() && node.getOutputApplication().getId() === id){
                this.nodes().delete(node.getOutputApplication().getId());
                this.nodes.valueHasMutated();
                node.setOutputApplication(null);
                break;
            }
        }

        // delete children of this node
        for (const child of node.getChildren()){
            this.removeNode(child);
        }

        // remove inputApplication and outputApplication from the nodes map
        if (node.hasInputApplication()){
            this.nodes().delete(node.getInputApplication().getId());
            this.nodes.valueHasMutated();
        }
        if (node.hasOutputApplication()){
            this.nodes().delete(node.getOutputApplication().getId());
            this.nodes.valueHasMutated();
        }
    }

    removeEdgeById = (id: EdgeId) : void => {
        const edge = this.edges().get(id);

        if (typeof edge === 'undefined'){
            console.warn("removeEdgeById(): Could not find edge with id", id);
            return;
        }

        this.edges().delete(id);
        this.edges.valueHasMutated();

        edge.getSrcPort().removeEdge(id);
        edge.getDestPort().removeEdge(id);
    }

    // delete edges that start from or end at the node with the given id
    removeEdgesById = (nodeId: NodeId) : void => {
        // first build a list of edges to remove
        // this is necessary because we cannot modify the edges map while iterating over it
        const edgesToRemove: EdgeId[] = [];

        for (const [edgeId, edge] of this.edges()){
            if (edge.getSrcNode().getId() === nodeId || edge.getDestNode().getId() === nodeId){
                edgesToRemove.push(edgeId);

                // remove the edge from the source and destination ports
                edge.getSrcPort().removeEdge(edgeId);
                edge.getDestPort().removeEdge(edgeId);
            }
        }

        // remove edges from the map
        for (const edgeId of edgesToRemove){
            this.edges().delete(edgeId);
        }
        this.edges.valueHasMutated();
    }

    removeFieldFromNodeById = (node : Node, fieldId: FieldId) : void => {
        if (node === null){
            console.warn("Could not remove port from null node");
            return;
        }

        // remove port
        node.removeFieldById(fieldId);

        // first build a list of edges to remove
        // this is necessary because we cannot modify the edges map while iterating over it
        const edgesToRemove: EdgeId[] = [];

        for (const [edgeId, edge] of this.edges()){
            if (edge.getSrcPort().getId() === fieldId || edge.getDestPort().getId() === fieldId){
                edgesToRemove.push(edgeId);

                // remove the edge from the source and destination ports
                edge.getSrcPort().removeEdge(edgeId);
                edge.getDestPort().removeEdge(edgeId);
            }
        }

        // remove edges from the map
        for (const edgeId of edgesToRemove){
            this.edges().delete(edgeId);
        }
        this.edges.valueHasMutated();

        // TODO: we should do this graph checking in the calling code, not here
        // get reference to EAGLE
        const eagle: Eagle = Eagle.getInstance();

        eagle.checkGraph();
        eagle.undo().pushSnapshot(eagle, "Remove port from node");
        eagle.flagActiveFileModified();
        eagle.selectedObjects.valueHasMutated();
    }

    portIsLinked = (node: Node, port: Field) : {input: boolean, output: boolean} => {
        const result:{input:boolean, output:boolean} = {'input':false, 'output':false};

        for (const edge of port.getEdges()){
            if(edge.getSrcNode().getId() === node.getId() && edge.getSrcPort().getId() === port.getId()){
                result.output = true
            }
            if(edge.getDestNode().getId() === node.getId() && edge.getDestPort().getId() === port.getId()){
                result.input = true
            }
        }

        return result;
    }

    findMultiplicity = (node : Node) : number => {
        let n : Node | null = node;
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

    checkForNodeAt = (x: number, y: number, radius: number, findEligibleGroups: boolean = false) : Node | null => {
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
        let maxDepthOverlap: Node | null = null;

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

    getRootNodes = () : Node[] => {
        const result: Node[] = [];

        for (const node of this.nodes().values()){
            if (node.hasParent()){
                continue;
            }
            if (node.isEmbedded()){
                continue;
            }

            result.push(node);
        }

        return result;
    }

    // TODO: redo once we have node.children, shouldn't actually be required at all, remove it
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
        for (const [nodeId, node] of this.nodes()){
            const depth = this.findDepthById(nodeId);

            // skip embedded nodes, rendering of these is handled by the surrounding construct
            if (node.isEmbedded()){
                continue;
            }

            idPlusDepths.push({id:nodeId, depth:depth});
        }

        // sort nodes in depth ascending
        idPlusDepths.sort(function(a, b){
            return a.depth - b.depth;
        });

        // write nodes to result in sorted order
        for (const idPlusDepth of idPlusDepths){
            const n = this.nodes().get(idPlusDepth.id);
            if (n !== undefined) {
                result.push(n);    
            }
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

        //if the graph has been user created but does not have a short description, warn the user
        if (graph.fileInfo().isInitiated() && graph.fileInfo().shortDescription === ''){
            const issue: Errors.Issue = Errors.Show(
                "Graph does not have a short description.",
                function(){eagle.editShortDescription(graph.fileInfo())}
            );
            graph.issues.push({issue : issue, validity : Errors.Validity.Warning})
        }

        //if the graph has been user created but does not have a detailed description, warn the user
        if (graph.fileInfo().isInitiated() && graph.fileInfo().detailedDescription === ''){
            const issue: Errors.Issue = Errors.Show(
                "Graph does not have a detailed description.",
                function(){eagle.editDetailedDescription(graph.fileInfo())}
            );
            graph.issues.push({issue : issue, validity : Errors.Validity.Warning})
        }

        // check that all node, edge, field, and config ids are unique
        const ids : string[] = [];

        // loop over graph nodes
        for (const [nodeId, node] of graph.nodes()){
            if (ids.includes(nodeId)){
                const issue: Errors.Issue = Errors.ShowFix(
                    "Node (" + node.getName() + ") does not have a unique id",
                    function(){Utils.showNode(eagle, Eagle.FileType.Graph, node)},
                    function(){Utils.newNodeId(graph, nodeId)},
                    "Assign node a new id"
                );
                graph.issues.push({issue : issue, validity : Errors.Validity.Error})
            }
            ids.push(nodeId);

            // loop over fields within graphs to check that all field ids are unique
            for (const field of node.getFields()){
                if (ids.includes(field.getId())){
                    const issue: Errors.Issue = Errors.ShowFix(
                        "Field (" + field.getDisplayText() + ") on node (" + node.getName() + ") does not have a unique id",
                        function(){Utils.showNode(eagle, Eagle.FileType.Graph, node)},
                        function(){Utils.newFieldId(eagle, node, field)},
                        "Assign field a new id"
                    );
                    graph.issues.push({issue : issue, validity : Errors.Validity.Error})
                }
                ids.push(field.getId());
            }
        }

        // loop over graph edges to check that all edge ids are unique
        for (const [id, edge] of graph.edges()){
            if (ids.includes(id)){
                const issue: Errors.Issue = Errors.ShowFix(
                    "Edge (" + id + ") does not have a unique id",
                    function(){Utils.showEdge(eagle, edge)},
                    function(){Utils.newEdgeId(graph, id)},
                    "Assign edge a new id"
                );
                graph.issues.push({issue : issue, validity : Errors.Validity.Error})
            }
            ids.push(id);
        }

        // loop over the graph configs to check that all graph config ids are unique
        for (const [id, graphConfig] of graph.graphConfigs()){
            if (ids.includes(id)){
                const issue: Errors.Issue = Errors.ShowFix(
                    "Graph Config (" + graphConfig.getId() + ") does not have a unique id",
                    function(){Utils.showGraphConfig(eagle, id)},
                    function(){Utils.newGraphConfigId(graph, id)},
                    "Assign graph config a new id"
                );
                graph.issues.push({issue : issue, validity : Errors.Validity.Error})
            }

            ids.push(graphConfig.getId());
        }

        // check that all nodes in the nodes dict have a key that matches the id inside the node
        for (const [id, node] of graph.nodes()){
            if (node.getId() !== id){
                const issue: Errors.Issue = Errors.ShowFix(
                    "Node (" + id + ") id does not match the key in the nodes dictionary",
                    function(){Utils.showNode(eagle, Eagle.FileType.Graph, node)},
                    function(){node.setId(id)},
                    "Set node id to match key in nodes dictionary"
                );
                graph.issues.push({issue : issue, validity : Errors.Validity.Error})
            }
        }

        // loop over the graph configs to check that the graphLocation in fileInfo matches the location of the graph itself
        for (const graphConfig of graph.getGraphConfigs()){
            if (!FileLocation.match(graphConfig.fileInfo().graphLocation, graph.fileInfo().location)){
                const issue: Errors.Issue = Errors.ShowFix(
                    "Graph Config (" + graphConfig.fileInfo().name + ") graph location does not match the location of the parent graph",
                    function(){Utils.showGraphConfig(eagle, graphConfig.getId())},
                    function(){graphConfig.fileInfo().graphLocation = graph.fileInfo().location.clone()},
                    "Set graph config's graph location to match that of the graph"
                );
                graph.issues.push({issue : issue, validity : Errors.Validity.Error})
            }
        }

        // check all edges in the edges dict are also present in the srcPort or destPort edges dict
        for (const [id, edge] of graph.edges()){
            if (typeof edge.getSrcPort() === 'undefined' || typeof edge.getDestPort() === 'undefined'){
                const issue: Errors.Issue = Errors.Show("Edge (" + id + ") has undefined srcPort or undefined destPort", function(){Utils.showEdge(eagle, edge)});
                graph.issues.push({issue:issue, validity: Errors.Validity.Error});
                continue;
            }

            // check source port
            if (typeof edge.getSrcPort().getEdgeById(id) === 'undefined'){
                const issue: Errors.Issue = Errors.Show("Edge (" + id + ") is not present in source port edges list", function(){Utils.showEdge(eagle, edge)});
                graph.issues.push({issue:issue, validity: Errors.Validity.Error});
            }

            // check destination port
            if (typeof edge.getDestPort().getEdgeById(id) === 'undefined'){
                const issue: Errors.Issue = Errors.Show("Edge (" + id + ") is not present in destination port edges list", function(){Utils.showEdge(eagle, edge)});
                graph.issues.push({issue:issue, validity: Errors.Validity.Error});
            }
        }

        // check that all edges in the edges dict have a key that matches the id inside the edge
        for (const [id, edge] of graph.edges()){
            if (edge.getId() !== id){
                const issue: Errors.Issue = Errors.ShowFix(
                    "Edge (" + id + ") id does not match the key in the edges dictionary",
                    function(){Utils.showEdge(eagle, edge)},
                    function(){edge.setId(id)},
                    "Set edge id to match key in edges dictionary"
                );
                graph.issues.push({issue : issue, validity : Errors.Validity.Error})
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
                        if (graph.graphConfigs().size === 0){
                            graph.setActiveGraphConfig(null);
                        } else {
                            graph.setActiveGraphConfig(Array.from(graph.graphConfigs().values())[0].getId());
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
                const graphNode = graph.nodes().get(graphConfigNode.getNode().getId());

                if (typeof graphNode === 'undefined'){
                    const issue: Errors.Issue = Errors.Fix(
                        "Node in graph config (" + graphConfig.fileInfo().name + ") is not present in Logical Graph",
                        function(){
                            graphConfig.removeNode(graphNode);
                        },
                        "Delete node from graph config"
                    );
                    graph.issues.push({issue : issue, validity : Errors.Validity.Error});
                    break;
                }

                for (const graphConfigField of graphConfigNode.getFields()){
                    const graphField = graphNode.getFieldById(graphConfigField.getField().getId());

                    if (typeof graphField === 'undefined'){
                        const issue: Errors.Issue = Errors.Fix(
                            "Field in graph config (" + graphConfig.fileInfo().name + ", " + graphNode.getName() + ") is not present in Logical Graph",
                            function(){
                                graphConfigNode.removeFieldById(graphConfigField.getField().getId());
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
