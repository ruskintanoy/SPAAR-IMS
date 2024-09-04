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

function checkInventoryQuantity(executionContext) {
    var formContext = executionContext.getFormContext();
    var availableField = formContext.getAttribute("new_available"); // Use the logical name for the available field
    var modelNameField = formContext.getAttribute("cr4d3_modelname"); // Replace with your actual model name field logical name

    if (modelNameField) {
        var modelName = modelNameField.getValue();

        // Only proceed if the model name is not null, undefined, or an empty string
        if (modelName !== null && modelName !== undefined && modelName.trim() !== "") {
            if (availableField) {
                var availableQuantity = availableField.getValue();
                var iframeControl = formContext.getControl("WebResource_WarningMessage"); // Use the name of the HTML web resource control

                if (iframeControl) {
                    iframeControl.getContentWindow().then(function(contentWindow) {
                        var warningDiv = contentWindow.document.getElementById("warning-message");

                        if (warningDiv) {
                            // Display the warning only if availableQuantity is less than 2
                            if (availableQuantity < 2) {
                                warningDiv.style.display = "block";
                            } else {
                                warningDiv.style.display = "none";
                            }
                        } else {
                            console.log("Warning message element not found.");
                        }
                    }).catch(function(error) {
                        console.log("Error accessing web resource content: " + error.message);
                    });
                } else {
                    console.log("Web Resource control not found.");
                }
            } else {
                console.log("Available field not found.");
            }
        }
    } else {
        console.log("Model Name field not found.");
    }
}
