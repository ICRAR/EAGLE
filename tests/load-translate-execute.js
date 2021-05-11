import { Selector } from 'testcafe';
import { networkInterfaces } from 'os';
import page from './page-model';

/*
    run with:

    export EAGLE_GITHUB_ACCESS_TOKEN="<token>";testcafe chrome tests/load-translate-execute.js
*/

var EAGLE_GITHUB_ACCESS_TOKEN = process.env.EAGLE_GITHUB_ACCESS_TOKEN;

const GRAPHS = [
    {repository:"ICRAR/EAGLE_test_repo", branch:"master", path:"simple_tests/nested_graph", filename:"nested.graph"},
    {repository:"ICRAR/EAGLE_test_repo", branch:"master", path:"", filename:"SummitIngest_Demo.graph"}
];

const DALIUGE_TRANSLATOR_PORT = "8084";
const DALIUGE_MANAGER_PORT = "8001";
const DALIUGE_TRANSLATOR_URL = "/gen_pgt";

const SUCCESS_MESSAGE = "Finished";

// determine IP of running machine
const ip = [].concat(...Object.values(networkInterfaces())).find((details) => details.family === 'IPv4' && !details.internal).address;

fixture `DALiuGE Regression Test`
    .page `http://localhost:8888/`

for (let i = 0 ; i < GRAPHS.length ; i++){
    let graph = GRAPHS[i];
    let graphName = graph.repository + ' (' + graph.branch + ') ' + graph.path + '/' + graph.filename;

    test('Load-Translate-Execute: ' + ip + " : " + graphName, async t =>{

        // !!!!!!!!!!!!! SETUP
        await t
            // wait for the page to settle down
            .wait(3000)

            // set a handler for the beforeunload event that occurs when the user navigates away from the page
            .setNativeDialogHandler((type, text, url) => {
                switch (type) {
                    case 'beforeunload':
                        return true;
                    default:
                        throw 'A dialog was invoked!';
                }
            })

            // click the settings button
            .click('#navbarDropdownHelp')
            .click("#settings")

            // disable the 'cofirm discard changes' setting
            .click('#setting0Button')

            // enter the github access token
            .typeText(Selector('#setting13Value'), EAGLE_GITHUB_ACCESS_TOKEN, { replace : true })

            // enter the translator url
            .typeText(Selector('#setting11Value'), "http://" + ip + ":" + DALIUGE_TRANSLATOR_PORT + DALIUGE_TRANSLATOR_URL, { replace : true })

            // close settings modal
            .click('#settingsModal .modal-footer button')

            // end
            //.wait(3000);

        // !!!!!!!!!!!!! LOAD GRAPH
        await t
            // open the repositories tab in the right window
            .click('#rightWindowModeRepositories')

            // click the required repository name
            .click('#' + graph.repository.replace('/', '_') + '_' + graph.branch)

            .wait(30000);

        // click through the directories in the path
        if (graph.path !== ""){
            for (let i = 0 ; i < graph.path.split('/').length ; i++){
                let dirname = graph.path.split('/')[i];

                await t.click('#folder_' + dirname);
            }
        }

        await t
            // wait for the contents to load
            //.wait(12000)

            // click the graph name
            .click('#id_' + graph.filename.replace('.', '_'))

            // wait for the graph to load
            //.wait(8000);

        // !!!!!!!!!!!!! TRANSLATE GRAPH
        await t

            // open the translation tab in the right window
            .click('#rightWindowModeTranslation')

            // open algorithm 1
            .click('#headingTwo')

            // click the 'Generate PGT' button
            .click('#alg1PGT');

            // choose the 'OJS' output format
        await page.selectOption('OJS');

            // wait for the graph to translate
        //await t.wait(8000);

        // !!!!!!!!!!!!! DEPLOY AND EXECUTE
        await t
            // write manager host and port
            .typeText(Selector('input[name="dlg_mgr_host"]'), ip, { replace : true })
            .typeText(Selector('input[name="dlg_mgr_port"]'), DALIUGE_MANAGER_PORT, { replace : true })

            // click 'generate and deploy physical graph' button
            .click('#gen_pg_button');


        // !!!!!!!!!!!!! AWAIT RESULTS
        await t
            .wait(1000)

            // check that the result is OK
            .expect(Selector("#session-status").innerText).contains(SUCCESS_MESSAGE, {timeout:60000});
    });
}
