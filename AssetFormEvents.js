// AssetFormEvents.js

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

// Function to update inventory based on Device Status changes
function updateInventoryOnStatusChange(formContext) {
    return new Promise(function(resolve, reject) {
        console.log("updateInventoryOnStatusChange function called");

        var currentStatusLookup = formContext.getAttribute("cr4d3_status").getValue();
        var previousStatus = formContext.getAttribute("new_previousstatus").getValue();
        var modelLookup = formContext.getAttribute("cr4d3_model").getValue();

        // Ensure the status and model fields have values
        if (!currentStatusLookup || !modelLookup) {
            return resolve(); // No status or model set, no update necessary
        }

        var currentStatusId = currentStatusLookup[0].id.replace("{", "").replace("}", "").toLowerCase();
        var modelId = modelLookup[0].id.replace("{", "").replace("}", "").toLowerCase();

        // Map of status GUIDs
        var statusAssigned = "1de317bd-9a42-4733-b4a0-946b364a5f41";
        var statusStored = "c4b1d5f6-3186-4741-ad01-cc4006a17e3a";
        var statusRetired = "61b39594-75ea-4342-b3ea-5ca29669fcda";

        // Determine if inventory needs to be updated based on status change
        var inventoryAdjustment = 0;
        var availableAdjustment = 0;

        // Handling existing asset updates
        if (previousStatus) {
            if (currentStatusId === statusAssigned) {
                if (previousStatus === statusStored) {
                    availableAdjustment = -1; // S to A
                } else if (previousStatus === statusRetired) {
                    inventoryAdjustment = 1; // R to A
                }
            } else if (currentStatusId === statusStored) {
                if (previousStatus === statusAssigned) {
                    availableAdjustment = 1; // A to S
                } else if (previousStatus === statusRetired) {
                    inventoryAdjustment = 1; // R to S
                    availableAdjustment = 1;
                }
            } else if (currentStatusId === statusRetired) {
                if (previousStatus === statusAssigned) {
                    inventoryAdjustment = -1; // A to R
                } else if (previousStatus === statusStored) {
                    inventoryAdjustment = -1; // S to R
                    availableAdjustment = -1;
                }
            }
        } else {
            // Handling asset creation
            if (currentStatusId === statusStored) { // C to S
                inventoryAdjustment = 1;
                availableAdjustment = 1;
            } else if (currentStatusId === statusAssigned) { // C to A
                inventoryAdjustment = 1;
            }
        }

        if (inventoryAdjustment !== 0 || availableAdjustment !== 0) {
            // Retrieve the current inventory for the model
            Xrm.WebApi.retrieveRecord("cr4d3_model", modelId, "?$select=cr4d3_inventoryquantity,new_available").then(
                function success(result) {
                    var currentInventory = result.cr4d3_inventoryquantity || 0;
                    var currentAvailable = result.new_available || 0;

                    // Calculate new inventory values
                    var newInventory = currentInventory + inventoryAdjustment;
                    var newAvailable = currentAvailable + availableAdjustment;

                    // Update the model record with new inventory values
                    var updateData = {
                        "cr4d3_inventoryquantity": newInventory,
                        "new_available": newAvailable
                    };

                    Xrm.WebApi.updateRecord("cr4d3_model", modelId, updateData).then(
                        function success() {
                            console.log("Inventory updated: New Inventory:", newInventory, "New Available:", newAvailable);
                            resolve();
                        },
                        function error(error) {
                            console.error("Error updating inventory:", error.message);
                            reject(error);
                        }
                    );
                },
                function error(error) {
                    console.error("Error retrieving model inventory:", error.message);
                    reject(error);
                }
            );
        } else {
            resolve(); // No inventory adjustment needed
        }
    });
}




// Extended function to manage Previous Status, Model, Category, and User fields
function managePreviousFields(formContext) {
    console.log("managePreviousFields function called");

    // Handle Previous Status
    var currentStatusLookup = formContext.getAttribute("cr4d3_status").getValue();
    var currentStatus = currentStatusLookup ? currentStatusLookup[0].id.replace("{", "").replace("}", "").toLowerCase() : "";
    var previousStatus = formContext.getAttribute("new_previousstatus").getValue();

    if (!previousStatus || previousStatus !== currentStatus) {
        formContext.getAttribute("new_previousstatus").setValue(currentStatus);
        console.log("Previous status updated to:", currentStatus);
    }

    // Handle Previous Model
    var currentModelLookup = formContext.getAttribute("cr4d3_model").getValue();
    var currentModel = currentModelLookup ? currentModelLookup[0].id.replace("{", "").replace("}", "").toLowerCase() : "";
    var previousModel = formContext.getAttribute("new_previousmodel").getValue();

    if (!previousModel || previousModel !== currentModel) {
        formContext.getAttribute("new_previousmodel").setValue(currentModel);
        console.log("Previous model updated to:", currentModel);
    }

    // Handle Previous Category
    var currentCategoryLookup = formContext.getAttribute("cr4d3_category").getValue();
    var currentCategory = currentCategoryLookup ? currentCategoryLookup[0].id.replace("{", "").replace("}", "").toLowerCase() : "";
    var previousCategory = formContext.getAttribute("new_previouscategory").getValue();

    if (!previousCategory || previousCategory !== currentCategory) {
        formContext.getAttribute("new_previouscategory").setValue(currentCategory);
        console.log("Previous category updated to:", currentCategory);
    }

    // Handle Previous User
    var currentUserLookup = formContext.getAttribute("new_assignedto").getValue();
    var currentUser = currentUserLookup ? currentUserLookup[0].id.replace("{", "").replace("}", "").toLowerCase() : "";
    var previousUser = formContext.getAttribute("new_previoususer").getValue();

    if (!previousUser || previousUser !== currentUser) {
        formContext.getAttribute("new_previoususer").setValue(currentUser);
        console.log("Previous user updated to:", currentUser);
    }
}
