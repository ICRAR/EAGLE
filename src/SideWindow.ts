import * as ko from "knockout";

import { Eagle } from './Eagle';
import { Utils } from './Utils';
import { Setting } from "./Setting";
import { UiModeSystem } from "./UiModes";
import { GraphRenderer } from "./GraphRenderer";
import { Tutorial, TutorialSystem } from "./Tutorial";

export class SideWindow {
    // The width remains on the sidewindow, this is because when we are dragging the width of a side window, there are frequent changes to the width. 
    // We dont want these rapid changes to affect the setting and be saved into local storage, until we stop dragging.
    size : ko.Observable<number>;
    adjusting : ko.Observable<boolean>;

    constructor(size : number){
        this.size = ko.observable(size);
        this.adjusting = ko.observable(false);
    }

    static toggleShown = (window:string): void => {
        if(TutorialSystem.activeTut){
            //if a tutorial is active, the arrow keys are used for navigating through steps
            return
        }
        
        SideWindow.toggleTransition()

        if(window === 'left'){
            Setting.find(Setting.LEFT_WINDOW_VISIBLE).toggle()
        }else if (window === 'right'){
            Setting.find(Setting.RIGHT_WINDOW_VISIBLE).toggle()
        }else{
            Setting.find(Setting.BOTTOM_WINDOW_VISIBLE).toggle()
        }
        UiModeSystem.saveToLocalStorage()
    }

    static setShown = (window:string,value:boolean): void => {
        SideWindow.toggleTransition()

        if(window === 'left'){
            Setting.setValue(Setting.LEFT_WINDOW_VISIBLE,value)
        }else if (window === 'right'){
            Setting.setValue(Setting.RIGHT_WINDOW_VISIBLE,value)
        }else{
            Setting.setValue(Setting.BOTTOM_WINDOW_VISIBLE,value)
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
        eagle.leftWindow().adjusting(false);
        eagle.rightWindow().adjusting(true);

        return true;
    }

    static leftWindowAdjustStart(eagle : Eagle, event : JQuery.TriggeredEvent) : boolean {
        const e: DragEvent = event.originalEvent as DragEvent;

        $(e.target).addClass('windowDragging')
        eagle.leftWindow().adjusting(true);
        eagle.rightWindow().adjusting(false);

        return true;
    }

    static bottomWindowAdjustStart(eagle: Eagle, event: JQuery.TriggeredEvent) : boolean {
        const e: DragEvent = event.originalEvent as DragEvent;

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

        if (isNaN(eagle.leftWindow().size())){
            console.warn("Had to reset left window width from invalid state (NaN)!");
            eagle.leftWindow().size(Setting.find(Setting.LEFT_WINDOW_WIDTH).getPerpetualDefaultVal());
        }
        if (isNaN(eagle.rightWindow().size())){
            console.warn("Had to reset right window width from invalid state (NaN)!");
            eagle.rightWindow().size(Setting.find(Setting.RIGHT_WINDOW_WIDTH).getPerpetualDefaultVal());
        }
        if (isNaN(eagle.bottomWindow().size())){
            console.warn("Had to reset bottom window height from invalid state (NaN)!");
            eagle.bottomWindow().size(Setting.find(Setting.BOTTOM_WINDOW_HEIGHT).getPerpetualDefaultVal());
        }
    
        let newSize : number;

        if (eagle.leftWindow().adjusting()){
            newSize = e.clientX

            if(newSize <= Setting.find(Setting.LEFT_WINDOW_WIDTH).getPerpetualDefaultVal()){
                eagle.leftWindow().size(Setting.find(Setting.LEFT_WINDOW_WIDTH).getPerpetualDefaultVal());
                Utils.setLeftWindowWidth(Setting.find(Setting.LEFT_WINDOW_WIDTH).getPerpetualDefaultVal());
            }else{
                eagle.leftWindow().size(newSize);
                Utils.setLeftWindowWidth(newSize);
            }
        } else if(eagle.rightWindow().adjusting()){
            newSize = window.innerWidth - e.clientX

            if(newSize <= Setting.find(Setting.RIGHT_WINDOW_WIDTH).getPerpetualDefaultVal()){
                eagle.rightWindow().size(Setting.find(Setting.RIGHT_WINDOW_WIDTH).getPerpetualDefaultVal());
                Utils.setRightWindowWidth(Setting.find(Setting.RIGHT_WINDOW_WIDTH).getPerpetualDefaultVal());
            }else{
                eagle.rightWindow().size(newSize);
                Utils.setRightWindowWidth(newSize);
            }
        }else if(eagle.bottomWindow().adjusting()){
            //converting height values to VH (percentage of the browser window). this is to prevent issues when switching from a large to a smaller screen.
            //we are only doing it for the bottom window, as it typically takes up a large part of the screen, causing it to become larger than the screen itself if switching from a 4k display to a smaller one.
            newSize = ((window.innerHeight - e.clientY)/window.innerHeight)*100
            //making sure the height we are setting is not smaller than the minimum height
            const minBottomWindowVh = (Setting.find(Setting.BOTTOM_WINDOW_HEIGHT).getPerpetualDefaultVal()/window.innerHeight)*100
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