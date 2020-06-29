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
import {Field} from './Field';
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

    static fromXML = (data : XMLDocument) : Palette => {
        console.log("data", data, typeof data);

        var result : Palette = new Palette();

        // add nodes from the XML into the palette
        var sectionDefs = data.getElementsByTagName("sectiondef");

        for (var i = 0 ; i < sectionDefs.length ; i++){
            var kind = sectionDefs[i].getAttribute("kind");

            if (kind === "public-func"){
                console.log("found public-func sectionDef");

                var publicFuncs = sectionDefs[i];
                //console.log("publicFuncs", publicFuncs);

                // get all memberDefs within the section
                var memberDefs = publicFuncs.getElementsByTagName("memberdef");
                console.log("Found", memberDefs.length, "memberDefs");

                for (var j = 0 ; j < memberDefs.length ; j++){
                    //console.log(j, memberDefs[j]);

                    var func = memberDefs[j];

                    var name = func.getElementsByTagName("name")[0].innerHTML;
                    var detailedDescription = func.getElementsByTagName("detaileddescription")[0].innerHTML.trim();
                    var inBodyDescription = func.getElementsByTagName("inbodydescription")[0];
                    var inBodyDescriptionPara = inBodyDescription.getElementsByTagName("para")[0];
                    var descriptionText = "";

                    if (detailedDescription === ""){
                        continue;
                    }

                    console.log("name", name);

                    // abort if inBodyDescriptionPara is undefined
                    if (typeof inBodyDescriptionPara === "undefined"){
                        console.warn("No inBodyDescription for", name, "skipping!");
                        continue;
                    }

                    // add the node
                    var newNode : Node = new Node(-1, name, descriptionText, Eagle.Category.DynlibApp, Eagle.CategoryType.Application, 200, 200);

                    // look for parameter list child of inBodyDescriptionPara
                    var inBodyDescriptionParaParameterList = inBodyDescriptionPara.getElementsByTagName("parameterlist")[0];

                    // look for children of parameter list
                    var parameterItems = inBodyDescriptionParaParameterList.getElementsByTagName("parameteritem");

                    // loop over parameter items
                    for (var k = 0 ; k < parameterItems.length ; k++){
                        var item = parameterItems[k];

                        var parameterName = item.getElementsByTagName("parameternamelist")[0].getElementsByTagName("parametername")[0].innerHTML;
                        var parameterDirection = item.getElementsByTagName("parameternamelist")[0].getElementsByTagName("parametername")[0].getAttribute("direction");
                        var parameterDescription = item.getElementsByTagName("parameterdescription")[0].getElementsByTagName("para")[0].innerHTML;

                        console.log("name", parameterName, "direction", parameterDirection, "description", parameterDescription);
                        Palette.processXMLParameter(newNode, parameterName, parameterDirection, parameterDescription);
                    }

                    result.addNode(newNode);
                }
            }
        }

        return result;
    }

    private static processXMLParameter(node : Node, name : string, direction : string, description : string){
        var type : string = name.substring(0, name.indexOf('/'));
        var realName : string = name.substring(name.indexOf('/') + 1);
        //console.log("type", type, "realName", realName);

        if (type === "param"){
            // add params
            node.addField(new Field(realName, realName, "unknown", description));
        }
        if (type === "port"){
            // TODO: need to work out if the port is input/output and local/non-local
            var input : boolean = direction === "in";
            var local : boolean = false;

            // set canHaveInputs or canHaveOutputs
            if (input){
                node.setCanHaveInputs(true);
            } else {
                node.setCanHaveOutputs(true);
            }

            // add port
            node.addPort(new Port(Utils.uuidv4(), realName), input, local);
        }
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
