import * as ko from "knockout";

import {Field} from './Field';
import {Eagle} from './Eagle';

export class ParameterTable {

    static selectionParent : ko.Observable<Field | null>; // row in the parameter table that is currently selected
    static selectionParentIndex : ko.Observable<number> // id of the selected field
    static selection : ko.Observable<string | null>; // cell in the parameter table that is currently selected
    static selectionName : ko.Observable<string>; // name of selected parameter in field
    static selectionReadonly : ko.Observable<boolean> // check if selection is readonly

    static parameterTableVisibility : Array<{parameterName:string, keyVisibility:boolean, inspectorVisibility:boolean}> = []

    constructor(){
        ParameterTable.selectionParent = ko.observable(null);
        ParameterTable.selectionParentIndex = ko.observable(-1);
        ParameterTable.selection = ko.observable(null);
        ParameterTable.selectionName = ko.observable('');
        ParameterTable.selectionReadonly = ko.observable(false);

        ParameterTable.parameterTableVisibility.push({parameterName:"keyAttribute", keyVisibility: true, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"nodeName", keyVisibility: true, inspectorVisibility: false});
        ParameterTable.parameterTableVisibility.push({parameterName:"nodeKey", keyVisibility: true, inspectorVisibility: false});
        ParameterTable.parameterTableVisibility.push({parameterName:"displayText", keyVisibility: true, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"idText", keyVisibility: false, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"value", keyVisibility: true, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"readOnly", keyVisibility: true, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"defaultValue", keyVisibility: false, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"description", keyVisibility: true, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"type", keyVisibility: true, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"useAs", keyVisibility: true, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"precious", keyVisibility: false, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"positional", keyVisibility: false, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"actions", keyVisibility: true, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"actionEdit", keyVisibility: true, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"actionValue", keyVisibility: true, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"actionDefault", keyVisibility: true, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"actionDuplicate", keyVisibility: false, inspectorVisibility: true});
        ParameterTable.parameterTableVisibility.push({parameterName:"actionDelete", keyVisibility: false, inspectorVisibility: true});
    }

    getParameterTableVisibility = (columnName: string) : boolean => {
        const eagle: Eagle = Eagle.getInstance();
        const tableModalType = eagle.tableModalType()
        let returnValue : boolean
        if(tableModalType === "keyParametersTableModal"){
            ParameterTable.parameterTableVisibility.forEach(function(element){
                if(columnName === element.parameterName){
                    returnValue = element.keyVisibility
                }
            })
        }else if (tableModalType === "inspectorTableModal"){
            ParameterTable.parameterTableVisibility.forEach(function(element){
                if(columnName === element.parameterName){
                    returnValue = element.inspectorVisibility
                }
            })
        }
        return returnValue
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
        // abort update if nothing is selected
        if (!ParameterTable.hasSelection()){
            return;
        }

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

    getTableFields : ko.PureComputed<Field[]> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();
        const tableModalType = eagle.tableModalType()
        let displayedFields:any = []
        if(tableModalType === 'inspectorTableModal'){
            displayedFields = eagle.selectedNode().getFields()
        }else if (tableModalType === 'keyParametersTableModal'){
            eagle.logicalGraph().getNodes().forEach(function(node){
                node.getFields().forEach(function(field){
                    if(field.isKeyAttribute()){
                        displayedFields.push(field)
                    }
                })
            })
        }
        return displayedFields
    }, this);

    getNodeLockedState = (field:Field) : boolean => {
        const eagle: Eagle = Eagle.getInstance();
        if(Eagle.selectedLocation() === Eagle.FileType.Palette){
            if(eagle.selectedNode() === null){
                return false
            }
            return eagle.selectedNode().isLocked()
        }else{
            if(eagle.logicalGraph().findNodeByKeyQuiet(field.getNodeKey()) === null){
                return false
            }
            return eagle.logicalGraph().findNodeByKeyQuiet(field.getNodeKey()).isLocked()
        }
    }

    getFieldUseAsForTable = (nodeKey:number,fieldType:Eagle.FieldType) : any => {
        const eagle: Eagle = Eagle.getInstance();

        if(Eagle.selectedLocation() === Eagle.FileType.Palette){
            if(eagle.selectedNode() === null){
                return false
            }
            return eagle.selectedNode().fillFieldTypeCell(fieldType)
        }else{
            if(eagle.logicalGraph().findNodeByKeyQuiet(nodeKey) === null){
                return false
            }
            return eagle.logicalGraph().findNodeByKeyQuiet(nodeKey).fillFieldTypeCell(fieldType)
        }
        
    }

    static select = (selection:string, selectionName:string, readOnlyState:boolean, selectionParent:Field, selectionIndex:number) : void => {
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