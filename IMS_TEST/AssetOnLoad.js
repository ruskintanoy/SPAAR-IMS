// AssetOnLoad.js

let initialAssetCode = null;
let initialCategory = null;
let initialCategoryName = null;
let initialModelName = null;
let initialAssignedTo = null;
let initialStatusName = null;
let initialDeviceIdentifier = null;

function onLoadAssetForm(executionContext) {
  console.log("[INFO] Asset form loaded.");

  var formContext = executionContext.getFormContext();

  captureInitialValues(formContext);
  handleStatusVisibilityOnLoad(formContext);
}

function captureInitialValues(formContext) {
  console.log("[INFO] Capturing initial form values.");

  initialAssetCode = formContext.getAttribute("cr4d3_assetcode").getValue();
  var categoryValue = formContext.getAttribute("cr4d3_category").getValue();
  if (categoryValue && categoryValue.length > 0) {
    initialCategory = categoryValue[0].id.replace("{", "").replace("}", "");
    initialCategoryName = categoryValue[0].name;
    console.log(`[INFO] Initial Category: ${initialCategoryName}`);
  }

  var modelValue = formContext.getAttribute("cr4d3_model").getValue();
  if (modelValue && modelValue.length > 0) {
    initialModelName = modelValue[0].name;
    console.log(`[INFO] Initial Model: ${initialModelName}`);
  }

  var assignedToValue = formContext.getAttribute("new_assignedto").getValue();
  if (assignedToValue && assignedToValue.length > 0) {
    initialAssignedTo = assignedToValue[0].name;
    console.log(`[INFO] Initial Assigned To: ${initialAssignedTo}`);
  }

  var statusValue = formContext.getAttribute("cr4d3_status").getValue();
  if (statusValue && statusValue.length > 0) {
    initialStatusName = statusValue[0].name;
    console.log(`[INFO] Initial Status: ${initialStatusName}`);
  }

  initialDeviceIdentifier = formContext.getAttribute("cr4d3_serialnumber").getValue();
  console.log(`[INFO] Initial Device Identifier: ${initialDeviceIdentifier}`);
}

// Function to handle visibility of fields based on status during form load
function handleStatusVisibilityOnLoad(formContext) {
  var statusAttribute = formContext.getAttribute("cr4d3_status");
  var assignedToControl = formContext.getControl("header_new_assignedto");
  var assignedDateControl = formContext.getControl("header_cr4d3_assigneddate");

  if (statusAttribute && statusAttribute.getValue()) {
    var statusValue = statusAttribute.getValue()[0].name;

    if (statusValue === "Assigned") {
      if (assignedToControl) assignedToControl.setVisible(true);
      if (assignedDateControl) assignedDateControl.setVisible(true);
      console.log(
        "[INFO] 'Assigned' status detected on load. Assigned To and Assigned Date fields are visible."
      );
    } else {
      if (assignedToControl) assignedToControl.setVisible(false);
      if (assignedDateControl) assignedDateControl.setVisible(false);
      console.log(
        `[INFO] '${statusValue}' status detected on load. Assigned To and Assigned Date fields are hidden.`
      );
    }
  } else {
    console.error("[ERROR] Status value not found during form load.");
  }
}
