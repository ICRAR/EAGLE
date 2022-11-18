import { Selector } from 'testcafe';

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
    const beforeCount = await Selector('.repositories repository').count;

    // click the 'add repository' button
    await t
        .click(Selector('#addRepository'))
        .wait(1000);

    // enter text into the 'add repository' modal
    await t
        .typeText(Selector('#gitCustomRepositoryModalRepositoryNameInput'), REPO_NAME, { replace : true, paste : true })
        .typeText(Selector('#gitCustomRepositoryModalRepositoryBranchInput'), REPO_BRANCH, { replace : true, paste : true })
        .wait(1000)
        .click(Selector('#gitCustomRepositoryModalAffirmativeButton'))
        .wait(1000);

    // check that number of repositories has increased by one
    const afterAddCount = await Selector('.repositories repository').count;
    await t.expect(afterAddCount).eql(beforeCount + 1);

    // remove the repository
    const removeButtonHtmlId = REPO_NAME.replace('/', '_') + "_" + REPO_BRANCH + "-eject";
    await t
        .click(Selector('#'+removeButtonHtmlId))
        .wait(1000)
        .click(Selector('#confirmModalAffirmativeAnswer'))
        .wait(1000);

    // check that number of repositories has returned to the original value
    const afterRemoveCount = await Selector('.repositories repository').count;
    await t.expect(afterRemoveCount).eql(beforeCount);
});
