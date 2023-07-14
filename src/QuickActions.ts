import {Eagle} from './Eagle';
import {Category} from './Category';
import {Utils} from './Utils';
import {Errors} from './Errors';
import { Setting } from './Setting';
import { ParameterTable } from './ParameterTable';
import {KeyboardShortcut} from './KeyboardShortcut';

let wordMatch:any[] = []
let tagMatch:any[] = []
let startMatch:any[] = []
let tagStartMatch:any[] = []
let anyMatch:any[] = []

export class QuickActions {
    
    


    static initiateQuickAction = () : void  =>{
        //function to both start and close the quick action menu
        const eagle = (<any>window).eagle;
        eagle.quickActionOpen(!eagle.quickActionOpen())
        $('#quickActionSearchbar').val('')

        setTimeout(function(){
            if(eagle.quickActionOpen()){
                $('#quickActionContainer').show()
                $('#quickActionBackground').show()
                $('#quickActionSearchbar').focus()
                QuickActions.initiateQuickActionQuickSelect()
            }else{
                $('#quickActionContainer').hide()
                $('#quickActionBackground').hide()
                $('body').unbind('keydown.quickActions')
                $('#quickActionBackground').unbind('click.quickActionDismiss')
            }
        },50)
    }

    static findQuickActionResults = () : any[]  =>{
        const eagle = (<any>window).eagle;
        const searchTerm :string = eagle.quickActionSearchTerm().toLocaleLowerCase()

        let resultsList:any[] = []

        wordMatch = []
        tagMatch = []
        startMatch = []
        tagStartMatch = []
        anyMatch = []

        if(searchTerm != ''){

            //processing the keyboard shortcuts array
            KeyboardShortcut.getShortcuts().forEach(function(shortcut:KeyboardShortcut){
                const result = QuickActions.matchAndSortFunction(shortcut,searchTerm)
                if(result.match){
                    //pushing the results in order of priority
                    QuickActions.pushResultUsingPriority(result)
                }
            })

            //processing the quick start array
            KeyboardShortcut.getQuickActions().forEach(function(shortcut:KeyboardShortcut){
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

    static pushResultUsingPriority = (result:any) : void =>{
        if(result.priority === 'wordMatch'){
            wordMatch.push(result.funcObject)
        }else if(result.priority === 'tagMatch'){
            tagMatch.push(result.funcObject)
        }else if(result.priority === 'startMatch'){
            startMatch.push(result.funcObject)
        }else if(result.priority === 'tagStartMatch'){
            tagStartMatch.push(result.funcObject)
        }else{
            // anyMatch.push(result.funcObject)
        }
    }


    static matchAndSortFunction = (func:KeyboardShortcut,searchTerm:string) : any =>{
        let result:any = []
        let funcElement :any[] = []
        let bestMatch : string = ''
        //checks if there is a match
        let match = false

        if(func.name.toLocaleLowerCase().includes(searchTerm)){
            match = true
        }
        
        func.quickActionTags.forEach(function(tag){
            if(tag.toLocaleLowerCase().includes(searchTerm)){
                match = true
            }
        })

        //booleans used for prioritising search results
        let wordMatched :boolean= false
        let tagMatched :boolean= false
        let startMatched :boolean= false
        let tagStartMatched :boolean= false

        //generating the result
        if(match){
            let resultTitle:string = func.name;
            let resultAction:any = func.run;
            let resultShortcut:string;
            let resultIcon:string;

            if(func.modifier != 'none'){
                resultShortcut = func.modifier +" "+ func.keys
            }else{
                resultShortcut = func.keys.toString()
            }
            funcElement.push(resultTitle,resultAction,resultShortcut)
     
            // adding priority to each search result, this affects the order in which the result appear
            const searchableArr = func.name.split(' ');
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
                    for(const tag of func.quickActionTags){
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
                bestMatch = 'wordMatch'
            }else if(tagMatched){
                bestMatch = 'tagMatch'
            }else if(startMatched){
                bestMatch = 'startMatch'
            }else if(tagStartMatched){
                bestMatch = 'tagStartMatch'
            }else{
                bestMatch = 'anyMatch'
            }
            result = {match:match, funcObject:funcElement,priority:bestMatch}
        }else{
            result = {match:match, funcObject:funcElement,priority:bestMatch}
        }
        return result
    }

    static executeQuickAction = (data:any) : void  =>{
        const eagle = (<any>window).eagle;
        this.initiateQuickAction()
        data[1](eagle)
    }

    static getQuickActionShortcutHtml = (data:any) : string => {
        if(data[2] != ''){
            return ' ['+data[2]+']'
        }else{
            return ''
        }
    }

    static updateQuickActionSearchTerm = (obj:any, event:any ): void => {
        const eagle = (<any>window).eagle;
        eagle.quickActionSearchTerm($(event.target).val())
    }
    
    static initiateQuickActionQuickSelect = () : void => {
        //unbinding then rebinding the event in case there was already one attached
        const that = this
        $('body').unbind('keydown.quickActions')
        $('body').bind('keydown.quickActions',function(e){
            const current = $(".quickActionsFocus")
            switch(e.which) {
                
                case 38: // up
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
        
                case 40: // down
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

                case 13: //enter
                if(current.length != 0){
                    e.preventDefault()
                    current.click()
                }else if( $('#quickActionResults a').length != 0){
                    e.preventDefault()
                    $('#quickActionResults a:first').click()
                }
                break;

                case 27: //escape
                that.initiateQuickAction()
                break;

                default: //all other keypresses should be typing in this mode, so we should be focused on the input
                $('#quickActionSearchbar').focus()
                break;
            }
        })
        
        $('#quickActionBackground').bind('click.quickActionDismiss',function(event){
            console.log('boppin')
            QuickActions.initiateQuickAction()
        })
    }

    static quickOpenDocsLink = (link:string) :void => {
        var win = window.open(link, '_blank');
        if (win) {
            //Browser has allowed it to be opened
            win.focus();
        } else {
            //Browser has blocked it
            alert('Please allow popups for this website');
        }
    }

}