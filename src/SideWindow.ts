import * as ko from "knockout";

import { Eagle } from './Eagle';
import { Utils } from './Utils';
import { Setting } from "./Setting";
import { UiModeSystem } from "./UiModes";

export class SideWindow {
    // The width remains on the sidewindow, this is because when we are dragging the width of a side window, there are frequent changes to the width. 
    // We dont want these rapid changes to affect the setting and be saved into local storage, until we stop dragging.
    width : ko.Observable<number>;
    adjusting : ko.Observable<boolean>;

    constructor(width : number){
        this.width = ko.observable(width);
        this.adjusting = ko.observable(false);
    }

    static toggleShown = (isLeft:boolean): void => {
        SideWindow.toggleTransition()

        if(isLeft){
            Setting.find(Setting.LEFT_WINDOW_VISIBLE).toggle()
        }else{
            Setting.find(Setting.RIGHT_WINDOW_VISIBLE).toggle()
        }
        UiModeSystem.saveToLocalStorage()
    }

    static setShown = (isLeft:boolean,value:boolean): void => {
        SideWindow.toggleTransition()

        if(isLeft){
            Setting.setValue(Setting.LEFT_WINDOW_VISIBLE,value)
        }else{
            Setting.setValue(Setting.RIGHT_WINDOW_VISIBLE,value)
        }
        UiModeSystem.saveToLocalStorage()
    }

    static toggleTransition = (): void => {
        //we are toggling the visibility of the left or right window
        //but we also need to temporarily add a transition effect to the statusBar so it moves as one with the window
        $('#statusBar').addClass('linearTransition250')
        $('#inspector').addClass('linearTransition250')

        setTimeout(function(){
            $('#statusBar').removeClass('linearTransition250')
            $('#inspector').removeClass('linearTransition250')
        },300)
    }

    // drag drop
    static nodeDragStart = (node: Node, e : any) : boolean => {
        const eagle: Eagle = Eagle.getInstance();

        //for hiding any tooltips while dragging and preventing them from showing
        eagle.draggingPaletteNode = true;
        $(e.target).find('.input-group').tooltip('hide');

        // retrieve data about the node being dragged
        // NOTE: I found that using $(e.target).data('palette-index'), using JQuery, sometimes retrieved a cached copy of the attribute value, which broke this functionality
        //       Using the native javascript works better, it always fetches the current value of the attribute

        //this is for dealing with drag and drop actions while there is already one ore more palette components selected
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){

            const paletteIndex = $(e.target).data("palette-index")
            const componentIndex = $(e.target).data("component-index")
            const draggedNode = eagle.palettes()[paletteIndex].getNodes()[componentIndex]

            if(!eagle.objectIsSelected(draggedNode)){
                $(e.target).find("div").trigger("click")
            }
        }

        Eagle.nodeDragPaletteIndex = parseInt(e.target.getAttribute('data-palette-index'), 10);
        Eagle.nodeDragComponentIndex = parseInt(e.target.getAttribute('data-component-index'), 10);

        // discourage the rightWindow and navbar as drop targets
        $(".rightWindow").addClass("noDropTarget");
        $(".navbar").addClass("noDropTarget");

        // grab and set the node's icon and sets it as drag image.
        const drag = e.target.getElementsByClassName('input-group-prepend')[0] as HTMLElement;
        (<DragEvent> e.originalEvent).dataTransfer.setDragImage(drag, 0, 0);

        return true;
    }

    static nodeDragEnd() : boolean {
        const eagle: Eagle = Eagle.getInstance();
        eagle.draggingPaletteNode = false;

        $(".rightWindow").removeClass("noDropTarget");
        $(".navbar").removeClass("noDropTarget");
        Eagle.nodeDragPaletteIndex = null;
        Eagle.nodeDragComponentIndex = null;

        return true;
    }

    static nodeDragOver() : boolean {
        return false;
    }

    static rightWindowAdjustStart(eagle: Eagle, event: JQuery.TriggeredEvent) : boolean {
        const e: DragEvent = event.originalEvent as DragEvent;

        $(e.target).addClass('windowDragging')
        Eagle.dragStartX = e.clientX;
        eagle.leftWindow().adjusting(false);
        eagle.rightWindow().adjusting(true);

        return true;
    }

    // workaround to avoid left or right window adjusting on any and all drag events
    static sideWindowAdjustEnd = (eagle: Eagle, event: JQuery.TriggeredEvent) : boolean => {
        const e: DragEvent = event.originalEvent as DragEvent;

        $(e.target).removeClass('windowDragging')
        eagle.leftWindow().adjusting(false);
        eagle.rightWindow().adjusting(false);

        return true;
    }

    static sideWindowAdjust(eagle: Eagle, event: JQuery.TriggeredEvent) : boolean {
        const e: DragEvent = event.originalEvent as DragEvent;

        // workaround to avoid final dragEvent at 0,0!
        if (e.clientX === 0){
            return true;
        }

        if (isNaN(eagle.leftWindow().width())){
            console.warn("Had to reset left window width from invalid state (NaN)!");
            eagle.leftWindow().width(Setting.find(Setting.LEFT_WINDOW_WIDTH_KEY).getPerpetualDefaultVal());
        }
        if (isNaN(eagle.rightWindow().width())){
            console.warn("Had to reset right window width from invalid state (NaN)!");
            eagle.rightWindow().width(Setting.find(Setting.RIGHT_WINDOW_WIDTH_KEY).getPerpetualDefaultVal());
        }

        const dragDiff : number = e.clientX - Eagle.dragStartX;
        let newWidth : number;

        if (eagle.leftWindow().adjusting()){
            newWidth = eagle.leftWindow().width() + dragDiff;
            if(newWidth <= Setting.find(Setting.LEFT_WINDOW_WIDTH_KEY).getPerpetualDefaultVal()){
                eagle.leftWindow().width(Setting.find(Setting.LEFT_WINDOW_WIDTH_KEY).getPerpetualDefaultVal());
                Utils.setLeftWindowWidth(Setting.find(Setting.LEFT_WINDOW_WIDTH_KEY).getPerpetualDefaultVal());
            }else{
                eagle.leftWindow().width(newWidth);
                Utils.setLeftWindowWidth(newWidth);
            }
        } else if(eagle.rightWindow().adjusting()) {
            newWidth = eagle.rightWindow().width() - dragDiff;
            if(newWidth <= Setting.find(Setting.RIGHT_WINDOW_WIDTH_KEY).getPerpetualDefaultVal()){
                eagle.rightWindow().width(Setting.find(Setting.RIGHT_WINDOW_WIDTH_KEY).getPerpetualDefaultVal());
                Utils.setRightWindowWidth(Setting.find(Setting.RIGHT_WINDOW_WIDTH_KEY).getPerpetualDefaultVal());
            }else{
                eagle.rightWindow().width(newWidth);
                Utils.setRightWindowWidth(newWidth);
            }
        }

        Eagle.dragStartX = e.clientX;

        return true;
    }

    static leftWindowAdjustStart(eagle : Eagle, event : JQuery.TriggeredEvent) : boolean {
        const e: DragEvent = event.originalEvent as DragEvent;

        $(e.target).addClass('windowDragging')
        Eagle.dragStartX = e.clientX;
        eagle.leftWindow().adjusting(true);
        eagle.rightWindow().adjusting(false);

        return true;
    }
}