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
    export const groupStartField = new Field(null, FieldName.GROUP_START, "true", "true", "", false, DataType.Boolean, false, [], false, FieldType.ComponentParameter, FieldUsage.NoPort);
    export const groupEndField = new Field(null, FieldName.GROUP_END, "true", "true", "", false, DataType.Boolean, false, [], false, FieldType.ComponentParameter, FieldUsage.NoPort);

    export const branchYesField = new Field(null, FieldName.TRUE, "", "", "The affirmative output from a branch node", false, DataType.Object, false, [], false, FieldType.ComponentParameter, FieldUsage.OutputPort);
    export const branchNoField  = new Field(null, FieldName.FALSE,  "", "", "he negative output from a branch node", false, DataType.Object, false, [], false, FieldType.ComponentParameter, FieldUsage.OutputPort);

    export const dropClassField = new Field(null, FieldName.DROP_CLASS, "", "", "", false, DataType.String, false, [], false, FieldType.ComponentParameter, FieldUsage.NoPort);

    export const executionTimeField = new Field(null, FieldName.EXECUTION_TIME, "5", "5", "", false, DataType.Float, false, [], false, FieldType.ConstraintParameter, FieldUsage.NoPort);
    export const numCpusField = new Field(null, FieldName.NUM_OF_CPUS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstraintParameter, FieldUsage.NoPort);
    export const dataVolumeField = new Field(null, FieldName.DATA_VOLUME, "5", "5", "", false, DataType.Float, false, [], false, FieldType.ConstraintParameter, FieldUsage.NoPort);

    export const kField = new Field(null, FieldName.K, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstructParameter, FieldUsage.NoPort);
    export const numCopiesField = new Field(null, FieldName.NUM_OF_COPIES, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstructParameter, FieldUsage.NoPort);
    export const numInputsField = new Field(null, FieldName.NUM_OF_INPUTS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstructParameter, FieldUsage.NoPort);
    export const numIterationsField = new Field(null, FieldName.NUM_OF_ITERATIONS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstructParameter, FieldUsage.NoPort);

    export const baseNameField = new Field(null, FieldName.BASE_NAME, "", "", "The base name of the class of this Member function", false, DataType.String, false, [], false, FieldType.ComponentParameter, FieldUsage.NoPort);
    export const selfField = new Field(null, FieldName.SELF, "", "", "", false, DataType.Object, false, [], false, FieldType.ComponentParameter, FieldUsage.InputOutput);

    export const funcCodeField = new Field(null, FieldName.FUNC_CODE, "", "def func_name(args): return args", "Python function code", false, Daliuge.DataType.Python, false, [], false, Daliuge.FieldType.ComponentParameter, FieldUsage.NoPort);
    export const funcNameField = new Field(null, FieldName.FUNC_NAME, "", "func_name", "Python function name", false, Daliuge.DataType.Python, false, [], false, Daliuge.FieldType.ComponentParameter, FieldUsage.NoPort);

    // This list defines the fields required for ALL nodes belonging to a given Category.Type
    // NOTE: ids are empty string here, we should generate a new id whenever we clone the fields
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
    // NOTE: ids are empty string here, remember to generate a new id whenever cloning the fields
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
                Category.PythonApp,
                Category.PythonMemberFunction
            ],
            fields: [
                Daliuge.funcCodeField,
                Daliuge.funcNameField
            ]
        }
    ];
}