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
// Verifies the behaviour introduced by the "treat non-structural schema
// failures as warnings" change:
//   - a valid V4 graph (including one missing the changeable attribute) loads
//   - missing/invalid non-structural top-level keys (edges, visuals, configs,
//     activeGraphConfigId) or any per-object attribute -> warnings (load)
//   - missing/wrong-type modelData or nodes -> structural error (block)
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
const { isStructuralV4Error, hasStructuralError } = classifier;
const STRUCTURAL_KEYS = classifier.STRUCTURAL_KEYS;

function run() {
    const schema = JSON.parse(readFileSync(path.join(repoRoot, "static", "lg.graph.v4.schema"), "utf8"));

    // replicate Utils._validateJSONDetailed + Eagle's classification
    function classify(dataObject) {
        const ajv = new Ajv({ strict: false, logger: false });
        const valid = ajv.validate(schema, dataObject);
        const errors = (ajv.errors ?? []).map((e) => ({
            dataPath: e.instancePath ?? "",
            message: e.message ?? "",
            missingProperty: e.params && e.params.missingProperty,
        }));
        if (valid) return { valid: true, structural: false, errors: 0, warnings: 0 };
        let structural = false;
        let warnings = 0;
        for (const error of errors) {
            if (isStructuralV4Error(error)) {
                structural = true;
            } else {
                warnings++;
            }
        }
        return { valid: false, structural, warnings, totalErrors: errors.length };
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
    check("/nodes (wrong type) is structural", isStructuralV4Error({ dataPath: "/nodes", message: "" }));
    check("/nodes/xxx (deep) is NOT structural", !isStructuralV4Error({ dataPath: "/nodes/1/fields", message: "" }));
    check("/modelData (wrong type) is structural", isStructuralV4Error({ dataPath: "/modelData", message: "" }));
    check("/edges (wrong type) is NOT structural", !isStructuralV4Error({ dataPath: "/edges", message: "" }));
    check("hasStructuralError true when one structural", hasStructuralError([{ dataPath: "" }, { dataPath: "", missingProperty: "nodes" }]));
    check("hasStructuralError false when none", !hasStructuralError([{ dataPath: "/edges" }, { dataPath: "", missingProperty: "visuals" }]));

    // --- end-to-end against the real schema ---
    console.log("\nSchema classification (real lg.graph.v4.schema):");

    let r = classify(chilies);
    check("valid chilies file -> valid (loads)", r.valid === true);

    r = classify(clone(chilies)); // no structural keys touched, but missing edges/visuals are allowed now
    check("chilies as-is -> valid", r.valid === true);

    let m = clone(chilies); delete m.nodes;
    r = classify(m);
    check("missing nodes -> structural (blocks)", !r.valid && r.structural, JSON.stringify(r));

    m = clone(chilies); delete m.modelData;
    r = classify(m);
    check("missing modelData -> structural (blocks)", !r.valid && r.structural, JSON.stringify(r));

    m = clone(chilies); m.nodes = 5;
    r = classify(m);
    check("nodes wrong type -> structural (blocks)", !r.valid && r.structural, JSON.stringify(r));

    m = clone(chilies); m.modelData = 5;
    r = classify(m);
    check("modelData wrong type -> structural (blocks)", !r.valid && r.structural, JSON.stringify(r));

    // non-structural: these should NOT block (no structural error). They may or may not be valid
    // depending on whether the schema still requires them; the key guarantee is "not structural".
    m = clone(chilies); delete m.edges;
    r = classify(m);
    check("missing edges -> not structural", !r.structural, JSON.stringify(r));

    m = clone(chilies); delete m.visuals;
    r = classify(m);
    check("missing visuals -> not structural", !r.structural, JSON.stringify(r));

    m = clone(chilies); delete m.graphConfigurations; delete m.activeGraphConfigId;
    r = classify(m);
    check("missing graph configs -> not structural", !r.structural, JSON.stringify(r));

    // per-object attribute missing (changeable on a field) -> not structural
    m = clone(chilies);
    const firstNodeId = Object.keys(m.nodes)[0];
    const firstFieldId = Object.keys(m.nodes[firstNodeId].fields)[0];
    delete m.nodes[firstNodeId].fields[firstFieldId].changeable;
    r = classify(m);
    check("field missing changeable -> not structural", !r.structural, JSON.stringify(r));

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
