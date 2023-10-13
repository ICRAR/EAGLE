import * as ko from "knockout";

import {Field} from './Field';
import {Eagle} from './Eagle';
import {Utils} from './Utils';
import { UiModeSystem } from "./UiModes";
import {Setting} from "./Setting";

export class ParameterTable {

    static selectionParent : ko.Observable<Field | null>; // row in the parameter table that is currently selected
    static selectionParentIndex : ko.Observable<number> // id of the selected field
    static selection : ko.Observable<string | null>; // cell in the parameter table that is currently selected
    static selectionName : ko.Observable<string>; // name of selected parameter in field
    static selectionReadonly : ko.Observable<boolean> // check if selection is readonly

    static activeColumnVisibility : ColumnVisibilities;

    static tableHeaderX : any;
    static tableHeaderW : any;

    constructor(){
        ParameterTable.selectionParent = ko.observable(null);
        ParameterTable.selectionParentIndex = ko.observable(-1);
        ParameterTable.selection = ko.observable(null);
        ParameterTable.selectionName = ko.observable('');
        ParameterTable.selectionReadonly = ko.observable(false);

    }

    static setActiveColumnVisibility = () :void => {
        const uiModeName = UiModeSystem.activeUiMode.getName()

        columnVisibilities.forEach(function(columnVisibility){
            if(columnVisibility.getModeName() === uiModeName){
                ParameterTable.activeColumnVisibility = columnVisibility
            }
        })
    } 

    static getActiveColumnVisibility = () : ColumnVisibilities => {
       return ParameterTable.activeColumnVisibility
    } 

    static getColumnVisibilities = () : ColumnVisibilities[] => {
       return columnVisibilities
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

    static tableEnterShortcut = (event:any) : void => {

        //if the table parameter search bar is selected
        if($('#parameterTableModal .componentSearchBar')[0] === event.target){
            const targetCell = $('#parameterTableModal td.column_Value').first().children().first()
            targetCell.focus()
            $('.selectedTableParameter').removeClass('selectedTableParameter')
            targetCell.parent().addClass('selectedTableParameter')
        }else if (event.target.closest('.columnCell')){

        //if a cell in the table is currently selected, enter will select the next cell down

            //we are getting the class name of the current column's cell eg. column_Description
            const classes = $(event.target.closest('.columnCell')).attr('class').split(' ')
            let cellTypeClass
            for(const className of classes){
                if(className.includes('column_')){
                    cellTypeClass = className;
                    break
                }
            }

            //now we are getting all cells in this column
            const typeClassColumnCells = $('.'+cellTypeClass)
            let activeCellFound = false

            //here we are looping through each of the cells to figure out which one is currently selected
            //then we mark the activeCellFound as true, so the next element in the loop will be set to focused and exit the loop with return false
            typeClassColumnCells.each(function(i,cell){
                if(activeCellFound){
                    if($(cell).children().first().hasClass('parameterTableTypeCustomSelect')){
                        return <void> null;
                    }else{
                        $(cell).children().first().focus()
                    }

                    $('.selectedTableParameter').removeClass('selectedTableParameter')
                    $(cell).addClass('selectedTableParameter')
                    return false;
                }

                if($(cell).hasClass('selectedTableParameter')){
                    activeCellFound = true 
                }
            })
        }
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

    getParamsTableEditState = () : boolean => {
        if(Eagle.selectedLocation() === Eagle.FileType.Palette){
            return !Setting.findValue(Setting.ALLOW_PALETTE_EDITING)
        }else{
            if(Setting.findValue(Setting.ALLOW_GRAPH_EDITING)||Setting.findValue(Setting.ALLOW_COMPONENT_EDITING)){
                return false
            }else{
                return true
            }
        }
    }

    fieldUsageChanged = (field: Field) : void => {
        console.log("fieldUsageChanged", field.getUsage(), field.getNodeKey());
        
        const eagle: Eagle = Eagle.getInstance();
        const edgesToRemove: string[] = [];

        for (const edge of eagle.logicalGraph().getEdges()){
            // check edges whose source is this field
            if (edge.getSrcPortId() === field.getId() && !field.isOutputPort()){
                // remove edge
                edgesToRemove.push(edge.getId());
            }

            // check edges whose destination is this field
            if (edge.getDestPortId() === field.getId() && !field.isInputPort()){
                // remove edge
                edgesToRemove.push(edge.getId());
            }
        }

        // remove edges
        for (const edgeId of edgesToRemove){
            console.log("remove edge", edgeId);
            eagle.logicalGraph().removeEdgeById(edgeId);
        }

        // notify user
        if (edgesToRemove.length > 0){
            Utils.showNotification("Removed edges", "Removed " + edgesToRemove.length + " edge(s) made invalid by the change in port usage", "info");
        }
    }

    fieldValueChanged = (field: Field) : void => {
        console.log("fieldValueChanged", field.getNodeKey());

        // TODO: put code here instead of eagle?
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

    setUpColumnResizer = (headerId:string) : boolean => {
        // little helper function that sets up resizable columns. this is called by ko on the headers when they are created
        ParameterTable.initiateResizableColumns(headerId)
        return true
    }

    static showEditDescription = () => {
            $(event.target).find('.parameterTableDescriptionBtn ').show()
    }

    static hideEditDescription = () => {
            $(event.target).find('.parameterTableDescriptionBtn ').hide()
    }

    static requestEditDescriptionInModal = (currentField:Field) => {
        const eagle: Eagle = Eagle.getInstance();
        const tableType = eagle.tableModalType()
        eagle.openParamsTableModal('','')
        Utils.requestUserText("Edit Field Description", "Please edit the description for: "+eagle.logicalGraph().findNodeByKeyQuiet(currentField.getNodeKey())+' - '+currentField.getDisplayText(), currentField.getDescription(), (completed, userText) => {
            if (!completed){
                return;
            }

            currentField.setDescription(userText);
            eagle.openParamsTableModal(tableType,'')

        })
    }

    static initiateResizableColumns = (upId:string) : void => {
        //need this oen initially to set the mousedown handler
            let upcol: HTMLElement = $('#'+upId)[0]
            let upresizer: JQuery<HTMLElement> = $(upcol).find('div')

            let downcol: HTMLElement
            let downresizer: JQuery<HTMLElement>

            let tableWidth: number

            // Track the current position of mouse
            let x = 0;
            let upW = 0;
            let downW = 0;

            const mouseDownHandler = function (e:any) {
                //need to reset these as they are sometimes lost
                upcol = $('#'+upId)[0]
                upresizer = $(upcol).find('div')
                downcol = $('#'+upId).next()[0]
                downresizer = $(downcol).find('div')

                //getting the table width for use later to convert the new widths into percentages
                tableWidth = parseInt(window.getComputedStyle($('#paramsTableWrapper')[0]).width,10)

                // Get the current mouse position
                x = e.clientX;

                // Calculate the current width of column
                const styles = window.getComputedStyle(upcol);
                upW = parseInt(styles.width, 10);

                const downstyles = window.getComputedStyle(downcol)
                downW = parseInt(downstyles.width, 10);
        
                // Attach listeners for document's events
                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
                upresizer.addClass('resizing');
                downresizer.addClass('resizing');
            };
        
            const mouseMoveHandler = function (e:any) {
                // Determine how far the mouse has been moved
                const dx = e.clientX - x;

                //converting these new px values into percentages
                const newUpWidth: number = ((upW + dx)/tableWidth)*100
                const newDownWidth: number = ((downW - dx)/tableWidth)*100

                // Update the width of column
                upcol.style.width = `${newUpWidth}%`;
                downcol.style.width = `${newDownWidth}%`;
            };
        
            // When user releases the mouse, remove the existing event listeners
            const mouseUpHandler = function () {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
                upresizer.removeClass('resizing');
                downresizer.removeClass('resizing');
            };
        
            //doing it this way because it makes it simpler to have the header in quetion in hand. the ko events proved difficult to pass events and objects with
            upresizer.on('mousedown', mouseDownHandler);
    }
}

export class ColumnVisibilities {

    private uiModeName : string;
    private keyAttribute:ko.Observable<boolean>
    private displayText:ko.Observable<boolean>
    private fieldId:ko.Observable<boolean>
    private value:ko.Observable<boolean>
    private readOnly:ko.Observable<boolean>
    private defaultValue:ko.Observable<boolean>
    private description:ko.Observable<boolean>
    private type:ko.Observable<boolean>
    private parameterType:ko.Observable<boolean>
    private usage:ko.Observable<boolean>
    private flags:ko.Observable<boolean>
    private actions:ko.Observable<boolean>

    constructor(uiModeName:string, keyAttribute:boolean, displayText:boolean,fieldId:boolean,value:boolean,readOnly:boolean,defaultValue:boolean,description:boolean,type:boolean,parameterType:boolean,usage:boolean,flags:boolean,actions:boolean){

        this.uiModeName = uiModeName;
        this.keyAttribute = ko.observable(keyAttribute);
        this.displayText = ko.observable(displayText);
        this.fieldId = ko.observable(fieldId);
        this.value = ko.observable(value);
        this.readOnly = ko.observable(readOnly);
        this.defaultValue = ko.observable(defaultValue);
        this.description = ko.observable(description);
        this.type = ko.observable(type);
        this.parameterType = ko.observable(parameterType);
        this.usage = ko.observable(usage);
        this.flags = ko.observable(flags);
        this.actions = ko.observable(actions);

    }

    getVisibilities = () : ColumnVisibilities => {
        return this;
    }

    getModeName = () : string => {
        return this.uiModeName;
    }

    getModeByName = (name:string) : ColumnVisibilities => {
        let columnVisibilityResult:ColumnVisibilities = null
        columnVisibilities.forEach(function(columnVisibility){
            if(columnVisibility.getModeName() === name){
                columnVisibilityResult = columnVisibility
            }
        })
        return columnVisibilityResult
    }

    setModeName = (newUiModeName:string) : void => {
        this.uiModeName = newUiModeName;
    }

    getKeyAttribute = () : boolean => {
        return this.keyAttribute()
    }

    private setKeyAttribute = (value:boolean) : void => {
        this.keyAttribute(value);
    }

    private setDisplayText = (value:boolean) : void => {
        this.displayText(value);
    }

    private setFieldId = (value:boolean) : void => {
        this.fieldId(value);
    }

    private setValue = (value:boolean) : void => {
        this.value(value);
    }

    private setReadOnly = (value:boolean) : void => {
        this.readOnly(value);
    }

    private setDefaultValue = (value:boolean) : void => {
        this.defaultValue(value);
    }

    private setDescription = (value:boolean) : void => {
        this.description(value);
    }

    private setType = (value:boolean) : void => {
        this.type(value);
    }

    private setParameterType = (value:boolean) : void => {
        this.parameterType(value);
    }

    private setUsage = (value:boolean) : void => {
        this.usage(value);
    }

    private setFlags = (value:boolean) : void => {
        this.flags(value);
    }

    private setActions = (value:boolean) : void => {
        this.actions(value);
    }

    //these toggle functions are used in the knockout for the ui elements
    private toggleKeyAttribute = () : void => {
            this.keyAttribute(!this.keyAttribute());
            this.saveToLocalStorage()
    }

    private toggleDisplayText = () : void => {
            this.displayText(!this.displayText());
            this.saveToLocalStorage()
    }

    private toggleFieldId = () : void => {
            this.fieldId(!this.fieldId());
            this.saveToLocalStorage()
    }

    private toggleValue = () : void => {
            this.value(!this.value());
            this.saveToLocalStorage()
    }

    private toggleReadOnly = () : void => {
        this.readOnly(!this.readOnly());
        this.saveToLocalStorage()
    }

    private toggleDefaultValue = () : void => {
        this.defaultValue(!this.defaultValue());
        this.saveToLocalStorage()
    }

    private toggleDescription = () : void => {
        this.description(!this.description());
        this.saveToLocalStorage()
    }

    private toggleType = () : void => {
        this.type(!this.type());
        this.saveToLocalStorage()
    }

    private toggleParameterType = () : void => {
        this.parameterType(!this.parameterType());
        this.saveToLocalStorage()
    }

    private toggleUsage = () : void => {
        this.usage(!this.usage());
        this.saveToLocalStorage()
    }

    private toggleFlags = () : void => {
        this.flags(!this.flags());
        this.saveToLocalStorage()
    }

    private toggleActions = () : void => {
        this.actions(!this.actions());
        this.saveToLocalStorage()
    }

    private saveToLocalStorage = () : void => {
        const columnVisibilitiesObjArray : any[] = []
        columnVisibilities.forEach(function(columnVis:ColumnVisibilities){
            const columnVisibilitiesObj = {
                name : columnVis.getModeName(),
                keyAttribute : columnVis.keyAttribute(),
                displayText : columnVis.displayText(),
                fieldId : columnVis.fieldId(),
                value : columnVis.value(),
                readOnly : columnVis.readOnly(),
                defaultValue : columnVis.defaultValue(),
                description : columnVis.description(),
                type : columnVis.type(),
                parameterType : columnVis.parameterType(),
                usage : columnVis.usage(),
                flags : columnVis.flags(),
                actions : columnVis.actions(),
                
            }
            columnVisibilitiesObjArray.push(columnVisibilitiesObj)
        })
        localStorage.setItem('ColumnVisibilities', JSON.stringify(columnVisibilitiesObjArray));
    }

     loadFromLocalStorage = () : void => {
        const columnVisibilitiesObjArray : any[] = JSON.parse(localStorage.getItem('ColumnVisibilities'))
        const that = ParameterTable.getActiveColumnVisibility()
        if(columnVisibilitiesObjArray === null){
            return
        }else{
            columnVisibilitiesObjArray.forEach(function(columnvisibility){
                const columnVisActual:ColumnVisibilities = that.getModeByName(columnvisibility.name)
                columnVisActual.setKeyAttribute(columnvisibility.keyAttribute)
                columnVisActual.setDisplayText(columnvisibility.displayText)
                columnVisActual.setFieldId(columnvisibility.fieldId)
                columnVisActual.setValue(columnvisibility.value)
                columnVisActual.setReadOnly(columnvisibility.readOnly)
                columnVisActual.setDefaultValue(columnvisibility.defaultValue)
                columnVisActual.setDescription(columnvisibility.description)
                columnVisActual.setType(columnvisibility.type)
                columnVisActual.setParameterType(columnvisibility.parameterType)
                columnVisActual.setUsage(columnvisibility.usage)
                columnVisActual.setFlags(columnvisibility.flags)
                columnVisActual.setActions(columnvisibility.actions)
            })
        }
    }
}


// name, keyAttribute,displayText,value,readOnly,defaultValue,description,type,parameterType,usage,flags,actions
const columnVisibilities : ColumnVisibilities[] = [
    new ColumnVisibilities( "Student", false, true,false,true,true,false,false,false,false,false,false,false),
    new ColumnVisibilities("Minimal", true, true,false,true,true,false,false,false,false,false,true,false),
    new ColumnVisibilities("Graph", true, true,false,true,true,true,false,true,true,true,true,true),
    new ColumnVisibilities("Component", true, true,false,true,true,true,true,true,true,true,true,true),
    new ColumnVisibilities("Expert", true, true,false,true,true,true,true,true,true,true,true,true),
]