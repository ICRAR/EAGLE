import { Selector } from 'testcafe';
import page from './page-model';

/*
    run with:

    testcafe chrome tests/edit-node-parameter.js
*/

const NEW_PALETTE_NAME = "new.palette";
const DUMMY_VALUE = "02348562";

fixture `EAGLE Edit Node Parameter`
    .page `http://localhost:8888/`

test('Edit node parameter', async t =>{
    await t
        // wait for the page to settle down
        .wait(3000)

        // open settings modal
        .click('#settings')

        // enable 'expert mode'
        .click('#settingUserInterfaceModeValue')

        // click the 'expert' option
        .click(Selector('#settingUserInterfaceModeValue').find('option').withText('expert'))

        // close settings modal
        .click('#settingsModalAffirmativeButton')

        // select hello world app node in palette
        .click("#selectPaletteNodeHelloWorldApp")

        // add selected node to palette
        .click("#addSelectedNodeToPalette")

        .wait(1000)

        // new destination palette
        .typeText(Selector('#choiceModalString'), NEW_PALETTE_NAME)

        // click OK on modal dialog
        .click('#choiceModalAffirmativeButton')

        // add a hello world node to the graph
        .click("#addPaletteNodeHelloWorldApp")

        // check that a file node has been created
        .expect(Selector("#nodeNameValue").value).eql("HelloWorldApp")

        // click the header for the parameters section
        .click(Selector('h5.card-header[href="#nodeCategoryCollapse9"]'))

        // edit first parameter in the node inspector
        .typeText(Selector('#field4'), DUMMY_VALUE, {replace: true})

        // check that first parameter was updated
        .expect(Selector("#field4").value).eql(DUMMY_VALUE)

        // end
        .wait(3000);
});
