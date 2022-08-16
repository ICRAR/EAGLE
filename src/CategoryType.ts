import * as ko from "knockout";

import {Eagle} from './Eagle';
import {Utils} from './Utils';

export namespace CategoryType {
    // TODO: add to CategoryData somehow? use in Node.isData() etc?
    export enum Type {
        Application = "Application",
        Container = "Container",
        Control = "Control",
        Data = "Data",
        Construct = "Construct",
        Other = "Other",
        Service = "Service",
        Socket = "Socket",
        Unknown = "Unknown",
    }
}
