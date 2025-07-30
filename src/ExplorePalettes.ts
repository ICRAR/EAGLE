import * as ko from "knockout";

import {Eagle} from './Eagle';
import {PaletteInfo} from './PaletteInfo';
import {Repository} from "./Repository";
import {RepositoryFile} from "./RepositoryFile";

export class ExplorePalettesProject {
    name: ko.Observable<string>;
    palettes: ko.ObservableArray<PaletteInfo>;
    imgSrc: ko.Observable<string>;
    defaultPalette: ko.Observable<PaletteInfo | null>;

    constructor(name: string){
        this.name = ko.observable(name);
        this.palettes = ko.observableArray(<PaletteInfo[]>[]);
        this.imgSrc = ko.observable("");
        this.defaultPalette = ko.observable(null);
    }
}

export class ExplorePalettes {
    showFiles: ko.Observable<boolean>;
    projects: ko.ObservableArray<ExplorePalettesProject>;
    currentProjectIndex: ko.Observable<number>;

    constructor(){
        this.showFiles = ko.observable(false);
        this.projects = ko.observableArray(<ExplorePalettesProject[]>[]);
        this.currentProjectIndex = ko.observable(-1);
    }

    initialise = (palettes: PaletteInfo[]) : void => {
        this.clear();

        // loop through all the palettes to find the directories
        for (const palette of palettes){
            const dir = palette.path.split("/")[0];
            const isDefaultPalette = palette.name.includes('master') || palette.name.includes('main');

            // check if directory is already in directories array
            let found : ExplorePalettesProject | null = null;
            for (const project of this.projects()){
                if (project.name() === dir){
                    found = project;
                    break;
                }
            }

            // if project not found, add a new project to the projects list
            if (found === null){
                found = new ExplorePalettesProject(dir);
                this.projects.push(found);
            }

            // add palette to project
            found.palettes.push(palette);

            if (isDefaultPalette){
                found.defaultPalette(palette);
            }
        }
    }

    clear = () : void => {
        this.showFiles(false);
        this.projects([]);
        this.currentProjectIndex(-1);
    }

    setProject = (projectName: string) : void => {
        for (let i = 0 ; i < this.projects().length ; i++){
            if (projectName === this.projects()[i].name()){
                this.currentProjectIndex(i);
            }
        }
        this.showFiles(true);
    }

    getProject = () : ExplorePalettesProject => {
        return this.projects()[this.currentProjectIndex()];
    }

    back = () : void => {
        this.showFiles(false);
        this.currentProjectIndex(-1);

    }

    getText = (number:number): string => {
        let text = " branch"
        if (number > 1){
            text = " branches"
        }
        text = "Click to view " + number + text;
        return text;
    }

    clickHelper = (eagle: Eagle, data: PaletteInfo, event: Event): void => {
        if (data === null){
            console.warn("No paletteinfo supplied to clickHelper");
            return;
        }

        if (typeof event === "undefined"){
            // load immediately
            eagle.openRemoteFile(new RepositoryFile(new Repository(data.repositoryService, data.repositoryName, data.repositoryBranch, false), data.path, data.name));
            $('#explorePalettesModal').modal('hide');
        } else {
            const newState = !data.isSelected()
            data.isSelected(newState)

            // mark as checked
            const eventTarget = event.target as HTMLElement;
            if (eventTarget === null){
                console.warn("No event target supplied to clickHelper");
                return;
            }
            $(eventTarget).find('input').prop("checked", newState);
        }
    }
}
