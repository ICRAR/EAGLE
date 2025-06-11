import * as ko from "knockout";

import { Eagle } from './Eagle';
import { KeyboardShortcut } from './KeyboardShortcut';

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

        if(searchTerm != ''){
            // processing the keyboard shortcuts array
            KeyboardShortcut.shortcuts.forEach(function(shortcut:KeyboardShortcut){
                const priority: number = QuickActions.checkMatch(shortcut, searchTerm);
                if(priority !== 0){
                    //pushing the results to temp array
                    results.push({keyboardShortcut:shortcut, priority: priority})
                }
            })

            // processing the quick start array
            KeyboardShortcut.quickActions.forEach(function(shortcut:KeyboardShortcut){
                const priority: number = QuickActions.checkMatch(shortcut, searchTerm);
                if(priority !== 0){
                    //pushing the results to temp array
                    results.push({keyboardShortcut:shortcut, priority: priority})
                }
            })

            //sort the array by priority score, descending
            results.sort((a, b) =>b.priority - a.priority);
            
            //pushing keyboard shorctuts from temp array to final array in sorted order
            resultsList = results.map(result => (result.keyboardShortcut))
        }

        // when the search result list changes we reset the selected result
        $('#quickActionsFocus').removeClass('quickActionsFocus')

        return resultsList
    }, this);

    static checkMatch(shortcut: KeyboardShortcut, searchTerm: string): number {
        const perfectWordMatchPoints = 10000 //search term and shortcut name are a perfect match
        const startsWithPoints = 100 //shortcut name starts with the search term
        const wordMatchPoints = 50 //a word in the search term matches a word in the shortcut name
        const wordMatchInSequencePoints = 2 //extra points each word that matches between shortcut name and search term
        const partialWordMatchPoints = 8 //some of a word in the search term matches a word of the shortcut name
        const perfectTagMatchPoints = 40 //search term and tag are a perfect match
        const tagMatchPoints = 30 //a word in the search term matches a tag
        const partialTagMatchPoints = 5 //some of a word in the search term matches a tag

        let shortcutMatchScore = 0 //keeping track of this keyboard shortcut's score

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

        let searchWordStillMatches = true // keeping track of how if the words from the search word match the word keyboardshortcut name of the same index

        for (let searchWordIndex = 0; searchWordIndex < searchWords.length ; searchWordIndex++){
            //looping over each word in the search term
            const searchWord = searchWords[searchWordIndex]

            // check for match against words in shortcut
            for(let shortcutWordIndex = 0; shortcutWordIndex < shortcutWords.length ; shortcutWordIndex++){
                //looping over each word in the shortcut name
                const shortcutWord = shortcutWords[shortcutWordIndex]

                //do we have a complete word match
                if(shortcutWord.toLocaleLowerCase() === searchWord.toLocaleLowerCase()){
                    shortcutMatchScore += wordMatchPoints

                    //check how many words of the search term match the name of the keyboard shortcut's name in sequence
                    if(searchWordStillMatches && searchWordIndex === shortcutWordIndex){
                        shortcutMatchScore += wordMatchInSequencePoints
                    }else{
                        searchWordStillMatches = false;
                    }

                //do we have a partial word match
                }else if(shortcutWord.toLocaleLowerCase().includes(searchWord.toLocaleLowerCase())){
                    //awarding points for a partial match plus a bonus for each letter that matches
                    shortcutMatchScore += partialWordMatchPoints + searchWord.length

                    //check how many words of the search term match the name of the keyboard shortcut's name in sequence
                    if(searchWordStillMatches && searchWordIndex === shortcutWordIndex){
                        shortcutMatchScore += wordMatchInSequencePoints
                    }

                    searchWordStillMatches = false; //only a partial match, so the streak ends here
                }else{
                    //we dont have a match so our word match steak ends here
                    searchWordStillMatches = false
                }
            }

            // check for match against shortcut tags
            for(const tag of shortcut.tags){

                //check for word match with tag
                if(searchTerm.toLocaleLowerCase() === tag.toLocaleLowerCase()){
                    shortcutMatchScore += tagMatchPoints

                //check for partial match
                }else if(tag.toLocaleLowerCase().includes(searchWord.toLocaleLowerCase())){
                    //awarding points for a partial match plus a bonus for each letter that matches
                    shortcutMatchScore += partialTagMatchPoints +searchWord.length
                }
            }
        }

        return shortcutMatchScore
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