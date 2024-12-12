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

import { Category } from './Category';
import { CategoryData } from './CategoryData';
import { Eagle } from './Eagle';
import { EagleConfig } from "./EagleConfig";
import { Errors } from './Errors';
import { FileInfo } from './FileInfo';
import { Node } from './Node';
import { Repository } from "./Repository";
import { RepositoryFile } from './RepositoryFile';
import { Utils } from './Utils';

export class Palette {
    fileInfo : ko.Observable<FileInfo>;
    private nodes : ko.ObservableArray<Node>;
    private searchExclude : ko.Observable<boolean>;
    expanded: ko.Observable<boolean>;

    public static readonly TEMPLATE_PALETTE_NAME: string = "Component Templates";
    public static readonly BUILTIN_PALETTE_NAME: string = "Builtin Components";

    constructor(){
        this.fileInfo = ko.observable(new FileInfo());
        this.fileInfo().type = Eagle.FileType.Palette;
        this.fileInfo().readonly = false;
        this.fileInfo().builtIn = false;
        this.nodes = ko.observableArray([]);
        this.searchExclude = ko.observable(false);
        this.expanded = ko.observable(false);
    }

    static fromOJSJson(data : string, file : RepositoryFile, errorsWarnings : Errors.ErrorsWarnings) : Palette {
        // parse the JSON first
        const dataObject : any = JSON.parse(data);
        const result : Palette = new Palette();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromOJSJson(dataObject.modelData, errorsWarnings));

        // add nodes
        for (let i = 0 ; i < dataObject.nodeDataArray.length ; i++){
            const nodeData = dataObject.nodeDataArray[i];

            // read node
            const newNode : Node = Node.fromOJSJson(nodeData, errorsWarnings, true);

            // check that node has no group
            if (newNode.getParentId() !== null){
                const error : string = file.name + " Node " + i + " has parentKey: " + newNode.getParentId() + ". Setting parentKey to null.";
                errorsWarnings.warnings.push(Errors.Message(error));

                newNode.setParentId(null);
            }

            // check that x, y, position is the default
            if (newNode.getPosition().x !== 0 || newNode.getPosition().y !== 0){
                const error : string = file.name + " Node " + i + " has non-default position: (" + newNode.getPosition().x + "," + newNode.getPosition().y + "). Setting to default.";
                errorsWarnings.warnings.push(Errors.Message(error));

                newNode.setPosition(0, 0);
            }

            // add node to palette
            result.nodes.push(newNode);
        }

        // check for missing name
        if (result.fileInfo().name === ""){
            const error : string = file.name + " FileInfo.name is empty. Setting name to " + file.name;
            errorsWarnings.warnings.push(Errors.Message(error));

            result.fileInfo().name = file.name;
        }

        // check palette, and then add any resulting errors/warnings to the end of the errors/warnings list
        const checkResult = Utils.checkPalette(result);
        errorsWarnings.errors.push(...checkResult.errors);
        errorsWarnings.warnings.push(...checkResult.warnings);

        return result;
    }

    static toOJSJson(palette: Palette) : object {
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

    static toOJSJsonString(palette: Palette) : string {
        let result: string = "";

        const json: any = Palette.toOJSJson(palette);

        // manually build the JSON so that we can enforce ordering of attributes (modelData first)
        result += "{\n";
        result += '"modelData": ' + JSON.stringify(json.modelData, null, EagleConfig.JSON_INDENT) + ",\n";
        result += '"nodeDataArray": ' + JSON.stringify(json.nodeDataArray, null, EagleConfig.JSON_INDENT) + ",\n";
        result += '"linkDataArray": ' + JSON.stringify(json.linkDataArray, null, EagleConfig.JSON_INDENT) + "\n";
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
        newNode.setId(Utils.generateNodeId());

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

    findNodeByNameAndCategory = (nameAndCategory: Category) : Node => {
        for (let i = this.nodes().length - 1; i >= 0 ; i--){
            if (this.nodes()[i].getName() === nameAndCategory && this.nodes()[i].getCategory() === nameAndCategory){
                return this.nodes()[i];
            }
        }
        return null;
    }

    getNodesByCategoryType = (categoryType: Category.Type) : Node[] => {
        const result : Node[] = []

        for (let i = this.nodes().length - 1; i >= 0 ; i--){
            if (this.nodes()[i].getCategoryType() === categoryType){
                result.push(this.nodes()[i])
            }
        }

        return result;
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
        if (fileInfo.repositoryService === Repository.Service.Unknown || fileInfo.repositoryService === Repository.Service.File){
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

        // copy to clipboard
        navigator.clipboard.writeText(palette_url);

        // notification
        Utils.showNotification("Palette URL", "Copied to clipboard", "success");
    }
}
