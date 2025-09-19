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
import { Eagle } from './Eagle';
import { EagleConfig } from "./EagleConfig";
import { Errors } from './Errors';
import { FileInfo } from './FileInfo';
import { FileLocation } from "./FileLocation";
import { Node } from './Node';
import { Repository } from "./Repository";
import { RepositoryFile } from './RepositoryFile';
import { Setting } from "./Setting";
import { Utils } from './Utils';
import { UiModeSystem } from "./UiModes";

export class Palette {
    fileInfo : ko.Observable<FileInfo>;
    private nodes : ko.Observable<Map<NodeId, Node>>;
    private searchExclude : ko.Observable<boolean>;
    expanded: ko.Observable<boolean>;

    public static readonly TEMPLATE_PALETTE_NAME: string = "Component Templates";
    public static readonly BUILTIN_PALETTE_NAME: string = "Builtin Components";

    constructor(){
        this.fileInfo = ko.observable(new FileInfo());
        this.fileInfo().type = Eagle.FileType.Palette;
        this.fileInfo().readonly = false;
        this.fileInfo().builtIn = false;
        this.nodes = ko.observable(new Map<NodeId, Node>());
        this.searchExclude = ko.observable(false);
        this.expanded = ko.observable(false);
    }

    static fromOJSJson(data: string, file: RepositoryFile, errorsWarnings: Errors.ErrorsWarnings) : Palette {
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
            if (newNode.getParent() !== null){
                const error : string = file.name + " Node " + i + " has parent: " + newNode.getParent().getName() + ". Setting parentKey to null.";
                errorsWarnings.warnings.push(Errors.Message(error));

                newNode.setParent(null);
            }

            // check that x, y, position is the default
            if (newNode.getPosition().x !== 0 || newNode.getPosition().y !== 0){
                const error : string = file.name + " Node " + i + " has non-default position: (" + newNode.getPosition().x + "," + newNode.getPosition().y + "). Setting to default.";
                errorsWarnings.warnings.push(Errors.Message(error));

                newNode.setPosition(0, 0);
            }

            // add node to palette
            result.nodes().set(newNode.getId(), newNode);
            result.nodes.valueHasMutated();
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

    static fromV4Json(data: string, file: RepositoryFile, errorsWarnings: Errors.ErrorsWarnings): Palette {
        // parse the JSON first
        const dataObject : any = JSON.parse(data);
        const result : Palette = new Palette();

        // copy modelData into fileInfo
        result.fileInfo(FileInfo.fromV4Json(dataObject.modelData, errorsWarnings));

        // add nodes
        for (let i = 0 ; i < dataObject.nodeDataArray.length ; i++){
            const nodeData = dataObject.nodeDataArray[i];

            // read node
            const newNode : Node = Node.fromV4Json(nodeData, errorsWarnings, true);

            // check that node has no group
            if (newNode.getParent() !== null){
                const error : string = file.name + " Node " + i + " has parent: " + newNode.getParent().getName() + ". Setting parentKey to null.";
                errorsWarnings.warnings.push(Errors.Message(error));

                newNode.setParent(null);
            }

            // check that x, y, position is the default
            if (newNode.getPosition().x !== 0 || newNode.getPosition().y !== 0){
                const error : string = file.name + " Node " + i + " has non-default position: (" + newNode.getPosition().x + "," + newNode.getPosition().y + "). Setting to default.";
                errorsWarnings.warnings.push(Errors.Message(error));

                newNode.setPosition(0, 0);
            }

            // add node to palette
            result.nodes().set(newNode.getId(), newNode);
            result.nodes.valueHasMutated();
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
        result.modelData.numLGNodes = palette.nodes().size;

        // add nodes
        result.nodeDataArray = [];
        for (const node of palette.nodes().values()){
            result.nodeDataArray.push(Node.toOJSPaletteJson(node));
        }

        // add links (none in a palette)
        result.linkDataArray = [];

        return result;
    }

    static toV4Json(palette: Palette) : object {
        const result : any = {};

        result.modelData = FileInfo.toV4Json(palette.fileInfo());
        result.modelData.schemaVersion = Setting.SchemaVersion.V4;

        // add nodes
        result.nodes = {};
        for (const [id, node] of palette.nodes()){
            const nodeData : any = Node.toV4GraphJson(node);
            result.nodes[id] = nodeData;

            // add input and output applications to the top-level nodes dict
            if (node.hasInputApplication()){
                const inputApp = node.getInputApplication();
                result.nodes[inputApp.getId()] = Node.toV4GraphJson(inputApp);
            }

            if (node.hasOutputApplication()){
                const outputApp = node.getOutputApplication();
                result.nodes[outputApp.getId()] = Node.toV4GraphJson(outputApp);
            }
        }

        return result;
    }

    static toJsonString(palette: Palette, version: Setting.SchemaVersion) : string {
        let result: string = "";

        let json: any;
        switch(version){
            case Setting.SchemaVersion.OJS:
                json = Palette.toOJSJson(palette);
                break;
            case Setting.SchemaVersion.V4:
                json = Palette.toV4Json(palette);
                break;
            default:
                console.error("Unsupported graph format! (" + version + ")");
                return "";
        }

        // manually build the JSON so that we can enforce ordering of attributes (modelData first)
        result += "{\n";
        result += '"modelData": ' + JSON.stringify(json.modelData, null, EagleConfig.JSON_INDENT) + ",\n";
        result += '"nodeDataArray": ' + JSON.stringify(json.nodeDataArray, null, EagleConfig.JSON_INDENT) + ",\n";
        result += '"linkDataArray": ' + JSON.stringify(json.linkDataArray, null, EagleConfig.JSON_INDENT) + "\n";
        result += "}\n";

        return result;
    }

    getNodes = () : MapIterator<Node> => {
        return this.nodes().values();
    }

    getNumNodes = () : number => {
        return this.nodes().size;
    }

    hasNode = (id: NodeId): boolean => {
        return this.nodes().has(id);
    }

    getNodeById = (id: NodeId): Node | undefined => {
        return this.nodes().get(id);
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
        this.nodes().clear();
        this.nodes.valueHasMutated();
    }

    clone = () : Palette => {
        const result : Palette = new Palette();

        result.fileInfo(this.fileInfo().clone());

        for (const [id, node] of this.nodes()){
            result.nodes().set(id, node.clone());
        }
        result.nodes.valueHasMutated();

        return result;
    }

    // add the node to the end of the palette
    // NOTE: clones the node internally
    addNode = (node: Node, force: boolean) : void => {
        // copy node
        const newNode : Node = node
            .clone()
            .setId(Utils.generateNodeId());

        if (force){
            this.nodes().set(newNode.getId(), newNode);
            this.nodes.valueHasMutated();
            return;
        }

        // try to find a matching node that already exists in the palette
        // TODO: at the moment, we only match by name and category, but we should match by ID (once the ID is unique)
        for (const paletteNode of this.nodes().values()){
            if (paletteNode.getName() === newNode.getName() && paletteNode.getCategory() === newNode.getCategory()){
                this.nodes().delete(paletteNode.getId());
                this.nodes().set(newNode.getId(), newNode);
                this.nodes.valueHasMutated();
                return;
            }
        }

        // if we didn't find a matching node to replace, add it as a new node
        this.nodes().set(newNode.getId(), newNode);
        this.nodes.valueHasMutated();
    }

    findNodeById = (id: NodeId) : Node => {
        return this.nodes().get(id);
    }

    removeNodeById = (id: NodeId) : void => {
        this.nodes().delete(id);
        this.nodes.valueHasMutated();
    }

    findNodeByNameAndCategory = (nameAndCategory: Category) : Node => {
        for (const node of this.nodes().values()){
            if (node.getName() === nameAndCategory && node.getCategory() === nameAndCategory){
                return node;
            }
        }
        return null;
    }

    getNodesByCategoryType = (categoryType: Category.Type) : Node[] => {
        const result : Node[] = []

        for (const node of this.nodes().values()){
            if (node.getCategoryType() === categoryType){
                result.push(node);
            }
        }

        return result;
    }

    removeNode = (node: Node) : void => {
        const id = node.getId();

        // search through nodes in palette, looking for one with the correct key
        for (const node of this.nodes().values()){
            if (typeof node === 'undefined'){
                continue;
            }

            if (node.getId() === id){
                this.nodes().delete(id);
                this.nodes.valueHasMutated();
                break;
            }

            // delete the input application
            if (node.hasInputApplication() && node.getInputApplication().getId() === id){
                this.nodes().delete(node.getInputApplication().getId());
                this.nodes.valueHasMutated();
                node.setInputApplication(null);
                break;
            }

            // delete the output application
            if (node.hasOutputApplication() && node.getOutputApplication().getId() === id){
                this.nodes().delete(node.getOutputApplication().getId());
                this.nodes.valueHasMutated();
                node.setOutputApplication(null);
                break;
            }
        }

        // remove inputApplication and outputApplication from the nodes map
        if (node.hasInputApplication()){
            this.nodes().delete(node.getInputApplication().getId());
            this.nodes.valueHasMutated();
        }
        if (node.hasOutputApplication()){
            this.nodes().delete(node.getOutputApplication().getId());
            this.nodes.valueHasMutated();
        }
    }

    copyUrl = (): void => {
        // get reference to the LG fileInfo object
        const fileInfo: FileInfo = this.fileInfo();

        // if we don't know where this file came from then we can't build a URL
        // for example, if the palette was loaded from local disk, then we can't build a URL for others to reach it
        if (fileInfo.location.repositoryService() === Repository.Service.Unknown || fileInfo.location.repositoryService() === Repository.Service.File){
            Utils.showNotification("Palette URL", "Source of palette is a local file or unknown, unable to create URL for palette.", "danger");
            return;
        }

        // generate URL
        const palette_url = FileLocation.generateUrl(fileInfo.location);

        // copy to clipboard
        navigator.clipboard.writeText(palette_url);

        // notification
        Utils.showNotification("Palette URL", "Copied to clipboard", "success");
    }

    toggle = (palette: Palette, event: Event): void => {
        // get collapse/expand state of the accordion
        const expanded: boolean = (<any>event.currentTarget).ariaExpanded === 'true';

        // set internal variable in the palette
        this.expanded(expanded);

        // if this palette one of the built-in ones, then save the state to localStorage
        if (this.fileInfo().name === Palette.BUILTIN_PALETTE_NAME){
            Setting.setValue(Setting.OPEN_BUILTIN_PALETTE, expanded);
            UiModeSystem.saveToLocalStorage();
        }
        if (this.fileInfo().name === Palette.TEMPLATE_PALETTE_NAME){
            Setting.setValue(Setting.OPEN_TEMPLATE_PALETTE, expanded);
            UiModeSystem.saveToLocalStorage();
        }
    }
}
