import {Eagle} from './Eagle';
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
        let uiModeNamesList : string[]= []
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
        this.updateSettingsArray()
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
            UiModeSystem.setActiveUiMode(UiModes[1])
        }
    }

    static initialise = () : void => {
        //setting cooldown for the update to local storage funciton to prevent uploads during eagle's initialisation
        UiModeSystem.localStorageUpdateCooldown = true;
        setTimeout(function () {
            UiModeSystem.localStorageUpdateCooldown = false;
        }, 1000)

        Setting.getSettings().forEach(function(settingsGroup){
            settingsGroup.getSettings().forEach(function(setting){
                UiModes[0].getSettings().push(new SettingData(setting.getKey(),setting.getMinimalDefaultVal(),setting.getPerpetual()))
                UiModes[1].getSettings().push(new SettingData(setting.getKey(),setting.getGraphDefaultVal(),setting.getPerpetual()))
                UiModes[2].getSettings().push(new SettingData(setting.getKey(),setting.getExpertDefaultVal(),setting.getPerpetual()))
            })
        })
        UiModeSystem.loadFromLocalStorage()
        const uiModeName = localStorage.getItem('activeUiMode')
        if(uiModeName === null){
            UiModeSystem.setActiveUiMode(UiModes[1])
        }else{
            UiModeSystem.setActiveUiModeByName(uiModeName)
        }
    }

    static saveToLocalStorage = () : void => {
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
                let settings : SettingData[] = []
                
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

    static updateSettingsArray = () : void => {
        UiModeSystem.getActiveUiMode().getSettings().forEach(function(setting){
            Setting.setValue(setting.getKey(),setting.getValue())
        })
    }

    static getActiveSetting = (settingName:string) : any => {
        let found = false
        let value:any = null
        UiModeSystem.getActiveUiMode().getSettings().forEach(function(setting){
            if(setting.getKey() === settingName){
                value = setting.getValue();
                found = true;
            }
        })
        if(!found){
            console.warn('Requested setting: "'+ settingName+'" can not be found')
        }else{
            return value
        }
    }

    static setActiveSetting = (settingName:string,newValue:any) : any => {
        let found = false
        let settingIsPerpetual = false

        //if a setting is marked perpetual we will write the value to all ui modes, this means it stayes the same regardless of which ui  mode is active
        UiModeSystem.getActiveUiMode().getSettings().forEach(function(setting){
            if(setting.getKey() === settingName){
                settingIsPerpetual = setting.isPerpetural()
            }
        })

        if(settingIsPerpetual){
                UiModeSystem.getUiModes().forEach(function(uiMode){
                    uiMode.getSettings().forEach(function(setting){
                        if(setting.getKey() === settingName){
                            found = true
                            setting.setValue(newValue)
                        }
                    })
                })
        }else{
            UiModeSystem.getActiveUiMode().getSettings().forEach(function(setting){
                if(setting.getKey() === settingName){
                    found = true
                    setting.setValue(newValue)
                }
            })
        }
        if(!found){
            console.warn('Requested setting key to change: "'+ settingName+'" can not be found')
        }else{
            UiModeSystem.saveToLocalStorage()
        }
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
        this.getSettings().forEach(function(setting:any){
            if(setting.getKey() === key){
                return setting.getValue()
            }
        })
    }

    setSettingByKey = (key:string, value:any) : void => {
        this.getSettings().forEach(function(setting:any){
            if(setting.getKey() === key){
                setting.setValue(value)
            }
        })
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

    isPerpetural = () : boolean => {
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
        "Expert",
        'Has just about everything enabled',
        [],
        true
    ),
];
