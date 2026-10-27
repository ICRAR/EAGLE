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

// Node test for V4 graph schema loading classification.
//
// Verifies the V4 load validation classification:
//   - a valid V4 graph (including one missing the changeable attribute) loads
//   - missing (optional) top-level keys or missing per-object attributes ->
//     the graph still loads (parsers apply defaults)
//   - wrong-type/other violations of structural top-level keys or modelData
//     attributes -> structural error (block); malformed graph object attributes
//     -> warning and sanitize to parser defaults/skip behavior; malformed optional
//     top-level containers/selectors use parser fallbacks; unsupported keys block.
//
// The classifier lives in src/SchemaLoadClassifier.ts (pure, no deps). We
// transpile that single file to CJS on the fly with the bundled TypeScript and
// run it here. No browser/DOM required.
//
// Run: node tools/testV4SchemaLoad.mjs

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
import assert from "node:assert";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

import Ajv from "ajv";
import ts from "typescript";

// --- transpile SchemaLoadClassifier.ts to a temp CJS module and load it ---
const classifierTsPath = path.join(repoRoot, "src", "SchemaLoadClassifier.ts");
const classifierTs = readFileSync(classifierTsPath, "utf8");
const classifierJs = ts.transpileModule(classifierTs, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText;
const tmpDir = mkdtempSync(path.join(tmpdir(), "eagle-classifier-"));
const classifierJsPath = path.join(tmpDir, "classifier.js");
writeFileSync(classifierJsPath, classifierJs);
const classifier = await import("file://" + classifierJsPath);
const { isStructuralV4Error, hasStructuralError, appendV4ValidationIssues, sanitizeRecoverableV4Errors } = classifier;
const STRUCTURAL_KEYS = classifier.STRUCTURAL_KEYS;

function run() {
    const schema = JSON.parse(readFileSync(path.join(repoRoot, "static", "lg.graph.v4.schema"), "utf8"));

    // Run the production warning/error collector with detailed Ajv output, just as
    // Eagle._validateV4GraphLoadJSON does after Utils._validateJSONDetailed.
    function classify(dataObject) {
        const ajv = new Ajv({ strict: false, logger: false, allErrors: true });
        const valid = ajv.validate(schema, dataObject);
        const errors = (ajv.errors ?? []).map((e) => ({
            dataPath: e.instancePath ?? "",
            message: e.message ?? "",
            keyword: e.keyword,
            params: e.params,
            missingProperty: e.params && e.params.missingProperty,
        }));
        const issues = { errors: [], warnings: [] };
        const canLoad = appendV4ValidationIssues(errors, issues, (message) => ({message}));
        return {
            valid,
            structural: !canLoad,
            errors: issues.errors.length,
            warnings: issues.warnings.length,
            warningMessages: issues.warnings.map((issue) => issue.message),
            validationErrors: errors,
            totalErrors: errors.length,
        };
    }

    const clone = (o) => JSON.parse(JSON.stringify(o));

    // Minimal representative V4 graph, built inline so the script has no
    // dependency on a large data fixture that is not committed to the repo. It
    // exercises the same schema/classifier behavior as a real file: a valid V4
    // graph with a non-empty nodes map, a node with an x attribute, and a node
    // field (with a changeable attribute the tests below mutate).
    const sampleGraph = {
        modelData: { name: "sample", schemaVersion: "V4", type: "Graph" },
        nodes: {
            "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee": {
                id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                name: "node-1",
                x: 10,
                y: 20,
                fields: {
                    "11111111-2222-4333-8444-555555555555": { id: "11111111-2222-4333-8444-555555555555", name: "field-1" }
                }
            }
        },
        edges: {},
        visuals: {},
        graphConfigurations: {},
        activeGraphConfigId: "cccccccc-dddd-4eee-8fff-000000000000"
    };

    let passed = 0;
    let failed = 0;
    function check(label, cond, extra) {
        if (cond) {
            console.log("  PASS  " + label);
            passed++;
        } else {
            console.log("  FAIL  " + label + (extra ? "  -> " + extra : ""));
            failed++;
        }
    }

    // --- pure classifier unit checks (no schema) ---
    check("STRUCTURAL_KEYS == [modelData, nodes]", JSON.stringify(STRUCTURAL_KEYS) === JSON.stringify(["modelData", "nodes"]));
    check("root missingProperty=nodes is structural", isStructuralV4Error({ dataPath: "", message: "", missingProperty: "nodes" }));
    check("root missingProperty=edges is NOT structural", !isStructuralV4Error({ dataPath: "", message: "", missingProperty: "edges" }));
    check("root missingProperty=activeGraphConfigId is NOT structural", !isStructuralV4Error({ dataPath: "", message: "", missingProperty: "activeGraphConfigId" }));
    check("/nodes (wrong type) is structural", isStructuralV4Error({ dataPath: "/nodes", message: "" }));
    check("/nodes/id/field/changeable (wrong type) is recoverable", !isStructuralV4Error({ dataPath: "/nodes/1/fields/2/changeable", message: "" }));
    check("/edges/id/comment (wrong type) is recoverable", !isStructuralV4Error({ dataPath: "/edges/1/comment", message: "" }));
    check("/visuals/id/content (wrong type) is recoverable", !isStructuralV4Error({ dataPath: "/visuals/1/content", message: "" }));
    check("/modelData (wrong type) is structural", isStructuralV4Error({ dataPath: "/modelData", message: "" }));
    check("/edges (wrong type) is recoverable", !isStructuralV4Error({ dataPath: "/edges", message: "" }));
    check("/visuals (wrong type) is recoverable", !isStructuralV4Error({ dataPath: "/visuals", message: "" }));
    check("/graphConfigurations (wrong type) is recoverable", !isStructuralV4Error({ dataPath: "/graphConfigurations", message: "" }));
    check("/activeGraphConfigId (wrong type) is recoverable", !isStructuralV4Error({ dataPath: "/activeGraphConfigId", message: "" }));
    check("root additionalProperties (unsupported top-level key) is structural", isStructuralV4Error({
        dataPath: "",
        message: "must NOT have additional properties",
        keyword: "additionalProperties",
        params: { additionalProperty: "unexpected" },
    }));
    check("hasStructuralError true when one structural", hasStructuralError([{ dataPath: "" }, { dataPath: "", missingProperty: "nodes" }]));
    check("hasStructuralError false when none", !hasStructuralError([{ dataPath: "", missingProperty: "visuals" }]));

    // --- end-to-end against the real schema ---
    console.log("\nSchema classification (real lg.graph.v4.schema):");

    let r = classify(sampleGraph);
    check("valid sample graph -> valid (loads)", r.valid === true);

    r = classify(clone(sampleGraph)); // no structural keys touched, but missing edges/visuals are allowed now
    check("sample graph as-is -> valid", r.valid === true);

    let m = clone(sampleGraph); delete m.nodes;
    r = classify(m);
    check("missing nodes -> structural despite other missing optional keys", !r.valid && r.structural, JSON.stringify(r));

    m = clone(sampleGraph); delete m.edges;
    r = classify(m);
    check("missing optional edges -> loads (edges is not required)", r.valid === true && !r.structural, JSON.stringify(r));

    m = clone(sampleGraph); delete m.modelData;
    r = classify(m);
    check("missing modelData -> structural (blocks)", !r.valid && r.structural, JSON.stringify(r));

    m = clone(sampleGraph); m.nodes = 5;
    r = classify(m);
    check("nodes wrong type -> structural (blocks)", !r.valid && r.structural, JSON.stringify(r));

    m = clone(sampleGraph); m.modelData = 5;
    r = classify(m);
    check("modelData wrong type -> structural (blocks)", !r.valid && r.structural, JSON.stringify(r));

    // Recoverable violations are reported as warnings by the same classification
    // function used by Eagle's real load-validation path. Malformed graph object
    // attributes are removed before parsing so parser defaults or skip behavior apply.
    m = clone(sampleGraph); m.edges = [];
    r = classify(m);
    check("invalid edges (wrong type) -> warning and recoverable", !r.valid && !r.structural && r.warnings > 0, JSON.stringify(r));

    m = clone(sampleGraph); m.visuals = [];
    r = classify(m);
    check("invalid visuals (wrong type) -> warning and recoverable", !r.valid && !r.structural && r.warnings > 0, JSON.stringify(r));

    m = clone(sampleGraph); m.graphConfigurations = [];
    r = classify(m);
    check("invalid graph configs (wrong type) -> warning and recoverable", !r.valid && !r.structural && r.warnings > 0, JSON.stringify(r));

    m = clone(sampleGraph); m.activeGraphConfigId = 5;
    r = classify(m);
    check("invalid active graph config id -> warning and recoverable", !r.valid && !r.structural && r.warnings > 0, JSON.stringify(r));

    m = clone(sampleGraph); m.unknownTopLevelKey = 1;
    r = classify(m);
    check("unsupported top-level key -> structural", !r.valid && r.structural, JSON.stringify(r));
    check("unsupported top-level key retains Ajv keyword and params",
        r.validationErrors.some((error) => error.dataPath === ""
            && error.keyword === "additionalProperties"
            && error.params.additionalProperty === "unknownTopLevelKey"), JSON.stringify(r.validationErrors));

    // These checks cover only schema/classifier behavior. The actual parser default
    // and load result for an omitted changeable property are covered by
    // e2e/graph/v4FieldChangeableDefault.spec.ts.
    m = clone(sampleGraph);
    const firstNodeId = Object.keys(m.nodes)[0];
    const firstFieldId = Object.keys(m.nodes[firstNodeId].fields)[0];
    delete m.nodes[firstNodeId].fields[firstFieldId].changeable;
    r = classify(m);
    check("Ajv accepts field with missing changeable", r.valid === true, JSON.stringify(r));

    m = clone(sampleGraph);
    m.nodes[firstNodeId].fields[firstFieldId].changeable = "yes";
    r = classify(m);
    check("invalid field attribute (changeable) -> warning and recoverable", !r.valid && !r.structural && r.warnings > 0, JSON.stringify(r));
    sanitizeRecoverableV4Errors(m, r.validationErrors);
    check("invalid field attribute is removed for parser default", typeof m.nodes[firstNodeId].fields[firstFieldId].changeable === "undefined", JSON.stringify(m.nodes[firstNodeId].fields[firstFieldId]));

    m = clone(sampleGraph);
    m.nodes[firstNodeId].x = "not-a-number";
    r = classify(m);
    check("invalid node attribute (x) -> warning and recoverable", !r.valid && !r.structural && r.warnings > 0, JSON.stringify(r));
    sanitizeRecoverableV4Errors(m, r.validationErrors);
    check("invalid node attribute is removed for parser default", typeof m.nodes[firstNodeId].x === "undefined", JSON.stringify(m.nodes[firstNodeId]));

    console.log("\n" + passed + " passed, " + failed + " failed");
    if (failed > 0) {
        process.exitCode = 1;
    }
}

try {
    await run();
} finally {
    rmSync(tmpDir, { recursive: true, force: true });
}
