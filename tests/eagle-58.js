import { Selector } from 'testcafe';

/*
    run with:

    export EAGLE_GITHUB_ACCESS_TOKEN="<insert personal access token>";testcafe chrome tests/eagle-58.js
*/

var EAGLE_GITHUB_ACCESS_TOKEN = process.env.EAGLE_GITHUB_ACCESS_TOKEN;
var TESTING_REPOSITORY = "ICRAR/dlg_repo";
var TESTING_BRANCH = "master";
var GRAPH_FILENAME = "SummitIngest_Demo";
var SUCCESS_MESSAGE = "Success:";

fixture `EAGLE 58`
    .page `http://localhost:8888/`

test('Translate graph', async t =>{
    await t
        // wait for the page to settle down
        .maximizeWindow()
        .wait(2000)

        // enter the github access token
        .click('#navbarDropdownGit')
        .click('#setGitHubAccessToken')
        .typeText(Selector('#inputModalInput'), EAGLE_GITHUB_ACCESS_TOKEN, {replace: true})
        .click('#inputModal .modal-footer button')

        // enter the testing repo as a custom repo
        .click('#navbarDropdownGit')
        .click('#addCustomRepository')
        .typeText(Selector('#gitCustomRepositoryModalRepositoryNameInput'), TESTING_REPOSITORY, {replace:true})
        .typeText(Selector('#gitCustomRepositoryModalRepositoryBranchInput'), TESTING_BRANCH, {replace:true})
        .click('#gitCustomRepositoryModalAffirmativeButton')

        // load the graph
        .click('#' + TESTING_REPOSITORY.replace('/','_'))
        .wait(500)
        .click('#id_' + GRAPH_FILENAME + '_graph')
        .wait(500)

        // Use the assertion to check if the actual header text is equal to the expected one
        .expect(Selector("div[data-notify='container'] span[data-notify='title']").innerText).eql(SUCCESS_MESSAGE)

        // make a minor modification to the graph to trigger the isModified flag
        .drag(Selector('#node0 rect:not(.header-background)'), 10, 10, {
            offsetX: 150,
            offsetY: 150
        })
        .wait(500)

        // check that the modified flag is visible in the tab title
        .expect(Selector("title").innerText).contains('*')

        // save graph to local disk
        .click('#navbarDropdownDisk')
        .click('#saveGraph')
        .wait(500)

        // check that modified flag has gone
        .expect(Selector("title").innerText).notContains('*')

        // switch to LG mode

        // check that switch happened

        .wait(5000)
});
