import * as ko from "knockout";

import {Config} from './Config';
import {Eagle} from './Eagle';
import {Utils} from './Utils';

export class SideWindow {
    shown : ko.Observable<boolean>;
    mode : ko.Observable<Eagle.LeftWindowMode | Eagle.RightWindowMode>;
    width : ko.Observable<number>;
    adjusting : ko.Observable<boolean>;

    constructor(mode : Eagle.LeftWindowMode | Eagle.RightWindowMode, width : number, shown : boolean){
        this.shown = ko.observable(shown);
        this.mode = ko.observable(mode);
        this.width = ko.observable(width);
        this.adjusting = ko.observable(false);
    }

    toggleShown = (): void => {
        this.shown(!this.shown());
    }

    // dragdrop
    static nodeDragStart = (eagle : Eagle, e : JQueryEventObject) : boolean => {
        // retrieve data about the node being dragged
        // NOTE: I found that using $(e.target).data('palette-index'), using JQuery, sometimes retrieved a cached copy of the attribute value, which broke this functionality
        //       Using the native javascript works better, it always fetches the current value of the attribute

        //this is for dealing with drag and drop actions while there is already one ore more palette components selected
        if (Eagle.selectedLocation() === Eagle.FileType.Palette){

            const paletteIndex = $(e.target).data("palette-index")
            const componentIndex = $(e.target).data("component-index")
            const draggedNode = eagle.palettes()[paletteIndex].getNodes()[componentIndex]

            if(!eagle.objectIsSelected(draggedNode)){
                $(e.target).find("div").click()
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

    static nodeDragEnd = () : boolean => {
        $(".rightWindow").removeClass("noDropTarget");
        $(".navbar").removeClass("noDropTarget");
        return true;
    }

    static nodeDragOver = () : boolean => {
        return false;
    }

    static rightWindowAdjustStart = (eagle : Eagle, e : JQueryEventObject) : boolean => {
        Eagle.dragStartX = e.clientX;
        eagle.leftWindow().adjusting(false);
        eagle.rightWindow().adjusting(true);

        return true;
    }

    // workaround to avoid left or right window adjusting on any and all drag events
    static sideWindowAdjustEnd = (eagle: Eagle) : boolean => {
        eagle.leftWindow().adjusting(false);
        eagle.rightWindow().adjusting(false);

        return true;
    }

    static sideWindowAdjust = (eagle : Eagle, e : JQueryEventObject) : boolean => {
        // workaround to avoid final dragEvent at 0,0!
        if (e.clientX === 0){
            return true;
        }

        if (isNaN(eagle.leftWindow().width())){
            console.warn("Had to reset left window width from invalid state (NaN)!");
            eagle.leftWindow().width(Config.defaultLeftWindowWidth);
        }
        if (isNaN(eagle.rightWindow().width())){
            console.warn("Had to reset right window width from invalid state (NaN)!");
            eagle.rightWindow().width(Config.defaultRightWindowWidth);
        }

        const dragDiff : number = e.clientX - Eagle.dragStartX;
        let newWidth : number;

        if (eagle.leftWindow().adjusting()){
            newWidth = eagle.leftWindow().width() + dragDiff;
            if(newWidth <= Config.defaultLeftWindowWidth){
                eagle.leftWindow().width(Config.defaultLeftWindowWidth);
                Utils.setLeftWindowWidth(Config.defaultLeftWindowWidth);
            }else{
                eagle.leftWindow().width(newWidth);
                Utils.setLeftWindowWidth(newWidth);
            }
        } else if(eagle.rightWindow().adjusting()) {
            newWidth = eagle.rightWindow().width() - dragDiff;
            if(newWidth <= Config.defaultRightWindowWidth){
                eagle.rightWindow().width(Config.defaultRightWindowWidth);
                Utils.setRightWindowWidth(Config.defaultRightWindowWidth);
            }else{
                eagle.rightWindow().width(newWidth);
                Utils.setRightWindowWidth(newWidth);
            }
        }

        Eagle.dragStartX = e.clientX;

        return true;
    }

    static leftWindowAdjustStart = (eagle : Eagle, e : JQueryEventObject) : boolean => {
        Eagle.dragStartX = e.clientX;
        eagle.leftWindow().adjusting(true);
        eagle.rightWindow().adjusting(false);

        return true;
    }
}
