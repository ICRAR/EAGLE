import * as ko from "knockout";
import { Field } from './Field';

export class Fields {
    private fieldMap: ko.Observable<Fields.FieldMap>;

    constructor(){
        this.fieldMap = ko.observable({});
    }

    get = (id: FieldId) : Field => {
        if (this.fieldMap().hasOwnProperty(id)){
            return this.fieldMap()[id];
        } else {
            return null;
        }
    }

    add = (field: Field): void => {
        this.fieldMap()[field.getId()] = field;
    }

    remove = (id: FieldId): void => {
        delete this.fieldMap()[id];
    }

    all = () : Field[] => {
        return Object.values(this.fieldMap());
    }

    clear = () : void => {
        this.fieldMap({});
    }
}

export namespace Fields {
    export type FieldMap = {
        [key: FieldId]: Field;
    };
}