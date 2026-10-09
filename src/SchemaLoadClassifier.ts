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

// Pure logic to classify V4 graph schema validation failures into "structural"
// (block loading) vs "attribute" (warn and continue) errors.
//
// Kept free of any app/Eagle dependencies so it can be unit-tested from Node.

// Shape of a single ajv validation error, as produced by Utils._validateJSONDetailed.
export type SchemaValidationError = {
    dataPath: string;
    message: string;
    missingProperty?: string;
};

// The only top-level keys whose absence/type-mismatch makes a V4 graph un-loadable.
// Everything else (edges, visuals, graphConfigurations, activeGraphConfigId, and any
// per-node/edge/field/visual attribute) is treated as a non-fatal warning, because the
// parsers are total for those inputs.
export const STRUCTURAL_KEYS: string[] = ["modelData", "nodes"];

// ajv reports an (empty-leading-slash) JSON pointer as the dataPath, e.g. "/modelData",
// "/nodes", or "" for the root.
//  - A missing top-level property is reported at the ROOT with params.missingProperty.
//  - A present-but-wrong-type top-level property is reported at its own path (/modelData).
export function isStructuralV4Error(error: SchemaValidationError): boolean {
    return (
        // wrong-type top-level property: reported exactly at /modelData or /nodes.
        // (Deeper paths like /nodes/<id>/fields are per-object attribute issues, not structural.)
        error.dataPath === "/modelData" ||
        error.dataPath === "/nodes" ||
        // missing top-level property: reported at the root with a missingProperty
        (error.dataPath === "" &&
            typeof error.missingProperty !== "undefined" &&
            STRUCTURAL_KEYS.includes(error.missingProperty))
    );
}

// Returns true if any of the validation errors is structural (i.e. should block loading).
export function hasStructuralError(errors: SchemaValidationError[]): boolean {
    return errors.some(isStructuralV4Error);
}
