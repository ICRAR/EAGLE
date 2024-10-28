import { Category } from '../src/Category';
import { Daliuge } from '../src/Daliuge';
import { Errors } from '../src/Errors';
import { Field } from '../src/Field';
import { Node } from '../src/Node';
import { Utils } from '../src/Utils';

const KEY : number = -9;
const NAME : string = "Test Node";
const DESCRIPTION : string = "Test description";
const CATEGORY : Category = Category.Loop;
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
const INPUT_APPLICATION_CATEGORY : Category = Category.BashShellApp;
const OUTPUT_APPLICATION_CATEGORY : Category = Category.Docker;
const INPUT_APPLICATION_NAME : string = "Input App";
const OUTPUT_APPLICATION_NAME : string = "Output App";
const INPUT_APPLICATION_KEY : number = -2;
const OUTPUT_APPLICATION_KEY : number = -4;
const INPUT_APPLICATION_DESCRIPTION : string = "Input App Description";
const OUTPUT_APPLICATION_DESCRIPTION : string = "Output App Description";

const EXPANDED : boolean = true;

const INPUT_PORT_ID : string = "input_port";
const INPUT_PORT_NAME : string = "Input Port";
const INPUT_PORT_TYPE : string = "Number";
const INPUT_PORT_DESCRIPTION : string = "Input Description";
const OUTPUT_PORT_ID : string = "output_port";
const OUTPUT_PORT_NAME : string = "Output Port";
const OUTPUT_PORT_TYPE : string = "Boolean";
const OUTPUT_PORT_DESCRIPTION : string = "Out Description";

const FIELD : Field = new Field(Utils.uuidv4(), "Field Display Text", "Field Value", "Field Default Value", "Field Desc", true, Daliuge.DataType.String, false, [], false);
const INPUT_APP_FIELD : Field = new Field(Utils.uuidv4(), "Input App Field Display Text", "Input App Field Value", "Input App Field Default Value", "Input App Field Desc", false, Daliuge.DataType.Integer, false, [], false);
const OUTPUT_APP_FIELD : Field = new Field(Utils.uuidv4(), "Output App Field Display Text", "Output App Field Value", "Output App Field Default Value", "Output App Field Desc", false, Daliuge.DataType.Boolean, false, [], false);

// create table to contain results
let table : any[] = [];

// create a node
const primaryNode : Node = new Node(KEY, NAME, DESCRIPTION, CATEGORY);

// set values for node
primaryNode.setPosition(X, Y);
primaryNode.setWidth(WIDTH);
primaryNode.setHeight(HEIGHT);
primaryNode.setSubjectKey(SUBJECT_KEY);
primaryNode.setColor(COLOR);
primaryNode.setDrawOrderHint(DRAW_ORDER_HINT);
primaryNode.setParentKey(PARENT_KEY);
primaryNode.setCollapsed(COLLAPSED);
primaryNode.setExpanded(EXPANDED);

// input app
const inputApplication = Node.createEmbeddedApplicationNode(INPUT_APPLICATION_KEY, INPUT_APPLICATION_NAME, INPUT_APPLICATION_CATEGORY, INPUT_APPLICATION_DESCRIPTION, primaryNode.getKey());
inputApplication.addField(INPUT_APP_FIELD.clone());
inputApplication.addPort(new Port(INPUT_PORT_ID, INPUT_PORT_NAME, INPUT_PORT_NAME, true, INPUT_PORT_TYPE, INPUT_PORT_DESCRIPTION), true);

// output app
const outputApplication = Node.createEmbeddedApplicationNode(OUTPUT_APPLICATION_KEY, OUTPUT_APPLICATION_NAME, OUTPUT_APPLICATION_CATEGORY, OUTPUT_APPLICATION_DESCRIPTION, primaryNode.getKey());
outputApplication.addField(OUTPUT_APP_FIELD.clone());
outputApplication.addPort(new Port(OUTPUT_PORT_ID, OUTPUT_PORT_NAME, OUTPUT_PORT_NAME, false, OUTPUT_PORT_TYPE, OUTPUT_PORT_DESCRIPTION), false);

primaryNode.setInputApplication(inputApplication);
primaryNode.setOutputApplication(outputApplication);

primaryNode.addField(FIELD.clone());

console.log("Test toOJSJson/fromOJSJson");
// write node to JSON
const json : object = Node.toOJSGraphJson(primaryNode);
console.log(json);

// read the node back from JSON
const errorsWarnings: Errors.ErrorsWarnings = {errors: [], warnings: []};
const secondaryNode : Node = Node.fromOJSJson(json, errorsWarnings, function(){return -1;});

console.log("secondaryNode has:");
console.log("inputPorts", secondaryNode.getInputPorts().length);
console.log("outputPorts", secondaryNode.getOutputPorts().length);
console.log("fields", secondaryNode.getFields().length);
console.log("inputApp inputPorts", secondaryNode.getInputApplication()?.getInputPorts().length);
console.log("inputApp outputPorts", secondaryNode.getInputApplication()?.getOutputPorts().length);
console.log("inputApp fields", secondaryNode.getInputApplication()?.getFields().length);
console.log("outputApp inputPorts", secondaryNode.getOutputApplication()?.getInputPorts().length);
console.log("outputApp outputPorts", secondaryNode.getOutputApplication()?.getOutputPorts().length);
console.log("outputApp fields", secondaryNode.getOutputApplication()?.getFields().length);

checkNode(primaryNode, secondaryNode, true);

console.log("Test clone");
const clonedNode : Node = primaryNode.clone();
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
    checkNumber("X", n0.getPosition().x, n1.getPosition().x, X);
    checkNumber("Y", n0.getPosition().y, n1.getPosition().y, Y);

    checkNumber("Subject Id", n0.getSubjectId(), n1.getSubjectId(), SUBJECT_KEY);
    checkNumber("Width", n0.getWidth(), n1.getWidth(), WIDTH);
    checkNumber("Height", n0.getHeight(), n1.getHeight(), HEIGHT);
    checkString("Color", n0.getColor(), n1.getColor(), COLOR);
    checkNumber("Draw Order Hint", n0.getDrawOrderHint(), n1.getDrawOrderHint(), DRAW_ORDER_HINT);
    checkNumber("Parent Key", n0.getParentKey(), n1.getParentKey(), PARENT_KEY);
    checkBoolean("Collapsed", n0.isCollapsed(), n1.isCollapsed(), COLLAPSED);
    checkBoolean("Streaming", n0.isStreaming(), n1.isStreaming(), STREAMING);
    checkBoolean("Expanded", n0.getExpanded(), n1.getExpanded(), EXPANDED);

    checkString("Input Application Type",  n0.getInputApplication().getCategory(),  n1.getInputApplication().getCategory(),  INPUT_APPLICATION_CATEGORY );
    checkString("Output Application Type", n0.getOutputApplication().getCategory(), n1.getOutputApplication().getCategory(), OUTPUT_APPLICATION_CATEGORY  );
    checkString("Input Application Name",  n0.getInputApplication().getName(),      n1.getInputApplication().getName(),      INPUT_APPLICATION_NAME);
    checkString("Output Application Name", n0.getOutputApplication().getName(),     n1.getOutputApplication().getName(),     OUTPUT_APPLICATION_NAME);

    // ports
    checkString("Input Port Id",    n0.getInputApplication().getInputPorts()[0].getId(), n1.getInputApplication().getInputPorts()[0].getId(), INPUT_PORT_ID);
    checkString("Input Port Display Text",  n0.getInputApplication().getInputPorts()[0].getDisplayText(), n1.getInputApplication().getInputPorts()[0].getDisplayText(), INPUT_PORT_NAME);
    checkString("output Port Id",     n0.getOutputApplication().getOutputPorts()[0].getId(), n1.getOutputApplication().getOutputPorts()[0].getId(), OUTPUT_PORT_ID);
    checkString("output Port Display Text",   n0.getOutputApplication().getOutputPorts()[0].getDisplayText(), n1.getOutputApplication().getOutputPorts()[0].getDisplayText(), OUTPUT_PORT_NAME);

    // fields
    checkString("Field Display Text", n0.getFields()[0].getDisplayText(), n1.getFields()[0].getDisplayText(), FIELD.getDisplayText());
    checkString("Field Value", n0.getFields()[0].getValue(), n1.getFields()[0].getValue(), FIELD.getValue());
    checkString("Field Description", n0.getFields()[0].getDescription(), n1.getFields()[0].getDescription(), FIELD.getDescription());

    // app fields
    checkString("Input App Field Display Text",        n0.getInputApplication().getFields()[0].getDisplayText(),        n1.getInputApplication().getFields()[0].getDisplayText(),        INPUT_APP_FIELD.getDisplayText());
    checkString("Input App Field Value",       n0.getInputApplication().getFields()[0].getValue(),       n1.getInputApplication().getFields()[0].getValue(),       INPUT_APP_FIELD.getValue());
    checkString("Input App Field Description", n0.getInputApplication().getFields()[0].getDescription(), n1.getInputApplication().getFields()[0].getDescription(), INPUT_APP_FIELD.getDescription());
    // TODO: readonly, type

    checkString("output App Field Display Text",        n0.getOutputApplication().getFields()[0].getDisplayText(),        n1.getOutputApplication().getFields()[0].getDisplayText(),        OUTPUT_APP_FIELD.getDisplayText());
    checkString("output App Field Value",       n0.getOutputApplication().getFields()[0].getValue(),       n1.getOutputApplication().getFields()[0].getValue(),       OUTPUT_APP_FIELD.getValue());
    checkString("output App Field Description", n0.getOutputApplication().getFields()[0].getDescription(), n1.getOutputApplication().getFields()[0].getDescription(), OUTPUT_APP_FIELD.getDescription());
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
