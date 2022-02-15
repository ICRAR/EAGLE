import * as ko from "knockout";

import {Eagle} from './Eagle';
import {PaletteInfo} from './PaletteInfo';

export class ExplorePalettes {

    files: ko.ObservableArray<PaletteInfo>;

    constructor(){
        this.files = ko.observableArray([]);
    }
}
