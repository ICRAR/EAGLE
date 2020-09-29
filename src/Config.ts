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
    // File name of the palette template.
    static readonly templatePaletteFileName : string = "templatePalette.json";

    // Dimensions.
    static readonly paletteNodeHeight : number = 22;
    static readonly paletteNodeWidth : number = 130;

    static readonly defaultEventPortName = "event";
    static readonly eventPortNames : string[] = ["event"];
    static readonly eventPortColor : string = "#ff0000";
    static readonly normalPortColor : string = "#222222";

    // translation algorithms
    static readonly translationAlgorithms = [
        "none",
        "metis",
        "mysarkar",
        "min_num_parts",
        "pso",
        "simple"
    ];

    static readonly defaultRightWindowWidth : number = 300;
    static readonly defaultLeftWindowWidth : number = 300;

    static readonly enablePaletteEditorMode : boolean = true;
}
