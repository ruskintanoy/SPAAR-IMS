let initialAssetCode = null;
let initialCategory = null;
let isManualAssetCode = false; // Declare globally

function onLoadAssetForm(executionContext) {
    console.log("onLoadAssetForm function called");

    var formContext = executionContext.getFormContext();
    var assetCodeAttribute = formContext.getAttribute("cr4d3_assetcode");
    var categoryNameAttribute = formContext.getAttribute("cr4d3_category");

    // Capture initial Asset Code and Category ID
    if (assetCodeAttribute && categoryNameAttribute) {
        initialAssetCode = assetCodeAttribute.getValue();
        var categoryValue = categoryNameAttribute.getValue();
        if (categoryValue && categoryValue.length > 0) {
            initialCategory = categoryValue[0].id.replace("{", "").replace("}", "");
        }

        console.log("Initial asset code:", initialAssetCode);
        console.log("Initial category:", initialCategory);

        // Attach event handler for manual entry detection
        assetCodeAttribute.addOnChange(onAssetCodeChange);
    }

    // Call the function to manage the Previous fields logic on load
    managePreviousFields(formContext);  // Now handles multiple "Previous" fields

    // Set placeholder for Device Identifier
    setDeviceIdentifierPlaceholder(executionContext); // Call placeholder function on load

    // Attach event handler for when the Category changes
    formContext.getAttribute("cr4d3_category").addOnChange(setDeviceIdentifierPlaceholder);
}

function onSaveAssetForm(executionContext) {
    console.log("onSaveAssetForm function called");

    var formContext = executionContext.getFormContext();
    
    // Validate that Assigned To is not empty when Status is "Assigned"
    if (!validateAssignedTo(formContext)) {
        // Prevent the form from saving if validation fails
        executionContext.getEventArgs().preventDefault();
        return;
    }

    // Handle Inventory Update based on Device Status changes
    updateInventoryOnStatusChange(formContext).then(
        function() {
            console.log("Inventory updated successfully");
        },
        function(error) {
            console.error("Error updating inventory:", error);
            // Optionally prevent save if inventory update fails
            executionContext.getEventArgs().preventDefault();
        }
    );

    // Proceed with saving the form
    var assetCode = formContext.getAttribute("cr4d3_assetcode").getValue();
    var categoryNameAttribute = formContext.getAttribute("cr4d3_category");
    var categoryValue = categoryNameAttribute.getValue();
    var categoryId = categoryValue[0].id.replace("{", "").replace("}", "");

    // Check if the client is Web (Desktop)
    var clientType = Xrm.Utility.getGlobalContext().client.getClient();

    if (!isManualAssetCode) {
        if (categoryId === initialCategory && assetCode !== initialAssetCode) {
            formContext.getAttribute("cr4d3_assetcode").setValue(initialAssetCode);
            console.log("Asset code restored to initial value during save:", initialAssetCode);
        } else if (!assetCode) {
            generateAssetCode(formContext).then(
                function() {
                    console.log("Asset code generated during save");
                    if (clientType === "Web") {
                        printAssetCode(formContext);
                    }
                },
                function(error) {
                    console.error("Error during asset code generation during save:", error);
                }
            );
        } else if (assetCode !== initialAssetCode) {
            console.log("Asset code changed during save");
            if (clientType === "Web") {
                printAssetCode(formContext);
            }
        }
    } else {
        console.log("Manual asset code entry detected during save. Skipping auto-generation.");
        isManualAssetCode = false;
    }
}

// Validation function to ensure Assigned To is set when Device Status is "Assigned"
function validateAssignedTo(formContext) {
    var statusAttribute = formContext.getAttribute("cr4d3_status");
    var assignedToAttribute = formContext.getAttribute("new_assignedto");

    // Get the current values
    var statusValue = statusAttribute.getValue();
    var assignedToValue = assignedToAttribute.getValue();

    // Check if the status is "Assigned"
    if (statusValue && statusValue[0].name === "Assigned") {
        // If "Assigned", make sure Assigned To is not empty
        if (!assignedToValue) {
            // Show an error notification
            formContext.ui.setFormNotification("The 'Assigned To' field cannot be empty when 'Device Status' is set to 'Assigned'. Please provide a valid assignee.", "ERROR", "assignedToError");

            console.error("Assigned To is empty while Device Status is 'Assigned'.");
            return false; // Validation failed
        } else {
            // Clear the notification if it was previously set
            formContext.ui.clearFormNotification("assignedToError");
        }
    }

    return true; // Validation passed
}

function onAssetCodeChange(executionContext) {
    console.log("onAssetCodeChange function called");

    var formContext = executionContext.getFormContext();
    var assetCode = formContext.getAttribute("cr4d3_assetcode").getValue();

    if (assetCode && assetCode !== initialAssetCode) {
        isManualAssetCode = true;
        console.log("Manual asset code entry detected:", assetCode);
    }
}

// Function to set the Device Identifier field's placeholder based on the Category
function setDeviceIdentifierPlaceholder(executionContext) {
    var formContext = executionContext.getFormContext();

    // Get the Category field and its value
    var categoryLookup = formContext.getAttribute("cr4d3_category").getValue();

    if (!categoryLookup || categoryLookup.length === 0) {
        // If no category is selected, do nothing
        return;
    }

    // Retrieve the category ID
    var categoryId = categoryLookup[0].id.replace("{", "").replace("}", "").toLowerCase();

    // Get the Device Identifier (previously IMEI) field (logical name is cr4d3_serialnumber)
    var deviceIdentifierControl = formContext.getControl("cr4d3_serialnumber");
    var deviceIdentifierAttribute = formContext.getAttribute("cr4d3_serialnumber"); // Get the attribute for setting required level

    // Phone and Phone Numbers category GUIDs
    var phonesCategoryId = "efe77273-eca2-451e-b97a-10f2428c6109";  // GUID for Phones category
    var phoneNumbersCategoryId = "aab542c8-004a-ef11-a317-000d3a989566";  // GUID for Phone Numbers category

    // Clear any previous notifications
    deviceIdentifierControl.clearNotification();

    // Set placeholder and behavior based on category
    if (categoryId === phonesCategoryId) {
        deviceIdentifierControl.setLabel("Device Identifier");  // Change label to "Device Identifier"
        deviceIdentifierControl.setVisible(true);  // Make sure the field is visible
        deviceIdentifierControl.setDisabled(false); // Enable the field
        //deviceIdentifierAttribute.setRequiredLevel("required"); // Make field required
        deviceIdentifierControl.setNotification("Enter IMEI", "placeholder");
    } else if (categoryId === phoneNumbersCategoryId) {
        // Disable and hide the field for "Phone Numbers" category
        deviceIdentifierControl.setDisabled(true);  // Disable the field
        deviceIdentifierControl.setVisible(false);  // Optionally hide the field
        //deviceIdentifierAttribute.setRequiredLevel("none"); // Make field not required
        deviceIdentifierControl.clearNotification(); // Clear any placeholder
    } else {
        // For other categories, use Serial Number
        deviceIdentifierControl.setLabel("Device Identifier");
        deviceIdentifierControl.setVisible(true);  // Make sure the field is visible
        deviceIdentifierControl.setDisabled(false); // Enable the field
        //deviceIdentifierAttribute.setRequiredLevel("required"); // Make field required
        deviceIdentifierControl.setNotification("Enter Serial Number", "placeholder");
    }
}

