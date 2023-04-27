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

export class Config {
    // Dimensions.
    static readonly paletteNodeHeight : number = 22;
    static readonly paletteNodeWidth : number = 130;

    static readonly DALIUGE_PARAMETER_NAMES = [
        "data_volume",
        "execution_time",
        "num_cpus",
        "group_start",
        "group_end",
        "input_error_threshold",
        "n_tries"
    ];

    // static readonly defaultRightWindowWidth : number = 400;
    // static readonly defaultLeftWindowWidth : number = 310;

    // automatically loaded palettes
    static readonly DALIUGE_PALETTE_URL : string  = "https://raw.githubusercontent.com/ICRAR/EAGLE_test_repo/master/daliuge/daliuge-master.palette";
    static readonly DALIUGE_TEMPLATE_URL : string = "https://raw.githubusercontent.com/ICRAR/EAGLE_test_repo/master/daliuge/daliuge-master-template.palette";

    // schemas
    static readonly DALIUGE_GRAPH_SCHEMA_URL : string = "https://raw.githubusercontent.com/ICRAR/daliuge/master/daliuge-translator/dlg/dropmake/lg.graph.schema";

    static readonly UNDO_MEMORY_SIZE : number = 10;

    static readonly HIERARCHY_EDGE_SELECTED_COLOR : string = "rgb(47 22 213)";
    static readonly HIERARCHY_EDGE_DEFAULT_COLOR : string = "black";

    static readonly SELECTED_NODE_COLOR : string = "rgb(47 22 213)";
}
