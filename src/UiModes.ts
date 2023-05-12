import {Eagle} from './Eagle';
import { ParameterTable } from './ParameterTable';
import { Setting } from './Setting';
import {Utils} from './Utils';
import * as ko from "knockout";

export class UiModeSystem {
    static activeUiMode : UiMode;
    static localStorageUpdateCooldown : boolean = false;

    static getUiModes = () :UiMode[] => {
        return UiModes;
    }

    static getActiveUiMode = () : UiMode => {
        return this.activeUiMode;
    }

    static getUiModeNamesList = () : string[] => {
        const uiModeNamesList : string[]= []
        UiModeSystem.getUiModes().forEach(function(uiMode){
            if(uiMode.getName() === 'Student'){
                //this generates the list of ui mode options the user can select in the settings modal, student mode is not added to this list of options as it is not meant for the normal user. 
                //It is only used when loading eagle with a specific url
                return
            }else{
                uiModeNamesList.push(uiMode.getName())
        }
        })
        return uiModeNamesList
    }

    static getFullUiModeNamesList = () : string[] => {
        const uiModeNamesList : string[]= []
        UiModeSystem.getUiModes().forEach(function(uiMode){
            uiModeNamesList.push(uiMode.getName())
        })
        return uiModeNamesList
    }

    static getUiModeByName = (name:string) : UiMode => {
        let result = null
        this.getUiModes().forEach(function(uiMode){
            if(name === uiMode.getName()){
                result = uiMode
            }
        })
        return result
    }

    static setActiveUiMode = (newActiveUiMode:UiMode) : void => {
        this.activeUiMode = newActiveUiMode;

        //setting up the settings array with the selected ui mode
        UiModeSystem.getActiveUiMode().getSettings().forEach(function(setting){
            Setting.setValue(setting.getKey(),setting.getValue())
        })

        ParameterTable.setActiveColumnVisibility()
        localStorage.setItem('activeUiMode', UiModeSystem.getActiveUiMode().getName());
    }

    static setActiveUiModeByName = (newUiModeName:string) : void => {
        let uiModeSet = false
        UiModeSystem.getUiModes().forEach(function(uiModeElem:UiMode){
            if(uiModeElem.getName() === newUiModeName){
                UiModeSystem.setActiveUiMode(uiModeElem)
                uiModeSet = true
            }
        })
        if(!uiModeSet){
            console.warn('active ui mode: "'+newUiModeName+'" not found, setting ui mode to default.')
            UiModeSystem.setActiveUiMode(UiModes[2])
        }
    }

    static initialise = () : void => {
        //setting cooldown for the update to local storage function to prevent uploads during eagle's initialisation
        UiModeSystem.localStorageUpdateCooldown = true;
        setTimeout(function () {
            UiModeSystem.localStorageUpdateCooldown = false;
        }, 2000)

        Setting.getSettings().forEach(function(settingsGroup){
            settingsGroup.getSettings().forEach(function(setting){
                UiModes[0].getSettings().push(new SettingData(setting.getKey(),setting.getStudentDefaultVal(),setting.getPerpetual()))
                UiModes[1].getSettings().push(new SettingData(setting.getKey(),setting.getMinimalDefaultVal(),setting.getPerpetual()))
                UiModes[2].getSettings().push(new SettingData(setting.getKey(),setting.getGraphDefaultVal(),setting.getPerpetual()))
                UiModes[3].getSettings().push(new SettingData(setting.getKey(),setting.getComponentDefaultVal(),setting.getPerpetual()))
                UiModes[4].getSettings().push(new SettingData(setting.getKey(),setting.getExpertDefaultVal(),setting.getPerpetual()))
            })
        })
        UiModeSystem.loadFromLocalStorage()
        const uiModeName = localStorage.getItem('activeUiMode')
        if(uiModeName === null){
            UiModeSystem.setActiveUiMode(UiModes[2])
        }else{
            UiModeSystem.setActiveUiModeByName(uiModeName)
        }
    }

    static saveToLocalStorage = () : void => {
        //we are using a cooldown function here. this is to prevent rapid saving when many changes happen to the array at once, for example when loading eagle or changing ui modes.
        //essentially we wait for one second with the cooldown, then upload the accumulated changes and reset the cooldown.
        //the unwanted calls to save are due to the need to have the Settings class array and UiModes Class Array linked
        //this is because settings is essentially a copy of the active ui mode interacting with the ui and it has a subscribe function to keep the uimodes array in sync when it is changed by the user.
        if(this.localStorageUpdateCooldown===false){
            this.localStorageUpdateCooldown = true;
            setTimeout(function () {
                const uiModesObj : any[] = []
                UiModeSystem.getUiModes().forEach(function(uiMode:UiMode){
                    const uiModeObj = {
                        name : uiMode.getName(),
                        description : uiMode.getDescription(),
                        settingValues : <any[]>[]
                    }
                    uiMode.getSettings().forEach(function(setting:SettingData){
                        const settingObj = {
                            key : setting.getKey(),
                            value : setting.getValue()
                        }
                        uiModeObj.settingValues.push(settingObj)
                    })
                    uiModesObj.push(uiModeObj)
                })

                localStorage.setItem('UiModes', JSON.stringify(uiModesObj));
                localStorage.setItem('activeUiMode', UiModeSystem.getActiveUiMode().getName());
                UiModeSystem.localStorageUpdateCooldown = false;
            }, 1000)
        }else{
            return
        }
    }

    static loadFromLocalStorage = () : void => {
        const uiModesObj : any[] = JSON.parse(localStorage.getItem('UiModes'))

        if(uiModesObj === null){
            return
        }

        uiModesObj.forEach(function(uiModeObj){
            let destUiMode : UiMode = UiModeSystem.getUiModeByName(uiModeObj.name)
            if(destUiMode===null){
                const settings : SettingData[] = []
                
                Setting.getSettings().forEach(function(settingsGroup){
                    settingsGroup.getSettings().forEach(function(setting){
                        settings.push(new SettingData(setting.getKey(),setting.getGraphDefaultVal(),setting.getPerpetual()))
                    })
                })

                destUiMode = new UiMode(uiModeObj.name, uiModeObj.description, settings, false)
            }
            uiModeObj.settingValues.forEach(function(settingObj:any){
                destUiMode.setSettingByKey(settingObj.key,settingObj.value)
            } )

        })
    }

    static setActiveSetting = (settingName:string,newValue:any) : any => {
        let activeSetting: SettingData  = null

        //if a setting is marked perpetual we will write the value to all ui modes, this means it stayes the same regardless of which ui  mode is active
        UiModeSystem.getActiveUiMode().getSettings().forEach(function(setting){
            if(setting.getKey() === settingName){
                activeSetting = setting
            }
        })
        
        if(activeSetting === null){
            console.warn('Requested setting key to change: "'+ settingName+'" can not be found')
            return
        }

        if(activeSetting.isPerpetual()){
                UiModeSystem.getUiModes().forEach(function(uiMode){
                    uiMode.getSettings().forEach(function(setting){
                        if(setting.getKey() === settingName){
                            setting.setValue(newValue)
                        }
                    })
                })
        }else{
            activeSetting.setValue(newValue)
        }

        UiModeSystem.saveToLocalStorage()
    }

}

export class UiMode {
    private name : string;
    private description : string;
    private settingValues : SettingData[];
    private isDefault : boolean;

    constructor(name: string, description:string, settingValues: SettingData[], isDefault:boolean){
        this.name = name;
        this.description = description;
        this.settingValues = settingValues;
        this.isDefault=isDefault
    }

    getName = () : string => {
        return this.name;
    }

    getDescription = () : string => {
        return this.description;
    }

    getSettings = () : SettingData[] => {
        return this.settingValues;
    }

    getIsDefault = () :boolean => {
        return this.isDefault;
    }

    getSettingByKey = (key:string) : void => {
        for(const setting of this.getSettings()){
            if(setting.getKey() === key){
                return setting.getValue()
            }
        }
    }

    setSettingByKey = (key:string, value:any) : void => {
        for(const setting of this.getSettings()){
            if(setting.getKey() === key){
                setting.setValue(value)
                break
            }
        }
    }
}

export class SettingData {
    private key : string;
    private value : ko.Observable<any>;
    private perpetual : boolean;

    constructor(key : string, value : any, perpetual : boolean){
        this.key = key;
        this.value= ko.observable(value);
        this.perpetual = perpetual;
    }

    getKey = () : string => {
        return this.key;
    }

    getValue = () : any => {
        return this.value()
    }

    isPerpetual = () : boolean => {
        return this.perpetual;
    }

    setValue = (newValue:any) : any => {
        this.value(newValue);
    }

    setIsPerpetual = (perpetualState:boolean) : void => {
        this.perpetual = perpetualState;
    }
}

const UiModes : UiMode[] = [
    new UiMode(
        "Student",
        'Mode Hidden from view enabled for student links',
        [],
        true
    ),
    new UiMode(
        "Minimal",
        'Simply for loading, changing key attributes and translating graphs',
        [],
        true
    ),
    new UiMode(
        "Graph",
        'Set up to be able to create and edit graphs',
        [],
        true
    ),
    new UiMode(
        "Component",
        'Create and edit Components and Palettes.',
        [],
        true
    ),
    new UiMode(
        "Expert",
        'Everything enabled and all safe guards removed.',
        [],
        true
    )
];
