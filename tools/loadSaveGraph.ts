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









// write the logical graph to disk using the outputFilename
fs.writeFileSync(outputFilename, JSON.stringify(LogicalGraph.toOJSJson(outputGraph), null, 4));

// finish
process.exit();

function logMessage(message : string){
    console.log("- LOG:", message);
}

function logError(error : string){
    console.error("- ERROR:", error);
}
