import * as ko from "knockout";

import { Eagle } from './Eagle';
import { Utils } from './Utils';
import { Setting } from "./Setting";
import { UiModeSystem } from "./UiModes";

export class BottomWindow {
    // The width remains on the sidewindow, this is because when we are dragging the width of a side window, there are frequent changes to the width. 
    // We dont want these rapid changes to affect the setting and be saved into local storage, until we stop dragging.
    height : ko.Observable<number>;
    adjusting : ko.Observable<boolean>;

    constructor(height : number){
        this.height = ko.observable(height);
        this.adjusting = ko.observable(false);
    }

    static toggleShown = (isLeft:boolean): void => {
        BottomWindow.toggleTransition()

        if(isLeft){
            Setting.find(Setting.LEFT_WINDOW_VISIBLE).toggle()
        }else{
            Setting.find(Setting.RIGHT_WINDOW_VISIBLE).toggle()
        }
        UiModeSystem.saveToLocalStorage()
    }

    static setShown = (isLeft:boolean,value:boolean): void => {
        BottomWindow.toggleTransition() 

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

    static bottomWindowAdjustStart(eagle: Eagle, event: JQuery.TriggeredEvent) : boolean {
        const e: DragEvent = event.originalEvent as DragEvent;

        $(e.target).addClass('windowDragging')
        Eagle.dragStartY = e.clientY;
        eagle.bottomWindow().adjusting(true)

        return true;
    }

    // workaround to avoid left or right window adjusting on any and all drag events
    static bottomWindowAdjustEnd = (eagle: Eagle, event: JQuery.TriggeredEvent) : boolean => {
        const e: DragEvent = event.originalEvent as DragEvent;

        $(e.target).removeClass('windowDragging')
        eagle.bottomWindow().adjusting(false);

        return true;
    }

    static bottomWindowAdjust(eagle: Eagle, event: JQuery.TriggeredEvent) : boolean {
        const e: DragEvent = event.originalEvent as DragEvent;

        // workaround to avoid final dragEvent at 0,0!
        if (e.clientX === 0){
            return true;
        }

        if (isNaN(eagle.bottomWindow().height())){
            console.warn("Had to reset bottom window height from invalid state (NaN)!");
            eagle.bottomWindow().height(Setting.find(Setting.BOTTOM_WINDOW_HEIGHT).getPerpetualDefaultVal());
        }

        const dragDiff : number = e.clientY - Eagle.dragStartY;
        let newHeight : number;

        if (eagle.bottomWindow().adjusting()){
            newHeight = eagle.leftWindow().size() + dragDiff;
            if(newHeight <= Setting.find(Setting.BOTTOM_WINDOW_HEIGHT).getPerpetualDefaultVal()){
                eagle.bottomWindow().height(Setting.find(Setting.BOTTOM_WINDOW_HEIGHT).getPerpetualDefaultVal());
                Utils.setBottomWindowHeight(Setting.find(Setting.BOTTOM_WINDOW_HEIGHT).getPerpetualDefaultVal());
            }else{
                eagle.bottomWindow().height(newHeight);
                Utils.setBottomWindowHeight(newHeight);
            }
        }

        Eagle.dragStartY = e.clientY;

        return true;
    }
}