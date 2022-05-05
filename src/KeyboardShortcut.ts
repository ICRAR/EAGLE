import {Eagle} from './Eagle';

export class KeyboardShortcut {
    key: string;
    name: string;
    keys: string[];
    eventType: string;
    modifier: KeyboardShortcut.Modifier;
    display: boolean;
    canRun: (eagle: Eagle) => boolean;
    run: (eagle: Eagle) => void;


    constructor(key: string, name: string, keys : string[], eventType: string, modifier: KeyboardShortcut.Modifier, display: boolean, canRun: (eagle: Eagle) => boolean, run: (eagle: Eagle) => void){
        this.key = key;
        this.name = name;
        this.keys = keys;
        this.eventType = eventType;
        this.modifier = modifier;
        this.display = display;
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
        if ($(".modal.show:not(#shortcutsModal, #settingsModal)").length > 0){
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
                    if (!e.altKey || e.shiftKey || e.metaKey || e.ctrlKey){
                        continue;
                    }
                    break;
                case KeyboardShortcut.Modifier.Ctrl:
                    if (!e.ctrlKey || e.metaKey || e.altKey || e.shiftKey){
                        continue;
                    }
                    break;
                case KeyboardShortcut.Modifier.Meta:
                    if (!e.metaKey || e.altKey || e.shiftKey || e.ctrlKey){
                        continue;
                    }
                    break;
                case KeyboardShortcut.Modifier.Shift:
                    if (!e.shiftKey || e.altKey || e.metaKey || e.ctrlKey){
                        continue;
                    }
                    break;
                case KeyboardShortcut.Modifier.MetaShift:
                if (!e.shiftKey || !e.metaKey || e.ctrlKey || e.altKey){
                    continue;
                }
                break;
            }

            for (const key of shortcut.keys){
                if (key.toLowerCase() === e.key.toLowerCase()){
                    if (shortcut.canRun(eagle)){
                        shortcut.run(eagle);
                        e.preventDefault();
                    }
                }
            }
        }
    }
}

export namespace KeyboardShortcut{
    export enum Modifier {
        Alt = "Alt",
        Ctrl = "Ctrl",
        Meta = "Meta",
        Shift = "Shift",
        None = "none",
        MetaShift = "Meta + Shift"
    }

    // whether or not the shortcut should be shown in the keyboard shortcuts list in help UI
    export namespace Display {
        export const Enabled = true;
        export const Disabled = false;
    }
}
