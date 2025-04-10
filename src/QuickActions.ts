import { Eagle } from './Eagle';
import { KeyboardShortcut } from './KeyboardShortcut';
import { Utils } from './Utils';

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
    match: boolean,
    funcObject: QuickActionsResult,
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

            //processing the keyboard shortcuts array
            KeyboardShortcut.shortcuts.forEach(function(shortcut:KeyboardShortcut){
                const result: QuickActionsMatch = QuickActions.matchAndSortFunction(shortcut,searchTerm)
                if(result.match){
                    //pushing the results in order of priority
                    QuickActions.pushResultUsingPriority(result)
                }
            })

            //processing the quick start array
            KeyboardShortcut.quickActions.forEach(function(shortcut:KeyboardShortcut){
                const result = QuickActions.matchAndSortFunction(shortcut,searchTerm)
                if(result.match){
                    //pushing the results in order of priority
                    QuickActions.pushResultUsingPriority(result)
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

    static pushResultUsingPriority(result: QuickActionsMatch) : void {
        if(result.priority === Priority.Word){
            wordMatch.push(result.funcObject)
        }else if(result.priority === Priority.Tag){
            tagMatch.push(result.funcObject)
        }else if(result.priority === Priority.Start){
            startMatch.push(result.funcObject)
        }else if(result.priority === Priority.TagStart){
            tagStartMatch.push(result.funcObject)
        }else{
            // anyMatch.push(result.funcObject)
        }
    }

    // TODO: the boolean specifying whether a match was found is inside the return type (QuickActionsMatch)
    //       but maybe we should just return null if there was no match?
    // TODO: this function prioritises matches post-search. Better to just search in priority order and return immediately if found?
    // TODO: rename the input parameter 'func' to 'shortcut'
    static matchAndSortFunction(func: KeyboardShortcut, searchTerm: string) : QuickActionsMatch {
        let result: QuickActionsMatch; // TODO: we don't need this, construct just-in-time instead
        let funcElement: QuickActionsResult;
        let bestMatch: Priority = Priority.Unknown;

        //checks if there is a match
        let match = false

        if(func.text.toLocaleLowerCase().includes(searchTerm)){
            match = true
        }
        
        func.tags.forEach(function(tag){
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
            funcElement = {
                shortcut: func,
                keysText: func.getKeysText(true)
            };
     
            // adding priority to each search result, this affects the order in which the result appear
            const searchableArr = func.text.split(' ');
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
                    for(const tag of func.tags){
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
                bestMatch = Priority.Word
            }else if(tagMatched){
                bestMatch = Priority.Tag
            }else if(startMatched){
                bestMatch = Priority.Start
            }else if(tagStartMatched){
                bestMatch = Priority.TagStart
            }else{
                bestMatch = Priority.Any
            }
            result = {match:match, funcObject:funcElement, priority:bestMatch}
        }else{
            result = {match:match, funcObject:funcElement, priority:bestMatch}
        }
        return result
    }

    static executeQuickAction(result: QuickActionsResult) : void {
        const eagle: Eagle = Eagle.getInstance();
        QuickActions.initiateQuickAction()

        const canRun = result.shortcut.canRun(eagle);

        if (canRun){
            result.shortcut.run(eagle, null);
        } else {
            if (result.shortcut.warnWhenCantRun){
                Utils.showNotification("Warning", "Quick Action (" + result.shortcut.text + ") not available in current state.", "warning");
            }
        }
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