import * as ko from "knockout";

import { Daliuge } from "./Daliuge";
import { Eagle } from "./Eagle";
import { Errors } from "./Errors";
import { Field } from "./Field";
import { FileInfo } from "./FileInfo";
import { LogicalGraph } from "./LogicalGraph";

export class GraphConfigField {
    private id: ko.Observable<string>;
    private value: ko.Observable<string>;
    private comment: ko.Observable<string>;

    constructor(){
        this.id = ko.observable("");
        this.value = ko.observable("");
        this.comment = ko.observable("");
    }

    clone = (): GraphConfigField => {
        const result = new GraphConfigField();

        result.id(this.id());
        result.value(this.value());
        result.comment(this.comment());

        return result;
    }

    setId = (id: string): GraphConfigField => {
        this.id(id);
        return this;
    }

    getId = (): string => {
        return this.id();
    }

    setValue = (value: string): GraphConfigField => {
        this.value(value);
        return this;
    }

    getValue = (): string => {
        return this.value();
    }

    setComment = (comment: string): GraphConfigField => {
        this.comment(comment);
        return this;
    }

    getComment = (): string => {
        return this.comment();
    }

    static fromJson(data: any, errorsWarnings: Errors.ErrorsWarnings): GraphConfigField {
        const result = new GraphConfigField();

        if (typeof data.value !== 'undefined'){
            result.value(data.value);
        }

        if (typeof data.comment !== 'undefined'){
            result.comment(data.comment);
        }

        return result;
    }

    static toJson(field: GraphConfigField): object {
        const result : any = {};

        result.id = field.id();
        result.value = field.value();
        result.comment = field.comment();

        return result;
    }
}

export class GraphConfigNode {
    private id: ko.Observable<string>;
    private fields: ko.ObservableArray<GraphConfigField>;

    constructor(){
        this.id = ko.observable("");
        this.fields = ko.observableArray([]);
    }

    clone = () : GraphConfigNode => {
        const result: GraphConfigNode = new GraphConfigNode();

        result.id(this.id());

        for (const field of this.fields()){
            result.fields.push(field.clone());
        }

        return result;
    }

    setId = (id: string): GraphConfigNode => {
        this.id(id);
        return this;
    }

    getId = (): string => {
        return this.id();
    }

    addField = (id: string): GraphConfigField => {
        // check to see if the field already exists
        for (const field of this.fields()){
            if (field.getId() === id){
                return field;
            }
        }

        // otherwise add new field
        const newField: GraphConfigField = new GraphConfigField();
        newField.setId(id);
        this.fields.push(newField);
        return newField;
    }

    removeFieldById = (id: string): GraphConfigNode => {
        for (let i = this.fields().length - 1; i >= 0 ; i--){
            if (this.fields()[i].getId() === id){
                this.fields.splice(i, 1);
                break;
            }
        }

        return this;
    }

    getFields = (): GraphConfigField[] => {
        return this.fields();
    }

    static fromJson(data: any, errorsWarnings: Errors.ErrorsWarnings): GraphConfigNode {
        const result = new GraphConfigNode();

        if (data.fields !== 'undefined'){
            for (const fieldId in data.fields){
                const fieldData = data.fields[fieldId];
                const newField: GraphConfigField = GraphConfigField.fromJson(fieldData, errorsWarnings);
                newField.setId(fieldId);
                result.fields.push(newField);
            }
        }

        return result;
    }

    static toJSON(node: GraphConfigNode) : object {
        const result : any = {};

        result.id = node.id();

        // add fields
        result.fields = {};
        for (const field of node.fields()){
            result.fields[field.getId()] = GraphConfigField.toJson(field);
        }

        return result;
    }
}

export class GraphConfig {
    fileInfo : ko.Observable<FileInfo>;
    private nodes: ko.ObservableArray<GraphConfigNode>;
    
    constructor(){
        this.fileInfo = ko.observable(new FileInfo());
        this.fileInfo().type = Eagle.FileType.GraphConfig;
        this.nodes = ko.observableArray([]);
    }

    clone = () : GraphConfig => {
        const result : GraphConfig = new GraphConfig();

        result.fileInfo(this.fileInfo().clone());

        // copy nodes
        for (const node of this.nodes()){
            result.nodes.push(node.clone());
        }

        return result;
    }

    getNodes = (): GraphConfigNode[] => {
        return this.nodes();
    }

    addNode = (id: string): GraphConfigNode => {
        // check to see if node already exists
        for (const node of this.nodes()){
            if (node.getId() === id){
                return node;
            }
        }

        // otherwise add new node
        const newNode: GraphConfigNode = new GraphConfigNode();
        newNode.setId(id);
        this.nodes.push(newNode);
        return newNode;
    }

    addField = (field: Field): void => {
        const node = Eagle.getInstance().logicalGraph().findNodeByKey(field.getNodeKey());
        this.addNode(node.getId()).addField(field.getId());
    }

    findNodeById = (id: string): GraphConfigNode => {
        for (const node of this.nodes()){
            if (node.getId() === id){
                return node;
            }
        }
        return null;
    }

    removeField = (field: Field): void => {
        const node = Eagle.getInstance().logicalGraph().findNodeByKey(field.getNodeKey());
        this.findNodeById(node.getId()).removeFieldById(field.getId());

        // TODO: do we need to check if removing the field means that the node now has zero fields?
    }

    addValue = (nodeId: string, fieldId: string, value: string) => {
        this.addNode(nodeId).addField(fieldId).setValue(value);
    }

    numFields: ko.PureComputed<number> = ko.pureComputed(() => {
        let count = 0;

        for (const node of this.nodes()){
            count += node.getFields().length;
        }

        return count;
    }, this)

    hasField = (field: Field): boolean => {
        for (const n of this.nodes()){
            for (const f of n.getFields()){
                if (field.getId() === f.getId()){
                    return true;
                }
            }
        }

        return false;
    }

    static fromJson(data: any, errorsWarnings: Errors.ErrorsWarnings) : GraphConfig {
        const result: GraphConfig = new GraphConfig();

        if (typeof data.nodes !== 'undefined'){
            for (const nodeId in data.nodes){
                const nodeData = data.nodes[nodeId];
                const newNode: GraphConfigNode = GraphConfigNode.fromJson(nodeData, errorsWarnings);
                newNode.setId(nodeId);
                result.nodes.push(newNode);
            }
        }

        return result;
    }

    static toJson(graphConfig: GraphConfig) : object {
        const result : any = {};

        result.modelData = FileInfo.toOJSJson(graphConfig.fileInfo());

        // add nodes
        result.nodes = {};
        for (const node of graphConfig.nodes()){

            result.nodes[node.getId()] = GraphConfigNode.toJSON(node);
        }

        return result;
    }

    static toJsonString(graphConfig: GraphConfig) : string {
        let result: string = "";

        const json: any = GraphConfig.toJson(graphConfig);

        // NOTE: manually build the JSON so that we can enforce ordering of attributes (modelData first)
        result += "{\n";
        result += '"modelData": ' + JSON.stringify(json.modelData, null, 4) + ",\n";
        result += '"nodes": ' + JSON.stringify(json.nodes, null, 4) + "\n";
        result += "}\n";

        return result;
    }

    static apply(lg: LogicalGraph, config: GraphConfig) : void {
        console.log("Applying graph config with", config.numFields(), "fields to logical graph", lg.fileInfo.name);

        for (const node of config.nodes()){
            const lgNode = lg.findNodeById(node.getId());

            if (lgNode === null){
                console.warn("GraphConfig.apply(): Could not find node", node.getId());
                continue;
            }

            for (const field of node.getFields()){
                const lgField = lgNode.findFieldById(field.getId());

                if (lgField === null){
                    console.warn("GraphConfig.apply(): Could not find field", field.getId(), "on node", lgNode.getName());
                    continue;
                }

                lgField.setValue(field.getValue());
            }
        }
    }
}