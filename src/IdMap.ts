import * as ko from "knockout";

interface HasId {
    getId: () => NodeId | EdgeId | FieldId;
}

export class IdMap<Key, Value extends HasId> {
    private map: ko.Observable<Map<Key, Value>>;

    constructor(){
        this.map = ko.observable(new Map<Key, Value>());
    }

    get = (id: Key) : Value => {
        const v: Value = this.map().get(id);
        return typeof v === 'undefined' ? null : v;
    }

    add = (key: Key, value: Value): Value => {
        this.map().set(key, value);
        return value;
    }

    delete = (key: Key): void => {
        this.map().delete(key)
    }

    all = () : Iterator<Value> => {
        return this.map().values();
    }

    clear = () : void => {
        this.map().clear();
    }
}