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
        DATA_TYPE = "dataType",
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
        DIGEST = "digest"
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
        Unknown = "Unknown",
        ComponentParameter = "ComponentParameter",
        ApplicationArgument = "ApplicationArgument",
        ConstructParameter = "ConstructParameter"
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

    // NOTE: ids are empty string here, we should generate a new id whenever we clone the fields
    export const categoryTypeFieldsRequired = [
        {
            addField: false,
            categoryTypes: [
                Category.Type.Application,
                Category.Type.Data,
                Category.Type.Construct
            ],
            fields: [
                new Field("", FieldName.DROP_CLASS, "", "", "", false, DataType.String, false, [], false, FieldType.ComponentParameter, FieldUsage.NoPort, false),
            ]
        },
        {
            addField: true,
            categoryTypes: [
                Category.Type.Data,
            ],
            fields: [
                new Field("", FieldName.DATA_TYPE, "", "", "", true, DataType.Select, false, [DataType.Boolean, DataType.Float, DataType.Integer, DataType.String, DataType.Object], false, FieldType.ComponentParameter, FieldUsage.NoPort, false),
            ]
        }
    ];

    export const categoryFieldsRequired = [
        {
            categories: [
                Category.MKN
            ],
            fields: [
                new Field("", FieldName.K, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstructParameter, FieldUsage.NoPort, false),
            ]
        },
        {
            categories: [
                Category.Scatter
            ],
            fields: [
                new Field("", FieldName.NUM_OF_COPIES, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstructParameter, FieldUsage.NoPort, false)
            ]
        },
        {
            categories: [
                Category.Gather,
                Category.GroupBy
            ],
            fields: [
                new Field("", FieldName.NUM_OF_INPUTS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstructParameter, FieldUsage.NoPort, false)
            ]
        },
        {
            categories: [
                Category.Loop
            ],
            fields: [
                new Field("", FieldName.NUM_OF_ITERATIONS, "1", "1", "", false, DataType.Integer, false, [], false, FieldType.ConstructParameter, FieldUsage.NoPort, false)
            ]
        }
    ];

    export const groupStartField = new Field("", FieldName.GROUP_START, "true", "true", "", false, DataType.Boolean, false, [], false, FieldType.ComponentParameter, FieldUsage.NoPort, false);
    export const groupEndField = new Field("", FieldName.GROUP_END, "true", "true", "", false, DataType.Boolean, false, [], false, FieldType.ComponentParameter, FieldUsage.NoPort, false);
}