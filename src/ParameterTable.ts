import * as ko from "knockout";

import {Field} from './Field';
import {Eagle} from './Eagle';
import {Utils} from './Utils';
import { UiModeSystem } from "./UiModes";

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

    /*
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
    */

    static select = (selection:string, selectionName:string, readOnlyState:boolean, selectionParent:Field, selectionIndex:number) : void => {
        ParameterTable.selectionName(selectionName);
        ParameterTable.selectionParent(selectionParent);
        ParameterTable.selectionParentIndex(selectionIndex);
        ParameterTable.selection(selection);
        ParameterTable.selectionReadonly(readOnlyState);

        //this is for the funcionality that empty idtexts will copy the display text removing spaces and caps while you type. This functionality gets removed when the display text looses focus signifying the changes are complete
        if(selectionParent.getIdText()===''){
            $(event.target).addClass('newEmpty')
        }
        if($(event.target).hasClass('newEmpty')){
            selectionParent.setIdText(selection.toLowerCase().split(' ').join('_'))
        }
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
    private idText:ko.Observable<boolean>
    private value:ko.Observable<boolean>
    private readOnly:ko.Observable<boolean>
    private defaultValue:ko.Observable<boolean>
    private description:ko.Observable<boolean>
    private type:ko.Observable<boolean>
    private parameterType:ko.Observable<boolean>
    private usage:ko.Observable<boolean>
    private flags:ko.Observable<boolean>
    private actions:ko.Observable<boolean>

    constructor(uiModeName:string, keyAttribute:boolean, displayText:boolean,idText:boolean,value:boolean,readOnly:boolean,defaultValue:boolean,description:boolean,type:boolean,parameterType:boolean,usage:boolean,flags:boolean,actions:boolean){
        
        this.uiModeName = uiModeName;
        this.keyAttribute = ko.observable(keyAttribute);
        this.displayText = ko.observable(displayText);
        this.idText = ko.observable(idText);
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

    setModeName = (newUiModeName:string) : void => {
        this.uiModeName = newUiModeName;
    }

    private toggleKeyAttribute = () : void => {
        this.keyAttribute(!this.keyAttribute());
    }

    private toggleDisplayText = () : void => {
        this.displayText(!this.displayText());
    }

    private toggleIdText = () : void => {
        this.idText(!this.idText());
    }

    private toggleValue = () : void => {
        this.value(!this.value());
    }

    private toggleReadOnly = () : void => {
        this.readOnly(!this.readOnly());
    }

    private toggleDefaultValue = () : void => {
        this.defaultValue(!this.defaultValue());
    }

    private toggleDescription = () : void => {
        this.description(!this.description());
    }

    private toggleType = () : void => {
        this.type(!this.type());
    }

    private toggleParameterType = () : void => {
        this.parameterType(!this.parameterType());
    }

    private toggleUsage = () : void => {
        this.usage(!this.usage());
    }

    private toggleFlags = () : void => {
        this.flags(!this.flags());
    }

    private toggleActions = () : void => {
        this.actions(!this.actions());
    }
}



const columnVisibilities : ColumnVisibilities[] = [
    new ColumnVisibilities( "Student", false, true,false,true,true,false,true,false,false,false,false,false),
    new ColumnVisibilities("Minimal", true, true,false,true,true,false,true,false,false,false,true,false),
    new ColumnVisibilities("Graph", true, true,true,true,true,true,true,true,true,true,true,true),
    new ColumnVisibilities("Component", true, true,true,true,true,true,true,true,true,true,true,true),
    new ColumnVisibilities("Expert", true, true,true,true,true,true,true,true,true,true,true,true),
]