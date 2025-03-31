export enum Category {
    Comment = "Comment",

    Scatter = "Scatter",
    Gather = "Gather",
    MKN = "MKN",
    GroupBy = "GroupBy",
    Loop = "Loop",

    DALiuGEApp = "DALiuGEApp",
    PyFuncApp = "PyFuncApp",
    BashShellApp = "BashShellApp",
    DynlibApp = "DynlibApp",
    DynlibProcApp = "DynlibProcApp",
    Mpi = "Mpi",
    Docker = "Docker",

    PythonMemberFunction = "PythonMemberFunction",
    PythonObject = "PythonObject",

    NGAS = "NGAS",
    S3 = "S3",
    Memory = "Memory",
    SharedMemory = "SharedMemory",
    File = "File",
    Plasma = "Plasma",
    PlasmaFlight = "PlasmaFlight",
    Data = "Data",

    ParameterSet = "ParameterSet",
    EnvironmentVariables = "EnvironmentVariables",

    Service = "Service",
    ExclusiveForceNode = "ExclusiveForceNode",

    Branch = "Branch",

    SubGraph = "SubGraph",

    Unknown = "Unknown",
    None = "None",
    UnknownApplication = "UnknownApplication", // when we know the component is an application, but know almost nothing else about it

    // legacy only
    Component = "Component",
    Description = "Description",
}

export namespace Category {

    export type CategoryData = {
        categoryType: Type,

        isGroup:boolean,
        minInputs: number,
        maxInputs: number,
        minOutputs: number,
        maxOutputs: number,
        canHaveComponentParameters: boolean,
        canHaveApplicationArguments: boolean,
        canHaveConstructParameters: boolean, 
        icon: string,
        color: string,
        sortOrder: number
    };

    // TODO: add to CategoryData somehow? use in Node.isData() etc?
    export enum Type {
        Application = "Application",
        Construct = "Construct",
        Container = "Container",
        Control = "Control",
        Data = "Data",
        Other = "Other",
        Service = "Service",
        Socket = "Socket",
        Unknown = "Unknown",
    }

    export enum Color {
        Application = "#0059a5",
        Control = "rgb(46 161 55)",
        Data = "#2c2c2c",
        Description = "rgb(157 43 96)",
        Error = "#FF66CC",
        Group = "rgb(227 189 100)",
        Legacy = "#FF66CC",
        Object = "#00bfa6",
        Service = "purple"
    }

    // by default, these enums are given ascending integer values, so the sort order is implicit in the ordering of items
    export enum SortOrder {
        Control,
        Application,
        Object,
        Data,
        Construct,
        Documentation,
        Service,
        Other,
        Legacy
    }
}
