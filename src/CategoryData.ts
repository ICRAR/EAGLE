import {Category} from './Category';

export class CategoryData {
    static readonly cData : {[category:string] : Category.CategoryData} = {
        Start                : {categoryType: Category.Type.Control, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-play_arrow", color: Category.Color.Control, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Control},
        End                  : {categoryType: Category.Type.Control, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-stop", color: Category.Color.Control, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Control},
        Branch               : {categoryType: Category.Type.Control, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 2, maxOutputs: 2, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-share", color: Category.Color.Control, collapsedHeaderOffsetY: 20, expandedHeaderOffsetY: 54, sortOrder: Category.SortOrder.Control},
        ExclusiveForceNode   : {categoryType: Category.Type.Control, isResizable: true, canContainComponents: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: false, canHaveApplicationArguments: false, icon: "icon-force_node", color: Category.Color.Control, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Control},

        Comment              : {categoryType: Category.Type.Other, isResizable: true, canContainComponents: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: false, canHaveApplicationArguments: false, icon: "icon-comment", color: Category.Color.Description, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Documentation},
        Description          : {categoryType: Category.Type.Other, isResizable: true, canContainComponents: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: false, canHaveApplicationArguments: false, icon: "icon-description", color: Category.Color.Description, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Documentation},

        Scatter              : {categoryType: Category.Type.Construct, isResizable: true, canContainComponents: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-call_split", color: Category.Color.Group, collapsedHeaderOffsetY: 20, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Construct},
        Gather               : {categoryType: Category.Type.Construct, isResizable: true, canContainComponents: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-merge_type", color: Category.Color.Group, collapsedHeaderOffsetY: 20, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Construct},
        MKN                  : {categoryType: Category.Type.Construct, isResizable: true, canContainComponents: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: true, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-many-to-many", color: Category.Color.Group, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Construct},
        GroupBy              : {categoryType: Category.Type.Construct, isResizable: true, canContainComponents: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: true, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-group", color: Category.Color.Group, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Construct},
        Loop                 : {categoryType: Category.Type.Construct, isResizable: true, canContainComponents: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: true, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-loop", color: Category.Color.Group, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Construct},
        SubGraph             : {categoryType: Category.Type.Construct, isResizable: true, canContainComponents: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: false, canHaveApplicationArguments: false, icon: "icon-subgraph", color: Category.Color.Group, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Construct},

        PythonApp            : {categoryType: Category.Type.Application, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-python", color: Category.Color.Application, collapsedHeaderOffsetY: 10, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Application},
        PyFuncApp            : {categoryType: Category.Type.Application, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-python", color: Category.Color.Application, collapsedHeaderOffsetY: 10, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Application},
        BashShellApp         : {categoryType: Category.Type.Application, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-bash", color: Category.Color.Application, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Application},
        DynlibApp            : {categoryType: Category.Type.Application, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-dynamic_library", color: Category.Color.Application, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Application},
        DynlibProcApp        : {categoryType: Category.Type.Application, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-dynamic_library", color: Category.Color.Application, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Application},
        Mpi                  : {categoryType: Category.Type.Application, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-mpi", color: Category.Color.Application, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Application},
        Docker               : {categoryType: Category.Type.Application, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-docker", color: Category.Color.Application, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Application},
        Singularity          : {categoryType: Category.Type.Application, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-singularity", color: Category.Color.Application, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Application},
        UnknownApplication   : {categoryType: Category.Type.Application, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-question_mark", color: Category.Color.Error, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Other},

        File                 : {categoryType: Category.Type.Data, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-hard-drive", color: Category.Color.Data, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Data},
        Memory               : {categoryType: Category.Type.Data, isResizable: false, canContainComponents: false, minInputs: 1, maxInputs: 1, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-memory", color: Category.Color.Data, collapsedHeaderOffsetY: 16, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Data},
        SharedMemory         : {categoryType: Category.Type.Data, isResizable: false, canContainComponents: false, minInputs: 1, maxInputs: 1, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-shared_memory", color: Category.Color.Data, collapsedHeaderOffsetY: 16, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Data},
        NGAS                 : {categoryType: Category.Type.Data, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-ngas", color: Category.Color.Data, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Data},
        S3                   : {categoryType: Category.Type.Data, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-s3_bucket", color: Category.Color.Data, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Data},
        ParameterSet         : {categoryType: Category.Type.Data, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-tune", color: Category.Color.Data, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Data},
        EnvironmentVariables : {categoryType: Category.Type.Data, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-tune", color: Category.Color.Data, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Data},
        Data                 : {categoryType: Category.Type.Data, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-hard-drive", color: Category.Color.Data, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Data},

        Plasma               : {categoryType: Category.Type.Service, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-plasma", color: Category.Color.Service, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Service},
        PlasmaFlight         : {categoryType: Category.Type.Service, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-plasmaflight", color: Category.Color.Service, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Service},
        RDBMS                : {categoryType: Category.Type.Service, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: false, icon: "icon-hard-drive", color: Category.Color.Service, collapsedHeaderOffsetY: 4, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Service},

        Unknown              : {categoryType: Category.Type.Unknown, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: true, canHaveApplicationArguments: true, icon: "icon-question_mark", color: Category.Color.Error, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Other},
        None                 : {categoryType: Category.Type.Unknown, isResizable: false, canContainComponents: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveInputApplication: false, canHaveOutputApplication: false, canHaveComponentParameters: false, canHaveApplicationArguments: false, icon: "icon-none", color: Category.Color.Error, collapsedHeaderOffsetY: 0, expandedHeaderOffsetY: 20, sortOrder: Category.SortOrder.Other},

    };

    static getCategoryData = (category : Category) : Category.CategoryData => {
        const c = CategoryData.cData[category];

        if (typeof c === 'undefined'){
            console.error("Could not fetch category data for category", category);
            return {
                categoryType: Category.Type.Unknown,
                isResizable: false,
                canContainComponents: false,
                minInputs: 0,
                maxInputs: 0,
                minOutputs: 0,
                maxOutputs: 0,
                canHaveInputApplication: false,
                canHaveOutputApplication: false,
                canHaveComponentParameters: false,
                canHaveApplicationArguments: false,
                icon: "error",
                color: "pink",
                collapsedHeaderOffsetY: 0,
                expandedHeaderOffsetY: 20,
                sortOrder: Number.MAX_SAFE_INTEGER,
            };
        }

        return c;
    }
}