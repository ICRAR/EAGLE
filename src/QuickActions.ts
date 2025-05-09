import { Eagle } from './Eagle';
import { KeyboardShortcut } from './KeyboardShortcut';

// TODO: name and type are confusing here
let wordMatch:     QuickActionsResult[] = []
let tagMatch:      QuickActionsResult[] = []
let startMatch:    QuickActionsResult[] = []
let tagStartMatch: QuickActionsResult[] = []
let anyMatch:      QuickActionsResult[] = []

enum Priority {
    Word = "wordMatch",
    Tag = "tagMatch",
    Start = "startMatch",
    TagStart = "tagStartMatch",
    Any = "anyMatch",

    Unknown = "unknown"
}

type QuickActionsMatch = {
    result: QuickActionsResult,
    priority: Priority
}

type QuickActionsResult = {
    shortcut: KeyboardShortcut,
    keysText: string
}

export class QuickActions {

    static initiateQuickAction() : void {
        //function to both start and close the quick action menu
        const eagle: Eagle = Eagle.getInstance();
        eagle.quickActionOpen(!eagle.quickActionOpen())
        $('#quickActionSearchbar').val('')

        setTimeout(function(){
            if(eagle.quickActionOpen()){
                $('#quickActionContainer').show()
                $('#quickActionBackground').show()
                $('#quickActionSearchbar').trigger("focus")
                QuickActions.initiateQuickActionQuickSelect()
            }else{
                $('#quickActionContainer').hide()
                $('#quickActionBackground').hide()
                $('body').off('keydown.quickActions')
                $('#quickActionBackground').off('click.quickActionDismiss')
            }
        },50)
    }

    static findQuickActionResults() : QuickActionsResult[] {
        const eagle: Eagle = Eagle.getInstance();
        const searchTerm :string = eagle.quickActionSearchTerm().toLocaleLowerCase()
        const resultsList: QuickActionsResult[] = []

        wordMatch = []
        tagMatch = []
        startMatch = []
        tagStartMatch = []
        anyMatch = []

        if(searchTerm != ''){

            // processing the keyboard shortcuts array
            KeyboardShortcut.shortcuts.forEach(function(shortcut:KeyboardShortcut){
                const match: QuickActionsMatch = QuickActions.matchAndSortFunction(shortcut, searchTerm);
                if(match !== null){
                    //pushing the results in order of priority
                    QuickActions.pushResultUsingPriority(match)
                }
            })

            // processing the quick start array
            KeyboardShortcut.quickActions.forEach(function(shortcut:KeyboardShortcut){
                const match = QuickActions.matchAndSortFunction(shortcut, searchTerm);
                if(match){
                    //pushing the results in order of priority
                    QuickActions.pushResultUsingPriority(match)
                }
            })

            //adding the contents of each of the priority arrays into the results array, in order of priority
            //the ... means we are appending only the array's entries not the array itself
            resultsList.push(...wordMatch, ...tagMatch, ...startMatch,...tagStartMatch, ...anyMatch)
        }

        //when the search result list changes we reset the selected result
        $('#quickActionsFocus').removeClass('quickActionsFocus')

        //hide the result div if there is nothing to show
        if(resultsList.length === 0){
            $('#quickActionResults').hide()
        }else{
            $('#quickActionResults').show()
        }

        return resultsList
    }

    static pushResultUsingPriority(match: QuickActionsMatch) : void {
        if(match.priority === Priority.Word){
            wordMatch.push(match.result)
        }else if(match.priority === Priority.Tag){
            tagMatch.push(match.result)
        }else if(match.priority === Priority.Start){
            startMatch.push(match.result)
        }else if(match.priority === Priority.TagStart){
            tagStartMatch.push(match.result)
        }else{
            // anyMatch.push(result.funcObject)
        }
    }

    // TODO: this function prioritises matches post-search. Better to just search in priority order and return immediately if found?
    static matchAndSortFunction(shortcut: KeyboardShortcut, searchTerm: string) : QuickActionsMatch {
        let result: QuickActionsResult;
        let priority: Priority = Priority.Unknown;

        //checks if there is a match
        let match = false

        if(shortcut.text.toLocaleLowerCase().includes(searchTerm)){
            match = true
        }
        
        shortcut.tags.forEach(function(tag){
            if(tag.toLocaleLowerCase().includes(searchTerm)){
                match = true
            }
        })

        //booleans used for prioritising search results
        let wordMatched: boolean = false
        let tagMatched: boolean = false
        let startMatched: boolean = false
        let tagStartMatched: boolean = false

        //generating the result
        if(match){
            result = {
                shortcut: shortcut,
                keysText: shortcut.getKeysText(true)
            };
     
            // adding priority to each search result, this affects the order in which the result appear
            const searchableArr = shortcut.text.split(' ');
            const searchTermArr = searchTerm.split(' ')

            for(const searchWord of searchTermArr){
                if(wordMatched){
                    break
                }

                //checking priority for function name matches                            
                for(const searchableWord of searchableArr){
                    if(searchableWord.toLocaleLowerCase() === searchWord.toLocaleLowerCase()){
                        wordMatched = true
                        break
                    }else if(searchableWord.toLocaleLowerCase().startsWith(searchWord.toLocaleLowerCase())){
                        startMatched = true
                        break
                    }
                }

                //checking priority for function tags
                if(!wordMatched){
                    for(const tag of shortcut.tags){
                        if(searchWord.toLocaleLowerCase() === tag.toLocaleLowerCase()){
                            tagMatched = true
                            break
                        }else if(tag.toLocaleLowerCase().startsWith(searchWord.toLocaleLowerCase())){
                            tagStartMatched = true
                            break
                        }
                    }
                }
            }
            if(wordMatched){
                priority = Priority.Word
            }else if(tagMatched){
                priority = Priority.Tag
            }else if(startMatched){
                priority = Priority.Start
            }else if(tagStartMatched){
                priority = Priority.TagStart
            }else{
                priority = Priority.Any
            }
            return {result: result, priority: priority}
        }

        return null;
    }

    static executeQuickAction(result: QuickActionsResult) : void {
        const eagle: Eagle = Eagle.getInstance();
        QuickActions.initiateQuickAction()

        result.shortcut.run(eagle, null);
    }

    static updateQuickActionSearchTerm(eagle: Eagle, event: KeyboardEvent ): void {
        const searchTerm: string = $(event.target).val().toString();
        eagle.quickActionSearchTerm(searchTerm);
    }
    
    // TODO: event not passed as an argument here! (used as both 'e' and 'event'?)
    static initiateQuickActionQuickSelect() : void {
        //unbinding then rebinding the event in case there was already one attached
        const that = this
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
                that.initiateQuickAction()
                break;

                default: //all other key presses should be typing in this mode, so we should be focused on the input
                $('#quickActionSearchbar').trigger("focus")
                break;
            }
        })
        
        $('#quickActionBackground').on('click.quickActionDismiss', function(){
            QuickActions.initiateQuickAction();
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