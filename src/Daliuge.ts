/*
#
#    ICRAR - International Centre for Radio Astronomy Research
#    (c) UWA - The University of Western Australia, 2016
#    Copyright by UWA (in the framework of the ICRAR)
#    All rights reserved
#
#    This library is free software; you can redistribute it and/or
#    modify it under the terms of the GNU Lesser General Public
#    License as published by the Free Software Foundation; either
#    version 2.1 of the License, or (at your option) any later version.
#
#    This library is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
#    Lesser General Public License for more details.
#
#    You should have received a copy of the GNU Lesser General Public
#    License along with this library; if not, write to the Free Software
#    Foundation, Inc., 59 Temple Place, Suite 330, Boston,
#    MA 02111-1307  USA
#
*/

import { CategoryName, CategoryType } from './Category';
import { Field } from './Field';
import { Node } from './Node';

export enum FieldName {
    DATA_VOLUME = "data_volume",
    DROP_CLASS = "dropclass",
    EXECUTION_TIME = "execution_time",
    GROUP_START = "group_start",
    GROUP_END = "group_end",
    FILE_PATH = "filepath",

    INPUT_ERROR_RATE = "input_error_threshold",
    NUM_OF_COPIES = "num_of_copies",
    NUM_OF_CPUS = "num_cpus",
    NUM_OF_INPUTS = "num_of_inputs",
    GATHER_AXIS = "gather_axis",
    NUM_OF_ITERATIONS = "num_of_iter",
    NUM_OF_TRIES = "n_tries",

    STREAMING = "streaming",
    PERSIST = "persist",

    M = "m",
    K = "k",
    N = "n",

    BASE_NAME = "base_name",
    SELF = "self",

    IMAGE = "image",
    TAG = "docker_tag",
    DIGEST = "docker_digest",

    TRUE = "true",
    FALSE = "false",

    FUNC_CODE = "func_code",
    FUNC_NAME = "func_name",
    PYDATA = "pydata",

    COMMAND = "command",
}

export enum DataType {
    Unknown = "Unknown",
    String = "String",
    Integer = "Integer",
    int = "int",
    Float = "Float",
    float = "float",
    Object = "Object",
    Boolean = "Boolean",
    bool = "bool",
    Select = "Select",
    Json = "Json",
    Python = "Python"
}

export enum Encoding {
    Dill = "dill",
    Pickle = "pickle",
    Npy = "npy",
    Path = "path",
    UTF8 = "utf-8",
    Eval = "eval",
    DataURL = "dataurl",
    Binary = "binary",
    RAW = "raw"
}

export enum FieldType {
    Application = "Application",
    Component = "Component",
    Constraint = "Constraint",
    Construct = "Construct",
    Unknown = "Unknown"
}

export enum DLGFieldType {
    ApplicationArgument = "ApplicationArgument",
    ComponentParameter = "ComponentParameter",
    ConstraintParameter = "ConstraintParameter",
    ConstructParameter = "ConstructParameter",
    Unknown = "Unknown"
}

export enum FieldUsage {
    NoPort = "NoPort",
    InputPort = "InputPort",
    OutputPort = "OutputPort",
    InputOutput = "InputOutput"
}

export enum DaliugeFileType {
    LogicalGraph = "LogicalGraph",
    LogicalGraphTemplate = "LogicalGraphTemplate",
    PhysicalGraph = "PhysicalGraph",
    PhysicalGraphTemplate = "PhysicalGraphTemplate",
    Unknown = "Unknown"
}

const dummyNode = new Node("", "", "", CategoryName.Unknown);

export class Daliuge {
    static readonly DEFAULT_PYDATA_VALUE: string = "None";
    static readonly DEFAULT_PYFUNCAPP_DROPCLASS_VALUE: string = "dlg.apps.pyfunc.PyFuncApp";
    static readonly DEFAULT_GRAPH_CONFIGURATION_NAME: string = "Default Graph Configuration";

    // automatically loaded palettes
    static readonly PALETTE_URL : string  = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/master/daliuge/daliuge-master.palette";
    static readonly TEMPLATE_URL : string = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/master/daliuge/daliuge-master-template.palette";

    // schemas
    static readonly OJS_GRAPH_SCHEMA_URL : string = "https://raw.githubusercontent.com/ICRAR/EAGLE_test_repo/master/tools/lg.graph.schema";
    static readonly V4_GRAPH_SCHEMA_URL : string = window.location.origin + "/static/lg.graph.v4.schema";

    // NOTE: eventually this can be replaced. Once we have added a new category for PythonInitialiser
    /* TODO: should we move this to Node.ts? */
    static isPythonInitialiser(node: Node): boolean {
        return node.getCategory() === CategoryName.PythonMemberFunction && (node.getName().includes("__init__") || node.getName().includes("__class__"));
    }

    static readonly groupStartField = new Field(dummyNode, FieldName.GROUP_START as FieldId, FieldName.GROUP_START, "true", "true", "Is this node the start of a group?", false, DataType.Boolean, false, [], false, FieldType.Component, FieldUsage.NoPort);
    static readonly groupEndField = new Field(dummyNode, FieldName.GROUP_END as FieldId, FieldName.GROUP_END, "true", "true", "Is this node the end of a group?", false, DataType.Boolean, false, [], false, FieldType.Component, FieldUsage.NoPort);

    static readonly dropClassField = new Field(dummyNode, FieldName.DROP_CLASS as FieldId, FieldName.DROP_CLASS, "", "", "", false, DataType.String, false, [], false, FieldType.Component, FieldUsage.NoPort);
    static readonly branchTrueField = new Field(dummyNode, FieldName.TRUE as FieldId, FieldName.TRUE, "", "", "The affirmative output from a branch node", false, DataType.Object, false, [], false, FieldType.Component, FieldUsage.OutputPort);
    static readonly branchFalseField = new Field(dummyNode, FieldName.FALSE as FieldId, FieldName.FALSE, "", "", "The negative output from a branch node", false, DataType.Object, false, [], false, FieldType.Component, FieldUsage.OutputPort);

    static readonly executionTimeField = new Field(dummyNode, FieldName.EXECUTION_TIME as FieldId, FieldName.EXECUTION_TIME, "5", "5", "", false, DataType.Float, false, [], false, FieldType.Constraint, FieldUsage.NoPort);
    static readonly numCpusField = new Field(dummyNode, FieldName.NUM_OF_CPUS as FieldId, FieldName.NUM_OF_CPUS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.Constraint, FieldUsage.NoPort);
    static readonly dataVolumeField = new Field(dummyNode, FieldName.DATA_VOLUME as FieldId, FieldName.DATA_VOLUME, "5", "5", "", false, DataType.Float, false, [], false, FieldType.Constraint, FieldUsage.NoPort);

    static readonly kField = new Field(dummyNode, FieldName.K as FieldId, FieldName.K, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.Construct, FieldUsage.NoPort);
    static readonly numCopiesField = new Field(dummyNode, FieldName.NUM_OF_COPIES as FieldId, FieldName.NUM_OF_COPIES, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.Construct, FieldUsage.NoPort);
    static readonly numInputsField = new Field(dummyNode, FieldName.NUM_OF_INPUTS as FieldId, FieldName.NUM_OF_INPUTS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.Construct, FieldUsage.NoPort);
    static readonly numIterationsField = new Field(dummyNode, FieldName.NUM_OF_ITERATIONS as FieldId, FieldName.NUM_OF_ITERATIONS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.Construct, FieldUsage.NoPort);

    static readonly baseNameField = new Field(dummyNode, FieldName.BASE_NAME as FieldId, FieldName.BASE_NAME, "", "", "The base name of the class of this Member function", false, DataType.String, false, [], false, FieldType.Component, FieldUsage.NoPort);
    static readonly funcCodeField = new Field(dummyNode, FieldName.FUNC_CODE as FieldId, FieldName.FUNC_CODE, "", "def func_name(args): return args", "Python function code", false, DataType.Python, false, [], false, FieldType.Component, FieldUsage.NoPort);
    static readonly funcNameField = new Field(dummyNode, FieldName.FUNC_NAME as FieldId, FieldName.FUNC_NAME, "", "func_name", "Python function name", false, DataType.Python, false, [], false, FieldType.Component, FieldUsage.NoPort);

    static readonly selfFieldApplication = new Field(dummyNode, FieldName.SELF as FieldId, FieldName.SELF, "", "", "", false, DataType.Object, false, [], false, FieldType.Application, FieldUsage.InputOutput);
    static readonly selfFieldComponent = new Field(dummyNode, FieldName.SELF as FieldId, FieldName.SELF, "", "", "", false, DataType.Object, false, [], false, FieldType.Component, FieldUsage.InputOutput);

    static readonly persistField = new Field(dummyNode, FieldName.PERSIST as FieldId, FieldName.PERSIST, "false", "false", "Specifies whether this data component contains data that should not be deleted after execution", false, DataType.Boolean, false, [], false, FieldType.Component, FieldUsage.NoPort);
    static readonly streamingField = new Field(dummyNode, FieldName.STREAMING as FieldId, FieldName.STREAMING, "false", "false", "Specifies whether this data component streams input and output data", false, DataType.Boolean, false, [], false, FieldType.Component, FieldUsage.NoPort);

    static readonly categoryTypeFieldsRequired = [
        {
            categoryTypes: [
                CategoryType.Application,
                CategoryType.Data
            ],
            fields: [
                Daliuge.dropClassField
            ]
        },
        {
            categoryTypes: [
                CategoryType.Application
            ],
            fields: [
                Daliuge.executionTimeField,
                Daliuge.numCpusField
            ]
        },
        {
            categoryTypes: [
                CategoryType.Data
            ],
            fields: [
                Daliuge.dataVolumeField
            ]
        }
    ];

    static readonly categoryFieldsRequired = [
        {
            categories: [
                CategoryName.Scatter
            ],
            fields: [
                Daliuge.numCopiesField
            ]
        },
        {
            categories: [
                CategoryName.Gather,
                CategoryName.GroupBy
            ],
            fields: [
                Daliuge.numInputsField
            ]
        },
        {
            categories: [
                CategoryName.Loop
            ],
            fields: [
                Daliuge.numIterationsField
            ]
        },
        {
            categories: [
                CategoryName.Branch
            ],
            fields: [
                Daliuge.branchTrueField,
                Daliuge.branchFalseField,
                Daliuge.dropClassField
            ]
        },
        {
            categories: [
                CategoryName.PythonMemberFunction
            ],
            fields: [
                Daliuge.baseNameField,
                Daliuge.selfFieldApplication
            ]
        },
        {
            categories: [
                CategoryName.PythonObject
            ],
            fields: [
                Daliuge.baseNameField,
                Daliuge.selfFieldComponent
            ]
        },
        {
            categories: [
                CategoryName.PyFuncApp,
                CategoryName.PythonMemberFunction
            ],
            fields: [
                Daliuge.funcNameField
            ]
        },
        {
            categories: [
                CategoryName.Data
            ],
            fields: [
                Daliuge.baseNameField
            ]
        }
    ];

    static readonly dlgToFieldTypeMap: { [key in DLGFieldType]: FieldType } = {
        [DLGFieldType.ApplicationArgument]: FieldType.Application,
        [DLGFieldType.ComponentParameter]: FieldType.Component,
        [DLGFieldType.ConstraintParameter]: FieldType.Constraint,
        [DLGFieldType.ConstructParameter]: FieldType.Construct,
        [DLGFieldType.Unknown]: FieldType.Unknown,
    };

    static readonly fieldTypeToDlgMap: { [key in FieldType]: DLGFieldType } = {
        [FieldType.Application]: DLGFieldType.ApplicationArgument,
        [FieldType.Component]: DLGFieldType.ComponentParameter,
        [FieldType.Constraint]: DLGFieldType.ConstraintParameter,
        [FieldType.Construct]: DLGFieldType.ConstructParameter,
        [FieldType.Unknown]: DLGFieldType.Unknown,
    };
}
