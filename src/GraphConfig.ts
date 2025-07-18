import * as ko from "knockout";

import { Eagle } from "./Eagle";
import { Errors } from "./Errors";
import { Field } from "./Field";
import { LogicalGraph } from "./LogicalGraph";
import { Node } from "./Node";
import { Utils } from "./Utils";
import { EagleConfig } from "./EagleConfig";
import { Daliuge } from "./Daliuge";

export class GraphConfig {
    private id: ko.Observable<GraphConfigId>;
    private name: ko.Observable<string>;
    private description: ko.Observable<string>;
    
    private nodes: ko.Observable<Map<NodeId, GraphConfigNode>>;

    private lastModifiedName : ko.Observable<string>;
    private lastModifiedEmail : ko.Observable<string>;
    private lastModifiedDatetime : ko.Observable<number>;
    
    constructor(){
        this.id = ko.observable(Utils.generateGraphConfigId());
        this.name = ko.observable("");
        this.description = ko.observable("");

        this.nodes = ko.observable(new Map());

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
        // TODO: check ids, do we need to generate new ids?
        for (const [id, node] of this.nodes()){
            result.nodes().set(id, node.clone());
        }
        result.nodes.valueHasMutated();

        result.lastModifiedName(this.lastModifiedName());
        result.lastModifiedEmail(this.lastModifiedEmail());
        result.lastModifiedDatetime(this.lastModifiedDatetime());

        return result;
    }

    getId = (): GraphConfigId => {
        return this.id();
    }

    setId = (id: GraphConfigId): GraphConfig => {
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

    getNodes = (): MapIterator<GraphConfigNode> => {
        return this.nodes().values();
    }

    setLastModified = (name: string, email: string, datetime: number): void => {
        this.lastModifiedName(name);
        this.lastModifiedEmail(email);
        this.lastModifiedDatetime(datetime);
    }

    addNode = (node: Node): GraphConfigNode => {
        // check to see if node already exists
        const graphConfigNode: GraphConfigNode = this.nodes().get(node.getId());

        if (typeof graphConfigNode !== 'undefined'){
            return graphConfigNode;
        }

        // otherwise add new node
        const newNode: GraphConfigNode = new GraphConfigNode();
        newNode.setNode(node);
        this.nodes().set(node.getId(), newNode);
        this.nodes.valueHasMutated();
        return newNode;
    }

    addField = (field: Field): void => {
        const node = field.getNode();
        this.addNode(node).addField(field);
    }

    getNodeById = (id: NodeId): GraphConfigNode => {
        return this.nodes().get(id);
    }

    removeNode = (node: Node): void => {
        this.nodes().delete(node.getId());
        this.nodes.valueHasMutated();
    }

    removeNodeById = (nodeId: NodeId): void => {
        this.nodes().delete(nodeId);
        this.nodes.valueHasMutated();
    }

    removeField = (field: Field): void => {
        // get reference to the GraphConfigNode containing the field
        const graphConfigNode: GraphConfigNode = this.getNodeById(field.getNode().getId());

        // remove the field
        graphConfigNode.removeFieldById(field.getId());

        // we check if removing the GraphConfigField means that the GraphConfigNode now has zero fields
        if (graphConfigNode.getNumFields() === 0){
            this.removeNode(graphConfigNode.getNode());
        }

        // re-check graph
        Eagle.getInstance().checkGraph();
    }

    addValue = (node: Node, field: Field, value: string) => {
        this.addNode(node).addField(field).setValue(value);
    }

    numFields: ko.PureComputed<number> = ko.pureComputed(() => {
        let count = 0;

        for (const node of this.nodes().values()){
            count += node.getNumFields();
        }

        return count;
    }, this)

    hasField = (field: Field): boolean => {
        // get the Node for this field
        const node: Node = field.getNode();

        const f: GraphConfigField = this.nodes().get(node.getId())?.getFieldById(field.getId());

        return typeof f !== 'undefined';
    }

    static fromJson(data: any, lg: LogicalGraph, errorsWarnings: Errors.ErrorsWarnings) : GraphConfig {
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
                const lgNode: Node = lg.getNodeById(nodeId as NodeId);
                if (typeof lgNode === 'undefined'){
                    console.warn("GraphConfig.fromJson(): Could not find node", nodeId);
                    errorsWarnings.errors.push(Errors.Message("GraphConfig.fromJson(): Could not find node " + nodeId));
                }

                const newNode: GraphConfigNode = GraphConfigNode.fromJson(nodeData, lgNode, errorsWarnings);
                newNode.setNode(lgNode);
                result.nodes().set(nodeId as NodeId, newNode);
                result.nodes.valueHasMutated();
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
        for (const node of graphConfig.nodes().values()){
            const graphNode: Node = node.getNode();

            if (typeof graphNode === 'undefined'){
                continue;
            }

            result.nodes[graphNode.getId()] = GraphConfigNode.toJSON(node, graphNode);
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
        result += JSON.stringify(json, null, EagleConfig.JSON_INDENT);

        return result;
    }

    static apply(lg: LogicalGraph, config: GraphConfig, errors: Errors.ErrorsWarnings) : void {
        console.log("Applying graph config with", config.numFields(), "fields to logical graph", lg.fileInfo.name);

        for (const [id, node] of config.nodes()){
            const lgNode: Node = lg.getNodeById(id);

            if (typeof lgNode === 'undefined'){
                errors.errors.push(Errors.Message("GraphConfig.apply(): Could not find node" + id));
                continue;
            }

            for (const field of node.getFields()){
                const lgField: Field = lgNode.getFieldById(field.getField().getId());

                if (typeof lgField === 'undefined'){
                    errors.errors.push(Errors.Message("GraphConfig.apply(): Could not find field" + field.getField().getId() + "on node" + lgNode.getName()));
                    continue;
                }

                lgField.setValue(field.getValue());
            }
        }
    }
}

export class GraphConfigNode {
    private node: ko.Observable<Node>;
    private fields: ko.Observable<Map<FieldId, GraphConfigField>>;

    constructor(){
        this.node = ko.observable(null);
        this.fields = ko.observable(new Map());
    }

    getNumFields = (): number => {
        return this.fields().size;
    }

    clone = () : GraphConfigNode => {
        const result: GraphConfigNode = new GraphConfigNode();

        result.node(this.node());

        for (const [id, field] of this.fields()){
            result.fields().set(id, field.clone());
        }
        result.fields.valueHasMutated();

        return result;
    }

    setNode = (node: Node): GraphConfigNode => {
        this.node(node);
        return this;
    }

    getNode = (): Node => {
        return this.node();
    }

    addField = (field: Field): GraphConfigField => {
        // check to see if the field already exists
        const graphConfigField = this.fields().get(field.getId());
        if (typeof graphConfigField !== 'undefined'){
            return graphConfigField;
        }

        // otherwise add new field
        const newField: GraphConfigField = new GraphConfigField();
        newField.setField(field);
        this.fields().set(field.getId(), newField);
        this.fields.valueHasMutated();
        return newField;
    }

    getFieldById = (id: FieldId): GraphConfigField => {
        return this.fields().get(id);
    }

    removeFieldById = (id: FieldId): GraphConfigNode => {
        this.fields().delete(id);
        this.fields.valueHasMutated();
        return this;
    }

    getFields = (): MapIterator<GraphConfigField> => {
        return this.fields().values();
    }

    static fromJson(data: any, node: Node, errorsWarnings: Errors.ErrorsWarnings): GraphConfigNode {
        const result = new GraphConfigNode();

        if (data.fields !== undefined){
            for (const fieldId in data.fields){
                const fieldData = data.fields[fieldId];
                const newField: GraphConfigField = GraphConfigField.fromJson(fieldData, errorsWarnings);
                const lgField = node.getFieldById(fieldId as FieldId);

                newField.setField(lgField);
                result.fields().set(lgField.getId(), newField);
                result.fields.valueHasMutated();
            }
        }

        return result;
    }

    static toJSON(node: GraphConfigNode, graphNode: Node) : object {
        const result : any = {};

        // add fields
        result.fields = {};
        for (const [id, field] of node.fields()){
            const graphField: Field = graphNode.getFieldById(id);

            if (typeof graphField === 'undefined'){
                continue;
            }

            result.fields[field.getField().getId()] = GraphConfigField.toJson(field, graphField.getType());
        }

        return result;
    }
}

export class GraphConfigField {
    private field: ko.Observable<Field>;
    private value: ko.Observable<string>;
    private comment: ko.Observable<string>;

    constructor(){
        this.field = ko.observable(null);
        this.value = ko.observable("");
        this.comment = ko.observable("");
    }

    clone = (): GraphConfigField => {
        const result = new GraphConfigField();

        result.field(this.field());
        result.value(this.value());
        result.comment(this.comment());

        return result;
    }

    setField = (field: Field): GraphConfigField => {
        this.field(field);
        return this;
    }

    getField = (): Field => {
        return this.field();
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
            result.value(data.value.toString());
        }

        if (typeof data.comment !== 'undefined'){
            result.comment(data.comment);
        }

        return result;
    }

    static toJson(field: GraphConfigField, type: Daliuge.DataType): object {
        const result : any = {};

        // NOTE: do not add 'id' attribute, since fields are stored in a dict keyed by id
        result.value = Field.stringAsType(field.value(), type);
        result.comment = field.comment();

        return result;
    }
}
