import * as ko from "knockout";

import {PaletteInfo} from './PaletteInfo';

export class ExplorePalettes {

    showFiles: ko.Observable<boolean>;
    palettes: ko.ObservableArray<PaletteInfo>;
    directories: ko.ObservableArray<string>;
    directory: ko.Observable<string>;
    files: ko.ObservableArray<PaletteInfo>;

    constructor(){
        this.showFiles = ko.observable(false);
        this.palettes = ko.observableArray([]);
        this.directories = ko.observableArray([]);
        this.directory = ko.observable("");
        this.files = ko.observableArray([]);
    }

    initialise = (palettes: PaletteInfo[]) : void => {
        this.clear();
        this.palettes(palettes);

        // loop through all the palettes to find the directories
        for (const palette of palettes){
            const dir = palette.path.split("/")[0];

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
    }

    clear = () : void => {
        this.showFiles(false);
        this.palettes([]);
        this.directories([]);
        this.directory("");
        this.files([]);
    }

    setDirectory = (directory: string) : void => {
        console.log("setDirectory(" + directory + ")");

        this.directory(directory);
        this.files([]);

        for (const p of this.palettes()){
            const dir = p.path.split("/")[0];

            if (dir === directory){
                this.files.push(p);
            }
        }

        this.showFiles(true);
    }
}
