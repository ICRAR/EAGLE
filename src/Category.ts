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
    GlobalVariable = "GlobalVariable",

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
    PythonApp = "PythonApp",
    EnvironmentVariables = "EnvironmentVariables",
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
        color: string
    };

    // TODO: add to CategoryData somehow? use in Node.isData() etc?
    export enum Type {
        Application = "Application",
        Construct = "Construct",
        Container = "Container",
        Data = "Data",
        Global = "Global",
        Other = "Other",
        Service = "Service",
        Socket = "Socket",
        Unknown = "Unknown",
    }

    export enum Color {
        Application = "#0059a5",
        Construct   = "#e3bd64",
        Data        = "#2c2c2c",
        Description = "#9d2b60",
        Error       = "#ff66cc",
        Global      = "#228b22",
        Legacy      = "#ff66cc",
        Object      = "#00bfa6",
        Service     = "#800080"
    }
}
