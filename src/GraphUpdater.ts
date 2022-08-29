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

import { Category } from './Category';
import {Eagle} from './Eagle';
import {LogicalGraph} from './LogicalGraph';

export class GraphUpdater {

    static OLD_ATTRIBUTES : {text:string, name:string, description:string}[] = [
        {
            text:"Data Volume",
            name:"data_volume",
            description:""
        },
        {
            text:"Number of Splits",
            name:"num_of_splits",
            description:""
        },
        {
            text:"Scatter Axis",
            name:"scatter_axis",
            description:""
        },
        {
            text:"Execution Time",
            name:"execution_time",
            description:""
        },
        {
            text:"Number of Inputs",
            name:"num_of_inputs",
            description:""
        },
        {
            text:"Gather Axis",
            name:"gather_axis",
            description:""
        },
        {
            text:"Group Start",
            name:"group_start",
            description:""
        },
        {
            text:"Group End",
            name:"group_end",
            description:""
        },
        {
            text:"Number of Iterations",
            name:"num_of_iter",
            description:""
        },
        {
            text:"Number of CPUs",
            name:"num_cpus",
            description:""
        },
        {
            text:"Library Path",
            name:"libpath",
            description:""
        },
        {
            text:"Number of Procs",
            name:"num_of_procs",
            description:""
        },
        {
            text:"Number of copies",
            name:"num_of_copies",
            description:""
        },
        {
            text:"Arg 01",
            name:"Arg01",
            description:""
        },
        {
            text:"Arg 02",
            name:"Arg02",
            description:""
        },
        {
            text:"Arg 03",
            name:"Arg03",
            description:""
        },
        {
            text:"Arg 04",
            name:"Arg04",
            description:""
        },
        {
            text:"Arg 05",
            name:"Arg05",
            description:""
        },
        {
            text:"Arg 06",
            name:"Arg06",
            description:""
        },
        {
            text:"Arg 07",
            name:"Arg07",
            description:""
        },
        {
            text:"Arg 08",
            name:"Arg08",
            description:""
        },
        {
            text:"Arg 09",
            name:"Arg09",
            description:""
        },
        {
            text:"Arg 10",
            name:"Arg10",
            description:""
        }
    ];

    static translateOldCategory(category : string) : Category {
        if (typeof category === "undefined"){
            return Category.Unknown;
        }

        if (category === "SplitData"){
            return Category.Scatter;
        }

        if (category === "DataGather"){
            return Category.Gather;
        }

        if (category === "Component"){
            return Category.PythonApp;
        }

        if (category === "ngas"){
            return Category.NGAS;
        }

        if (category === "s3"){
            return Category.S3;
        }

        if (category === "mpi"){
            return Category.MPI;
        }

        if (category === "docker"){
            return Category.Docker;
        }

        if (category === "memory"){
            return Category.Memory;
        }

        if (category === "file"){
            return Category.File;
        }

        if (category === "Data"){
            return Category.File;
        }

        return <Category>category;
    }

    static translateNewCategory(category : string) : string {
        if (category === Category.PythonApp){
            console.warn("Translated category from", category, "to Component");
            return "Component";
        }

        return category;
    }

    // NOTE: for use in translation of OJS object to internal graph representation
    static findIndexOfNodeDataArrayWithKey(nodeDataArray : any[], key: number) : number {
        for (let i = 0 ; i < nodeDataArray.length ; i++){
            if (nodeDataArray[i].key === key){
                return i;
            }
        }

        return -1;
    }

    // extra functionality to check if any x,y coords of nodes are negative, if so, move them all into the +x/+y quadrant
    static correctOJSNegativePositions(graph : LogicalGraph) : boolean {
        // check if any nodes are negative
        let anyNegative : boolean = false;
        for (const node of graph.getNodes()){
            if (node.getPosition().x < 0 || node.getPosition().y < 0){
                anyNegative = true;
                break;
            }
        }

        // abort if not all negative
        if (!anyNegative){
            return false;
        }

        // find the most negative position
        let maxX = 0;
        let maxY = 0;
        for (const node of graph.getNodes()){
            if (node.getPosition().x < maxX){
                maxX = node.getPosition().x;
            }
            if (node.getPosition().y < maxY){
                maxY = node.getPosition().y;
            }
        }

        // move all nodes by -maxX, -maxY
        for (const node of graph.getNodes()){
            const newX : number = node.getPosition().x - maxX;
            const newY : number = node.getPosition().y - maxY;
            node.setPosition(newX, newY);
        }

        return true;
    }
}
