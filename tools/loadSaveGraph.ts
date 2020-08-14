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
if (process.argv.length < 3){
    console.log("incorrect usage, please add input file to the command line");
    process.exit();
}

// get input filename from the command line arguments
var inputFilename : string = process.argv[2];
//console.log("inputFilename", inputFilename);

// load input file from disk
var data : Buffer = fs.readFileSync(inputFilename);
var inputString : string = data.toString();

// parse graph
var inputGraph : LogicalGraph = LogicalGraph.fromOJSJson(inputString);

// write the logical graph to disk using the outputFilename
var outputString : string = JSON.stringify(LogicalGraph.toOJSJson(inputGraph), null, 4);

// check that the input and output are the same
var match : boolean = inputString === outputString;

if (!match)
    console.error("Input and output do not match:", inputFilename);

// finish
process.exit(match ? 0 : 1);
