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
//   - wrong-type/other violations of ANY attribute (top-level or per-object,
//     e.g. changeable: "false", string coords, invalid activeGraphConfigId)
//     and unsupported top-level keys -> structural error (block)
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
const { isStructuralV4Error, hasStructuralError, appendV4ValidationIssues } = classifier;
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
            totalErrors: errors.length,
        };
    }

    const clone = (o) => JSON.parse(JSON.stringify(o));
    const chilies = JSON.parse(
        readFileSync(path.join(repoRoot, "e2e", "data", "chilies_daliuge_split_organised.graph"), "utf8")
    );

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
    check("/nodes/xxx/attribute (wrong type) is structural", isStructuralV4Error({ dataPath: "/nodes/1/fields/2/changeable", message: "" }));
    check("/modelData (wrong type) is structural", isStructuralV4Error({ dataPath: "/modelData", message: "" }));
    check("/edges (wrong type) is structural", isStructuralV4Error({ dataPath: "/edges", message: "" }));
    check("/activeGraphConfigId (wrong type) is structural", isStructuralV4Error({ dataPath: "/activeGraphConfigId", message: "" }));
    check("root additionalProperties (unsupported top-level key) is structural", isStructuralV4Error({ dataPath: "", message: "must NOT have additional properties" }));
    check("hasStructuralError true when one structural", hasStructuralError([{ dataPath: "" }, { dataPath: "", missingProperty: "nodes" }]));
    check("hasStructuralError false when none", !hasStructuralError([{ dataPath: "", missingProperty: "visuals" }]));

    // --- end-to-end against the real schema ---
    console.log("\nSchema classification (real lg.graph.v4.schema):");

    let r = classify(chilies);
    check("valid chilies file -> valid (loads)", r.valid === true);

    r = classify(clone(chilies)); // no structural keys touched, but missing edges/visuals are allowed now
    check("chilies as-is -> valid", r.valid === true);

    let m = clone(chilies); delete m.nodes;
    r = classify(m);
    check("missing nodes -> structural despite other missing optional keys", !r.valid && r.structural, JSON.stringify(r));

    m = clone(chilies); delete m.edges;
    r = classify(m);
    check("missing optional edges -> loads (edges is not required)", r.valid === true && !r.structural, JSON.stringify(r));

    m = clone(chilies); delete m.modelData;
    r = classify(m);
    check("missing modelData -> structural (blocks)", !r.valid && r.structural, JSON.stringify(r));

    m = clone(chilies); m.nodes = 5;
    r = classify(m);
    check("nodes wrong type -> structural (blocks)", !r.valid && r.structural, JSON.stringify(r));

    m = clone(chilies); m.modelData = 5;
    r = classify(m);
    check("modelData wrong type -> structural (blocks)", !r.valid && r.structural, JSON.stringify(r));

    // Non-structural schema violations must be reported as warnings by the same
    // classification function used by Eagle's real load-validation path.
    // Wrong-type (or other) violations of any attribute are structural: the
    // parsers must never receive invalid values.
    m = clone(chilies); m.edges = [];
    r = classify(m);
    check("invalid edges (wrong type) -> structural", !r.valid && r.structural, JSON.stringify(r));

    m = clone(chilies); m.visuals = [];
    r = classify(m);
    check("invalid visuals (wrong type) -> structural", !r.valid && r.structural, JSON.stringify(r));

    m = clone(chilies); m.graphConfigurations = [];
    r = classify(m);
    check("invalid graph configs (wrong type) -> structural", !r.valid && r.structural, JSON.stringify(r));

    m = clone(chilies); m.activeGraphConfigId = 5;
    r = classify(m);
    check("invalid active graph config id -> structural", !r.valid && r.structural, JSON.stringify(r));

    m = clone(chilies); m.unknownTopLevelKey = 1;
    r = classify(m);
    check("unsupported top-level key -> structural", !r.valid && r.structural, JSON.stringify(r));

    // Missing changeable is accepted and defaults in the parser; a wrong type is a warning.
    m = clone(chilies);
    const firstNodeId = Object.keys(m.nodes)[0];
    const firstFieldId = Object.keys(m.nodes[firstNodeId].fields)[0];
    delete m.nodes[firstNodeId].fields[firstFieldId].changeable;
    r = classify(m);
    check("field missing changeable is accepted", r.valid === true, JSON.stringify(r));

    m = clone(chilies);
    m.nodes[firstNodeId].fields[firstFieldId].changeable = "yes";
    r = classify(m);
    check("invalid field attribute (changeable) -> structural", !r.valid && r.structural, JSON.stringify(r));

    m = clone(chilies);
    m.nodes[firstNodeId].x = "not-a-number";
    r = classify(m);
    check("invalid node attribute (x) -> structural", !r.valid && r.structural, JSON.stringify(r));

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
