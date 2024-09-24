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
            eagle.leftWindow().width(Setting.find(Setting.LEFT_WINDOW_WIDTH).getPerpetualDefaultVal());
        }
        if (isNaN(eagle.rightWindow().width())){
            console.warn("Had to reset right window width from invalid state (NaN)!");
            eagle.rightWindow().width(Setting.find(Setting.RIGHT_WINDOW_WIDTH).getPerpetualDefaultVal());
        }

        const dragDiff : number = e.clientX - Eagle.dragStartX;
        let newWidth : number;

        if (eagle.leftWindow().adjusting()){
            newWidth = eagle.leftWindow().width() + dragDiff;
            if(newWidth <= Setting.find(Setting.LEFT_WINDOW_WIDTH).getPerpetualDefaultVal()){
                eagle.leftWindow().width(Setting.find(Setting.LEFT_WINDOW_WIDTH).getPerpetualDefaultVal());
                Utils.setLeftWindowWidth(Setting.find(Setting.LEFT_WINDOW_WIDTH).getPerpetualDefaultVal());
            }else{
                eagle.leftWindow().width(newWidth);
                Utils.setLeftWindowWidth(newWidth);
            }
        } else if(eagle.rightWindow().adjusting()) {
            newWidth = eagle.rightWindow().width() - dragDiff;
            if(newWidth <= Setting.find(Setting.RIGHT_WINDOW_WIDTH).getPerpetualDefaultVal()){
                eagle.rightWindow().width(Setting.find(Setting.RIGHT_WINDOW_WIDTH).getPerpetualDefaultVal());
                Utils.setRightWindowWidth(Setting.find(Setting.RIGHT_WINDOW_WIDTH).getPerpetualDefaultVal());
            }else{
                eagle.rightWindow().width(newWidth);
                Utils.setRightWindowWidth(newWidth);
            }
        }

        Eagle.dragStartX = e.clientX;

        return true;
    }
}