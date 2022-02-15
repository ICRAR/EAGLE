import * as ko from "knockout";

import {Eagle} from './Eagle';
import {PaletteInfo} from './PaletteInfo';

export class ExplorePalettes {

    files: ko.ObservableArray<PaletteInfo>;

    constructor(){
        this.files = ko.observableArray([]);
    }

    initialise = (palettes: PaletteInfo[]) : void => {
        this.files(palettes);

        // loop through all the palettes to find the directories

        // can we sort non-master palettes by modification date (newest first)
    }
}
