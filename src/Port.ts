import * as ko from "knockout";

import {Eagle} from './Eagle';

export class Port {
    private _id : ko.Observable<string>;
    private text : ko.Observable<string>; // external user-facing name
    private name : ko.Observable<string>; // internal no-whitespace name
    private nodeKey : ko.Observable<number>;
    private local : ko.Observable<boolean>;
    private event : ko.Observable<boolean>;
    private type : ko.Observable<string>;
    private description : ko.Observable<string>;

    public static readonly DEFAULT_ID : string = "<default>";
    public static readonly DEFAULT_EVENT_PORT_NAME = "event";

    constructor(id : string, name : string, text : string, event : boolean, type: string, description: string){
        this._id = ko.observable(id);
        this.text = ko.observable(text);
        this.name = ko.observable(name);
        this.nodeKey = ko.observable(0);
        this.local = ko.observable(false);
        this.event = ko.observable(event);
        this.type = ko.observable(type);
        this.description = ko.observable(description);
    }

    getId = () : string => {
        return this._id();
    }

    setId = (id: string): void => {
        this._id(id);
    }

    getName = () : string => {
        return this.name();
    }

    setName = (name : string) : void => {
        this.name(name);
    }

    getText = () : string => {
        return this.text();
    }

    setText = (text : string) : void => {
        this.text(text);
    }

    getDescription = () : string => {
        return this.description();
    }

    setDescription = (description : string) : void => {
        this.description(description);
    }

    getNodeKey = () : number => {
        return this.nodeKey();
    }

    setNodeKey = (key : number) : void => {
        this.nodeKey(key);
    }

    clear = () : void => {
        this._id("");
        this.text("");
        this.name("");
        this.nodeKey(0);
        this.local(false);
        this.event(false);
        this.type("");
        this.description("");
    }

    isEvent = () : boolean => {
        return this.event();
    }

    setEvent = (event : boolean) : void => {
        this.event(event);
    }

    toggleEvent = () : void => {
        this.event(!this.event());
    }

    getType = (): string => {
        return this.type();
    }

    getDescriptionText : ko.PureComputed<string> = ko.pureComputed(() => {
        return this.name() + " " + this.text() + " (" + this.type() + ') | Description:"' +this.description()+'"';
    }, this);

    clone = () : Port => {
        const port = new Port(this._id(), this.name(), this.text(), this.event(), this.type(), this.description());
        port.local(this.local());
        return port;
    }

    copy = (src: Port) : void => {
        this.name(src.name());
        this.text(src.text());
        this.nodeKey(src.nodeKey());
        this.local(src.local());
        this.event(src.event());
        this.type(src.type());
        this.description(src.description());
    }

    copyWithKeyAndId = (src: Port, nodeKey: number, id: string) : void => {
        this._id(id);
        this.name(src.name());
        this.text(src.text());
        this.nodeKey(nodeKey);
        this.local(src.local());
        this.event(src.event());
        this.type(src.type());
        this.description(src.description());
    }

    public static sortFunc = (a: Port, b: Port) : number => {
        if (a.name() < b.name())
            return -1;

        if (a.name() > b.name())
            return 1;

        if (a.type() < b.type())
            return -1;

        if (a.type() > b.type())
            return 1;

        return 0;
    }
}
