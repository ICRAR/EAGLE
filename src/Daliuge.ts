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
import { Eagle } from './Eagle';
import { Field } from './Field';

export class Daliuge {
    // automatically loaded palettes
    static readonly PALETTE_URL : string  = "https://raw.githubusercontent.com/ICRAR/EAGLE_test_repo/master/daliuge/daliuge-master.palette";
    static readonly TEMPLATE_URL : string = "https://raw.githubusercontent.com/ICRAR/EAGLE_test_repo/master/daliuge/daliuge-master-template.palette";

    // schemas
    static readonly GRAPH_SCHEMA_URL : string = "https://raw.githubusercontent.com/ICRAR/daliuge/master/daliuge-translator/dlg/dropmake/lg.graph.schema";

    // NOTE: ids are empty string here, we should generate a new id whenever we clone the fields
    static readonly requiredFields = [
        {
            category: Category.MKN,
            fields: [
                new Field("", "k", "1", "1", "", false, Eagle.DataType_Integer, false, [], false, Eagle.ParameterType.ConstructParameter, Eagle.ParameterUsage.NoPort, false),
            ]
        },
        {
            category: Category.Scatter,
            fields: [
                new Field("", "num_of_copies", "1", "1", "", false, Eagle.DataType_Integer, false, [], false, Eagle.ParameterType.ConstructParameter, Eagle.ParameterUsage.NoPort, false)
            ]
        },
        {
            category: Category.Gather,
            fields: [
                new Field("", "num_of_inputs", "1", "1", "", false, Eagle.DataType_Integer, false, [], false, Eagle.ParameterType.ConstructParameter, Eagle.ParameterUsage.NoPort, false)
            ]
        },
        {
            category: Category.Loop,
            fields: [
                new Field("", "num_of_iter", "1", "1", "", false, Eagle.DataType_Integer, false, [], false, Eagle.ParameterType.ConstructParameter, Eagle.ParameterUsage.NoPort, false)
            ]
        }
    ];

    static readonly groupStartField = new Field("", "group_start", "true", "true", "", false, Eagle.DataType_Boolean, false, [], false, Eagle.ParameterType.ComponentParameter, Eagle.ParameterUsage.NoPort, false);
    static readonly groupEndField = new Field("", "group_end", "true", "true", "", false, Eagle.DataType_Boolean, false, [], false, Eagle.ParameterType.ComponentParameter, Eagle.ParameterUsage.NoPort, false);
}

export namespace Daliuge {
    export enum ParameterNames {
        APPLICATION_CLASS = "Application Class",
        DATA_VOLUME = "Data volume",
        EXECUTION_TIME = "Execution Time",
        GROUP_START = "Group start",
        GROUP_END = "Group end",
    
        INPUT_ERROR_RATE = "Input error rate (%)",
        NUM_OF_COPIES = "No. of copies",
        NUM_OF_CPUS = "No. of CPUs",
        NUM_OF_INPUTS = "No. of inputs",
        NUM_OF_ITERATIONS = "No. of iterations",
        NUM_OF_TRIES = "No. of tries",
    
        STREAMING = "Streaming",
        PERSIST = "Persist",
        
        M = "M",
        K = "K",
        N = "N",
    
        BASENAME = "Basename", // used in PythonMemberFunction components to specify base Python class
        SELF = "Self", // also PythonMemberFunction
    
        // docker
        IMAGE = "Image",
        TAG = "Tag",
        DIGEST = "Digest"
    }
}