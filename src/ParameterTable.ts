import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Field} from './Field';
import {Utils} from './Utils';

export class ParameterTable {

    static selectionParent : ko.Observable<Field | null>; // row in the parameter table that is currently selected
    static selectionParentIndex : ko.Observable<number> // id of the selected field
    static selection : ko.Observable<string | null>; // cell in the parameter table that is currently selected
    static selectionName : ko.Observable<string>; // name of selected parameter in field
    static selectionReadonly : ko.Observable<boolean> // check if selection is readonly

    constructor(){
        ParameterTable.selectionParent = ko.observable(null);
        ParameterTable.selectionParentIndex = ko.observable(-1);
        ParameterTable.selection = ko.observable(null);
        ParameterTable.selectionName = ko.observable('');
        ParameterTable.selectionReadonly = ko.observable(false);
    }

    formatTableInspectorSelection = () : string => {
        if (ParameterTable.selection() === null){
            return "";
        }

        return ParameterTable.selectionParent().getDisplayText() + " - " + ParameterTable.selectionName();
    }

    formatTableInspectorValue = () : string => {
        if (ParameterTable.selection() === null){
            return "";
        }

        return ParameterTable.selection();
    }

    tableInspectorUpdateSelection = (value:string) : void => {
        const selected = ParameterTable.selectionName()
        const selectedForm = ParameterTable.selectionParent()
        if(selected === 'displayText'){
            selectedForm.setDisplayText(value)
        } else if(selected === 'idText'){
            selectedForm.setIdText(value)
        } else if(selected === 'value'){
            selectedForm.setValue(value)
        } else if(selected === 'defaultValue'){
            selectedForm.setDefaultValue(value)
        } else if(selected === 'description'){
            selectedForm.setDescription(value)
        }
    }

    // fill the datatype select element with all the types known within the current graph and palettes
    fill = (type:string):string => {
        const eagle: Eagle = Eagle.getInstance();
        let options:string = "";

        // determine the list of all types in this graph and palettes
        const allTypes: string[] = Utils.findAllKnownTypes(eagle.palettes(), eagle.logicalGraph());

        for (const dataType of allTypes){
            let selected=""
            if(type === dataType){
                selected = "selected=true"
            }
            options = options + "<option value="+dataType+"  "+selected+">"+dataType+"</option>";
        }

        return options
    }

    static select = (selection:string, selectionName:string, readOnlyState:boolean, selectionParent:Field, selectionIndex:number, event:any) : void => {
        ParameterTable.selectionName(selectionName);
        ParameterTable.selectionParent(selectionParent);
        ParameterTable.selectionParentIndex(selectionIndex);
        ParameterTable.selection(selection);
        ParameterTable.selectionReadonly(readOnlyState);
    }

    static resetSelection = ():void => {
        ParameterTable.selectionParentIndex(-1);
        ParameterTable.selection(null);
    }

    static hasSelection = () : boolean => {
        return ParameterTable.selectionParentIndex() !== -1;
    }
}