import * as fs from "fs";

import {LogicalGraph} from '../src/LogicalGraph';

// check command line arguments
if (process.argv.length < 3){
    console.log("incorrect usage, please add input file to the command line");
    process.exit();
}

// get input filename from the command line arguments
const inputFilename : string = process.argv[2];
//console.log("inputFilename", inputFilename);

// load input file from disk
const data : Buffer = fs.readFileSync(inputFilename);
const inputString : string = data.toString();

// parse graph
const inputGraph : LogicalGraph = LogicalGraph.fromOJSJson(inputString);

// write the logical graph to disk using the outputFilename
const outputString : string = JSON.stringify(LogicalGraph.toOJSJson(inputGraph), null, 4);

// check that the input and output are the same
const match : boolean = inputString === outputString;

if (!match)
    console.error("Input and output do not match:", inputFilename);

// finish
process.exit(match ? 0 : 1);
