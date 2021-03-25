import * as ko from "knockout";

import {Eagle} from './Eagle';

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
}
