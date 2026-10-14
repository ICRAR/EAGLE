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

// The top-level keys whose absence, wrong type, or unsupported extra presence
// makes a V4 graph un-loadable.
export const STRUCTURAL_KEYS: string[] = ["modelData", "nodes"];

// ajv reports an (empty-leading-slash) JSON pointer as the dataPath, e.g. "/modelData",
// "/nodes", or "" for the root.
//
// Errors are STRUCTURAL (block loading) when they would leave the parsers with
// un-parseable data, so they must be classified as such BEFORE the data reaches
// the parsers:
//  - Missing/wrong-type structural top-level key ("modelData", "nodes"): missing is
//    reported at the ROOT with params.missingProperty; a present-but-wrong-type
//    value is reported at its own path (/modelData).
//  - Any top-level key at all, when it is invalid: an unsupported key hits the root
//    "additionalProperties" constraint (reported at the root), while an invalid
//    supported key (e.g. non-string activeGraphConfigId, or edges/visuals that are
//    not objects) is reported at its own path. Loading a graph with unknown/invalid
//    top-level data is unsafe, so the load fails instead of silently dropping it.
//  - Any wrong-type (or other) violation of a per-node/edge/field/visual attribute
//    (e.g. "changeable: \"false\"", a string coordinate, an object value in a
//    scalar-valued field): the parsers would then read invalid values into the
//    graph, so the load fails instead of continuing with a corrupted graph.
//
// Non-fatal WARNINGS are therefore only:
//  - Missing (optional) top-level keys, which the parsers default.
//  - Missing (optional) per-object attributes, which the parsers default/skip.
export function isStructuralV4Error(error: SchemaValidationError): boolean {
    const path = error.dataPath;
    const missing = error.missingProperty;

    // a violation of something that is present and wrong -> structural
    if (path !== "" || typeof missing === "undefined"){
        return true;
    }

    // missing-property errors are reported at the root with params.missingProperty:
    // missing structural keys block loading, missing optional keys are a warning
    return STRUCTURAL_KEYS.includes(missing);
}

// Split detailed validator output the same way the loader does, so both the
// production validation path and its schema tests verify warning classification.
export function classifyV4Errors(errors: SchemaValidationError[]): {structuralErrors: SchemaValidationError[], warnings: SchemaValidationError[]} {
    const structuralErrors: SchemaValidationError[] = [];
    const warnings: SchemaValidationError[] = [];
    for (const error of errors){
        (isStructuralV4Error(error) ? structuralErrors : warnings).push(error);
    }
    return {structuralErrors, warnings};
}

// Append classified validation issues to the same arrays consumed by Eagle's
// loading UI. The issue factory keeps this helper independent of browser code.
export function appendV4ValidationIssues<T>(
    errors: SchemaValidationError[],
    errorsWarnings: {errors: T[], warnings: T[]},
    makeIssue: (message: string) => T
): boolean {
    const classification = classifyV4Errors(errors);
    const toIssue = (error: SchemaValidationError): T => {
        const displayPath = error.dataPath === "" ? "<root>" : (error.dataPath.startsWith("/") ? error.dataPath.slice(1) : error.dataPath);
        return makeIssue("Schema validation: " + displayPath + " " + error.message +
            (typeof error.missingProperty !== "undefined" ? " (" + error.missingProperty + ")" : ""));
    };
    errorsWarnings.errors.push(...classification.structuralErrors.map(toIssue));
    errorsWarnings.warnings.push(...classification.warnings.map(toIssue));
    return classification.structuralErrors.length === 0;
}

// Returns true if any of the validation errors is structural (i.e. should block loading).
export function hasStructuralError(errors: SchemaValidationError[]): boolean {
    return classifyV4Errors(errors).structuralErrors.length > 0;
}
