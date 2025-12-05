import * as ko from "knockout";

import { Eagle } from "./Eagle";
import { Errors } from "./Errors";
import { Field } from "./Field";
import { FileInfo } from "./FileInfo";
import { LogicalGraph } from "./LogicalGraph";
import { Node } from "./Node";
import { Utils } from "./Utils";
import { EagleConfig } from "./EagleConfig";
import { Daliuge } from "./Daliuge";

export class GraphConfig {
    fileInfo : ko.Observable<FileInfo>;
    private id: ko.Observable<GraphConfigId>;
    
    private nodes: ko.Observable<Map<NodeId, GraphConfigNode>>;
    
    constructor(){
        this.fileInfo = ko.observable(new FileInfo());
        this.fileInfo().type = Eagle.FileType.GraphConfig;
        this.fileInfo().readonly = false;
        this.fileInfo().builtIn = false;
        this.id = ko.observable(Utils.generateGraphConfigId());
        this.nodes = ko.observable(new Map());
    }

    clone = () : GraphConfig => {
        const result : GraphConfig = new GraphConfig();

        result.fileInfo(this.fileInfo().clone());
        result.id(this.id());

        // copy nodes
        // TODO: check ids, do we need to generate new ids?
        for (const [id, node] of this.nodes()){
            result.nodes().set(id, node.clone());
        }
        result.nodes.valueHasMutated();

        return result;
    }

    getId = (): GraphConfigId => {
        return this.id();
    }

    setId = (id: GraphConfigId): GraphConfig => {
        this.id(id);
        return this;
    }

    getNodes = (): MapIterator<GraphConfigNode> => {
        return this.nodes().values();
    }

    addNode = (node: Node): GraphConfigNode => {
        // check to see if node already exists
        const graphConfigNode = this.nodes().get(node.getId());

        if (typeof graphConfigNode !== 'undefined'){
            return graphConfigNode;
        }

        // otherwise add new node
        const newNode: GraphConfigNode = new GraphConfigNode(node);
        // TODO: required? probably better to set this in GraphConfigNode constructor
        newNode.setNode(node);
        this.nodes().set(node.getId(), newNode);
        this.nodes.valueHasMutated();
        return newNode;
    }

    addField = (field: Field): void => {
        const node = field.getNode();
        this.addNode(node).addField(field);
    }

    getNodeById = (id: NodeId): GraphConfigNode | undefined => {
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
        const graphConfigNode = this.getNodeById(field.getNode().getId());

        if (typeof graphConfigNode === 'undefined'){
            console.warn("GraphConfig.removeField(): Could not find GraphConfigNode for field", field.getId());
            return;
        }

        // remove the field
        graphConfigNode.removeFieldById(field.getId());

        // we check if removing the GraphConfigField means that the GraphConfigNode now has zero fields
        if (graphConfigNode.getNumFields() === 0){
            this.removeNode(graphConfigNode.getNode());
        }

        // re-check graph
        Eagle.getInstance().checkGraph();
    }

    addValue = (node: Node, field: Field, value: string | null) => {
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

        const f: GraphConfigField | undefined = this.nodes().get(node.getId())?.getFieldById(field.getId());

        return typeof f !== 'undefined';
    }

    static fromJson(data: any, lg: LogicalGraph, errorsWarnings: Errors.ErrorsWarnings) : GraphConfig {
        const result: GraphConfig = new GraphConfig();

        // copy modelData into fileInfo
        if (typeof data.modelData === 'undefined'){
            const fi = new FileInfo();

            // attempt to read old-style attributes and place them in the new FileInfo class
            if (typeof data.name !== "undefined"){
                fi.name = data.name;
            }
            if (typeof data.description !== "undefined"){
                fi.shortDescription = data.description;
            }
            if (typeof data.lastModifiedName !== "undefined"){
                fi.lastModifiedName = data.lastModifiedName;
            }
            if (typeof data.lastModifiedEmail !== "undefined"){
                fi.lastModifiedEmail = data.lastModifiedEmail;
            }
            if (typeof data.lastModifiedDatetime !== "undefined"){
                fi.lastModifiedDatetime = data.lastModifiedDatetime;
            }

            fi.type = Eagle.FileType.GraphConfig;
            result.fileInfo(fi);
        } else {
            result.fileInfo(FileInfo.fromV4Json(data.modelData, errorsWarnings));
        }

        if (typeof data.id !== 'undefined'){
            result.id(data.id);
        }

        if (typeof data.nodes !== 'undefined'){
            for (const nodeId in data.nodes){
                const nodeData = data.nodes[nodeId];
                const lgNode = lg.getNodeById(nodeId as NodeId);
                if (typeof lgNode === 'undefined'){
                    console.warn("GraphConfig.fromJson(): Could not find node", nodeId);
                    errorsWarnings.errors.push(Errors.Message("GraphConfig.fromJson(): Could not find node " + nodeId));
                    continue;
                }

                const newNode: GraphConfigNode = GraphConfigNode.fromJson(nodeData, lgNode, errorsWarnings);
                newNode.setNode(lgNode);
                result.nodes().set(nodeId as NodeId, newNode);
                result.nodes.valueHasMutated();
            }
        }

        return result;
    }

    static toJson(graphConfig: GraphConfig) : object {
        const result : any = {};

        // modelData
        result.modelData = FileInfo.toV4Json(graphConfig.fileInfo());

        // id
        result.id = graphConfig.id();

        // add nodes
        result.nodes = {};
        for (const node of graphConfig.nodes().values()){
            const graphNode: Node = node.getNode();

            if (typeof graphNode === 'undefined'){
                continue;
            }

            result.nodes[graphNode.getId()] = GraphConfigNode.toJSON(node, graphNode);
        }

        return result;
    }

    static toJsonString(graphConfig: GraphConfig) : string {
        let result: string = "";

        const json: any = GraphConfig.toJson(graphConfig);

        // NOTE: manually build the JSON so that we can enforce ordering of attributes (modelData first)
        result += JSON.stringify(json, null, EagleConfig.JSON_INDENT);

        return result;
    }
}

export class GraphConfigNode {
    private node: ko.Observable<Node>;
    private fields: ko.Observable<Map<FieldId, GraphConfigField>>;

    constructor(node: Node){
        this.node = ko.observable(node);
        this.fields = ko.observable(new Map());
    }

    getNumFields = (): number => {
        return this.fields().size;
    }

    clone = () : GraphConfigNode => {
        const result: GraphConfigNode = new GraphConfigNode(this.node());

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
        const newField: GraphConfigField = new GraphConfigField(field);
        // TODO: required? probably better to set this in GraphConfigField constructor
        newField.setField(field);
        this.fields().set(field.getId(), newField);
        this.fields.valueHasMutated();
        return newField;
    }

    getFieldById = (id: FieldId): GraphConfigField | undefined => {
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
        const result = new GraphConfigNode(node);

        if (data.fields !== undefined){
            for (const fieldId in data.fields){
                const fieldData = data.fields[fieldId];
                const lgField = node.getFieldById(fieldId as FieldId);

                if (typeof lgField === 'undefined'){
                    console.warn("GraphConfigNode.fromJson(): Could not find field", fieldId, "in node", node.getName());
                    errorsWarnings.errors.push(Errors.Message("GraphConfigNode.fromJson(): Could not find field " + fieldId + " in node " + node.getName()));
                    continue;
                }

                const newField: GraphConfigField = GraphConfigField.fromJson(fieldData, lgField, errorsWarnings);
                // TODO: required? probably better to set this in GraphConfigField.fromJson()
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
            const graphField = graphNode.getFieldById(id);

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
    private value: ko.Observable<string | null>;
    private comment: ko.Observable<string>;

    constructor(field: Field){
        this.field = ko.observable(field);
        this.value = ko.observable("");
        this.comment = ko.observable("");
    }

    clone = (): GraphConfigField => {
        const result = new GraphConfigField(this.field());

        //result.field(this.field());
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

    setValue = (value: string | null): GraphConfigField => {
        this.value(value);
        return this;
    }

    getValue = (): string | null => {
        return this.value();
    }

    toggle = () : GraphConfigField => {
        let oldValue = this.value();
        if (oldValue === null){
            oldValue = "false";
        }
        
        this.value((!Utils.asBool(oldValue)).toString());
        return this;
    }

    setComment = (comment: string): GraphConfigField => {
        this.comment(comment);
        return this;
    }

    getComment = (): string => {
        return this.comment();
    }

    static fromJson(data: any, field: Field, errorsWarnings: Errors.ErrorsWarnings): GraphConfigField {
        const result = new GraphConfigField(field);

        if (typeof data.value !== 'undefined'){
            if (data.value === null){
                result.value(null);
            } else {
                result.value(data.value.toString());
            }
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
