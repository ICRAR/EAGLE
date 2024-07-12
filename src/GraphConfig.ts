import * as ko from "knockout";

import { Errors } from "./Errors";
import { Field } from "./Field";
import { LogicalGraph } from "./LogicalGraph";
import { Repository } from "./Repository";

export class GraphConfigField {
    private value: string;
    private comment: string;

    setValue = (value: string): GraphConfigField => {
        this.value = value;
        return this;
    }

    getValue = (): string => {
        return this.value;
    }

    setComment = (comment: string): GraphConfigField => {
        this.comment = comment;
        return this;
    }

    static fromJson(data: any, errorsWarnings: Errors.ErrorsWarnings): GraphConfigField {
        const result = new GraphConfigField();

        if (typeof data.value !== 'undefined'){
            result.value = data.value;
        }

        if (typeof data.comment !== 'undefined'){
            result.comment = data.comment;
        }

        return result;
    }
}

export class GraphConfigNode {
    private fields: Map<string, GraphConfigField>;

    constructor(){
        this.fields = new Map();
    }

    addField = (id: string): GraphConfigField => {
        const result: GraphConfigField = this.fields.get(id);

        if (result){
            return result;
        }

        const newField = new GraphConfigField();
        this.fields.set(id, newField);
        return newField;
    }

    getFields = (): Map<string, GraphConfigField> => {
        return this.fields;
    }

    static fromJson(data: any, errorsWarnings: Errors.ErrorsWarnings): GraphConfigNode {
        const result = new GraphConfigNode();

        if (data.fields !== 'undefined'){
            for (const fieldId in data.fields){
                const fieldData = data.fields[fieldId];
                const newField: GraphConfigField = GraphConfigField.fromJson(fieldData, errorsWarnings);

                result.fields.set(fieldId, newField);
            }
        }

        return result;
    }
}

export class GraphConfig {
    private nodes: Map<string, GraphConfigNode>;
    private repositoryService: Repository.Service;
    private repositoryBranch: string;
    private repositoryName: string;
    
    constructor(){
       this.nodes = new Map();
    }

    getNodes = (): Map<string, GraphConfigNode> => {
        return this.nodes;
    }

    addNode = (id:string): GraphConfigNode => {
        const result: GraphConfigNode = this.nodes.get(id);
        
        if (result){
            return result;
        }

        const newNode: GraphConfigNode = new GraphConfigNode();
        this.nodes.set(id, newNode);
        return newNode;
    }

    addValue = (nodeId: string, fieldId: string, value: string) => {
        this.addNode(nodeId).addField(fieldId).setValue(value);
    }

    numFields: ko.PureComputed<number> = ko.pureComputed(() => {
        let count = 0;

        for (const [id, node] of this.nodes){
            count += node.getFields().size;
        }

        return count;
    }, this)

    static fromJson(data: any, errorsWarnings: Errors.ErrorsWarnings) : GraphConfig {
        const result: GraphConfig = new GraphConfig();

        if (typeof data.nodes !== 'undefined'){
            for (const nodeId in data.nodes){
                const nodeData = data.nodes[nodeId];
                const newNode: GraphConfigNode = GraphConfigNode.fromJson(nodeData, errorsWarnings);

                result.nodes.set(nodeId, newNode);
            }
        }

        return result;
    }

    static apply(lg: LogicalGraph, config: GraphConfig) : void {
        console.log("Applying graph config with", config.numFields(), "fields to logical graph", lg.fileInfo.name);

        for (const [nodeId, node] of config.nodes){
            const lgNode = lg.findNodeById(nodeId);

            if (lgNode === null){
                console.warn("GraphConfig.apply(): Could not find node", nodeId);
                continue;
            }

            for (const [fieldId, field] of node.getFields()){
                const lgField = lgNode.findFieldById(fieldId);

                if (lgField === null){
                    console.warn("GraphConfig.apply(): Could not find field", fieldId, "on node", lgNode.getName());
                    continue;
                }

                lgField.setValue(field.getValue());
            }
        }
    }
}