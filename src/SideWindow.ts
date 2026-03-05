import * as ko from "knockout";

import { Eagle } from './Eagle';
import { Utils } from './Utils';
import { Setting } from "./Setting";
import { UiModeSystem } from "./UiModes";
import { GraphRenderer } from "./GraphRenderer";
import { TutorialSystem } from "./Tutorial";

export class SideWindow {
    // The width remains on the sideWindow, this is because when we are dragging the width of a side window, there are frequent changes to the width. 
    // We don't want these rapid changes to affect the setting and be saved into local storage, until we stop dragging.
    size : ko.Observable<number>;
    adjusting : ko.Observable<boolean>;

    constructor(size : number){
        this.size = ko.observable(size);
        this.adjusting = ko.observable(false);
    }

    static toggleShown = (window: "left"|"right"|"bottom"): void => {
        if(TutorialSystem.activeTut){
            //if a tutorial is active, the arrow keys are used for navigating through steps
            return
        }

        // don't allow toggle if palette and graph editing are disabled
        const editingAllowed: boolean = Setting.findValue<boolean>(Setting.ALLOW_PALETTE_EDITING, false) || Setting.findValue<boolean>(Setting.ALLOW_GRAPH_EDITING, false);
        if (window === "left" && !editingAllowed){
            Utils.notifyUserOfEditingIssue(Eagle.FileType.Unknown, "Toggle Window");
            return;
        }
        
        SideWindow.toggleTransition()

        if(window === 'left'){
            Setting.toggle(Setting.LEFT_WINDOW_VISIBLE);
        }else if (window === 'right'){
            Setting.toggle(Setting.RIGHT_WINDOW_VISIBLE);
        }else if (window === 'bottom'){
            Setting.toggle(Setting.BOTTOM_WINDOW_VISIBLE);
        }else{
            console.warn("toggleShown(): Unknown window:", window);
            return;
        }
        UiModeSystem.saveToLocalStorage()
    }

    static setShown = (window:"left"|"right"|"bottom", value:boolean): void => {
        SideWindow.toggleTransition()

        if(window === 'left'){
            Setting.setValue(Setting.LEFT_WINDOW_VISIBLE, value);
        }else if(window === 'right'){
            Setting.setValue(Setting.RIGHT_WINDOW_VISIBLE, value);
        }else if (window === 'bottom'){
            Setting.setValue(Setting.BOTTOM_WINDOW_VISIBLE, value);
        }else{
            console.warn("setShown(): Unknown window:", window);
            return;
        }
        UiModeSystem.saveToLocalStorage()
    }

    static toggleTransition = (): void => {
        //we are toggling the visibility of the left or right window
        //but we also need to temporarily add a transition effect to the statusBar so it moves as one with the window
        $('#statusBar').addClass('linearTransition250')
        $('#inspector').addClass('linearTransition250')
        $('.rightWindow').addClass('linearTransition250')
        $('.leftWindow').addClass('linearTransition250')
        $('.bottomWindow').addClass('linearTransition250')

        setTimeout(function(){
            $('#statusBar').removeClass('linearTransition250')
            $('#inspector').removeClass('linearTransition250')
            $('.rightWindow').removeClass('linearTransition250')
            $('.leftWindow').removeClass('linearTransition250')
            $('.bottomWindow').removeClass('linearTransition250')
        },250)
    }

    // drag drop
    static nodeDragStart = (node: Node, e: JQuery.TriggeredEvent) : boolean => {
        const eagle: Eagle = Eagle.getInstance();

        //for hiding any tooltips while dragging and preventing them from showing
        GraphRenderer.draggingPaletteNode = true;
        $(e.target).find('.input-group').tooltip('hide');

        // retrieve data about the node being dragged
        // NOTE: I found that using $(e.target).data('palette-index'), using JQuery, sometimes retrieved a cached copy of the attribute value, which broke this functionality
        //       Using the native javascript works better, it always fetches the current value of the attribute
        const componentId = e.target.getAttribute('data-component-id');
        const paletteIndex = e.target.getAttribute('data-palette-index');

        if (componentId === null || paletteIndex === null){
            console.warn("SideWindow.nodeDragStart(): data-component-id or data-palette-index is null!");
            return false;
        }

        Eagle.nodeDragPaletteIndex = parseInt(paletteIndex, 10);
        Eagle.nodeDragComponentId = componentId;

        //this is for dealing with drag and drop actions while there is already one or more palette components selected
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){
            const draggedNode = eagle.palettes()[Eagle.nodeDragPaletteIndex].getNodeById(componentId);

            if (typeof draggedNode === 'undefined'){
                console.warn("Dragged node is undefined! Palette Index:", paletteIndex, "Component ID:", componentId);
                return false;
            }

            if(!eagle.objectIsSelected(draggedNode)){
                $(e.target).find("div").trigger("click")
            }
        }

        // discourage the rightWindow and navbar as drop targets
        $(".rightWindow").addClass("noDropTarget");
        $(".navbar").addClass("noDropTarget");

        // grab and set the node's icon and sets it as drag image.
        const drag = e.target.getElementsByClassName('input-group-prepend')[0] as HTMLElement;
        const dataTransfer = (e.originalEvent as DragEvent).dataTransfer;

        if (dataTransfer === null){
            console.warn("SideWindow.nodeDragStart(): dataTransfer is null!");
            return false;
        }

        dataTransfer.setDragImage(drag, 0, 0);

        return true;
    }

    static nodeDragEnd() : boolean {
        GraphRenderer.draggingPaletteNode = false;

        $(".rightWindow").removeClass("noDropTarget");
        $(".navbar").removeClass("noDropTarget");
        Eagle.nodeDragPaletteIndex = null;
        Eagle.nodeDragComponentId = null;

        return true;
    }

    static nodeDragOver() : boolean {
        return false;
    }

    static rightWindowAdjustStart(eagle: Eagle, event: JQuery.TriggeredEvent) : boolean {
        const e: DragEvent = event.originalEvent as DragEvent;

        if (e.target === null){
            console.warn("SideWindow.rightWindowAdjustStart(): DragEvent is null!");
            return false;
        }
        $(e.target).addClass('windowDragging')
        eagle.leftWindow().adjusting(false);
        eagle.rightWindow().adjusting(true);

        return true;
    }

    static leftWindowAdjustStart(eagle : Eagle, event : JQuery.TriggeredEvent) : boolean {
        const e: DragEvent = event.originalEvent as DragEvent;

        if (e.target === null){
            console.warn("SideWindow.leftWindowAdjustStart(): DragEvent is null!");
            return false;
        }

        $(e.target).addClass('windowDragging')
        eagle.leftWindow().adjusting(true);
        eagle.rightWindow().adjusting(false);

        return true;
    }

    static bottomWindowAdjustStart(eagle: Eagle, event: JQuery.TriggeredEvent) : boolean {
        const e: DragEvent = event.originalEvent as DragEvent;

        if (e.target === null){
            console.warn("SideWindow.bottomWindowAdjustStart(): DragEvent is null!");
            return false;
        }

        $(e.target).addClass('windowDragging')
        eagle.leftWindow().adjusting(false);
        eagle.rightWindow().adjusting(false);
        eagle.bottomWindow().adjusting(true)

        $('#statusBar').css('pointer-events','none')

        return true;
    }

    // workaround to avoid left or right window adjusting on any and all drag events
    static sideWindowAdjustEnd = (eagle: Eagle, event: JQuery.TriggeredEvent) : boolean => {
        const e: DragEvent = event.originalEvent as DragEvent;

        if (e.target === null){
            console.warn("SideWindow.sideWindowAdjustEnd(): DragEvent is null!");
            return false;
        }

        $(e.target).removeClass('windowDragging')
        eagle.leftWindow().adjusting(false);
        eagle.rightWindow().adjusting(false);
        eagle.bottomWindow().adjusting(false)

        $('#statusBar').css('pointer-events','')

        return true;
    }

    static sideWindowAdjust(eagle: Eagle, event: JQuery.TriggeredEvent) : boolean {
        const e: DragEvent = event.originalEvent as DragEvent;

        // workaround to avoid final dragEvent at 0,0!
        if (e.clientX === 0 || e.clientY === 0){
            return true;
        }

        // get window settings
        const leftWindowWidthSetting = Setting.find(Setting.LEFT_WINDOW_WIDTH);
        const rightWindowWidthSetting = Setting.find(Setting.RIGHT_WINDOW_WIDTH);
        const bottomWindowHeightSetting = Setting.find(Setting.BOTTOM_WINDOW_HEIGHT);

        if (typeof leftWindowWidthSetting === "undefined" || typeof rightWindowWidthSetting === "undefined" || typeof bottomWindowHeightSetting === "undefined"){
            console.warn("One or more window settings are undefined!");
            return false;
        }

        const leftWindowWidth : number = leftWindowWidthSetting.value() as number;
        const rightWindowWidth : number = rightWindowWidthSetting.value() as number;
        const bottomWindowHeight : number = bottomWindowHeightSetting.value() as number;

        if (isNaN(eagle.leftWindow().size())){
            console.warn("Had to reset left window width from invalid state (NaN)!");
            eagle.leftWindow().size(leftWindowWidth);
        }
        if (isNaN(eagle.rightWindow().size())){
            console.warn("Had to reset right window width from invalid state (NaN)!");
            eagle.rightWindow().size(rightWindowWidth);
        }
        if (isNaN(eagle.bottomWindow().size())){
            console.warn("Had to reset bottom window height from invalid state (NaN)!");
            eagle.bottomWindow().size(bottomWindowHeight);
        }
    
        let newSize : number;

        if (eagle.leftWindow().adjusting()){
            newSize = e.clientX

            if(newSize <= leftWindowWidth){
                eagle.leftWindow().size(leftWindowWidth);
                Utils.setLeftWindowWidth(leftWindowWidth);
            }else{
                eagle.leftWindow().size(newSize);
                Utils.setLeftWindowWidth(newSize);
            }
        } else if(eagle.rightWindow().adjusting()){
            newSize = window.innerWidth - e.clientX

            if(newSize <= rightWindowWidth){
                eagle.rightWindow().size(rightWindowWidth);
                Utils.setRightWindowWidth(rightWindowWidth);
            }else{
                eagle.rightWindow().size(newSize);
                Utils.setRightWindowWidth(newSize);
            }
        }else if(eagle.bottomWindow().adjusting()){
            //converting height values to VH (percentage of the browser window). this is to prevent issues when switching from a large to a smaller screen.
            //we are only doing it for the bottom window, as it typically takes up a large part of the screen, causing it to become larger than the screen itself if switching from a 4k display to a smaller one.
            newSize = ((window.innerHeight - e.clientY)/window.innerHeight)*100
            //making sure the height we are setting is not smaller than the minimum height
            const minBottomWindowVh = bottomWindowHeight;
            const maxBottomWindowVh = 80

            if(newSize <= minBottomWindowVh){
                eagle.bottomWindow().size(minBottomWindowVh);
                Utils.setBottomWindowHeight(minBottomWindowVh);
            }else if(newSize>maxBottomWindowVh){
                eagle.bottomWindow().size(maxBottomWindowVh);
                Utils.setBottomWindowHeight(maxBottomWindowVh)
            }else{
                eagle.bottomWindow().size(newSize);
                Utils.setBottomWindowHeight(newSize);
            }
        }

        return true;
    }
}