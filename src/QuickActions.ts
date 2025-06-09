import * as ko from "knockout";

import { Eagle } from './Eagle';
import { KeyboardShortcut } from './KeyboardShortcut';

enum Priority {
    PerfectNameMatch, // if the search term entered perfectly matches the search object's name
    NameStartsWith, // if the search object's name starts with the search term entered
    PerfectTagMatch, // if the search term entered perfectly matches a tag on the search object
    TagStartsWith, // if the search object's tag starts with the search term entered
    NameIncludes, // if a word entered in the search matches a word in the search object's name
    NamePartial, // if the search string entered partially matches a word in the search object's name
    TagIncludes, // if a word entered in the search matches a word in the search object's tag
    TagPartial // if the search string entered partially matches a word in the search object's tag
}

type Results = {
    perfectNameMatch: KeyboardShortcut[],
    nameStartsWith: KeyboardShortcut[],
    perfectTagMatch: KeyboardShortcut[],
    tagStartsWith: KeyboardShortcut[],
    nameIncludes: KeyboardShortcut[],
    namePartial: KeyboardShortcut[],
    tagIncludes: KeyboardShortcut[],
    tagPartial: KeyboardShortcut[],
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

        const results: Results = {perfectNameMatch:[], nameStartsWith:[], perfectTagMatch:[], tagStartsWith:[], nameIncludes:[], namePartial:[], tagIncludes:[], tagPartial:[]};

        if(searchTerm != ''){
            // processing the keyboard shortcuts array
            KeyboardShortcut.shortcuts.forEach(function(shortcut:KeyboardShortcut){
                const priority: Priority = QuickActions.checkMatch(shortcut, searchTerm);
                if(priority !== null){
                    //pushing the results in order of priority
                    QuickActions.pushResultUsingPriority(priority, shortcut, results);
                }
            })

            // processing the quick start array
            KeyboardShortcut.quickActions.forEach(function(shortcut:KeyboardShortcut){
                const priority: Priority = QuickActions.checkMatch(shortcut, searchTerm);
                if(priority !== null){
                    //pushing the results in order of priority
                    QuickActions.pushResultUsingPriority(priority, shortcut, results);
                }
            })

            //adding the contents of each of the priority arrays into the results array, in order of priority
            //the ... means we are appending only the array's entries not the array itself
            resultsList.push(...results.perfectNameMatch, ...results.nameStartsWith, ...results.perfectTagMatch,...results.tagStartsWith,...results.nameIncludes,...results.namePartial,...results.tagIncludes,...results.tagPartial)
        }

        // when the search result list changes we reset the selected result
        $('#quickActionsFocus').removeClass('quickActionsFocus')

        return resultsList
    }, this);

    static pushResultUsingPriority(priority: Priority, shortcut: KeyboardShortcut, results: Results) : void {
        if(priority === Priority.PerfectNameMatch){
            results.perfectNameMatch.push(shortcut)
        }else if(priority === Priority.NameStartsWith){
            results.nameStartsWith.push(shortcut)
        }else if(priority === Priority.PerfectTagMatch){
            results.perfectTagMatch.push(shortcut)
        }else if(priority === Priority.TagStartsWith){
            results.tagStartsWith.push(shortcut)
        }else if(priority === Priority.NameIncludes){
            results.nameIncludes.push(shortcut)
        }else if(priority === Priority.NamePartial){
            results.namePartial.push(shortcut)
        }else if(priority === Priority.TagIncludes){
            results.tagIncludes.push(shortcut)
        }else if(priority === Priority.TagPartial){
            results.tagPartial.push(shortcut)
        }
    }

    static checkMatch(shortcut: KeyboardShortcut, searchTerm: string): Priority | null {
        // let match = false

        // check for match against shortcut text
        // if(shortcut.text.toLocaleLowerCase().includes(searchTerm)){
        //     match = true
        // }

        // check for match against shortcut tags
        // shortcut.tags.forEach(function(tag){
        //     if(tag.toLocaleLowerCase().includes(searchTerm)){
        //         match = true
        //     }
        // })

        // abort if no match found
        // if (!match){
        //     return null;
        // }


        //check for perfect match to with function name
        if (shortcut.text.toLocaleLowerCase() === searchTerm.toLocaleLowerCase()){
            return Priority.PerfectNameMatch
        }

        //check if function name starts with the search term
        if (shortcut.text.toLocaleLowerCase().startsWith(searchTerm.toLocaleLowerCase())){
            return Priority.NameStartsWith
        }

        //check for simple tag matches
        let perfectTagMatch = false
        let TagStartsWith = false
        for(const tag of shortcut.tags){
            // check for perfect tag matchs
            if (tag.toLocaleLowerCase() === searchTerm.toLocaleLowerCase()){
                perfectTagMatch = true;
                break
            }

            // check if the tag starts with the search term
            if (tag.startsWith(searchTerm.toLocaleLowerCase())){
                TagStartsWith = true;
            }
        }
        if(perfectTagMatch){
            return Priority.PerfectTagMatch
        }else if(TagStartsWith){
            return Priority.TagStartsWith
        }


        // the rest can stay

        // split both the shortcut text and search term into individual words
        const shortcutWords: string[] = shortcut.text.split(' ');
        const searchWords: string[] = searchTerm.split(' ').filter(Boolean);

        for (const searchWord of searchWords){
            
            // check for match against words in shortcut
            for(const shortcutWord of shortcutWords){
                if(shortcutWord.toLocaleLowerCase() === searchWord.toLocaleLowerCase()){
                    return Priority.NameIncludes;
                }else if(shortcutWord.toLocaleLowerCase().startsWith(searchWord.toLocaleLowerCase())){
                    return Priority.NamePartial;
                }
            }

            // check for match against shortcut tags
            for(const tag of shortcut.tags){
                if(searchTerm.toLocaleLowerCase() === tag.toLocaleLowerCase()){
                    return Priority.TagIncludes;
                }else if(tag.toLocaleLowerCase().startsWith(searchWord.toLocaleLowerCase())){
                    return Priority.TagPartial;
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