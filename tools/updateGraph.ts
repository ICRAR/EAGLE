import * as fs from "fs";

import {Eagle} from '../src/Eagle';
import {LogicalGraph} from '../src/LogicalGraph';
import {Utils} from '../src/Utils';
import {GraphUpdater} from '../src/GraphUpdater';
import {FileInfo} from '../src/FileInfo';
import {Node} from '../src/Node';
import {Field} from '../src/Field';
import {Port} from '../src/Port';
import {Edge} from '../src/Edge';

// check command line arguments
if (process.argv.length < 4){
    console.log("incorrect usage, please add input and output files to the command line");
    process.exit();
}

// get input and output filenames from the command line arguments
var inputFilename : string = process.argv[2];
var outputFilename : string = process.argv[3];
//console.log("inputFilename", inputFilename);
//console.log("outputFilename", outputFilename);

// load input file from disk
var data : Buffer = fs.readFileSync(inputFilename);
var inputGraph = JSON.parse(data.toString());
//console.log("inputGraph", inputGraph);

// create an empty output graph
var outputGraph : LogicalGraph = new LogicalGraph();

// copy fineInfo from the input graph to the output graph
outputGraph.fileInfo(readFileInfo(inputGraph.modelData, inputFilename));

// copy nodes from the input graph to the output graph
for (var i = 0 ; i < inputGraph.nodeDataArray.length ; i++){
    var oldNode = inputGraph.nodeDataArray[i];
    var newNode : Node = readNode(oldNode);
    outputGraph.addNodeComplete(newNode);
}

// make sure to set parentId for all nodes
for (var i = 0 ; i < inputGraph.nodeDataArray.length ; i++){
    var oldNode = inputGraph.nodeDataArray[i];
    var parentKey = oldNode.group;
    var parentIndex = GraphUpdater.findIndexOfNodeDataArrayWithKey(inputGraph.nodeDataArray, parentKey);

    if (parentIndex !== -1){
        var newNode = outputGraph.getNodes()[i];
        var parentNode = outputGraph.getNodes()[parentIndex];
        newNode.setParentKey(parentNode.getKey());
    }
}

// copy edges from the input graph to the output graph
for (var i = 0 ; i < inputGraph.linkDataArray.length ; i++){
    var oldEdge = inputGraph.linkDataArray[i];
    var newEdge : Edge = readEdge(oldEdge);

    if (newEdge !== null){
        outputGraph.addEdgeComplete(newEdge);
    }
}

// make sure that positions of nodes are in the +x, +y quadrant
var hadNegativePositions : boolean = GraphUpdater.correctOJSNegativePositions(outputGraph);
if (hadNegativePositions){
    logMessage("Adjusting position of all nodes to move to positive quadrant.");
}

// write the logical graph to disk using the outputFilename
fs.writeFileSync(outputFilename, JSON.stringify(LogicalGraph.toOJSJson(outputGraph), null, 4));

// finish
process.exit();

function readFileInfo(modelData : any, inputFilename : string) : FileInfo {
    var result : FileInfo = new FileInfo();

    // if modelData is undefined, then we have no data to build the FileInfo
    if (typeof modelData === "undefined"){
        result.path = GraphUpdater.getFilePathFromFullPath(inputFilename);
        result.name = GraphUpdater.getFileNameFromFullPath(inputFilename);
        result.type = Eagle.FileType.Graph;
        logMessage("Input graph FileInfo undefined. Building from scratch. Path:" + result.path + " Name:" + result.name + " Type:" + Utils.translateFileTypeToString(result.type));

        return result;
    }

    result.path = GraphUpdater.getFilePathFromFullPath(modelData.filePath);
    result.name = GraphUpdater.getFileNameFromFullPath(modelData.filePath);
    result.type = Utils.translateStringToFileType(modelData.fileType);
    result.gitUrl = modelData.git_url;

    // NOTE: if the incoming data (modelData) does not indicate the service, assume it is GitHub
    result.repositoryService = modelData.repoService == undefined ? Eagle.RepositoryService.GitHub : modelData.repoService;
    result.repositoryName = modelData.repo;
    result.sha = modelData.sha;

    return result;
}

function readNode(nodeData : any) : Node {
    var x = Node.DEFAULT_POSITION_X;
    var y = Node.DEFAULT_POSITION_Y;
    if (typeof nodeData.loc !== 'undefined'){
        x = parseInt(nodeData.loc.substring(0, nodeData.loc.indexOf(' ')), 10);
        y = parseInt(nodeData.loc.substring(nodeData.loc.indexOf(' ')), 10);
    }
    if (typeof nodeData.x !== 'undefined'){
        x = nodeData.x;
    }
    if (typeof nodeData.y !== 'undefined'){
        y = nodeData.y;
    }

    // translate categories if required
    var category : string = GraphUpdater.translateOldCategory(nodeData.category);
    var categoryType : string = GraphUpdater.translateOldCategoryType(nodeData.categoryType);
    if (category !== nodeData.category){
        logMessage("Translated old category: '" + nodeData.category + "' into a '"+ category + "' for node " + i);
    }
    if (categoryType !== nodeData.categoryType){
        logMessage("Translated old categoryType: '" + nodeData.categoryType + "' into a '"+ categoryType + "' for node " + i);
    }

    // create new node
    var node : Node = new Node(nodeData.key, nodeData.text, "", category, categoryType, x, y);

    // get description (if exists)
    if (typeof nodeData.description !== 'undefined'){
        node.setDescription(nodeData.description);
    }

    // get size (if exists)
    if (typeof nodeData.desiredSize !== 'undefined'){
        node.setWidth(nodeData.desiredSize.width);
        node.setHeight(nodeData.desiredSize.height);
    } else {
        if (typeof nodeData.width !== 'undefined'){
            node.setWidth(nodeData.width);
        } else {
            logMessage("Using default width for node " + i);
            node.setWidth(Node.DEFAULT_WIDTH);
        }

        if (typeof nodeData.height !== 'undefined'){
            node.setHeight(nodeData.height);
        } else {
            logMessage("Using default height for node " + i);
            node.setHeight(Node.DEFAULT_HEIGHT);
        }
    }

    node.setIsData(nodeData.isData);
    node.setIsGroup(nodeData.isGroup);
    node.setCanHaveInputs(nodeData.canHaveInputs);
    node.setCanHaveOutputs(nodeData.canHaveOutputs);

    if (typeof nodeData.inputAppName !== 'undefined'){
        node.setInputApplicationName(nodeData.inputAppName);
    }

    if (typeof nodeData.inputApplicationName !== 'undefined'){
        node.setInputApplicationName(nodeData.inputApplicationName);
    }

    if (typeof nodeData.outputAppName !== 'undefined'){
        node.setOutputApplicationName(nodeData.outputAppName);
    }

    if (typeof nodeData.outputApplicationName !== 'undefined'){
        node.setOutputApplicationName(nodeData.outputApplicationName);
    }

    if (typeof nodeData.exitAppName !== 'undefined'){
        node.setExitApplicationName(nodeData.exitAppName);
    }

    if (typeof nodeData.exitApplicationName !== 'undefined'){
        node.setExitApplicationName(nodeData.exitApplicationName);
    }

    if (typeof nodeData.group !== 'undefined'){
        node.setParentKey(nodeData.group);
    }

    // color - ignore color from nodeData, instead use the common color for all nodes of this category
    node.setColor(Utils.getColorForNode(category));

    // collapsed
    if (typeof nodeData.collapsed !== 'undefined'){
        node.setCollapsed(nodeData.collapsed);
    } else {
        node.setCollapsed(false);
    }

    // streaming
    if (typeof nodeData.streaming !== 'undefined'){
        node.setStreaming(nodeData.streaming);
    } else {
        node.setStreaming(false);
    }

    // application types
    node.setInputApplicationType(nodeData.inputApplication);
    node.setOutputApplicationType(nodeData.outputApplication);
    node.setExitApplicationType(nodeData.exitApplicationType);

    // subject (for comment nodes)
    if (typeof nodeData.subject !== 'undefined'){
        node.setSubjectKey(nodeData.subject);
    } else {
        node.setSubjectKey(null);
    }

    // if an old-style application is found, add them as the new input application type
    if (typeof nodeData.application !== "undefined"){
        logMessage("Only found old 'application', not new 'inputApplicationType' and 'outputApplicationType'. Setting 'inputApplicationType' to " + nodeData.application + " for node " + 1);
        node.setInputApplicationType(nodeData.application);
    }

    // add input ports
    if (typeof nodeData.inputPorts !== 'undefined'){
        for (var j = 0 ; j < nodeData.inputPorts.length; j++){
            var portData = nodeData.inputPorts[j];
            node.addPort(new Port(portData.Id, portData.IdText), true, false);
        }
    }

    // add output ports
    if (typeof nodeData.outputPorts !== 'undefined'){
        for (var j = 0 ; j < nodeData.outputPorts.length; j++){
            var portData = nodeData.outputPorts[j];
            node.addPort(new Port(portData.Id, portData.IdText), false, false);
        }
    }

    // add input local ports
    if (typeof nodeData.inputLocalPorts !== 'undefined'){
        for (var j = 0 ; j < nodeData.inputLocalPorts.length; j++){
            var portData = nodeData.inputLocalPorts[j];
            node.addPort(new Port(portData.Id, portData.IdText), true, true);
        }
    }

    // add output local ports
    if (typeof nodeData.outputLocalPorts !== 'undefined'){
        for (var j = 0 ; j < nodeData.outputLocalPorts.length; j++){
            var portData = nodeData.outputLocalPorts[j];
            node.addPort(new Port(portData.Id, portData.IdText), false, true);
        }
    }

    // add inputAppFields
    if (typeof nodeData.inputAppFields !== 'undefined'){
        for (var j = 0 ; j < nodeData.inputAppFields.length ; j++){
            var fieldData = nodeData.inputAppFields[j];
            var fieldDescription : string = fieldData.description == undefined ? "" : fieldData.description;
            node.addAppField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription), true);
        }
    }

    // add outputAppFields
    if (typeof nodeData.outputAppFields !== 'undefined'){
        for (var j = 0 ; j < nodeData.outputAppFields.length ; j++){
            var fieldData = nodeData.outputAppFields[j];
            var fieldDescription : string = fieldData.description == undefined ? "" : fieldData.description;
            node.addAppField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription), false);
        }
    }

    // if old-style appFields are found, add them as new input fields
    if (typeof nodeData.appFields !== "undefined"){
        logMessage("Only found old 'appFields', not new 'inputAppFields' and 'outputAppFields' in node " + i);
        for (var j = 0 ; j < nodeData.appFields.length ; j++){
            var fieldData = nodeData.appFields[j];
            node.addAppField(new Field(fieldData.text, fieldData.name, fieldData.value, ""), true);
        }
    }

    // add fields
    if (typeof nodeData.fields !== 'undefined'){
        for (var j = 0 ; j < nodeData.fields.length ; j++){
            var fieldData = nodeData.fields[j];
            var fieldDescription : string = fieldData.description == undefined ? "" : fieldData.description;
            node.addField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription));
        }
    }

    return node;
}

function readEdge(linkData : any) : Edge {
    // find source and destination nodes for this edge
    var srcNode : Node  = outputGraph.getNodes()[GraphUpdater.findIndexOfNodeDataArrayWithKey(inputGraph.nodeDataArray, linkData.from)];
    var destNode : Node  = outputGraph.getNodes()[GraphUpdater.findIndexOfNodeDataArrayWithKey(inputGraph.nodeDataArray, linkData.to)];

    // abort if source node not found
    if (typeof srcNode === 'undefined'){
        var error : string = "Unable to find node with key " + linkData.from + " used as source node in link " + i + ". Discarding link!";
        logError(error);
    }

    // abort if dest node not found
    if (typeof destNode === 'undefined'){
        var error : string = "Unable to find node with key " + linkData.to + " used as destination node in link " + i + ". Discarding link!";
        logError(error);
    }

    var srcPort : Port = null;
    var destPort : Port = null;

    // find source port on source node
    if (typeof srcNode !== 'undefined'){
        srcPort = srcNode.findPortById(linkData.fromPort);
    }

    // find dest port on dest node
    if (typeof destNode !== 'undefined'){
        destPort = destNode.findPortById(linkData.toPort);
    }

    // add it if source port not found
    if (srcPort === null){
        var srcNodeIdText : string = linkData.fromPort + "-" + linkData.toPort;
        srcNode.addPort(new Port(linkData.fromPort, srcNodeIdText), true, false);
        srcPort = srcNode.findPortById(linkData.fromPort);
        //var error : string = "Unable to find src port " + linkData.fromPort + " on node " + linkData.from + " used in link " + i;
        //logError(error);
        logMessage("updated the src port " + linkData.fromPort + " on node " + linkData.from + " used in link " + i);
     }

    // add it if dest port not found
    if (destPort === null){
        var destNodeIdText : string = linkData.fromPort + "-" + linkData.toPort;
        destNode.addPort(new Port(linkData.toPort, destNodeIdText), false, false);
        destPort = destNode.findPortById(linkData.toPort);
        //var error : string = "Unable to find dst port " + linkData.toPort + " on node " + linkData.to + " used in link " + i;
        //logError(error);
        logMessage("updated the dst port " + linkData.toPort + " on node " + linkData.to + " used in link " + i);
    }

    if (srcPort === null || destPort === null){
        return null;
    }

    return new Edge(linkData.from, linkData.fromPort, linkData.to, linkData.toPort, srcPort.getName());
}

function logMessage(message : string){
    console.log("- LOG:", message);
}

function logError(error : string){
    console.error("- ERROR:", error);
}
