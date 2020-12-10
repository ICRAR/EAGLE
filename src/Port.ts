export class Port {
    private _id : string
    private name : string;
    private nodeKey : number;
    private local : boolean;
    private event : boolean;

    public static readonly DEFAULT_ID : string = "<default>";
    public static readonly DEFAULT_EVENT_PORT_NAME = "event";

    constructor(id : string, name : string, event : boolean){
        this._id = id;
        this.name = name;
        this.nodeKey = 0;
        this.local = false;
        this.event = event;
    }

    getId = () : string => {
        return this._id;
    }

    getName = () : string => {
        return this.name;
    }

    getNodeKey = () : number => {
        return this.nodeKey;
    }

    setNodeKey = (key : number) : void => {
        this.nodeKey = key;
    }

    isLocal = () : boolean => {
        return this.local;
    }

    setLocal = (local : boolean) : void => {
        this.local = local;
    }

    clear = () : void => {
        this._id = "";
        this.name = "";
        this.nodeKey = 0;
        this.local = false;
        this.event = false;
    }

    isEvent = () : boolean => {
        return this.event;
    }

    setEvent = (event : boolean) : void => {
        this.event = event;
    }

    clone = () : Port => {
        var p = new Port(this._id, this.name, this.event);
        p.local = this.local;
        return p;
    }

    static toOJSJson = (port : Port) : object => {
        return {
            Id:port._id,
            IdText:port.name,
            event:port.event
        };
    }

    static toV3Json = (port : Port) : object => {
        return {
            name:port.name,
            event:port.event
        };
    }
}
