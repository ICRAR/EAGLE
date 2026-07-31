import { EagleConfig } from './EagleConfig';
import { ParameterTable } from './ParameterTable';
import { Setting } from './Setting';
import * as ko from "knockout";

type SettingStoredValue = string | number | boolean;
type StoredUiModeSetting = {key: string; value: SettingStoredValue};
type StoredUiMode = {name: string; description: string; settingValues: StoredUiModeSetting[]};

const isSettingStoredValue = (value: unknown): value is SettingStoredValue => typeof value === "string" || typeof value === "number" || typeof value === "boolean";

const parseUiModesFromStorage = (uiModesString: string): Array<Record<string, unknown>> => {
    const parsed: unknown = JSON.parse(uiModesString);
    if (!Array.isArray(parsed)){
        return [];
    }

    return parsed.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null);
};

export class UiModeSystem {
    static activeUiMode : UiMode;
    static localStorageUpdateCoolDown : boolean = false;

    static getUiModes(): UiMode[] {
        return UiModes;
    }

    static getActiveUiMode() : UiMode {
        return UiModeSystem.activeUiMode;
    }

    static getUiModeNamesList() : string[] {
        const uiModeNamesList : string[] = []

        //this generates the list of ui mode options the user can select in the settings modal, student mode is not added to this list of options as it is not meant for the normal user. 
        //It is only used when loading eagle with a specific url
        UiModeSystem.getUiModes().forEach(function(uiMode){
            if(uiMode.getName() !== 'Student'){
                uiModeNamesList.push(uiMode.getName())
            }
        })
        return uiModeNamesList
    }

    static getFullUiModeNamesList() : string[] {
        return UiModeSystem.getUiModes().map(x => x.getName());
    }

    static getUiModeByName(name:string) : UiMode | undefined {
        for (const uiMode of UiModeSystem.getUiModes()){
            if(name === uiMode.getName()){
                return uiMode
            }
        }

        return undefined;
    }

    static setActiveUiMode(newActiveUiMode:UiMode) : void {
        UiModeSystem.activeUiMode = newActiveUiMode;

        //setting up the settings array with the selected ui mode
        UiModeSystem.getActiveUiMode().getSettings().forEach(function(setting){
            Setting.setValue(setting.getKey(),setting.getValue())
        })

        ParameterTable.setActiveColumnVisibility()
        localStorage.setItem('activeUiMode', UiModeSystem.getActiveUiMode().getName());
    }

    static setActiveUiModeByName = (newUiModeName:string) : void => {
        const uiMode = UiModeSystem.getUiModeByName(newUiModeName);
        if (typeof uiMode !== "undefined"){
            UiModeSystem.setActiveUiMode(uiMode);
        } else {
            console.warn('active ui mode: "'+newUiModeName+'" not found, setting ui mode to default.')
            UiModeSystem.setActiveUiMode(UiModes[2])
        }
    }

    static initialise() : void {
        //setting cooldown for the update to local storage function to prevent uploads during eagle's initialisation
        UiModeSystem.localStorageUpdateCoolDown = true;
        setTimeout(function () {
            UiModeSystem.localStorageUpdateCoolDown = false;
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

    static saveToLocalStorage() : void {
        //we are using a cooldown function here. this is to prevent rapid saving when many changes happen to the array at once, for example when loading eagle or changing ui modes.
        //essentially we wait for one second with the cooldown, then upload the accumulated changes and reset the cooldown.
        //the unwanted calls to save are due to the need to have the Settings class array and UiModes Class Array linked
        //this is because settings is essentially a copy of the active ui mode interacting with the ui and it has a subscribe function to keep the uimodes array in sync when it is changed by the user.
        if(!UiModeSystem.localStorageUpdateCoolDown){
            UiModeSystem.localStorageUpdateCoolDown = true;
            setTimeout(function () {
                const uiModesObj : StoredUiMode[] = []
                UiModeSystem.getUiModes().forEach(function(uiMode:UiMode){
                    const uiModeObj: StoredUiMode = {
                        name : uiMode.getName(),
                        description : uiMode.getDescription(),
                        settingValues : []
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
                UiModeSystem.localStorageUpdateCoolDown = false;
            }, EagleConfig.STANDARD_UI_LONG_TIMEOUT);
        }
    }

    static loadFromLocalStorage() : void {
        const uiModesString = localStorage.getItem('UiModes')
        if(uiModesString === null){
            return
        }

        const uiModesObj = parseUiModesFromStorage(uiModesString);

        uiModesObj.forEach(function(uiModeObj){
            if (typeof uiModeObj.name !== "string" || typeof uiModeObj.description !== "string"){
                return;
            }

            let destUiMode = UiModeSystem.getUiModeByName(uiModeObj.name)
            if(typeof destUiMode === "undefined"){
                const settings : SettingData[] = []
                
                Setting.getSettings().forEach(function(settingsGroup){
                    settingsGroup.getSettings().forEach(function(setting){
                        settings.push(new SettingData(setting.getKey(),setting.getGraphDefaultVal(),setting.getPerpetual()))
                    })
                })

                destUiMode = new UiMode(uiModeObj.name, uiModeObj.description, settings, false)
            }

            const settingValues = uiModeObj.settingValues;
            if (!Array.isArray(settingValues)){
                return;
            }

            settingValues.forEach(function(settingObj){
                if (typeof settingObj !== "object" || settingObj === null){
                    return;
                }

                const settingObjRecord = settingObj as Record<string, unknown>;
                const key = settingObjRecord.key;
                const value = settingObjRecord.value;
                if (typeof key === "string" && isSettingStoredValue(value)){
                    destUiMode.setSettingByKey(key, value)
                }
            })
        })
    }

    static setActiveSetting(settingName:string, newValue:SettingStoredValue) : void {
        let activeSetting: SettingData | null = null

        //if a setting is marked perpetual we will write the value to all ui modes, this means it stays the same regardless of which ui mode is active
        for (const setting of UiModeSystem.getActiveUiMode().getSettings()){
            if (setting.getKey() === settingName){
                activeSetting = setting
            }
        }
        
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

    getSettingByKey = (key:string) : SettingStoredValue | undefined => {
        for(const setting of this.getSettings()){
            if(setting.getKey() === key){
                return setting.getValue()
            }
        }

        return undefined;
    }

    setSettingByKey = (key:string, value:SettingStoredValue) : void => {
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
    private value : ko.Observable<SettingStoredValue>;
    private perpetual : boolean;

    constructor(key : string, value : SettingStoredValue, perpetual : boolean){
        this.key = key;
        this.value= ko.observable(value);
        this.perpetual = perpetual;
    }

    getKey = () : string => {
        return this.key;
    }

    getValue = () : SettingStoredValue => {
        return this.value()
    }

    isPerpetual = () : boolean => {
        return this.perpetual;
    }

    setValue = (newValue:SettingStoredValue) : void => {
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
