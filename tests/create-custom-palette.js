import { Selector } from 'testcafe';
import page from './page-model';

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
        .click(Selector('#settingUserInterfaceModeValue').find('option').withText('Expert'))

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
});
