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

export class Daliuge {
    // automatically loaded palettes
    static readonly PALETTE_URL : string  = "https://raw.githubusercontent.com/ICRAR/EAGLE_test_repo/master/daliuge/daliuge-master.palette";
    static readonly TEMPLATE_URL : string = "https://raw.githubusercontent.com/ICRAR/EAGLE_test_repo/master/daliuge/daliuge-master-template.palette";

    // schemas
    static readonly GRAPH_SCHEMA_URL : string = "https://raw.githubusercontent.com/ICRAR/daliuge/master/daliuge-translator/dlg/dropmake/lg.graph.schema";
}

export namespace Daliuge {
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
    
        BASENAME = "basename", // used in PythonMemberFunction components to specify base Python class
        SELF = "self", // also PythonMemberFunction
    
        // docker
        IMAGE = "image",
        TAG = "tag",
        DIGEST = "digest",

        // branch
        YES = "yes",
        NO = "no",

        // dummy
        DUMMY = "dummy"
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
    export const groupStartField = new Field("", FieldName.GROUP_START, "true", "true", "", false, DataType.Boolean, false, [], false, FieldType.ComponentParameter, FieldUsage.NoPort, false);
    export const groupEndField = new Field("", FieldName.GROUP_END, "true", "true", "", false, DataType.Boolean, false, [], false, FieldType.ComponentParameter, FieldUsage.NoPort, false);

    export const branchYesField = new Field("", FieldName.YES, "", "", "The affirmative output from a branch node", false, DataType.Object, false, [], false, FieldType.ComponentParameter, FieldUsage.OutputPort, false);
    export const branchNoField  = new Field("", FieldName.NO,  "", "", "he negative output from a branch node", false, DataType.Object, false, [], false, FieldType.ComponentParameter, FieldUsage.OutputPort, false);

    export const dropClassField = new Field("", FieldName.DROP_CLASS, "", "", "", false, DataType.String, false, [], false, FieldType.ComponentParameter, FieldUsage.NoPort, false);

    export const executionTimeField = new Field("", FieldName.EXECUTION_TIME, "5", "5", "", false, DataType.Float, false, [], false, FieldType.ConstraintParameter, FieldUsage.NoPort, false);
    export const numCpusField = new Field("", FieldName.NUM_OF_CPUS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstraintParameter, FieldUsage.NoPort, false);
    export const dataVolumeField = new Field("", FieldName.DATA_VOLUME, "5", "5", "", false, DataType.Float, false, [], false, FieldType.ConstraintParameter, FieldUsage.NoPort, false);

    export const kField = new Field("", FieldName.K, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstructParameter, FieldUsage.NoPort, false);
    export const numCopiesField = new Field("", FieldName.NUM_OF_COPIES, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstructParameter, FieldUsage.NoPort, false);
    export const numInputsField = new Field("", FieldName.NUM_OF_INPUTS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstructParameter, FieldUsage.NoPort, false);
    export const numIterationsField = new Field("", FieldName.NUM_OF_ITERATIONS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstructParameter, FieldUsage.NoPort, false);

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
    // NOTE: ids are empty string here, we should generate a new id whenever we clone the fields
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
        }
    ];
}