import {Eagle} from '../src/Eagle';
import {Node} from '../src/Node';
import {Port} from '../src/Port';
import {Field} from '../src/Field';

const KEY : number = -9;
const NAME : string = "Test Node";
const DESCRIPTION : string = "Test description";
const CATEGORY : Eagle.Category = Eagle.Category.Loop;
const CATEGORY_TYPE : Eagle.CategoryType = Eagle.CategoryType.Group;
const X : number = 234;
const Y : number = 567;

const WIDTH : number = 640;
const HEIGHT : number = 480;
const SUBJECT_KEY : number = -10;
const COLOR : string = "orange";
const DRAW_ORDER_HINT : number = 10;

const PARENT_KEY : number = -10;
const COLLAPSED : boolean = true;
const STREAMING : boolean = true;
const SHOW_PORTS : boolean = true;
const SELECTED : boolean = true;
const INPUT_APPLICATION_CATEGORY : Eagle.Category = Eagle.Category.BashShellApp;
const EXIT_APPLICATION_CATEGORY : Eagle.Category = Eagle.Category.Docker;
const INPUT_APPLICATION_NAME : string = "Input App";
const EXIT_APPLICATION_NAME : string = "Exit App";
const INPUT_APPLICATION_KEY : number = -2;
const EXIT_APPLICATION_KEY : number = -4;

const EXPANDED : boolean = true;

const INPUT_PORT_ID : string = "input_port";
const INPUT_PORT_NAME : string = "Input Port";
const EXIT_PORT_ID : string = "exit_port";
const EXIT_PORT_NAME : string = "Exit Port";

const FIELD : Field = new Field("Field Text", "Field Name", "Field Value", "Field Desc", true, "String");
const INPUT_APP_FIELD : Field = new Field("Input App Field Text", "Input App Field Name", "Input App Field Value", "Input App Field Desc", false, "Number");
const EXIT_APP_FIELD : Field = new Field("Exit App Field Text", "Exit App Field Name", "Exit App Field Value", "Exit App Field Desc", false, "Boolean");

// create table to contain results
var table : any[] = [];

// create a node
var primaryNode : Node = new Node(KEY, NAME, DESCRIPTION, CATEGORY, CATEGORY_TYPE, X, Y);

// set values for node
primaryNode.setWidth(WIDTH);
primaryNode.setHeight(HEIGHT);
primaryNode.setSubjectKey(SUBJECT_KEY);
primaryNode.setColor(COLOR);
primaryNode.setDrawOrderHint(DRAW_ORDER_HINT);
primaryNode.setParentKey(PARENT_KEY);
primaryNode.setCollapsed(COLLAPSED);
primaryNode.setStreaming(STREAMING);
primaryNode.setShowPorts(SHOW_PORTS);
primaryNode.setSelected(SELECTED);
primaryNode.setExpanded(EXPANDED);

// input app
let inputApplication = Node.createEmbeddedApplicationNode(INPUT_APPLICATION_NAME, INPUT_APPLICATION_CATEGORY, INPUT_APPLICATION_KEY);
inputApplication.addField(INPUT_APP_FIELD.clone());
inputApplication.addPort(new Port(INPUT_PORT_ID, INPUT_PORT_NAME, true), true);

// exit app
let exitApplication = Node.createEmbeddedApplicationNode(EXIT_APPLICATION_NAME, EXIT_APPLICATION_CATEGORY, EXIT_APPLICATION_KEY);
exitApplication.addField(EXIT_APP_FIELD.clone());
exitApplication.addPort(new Port(EXIT_PORT_ID, EXIT_PORT_NAME, false), false);

primaryNode.setInputApplication(inputApplication);
primaryNode.setExitApplication(exitApplication);

primaryNode.addField(FIELD.clone());

console.log("Test toOJSJson/fromOJSJson");
// write node to JSON
var json : object = Node.toOJSJson(primaryNode);
//console.log(json);

// read the node back from JSON
var secondaryNode : Node = Node.fromOJSJson(json);

console.log("secondaryNode has:");
console.log("inputPorts", secondaryNode.getInputPorts().length);
console.log("outputPorts", secondaryNode.getOutputPorts().length);
console.log("inputApp inputPorts", secondaryNode.getInputApplication()?.getInputPorts().length);
console.log("inputApp outputPorts", secondaryNode.getInputApplication()?.getOutputPorts().length);
console.log("outputApp inputPorts", secondaryNode.getOutputApplication()?.getInputPorts().length);
console.log("outputApp outputPorts", secondaryNode.getOutputApplication()?.getOutputPorts().length);
console.log("exitApp inputPorts", secondaryNode.getExitApplication()?.getInputPorts().length);
console.log("exitApp outputPorts", secondaryNode.getExitApplication()?.getOutputPorts().length);

checkNode(primaryNode, secondaryNode, true);

console.log("Test clone");
var clonedNode : Node = primaryNode.clone();
checkNode(primaryNode, clonedNode, true);


// finish
process.exit();

// make sure the nodes are the same
function checkNode(n0 : Node, n1 : Node, displayTable : boolean){
    table = [];

    checkNumber("Key", n0.getKey(), n1.getKey(), KEY);
    checkString("Name", n0.getName(), n1.getName(), NAME);
    checkString("Description", n0.getDescription(), n1.getDescription(), DESCRIPTION);
    checkString("Category", n0.getCategory(), n1.getCategory(), CATEGORY);
    checkString("Category Type", n0.getCategoryType(), n1.getCategoryType(), CATEGORY_TYPE);
    checkNumber("X", n0.getPosition().x, n1.getPosition().x, X);
    checkNumber("Y", n0.getPosition().y, n1.getPosition().y, Y);

    checkNumber("Subject Key", n0.getSubjectKey(), n1.getSubjectKey(), SUBJECT_KEY);
    checkNumber("Width", n0.getWidth(), n1.getWidth(), WIDTH);
    checkNumber("Height", n0.getHeight(), n1.getHeight(), HEIGHT);
    checkString("Color", n0.getColor(), n1.getColor(), COLOR);
    checkNumber("Draw Order Hint", n0.getDrawOrderHint(), n1.getDrawOrderHint(), DRAW_ORDER_HINT);
    checkNumber("Parent Key", n0.getParentKey(), n1.getParentKey(), PARENT_KEY);
    checkBoolean("Collapsed", n0.isCollapsed(), n1.isCollapsed(), COLLAPSED);
    checkBoolean("Streaming", n0.isStreaming(), n1.isStreaming(), STREAMING);
    checkBoolean("Show Ports", n0.isShowPorts(), n1.isShowPorts(), SHOW_PORTS);
    checkBoolean("Selected", n0.getSelected(), n1.getSelected(), SELECTED);
    checkBoolean("Expanded", n0.getExpanded(), n1.getExpanded(), EXPANDED);

    checkString("Input Application Type",  n0.getInputApplication().getCategory(),  n1.getInputApplication().getCategory(),  INPUT_APPLICATION_CATEGORY );
    checkString("Exit Application Type",   n0.getExitApplication().getCategory(),   n1.getExitApplication().getCategory(),   EXIT_APPLICATION_CATEGORY  );
    checkString("Input Application Name",  n0.getInputApplication().getName(),      n1.getInputApplication().getName(),      INPUT_APPLICATION_NAME);
    checkString("Exit Application Name",   n0.getExitApplication().getName(),       n1.getExitApplication().getName(),       EXIT_APPLICATION_NAME);

    // ports
    checkString("Input Port Id",    n0.getInputPorts()[0].getId(), n1.getInputPorts()[0].getId(), INPUT_PORT_ID);
    checkString("Input Port Name",  n0.getInputPorts()[0].getName(), n1.getInputPorts()[0].getName(), INPUT_PORT_NAME);
    checkString("Exit Port Id",     n0.getExitApplication().getOutputPorts()[0].getId(), n1.getExitApplication().getOutputPorts()[0].getId(), EXIT_PORT_ID);
    checkString("Exit Port Name",   n0.getExitApplication().getOutputPorts()[0].getName(), n1.getExitApplication().getOutputPorts()[0].getName(), EXIT_PORT_NAME);

    // fields
    checkString("Field Text", n0.getFields()[0].getText(), n1.getFields()[0].getText(), FIELD.getText());
    checkString("Field Name", n0.getFields()[0].getName(), n1.getFields()[0].getName(), FIELD.getName());
    checkString("Field Value", n0.getFields()[0].getValue(), n1.getFields()[0].getValue(), FIELD.getValue());
    checkString("Field Description", n0.getFields()[0].getDescription(), n1.getFields()[0].getDescription(), FIELD.getDescription());

    // app fields
    checkString("Input App Field Text",        n0.getInputApplication().getFields()[0].getText(),        n1.getInputApplication().getFields()[0].getText(),        INPUT_APP_FIELD.getText());
    checkString("Input App Field Name",        n0.getInputApplication().getFields()[0].getName(),        n1.getInputApplication().getFields()[0].getName(),        INPUT_APP_FIELD.getName());
    checkString("Input App Field Value",       n0.getInputApplication().getFields()[0].getValue(),       n1.getInputApplication().getFields()[0].getValue(),       INPUT_APP_FIELD.getValue());
    checkString("Input App Field Description", n0.getInputApplication().getFields()[0].getDescription(), n1.getInputApplication().getFields()[0].getDescription(), INPUT_APP_FIELD.getDescription());
    // TODO: readonly, type

    checkString("Exit App Field Text",        n0.getExitApplication().getFields()[0].getText(),        n1.getExitApplication().getFields()[0].getText(),        EXIT_APP_FIELD.getText());
    checkString("Exit App Field Name",        n0.getExitApplication().getFields()[0].getName(),        n1.getExitApplication().getFields()[0].getName(),        EXIT_APP_FIELD.getName());
    checkString("Exit App Field Value",       n0.getExitApplication().getFields()[0].getValue(),       n1.getExitApplication().getFields()[0].getValue(),       EXIT_APP_FIELD.getValue());
    checkString("Exit App Field Description", n0.getExitApplication().getFields()[0].getDescription(), n1.getExitApplication().getFields()[0].getDescription(), EXIT_APP_FIELD.getDescription());
    // TODO: readonly, type

    // print table
    if (displayTable){
        console.table(table);
    }
}


function checkNumber(attribute : string, primaryValue : number, secondaryValue : number, expectedValue : number){
    console.assert(primaryValue === expectedValue && secondaryValue === expectedValue, attribute + " numbers do not match. N0:" + primaryValue + ", N1:" + secondaryValue + ", Expected:" + expectedValue);
    addTableRow(attribute, primaryValue, secondaryValue, expectedValue);
}

function checkString(attribute : string, primaryValue : string, secondaryValue : string, expectedValue : string){
    console.assert(primaryValue === expectedValue && secondaryValue === expectedValue, attribute + " strings do not match. N0:" + primaryValue + ", N1:" + secondaryValue + ", Expected:" + expectedValue);
    addTableRow(attribute, primaryValue, secondaryValue, expectedValue);
}

function checkBoolean(attribute : string, primaryValue : boolean, secondaryValue : boolean, expectedValue : boolean){
    console.assert(primaryValue === expectedValue && secondaryValue === expectedValue, attribute + " booleans do not match. N0:" + primaryValue + ", N1:" + secondaryValue + ", Expected:" + expectedValue);
    addTableRow(attribute, primaryValue, secondaryValue, expectedValue);
}

function addTableRow(attribute : string, primaryValue : any, secondaryValue : any, expectedValue : any){
    table.push({
        "Attribute":attribute,
        "Expected Value": expectedValue,
        "Written Value":primaryValue,
        "Written Match?": primaryValue === expectedValue,
        "Readback Value": secondaryValue,
        "Readback Match?": secondaryValue === expectedValue
    });
}
