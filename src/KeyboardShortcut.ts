import {Eagle} from './Eagle';

export class KeyboardShortcut {
    name: string;
    keys: string[];
    canRun: (eagle: Eagle) => boolean;
    run: (eagle: Eagle) => void;

    constructor(name: string, keys : string[], canRun: (eagle: Eagle) => boolean, run: (eagle: Eagle) => void){
        this.name = name;
        this.keys = keys;
        this.canRun = canRun;
        this.run = run;
    }

    static nodeIsSelected = (eagle: Eagle) : boolean => {
        return eagle.selectedNode() !== null;
    }

    static commentNodeIsSelected = (eagle: Eagle) : boolean => {
        return eagle.selectedNode() !== null && eagle.selectedNode().getCategory() === Eagle.Category.Comment;
    }

    static edgeIsSelected = (eagle: Eagle) : boolean => {
        return eagle.selectedEdge() !== null;
    }

    static edgeIsNotSelected = (eagle: Eagle) : boolean => {
        return eagle.selectedEdge() === null;
    }

    static true = (eagle: Eagle) : boolean => {
        return true;
    }

    static processKey = (e:KeyboardEvent) => {

        // check if a Textbox or Input field is focused, if so abort
        if($("input,textarea").is(":focus")){
            return;
        }

        // get reference to eagle
        const eagle = (<any>window).eagle;

        // loop through all the keyboard shortcuts here
        for (let i = 0 ; i < Eagle.shortcuts().length ; i++){
            const shortcut: KeyboardShortcut = Eagle.shortcuts()[i];

            for (let j = 0 ; j < shortcut.keys.length ; j++){
                if (shortcut.keys[j] === e.key){
                    if (shortcut.canRun(eagle)){
                        shortcut.run(eagle);
                    }
                }
            }
        }
    }
}
