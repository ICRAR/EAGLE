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

        const results: {keyboardShortcut:KeyboardShortcut, score:number}[] = [];

        if(searchTerm != ''){
            // processing the keyboard shortcuts array
            KeyboardShortcut.shortcuts.forEach(function(shortcut:KeyboardShortcut){
                const score: number = QuickActions.scoreShortcut(shortcut, searchTerm);
                if(score !== 0){
                    //pushing the results to temp array
                    results.push({keyboardShortcut:shortcut, score: score})
                }
            })

            // processing the quick start array
            KeyboardShortcut.quickActions.forEach(function(shortcut:KeyboardShortcut){
                const score: number = QuickActions.scoreShortcut(shortcut, searchTerm);
                if(score !== 0){
                    //pushing the results to temp array
                    results.push({keyboardShortcut:shortcut, score: score})
                }
            })

            //sort the array by score, descending
            results.sort((a, b) =>b.score - a.score);
            
            //pushing keyboard shortcuts from temp array to final array in sorted order
            resultsList = results.map(result => (result.keyboardShortcut))
        }

        // when the search result list changes we reset the selected result
        $('#quickActionsFocus').removeClass('quickActionsFocus')

        return resultsList
    }, this);

    static scoreShortcut(shortcut: KeyboardShortcut, searchTerm: string): number {
        const PERFECT_WORD_MATCH_POINTS = 10000 //search term and shortcut name are a perfect match
        const STARTS_WITH_POINTS = 100 //shortcut name starts with the search term
        const WORD_MATCH_POINTS = 50 //a word in the search term matches a word in the shortcut name
        const PERFECT_TAG_MATCH_POINTS = 40 //search term and tag are a perfect match
        const TAG_MATCH_POINTS = 30 //a word in the search term matches a tag
        const partialWORD_MATCH_POINTS = 8 //search term partially matches function name (includes())
        const PARTIAL_TAG_MATCH_POINTS = 5 //search term partially matches function tag (includes())
        const WORD_MATCH_IN_SEQUENCE_POINTS = 2 //extra points for matching words from start(eg. search term: "save graph repo", function name: "save graph to repo" is 2x2 extra points because the first two words match)

        let shortcutMatchScore = 0 //keeping track of this keyboard shortcut's score

        //perfect match! no point to continue
        if (shortcut.text.toLocaleLowerCase() === searchTerm.toLocaleLowerCase()){
            return PERFECT_WORD_MATCH_POINTS
        }

        //check if function name starts with the search term
        if (shortcut.text.toLocaleLowerCase().startsWith(searchTerm.toLocaleLowerCase())){
            shortcutMatchScore+=STARTS_WITH_POINTS
        }

        for(const tag of shortcut.tags){
            // check for perfect tag matches
            if (tag.toLocaleLowerCase() === searchTerm.toLocaleLowerCase()){
                shortcutMatchScore += PERFECT_TAG_MATCH_POINTS
            }
        }

        // split both the shortcut text and search term into individual words
        const shortcutWords: string[] = shortcut.text.split(' ');
        const searchWords: string[] = searchTerm.split(' ').filter(Boolean);

        let searchWordStillMatches = true // keeping track of if the words from the search term match the word from the keyboardshortcut name of the same index

        for (let searchWordIndex = 0; searchWordIndex < searchWords.length ; searchWordIndex++){
            //looping over each word in the search term
            const searchWord = searchWords[searchWordIndex]

            // check for match against words in shortcut
            for(let shortcutWordIndex = 0; shortcutWordIndex < shortcutWords.length ; shortcutWordIndex++){
                //looping over each word in the shortcut name
                const shortcutWord = shortcutWords[shortcutWordIndex]

                //do we have a complete word match
                if(shortcutWord.toLocaleLowerCase() === searchWord.toLocaleLowerCase()){
                    shortcutMatchScore += WORD_MATCH_POINTS

                    //check how many words of the search term match the name of the keyboard shortcut's name in sequence
                    if(searchWordStillMatches && searchWordIndex === shortcutWordIndex){
                        shortcutMatchScore += WORD_MATCH_IN_SEQUENCE_POINTS
                    }else{
                        searchWordStillMatches = false;
                    }

                //do we have a partial word match
                }else if(shortcutWord.toLocaleLowerCase().includes(searchWord.toLocaleLowerCase())){
                    //awarding points for a partial match plus a bonus for each letter that matches
                    shortcutMatchScore += partialWORD_MATCH_POINTS + searchWord.length

                    //check how many words of the search term match the name of the keyboard shortcut's name in sequence
                    if(searchWordStillMatches && searchWordIndex === shortcutWordIndex){
                        shortcutMatchScore += WORD_MATCH_IN_SEQUENCE_POINTS
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
                    shortcutMatchScore += TAG_MATCH_POINTS

                //check for partial match
                }else if(tag.toLocaleLowerCase().includes(searchWord.toLocaleLowerCase())){
                    //awarding points for a partial match plus a bonus for each letter that matches
                    shortcutMatchScore += PARTIAL_TAG_MATCH_POINTS +searchWord.length
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