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


    static readonly DEFAULT_PALETTE_REPOSITORY : string = "ICRAR/EAGLE_test_repo";

    static readonly UNDO_MEMORY_SIZE : number = 10;

    static readonly HIERARCHY_EDGE_SELECTED_COLOR : string = "rgb(47 22 213)";
    static readonly HIERARCHY_EDGE_DEFAULT_COLOR : string = "black";

    static readonly SELECTED_NODE_COLOR : string = "rgb(47 22 213)";
}
