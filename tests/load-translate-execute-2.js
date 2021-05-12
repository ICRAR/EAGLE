import { Selector } from 'testcafe';
import { networkInterfaces } from 'os';
import page from './page-model';
import https from 'https';

/*
    run with:

    export EAGLE_GITHUB_ACCESS_TOKEN="<token>";testcafe chrome tests/load-translate-execute.js
*/

var EAGLE_GITHUB_ACCESS_TOKEN = process.env.EAGLE_GITHUB_ACCESS_TOKEN;

const GRAPHS = [
    "https://raw.githubusercontent.com/ICRAR/EAGLE_test_repo/master/simple_tests/nested_graph/nested.graph",
    "https://raw.githubusercontent.com/ICRAR/EAGLE_test_repo/master/SummitIngest_Demo.graph"
];

const DALIUGE_TRANSLATOR_PORT = "8084";
const DALIUGE_MANAGER_PORT = "8001";
const DALIUGE_TRANSLATOR_URL = "/gen_pgt";

const SUCCESS_MESSAGE = "Finished";

let graphJSON = "";

// determine IP of running machine
const ip = [].concat(...Object.values(networkInterfaces())).find((details) => details.family === 'IPv4' && !details.internal).address;

const fetchGraph = (url) => {
    return new Promise(resolve => {
        const req = https.request(url, res => {
            let rawData = "";

            res.on('data', (d) => {
                rawData += d;
            });

            res.on('end', () => {
                graphJSON = rawData;
                resolve();
            });
        });

        req.on('error', e => {
            console.error(e);
        });

        req.end();
    });
};

fixture `DALiuGE Regression Test`
    .page `http://localhost:8888/`

for (let i = 0 ; i < GRAPHS.length ; i++){
    let graphUrl = GRAPHS[i];

    test('Load-Translate-Execute-2: ' + ip + " : " + graphUrl, async t =>{
        await fetchGraph(graphUrl);

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

            // enter the translator url
            .typeText(Selector('#setting11Value'), "http://" + ip + ":" + DALIUGE_TRANSLATOR_PORT + DALIUGE_TRANSLATOR_URL, { replace : true })

            // close settings modal
            .click('#settingsModal .modal-footer button')

            // end
            //.wait(3000);

        // !!!!!!!!!!!!! LOAD GRAPH
        await t
            .click('#navbarDropdown')
            .click('#createNewGraphFromJson')

            .typeText(Selector('#inputTextModalInput'), graphJSON, { replace : true, paste : true })

            .click('#inputTextModal .modal-footer button')

            .wait(3000);




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
