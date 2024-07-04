export class GraphConfigField {
    private value: string;
}

export class GraphConfigNode {
    private fields: Map<string, GraphConfigField>;

    constructor(){
        this.fields = new Map();
    }

    addField = (id: string) => {
        if (this.fields.has(id)){
            return;
        }

        this.fields.set(id, new GraphConfigField());
    }
}

export class GraphConfig {
    private nodes: Map<string, GraphConfigNode>;
    
    constructor(){
       this.nodes = new Map();
    }

    addNode = (id:string) => {
        if (this.nodes.has(id)){
            return;
        }

        this.nodes.set(id, new GraphConfigNode());
    }

    addValue = (nodeId: string, fieldId: string, value: string) => {
        this.addNode(nodeId);

        const node: GraphConfigNode = this.nodes.get(nodeId);

        node.addField(fieldId);

        const field = node.fields.get(fieldId);
    }
}