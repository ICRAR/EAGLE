import {Eagle} from './Eagle';

export class KeyboardShortcut {
    key: string;
    name: string;
    keys: string[];
    eventType: string;
    modifier: KeyboardShortcut.Modifier;
    canRun: (eagle: Eagle) => boolean;
    run: (eagle: Eagle) => void;


    constructor(key: string, name: string, keys : string[], eventType: string, modifier: KeyboardShortcut.Modifier, canRun: (eagle: Eagle) => boolean, run: (eagle: Eagle) => void){
        this.key = key;
        this.name = name;
        this.keys = keys;
        this.eventType = eventType;
        this.modifier = modifier;
        this.canRun = canRun;
        this.run = run;
    }

    static nodeIsSelected = (eagle: Eagle) : boolean => {
        return eagle.selectedNode() !== null;
    }

    static commentNodeIsSelected = (eagle: Eagle) : boolean => {
        const selectedNode = eagle.selectedNode();
        return selectedNode !== null && selectedNode.getCategory() === Eagle.Category.Comment;
    }

    static edgeIsSelected = (eagle: Eagle) : boolean => {
        return eagle.selectedEdge() !== null;
    }

    static somethingIsSelected = (eagle: Eagle) : boolean => {
        return eagle.selectedObjects().length > 0;
    }

    static true = (eagle: Eagle) : boolean => {
        return true;
    }

    static graphNotEmpty = (eagle: Eagle) : boolean => {
        return eagle.logicalGraph().getNumNodes() > 0;
    }

    static processKey = (e:KeyboardEvent) => {
        // check if a Textbox or Input field is focused, if so abort
        if($("input,textarea").is(":focus")){
            return;
        }

        // skip all repeat events, just process the initial keyup or keydown
        if (e.repeat){
            return;
        }

        // check if a modal is shown, if so abort
        if ($(".modal.show").length > 0){
            return;
        }

        // get reference to eagle
        const eagle = (<any>window).eagle;

        // loop through all the keyboard shortcuts here
        for (const shortcut of Eagle.shortcuts()){
            // check that the event is of the correct type
            if (e.type !== shortcut.eventType){
                continue;
            }

            switch(shortcut.modifier){
                case KeyboardShortcut.Modifier.None:
                    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey){
                        continue;
                    }
                    break;
                case KeyboardShortcut.Modifier.Alt:
                    if (!e.altKey){
                        continue;
                    }
                    break;
                case KeyboardShortcut.Modifier.Ctrl:
                    if (!e.ctrlKey){
                        continue;
                    }
                    break;
                case KeyboardShortcut.Modifier.Meta:
                    if (!e.metaKey){
                        continue;
                    }
                    break;
                case KeyboardShortcut.Modifier.Shift:
                    if (!e.shiftKey){
                        continue;
                    }
                    break;
            }

            for (const key of shortcut.keys){
                if (key === e.key){
                    if (shortcut.canRun(eagle)){
                        shortcut.run(eagle);
                    }
                }
            }
        }
    }
}

export namespace KeyboardShortcut{
    export enum Modifier {
        Alt = "alt",
        Ctrl = "ctrl",
        Meta = "meta",
        Shift = "shift",
        None = "none",
    }
}
