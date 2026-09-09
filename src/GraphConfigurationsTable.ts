import { EagleBottomWindowMode } from './Eagle';
import { Setting } from "./Setting";
import { SideWindow } from "./SideWindow";

export class GraphConfigurationsTable {

    static toggleTable = () : void => {
        //if we are already in the requested mode, we can toggle the bottom window
        if(Setting.findValue<EagleBottomWindowMode>(Setting.BOTTOM_WINDOW_MODE, EagleBottomWindowMode.None) === EagleBottomWindowMode.GraphConfigsTable){
            SideWindow.toggleShown('bottom')
        }else{
            this.openTable()
        }
    }

    static openTable = () : void => {
            
        //if a modal is open, closed it
        if($('.modal.show').length>0){
            $('.modal.show').modal('hide')
        }
        
        Setting.setValue(Setting.BOTTOM_WINDOW_MODE, EagleBottomWindowMode.GraphConfigsTable)
        SideWindow.setShown('bottom',true)
    }
}


