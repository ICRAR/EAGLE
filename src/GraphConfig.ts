import * as ko from "knockout";

import { Branded } from "./main";
import { Eagle } from "./Eagle";
import { Errors } from "./Errors";
import { Field } from "./Field";
import { LogicalGraph } from "./LogicalGraph";
import { Utils } from "./Utils";

export class GraphConfig {
    private id: ko.Observable<GraphConfig.Id>;
    private name: ko.Observable<string>;
    private description: ko.Observable<string>;
    
    private nodes: ko.ObservableArray<GraphConfigNode>;

    private lastModifiedName : ko.Observable<string>;
    private lastModifiedEmail : ko.Observable<string>;
    private lastModifiedDatetime : ko.Observable<number>;
    
    constructor(){
        this.id = ko.observable(Utils.generateGraphConfigId());
        this.name = ko.observable("");
        this.description = ko.observable("");

        this.nodes = ko.observableArray([]);

        this.lastModifiedName = ko.observable("");
        this.lastModifiedEmail = ko.observable("");
        this.lastModifiedDatetime = ko.observable(0);
    }

    clone = () : GraphConfig => {
        const result : GraphConfig = new GraphConfig();

        result.id(this.id());
        result.name(this.name());
        result.description(this.description());
        
        // copy nodes
        for (const node of this.nodes()){
            result.nodes.push(node.clone());
        }

        result.lastModifiedName(this.lastModifiedName());
        result.lastModifiedEmail(this.lastModifiedEmail());
        result.lastModifiedDatetime(this.lastModifiedDatetime());

        return result;
    }

    getId = (): GraphConfig.Id => {
        return this.id();
    }

    setId = (id: GraphConfig.Id): GraphConfig => {
        this.id(id);
        return this;
    }

    getName = (): string => {
        return this.name();
    }

    setName = (name: string): GraphConfig => {
        this.name(name);
        return this;
    }

    getDescription = (): string => {
        return this.description();
    }

    setDescription = (description: string): GraphConfig => {
        this.description(description);
        return this;
    }

    getNodes = (): GraphConfigNode[] => {
        return this.nodes();
    }

    setLastModified = (name: string, email: string, datetime: number): void => {
        this.lastModifiedName(name);
        this.lastModifiedEmail(email);
        this.lastModifiedDatetime(datetime);
    }

    addNode = (id: NodeId): GraphConfigNode => {
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
        const node = Eagle.getInstance().logicalGraph().findNodeById(field.getNodeId());
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

    removeNode = (node: GraphConfigNode): void => {
        for (let i = this.nodes().length - 1; i >= 0 ; i--){
            if (this.nodes()[i].getId() === node.getId()){
                this.nodes.splice(i, 1);
                break;
            }
        }
    }

    removeNodeById = (nodeId: NodeId): void => {
        for (let i = this.nodes().length - 1; i >= 0 ; i--){
            if (this.nodes()[i].getId() === nodeId){
                this.nodes.splice(i, 1);
                break;
            }
        }
    }

    removeField = (field: Field): void => {
        // get reference to the GraphConfigNode containing the field
        const graphConfigNode: GraphConfigNode = this.findNodeById(field.getNodeId());

        // remove the field
        graphConfigNode.removeFieldById(field.getId());

        // we check if removing the GraphConfigField means that the GraphConfigNode now has zero fields
        if (graphConfigNode.getFields().length === 0){
            this.removeNode(graphConfigNode);
        }

        // re-check graph
        Eagle.getInstance().checkGraph();
    }

    addValue = (nodeId: NodeId, fieldId: FieldId, value: string) => {
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

        if (typeof data.name !== 'undefined'){
            result.name(data.name);
        }

        if (typeof data.description !== 'undefined'){
            result.description(data.description);
        }

        if (typeof data.nodes !== 'undefined'){
            for (const nodeId in data.nodes){
                const nodeData = data.nodes[nodeId];
                const newNode: GraphConfigNode = GraphConfigNode.fromJson(nodeData, errorsWarnings);
                newNode.setId(nodeId as NodeId);
                result.nodes.push(newNode);
            }
        }

        if (typeof data.lastModifiedName !== 'undefined'){
            result.lastModifiedName(data.lastModifiedName);
        }
        if (typeof data.lastModifiedEmail !== 'undefined'){
            result.lastModifiedEmail(data.lastModifiedEmail);
        }
        if (typeof data.lastModifiedDatetime !== 'undefined'){
            result.lastModifiedDatetime(data.lastModifiedDatetime);
        }

        return result;
    }

    static toJson(graphConfig: GraphConfig) : object {
        const result : any = {};

        // NOTE: we don't write isModified to JSON, it is run-time only
        result.name = graphConfig.name();
        result.description = graphConfig.description();

        // add nodes
        result.nodes = {};
        for (const node of graphConfig.nodes()){

            result.nodes[node.getId()] = GraphConfigNode.toJSON(node);
        }

        result.lastModifiedName = graphConfig.lastModifiedName();
        result.lastModifiedEmail = graphConfig.lastModifiedEmail();
        result.lastModifiedDatetime = graphConfig.lastModifiedDatetime();

        return result;
    }

    static toJsonString(graphConfig: GraphConfig) : string {
        let result: string = "";

        const json: any = GraphConfig.toJson(graphConfig);

        // NOTE: manually build the JSON so that we can enforce ordering of attributes (modelData first)
        result += JSON.stringify(json, null, 4);

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

export class GraphConfigNode {
    private id: ko.Observable<NodeId>;
    private fields: ko.ObservableArray<GraphConfigField>;

    constructor(){
        this.id = ko.observable(null);
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

    setId = (id: NodeId): GraphConfigNode => {
        this.id(id);
        return this;
    }

    getId = (): NodeId => {
        return this.id();
    }

    addField = (id: FieldId): GraphConfigField => {
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

    findFieldById = (id: FieldId): GraphConfigField => {
        for (let i = this.fields().length - 1; i >= 0 ; i--){
            if (this.fields()[i].getId() === id){
                return this.fields()[i];
            }
        }

        return null;
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

        if (data.fields !== undefined){
            for (const fieldId in data.fields){
                const fieldData = data.fields[fieldId];
                const newField: GraphConfigField = GraphConfigField.fromJson(fieldData, errorsWarnings);
                newField.setId(fieldId as FieldId);
                result.fields.push(newField);
            }
        }

        return result;
    }

    static toJSON(node: GraphConfigNode) : object {
        const result : any = {};

        // NOTE: do not add 'id' attribute, since nodes are stored in a dict keyed by id

        // add fields
        result.fields = {};
        for (const field of node.fields()){
            result.fields[field.getId()] = GraphConfigField.toJson(field);
        }

        return result;
    }
}

export class GraphConfigField {
    private id: ko.Observable<FieldId>;
    private value: ko.Observable<string>;
    private comment: ko.Observable<string>;

    constructor(){
        this.id = ko.observable(null);
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

    setId = (id: FieldId): GraphConfigField => {
        this.id(id);
        return this;
    }

    getId = (): FieldId => {
        return this.id();
    }

    setValue = (value: string): GraphConfigField => {
        this.value(value);
        return this;
    }

    getValue = (): string => {
        return this.value();
    }

    toggle = () : GraphConfigField => {        
        this.value((!Utils.asBool(this.value())).toString());
        return this;
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

        // NOTE: do not add 'id' attribute, since fields are stored in a dict keyed by id
        result.value = field.value();
        result.comment = field.comment();

        return result;
    }
}

export namespace GraphConfig
{
    export type Id = Branded<string, "GraphConfigId">
}