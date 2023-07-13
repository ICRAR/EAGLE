import {Eagle} from './Eagle';
import {Category} from './Category';
import {Utils} from './Utils';
import {Errors} from './Errors';
import { Setting } from './Setting';
import { ParameterTable } from './ParameterTable';
import {KeyboardShortcut} from './KeyboardShortcut';

export class QuickActions {
    
    static initiateQuickAction = () : void  =>{
        //function to both start and close the quick action menu
        const eagle = (<any>window).eagle;
        eagle.quickActionOpen(!eagle.quickActionOpen())
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
            $('#quickActionSearchbar').val('')
        },50)
    }

    static findQuickActionResults = () : any[]  =>{
        const eagle = (<any>window).eagle;
        const searchTerm :string = eagle.quickActionSearchTerm().toLocaleLowerCase()

        let resultsList:any[] = []

        let wordMatch:any[] = []
        let tagMatch:any[] = []
        let startMatch:any[] = []
        let tagStartMatch:any[] = []
        let anyMatch:any[] = []

        if(searchTerm != ''){

            KeyboardShortcut.getShortcuts().forEach(function(shortcut:KeyboardShortcut){
                let result:any[] = []

                //checks if there is a match
                let match = false

                if(shortcut.name.toLocaleLowerCase().includes(searchTerm)){
                    match = true
                }
                
                shortcut.quickActionTags.forEach(function(tag){
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
                    let resultTitle:string = shortcut.name;
                    let resultAction:any = shortcut.run;
                    let resultShortcut:string;

                    if(shortcut.modifier != 'none'){
                        resultShortcut = shortcut.modifier +" "+ shortcut.keys
                    }else{
                        resultShortcut = shortcut.keys.toString()
                    }
                    result.push(resultTitle,resultAction,resultShortcut)
             
                    // adding priority to each search result, this affects the order in which the result appear
                    const searchableArr = shortcut.name.split(' ');
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
                            for(const tag of shortcut.quickActionTags){
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

                    //pushing the results in order of priority
                    if(wordMatched){
                        wordMatch.push(result)
                    }else if(tagMatched){
                        tagMatch.push(result)
                    }else if(startMatched){
                        startMatch.push(result)
                    }else if(tagStartMatched){
                        tagStartMatch.push(result)
                    }else{
                        anyMatch.push(result)
                    }
                }
            })
            
            //adding the contents of each of the priority arrays into the results array, in order of priority
            //the ... means we are appending only the entries, not the array itself
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

    static executeQuickAction = (data:any) : void  =>{
        const eagle = (<any>window).eagle;
        this.initiateQuickAction()
        data[1](eagle)
    }

    static getQuickActionShortcutHtml = (data:any) : string => {
        return ' ['+data[2]+']'
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

}