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

import {Eagle} from './Eagle';
import {LogicalGraph} from './LogicalGraph';
import {Node} from './Node';

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

    static translateOldCategory(category : string) : string {
        if (typeof category === "undefined"){
            return Eagle.Category.Unknown;
        }

        if (category === "SplitData"){
            return Eagle.Category.Scatter;
        }

        if (category === "DataGather"){
            return Eagle.Category.Gather;
        }

        if (category === "Component"){
            return Eagle.Category.PythonApp;
        }

        if (category === "ngas"){
            return Eagle.Category.NGAS;
        }

        if (category === "s3"){
            return Eagle.Category.S3;
        }

        if (category === "mpi"){
            return Eagle.Category.MPI;
        }

        if (category === "docker"){
            return Eagle.Category.Docker;
        }

        if (category === "memory"){
            return Eagle.Category.Memory;
        }

        if (category === "file"){
            return Eagle.Category.File;
        }

        if (category === "Data"){
            return Eagle.Category.File;
        }

        return category;
    }

    static translateNewCategory(category : string) : string {
        if (category === Eagle.Category.PythonApp){
            console.warn("Translated category from", category, "to Component");
            return "Component";
        }

        return category;
    }

    static translateOldCategoryType(categoryType : string, category : Eagle.Category) : string {
        if (typeof categoryType === "undefined"){
            // try to determine categoryType based on category
            switch(category){
                case Eagle.Category.Start:
                case Eagle.Category.End:
                case Eagle.Category.ExclusiveForceNode:
                case Eagle.Category.Branch:
                    return Eagle.CategoryType.Control;

                case Eagle.Category.BashShellApp:
                case Eagle.Category.DynlibApp:
                case Eagle.Category.MPI:
                case Eagle.Category.Docker:
                case Eagle.Category.PythonApp:
                    return Eagle.CategoryType.Application;

                case Eagle.Category.File:
                case Eagle.Category.Memory:
                case Eagle.Category.NGAS:
                case Eagle.Category.S3:
                    return Eagle.CategoryType.Data;

                case Eagle.Category.GroupBy:
                case Eagle.Category.Gather:
                case Eagle.Category.Scatter:
                case Eagle.Category.MKN:
                case Eagle.Category.Loop:
                    return Eagle.CategoryType.Group;

                case Eagle.Category.Service:
                case Eagle.Category.Comment:
                case Eagle.Category.Description:
                case Eagle.Category.Variables:
                    return Eagle.CategoryType.Other;

                default:
                    return Eagle.CategoryType.Unknown;
            }
        }

        if (categoryType === "ControlComponent"){
            return Eagle.CategoryType.Control;
        }

        if (categoryType === "ApplicationDrop"){
            return Eagle.CategoryType.Application;
        }

        if (categoryType === "GroupComponent"){
            return Eagle.CategoryType.Group;
        }

        if (categoryType === "DataDrop"){
            return Eagle.CategoryType.Data;
        }

        return categoryType;
    }

    // NOTE: for use in translation of OJS object to internal graph representation
    static findIndexOfNodeDataArrayWithKey(nodeDataArray : any[], key: number) : number {
        for (var i = 0 ; i < nodeDataArray.length ; i++){
            if (nodeDataArray[i].key === key){
                return i;
            }
        }

        return -1;
    }

    // extra functionality to check if any x,y coords of nodes are negative, if so, move them all into the +x/+y quadrant
    static correctOJSNegativePositions(graph : LogicalGraph) : boolean {
        // check if any nodes are negative
        var anyNegative : boolean = false;
        for (var i = 0 ; i < graph.getNodes().length ; i++){
            var node : Node = graph.getNodes()[i];
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
        var maxX = 0;
        var maxY = 0;
        for (var i = 0 ; i < graph.getNodes().length ; i++){
            var node : Node = graph.getNodes()[i];
            if (node.getPosition().x < maxX){
                maxX = node.getPosition().x;
            }
            if (node.getPosition().y < maxY){
                maxY = node.getPosition().y;
            }
        }

        // move all nodes by -maxX, -maxY
        for (var i = 0 ; i < graph.getNodes().length ; i++){
            var node : Node = graph.getNodes()[i];
            var newX : number = node.getPosition().x - maxX;
            var newY : number = node.getPosition().y - maxY;
            //console.log("move node", i, "from", node.getPosition().x, ",", node.getPosition().y, "to", newX, ",", newY);

            node.setPosition(newX, newY);
        }

        return true;
    }

    // TODO: this function replicates data that is stored in templatePalette.json, we should only store in one place
    static getCanHaveInputsForCategory(category : Eagle.Category) : boolean {
        switch (category){
            case Eagle.Category.BashShellApp:
            case Eagle.Category.Branch:
            case Eagle.Category.Docker:
            case Eagle.Category.DynlibApp:
            case Eagle.Category.End:
            case Eagle.Category.File:
            case Eagle.Category.Gather:
            case Eagle.Category.GroupBy:
            case Eagle.Category.Loop:
            case Eagle.Category.Memory:
            case Eagle.Category.MKN:
            case Eagle.Category.MPI:
            case Eagle.Category.NGAS:
            case Eagle.Category.PythonApp:
            case Eagle.Category.S3:
            case Eagle.Category.Scatter:
                return true;
            case Eagle.Category.Comment:
            case Eagle.Category.Description:
            case Eagle.Category.ExclusiveForceNode:
            case Eagle.Category.Start:
            case Eagle.Category.Variables:
                return false;
            default:
                console.warn("Unknown canHaveInputs for node with category", category);
                return false;
        }
    }

    // TODO: this function replicates data that is stored in templatePalette.json, we should only store in one place
    static getCanHaveOutputsForCategory(category : Eagle.Category) : boolean {
        switch (category){
            case Eagle.Category.BashShellApp:
            case Eagle.Category.Branch:
            case Eagle.Category.Docker:
            case Eagle.Category.DynlibApp:
            case Eagle.Category.File:
            case Eagle.Category.Gather:
            case Eagle.Category.GroupBy:
            case Eagle.Category.Loop:
            case Eagle.Category.Memory:
            case Eagle.Category.MKN:
            case Eagle.Category.MPI:
            case Eagle.Category.NGAS:
            case Eagle.Category.PythonApp:
            case Eagle.Category.S3:
            case Eagle.Category.Scatter:
            case Eagle.Category.Start:
                return true;
            case Eagle.Category.Comment:
            case Eagle.Category.Description:
            case Eagle.Category.End:
            case Eagle.Category.ExclusiveForceNode:
            case Eagle.Category.Variables:
                return false;
            default:
                console.warn("Unknown canHaveOutputs for node with category", category);
                return false;
        }
    }

    // TODO: this function replicates data that is stored in templatePalette.json, we should only store in one place
    static getIsDataForCategory(category : Eagle.Category) : boolean {
        switch (category){
            case Eagle.Category.File:
            case Eagle.Category.Memory:
            case Eagle.Category.NGAS:
            case Eagle.Category.S3:
                return true;
            case Eagle.Category.BashShellApp:
            case Eagle.Category.Branch:
            case Eagle.Category.Description:
            case Eagle.Category.Docker:
            case Eagle.Category.DynlibApp:
            case Eagle.Category.End:
            case Eagle.Category.ExclusiveForceNode:
            case Eagle.Category.Gather:
            case Eagle.Category.GroupBy:
            case Eagle.Category.Loop:
            case Eagle.Category.MKN:
            case Eagle.Category.MPI:
            case Eagle.Category.PythonApp:
            case Eagle.Category.Scatter:
            case Eagle.Category.Comment:
            case Eagle.Category.Start:
            case Eagle.Category.Variables:
                return false;
            default:
                console.warn("Unknown isData for node with category", category);
                return false;
        }
    }

    // TODO: this function replicates data that is stored in templatePalette.json, we should only store in one place
    static getIsGroupForCategory(category : Eagle.Category) : boolean {
        switch (category){
            case Eagle.Category.ExclusiveForceNode:
            case Eagle.Category.Gather:
            case Eagle.Category.GroupBy:
            case Eagle.Category.Loop:
            case Eagle.Category.MKN:
            case Eagle.Category.Scatter:
                return true;

            case Eagle.Category.File:
            case Eagle.Category.Memory:
            case Eagle.Category.NGAS:
            case Eagle.Category.S3:
            case Eagle.Category.BashShellApp:
            case Eagle.Category.Branch:
            case Eagle.Category.Docker:
            case Eagle.Category.DynlibApp:
            case Eagle.Category.End:
            case Eagle.Category.MPI:
            case Eagle.Category.Comment:
            case Eagle.Category.Description:
            case Eagle.Category.PythonApp:
            case Eagle.Category.Start:
            case Eagle.Category.Variables:
                return false;
            default:
                console.warn("Unknown isGroup for node with category", category);
                return false;
        }
    }
}
