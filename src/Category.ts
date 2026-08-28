/* TODO: should this stuff be in Daliuge.ts? */

export enum CategoryName {
    Comment = "Comment",

    Scatter = "Scatter",
    Gather = "Gather",
    GroupBy = "GroupBy",
    Loop = "Loop",

    DALiuGEApp = "DALiuGEApp",
    PyFuncApp = "PyFuncApp",
    BashShellApp = "BashShellApp",
    DynlibApp = "DynlibApp",
    DynlibProcApp = "DynlibProcApp",
    Mpi = "Mpi",
    Docker = "Docker",
    Singularity = "Singularity",

    PythonMemberFunction = "PythonMemberFunction",
    PythonObject = "PythonObject",
    DynlibMemberFunction = "DynlibMemberFunction",
    DynlibObject = "DynlibObject",

    NGAS = "NGAS",
    S3 = "S3",
    Memory = "Memory",
    SharedMemory = "SharedMemory",
    File = "File",
    Directory = "Directory",
    Plasma = "Plasma",
    PlasmaFlight = "PlasmaFlight",
    RDBMS = "RDBMS",
    Data = "Data",

    ParameterSet = "ParameterSet",
    GlobalVariables = "GlobalVariables",

    Service = "Service",

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

// TODO: add to CategoryData somehow? use in Node.isData() etc?
export enum CategoryType {
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

export enum CategoryColor {
    Application = "#0059a5",
    Construct   = "#e3bd64",
    Data        = "#2c2c2c",
    Description = "#9d2b60",
    Error       = "#ff66cc",
    Global      = "#228b22",
    Object      = "#00bfa6",
    Service     = "#800080"
}
