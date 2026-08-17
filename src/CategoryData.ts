import { Category, CategoryColor, CategoryType } from './Category';
import { EagleConfig } from './EagleConfig';

export class CategoryData {
    static readonly cData: Record<string, Readonly<{
        categoryType: CategoryType;
        isGroup: boolean;
        minInputs: number;
        maxInputs: number;
        minOutputs: number;
        maxOutputs: number;
        canHaveComponentParameters: boolean;
        canHaveApplicationArguments: boolean;
        canHaveConstructParameters: boolean;
        icon: string;
        color: string;
        radius: number;
    }>> = {
        Branch               : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 2, maxOutputs: 2, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-branch", color: CategoryColor.Application, radius: EagleConfig.BRANCH_NODE_RADIUS},

        Comment              : {categoryType: CategoryType.Other, isGroup: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: false, canHaveApplicationArguments: false, canHaveConstructParameters: false, icon: "icon-comment", color: CategoryColor.Description, radius: EagleConfig.COMMENT_NODE_WIDTH},
        
        Scatter              : {categoryType: CategoryType.Construct, isGroup: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: true, icon: "icon-scatter", color: CategoryColor.Construct, radius: EagleConfig.NORMAL_NODE_RADIUS},
        Gather               : {categoryType: CategoryType.Construct, isGroup: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: true, icon: "icon-gather", color: CategoryColor.Construct, radius: EagleConfig.NORMAL_NODE_RADIUS},
        GroupBy              : {categoryType: CategoryType.Construct, isGroup: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: true, icon: "icon-group", color: CategoryColor.Construct, radius: EagleConfig.NORMAL_NODE_RADIUS},
        Loop                 : {categoryType: CategoryType.Construct, isGroup: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: true, icon: "icon-loop", color: CategoryColor.Construct, radius: EagleConfig.NORMAL_NODE_RADIUS},
        SubGraph             : {categoryType: CategoryType.Construct, isGroup: true, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: true, icon: "icon-sub_graph", color: CategoryColor.Construct, radius: EagleConfig.NORMAL_NODE_RADIUS},

        DALiuGEApp           : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-daliugeApp", color: CategoryColor.Application, radius: EagleConfig.NORMAL_NODE_RADIUS},
        PyFuncApp            : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-python_function", color: CategoryColor.Application, radius: EagleConfig.NORMAL_NODE_RADIUS},
        BashShellApp         : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-bash", color: CategoryColor.Application, radius: EagleConfig.NORMAL_NODE_RADIUS},
        DynlibApp            : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-dynamic_library", color: CategoryColor.Application, radius: EagleConfig.NORMAL_NODE_RADIUS},
        DynlibProcApp        : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-dynamic_library", color: CategoryColor.Application, radius: EagleConfig.NORMAL_NODE_RADIUS},
        Mpi                  : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-mpi", color: CategoryColor.Application, radius: EagleConfig.NORMAL_NODE_RADIUS},
        Docker               : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-docker", color: CategoryColor.Application, radius: EagleConfig.NORMAL_NODE_RADIUS},
        Singularity          : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-singularity", color: CategoryColor.Application, radius: EagleConfig.NORMAL_NODE_RADIUS},
        UnknownApplication   : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-question_mark", color: CategoryColor.Error, radius: EagleConfig.NORMAL_NODE_RADIUS},

        PythonMemberFunction : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-python_member_function", color: CategoryColor.Object, radius: EagleConfig.NORMAL_NODE_RADIUS},
        PythonObject         : {categoryType: CategoryType.Data, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-python_object", color: CategoryColor.Object, radius: EagleConfig.NORMAL_NODE_RADIUS},
        DynlibMemberFunction : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-dynamic_library_member_function", color: CategoryColor.Object, radius: EagleConfig.NORMAL_NODE_RADIUS},
        DynlibObject         : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-dynamic_library_object", color: CategoryColor.Object, radius: EagleConfig.NORMAL_NODE_RADIUS},

        File                 : {categoryType: CategoryType.Data, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-description", color: CategoryColor.Data, radius: EagleConfig.DATA_NODE_RADIUS},
        Directory            : {categoryType: CategoryType.Data, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-folder", color: CategoryColor.Data, radius: EagleConfig.DATA_NODE_RADIUS},
        Memory               : {categoryType: CategoryType.Data, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-memory", color: CategoryColor.Data, radius: EagleConfig.DATA_NODE_RADIUS},
        SharedMemory         : {categoryType: CategoryType.Data, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 1, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-shared_memory", color: CategoryColor.Data, radius: EagleConfig.DATA_NODE_RADIUS},
        NGAS                 : {categoryType: CategoryType.Data, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-ngas", color: CategoryColor.Data, radius: EagleConfig.DATA_NODE_RADIUS},
        S3                   : {categoryType: CategoryType.Data, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-s3_bucket", color: CategoryColor.Data, radius: EagleConfig.DATA_NODE_RADIUS},
        ParameterSet         : {categoryType: CategoryType.Data, isGroup: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-tune", color: CategoryColor.Data, radius: EagleConfig.DATA_NODE_RADIUS},
        Data                 : {categoryType: CategoryType.Data, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-hard_drive", color: CategoryColor.Data, radius: EagleConfig.DATA_NODE_RADIUS},

        Plasma               : {categoryType: CategoryType.Service, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-plasma", color: CategoryColor.Service, radius: EagleConfig.NORMAL_NODE_RADIUS},
        PlasmaFlight         : {categoryType: CategoryType.Service, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-plasma_flight", color: CategoryColor.Service, radius: EagleConfig.NORMAL_NODE_RADIUS},
        RDBMS                : {categoryType: CategoryType.Service, isGroup: false, minInputs: 0, maxInputs: 1, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-database", color: CategoryColor.Service, radius: EagleConfig.NORMAL_NODE_RADIUS},
        Service              : {categoryType: CategoryType.Service, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-database", color: CategoryColor.Service, radius: EagleConfig.NORMAL_NODE_RADIUS},

        GlobalVariables      : {categoryType: CategoryType.Global, isGroup: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: true, canHaveApplicationArguments: false, canHaveConstructParameters: false, icon: "icon-tune", color: CategoryColor.Global, radius: EagleConfig.DATA_NODE_RADIUS},

        Unknown              : {categoryType: CategoryType.Unknown, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-question_mark", color: CategoryColor.Error, radius: EagleConfig.NORMAL_NODE_RADIUS},
        None                 : {categoryType: CategoryType.Unknown, isGroup: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: false, canHaveApplicationArguments: false, canHaveConstructParameters: false, icon: "icon-none", color: CategoryColor.Error, radius: EagleConfig.NORMAL_NODE_RADIUS},

        // legacy - make sure to add here AND to the LEGACY_CATEGORIES_UP array below
        Component            : {categoryType: CategoryType.Unknown, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: true, icon: "icon-none", color: CategoryColor.Legacy, radius: EagleConfig.NORMAL_NODE_RADIUS},
        Description          : {categoryType: CategoryType.Other, isGroup: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: 0, canHaveComponentParameters: false, canHaveApplicationArguments: false, canHaveConstructParameters: false, icon: "icon-none", color: CategoryColor.Legacy, radius: EagleConfig.NORMAL_NODE_RADIUS},
        PythonApp            : {categoryType: CategoryType.Application, isGroup: false, minInputs: 0, maxInputs: Number.MAX_SAFE_INTEGER, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-python", color: CategoryColor.Legacy, radius: EagleConfig.NORMAL_NODE_RADIUS},
        EnvironmentVariables : {categoryType: CategoryType.Data, isGroup: false, minInputs: 0, maxInputs: 0, minOutputs: 0, maxOutputs: Number.MAX_SAFE_INTEGER, canHaveComponentParameters: true, canHaveApplicationArguments: true, canHaveConstructParameters: false, icon: "icon-tune", color: CategoryColor.Legacy, radius: EagleConfig.DATA_NODE_RADIUS},
    };

    static readonly LEGACY_CATEGORIES_UPGRADES: Map<Category, Category> = new Map([
        [Category.Component, Category.PyFuncApp],
        [Category.Description, Category.Comment],
        [Category.EnvironmentVariables, Category.GlobalVariables],
    ]);

    static readonly INTERMEDIATE_DATA_NODES: Category[] = (Object.keys(Category) as Category[]).filter((category: Category) => {
        const cData = CategoryData.getCategoryInfo(category);
        return cData.categoryType === CategoryType.Data && cData.maxInputs >= 1 && cData.maxOutputs >= 1;
    });

    static getCategoryInfo(category : Category) : (typeof CategoryData.cData)[string] {
        const c = CategoryData.cData[category];

        if (typeof c === 'undefined'){
            return {
                categoryType: CategoryType.Unknown,
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
                radius: EagleConfig.NORMAL_NODE_RADIUS,
            };
        }

        return c;
    }
}

export const INTERMEDIATE_DATA_NODES: Category[] = CategoryData.INTERMEDIATE_DATA_NODES;