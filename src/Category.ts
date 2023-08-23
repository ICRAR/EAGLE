export enum Category {
    Comment = "Comment",
    Description = "Description",
    Scatter = "Scatter",
    Gather = "Gather",
    MKN = "MKN",
    GroupBy = "GroupBy",
    Loop = "Loop",

    PythonApp = "PythonApp",
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

    Component = "Component" // legacy only
}

export namespace Category {

    export type CategoryData = {
        categoryType: Type,
        isResizable:boolean,
        canContainComponents:boolean,
        minInputs: number,
        maxInputs: number,
        minOutputs: number,
        maxOutputs: number,
        canHaveInputApplication: boolean,
        canHaveOutputApplication: boolean,
        canHaveComponentParameters: boolean,
        canHaveApplicationArguments: boolean,
        canHaveConstructParameters: boolean, 
        icon: string,
        color: string,
        collapsedHeaderOffsetY: number,
        expandedHeaderOffsetY: number,
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
        Control = "rgb(88 167 94)",
        Data = "#2c2c2c",
        Description = "rgb(157 43 96)",
        Error = "#FF66CC",
        Group = "rgb(211 165 0)",
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
        Other
    }
}
