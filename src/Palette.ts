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

import {Config} from './Config';
import {Utils} from './Utils';
import {Eagle} from './Eagle';
import {Node} from './Node';
import {Port} from './Port';
import {FileInfo} from './FileInfo';

export class Palette {
    fileInfo : ko.Observable<FileInfo>;
    private nodes : Node[];

    constructor(){
        this.fileInfo = ko.observable(new FileInfo());
        this.fileInfo().type = Eagle.FileType.Palette;
        this.nodes = [];
    }

    static fromOJSJson = (data : string) : Palette => {
        // parse the JSON first
        var dataObject : any = JSON.parse(data);

        // TODO: use correct name from dataObject above
        var result : Palette = new Palette();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromOJSJson(dataObject.modelData));

        // add nodes
        for (var i = 0 ; i < dataObject.nodeDataArray.length ; i++){
            var nodeData = dataObject.nodeDataArray[i];
            result.addNode(Node.fromOJSJson(nodeData));
        }

        return result;
    }

    static toOJSJson = (palette: Palette) : object => {
        var result : any = {};

        //result.class = "go.GraphLinksModel";

        result.modelData = FileInfo.toOJSJson(palette.fileInfo());

        // add nodes
        result.nodeDataArray = [];
        for (var i = 0 ; i < palette.getNodes().length ; i++){
            var node : Node = palette.getNodes()[i];
            result.nodeDataArray.push(Node.toOJSJson(node));
        }

        // add links
        result.linkDataArray = [];

        return result;
    }

    getNodes = () : Node[] => {
        return this.nodes;
    }

    getNthNonDataNode = (n : number) : Node => {
        var index : number = -1;

        for (var i = 0 ; i < this.nodes.length ; i++){
            if (this.nodes[i].getCategoryType() === Eagle.CategoryType.Data){
                continue;
            }
            index += 1;

            if (index === n){
                return this.nodes[i];
            }
        }

        return null;
    }

    clear = () : void => {
        this.fileInfo().clear();
        this.fileInfo().type = Eagle.FileType.Palette;
        this.nodes = [];
    }

    clone = () : Palette => {
        var result : Palette = new Palette();

        result.fileInfo(this.fileInfo().clone());

        for (var i = 0 ; i < this.nodes.length ; i++){
            var n_clone = this.nodes[i].clone();
            result.nodes.push(n_clone);
        }

        return result;
    }

    addNode = (node: Node) : void => {
        this.nodes.push(node);
    }

    findNodeByKey = (key : number) : Node => {
        for (var i = this.nodes.length - 1; i >= 0 ; i--){
            if (this.nodes[i].getKey() === key){
                return this.nodes[i];
            }
        }
        return null;
    }

    removeNodeByKey = (key : number) : void => {
        for (var i = this.nodes.length - 1; i >= 0 ; i--){
            if (this.nodes[i].getKey() === key){
                this.nodes.splice(i, 1);
            }
        }
    }

    /**
     * Add event type I/O ports.
     */
    addEventPorts = () : void => {
        for (var i = 0 ; i < this.nodes.length ; i++){
            let n = this.nodes[i];

            // add event ports
            if (n.getCategoryType() === Eagle.CategoryType.Application ||
                n.getCategoryType() === Eagle.CategoryType.Group ||
                n.getCategoryType() === Eagle.CategoryType.Data) {
                n.addPort(new Port(Utils.uuidv4(), Config.eventPortName), true, false); // external input
                n.addPort(new Port(Utils.uuidv4(), Config.eventPortName), false, false); // external output
            }
            else if (n.getCategoryType() === Eagle.CategoryType.Control) {
                if (n.getCategory() === Eagle.Category.Start) {
                    n.addPort(new Port(Utils.uuidv4(), Config.eventPortName), false, false); // external output
                }
                else if (n.getCategory() === Eagle.Category.End) {
                    n.addPort(new Port(Utils.uuidv4(), Config.eventPortName), true, false); // external input
                }
            }
            else if (n.getCategoryType() === Eagle.CategoryType.Other){
                if (n.getCategory() === Eagle.Category.Service){
                    n.addPort(new Port(Utils.uuidv4(), Config.eventPortName), true, false); // external input
                }
            }

            // add local event ports to groups
            if (n.getCategoryType() === Eagle.CategoryType.Group){
                n.addPort(new Port(Utils.uuidv4(), Config.eventPortName), true, true); // local input
                n.addPort(new Port(Utils.uuidv4(), Config.eventPortName), false, true); // local output
            }
        }
    }
}
