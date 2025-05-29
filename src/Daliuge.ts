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

import { Category } from './Category';
import { Field } from './Field';
import { Node } from './Node';

export class Daliuge {
    // automatically loaded palettes
    static readonly PALETTE_URL : string  = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/master/daliuge/daliuge-master.palette";
    static readonly TEMPLATE_URL : string = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/master/daliuge/daliuge-master-template.palette";

    // schemas
    static readonly GRAPH_SCHEMA_URL : string = "https://raw.githubusercontent.com/ICRAR/EAGLE_test_repo/master/tools/lg.graph.schema";

    // NOTE: eventually this can be replaced. Once we have added a new category for PythonInitialiser
    static isPythonInitialiser(node: Node): boolean {
        return node.getCategory() === Category.PythonMemberFunction && (node.getName().includes("__init__") || node.getName().includes("__class__"));
    }
}

export namespace Daliuge {
    export const DEFAULT_PYDATA_VALUE: string = "None";
    export const DEFAULT_PYFUNCAPP_DROPCLASS_VALUE: string = "dlg.apps.pyfunc.PyFuncApp";

    export enum FieldName {
        DATA_VOLUME = "data_volume",
        DROP_CLASS = "dropclass",
        EXECUTION_TIME = "execution_time",
        GROUP_START = "group_start",
        GROUP_END = "group_end",
    
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
    
        BASE_NAME = "base_name", // used in PythonMemberFunction
        SELF = "self", // used in PythonMemberFunction/PythonObject as the port for the object itself

        // docker
        IMAGE = "image",
        TAG = "docker_tag",
        DIGEST = "docker_digest",

        // branch
        TRUE = "true",
        FALSE = "false",

        // dummy
        DUMMY = "dummy",

        // python
        FUNC_CODE = "func_code",
        FUNC_NAME = "func_name",
        PYDATA = "pydata"
    }

    export enum DataType {
        Unknown = "Unknown",
        String = "String",
        Integer = "Integer",
        Float = "Float",
        Object = "Object",
        Boolean = "Boolean",
        Select = "Select",
        Password = "Password",
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

    // NOTE: this second 'field type' enum is required because DALiuGE will (in the short term)
    //       continue to use longer names for the field types. Eventually, DALiuGE will move to
    //       the shorter names. At that point we can remove this.
    export enum DLGFieldType {
        ApplicationArgument = "ApplicationArgument",
        ComponentParameter = "ComponentParameter",
        ConstraintParameter = "ConstraintParameter",
        ConstructParameter = "ConstructParameter",
        Unknown = "Unknown"
    }

    // NOTE: these two maps translate between the EAGLE field types and the Daliuge field types
    //       once DALiuGE is updated, we can also remove these
    export const dlgToFieldTypeMap: { [key in Daliuge.DLGFieldType]: Daliuge.FieldType } = {
        [Daliuge.DLGFieldType.ApplicationArgument]: Daliuge.FieldType.Application,
        [Daliuge.DLGFieldType.ComponentParameter]: Daliuge.FieldType.Component,
        [Daliuge.DLGFieldType.ConstraintParameter]: Daliuge.FieldType.Constraint,
        [Daliuge.DLGFieldType.ConstructParameter]: Daliuge.FieldType.Construct,
        [Daliuge.DLGFieldType.Unknown]: Daliuge.FieldType.Unknown,
    }
    
    export const fieldTypeToDlgMap: { [key in Daliuge.FieldType]: Daliuge.DLGFieldType } = {
        [Daliuge.FieldType.Application]: Daliuge.DLGFieldType.ApplicationArgument,
        [Daliuge.FieldType.Component]: Daliuge.DLGFieldType.ComponentParameter,
        [Daliuge.FieldType.Constraint]: Daliuge.DLGFieldType.ConstraintParameter,
        [Daliuge.FieldType.Construct]: Daliuge.DLGFieldType.ConstructParameter,
        [Daliuge.FieldType.Unknown]: Daliuge.DLGFieldType.Unknown,
    }

    export enum FieldUsage {
        NoPort = "NoPort",
        InputPort = "InputPort",
        OutputPort = "OutputPort",
        InputOutput = "InputOutput"
    }

    export enum FileType {
        LogicalGraph = "LogicalGraph",
        LogicalGraphTemplate = "LogicalGraphTemplate",
        PhysicalGraph = "PhysicalGraph",
        PhysicalGraphTemplate = "PhysicalGraphTemplate",
        Unknown = "Unknown"
    }

    export enum SchemaVersion {
        Unknown = "Unknown",
        OJS = "OJS",
    }

    // These are the canonical example definition of each field
    export const groupStartField = new Field(null, FieldName.GROUP_START, "true", "true", "Is this node the start of a group?", false, DataType.Boolean, false, [], false, FieldType.Component, FieldUsage.NoPort);
    export const groupEndField = new Field(null, FieldName.GROUP_END, "true", "true", "Is this node the end of a group?", false, DataType.Boolean, false, [], false, FieldType.Component, FieldUsage.NoPort);

    export const branchYesField = new Field(null, FieldName.TRUE, "", "", "The affirmative output from a branch node", false, DataType.Object, false, [], false, FieldType.Component, FieldUsage.OutputPort);
    export const branchNoField  = new Field(null, FieldName.FALSE,  "", "", "he negative output from a branch node", false, DataType.Object, false, [], false, FieldType.Component, FieldUsage.OutputPort);

    export const dropClassField = new Field(null, FieldName.DROP_CLASS, "", "", "", false, DataType.String, false, [], false, FieldType.Component, FieldUsage.NoPort);

    export const executionTimeField = new Field(null, FieldName.EXECUTION_TIME, "5", "5", "", false, DataType.Float, false, [], false, FieldType.Constraint, FieldUsage.NoPort);
    export const numCpusField = new Field(null, FieldName.NUM_OF_CPUS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.Constraint, FieldUsage.NoPort);
    export const dataVolumeField = new Field(null, FieldName.DATA_VOLUME, "5", "5", "", false, DataType.Float, false, [], false, FieldType.Constraint, FieldUsage.NoPort);

    export const kField = new Field(null, FieldName.K, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.Construct, FieldUsage.NoPort);
    export const numCopiesField = new Field(null, FieldName.NUM_OF_COPIES, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.Construct, FieldUsage.NoPort);
    export const numInputsField = new Field(null, FieldName.NUM_OF_INPUTS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.Construct, FieldUsage.NoPort);
    export const numIterationsField = new Field(null, FieldName.NUM_OF_ITERATIONS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.Construct, FieldUsage.NoPort);

    export const baseNameField = new Field(null, FieldName.BASE_NAME, "", "", "The base name of the class of this Member function", false, DataType.String, false, [], false, FieldType.Component, FieldUsage.NoPort);
    export const selfField = new Field(null, FieldName.SELF, "", "", "", false, DataType.Object, false, [], false, FieldType.Component, FieldUsage.InputOutput);

    export const funcCodeField = new Field(null, FieldName.FUNC_CODE, "", "def func_name(args): return args", "Python function code", false, Daliuge.DataType.Python, false, [], false, Daliuge.FieldType.Component, FieldUsage.NoPort);
    export const funcNameField = new Field(null, FieldName.FUNC_NAME, "", "func_name", "Python function name", false, Daliuge.DataType.Python, false, [], false, Daliuge.FieldType.Component, FieldUsage.NoPort);

    export const persistField = new Field(null, FieldName.PERSIST, "false", "false", "Specifies whether this data component contains data that should not be deleted after execution", false, Daliuge.DataType.Boolean, false, [], false, Daliuge.FieldType.Component, Daliuge.FieldUsage.NoPort);
    export const streamingField = new Field(null, FieldName.STREAMING, "false", "false", "Specifies whether this data component streams input and output data", false, Daliuge.DataType.Boolean, false, [], false, Daliuge.FieldType.Component, Daliuge.FieldUsage.NoPort);

    // This list defines the fields required for ALL nodes belonging to a given Category.Type
    export const categoryTypeFieldsRequired = [
        {
            categoryTypes: [
                Category.Type.Application,
                Category.Type.Data
            ],
            fields: [
                Daliuge.dropClassField
            ]
        },
        {
            categoryTypes: [
                Category.Type.Application
            ],
            fields: [
                Daliuge.executionTimeField,
                Daliuge.numCpusField
            ]
        },
        {
            categoryTypes: [
                Category.Type.Data
            ],
            fields: [
                Daliuge.dataVolumeField
            ]
        }
    ];

    // This list defines the fields required for ALL nodes belonging to a given Category
    export const categoryFieldsRequired = [
        {
            categories: [
                Category.MKN
            ],
            fields: [
                Daliuge.kField
            ]
        },
        {
            categories: [
                Category.Scatter
            ],
            fields: [
                Daliuge.numCopiesField
            ]
        },
        {
            categories: [
                Category.Gather,
                Category.GroupBy
            ],
            fields: [
                Daliuge.numInputsField
            ]
        },
        {
            categories: [
                Category.Loop
            ],
            fields: [
                Daliuge.numIterationsField
            ]
        },
        {
            categories: [
                Category.Branch
            ],
            fields: [
                Daliuge.branchYesField,
                Daliuge.branchNoField,
                Daliuge.dropClassField
            ]
        },
        {
            categories: [
                Category.PythonMemberFunction, Category.PythonObject
            ],
            fields: [
                Daliuge.baseNameField,
                Daliuge.selfField
            ]
        },
        {
            categories: [
                Category.PyFuncApp,
                Category.PythonMemberFunction
            ],
            fields: [
                Daliuge.funcNameField
            ]
        },
        {
            categories: [
                Category.Data
            ],
            fields: [
                Daliuge.baseNameField
            ]
        }
    ];
}
