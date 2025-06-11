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
        let resultsList: KeyboardShortcut[] = [];

        const results: {keyboardShortcut:KeyboardShortcut, priority:number}[] = [];

        // const results: Results = {perfectNameMatch:[], nameStartsWith:[], perfectTagMatch:[], tagStartsWith:[], nameIncludes:[], namePartial:[], tagIncludes:[], tagPartial:[]};

        if(searchTerm != ''){
            // processing the keyboard shortcuts array
            KeyboardShortcut.shortcuts.forEach(function(shortcut:KeyboardShortcut){
                const priority: number = QuickActions.checkMatch(shortcut, searchTerm);
                if(priority !== 0){
                    //pushing the results in order of priority
                    // QuickActions.pushResultUsingPriority(priority, shortcut, resultsList);
                    results.push({keyboardShortcut:shortcut, priority: priority})
                }
                // const priority: Priority = QuickActions.checkMatch(shortcut, searchTerm);
                // if(priority !== null){
                //     //pushing the results in order of priority
                //     QuickActions.pushResultUsingPriority(priority, shortcut, results);
                // }
            })

            // processing the quick start array
            KeyboardShortcut.quickActions.forEach(function(shortcut:KeyboardShortcut){
                const priority: Priority = QuickActions.checkMatch(shortcut, searchTerm);
                if(priority !== 0){
                    results.push({keyboardShortcut:shortcut, priority: priority})
                    //pushing the results in order of priority
                    // QuickActions.pushResultUsingPriority(priority, shortcut, results);
                }
            })

            //sort the array by priority
            results.sort((a, b) =>b.priority - a.priority);
            const test = results.map(result => (result.keyboardShortcut.text, result.priority))
            console.log('sorted' , test)
// let newArray = driver.map(pts => (pts["race_pts"]))
            resultsList = results.map(result => (result.keyboardShortcut))
            console.log(resultsList)
            //TODO need to sort the results array according to their priority score 

            //TODO need to then push the keyboard shortcuts from the results array to the resultsList excluding the priority score
            

            //adding the contents of each of the priority arrays into the results array, in order of priority
            //the ... means we are appending only the array's entries not the array itself
            // resultsList.push(...results.perfectNameMatch, ...results.nameStartsWith, ...results.perfectTagMatch,...results.tagStartsWith,...results.nameIncludes,...results.namePartial,...results.tagIncludes,...results.tagPartial)
        }

        // when the search result list changes we reset the selected result
        $('#quickActionsFocus').removeClass('quickActionsFocus')

        return resultsList
    }, this);

    // static pushResultUsingPriority(priority: Priority, shortcut: KeyboardShortcut, results: Results) : void {
    //     if(priority === Priority.PerfectNameMatch){
    //         results.perfectNameMatch.push(shortcut)
    //     }else if(priority === Priority.NameStartsWith){
    //         results.nameStartsWith.push(shortcut)
    //     }else if(priority === Priority.PerfectTagMatch){
    //         results.perfectTagMatch.push(shortcut)
    //     }else if(priority === Priority.TagStartsWith){
    //         results.tagStartsWith.push(shortcut)
    //     }else if(priority === Priority.NameIncludes){
    //         results.nameIncludes.push(shortcut)
    //     }else if(priority === Priority.NamePartial){
    //         results.namePartial.push(shortcut)
    //     }else if(priority === Priority.TagIncludes){
    //         results.tagIncludes.push(shortcut)
    //     }else if(priority === Priority.TagPartial){
    //         results.tagPartial.push(shortcut)
    //     }
    // }

    static checkMatch(shortcut: KeyboardShortcut, searchTerm: string): number {
        const perfectWordMatchPoints = 10000
        const startsWithPoints = 100
        const wordMatchPoints = 50
        const wordMatchInSequencePoints = 2
        const partialWordMatchPoints = 10
        const perfectTagMatchPoints = 40
        const tagMatchPoints = 30
        const partialTagMatchPoints = 7

        let shortcutMatchScore = 0

        //perfect match! no point to continue
        if (shortcut.text.toLocaleLowerCase() === searchTerm.toLocaleLowerCase()){
            return perfectWordMatchPoints
        }

        //check if function name starts with the search term
        if (shortcut.text.toLocaleLowerCase().startsWith(searchTerm.toLocaleLowerCase())){
            shortcutMatchScore+=startsWithPoints
        }

        for(const tag of shortcut.tags){
            // check for perfect tag matchs
            if (tag.toLocaleLowerCase() === searchTerm.toLocaleLowerCase()){
                shortcutMatchScore += perfectTagMatchPoints
            }
        }


        // split both the shortcut text and search term into individual words
        const shortcutWords: string[] = shortcut.text.split(' ');
        const searchWords: string[] = searchTerm.split(' ').filter(Boolean);

        let searchWordStillMatches = true // keeping track of how many of the words from the search word entry match the keyboardshortcut name 

        for (let searchWordIndex = 0; searchWordIndex < searchWords.length ; searchWordIndex++){
            const searchWord = searchWords[searchWordIndex]

            // check for match against words in shortcut
            for(let shortcutWordIndex = 0; shortcutWordIndex < shortcutWords.length ; shortcutWordIndex++){
                const shortcutWord = shortcutWords[shortcutWordIndex]

                if(shortcutWord.toLocaleLowerCase() === searchWord.toLocaleLowerCase()){
                    shortcutMatchScore += wordMatchPoints

                    if(searchWordStillMatches && searchWordIndex === shortcutWordIndex){
                        console.log('words match in sequence points added', shortcutWords)
                        shortcutMatchScore += wordMatchInSequencePoints
                    }else{
                        searchWordStillMatches = false;
                    }

                }else if(shortcutWord.toLocaleLowerCase().includes(searchWord.toLocaleLowerCase())){
                    shortcutMatchScore += partialWordMatchPoints

                    if(searchWordStillMatches && searchWordIndex === shortcutWordIndex){
                        console.log('words match in sequence points added', shortcutWords)
                        shortcutMatchScore += wordMatchInSequencePoints
                    }else{
                        searchWordStillMatches = false;
                    }
                }else{
                    searchWordStillMatches = false
                }
            }

            // check for match against shortcut tags
            for(const tag of shortcut.tags){
                if(searchTerm.toLocaleLowerCase() === tag.toLocaleLowerCase()){
                    shortcutMatchScore += tagMatchPoints
                }else if(tag.toLocaleLowerCase().includes(searchWord.toLocaleLowerCase())){
                    shortcutMatchScore += partialTagMatchPoints
                }
            }
        }

        return shortcutMatchScore
    }
    // static checkMatch(shortcut: KeyboardShortcut, searchTerm: string): Priority | null {

    //     //check for perfect match to with function name
    //     if (shortcut.text.toLocaleLowerCase() === searchTerm.toLocaleLowerCase()){
    //         return Priority.PerfectNameMatch
    //     }

    //     //check if function name starts with the search term
    //     if (shortcut.text.toLocaleLowerCase().startsWith(searchTerm.toLocaleLowerCase())){
    //         return Priority.NameStartsWith
    //     }

    //     //check for simple tag matches
    //     let perfectTagMatch = false
    //     let TagStartsWith = false
    //     for(const tag of shortcut.tags){
    //         // check for perfect tag matchs
    //         if (tag.toLocaleLowerCase() === searchTerm.toLocaleLowerCase()){
    //             perfectTagMatch = true;
    //             break
    //         }

    //         // check if the tag starts with the search term
    //         if (tag.startsWith(searchTerm.toLocaleLowerCase())){
    //             TagStartsWith = true;
    //         }
    //     }
    //     if(perfectTagMatch){
    //         return Priority.PerfectTagMatch
    //     }else if(TagStartsWith){
    //         return Priority.TagStartsWith
    //     }


    //     // the rest can stay

    //     // split both the shortcut text and search term into individual words
    //     const shortcutWords: string[] = shortcut.text.split(' ');
    //     const searchWords: string[] = searchTerm.split(' ').filter(Boolean);

    //     for (const searchWord of searchWords){
            
    //         // check for match against words in shortcut
    //         for(const shortcutWord of shortcutWords){
    //             if(shortcutWord.toLocaleLowerCase() === searchWord.toLocaleLowerCase()){
    //                 return Priority.NameIncludes;
    //             }else if(shortcutWord.toLocaleLowerCase().startsWith(searchWord.toLocaleLowerCase())){
    //                 return Priority.NamePartial;
    //             }
    //         }

    //         // check for match against shortcut tags
    //         for(const tag of shortcut.tags){
    //             if(searchTerm.toLocaleLowerCase() === tag.toLocaleLowerCase()){
    //                 return Priority.TagIncludes;
    //             }else if(tag.toLocaleLowerCase().startsWith(searchWord.toLocaleLowerCase())){
    //                 return Priority.TagPartial;
    //             }
    //         }
    //     }

    //     return null;
    // }

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