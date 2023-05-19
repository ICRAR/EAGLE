import { Selector } from 'testcafe';
import fs from 'fs';
import { Utils } from '../src/Utils';

/*
    run with:

    testcafe chrome tests/load-local-json-export-match.js
*/

const LG_PATH = "tests/data/cont_img_YAN-970.graph";

let graphJSON = "input";

fixture `EAGLE LOCAL Load JSON Export Match`
    .page `http://localhost:8888/`

test('Load JSON export match', async t =>{
    await fetchGraph(LG_PATH);

    await t.wait(3000);

    // !!!!!!!!!!!!! LOAD GRAPH
    await t
        .click(Selector('#navbarDropdownGraph'))
        .hover(Selector('#navbarDropdownGraphNew'))
        .hover(Selector('#createNewGraph'))  // we have to make sure to move horizontally first, so that the menu doesn't disappear
        .click(Selector('#createNewGraphFromJson'))

        .typeText(Selector('#inputTextModalInput'), graphJSON, { replace : true, paste : true })

        .click('#inputTextModal .modal-footer button')

        .wait(3000);

    // !!!!!!!!!!!!! EXPORT JSON
    await t
        .click(Selector('#navbarDropdownGraph'))
        .hover(Selector('#navbarDropdownGraphNew'))
        .hover(Selector('#createNewGraph'))  // we have to make sure to move horizontally first, so that the menu doesn't disappear
        .click(Selector('#displayGraphAsJson'));

    await t.wait(1000);

    const outputJSON = await Selector("#inputTextModalInput").value;

    const obj1 = JSON.parse(graphJSON);
    const obj2 = JSON.parse(outputJSON);

    const result0 = Utils.compareObj(obj1, obj2);
    const result1 = Utils.compareObj(obj2, obj1);

    // !!!!!!!!!!!!! CHECK FOR MATCH
    await t.expect(JSON.stringify(result0)).eql("{}", {timeout:3000});
    await t.expect(JSON.stringify(result1)).eql("{}", {timeout:3000});
});

const fetchGraph = (filename) => {
    graphJSON = fs.readFileSync(filename, 'utf8');
};
