import * as ko from "knockout";

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

export class ParameterTable {

    static mode: ko.Observable<ParameterTable.Mode>;
    static selectionParent : ko.Observable<Field | null>; // row in the parameter table that is currently selected
    static selectionParentIndex : ko.Observable<number> // id of the selected field
    static selection : ko.Observable<string | null>; // cell in the parameter table that is currently selected
    static selectionName : ko.Observable<string>; // name of selected parameter in field
    static selectionReadonly : ko.Observable<boolean> // check if selection is readonly

    static activeColumnVisibility : ColumnVisibilities;

    static tableHeaderX : any;
    static tableHeaderW : any;

    static init(){
        ParameterTable.mode = ko.observable(ParameterTable.Mode.GraphConfig);

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

    static inMode = (mode: ParameterTable.Mode): boolean => {
        return mode === ParameterTable.mode();
    }

    static formatTableInspectorSelection = () : string => {
        if (ParameterTable.selection() === null){
            return "";
        }

        return ParameterTable.selectionParent().getDisplayText() + " - " + ParameterTable.selectionName();
    }

    static formatTableInspectorValue = () : string => {
        if (ParameterTable.selection() === null){
            return "";
        }

        return ParameterTable.selection();
    }

    static tableEnterShortcut = (event: Event) : void => {

        //if the table parameter search bar is selected
        if($('#parameterTableModal .componentSearchBar')[0] === event.target){
            const targetCell = $('#parameterTableModal td.column_Value').first().children().first()
            targetCell.trigger("focus");
            $('.selectedTableParameter').removeClass('selectedTableParameter')
            targetCell.parent().addClass('selectedTableParameter')
        }else if ($(event.target).closest('.columnCell')){

            //if a cell in the table is currently selected, enter will select the next cell down

            //we are getting the class name of the current column's cell eg. column_Description
            const classes = $(event.target).closest('.columnCell').attr('class').split(' ')
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

        switch (ParameterTable.mode()){
            case ParameterTable.Mode.NodeFields:
                return eagle.selectedNode()?.getFields();
            
            case ParameterTable.Mode.GraphConfig:
                const config: GraphConfig = eagle.currentConfig();
                const lg: LogicalGraph = eagle.logicalGraph();
                const displayedFields: Field[] = [];

                if (!config){
                    return [];
                }

                for (const node of config.getNodes()){
                    const lgNode = lg.findNodeById(node.getId());
        
                    if (lgNode === null){
                        console.warn("ParameterTable.getTableFields(): Could not find node", node.getId());
                        continue;
                    }
        
                    for (const field of node.getFields()){
                        const lgField = lgNode.findFieldById(field.getId());
        
                        if (lgField === null){
                            console.warn("ParameterTable.getTableFields(): Could not find field", field.getId(), "on node", lgNode.getName());
                            continue;
                        }
        
                        displayedFields.push(lgField);
                    }
                }

                return displayedFields;
        }
    }, this);

    // TODO: move to Eagle.ts?
    //       doesn't seem to depend on any ParameterTable state, only Eagle state
    static getNodeLockedState = (field:Field) : boolean => {
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
        ParameterTable.selectionReadonly(eagle.getCurrentParamValueReadonly(selectionParent));

        $('#parameterTableModal tr.highlighted').removeClass('highlighted')
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
        let result:string = ''
        
        field.getErrorsWarnings().errors.forEach(function(error){
            result += error.message+'<br><br>'
        }) 
        field.getErrorsWarnings().warnings.forEach(function(warning){
            result += warning.message+'<br><br>'

        })

        return result
    }

    static requestAddField(currentField: Field): void {
        const graphConfig: GraphConfig = Eagle.getInstance().currentConfig();

        graphConfig.addField(currentField);

        if (graphConfig.getName() === ""){

            ParameterTable.closeModal();

            Utils.requestUserString("New Configuration", "Enter a name for the new configuration", "New Config", false, (completed : boolean, userString : string) : void => {
                ParameterTable.openModal(ParameterTable.mode(), ParameterTable.SelectType.Normal);

                if (!completed){
                    return;
                }
                if (userString === ""){
                    Utils.showNotification("Invalid name", "Please enter a name for the new object", "danger");
                    return;
                }

                graphConfig.setName(userString);
                graphConfig.setIsModified(true);
            });
        }
    }

    static requestEditDescriptionInModal(currentField:Field) : void {
        const currentNode: Node = Eagle.getInstance().logicalGraph().findNodeByKeyQuiet(currentField.getNodeKey());

        //ParameterTable.openModal(ParameterTable.Mode.Unknown, ParameterTable.SelectType.Normal);
        ParameterTable.closeModal();

        Utils.requestUserText(
            "Edit Field Description",
            "Please edit the description for: " + currentNode.getName() + ' - ' + currentField.getDisplayText(),
            currentField.getDescription(),
            (completed, userText) => {
                // if completed successfully, set the description on the field
                if (completed){
                    currentField.setDescription(userText);
                }

                // always re-open the ParameterTable
                ParameterTable.openModal(ParameterTable.mode(), ParameterTable.SelectType.Normal);
            }
        )
    }

    static requestEditCommentInModal(currentField:Field) : void {
        const currentNode: Node = Eagle.getInstance().logicalGraph().findNodeByKeyQuiet(currentField.getNodeKey());
        const configField: GraphConfigField = Eagle.getInstance().currentConfig().findNodeById(currentNode.getId()).findFieldById(currentField.getId());

        //ParameterTable.openModal(ParameterTable.Mode.Unknown, ParameterTable.SelectType.Normal);
        ParameterTable.closeModal();

        Utils.requestUserText(
            "Edit Field Comment",
            "Please edit the comment for: " + currentNode.getName() + ' - ' + currentField.getDisplayText(),
            configField.getComment(),
            (completed, userText) => {
                // if completed successfully, set the description on the field
                if (completed){
                    configField.setComment(userText);
                }

                // always re-open the ParameterTable
                ParameterTable.openModal(ParameterTable.mode(), ParameterTable.SelectType.Normal);
            }
        )
    }

    static initiateResizableColumns(upId:string) : void {
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
        
            //doing it this way because it makes it simpler to have the header in question in hand. the ko events proved difficult to pass events and objects with
            upresizer.on('mousedown', mouseDownHandler);
    }

    static openModal = (mode: ParameterTable.Mode, selectType: ParameterTable.SelectType) : void => {
        const eagle: Eagle = Eagle.getInstance();

        eagle.showEagleIsLoading()

        setTimeout(function(){
            if($('.modal.show').length>0){
                if($('.modal.show').attr('id')==='parameterTableModal'){
                    // TODO: use closeModal here!
                    $('#parameterTableModal').modal('hide')
                    eagle.showTableModal(false)
                }else{
                    return
                }
            }
            if(selectType === ParameterTable.SelectType.RightClick){
                eagle.setSelection(Eagle.RightWindowMode.Inspector, Eagle.selectedRightClickObject(), Eagle.selectedRightClickLocation())

                RightClick.closeCustomContextMenu(true);

                setTimeout(function() {
                    Utils.showOpenParamsTableModal(mode);
                }, 30);
            }else{
                if (mode=== ParameterTable.Mode.NodeFields && !eagle.selectedNode()){
                    eagle.hideEagleIsLoading()
                    Utils.showNotification("Error", "No Node Is Selected", "warning");
                }else{
                    Utils.showOpenParamsTableModal(mode);
                }
            }
            eagle.showTableModal(true)

        },5)
    }
    
    // TODO: can we combine this with openModal(), maybe use an extra parameter to the function?
    static openModalAndSelectField = (node:Node, field:Field) : void => {
        const eagle = Eagle.getInstance()

        eagle.setSelection(Eagle.RightWindowMode.None, node,Eagle.FileType.Graph)

        ParameterTable.openModal(ParameterTable.Mode.NodeFields, ParameterTable.SelectType.Normal);
        
        setTimeout(function(){
            $('#tableRow_'+field.getId()).addClass('highlighted')
        },200)
    }

    static closeModal = (): void => {
        $('#parameterTableModal').modal('hide')
        Eagle.getInstance().showTableModal(false)
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
            const clickTarget = $($("#paramsTableWrapper tbody").children()[fieldIndex]).find('.selectionTargets')[0]

            clickTarget.click() //simply clicking the element is best as it also lets knockout handle all of the selection and observable update processes
            clickTarget.focus() // used to focus the field allowing the user to immediately start typing
            $(clickTarget).trigger("select")

            //scroll to new row
            $("#parameterTableModal .modal-body").animate({
                scrollTop: (fieldIndex*30)
            }, 1000);
        }, 100);
    }
}

export namespace ParameterTable {
    export enum Mode {
        NodeFields = "NodeFields", //inspectorTableModal
        GraphConfig = "GraphConfig", //keyParametersTableModal
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
                if(columnVisibility.keyAttribute){
                    columnVisActual.setKeyAttribute(columnVisibility.keyAttribute)
                }
                if(columnVisibility.displayText){
                    columnVisActual.setDisplayText(columnVisibility.displayText)
                }
                if(columnVisibility.fieldId){
                    columnVisActual.setFieldId(columnVisibility.fieldId)
                }
                if(columnVisibility.value){
                    columnVisActual.setValue(columnVisibility.value)
                }
                if(columnVisibility.readOnly){
                    columnVisActual.setReadOnly(columnVisibility.readOnly)
                }
                if(columnVisibility.defaultValue){
                    columnVisActual.setDefaultValue(columnVisibility.defaultValue)
                }
                if(columnVisibility.description){
                    columnVisActual.setDescription(columnVisibility.description)
                }
                if(columnVisibility.type){
                    columnVisActual.setType(columnVisibility.type)
                }
                if(columnVisibility.parameterType){
                    columnVisActual.setParameterType(columnVisibility.parameterType)
                }
                if(columnVisibility.usage){
                    columnVisActual.setUsage(columnVisibility.usage)
                }
                if(columnVisibility.encoding){
                    columnVisActual.setEncoding(columnVisibility.encoding)
                }
                if(columnVisibility.flags){
                    columnVisActual.setFlags(columnVisibility.flags)
                }
                if(columnVisibility.actions){
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