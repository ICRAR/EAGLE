import {Eagle} from '../src/Eagle';
import {Node} from '../src/Node';
import {Port} from '../src/Port';
import {Field} from '../src/Field';

const KEY : number = -9;
const NAME : string = "Test Node";
const DESCRIPTION : string = "Test description";
const CATEGORY : Eagle.Category = Eagle.Category.Description;
const CATEGORY_TYPE : Eagle.CategoryType = Eagle.CategoryType.Other;
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
const IS_DATA : boolean = true;
const IS_GROUP : boolean = true;
const CAN_HAVE_INPUTS : boolean = true;
const CAN_HAVE_OUTPUTS : boolean = true;
const SELECTED : boolean = true;
const INPUT_APPLICATION_TYPE : Eagle.Category = Eagle.Category.BashShellApp;
const OUTPUT_APPLICATION_TYPE : Eagle.Category = Eagle.Category.DynlibApp;
const EXIT_APPLICATION_TYPE : Eagle.Category = Eagle.Category.Docker;
const INPUT_APPLICATION_NAME : string = "Input App";
const OUTPUT_APPLICATION_NAME : string = "Output App";
const EXIT_APPLICATION_NAME : string = "Exit App";
const EXPANDED : boolean = true;

const INPUT_LOCAL_PORT_ID : string = "input_local_port";
const INPUT_LOCAL_PORT_NAME : string = "Input Local Port";
const OUTPUT_LOCAL_PORT_ID : string = "output_local_port";
const OUTPUT_LOCAL_PORT_NAME : string = "Output Local Port";
const INPUT_PORT_ID : string = "input_port";
const INPUT_PORT_NAME : string = "Input Port";
const OUTPUT_PORT_ID : string = "output_port";
const OUTPUT_PORT_NAME : string = "Output Port";

const FIELD : Field = new Field("Field Text", "Field Name", "Field Value", "Field Desc");
const INPUT_APP_FIELD : Field = new Field("Input App Field Text", "Input App Field Name", "Input App Field Value", "Input App Field Desc");
const OUTPUT_APP_FIELD : Field = new Field("Output App Field Text", "Output App Field Name", "Output App Field Value", "Output App Field Desc");

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
primaryNode.setIsData(IS_DATA);
primaryNode.setIsGroup(IS_GROUP);
primaryNode.setCanHaveInputs(CAN_HAVE_INPUTS);
primaryNode.setCanHaveOutputs(CAN_HAVE_OUTPUTS);
primaryNode.setSelected(SELECTED);
primaryNode.setInputApplicationType(INPUT_APPLICATION_TYPE);
primaryNode.setOutputApplicationType(OUTPUT_APPLICATION_TYPE);
primaryNode.setExitApplicationType(EXIT_APPLICATION_TYPE);
primaryNode.setInputApplicationName(INPUT_APPLICATION_NAME);
primaryNode.setOutputApplicationName(OUTPUT_APPLICATION_NAME);
primaryNode.setExitApplicationName(EXIT_APPLICATION_NAME);
primaryNode.setExpanded(EXPANDED);

primaryNode.addPort(new Port(OUTPUT_PORT_ID, OUTPUT_PORT_NAME), false, false);
primaryNode.addPort(new Port(OUTPUT_LOCAL_PORT_ID, OUTPUT_LOCAL_PORT_NAME), false, true);
primaryNode.addPort(new Port(INPUT_PORT_ID, INPUT_PORT_NAME), true, false);
primaryNode.addPort(new Port(INPUT_LOCAL_PORT_ID, INPUT_LOCAL_PORT_NAME), true, true);

primaryNode.addField(FIELD.clone());
primaryNode.addAppField(OUTPUT_APP_FIELD.clone(), false);
primaryNode.addAppField(INPUT_APP_FIELD.clone(), true);

console.log("Test toOJSJson/fromOJSJson");
// write node to JSON
var json : object = Node.toOJSJson(primaryNode);
//console.log(json);

// read the node back from JSON
var secondaryNode : Node = Node.fromOJSJson(json);
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
    checkBoolean("Is Data", n0.isData(), n1.isData(), IS_DATA);
    checkBoolean("Is Group", n0.isGroup(), n1.isGroup(), IS_GROUP);
    checkBoolean("Can Have Inputs", n0.canHaveInputs(), n1.canHaveInputs(), CAN_HAVE_INPUTS);
    checkBoolean("Can Have Outputs", n0.canHaveOutputs(), n1.canHaveOutputs(), CAN_HAVE_OUTPUTS);
    checkBoolean("Selected", n0.getSelected(), n1.getSelected(), SELECTED);
    checkString("Input Application Type", n0.getInputApplicationType(), n1.getInputApplicationType(), INPUT_APPLICATION_TYPE);
    checkString("Output Application Type", n0.getOutputApplicationType(), n1.getOutputApplicationType(), OUTPUT_APPLICATION_TYPE);
    checkString("Exit Application Type", n0.getExitApplicationType(), n1.getExitApplicationType(), EXIT_APPLICATION_TYPE);
    checkString("Input Application Name", n0.getInputApplicationName(), n1.getInputApplicationName(), INPUT_APPLICATION_NAME);
    checkString("Output Application Name", n0.getOutputApplicationName(), n1.getOutputApplicationName(), OUTPUT_APPLICATION_NAME);
    checkString("Exit Application Name", n0.getExitApplicationName(), n1.getExitApplicationName(), EXIT_APPLICATION_NAME);
    checkBoolean("Expanded", n0.getExpanded(), n1.getExpanded(), EXPANDED);

    // ports
    checkString("Output Port Id", n0.getOutputPorts()[0].getId(), n1.getOutputPorts()[0].getId(), OUTPUT_PORT_ID);
    checkString("Output Port Name", n0.getOutputPorts()[0].getName(), n1.getOutputPorts()[0].getName(), OUTPUT_PORT_NAME);
    checkString("Output Local Port Id", n0.getOutputLocalPorts()[0].getId(), n1.getOutputLocalPorts()[0].getId(), OUTPUT_LOCAL_PORT_ID);
    checkString("Output Local Port Name", n0.getOutputLocalPorts()[0].getName(), n1.getOutputLocalPorts()[0].getName(), OUTPUT_LOCAL_PORT_NAME);
    checkString("Input Port Id", n0.getInputPorts()[0].getId(), n1.getInputPorts()[0].getId(), INPUT_PORT_ID);
    checkString("Input Port Name", n0.getInputPorts()[0].getName(), n1.getInputPorts()[0].getName(), INPUT_PORT_NAME);
    checkString("Input Local Port Id", n0.getInputLocalPorts()[0].getId(), n1.getInputLocalPorts()[0].getId(), INPUT_LOCAL_PORT_ID);
    checkString("Input Local Port Name", n0.getInputLocalPorts()[0].getName(), n1.getInputLocalPorts()[0].getName(), INPUT_LOCAL_PORT_NAME);

    // fields
    checkString("Field Text", n0.getFields()[0].getText(), n1.getFields()[0].getText(), FIELD.getText());
    checkString("Field Name", n0.getFields()[0].getName(), n1.getFields()[0].getName(), FIELD.getName());
    checkString("Field Value", n0.getFields()[0].getValue(), n1.getFields()[0].getValue(), FIELD.getValue());
    checkString("Field Description", n0.getFields()[0].getDescription(), n1.getFields()[0].getDescription(), FIELD.getDescription());
    checkString("Input App Field Text", n0.getInputAppFields()[0].getText(), n1.getInputAppFields()[0].getText(), INPUT_APP_FIELD.getText());
    checkString("Input App Field Name", n0.getInputAppFields()[0].getName(), n1.getInputAppFields()[0].getName(), INPUT_APP_FIELD.getName());
    checkString("Input App Field Value", n0.getInputAppFields()[0].getValue(), n1.getInputAppFields()[0].getValue(), INPUT_APP_FIELD.getValue());
    checkString("Input App Field Description", n0.getInputAppFields()[0].getDescription(), n1.getInputAppFields()[0].getDescription(), INPUT_APP_FIELD.getDescription());
    checkString("Output App Field Text", n0.getOutputAppFields()[0].getText(), n1.getOutputAppFields()[0].getText(), OUTPUT_APP_FIELD.getText());
    checkString("Output App Field Name", n0.getOutputAppFields()[0].getName(), n1.getOutputAppFields()[0].getName(), OUTPUT_APP_FIELD.getName());
    checkString("Output App Field Value", n0.getOutputAppFields()[0].getValue(), n1.getOutputAppFields()[0].getValue(), OUTPUT_APP_FIELD.getValue());
    checkString("Output App Field Description", n0.getOutputAppFields()[0].getDescription(), n1.getOutputAppFields()[0].getDescription(), OUTPUT_APP_FIELD.getDescription());

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
