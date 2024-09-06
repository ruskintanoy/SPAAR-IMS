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
