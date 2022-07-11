import * as fs from "fs";

import {Eagle} from '../src/Eagle';
import {LogicalGraph} from '../src/LogicalGraph';
import {Utils} from '../src/Utils';
import {GraphUpdater} from '../src/GraphUpdater';
import {FileInfo} from '../src/FileInfo';
import {Node} from '../src/Node';
import {Field} from '../src/Field';
import {Edge} from '../src/Edge';

// check command line arguments
if (process.argv.length < 4){
    console.log("incorrect usage, please add input and output files to the command line");
    process.exit();
}

// get input and output filenames from the command line arguments
const inputFilename : string = process.argv[2];
const outputFilename : string = process.argv[3];

// load input file from disk
const data : Buffer = fs.readFileSync(inputFilename);
const inputGraph = JSON.parse(data.toString());

// create an empty output graph
const outputGraph : LogicalGraph = new LogicalGraph();

// copy fineInfo from the input graph to the output graph
outputGraph.fileInfo(readFileInfo(inputGraph.modelData, inputFilename));

// copy nodes from the input graph to the output graph
for (let i = 0 ; i < inputGraph.nodeDataArray.length; i++){
    const oldNode = inputGraph.nodeDataArray[i];
    const newNode : Node = readNode(oldNode, i);
    outputGraph.addNodeComplete(newNode);
}

// make sure to set parentId for all nodes
for (let i = 0 ; i < inputGraph.nodeDataArray.length ; i++){
    const oldNode = inputGraph.nodeDataArray[i];
    const parentKey = oldNode.group;
    const parentIndex = GraphUpdater.findIndexOfNodeDataArrayWithKey(inputGraph.nodeDataArray, parentKey);

    if (parentIndex !== -1){
        const newNode = outputGraph.getNodes()[i];
        const parentNode = outputGraph.getNodes()[parentIndex];
        newNode.setParentKey(parentNode.getKey());
    }
}

// copy edges from the input graph to the output graph
for (const oldEdge of inputGraph.linkDataArray){
    const newEdge : Edge = readEdge(oldEdge);

    if (newEdge !== null){
        outputGraph.addEdgeComplete(newEdge);
    }
}

// make sure that positions of nodes are in the +x, +y quadrant
const hadNegativePositions : boolean = GraphUpdater.correctOJSNegativePositions(outputGraph);
if (hadNegativePositions){
    logMessage("Adjusting position of all nodes to move to positive quadrant.");
}

// adjust size of group nodes so that they are large enough to contain their children
for (const node of outputGraph.getNodes()){
    outputGraph.shrinkNode(node);
}

// write the logical graph to disk using the outputFilename
fs.writeFileSync(outputFilename, JSON.stringify(LogicalGraph.toOJSJson(outputGraph, false), null, 4));

// finish
process.exit();

function readFileInfo(modelData : any, inputFilename : string) : FileInfo {
    const result : FileInfo = new FileInfo();

    // if modelData is undefined, then we have no data to build the FileInfo
    if (typeof modelData === "undefined"){
        result.path = Utils.getFilePathFromFullPath(inputFilename);
        result.name = Utils.getFileNameFromFullPath(inputFilename);
        result.type = Eagle.FileType.Graph;
        logMessage("Input graph FileInfo undefined. Building from scratch. Path:" + result.path + " Name:" + result.name + " Type:" + result.type);

        return result;
    }

    result.path = Utils.getFilePathFromFullPath(modelData.filePath);
    result.name = Utils.getFileNameFromFullPath(modelData.filePath);
    result.type = Utils.translateStringToFileType(modelData.fileType);
    result.gitUrl = modelData.git_url;

    // NOTE: if the incoming data (modelData) does not indicate the service, assume it is GitHub
    result.repositoryService = modelData.repoService == undefined ? Eagle.RepositoryService.GitHub : modelData.repoService;
    result.repositoryName = modelData.repo;
    result.sha = modelData.sha;

    return result;
}

function readNode(nodeData : any, index : number) : Node {
    let x = 0;
    let y = 0;
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
    let category : Eagle.Category = GraphUpdater.translateOldCategory(nodeData.category);

    if (category === Eagle.Category.Unknown){
        logError("Unable to translate category '" + nodeData.category + "' of node " + index);
    } else {
        if (category !== nodeData.category){
            logMessage("Translated old category: '" + nodeData.category + "' into '" + category + "' for node " + index);
        }
    }

    if (!Utils.isKnownCategory(category)){
        logError("Unknown category '" + category + "' of node " + index);
        category = Eagle.Category.Unknown;
    }

    // create new node
    const node : Node = new Node(nodeData.key, nodeData.text, "", category);
    node.setPosition(x, y);

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
            logMessage("Using default width for node " + index);
            node.setWidth(Node.DEFAULT_WIDTH);
        }

        if (typeof nodeData.height !== 'undefined'){
            node.setHeight(nodeData.height);
        } else {
            logMessage("Using default height for node " + index);
            node.setHeight(Node.DEFAULT_HEIGHT);
        }
    }

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
    if (typeof nodeData.inputApplication !== 'undefined'){
        node.setInputApplicationType(nodeData.inputApplication);
    }
    if (typeof nodeData.outputApplication !== 'undefined'){
        node.setOutputApplicationType(nodeData.outputApplication);
    }
    if (typeof nodeData.exitApplicationType !== 'undefined'){
        node.setExitApplicationType(nodeData.exitApplicationType);
    }

    // subject (for comment nodes)
    if (typeof nodeData.subject !== 'undefined'){
        node.setSubjectKey(nodeData.subject);
    } else {
        node.setSubjectKey(null);
    }

    // if an old-style application is found, add them as the new input application type
    if (typeof nodeData.application !== "undefined"){
        logMessage("Only found old 'application', not new 'inputApplicationType' and 'outputApplicationType'. Setting 'inputApplicationType' to " + nodeData.application + " for node " + index);
        node.setInputApplicationType(nodeData.application);
    }

    // add input ports
    if (typeof nodeData.inputPorts !== 'undefined'){
        for (const portData of nodeData.inputPorts){
            node.addPort(new Port(portData.Id, portData.IdText, false, Eagle.DataType_Unknown), true);
        }
    }

    // add output ports
    if (typeof nodeData.outputPorts !== 'undefined'){
        for (const portData of nodeData.outputPorts){
            node.addPort(new Port(portData.Id, portData.IdText, false, Eagle.DataType_Unknown), false);
        }
    }

    // add input local ports
    if (typeof nodeData.inputLocalPorts !== 'undefined'){
        for (const portData of nodeData.inputLocalPorts){
            node.addPort(new Port(portData.Id, portData.IdText, false, Eagle.DataType_Unknown), true);
        }
    }

    // add output local ports
    if (typeof nodeData.outputLocalPorts !== 'undefined'){
        for (const portData of nodeData.outputLocalPorts){
            node.addPort(new Port(portData.Id, portData.IdText, false, Eagle.DataType_Unknown), false);
        }
    }

    // add inputAppFields
    if (typeof nodeData.inputAppFields !== 'undefined'){
        for (const fieldData of nodeData.inputAppFields){
            const fieldDescription : string = fieldData.description == undefined ? "" : fieldData.description;
            node.addAppField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription), true);
        }
    }

    // add outputAppFields
    if (typeof nodeData.outputAppFields !== 'undefined'){
        for (const fieldData of nodeData.outputAppFields){
            const fieldDescription : string = fieldData.description == undefined ? "" : fieldData.description;
            node.addAppField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription), false);
        }
    }

    // if old-style appFields are found, add them as new input fields
    if (typeof nodeData.appFields !== "undefined"){
        logMessage("Only found old 'appFields', not new 'inputAppFields' and 'outputAppFields' in node " + index);
        for (const fieldData of nodeData.appFields.length){
            node.addAppField(new Field(fieldData.text, fieldData.name, fieldData.value, ""), true);
        }
    }

    // add fields
    if (typeof nodeData.fields !== 'undefined'){
        for (const fieldData of nodeData.fields){
            node.addField(new Field(fieldData.text, fieldData.name, fieldData.value, fieldDescription));
        }
    }

    // read OLD attributes from the root level of the nodes (if they exist)
    for (const oldAttribute of GraphUpdater.OLD_ATTRIBUTES){
        if (typeof nodeData[oldAttribute.name] !== 'undefined'){
            logMessage("Moved root level attribute '" + oldAttribute.name + "' to new field in node " + index);
            node.addField(new Field(oldAttribute.text, oldAttribute.name, nodeData[oldAttribute.name], oldAttribute.description));
        }
    }

    // make sure scatter nodes have a 'num_of_copies' field
    if (node.getCategory() === Eagle.Category.Scatter){
        if (node.getFieldByName('num_of_copies') === null){
            node.addField(new Field("Number of copies", "num_of_copies", "1", "", false, Eagle.DataType_Integer));
            logMessage("Added missing 'num_of_copies' field to Scatter node " + index);
        }
        if (node.getFieldByName('scatter_axis') === null){
            node.addField(new Field("Scatter Axis", "scatter_axis", "", "", false, Eagle.DataType_String));
            logMessage("Added missing 'scatter_axis' field to Scatter node " + index);
        }
    }

    // make sure gather nodes have a 'num_of_inputs' field
    if (node.getCategory() === Eagle.Category.Gather){
        if (node.getFieldByName('num_of_inputs') === null){
            node.addField(new Field("Number of inputs", "num_of_inputs", "1", "", false, Eagle.DataType_Integer));
            logMessage("Added missing 'num_of_inputs' field to Gather node " + index);
        }
        if (node.getFieldByName('gather_axis') === null){
            node.addField(new Field("Gather Axis", "gather_axis", "", "", false, Eagle.DataType_String));
            logMessage("Added missing 'gather_axis' field to Gather node " + index);
        }
    }

    // make sure MKN nodes have 'm', 'k', and 'n' fields
    if (node.getCategory() === Eagle.Category.MKN){
        if (node.getFieldByName('m') === null){
            node.addField(new Field("M", "m", "1", "1", "", false, Eagle.DataType_Integer, false));
            logMessage("Added missing 'm' field to MKN node " + index);
        }
        if (node.getFieldByName('k') === null){
            node.addField(new Field("K", "k", "1", "1", "", false, Eagle.DataType_Integer, false));
            logMessage("Added missing 'k' field to MKN node " + index);
        }
        if (node.getFieldByName('n') === null){
            node.addField(new Field("N", "n", "1", "1", "", false, Eagle.DataType_Integer, false));
            logMessage("Added missing 'n' field to MKN node " + index);
        }
    }

    // make sure comment nodes have appropriate fields
    if (node.getCategory() === Eagle.Category.Comment){
        if (node.getFieldByName('comment') === null){
            node.addField(new Field("Comment", "comment", node.getName(), node.getName(), "The text value of the comment", false, Eagle.DataType_String, false));
            node.setName("");
            logMessage("Added missing 'comment' field to Comment node " + index);
        }
    }

    // make sure description nodes have appropriate fields
    if (node.getCategory() === Eagle.Category.Description){
        if (node.getFieldByName('description') === null){
            node.addField(new Field("Description", "description", "", "", "The text value of the description", false, Eagle.DataType_String, false));
            logMessage("Added missing 'description' field to Description node " + index);
        }
    }

    // make sure "file" nodes that were created from old "Data" nodes have appropriate fields
    if (node.getCategory() === Eagle.Category.File && nodeData.category === "Data"){
        if (node.getFieldByName('filepath') === null){
            node.addField(new Field("File path", "file_path", nodeData.text, nodeData.text, "", false, Eagle.DataType_String, false));
            logMessage("Copied old 'text' value (" + nodeData.text + ") as filepath field for old Data node translated to File node " + index);
        }
    }

    return node;
}

function readEdge(linkData : any) : Edge {
    // find source and destination nodes for this edge
    const srcNode : Node  = outputGraph.getNodes()[GraphUpdater.findIndexOfNodeDataArrayWithKey(inputGraph.nodeDataArray, linkData.from)];
    const destNode : Node  = outputGraph.getNodes()[GraphUpdater.findIndexOfNodeDataArrayWithKey(inputGraph.nodeDataArray, linkData.to)];

    // log error if source node not found
    if (typeof srcNode === 'undefined'){
        const error : string = "Unable to find node with key " + linkData.from + " used as source node in link " + linkData.id + ". Discarding link!";
        logError(error);
    }

    // log error if dest node not found
    if (typeof destNode === 'undefined'){
        const error : string = "Unable to find node with key " + linkData.to + " used as destination node in link " + linkData.id + ". Discarding link!";
        logError(error);
    }

    // abort if one or both nodes cannot be found
    if (typeof srcNode === 'undefined' || typeof destNode === 'undefined'){
        logError("Unable to translate link " + linkData.id + ". Source or destination node unknown.");
        return null;
    }

    let srcPort : Port = null;
    let destPort : Port = null;
    const oldFromPortId : number = linkData.fromPort;
    const oldToPortId : number = linkData.toPort;

    // check if fromPort is undefined
    if (typeof linkData.fromPort === 'undefined'){
        linkData.fromPort = Port.DEFAULT_ID;
    }

    // check if toPort is undefined
    if (typeof linkData.toPort === 'undefined'){
        linkData.toPort = Port.DEFAULT_ID;
    }

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
        const srcPortName : string = linkData.fromPort + "-" + linkData.toPort;
        srcPort = new Port(Utils.uuidv4(), srcPortName, srcPortName, false, "", "");
        srcNode.addPort(srcPort, false);

        logMessage("Added a new src port " + srcPort.getName() + " to node " + srcNode.getKey() + " in link " + linkData.id + " since port (" + oldFromPortId + ") is missing.");
     }

    // add it if dest port not found
    if (destPort === null){
        const destPortName : string = linkData.fromPort + "-" + linkData.toPort;
        destPort = new Port(Utils.uuidv4(), destPortName, destPortName, false, "", "");
        destNode.addPort(destPort, true);

        logMessage("Added a new dst port " + destPort.getName() + " to node " + destNode.getKey() + " in link " + linkData.id + " since port (" + oldToPortId + ") is missing.");
    }

    if (srcPort === null || destPort === null){
        logError("Unable to translate link " + linkData.id + ". Source or destination port unknown.");
        return null;
    }

    // check if srcPort and destPort have different names
    if (srcPort.getName() !== destPort.getName()){
        logError("Name of source and destination do not match for link " + linkData.id);
        return null;
    }

    return new Edge(srcNode.getKey(), srcPort.getId(), destNode.getKey(), destPort.getId(), srcPort.getType(), false);
}

function logMessage(message : string){
    console.log("- LOG:", message);
}

function logError(error : string){
    console.error("- ERROR:", error);
}
