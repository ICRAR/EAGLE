import { Selector, ClientFunction } from 'testcafe';
import { networkInterfaces } from 'os';
import page from './page-model';
import http from 'http';
import https from 'https';

/*
    run with:

    testcafe chrome tests/load-translate-execute-2.js
*/

const GRAPHS = [
    "https://raw.githubusercontent.com/ICRAR/EAGLE_test_repo/master/SummitIngest_Demo.graph",
    "https://raw.githubusercontent.com/ICRAR/daliuge/master/daliuge-translator/test/dropmake/logical_graphs/testLoop.graph",
    "https://raw.githubusercontent.com/ICRAR/daliuge/master/daliuge-translator/test/dropmake/logical_graphs/chiles_simple.graph",
    //"https://raw.githubusercontent.com/ICRAR/daliuge/master/daliuge-translator/test/dropmake/logical_graphs/lofar_std.graph",
    //"https://raw.githubusercontent.com/ICRAR/daliuge/master/daliuge-translator/test/dropmake/logical_graphs/test_grpby_gather.graph"
];

// NOTE: the translator port is non-standard for DaLiuGE
//       we use it because within the GitHub CI environment
//       port 8084 are already in use

const DALIUGE_TRANSLATOR_PORT = "6379";

const DALIUGE_DIM_PORT = "8001";
const DALIUGE_NM_PORT = "8000";
const DALIUGE_TRANSLATOR_URL = "/gen_pgt";

const SUCCESS_MESSAGE = "Finished";

const PAGE_TRANSITION_WAIT_DURATION = 3000;

let graphJSON = "";

// determine IP of running machine
const ip = [].concat(...Object.values(networkInterfaces())).find((details) => details.family === 'IPv4' && !details.internal).address;

const startLocalManagers = () => {
    return new Promise((resolve, reject) => {

        const data = JSON.stringify({
            nodes: ['localhost']
        });

        const options = {
            hostname: 'localhost',
            port: 9000,
            path: '/managers/dataisland',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, res => {
            console.log(`statusCode: ${res.statusCode}`);

            res.on('data', d => {
                //process.stdout.write(d);
            });

            res.on('end', () => {
                resolve();
            });
        });

        req.on('error', error => {
            console.error(error);
            reject(new Error(error));
        });

        req.write(data);
        req.end();
    });
}

const fetchGraph = (url) => {
    return new Promise((resolve, reject) => {
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
            reject(new Error(e));
        });

        req.end();
    });
};

const getPageHTML = ClientFunction(() => {
   return document.documentElement.outerHTML;
});

const getPageLocation = ClientFunction(() => {
    return document.location.href;
});

const printPageHTML = async () => {
    console.log(await getPageHTML());
}

const printPageLocation = async (prefix) => {
    console.log(prefix + ":" + (await getPageLocation()));
};

// this is probably only required in the short term, until the new UI hits master?
const setFormTargetSelf = ClientFunction(() => {
    document.getElementById('pg_form').target = "_self";
});

fixture `DALiuGE Start Local Managers`
    .page `http://localhost:9000`

    test('start', async t => {
        await startLocalManagers();
    });

fixture `Test Translator`
    .page `http://localhost:${DALIUGE_TRANSLATOR_PORT}/`

    test('is running', async t => {

        await t
            .setNativeDialogHandler((type, text, url) => {
                console.log("Handled native dialog:" + type + ":" + text + ":" + url);
                return true;
            });

        await printPageLocation("Test Translator");
        await t.expect(Selector("#sample .tabs li.active a").innerText).contains("Graph", {timeout:15000});
    });

fixture `Test Data Island Manager`
    .page `http://localhost:${DALIUGE_DIM_PORT}/`

    test('is running', async t => {

        await t
            .setNativeDialogHandler((type, text, url) => {
                console.log("Handled native dialog:" + type + ":" + text + ":" + url);
                return true;
            });

        await printPageLocation("Test DIM");
        await t.expect(Selector(".container .breadcrumb li a").innerText).contains("DataIslandManager", {timeout:15000});
    });

fixture `Test Node Manager`
    .page `http://localhost:${DALIUGE_NM_PORT}/`

    test('is running', async t => {

        await t
            .setNativeDialogHandler((type, text, url) => {
                console.log("Handled native dialog:" + type + ":" + text + ":" + url);
                return true;
            });

        await printPageLocation("Test NM");
        await t.expect(Selector(".container h1").innerText).contains("NodeManager", {timeout:15000});
    });

fixture `DALiuGE Regression Test`
    .page `http://localhost:8888/`

for (let i = 0 ; i < GRAPHS.length ; i++){
    let graphUrl = GRAPHS[i];

    test('Load-Translate-Execute-2: ' + ip + " : " + graphUrl, async t =>{
        await fetchGraph(graphUrl);

        // !!!!!!!!!!!!! SETUP
        await t
            // wait for the page to settle down
            .wait(PAGE_TRANSITION_WAIT_DURATION)

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

            // disable the 'confirm discard changes' setting
            .click('#settingConfirmDiscardChangesButton')

            // disable the 'spawn translation tab' setting
            .click('#settingSpawnTranslationTabButton')

            // enter the translator url
            .typeText(Selector('#settingTranslatorURLValue'), "http://" + "localhost" + ":" + DALIUGE_TRANSLATOR_PORT + DALIUGE_TRANSLATOR_URL, { replace : true })

            // use the complex translator options
            .click('#settingUseSimplifiedTranslatorOptionsButton')

            // close settings modal
            .click('#settingsModalAffirmativeButton')

            // end
            //.wait(3000);

        // !!!!!!!!!!!!! LOAD GRAPH
        await t
            .click(Selector('#navbarDropdownGraph'))
            .hover(Selector('#navbarDropdownGraphNew'))
            .hover(Selector('#createNewGraph'))  // we have to make sure to move horizontally first, so that the menu doesn't dissappear
            .click(Selector('#createNewGraphFromJson'))

            .typeText(Selector('#inputTextModalInput'), graphJSON, { replace : true, paste : true })

            .click('#inputTextModal .modal-footer button')

            .wait(PAGE_TRANSITION_WAIT_DURATION);




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
        await t.wait(PAGE_TRANSITION_WAIT_DURATION);

        // debug
        await printPageLocation("Translator");

        // !!!!!!!!!!!!! DEPLOY AND EXECUTE
        await t
            // write manager host and port
            .typeText(Selector('input[name="dlg_mgr_host"]'), ip, { replace : true })
            .typeText(Selector('input[name="dlg_mgr_port"]'), DALIUGE_DIM_PORT, { replace : true });

            // modify the pg_form to make it open in the same tab when the button is clicked
        await setFormTargetSelf();

            // click 'generate and deploy physical graph' button
        await t
            .click('#gen_pg_button');


        // !!!!!!!!!!!!! AWAIT RESULTS
        await t
            .wait(PAGE_TRANSITION_WAIT_DURATION);

        // debug
        await printPageLocation("Engine");

        await t
            // check that the result is OK (within 5 mins)
            .expect(Selector("#session-status").innerText).contains(SUCCESS_MESSAGE, {timeout:300000});
    });
}
