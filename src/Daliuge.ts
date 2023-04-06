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

export class Daliuge {
    static readonly PARAMETER_NAME_APPLICATION_CLASS: string = "Application Class";
    static readonly PARAMETER_NAME_DATA_VOLUME: string = "Data volume";
    static readonly PARAMETER_NAME_EXECUTION_TIME: string = "Execution Time";
    static readonly PARAMETER_NAME_GROUP_START: string = "Group start";
    static readonly PARAMETER_NAME_GROUP_END: string = "Group end";

    static readonly PARAMETER_NAME_INPUT_ERROR_RATE: string = "Input error rate (%)";
    static readonly PARAMETER_NAME_NUM_OF_COPIES: string = "No. of copies";
    static readonly PARAMETER_NAME_NUM_OF_CPUS: string = "No. of CPUs";
    static readonly PARAMETER_NAME_NUM_OF_INPUTS: string = "No. of inputs";
    static readonly PARAMETER_NAME_NUM_OF_ITERATIONS: string = "No. of iterations";
    static readonly PARAMETER_NAME_NUM_OF_TRIES: string = "No. of tries";

    static readonly PARAMETER_NAME_STREAMING: string = "Streaming";
    static readonly PARAMETER_NAME_PERSIST: string = "Persist";
    
    static readonly PARAMETER_NAME_M: string = "M";
    static readonly PARAMETER_NAME_K: string = "K";
    static readonly PARAMETER_NAME_N: string = "N";

    static readonly PARAMETER_NAME_BASENAME: string = "Basename"; // used in PythonMemberFunction components to specify base Python class
    static readonly PARAMETER_NAME_SELF: string = "Self"; // also PythonMemberFunction

    // docker
    static readonly PARAMETER_NAME_IMAGE: string = "Image";
    static readonly PARAMETER_NAME_TAG: string = "Tag";
    static readonly PARAMETER_NAME_DIGEST: string = "Digest";

    static readonly PARAMETER_NAMES: string[] = [
        this.PARAMETER_NAME_APPLICATION_CLASS,
        this.PARAMETER_NAME_DATA_VOLUME,
        this.PARAMETER_NAME_EXECUTION_TIME,
        this.PARAMETER_NAME_GROUP_START,
        this.PARAMETER_NAME_GROUP_END,

        this.PARAMETER_NAME_INPUT_ERROR_RATE,
        this.PARAMETER_NAME_NUM_OF_CPUS,
        this.PARAMETER_NAME_NUM_OF_COPIES,
        this.PARAMETER_NAME_NUM_OF_INPUTS,
        this.PARAMETER_NAME_NUM_OF_TRIES,
        this.PARAMETER_NAME_NUM_OF_ITERATIONS,

        this.PARAMETER_NAME_STREAMING,
        this.PARAMETER_NAME_PERSIST,
        
        this.PARAMETER_NAME_M,
        this.PARAMETER_NAME_K,
        this.PARAMETER_NAME_N,

        this.PARAMETER_NAME_BASENAME,
        this.PARAMETER_NAME_SELF,

        this.PARAMETER_NAME_IMAGE,
        this.PARAMETER_NAME_TAG,
        this.PARAMETER_NAME_DIGEST
    ];

    // automatically loaded palettes
    static readonly PALETTE_URL : string  = "https://raw.githubusercontent.com/ICRAR/EAGLE_test_repo/master/daliuge/daliuge-master.palette";
    static readonly TEMPLATE_URL : string = "https://raw.githubusercontent.com/ICRAR/EAGLE_test_repo/master/daliuge/daliuge-master-template.palette";

    // schemas
    static readonly GRAPH_SCHEMA_URL : string = "https://raw.githubusercontent.com/ICRAR/daliuge/master/daliuge-translator/dlg/dropmake/lg.graph.schema";
}