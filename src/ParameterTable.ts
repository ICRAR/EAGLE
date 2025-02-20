import * as ko from "knockout";

import { Daliuge } from "./Daliuge";
import { Eagle } from './Eagle';
import { Edge } from "./Edge";
import { Field } from './Field';
import { LogicalGraph } from "./LogicalGraph";
import { Node } from "./Node";
import { Palette } from "./Palette";
import { RightClick } from "./RightClick";
import { Setting } from "./Setting";
import { UiModeSystem } from "./UiModes";
import { Utils } from './Utils';
import { GraphConfig, GraphConfigField } from "./GraphConfig";
import { GraphConfigurationsTable } from "./GraphConfigurationsTable";
import { SideWindow } from "./SideWindow";

export class ParameterTable {

    static showTableModal : ko.Observable<boolean> = ko.observable(false);

    static selectionParent : ko.Observable<Field | null>; // row in the parameter table that is currently selected
    static selectionParentIndex : ko.Observable<number> // id of the selected field
    static selection : ko.Observable<string | null>; // cell in the parameter table that is currently selected
    static selectionName : ko.Observable<string>; // name of selected parameter in field
    static selectionReadonly : ko.Observable<boolean> // check if selection is readonly

    static activeColumnVisibility : ColumnVisibilities;

    static tableHeaderX : any;
    static tableHeaderW : any;

    static init(){

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

    static formatTableInspectorSelection = () : string => {
        if (ParameterTable.selection() === null){
            return "";
        }

        if (Setting.findValue(Setting.BOTTOM_WINDOW_MODE) === Eagle.BottomWindowMode.NodeParameterTable || Setting.findValue(Setting.BOTTOM_WINDOW_MODE) === Eagle.BottomWindowMode.ConfigParameterTable){
            return ParameterTable.selectionParent().getDisplayText() + " - " + ParameterTable.selectionName();
        } else {
            return "Unknown";
        }
    }

    static formatTableInspectorValue = () : string => {
        if (ParameterTable.selection() === null){
            return "";
        }

        if (Setting.findValue(Setting.BOTTOM_WINDOW_MODE) === Eagle.BottomWindowMode.NodeParameterTable || Setting.findValue(Setting.BOTTOM_WINDOW_MODE) === Eagle.BottomWindowMode.ConfigParameterTable){
            return ParameterTable.selection();
        } else {
            return "Unknown";
        }
    }

    static tableEnterShortcut = (event: KeyboardEvent) : void => {

        //if the table parameter search bar is selected
        if($('.parameterTable .componentSearchBar')[0] === event.target){
            const targetCell = $('.parameterTable td.column_Value').first().children().first()
            targetCell.trigger("focus");
            $('.selectedTableParameter').removeClass('selectedTableParameter')
            targetCell.parent().addClass('selectedTableParameter')
        }else if ($(event.target).closest('.columnCell')){

            //if a cell in the table is currently selected, enter will select the next cell down

            //we are getting the class name of the current column's cell eg. column_Description
            const currentColumnCell = $(event.target).closest('.columnCell');
            if (currentColumnCell.length === 0){
                return;
            }

            const classes = currentColumnCell.attr('class').split(' ')
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
                        $(cell).children().first().trigger("focus");
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

    static tableInspectorUpdateSelection = (value:string) : void => {
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

    // TODO: could be renamed to getFields()
    static getTableFields : ko.PureComputed<Field[]> = ko.pureComputed(() => {
        const eagle: Eagle = Eagle.getInstance();

        //resets the table field selections used for the little editor at the top of the table
        ParameterTable.resetSelection()

        switch (Setting.findValue(Setting.BOTTOM_WINDOW_MODE)){
            case Eagle.BottomWindowMode.NodeParameterTable:
                return eagle.selectedNode()?.getFields();
            
            case Eagle.BottomWindowMode.ConfigParameterTable:
                const lg: LogicalGraph = eagle.logicalGraph();
                const config: GraphConfig = lg.getActiveGraphConfig();
                const displayedFields: Field[] = [];

                if (!config){
                    return [];
                }

                for (const node of config.getNodes()){
                    for (const field of node.getFields()){
                        const lgNode = lg.findNodeByIdQuiet(node.getId());

                        if (lgNode === null){
                            const dummyField: Field = new Field(field.getId(), "<Missing Node:" + node.getId() +">", field.getValue(), "?", field.getComment(), true, Daliuge.DataType.Unknown, false, [], false, Daliuge.FieldType.Unknown, Daliuge.FieldUsage.NoPort);
                            dummyField.setNodeId(node.getId());
                            displayedFields.push(dummyField);
                            continue;
                        }

                        const lgField = lgNode.findFieldById(field.getId());
        
                        if (lgField === null){
                            const dummyField: Field = new Field(field.getId(), "<Missing Field: " + field.getId() + ">", field.getValue(), "?", field.getComment(), true, Daliuge.DataType.Unknown, false, [], false, Daliuge.FieldType.Unknown, Daliuge.FieldUsage.NoPort);
                            dummyField.setNodeId(node.getId());
                            displayedFields.push(dummyField);
                            continue;
                        }
        
                        displayedFields.push(lgField);
                    }
                }

                return displayedFields;

            default:
                return []
        }
    }, this);

    // TODO: move to Eagle.ts?
    //       doesn't seem to depend on any ParameterTable state, only Eagle state
    static getNodeLockedState = (field:Field) : boolean => {
        const eagle: Eagle = Eagle.getInstance();

        // this handles a special case where EAGLE is displaying the "Graph Configuration Attributes Table"
        // all the field names shown in that table should be locked (readonly)
        if (Setting.find(Setting.BOTTOM_WINDOW_MODE).value() === Eagle.BottomWindowMode.ConfigParameterTable){
            return eagle.logicalGraph().findNodeByIdQuiet(field?.getNodeId()).isLocked()
        }

        if(Eagle.selectedLocation() === Eagle.FileType.Palette){
            if(eagle.selectedNode() === null){
                return false
            }
            return eagle.selectedNode().isLocked()
        }else{
            if(eagle.logicalGraph().findNodeByIdQuiet(field.getNodeId()) === null){
                return false
            }
            return eagle.logicalGraph().findNodeByIdQuiet(field.getNodeId()).isLocked()
        }
    }

    // TODO: move to Eagle.ts? only depends on Eagle state and settings
    static getParamsTableEditState = () : boolean => {
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

    static fieldUsageChanged(field: Field) : void {
        const eagle: Eagle = Eagle.getInstance();
        const edgesToRemove: EdgeId[] = [];

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

    // when a field value is modified in the parameter table, we need to flag the containing palette or logical graph as modified
    static fieldValueChanged(field: Field) : void {
        const eagle = Eagle.getInstance();

        switch (Eagle.selectedLocation()){
            case Eagle.FileType.Palette: {
                const paletteNode: Node | Edge = eagle.selectedObjects()[0];
                console.assert(paletteNode instanceof Node)

                const containingPalette: Palette = eagle.findPaletteContainingNode(paletteNode.getId());

                containingPalette.fileInfo().modified = true;
                break;
            }
            case Eagle.FileType.Graph:
                eagle.logicalGraph().fileInfo().modified = true;
                break;
        }

        eagle.selectedObjects.valueHasMutated();
    }

    static select(selection: string, selectionName: string, selectionParent: Field, selectionIndex: number) : void {
        const eagle: Eagle = Eagle.getInstance();

        ParameterTable.selectionName(selectionName);
        ParameterTable.selectionParent(selectionParent);
        ParameterTable.selectionParentIndex(selectionIndex);
        ParameterTable.selection(selection);
        ParameterTable.selectionReadonly(ParameterTable.getCurrentParamValueReadonly(selectionParent));

        $('.parameterTable tr.highlighted').removeClass('highlighted')
    }

    static isSelected(selectionName: string, selectionParent: Field): boolean {
        return ParameterTable.selection() != null && selectionParent == ParameterTable.selectionParent() && ParameterTable.selectionName() == selectionName;
    }

    static resetSelection() : void {
        ParameterTable.selectionParentIndex(-1);
        ParameterTable.selection(null);
    }

    static hasSelection() : boolean {
        return ParameterTable.selectionParentIndex() !== -1;
    }

    // NOTE: Always returns true, so that a CSS class 'resizer' will be applied to an element
    //       I think setting the class and initialising the resizers should be separated, for clarity
    static setUpColumnResizer = (headerId:string) : boolean => {
        // little helper function that sets up resizable columns. this is called by ko on the headers when they are created
        ParameterTable.initiateResizableColumns(headerId)
        return true
    }

    static showEditDescription(description: HTMLElement) : void {
        $(description).find('.parameterTableDescriptionBtn').show()
    }

    static hideEditDescription(description: HTMLElement) : void {
        $(description).find('.parameterTableDescriptionBtn').hide()
    }

    static showEditComment(comment: HTMLElement) : void {
        $(comment).find('.parameterTableCommentBtn').show()
    }

    static hideEditComment(comment: HTMLElement) : void {
        $(comment).find('.parameterTableCommentBtn').hide()
    }

    static initiateBrowseDocker() : void {
        const eagle = Eagle.getInstance()
        $('.modal.show').modal('hide')
        eagle.fetchDockerHTML()
    }

    static getErrorsWarningsAsHtml(field:Field) : string {
        const messages: string[] = [];
        
        field.getErrorsWarnings().errors.forEach(function(error){
            messages.push('||| ' + error.message + ' |||')
        }) 
        field.getErrorsWarnings().warnings.forEach(function(warning){
            messages.push('||| ' + warning.message + ' |||')
        })

        return messages.join('<br><br>');
    }

    static requestAddField(currentField: Field): void {
        this._addRemoveField(currentField, true);
    }

    static requestRemoveField(currentField: Field): void {
        this._addRemoveField(currentField, false);
    }

    static _addRemoveField(currentField: Field, add: boolean): void {
        let graphConfig: GraphConfig = Eagle.getInstance().logicalGraph().getActiveGraphConfig();

        // check if the graph config is being modified
        // if so, proceed as normal
        // if not, then we need to clone the current active graph config and modify the clone

        if (graphConfig){
            if (add){
                graphConfig.addValue(currentField.getNodeId(), currentField.getId(), currentField.getValue())
            } else {
                graphConfig.removeField(currentField);
            }
        } else {
            graphConfig = new GraphConfig();
            Utils.requestUserString("New Configuration", "Enter a name for the new configuration", Utils.generateGraphConfigName(graphConfig), false, (completed : boolean, userString : string) : void => {
                ParameterTable.openTable(Eagle.BottomWindowMode.NodeParameterTable, ParameterTable.SelectType.Normal);

                if (!completed){
                    return;
                }
                if (userString === ""){
                    Utils.showNotification("Invalid name", "Please enter a name for the new object", "danger");
                    return;
                }

                // set name
                graphConfig.setName(userString);

                // add/remove the field that was requested in the first place
                if (add){
                    graphConfig.addValue(currentField.getNodeId(), currentField.getId(), currentField.getValue())
                } else {
                    graphConfig.removeField(currentField);
                }

                //add the graph config to the graph
                Eagle.getInstance().logicalGraph().addGraphConfig(graphConfig)

                // make this config the active config
                Eagle.getInstance().logicalGraph().setActiveGraphConfig(graphConfig.getId());

                //set the graph as modified and take an undo snapshot
                Eagle.getInstance().undo().pushSnapshot(Eagle.getInstance(), "Added field " + currentField.getDisplayText() + ' to config ' + graphConfig.getName());
                Eagle.getInstance().logicalGraph().fileInfo().modified = true;
            });
        }
    }

    static requestEditConfig(config: GraphConfig): void {
        GraphConfigurationsTable.closeModal();
        ParameterTable.openTable(Eagle.BottomWindowMode.ConfigParameterTable, ParameterTable.SelectType.Normal);
    }

    static requestEditDescriptionInModal(field: Field) : void {
        const eagle: Eagle = Eagle.getInstance();
        const node: Node = eagle.selectedNode();

        // check that we can actually find the node that this field belongs to
        if (node === null){
            Utils.showNotification("Warning", "Could not find node containing this field", "warning");
            return;
        }
        
        //check that the user has sufficient permissions to change the field's description
        if(ParameterTable.getNodeLockedState(field)){
            Utils.showNotification("Insufficient Permissions", "Editing permissions are required to be able to edit a field's description.", "warning");
            return
        }

        Utils.requestUserText(
            "Edit Field Description",
            "Please edit the description for: " + node.getName() + ' - ' + field.getDisplayText(),
            field.getDescription(),
            (completed, userText) => {
                // if completed successfully, set the description on the field
                if (completed){
                    field.setDescription(userText);
                }
            }
        )
    }

    static requestEditCommentInModal(currentField:Field) : void {
        const eagle: Eagle = Eagle.getInstance();
        const currentNode: Node = eagle.logicalGraph().findNodeByIdQuiet(currentField.getNodeId());
        const configField: GraphConfigField = eagle.logicalGraph().getActiveGraphConfig().findNodeById(currentNode.getId()).findFieldById(currentField.getId());

        Utils.requestUserText(
            "Edit Field Comment",
            "Please edit the comment for: " + currentNode.getName() + ' - ' + currentField.getDisplayText(),
            configField.getComment(),
            (completed, userText) => {
                // if completed successfully, set the description on the field
                if (completed){
                    configField.setComment(userText);
                }
            }
        )
    }

    static initiateResizableColumns(upId:string) : void {
        //need this one initially to set the mousedown handler

        let upcol: HTMLElement = $('.'+upId)[0]
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
            upcol = $('.'+upId)[0]
            upresizer = $(upcol).find('div')
            downcol = $('.'+upId).next()[0]
            downresizer = $(downcol).find('div')

            //getting the table width for use later to convert the new widths into percentages
            tableWidth = parseInt(window.getComputedStyle($('.paramsTableWrapper')[0]).width,10)

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
    
        //doing it this way because it makes it simpler to have the header in question in hand. the ko events proved difficult to pass events and objects with
        upresizer.on('mousedown', mouseDownHandler);
    }

    static toggleTable = (mode: Eagle.BottomWindowMode, selectType: ParameterTable.SelectType) : void => {
        //if we are already in the requested mode, we can toggle the bottom window
        if(Setting.findValue(Setting.BOTTOM_WINDOW_MODE) === mode){
            SideWindow.toggleShown('bottom')
        }else{
            this.openTable(mode,selectType)
        }
    }

    static openTable = (mode: Eagle.BottomWindowMode, selectType: ParameterTable.SelectType) : void => {
        const eagle: Eagle = Eagle.getInstance();

        //if a modal is open, closed it
        if($('.modal.show').length>0){
            $('.modal.show').modal('hide')
        }

        Setting.find(Setting.BOTTOM_WINDOW_MODE).setValue(mode)

        //open the bottom window
        SideWindow.setShown('bottom',true)

        //make sure the right click menu is closed
        if(selectType === ParameterTable.SelectType.RightClick){
            eagle.setSelection(Eagle.selectedRightClickObject(), Eagle.selectedRightClickLocation())

            RightClick.closeCustomContextMenu(true);
        }
    }
    
    // TODO: can we combine this with openTable(), maybe use an extra parameter to the function?
    static openTableAndSelectField = (node:Node, field:Field) : void => {
        const eagle = Eagle.getInstance()

        eagle.setSelection(node, Eagle.FileType.Graph)

        ParameterTable.openTable(Eagle.BottomWindowMode.NodeParameterTable, ParameterTable.SelectType.Normal);
        
        setTimeout(function(){
            $('#tableRow_'+field.getId()).addClass('highlighted')
        },200)
    }

    static addEmptyTableRow = () : void => {
        let fieldIndex:number
        const selectedNode: Node = Eagle.getInstance().selectedNode();

        if(ParameterTable.hasSelection()){
            // A cell in the table is selected well insert new row instead of adding at the end
            fieldIndex = ParameterTable.selectionParentIndex() + 1
            selectedNode.addEmptyField(fieldIndex)
        }else{
            selectedNode.addEmptyField(-1)

            //getting the length of the array to use as an index to select the last row in the table
            fieldIndex = selectedNode.getFields().length-1;
        }

        //a timeout was necessary to wait for the element to be added before counting how many there are
        setTimeout(function() {
            //handling selecting and highlighting the newly created row
            const clickTarget = $($(".paramsTableWrapper tbody").children()[fieldIndex]).find('.selectionTargets')[0]

            clickTarget.click() //simply clicking the element is best as it also lets knockout handle all of the selection and observable update processes
            clickTarget.focus() // used to focus the field allowing the user to immediately start typing
            $(clickTarget).trigger("select")

            //scroll to new row
            $(".parameterTable .modal-body").animate({
                scrollTop: (fieldIndex*30)
            }, 1000);
        }, 100);
    }

    static getCurrentParamReadonly = (field: Field) : boolean => {
        // check that we actually found the right field, otherwise abort
        if (field === null){
            console.warn("Supplied field is null");
            return false;
        }

        if(Eagle.selectedLocation() === Eagle.FileType.Palette){
            if(Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
                return false;
            }else{
                return field.isReadonly();
            }
        }else{
            if(Setting.findValue(Setting.ALLOW_COMPONENT_EDITING)){
                return false;
            }else{
                return field.isReadonly();
            }
        }
    }

    static getCurrentParamValueReadonly = (field: Field) : boolean => {
        // check that we actually found the right field, otherwise abort
        if (field === null){
            console.warn("Supplied field is null");
            return true;
        }

        if(Eagle.selectedLocation() === Eagle.FileType.Palette && Setting.findValue(Setting.ALLOW_PALETTE_EDITING)){
            return false;
        }
        
        if (Eagle.selectedLocation() != Eagle.FileType.Palette && Setting.findValue(Setting.ALLOW_COMPONENT_EDITING)){
            return false;
        }
        
        if(Setting.findValue(Setting.VALUE_EDITING_PERMS) === Setting.ValueEditingPermission.ReadOnly){
            return false;
        }
        if(Setting.findValue(Setting.VALUE_EDITING_PERMS) === Setting.ValueEditingPermission.Normal){
            return field.isReadonly();
        }
        if(Setting.findValue(Setting.VALUE_EDITING_PERMS) === Setting.ValueEditingPermission.ConfigOnly){
            return field.isReadonly();
        }
        
        console.warn("something in value readonly permissions has gone wrong!");
        return true
    }
}

export namespace ParameterTable {
    export enum Mode {
        NodeFields = "NodeFields", //node fields table
        GraphConfig = "GraphConfig", //graph config fields table
    }

    export enum SelectType {
        Normal = "Normal",
        RightClick = "RightClick",
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
    private encoding:ko.Observable<boolean>
    private flags:ko.Observable<boolean>
    private actions:ko.Observable<boolean>

    constructor(uiModeName:string, keyAttribute:boolean, displayText:boolean,fieldId:boolean,value:boolean,readOnly:boolean,defaultValue:boolean,description:boolean,type:boolean,parameterType:boolean,usage:boolean,encoding:boolean,flags:boolean,actions:boolean){

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
        this.encoding = ko.observable(encoding);
        this.flags = ko.observable(flags);
        this.actions = ko.observable(actions);

    }

    getVisibilities = () : this => {
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

    private setEncoding = (value:boolean) : void => {
        this.encoding(value);
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

    private toggleEncoding = () : void => {
        this.encoding(!this.encoding());
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
                encoding : columnVis.encoding(),
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
            columnVisibilitiesObjArray.forEach(function(columnVisibility){

                const columnVisActual:ColumnVisibilities = that.getModeByName(columnVisibility.name)
                if(columnVisibility.keyAttribute != null){
                    columnVisActual.setKeyAttribute(columnVisibility.keyAttribute)
                }
                if(columnVisibility.displayText != null){
                    columnVisActual.setDisplayText(columnVisibility.displayText)
                }
                if(columnVisibility.fieldId != null){
                    columnVisActual.setFieldId(columnVisibility.fieldId)
                }
                if(columnVisibility.value != null){
                    columnVisActual.setValue(columnVisibility.value)
                }
                if(columnVisibility.readOnly != null){
                    columnVisActual.setReadOnly(columnVisibility.readOnly)
                }
                if(columnVisibility.defaultValue != null){
                    columnVisActual.setDefaultValue(columnVisibility.defaultValue)
                }
                if(columnVisibility.description != null){
                    columnVisActual.setDescription(columnVisibility.description)
                }
                if(columnVisibility.type != null){
                    columnVisActual.setType(columnVisibility.type)
                }
                if(columnVisibility.parameterType != null){
                    columnVisActual.setParameterType(columnVisibility.parameterType)
                }
                if(columnVisibility.usage != null){
                    columnVisActual.setUsage(columnVisibility.usage)
                }
                if(columnVisibility.encoding != null){
                    columnVisActual.setEncoding(columnVisibility.encoding)
                }
                if(columnVisibility.flags != null){
                    columnVisActual.setFlags(columnVisibility.flags)
                }
                if(columnVisibility.actions != null){
                    columnVisActual.setActions(columnVisibility.actions)
                }
            })
        }
    }
}


// name, keyAttribute,displayText,value,readOnly,defaultValue,description,type,parameterType,usage,flags,actions
const columnVisibilities : ColumnVisibilities[] = [
    new ColumnVisibilities("Student", false, true,false,true,true,false,false,false,false,false,false,false,false),
    new ColumnVisibilities("Minimal", true, true,false,true,true,false,false,false,false,false,false,true,false),
    new ColumnVisibilities("Graph", true, true,false,true,true,true,false,true,true,true,false,true,true),
    new ColumnVisibilities("Component", true, true,false,true,true,true,true,true,true,true,false,true,true),
    new ColumnVisibilities("Expert", true, true,false,true,true,true,true,true,true,true,true,true,true)
]