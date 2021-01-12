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

import {Utils} from './Utils';
import {Eagle} from './Eagle';
import {Node} from './Node';
import {Port} from './Port';
import {FileInfo} from './FileInfo';
import {RepositoryFile} from './RepositoryFile';

export class Palette {
    fileInfo : ko.Observable<FileInfo>;
    private nodes : ko.ObservableArray<Node>;

    public static readonly DYNAMIC_PALETTE_NAME: string = "All Nodes";
    public static readonly BUILTIN_PALETTE_NAME: string = "Built-in Palette";

    constructor(){
        this.fileInfo = ko.observable(new FileInfo());
        this.fileInfo().type = Eagle.FileType.Palette;
        this.nodes = ko.observableArray([]);
    }

    static fromOJSJson = (data : string, file : RepositoryFile, showErrors : boolean) : Palette => {
        // parse the JSON first
        var dataObject : any = JSON.parse(data);
        var errors : string[] = [];

        // TODO: use correct name from dataObject above
        var result : Palette = new Palette();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromOJSJson(dataObject.modelData));

        // add nodes
        for (var i = 0 ; i < dataObject.nodeDataArray.length ; i++){
            var nodeData = dataObject.nodeDataArray[i];

            // read node
            var newNode : Node = Node.fromOJSJson(nodeData);

            // check that node has no group
            if (newNode.getParentKey() !== null){
                var error : string = "Node " + i + " has parentKey: " + newNode.getParentKey() + ". Setting parentKey to null.";
                console.warn(error);
                errors.push(error);

                newNode.setParentKey(null);
            }

            // check that x, y, position is the default
            if (newNode.getPosition().x !== 0 || newNode.getPosition().y !== 0){
                var error : string = "Node " + i + " has non-default position: (" + newNode.getPosition().x + "," + newNode.getPosition().y + "). Setting to default.";
                console.warn(error);
                errors.push(error);

                newNode.setPosition(0, 0);
            }

            // add node to palette
            result.nodes.push(newNode);
        }

        // check for missing name
        if (result.fileInfo().name === ""){
            var error : string = "FileInfo.name is empty. Setting name to " + file.name;
            console.warn(error);
            errors.push(error);

            result.fileInfo().name = file.name;
        }

        // check for duplicate keys

        // show errors (if found)
        if (errors.length > 0 && showErrors){
            Utils.showUserMessage("Errors during loading", errors.join('<br/>'));
        }

        return result;
    }

    static toOJSJson = (palette: Palette) : object => {
        var result : any = {};

        //result.class = "go.GraphLinksModel";

        result.modelData = FileInfo.toOJSJson(palette.fileInfo());

        // add nodes
        result.nodeDataArray = [];
        for (var i = 0 ; i < palette.nodes().length ; i++){
            var node : Node = palette.nodes()[i];
            result.nodeDataArray.push(Node.toOJSJson(node));
        }

        // add links
        result.linkDataArray = [];

        return result;
    }

    getNodes = () : Node[] => {
        return this.nodes();
    }

    // TODO: this should return different icons based on whether the palette is currently expanded or collapsed
    //       but at the moment, that expand/collapse state is stored internally within bootstrap and is not available here
    getCollapseIcon = () : string => {
        return "keyboard_arrow_down";
    }

    clear = () : void => {
        this.fileInfo().clear();
        this.fileInfo().type = Eagle.FileType.Palette;
        this.nodes([]);
    }

    clone = () : Palette => {
        var result : Palette = new Palette();

        result.fileInfo(this.fileInfo().clone());

        for (var i = 0 ; i < this.nodes().length ; i++){
            var n_clone = this.nodes()[i].clone();
            result.nodes.push(n_clone);
        }

        return result;
    }

    addNode = (node: Node) : void => {
        this.nodes.push(node);
    }

    findNodeByKey = (key : number) : Node => {
        for (var i = this.nodes().length - 1; i >= 0 ; i--){
            if (this.nodes()[i].getKey() === key){
                return this.nodes()[i];
            }
        }
        return null;
    }

    removeNodeByKey = (key : number) : void => {
        for (var i = this.nodes().length - 1; i >= 0 ; i--){
            if (this.nodes()[i].getKey() === key){
                this.nodes.splice(i, 1);
            }
        }
    }
}
