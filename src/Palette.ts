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

import { ActionMessage } from "./Action";
import { Category } from './Category';
import { CategoryData } from './CategoryData';
import { Eagle } from './Eagle';
import { FileInfo } from './FileInfo';
import { Node } from './Node';
import { RepositoryFile } from './RepositoryFile';
import { Utils } from './Utils';


export class Palette {
    fileInfo : ko.Observable<FileInfo>;
    private nodes : ko.ObservableArray<Node>;
    private searchExclude : ko.Observable<boolean>;

    public static readonly DYNAMIC_PALETTE_NAME: string = "Component Templates";
    public static readonly BUILTIN_PALETTE_NAME: string = "Built-in Palette";

    constructor(){
        this.fileInfo = ko.observable(new FileInfo());
        this.fileInfo().type = Eagle.FileType.Palette;
        this.nodes = ko.observableArray([]);
        this.searchExclude = ko.observable(false);
    }

    static fromOJSJson = (dataObject: any, file : RepositoryFile, errors: ActionMessage[]) : Palette => {
        console.log("Palette.fromOJSJson()", file.name);

        const result : Palette = new Palette();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromOJSJson(dataObject.modelData, errors));

        // add nodes
        for (let i = 0 ; i < dataObject.nodeDataArray.length ; i++){
            const nodeData = dataObject.nodeDataArray[i];

            // read node
            const newNode : Node = Node.fromOJSJson(nodeData, errors, true, (): number => {
                return Utils.newKey(result.nodes());
            });

            // check that node has no group
            if (newNode.getParentKey() !== null){
                const error : string = file.name + " Node " + i + " has parentKey: " + newNode.getParentKey() + ". Setting parentKey to null.";
                errors.push(ActionMessage.Message(ActionMessage.Level.Warning, error));

                newNode.setParentKey(null);
            }

            // check that x, y, position is the default
            if (newNode.getPosition().x !== 0 || newNode.getPosition().y !== 0){
                const error : string = file.name + " Node " + i + " has non-default position: (" + newNode.getPosition().x + "," + newNode.getPosition().y + "). Setting to default.";
                errors.push(ActionMessage.Message(ActionMessage.Level.Warning, error));

                newNode.setPosition(0, 0);
            }

            // add node to palette
            result.nodes.push(newNode);
        }

        // check for missing name
        if (result.fileInfo().name === ""){
            const message : string = file.name + " FileInfo.name is empty. Setting name to " + file.name;
            errors.push(ActionMessage.Message(ActionMessage.Level.Warning, message));

            result.fileInfo().name = file.name;
        }

        // check palette, and then add any resulting errors/warnings to the end of the errors/warnings list
        const checkResult = Utils.checkPalette(result);
        errors.push(...checkResult);

        return result;
    }

    static toOJSJson = (palette: Palette) : object => {
        const result : any = {};

        result.modelData = FileInfo.toOJSJson(palette.fileInfo());
        result.modelData.numLGNodes = palette.getNodes().length;

        // add nodes
        result.nodeDataArray = [];
        for (const node of palette.nodes()){
            result.nodeDataArray.push(Node.toOJSPaletteJson(node));
        }

        // add links (none in a palette)
        result.linkDataArray = [];

        return result;
    }

    static toOJSJsonString = (palette: Palette) : string => {
        let result: string = "";

        const json: any = this.toOJSJson(palette);

        // manually build the JSON so that we can enforce ordering of attributes (modelData first)
        result += "{\n";
        result += '"modelData": ' + JSON.stringify(json.modelData, null, 4) + ",\n";
        result += '"nodeDataArray": ' + JSON.stringify(json.nodeDataArray, null, 4) + ",\n";
        result += '"linkDataArray": ' + JSON.stringify(json.linkDataArray, null, 4) + "\n";
        result += "}\n";

        return result;
    }

    getNodes = () : Node[] => {
        return this.nodes();
    }

    getSearchExclude = () : boolean => {
        console.log(this.searchExclude())
        return this.searchExclude();
    }

    setSearchExclude = (value : boolean) : void => {
        this.searchExclude(value);
    }

    getCollapseIcon = () : string => {
         return "keyboard_arrow_down"
    }

    clear = () : void => {
        this.fileInfo().clear();
        this.fileInfo().type = Eagle.FileType.Palette;
        this.nodes([]);
    }

    clone = () : Palette => {
        const result : Palette = new Palette();

        result.fileInfo(this.fileInfo().clone());

        for (const node of this.nodes()){
            result.nodes.push(node.clone());
        }

        return result;
    }

    // add the node to the end of the palette
    // NOTE: clones the node internally
    addNode = (node: Node, force: boolean) : void => {
        // copy node
        const newNode : Node = node.clone();

        // set appropriate key for node (one that is not already in use)
        newNode.setId(Utils.uuidv4());
        newNode.setKey(Utils.newKey(this.getNodes()));

        if (force){
            this.nodes.push(newNode);
            return;
        }

        // try to find a matching node that already exists in the palette
        // TODO: at the moment, we only match by name and category, but we should match by ID (once the ID is unique)
        for (let i = 0 ; i < this.getNodes().length; i++){
            const paletteNode = this.getNodes()[i];

            if (paletteNode.getName() === newNode.getName() && paletteNode.getCategory() === newNode.getCategory()){
                this.replaceNode(i, newNode);
                return;
            }
        }

        // if we didn't find a matching node to replace, add it as a new node
        this.nodes.push(newNode);
    }


    findNodeByKey = (key : number) : Node => {
        for (let i = this.nodes().length - 1; i >= 0 ; i--){
            if (this.nodes()[i].getKey() === key){
                return this.nodes()[i];
            }
        }
        return null;
    }

    removeNodeByKey = (key : number) : void => {
        for (let i = this.nodes().length - 1; i >= 0 ; i--){
            if (this.nodes()[i].getKey() === key){
                this.nodes.splice(i, 1);
            }
        }
    }

    findNodeById = (id : string) : Node => {
        for (let i = this.nodes().length - 1; i >= 0 ; i--){
            if (this.nodes()[i].getId() === id){
                return this.nodes()[i];
            }
        }
        return null;
    }

    removeNodeById = (id : string) : void => {
        for (let i = this.nodes().length - 1; i >= 0 ; i--){
            if (this.nodes()[i].getId() === id){
                this.nodes.splice(i, 1);
            }
        }
    }

    replaceNode = (index : number, newNode : Node) : void => {
        this.nodes.splice(index, 1, newNode);
    }

    sort = () : void => {

        const sortFunc = function(a:Node, b:Node) : number {
            const aCData : Category.CategoryData = CategoryData.getCategoryData(a.getCategory());
            const bCData : Category.CategoryData = CategoryData.getCategoryData(b.getCategory());

            if (aCData.sortOrder < bCData.sortOrder) {
                return -1;
            }
            if (aCData.sortOrder > bCData.sortOrder) {
                return 1;
            }

            // a must be equal to b
            return a.getName() > b.getName() ? 1 : -1;
        }

        this.nodes.sort(sortFunc);
    }

    copyUrl = (): void => {
        // get reference to the LG fileInfo object
        const fileInfo: FileInfo = this.fileInfo();

        // if we don't know where this file came from then we can't build a URL
        // for example, if the palette was loaded from local disk, then we can't build a URL for others to reach it
        if (fileInfo.repositoryService === Eagle.RepositoryService.Unknown || fileInfo.repositoryService === Eagle.RepositoryService.File){
            Utils.showNotification("Palette URL", "Source of palette is a local file or unknown, unable to create URL for graph.", "danger");
            return;
        }

        // build palette url
        let palette_url = window.location.origin;

        palette_url += "/?service=" + fileInfo.repositoryService;
        palette_url += "&repository=" + fileInfo.repositoryName;
        palette_url += "&branch=" + fileInfo.repositoryBranch;
        palette_url += "&path=" + encodeURI(fileInfo.path);
        palette_url += "&filename=" + encodeURI(fileInfo.name);

        // copy to cliboard
        navigator.clipboard.writeText(palette_url);

        // notification
        Utils.showNotification("Palette URL", "Copied to clipboard", "success");
    }
}
