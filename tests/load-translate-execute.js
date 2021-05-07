import { Selector } from 'testcafe';
import page from './page-model';

/*
    run with:

    export EAGLE_GITHUB_ACCESS_TOKEN="<token>";testcafe chrome tests/load-translate-execute.js
*/

var EAGLE_GITHUB_ACCESS_TOKEN = process.env.EAGLE_GITHUB_ACCESS_TOKEN;

const TRANSLATOR_URL = "http://localhost:8084/gen_pgt";
const REPOSITORY_NAME = "ICRAR/EAGLE_test_repo";
const REPOSITORY_BRANCH = "master";
const GRAPH_NAME = "SummitIngest_Demo.graph"; // TODO: at the moment, this onlt works for graphs in the root directory of the repo

fixture `EAGLE Set GitHub Access Token`
    .page `http://localhost:8888/`

test('Set token', async t =>{
    await t
        // !!!!!!!!!!!!! SETUP

        // wait for the page to settle down
        .wait(3000)

        // click the settings button
        .click('#navbarDropdownHelp')
        .click("#settings")

        // enter the github access token
        .typeText(Selector('#setting13Value'), EAGLE_GITHUB_ACCESS_TOKEN, { replace : true })

        // enter the translator url
        .typeText(Selector('#setting11Value'), TRANSLATOR_URL, { replace : true })

        // close settings modal
        .click('#settingsModal .modal-footer button')

        // end
        .wait(3000)

        // !!!!!!!!!!!!! LOAD GRAPH

        // open the repositories tab in the right window
        .click('#rightWindowModeRepositories')

        // click the required repository name
        .click('#' + REPOSITORY_NAME.replace('/', '_') + '_' + REPOSITORY_BRANCH)

        // wait for the contents to load
        .wait(12000)

        // click the graph name
        .click('#id_' + GRAPH_NAME.replace('.', '_'))

        // wait for the graph to load
        .wait(8000)

        // !!!!!!!!!!!!! TRANSLATE GRAPH

        // open the translation tab in the right window
        .click('#rightWindowModeTranslation')

        // open algorithm 1
        .click('#headingTwo')

        // click the 'Generate PGT' button
        .click('#alg1PGT');

        // choose the 'OJS' output format
    await page.selectOption('OJS');

        // wait for the graph to translate
    await t.wait(8000);
});
