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

        return category;
    }

    static translateOldCategoryType(categoryType : string) : string {
        if (typeof categoryType === "undefined"){
            return Eagle.CategoryType.Unknown;
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

    // extracts a file name from the full path.
    static getFileNameFromFullPath(fullPath : string) : string {
        if (typeof fullPath === 'undefined'){return "";}
        var fileName = fullPath.replace(/^.*[\\\/]/, '');
        return fileName;
    }

    // extracts a file path (not including the file name) from the full path.
    static getFilePathFromFullPath(fullPath : string) : string {
        if (typeof fullPath === 'undefined'){return "";}
        return fullPath.substring(0, fullPath.lastIndexOf('/'));
    }

    // extra functionality to check if all x,y coords of nodes are negative, if so, move them all into the +x/+y quadrant
    static correctOJSNegativePositions(graph : LogicalGraph) : boolean {
        // check if all nodes are negative
        var allNegative : boolean = true;
        for (var i = 0 ; i < graph.getNodes().length ; i++){
            var node : Node = graph.getNodes()[i];
            if (node.getPosition().x > 0 || node.getPosition().y > 0){
                allNegative = false;
                break;
            }
        }

        // abort if not all negative
        if (!allNegative){
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
            node.setPosition(node.getPosition().x - maxX, node.getPosition().y - maxY);
        }

        return true;
    }
}
