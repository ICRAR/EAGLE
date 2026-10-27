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
    keyword?: string;
    params?: Record<string, unknown>;
    missingProperty?: string;
};

// The top-level keys whose absence, wrong type, or unsupported extra presence
// makes a V4 graph un-loadable.
export const STRUCTURAL_KEYS: string[] = ["modelData", "nodes"];

// ajv reports an (empty-leading-slash) JSON pointer as the dataPath, e.g. "/modelData",
// "/nodes", or "" for the root.
//
// Errors are STRUCTURAL (block loading) when the parsers cannot safely recover:
//  - Missing/wrong-type structural top-level keys ("modelData", "nodes"). Missing
//    keys are reported at the ROOT with params.missingProperty; wrong types are
//    reported at their own paths.
//  - Unsupported keys (the schema's additionalProperties violations).
//  - Invalid modelData attributes, which define graph identity and metadata.
//
// Missing optional top-level keys/attributes and malformed values within graph
// object maps (nodes, edges, visuals, and graphConfigurations) are WARNINGS. The
// corresponding invalid property or map entry is removed before parsing, allowing
// parsers to apply defaults or skip that entry. Wrong-type values for the optional
// top-level containers/selector "edges", "visuals", "graphConfigurations", and
// "activeGraphConfigId" are also WARNINGS and use parser defaults.
export function isStructuralV4Error(error: SchemaValidationError): boolean {
    const path = error.dataPath;
    const missing: string | undefined = error.missingProperty ?? error.params?.missingProperty;

    // Unexpected keys are structural even at the root, where Ajv reports an empty
    // dataPath and no missingProperty. Keep the keyword/params so this does not rely
    // on interpreting Ajv's human-readable message.
    if (error.keyword === "additionalProperties"){
        return true;
    }

    // These optional top-level containers/selector have parser fallbacks: malformed
    // containers become empty maps and an invalid active id becomes null.
    if (["/edges", "/visuals", "/graphConfigurations", "/activeGraphConfigId"].includes(path)
        || ["/nodes/", "/edges/", "/visuals/", "/graphConfigurations/"].some((prefix) => path.startsWith(prefix))){
        return false;
    }
    if (path !== "" || typeof missing === "undefined"){
        return true;
    }

    // missing-property errors are reported at the root with params.missingProperty:
    // missing structural keys block loading, missing optional keys are a warning
    return STRUCTURAL_KEYS.includes(missing);
}

// Strip malformed values reported at recoverable paths so parser defaults and
// skip behavior remain safe. Array entries are replaced with null; supported V4
// array fields accept null or otherwise normalize it to their empty/default value.
export function sanitizeRecoverableV4Errors(dataObject: Record<string, unknown>, errors: SchemaValidationError[]): void {
    for (const error of errors){
        if (isStructuralV4Error(error) || error.keyword === "required" || error.dataPath === ""){
            continue;
        }

        const segments = error.dataPath.split("/").slice(1).map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
        if (segments.length === 0){
            continue;
        }

        let parent: unknown = dataObject;
        for (const segment of segments.slice(0, -1)){
            if (Array.isArray(parent)){
                const index = Number(segment);
                if (!Number.isInteger(index) || index < 0 || index >= parent.length){
                    parent = null;
                    break;
                }
                parent = parent[index];
            } else if (typeof parent === "object" && parent !== null){
                parent = (parent as Record<string, unknown>)[segment];
            } else {
                parent = null;
                break;
            }
        }

        const leaf = segments[segments.length - 1];
        if (Array.isArray(parent)){
            const index = Number(leaf);
            if (Number.isInteger(index) && index >= 0 && index < parent.length){
                parent[index] = null;
            }
        } else if (typeof parent === "object" && parent !== null){
            delete (parent as Record<string, unknown>)[leaf];
        }
    }
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
