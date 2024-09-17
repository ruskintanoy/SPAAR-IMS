// AssetOnLoad.js

let initialAssetCode = null;
let initialCategory = null;
let initialCategoryName = null;
let initialModelName = null;
let initialAssignedTo = null;
let initialStatusName = null; // For logs

function onLoadAssetForm(executionContext) {
    console.log("Asset form loaded.");

    var formContext = executionContext.getFormContext();
    
    // Check if the record is new or existing
    var assetId = formContext.data.entity.getId();
    if (!assetId) {
        console.log("New asset record, no need to populate previous values.");
        return; // Do nothing for new records
    }

    // Capture initial Asset Code, Category, Model, AssignedTo, and Status
    captureInitialValues(formContext);
}

// Function to capture initial values
function captureInitialValues(formContext) {
    // Asset Code
    initialAssetCode = formContext.getAttribute("cr4d3_assetcode").getValue();

    // Category
    var categoryValue = formContext.getAttribute("cr4d3_category").getValue();
    if (categoryValue && categoryValue.length > 0) {
        initialCategory = categoryValue[0].id.replace("{", "").replace("}", "");
        initialCategoryName = categoryValue[0].name;
        console.log(`Initial Category: ${initialCategoryName}`);
    }

    // Model
    var modelValue = formContext.getAttribute("cr4d3_model").getValue();
    if (modelValue && modelValue.length > 0) {
        initialModelName = modelValue[0].name;
        console.log(`Initial Model: ${initialModelName}`);
    }

    // Assigned To
    var assignedToValue = formContext.getAttribute("new_assignedto").getValue();
    if (assignedToValue && assignedToValue.length > 0) {
        initialAssignedTo = assignedToValue[0].name;
        console.log(`Initial Assigned To: ${initialAssignedTo}`);
    }

    // Status
    var statusValue = formContext.getAttribute("cr4d3_status").getValue();
    if (statusValue && statusValue.length > 0) {
        initialStatusName = statusValue[0].name;
        console.log(`Initial Status: ${initialStatusName}`);
    }
}
