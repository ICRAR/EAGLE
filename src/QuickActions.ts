import * as ko from "knockout";

import { Eagle } from './Eagle';
import { KeyboardShortcut } from './KeyboardShortcut';

enum Priority {
    Word,
    Tag,
    Start,
    TagStart
}

type Results = {
    word: KeyboardShortcut[],
    tag: KeyboardShortcut[],
    start: KeyboardShortcut[],
    tagStart: KeyboardShortcut[]
}

export class QuickActions {

    static searchTerm: ko.Observable<string> = ko.observable('');
    static open: ko.Observable<boolean> = ko.observable(false);

    static initiateQuickAction() : void {
        QuickActions.open(true);
        QuickActions.searchTerm('');

        setTimeout(function(){
            if(QuickActions.open()){
                document.getElementById("quickActionSearchbar").focus();
                QuickActions.initiateQuickActionQuickSelect()
            }else{
                $('body').off('keydown.quickActions')
                $('#quickActionBackground').off('click.quickActionDismiss')
            }
        },50)
    }

    static results : ko.PureComputed<KeyboardShortcut[]> = ko.pureComputed(() => {
        const searchTerm: string = QuickActions.searchTerm().toLocaleLowerCase();
        const resultsList: KeyboardShortcut[] = [];

        const results: Results = {word:[], tag:[], start:[], tagStart:[]};

        if(searchTerm != ''){
            const searchTerms = searchTerm.split(' ').filter(Boolean);

            // processing the keyboard shortcuts array
            KeyboardShortcut.shortcuts.forEach(function(shortcut:KeyboardShortcut){
                const priority: Priority = QuickActions.checkMatch(shortcut, searchTerms);
                if(priority !== null){
                    //pushing the results in order of priority
                    QuickActions.pushResultUsingPriority(priority, shortcut, results);
                }
            })

            // processing the quick start array
            KeyboardShortcut.quickActions.forEach(function(shortcut:KeyboardShortcut){
                const priority: Priority = QuickActions.checkMatch(shortcut, searchTerms);
                if(priority !== null){
                    //pushing the results in order of priority
                    QuickActions.pushResultUsingPriority(priority, shortcut, results);
                }
            })

            //adding the contents of each of the priority arrays into the results array, in order of priority
            //the ... means we are appending only the array's entries not the array itself
            resultsList.push(...results.word, ...results.tag, ...results.start,...results.tagStart)
        }

        // when the search result list changes we reset the selected result
        $('#quickActionsFocus').removeClass('quickActionsFocus')

        return resultsList
    }, this);

    static pushResultUsingPriority(priority: Priority, shortcut: KeyboardShortcut, results: Results) : void {
        if(priority === Priority.Word){
            results.word.push(shortcut)
        }else if(priority === Priority.Tag){
            results.tag.push(shortcut)
        }else if(priority === Priority.Start){
            results.start.push(shortcut)
        }else if(priority === Priority.TagStart){
            results.tagStart.push(shortcut)
        }
    }

    static checkMatch(shortcut: KeyboardShortcut, searchTerms: string[]): Priority | null {
        const shortcutWords: string[] = shortcut.text.split(' ');

        for (const searchTerm of searchTerms){
            
            // check for match against words in shortcut
            for(const shortcutWord of shortcutWords){
                if(shortcutWord.toLocaleLowerCase() === searchTerm.toLocaleLowerCase()){
                    return Priority.Word;
                }else if(shortcutWord.toLocaleLowerCase().startsWith(searchTerm.toLocaleLowerCase())){
                    return Priority.Start;
                }
            }

            // check for match against shortcut tags
            for(const tag of shortcut.tags){
                if(searchTerm.toLocaleLowerCase() === tag.toLocaleLowerCase()){
                    return Priority.Tag;
                }else if(tag.toLocaleLowerCase().startsWith(searchTerm.toLocaleLowerCase())){
                    return Priority.TagStart;
                }
            }
        }

        return null;
    }

    // close QuickActions and run the shortcut
    static executeQuickAction(shortcut: KeyboardShortcut): void {
        QuickActions.open(false);
        shortcut.run(Eagle.getInstance(), null);
    }
    
    static initiateQuickActionQuickSelect() : void {
        //unbinding then rebinding the event in case there was already one attached
        $('body').off('keydown.quickActions')
        $('body').on('keydown.quickActions',function(event: JQuery.TriggeredEvent){
            const e: KeyboardEvent = event.originalEvent as KeyboardEvent;
            
            const current = $(".quickActionsFocus")
            switch(e.key) {
                
                case "ArrowUp":
                e.preventDefault()
                if($('#quickActionSearchbar').val()!==''){   
                    if($(".quickActionsFocus").length === 0){
                        $('#quickActionResults a:last').addClass('quickActionsFocus')
                    }else{
                        $(".quickActionsFocus").removeClass('quickActionsFocus')
                        current.prev().addClass('quickActionsFocus')
                    }
                }
                break;
        
                case "ArrowDown":
                e.preventDefault()
                if($('#quickActionSearchbar').val()!==''){   
                    if($(".quickActionsFocus").length === 0){
                        $('#quickActionResults a:first').addClass('quickActionsFocus')
                    }else{
                        $(".quickActionsFocus").removeClass('quickActionsFocus')
                        current.next().addClass('quickActionsFocus')
                    }
                }
                break;

                case "Enter":
                if(current.length != 0){
                    e.preventDefault()
                    current.trigger("click")
                }else if( $('#quickActionResults a').length != 0){
                    e.preventDefault()
                    $('#quickActionResults a:first').trigger("click")
                }
                break;

                case "Escape":
                QuickActions.open(false);
                break;

                default: //all other key presses should be typing in this mode, so we should be focused on the input
                $('#quickActionSearchbar').trigger("focus")
                break;
            }
        })
        
        $('#quickActionBackground').on('click.quickActionDismiss', function(){
            QuickActions.open(false);
        })
    }

    static quickOpenDocsLink(link: string) : void {
        const win = window.open(link, '_blank');
        if (win) {
            //Browser has allowed it to be opened
            win.focus();
        } else {
            //Browser has blocked it
            alert('Please allow popups for this website');
        }
    }

}