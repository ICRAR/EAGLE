import { Category } from './Category';

export class CategoryData {
    static readonly cData : {[category:string] : Category.CategoryData} = {
        Branch               : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 2, maxOutputs: 2, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-branch", color: Category.Color.Application, sortOrder: Category.SortOrder.Application},
        ExclusiveForceNode   : {categoryType: Category.Type.Construct, isGroup: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: false, canHaveApplicationArguments: false, canHaveConstructParameters: false, icon: "icon-force_node", color: Category.Color.Construct, sortOrder: Category.SortOrder.Construct},

        Comment              : {categoryType: Category.Type.Other, isGroup: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: false, canHaveApplicationArguments: false, canHaveConstructParameters: false, icon: "icon-comment", color: Category.Color.Description, sortOrder: Category.SortOrder.Documentation},
        
        Scatter              : {categoryType: Category.Type.Construct, isGroup: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: true, icon: "icon-scatter", color: Category.Color.Construct, sortOrder: Category.SortOrder.Construct},
        Gather               : {categoryType: Category.Type.Construct, isGroup: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: true, icon: "icon-gather", color: Category.Color.Construct, sortOrder: Category.SortOrder.Construct},
        MKN                  : {categoryType: Category.Type.Construct, isGroup: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: true, icon: "icon-many_to_many", color: Category.Color.Construct, sortOrder: Category.SortOrder.Construct},
        GroupBy              : {categoryType: Category.Type.Construct, isGroup: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: true, icon: "icon-group", color: Category.Color.Construct, sortOrder: Category.SortOrder.Construct},
        Loop                 : {categoryType: Category.Type.Construct, isGroup: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: true, icon: "icon-loop", color: Category.Color.Construct, sortOrder: Category.SortOrder.Construct},
        SubGraph             : {categoryType: Category.Type.Construct, isGroup: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: true, icon: "icon-sub_graph", color: Category.Color.Construct, sortOrder: Category.SortOrder.Construct},

        DALiuGEApp           : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-daliugeApp", color: Category.Color.Application, sortOrder: Category.SortOrder.Application},
        PyFuncApp            : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-python_function", color: Category.Color.Application, sortOrder: Category.SortOrder.Application},
        BashShellApp         : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-bash", color: Category.Color.Application, sortOrder: Category.SortOrder.Application},
        DynlibApp            : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-dynamic_library", color: Category.Color.Application, sortOrder: Category.SortOrder.Application},
        DynlibProcApp        : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-dynamic_library", color: Category.Color.Application, sortOrder: Category.SortOrder.Application},
        Mpi                  : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-mpi", color: Category.Color.Application, sortOrder: Category.SortOrder.Application},
        Docker               : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-docker", color: Category.Color.Application, sortOrder: Category.SortOrder.Application},
        Singularity          : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-singularity", color: Category.Color.Application, sortOrder: Category.SortOrder.Application},
        UnknownApplication   : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-question_mark", color: Category.Color.Error, sortOrder: Category.SortOrder.Other},

        PythonMemberFunction : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-python_member_function", color: Category.Color.Object, sortOrder: Category.SortOrder.Application},
        PythonObject         : {categoryType: Category.Type.Data, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-python_object", color: Category.Color.Object, sortOrder: Category.SortOrder.Object},
        DynlibMemberFunction : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-dynamic_library_member_function", color: Category.Color.Object, sortOrder: Category.SortOrder.Application},
        DynlibObject         : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-dynamic_library_object", color: Category.Color.Object, sortOrder: Category.SortOrder.Object},

        File                 : {categoryType: Category.Type.Data, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-description", color: Category.Color.Data, sortOrder: Category.SortOrder.Data},
        Memory               : {categoryType: Category.Type.Data, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-memory", color: Category.Color.Data, sortOrder: Category.SortOrder.Data},
        SharedMemory         : {categoryType: Category.Type.Data, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-shared_memory", color: Category.Color.Data, sortOrder: Category.SortOrder.Data},
        NGAS                 : {categoryType: Category.Type.Data, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-ngas", color: Category.Color.Data, sortOrder: Category.SortOrder.Data},
        S3                   : {categoryType: Category.Type.Data, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-s3_bucket", color: Category.Color.Data, sortOrder: Category.SortOrder.Data},
        ParameterSet         : {categoryType: Category.Type.Data, isGroup: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-tune", color: Category.Color.Data, sortOrder: Category.SortOrder.Data},
        EnvironmentVariables : {categoryType: Category.Type.Data, isGroup: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-tune", color: Category.Color.Data, sortOrder: Category.SortOrder.Data},
        Data                 : {categoryType: Category.Type.Data, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-hard_drive", color: Category.Color.Data, sortOrder: Category.SortOrder.Data},

        Plasma               : {categoryType: Category.Type.Service, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-plasma", color: Category.Color.Service, sortOrder: Category.SortOrder.Service},
        PlasmaFlight         : {categoryType: Category.Type.Service, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-plasma_flight", color: Category.Color.Service, sortOrder: Category.SortOrder.Service},
        RDBMS                : {categoryType: Category.Type.Service, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-database", color: Category.Color.Service, sortOrder: Category.SortOrder.Service},
        Service              : {categoryType: Category.Type.Service, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-database", color: Category.Color.Service, sortOrder: Category.SortOrder.Service},

        Unknown              : {categoryType: Category.Type.Unknown, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-question_mark", color: Category.Color.Error, sortOrder: Category.SortOrder.Other},
        None                 : {categoryType: Category.Type.Unknown, isGroup: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: false, canHaveApplicationArguments: false, canHaveConstructParameters: false, icon: "icon-none", color: Category.Color.Error, sortOrder: Category.SortOrder.Other},

        // legacy
        Component            : {categoryType: Category.Type.Unknown, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: true, icon: "icon-none", color: Category.Color.Legacy, sortOrder: Category.SortOrder.Legacy},
        Description          : {categoryType: Category.Type.Other, isGroup: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: false, canHaveApplicationArguments: false, canHaveConstructParameters: false, icon: "icon-paragraph-justify", color: Category.Color.Legacy, sortOrder: Category.SortOrder.Legacy},
        PythonApp            : {categoryType: Category.Type.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-python", color: Category.Color.Application, sortOrder: Category.SortOrder.Legacy},
    };

    static getCategoryData(category : Category) : Category.CategoryData {
        const c = CategoryData.cData[category];

        if (typeof c === 'undefined'){
            return {
                categoryType: Category.Type.Unknown,
                isGroup: false,
                minInputs: 0,
                maxInputs: 0,
                minOutputs: 0,
                maxOutputs: 0,
                canHaveComponentParameters: false,
                canHaveApplicationArguments: false,
                canHaveConstructParameters: false,
                icon: "icon-none",
                color: "pink",
                sortOrder: Number.MAX_SAFE_INTEGER,
            };
        }

        return c;
    }
}

export namespace CategoryData {
    export const INTERMEDIATE_DATA_NODES: Category[] = (Object.keys(Category) as Category[]).filter((category: Category) => {
        const cData = CategoryData.getCategoryData(category);
        return cData.categoryType === Category.Type.Data && cData.maxInputs >= 1 && cData.maxOutputs >= 1;
    });
}