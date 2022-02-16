import * as ko from "knockout";

import {PaletteInfo} from './PaletteInfo';

export class ExplorePalettes {

    files: ko.ObservableArray<PaletteInfo>;
    directories: ko.ObservableArray<string>;

    constructor(){
        this.files = ko.observableArray([]);
        this.directories = ko.observableArray([]);
    }

    initialise = (palettes: PaletteInfo[]) : void => {
        this.files(palettes);
        this.directories([]);

        // loop through all the palettes to find the directories
        for (const palette of palettes){
            const dir = palette.path.split("/")[0];
            console.log("path", palette.path, "dir", dir);

            // check if directory is already in dorectories array
            let found = false;
            for (const directory of this.directories()){
                if (directory === dir){
                    found = true;
                    break;
                }
            }
            if (!found){
                this.directories.push(dir);
            }

        }

        // debug
        console.log("directories", this.directories());

        // can we sort non-master palettes by modification date (newest first)
    }
}
