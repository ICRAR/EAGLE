export enum Category {
    Start = "Start",
    End = "End",
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
    UnknownApplication = "UnknownApplication", // when we know the component is an application, but know wlmost nothing else about it

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
        icon: string,
        color: string,
        collapsedHeaderOffsetY: number,
        expandedHeaderOffsetY: number,
        sortOrder: number
    };

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

    export enum Color {
        Data = "#2c2c2c",
        Application = "#0059a5",
        Group = "rgb(211 165 0)",
        Description = "rgb(157 43 96)",
        Error = "#FF66CC",
        Control = "rgb(88 167 94)",
        Service = "purple"
    }

    // by default, these enums are given ascending integer values, so the sort order is implicit in the ordering of items
    export enum SortOrder {
        Control,
        Application,
        Data,
        Construct,
        Documentation,
        Service,
        Other
    }
}
