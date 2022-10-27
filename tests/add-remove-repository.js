import { Selector } from 'testcafe';
import fs from 'fs';

/*
    run with:

    testcafe chrome tests/add-remove-repository.js
*/

const REPO_NAME = "ICRAR/daliuge";
const REPO_BRANCH = "yan-812-2";

fixture `EAGLE Update Components`
    .page `http://localhost:8888/`

test('Update components', async t =>{
    await t.wait(3000);

    // remember number of repos

    // click the 'add repository' button
    await t
        .click(Selector('#addRepository'))
        .wait(1000);

    // enter text into the 'add repository' modal
    await t
        .typeText(Selector('#gitCustomRepositoryModalRepositoryNameInput'), REPO_NAME, { replace : true, paste : true })
        .typeText(Selector('#gitCustomRepositoryModalRepositoryBranchInput'), REPO_BRANCH, { replace : true, paste : true })
        .wait(1000);

    // check that number of repositories has increased by one
    await t.expect(obj1.nodeDataArray[2].fields.length).eql(5, {timeout:3000});

    // remove the repository 
    

    // check that number of repositories has returned to the original value
    await t.expect(obj1.nodeDataArray[2].fields[0].name).eql("appclass", {timeout:3000});

});

const fetchGraph = (filename) => {
    graphJSON = fs.readFileSync(filename, 'utf8');
};
