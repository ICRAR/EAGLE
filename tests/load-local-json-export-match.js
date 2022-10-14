import { Selector } from 'testcafe';
import https from 'https';
import fs from 'fs';

/*
    run with:

    testcafe chrome tests/load-json-export-match.js
*/

//const LG_PATH = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/master/SDP Pipelines/cont_img_YAN-970.graph";
//const LG_PATH = "https://raw.githubusercontent.com/ICRAR/EAGLE-graph-repo/master/examples/ArrayLoop.graph";
const LG_PATH = "tests/data/cont_img_YAN-970.graph";

let graphJSON = "input";

fixture `EAGLE Load JSON Export Match`
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

    const result0 = compareObj(obj1, obj2);
    const result1 = compareObj(obj2, obj1);

    // !!!!!!!!!!!!! CHECK FOR MATCH
    await t.expect(JSON.stringify(result0)).eql("{}", {timeout:3000});
    await t.expect(JSON.stringify(result1)).eql("{}", {timeout:3000});
});

const fetchGraph = (filename) => {
    graphJSON = fs.readFileSync(filename, 'utf8');
};

// use $.isEmptyObject or this
const isEmpty = function( o ) {
    for ( var p in o ) {
        if ( o.hasOwnProperty( p ) ) { return false; }
    }
    return true;
}

const compareObj = function(obj1, obj2) {
  var ret = {},rett;
  for(var i in obj2) {
      rett = {};
      if (typeof obj2[i] === 'object' && typeof obj1 !== 'undefined'){
          rett = compareObj(obj1[i], obj2[i]);
          if (!isEmpty(rett) ){
           ret[i]= rett
          }
       }else{
           if(!obj1 || !obj1.hasOwnProperty(i) || obj2[i] !== obj1[i]) {
              ret[i] = obj2[i];
      }
   }
  }
  return ret;
};
