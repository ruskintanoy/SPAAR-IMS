function updateInventoryOnStatusChange(formContext) {
    return new Promise(function(resolve, reject) {
        console.log("updateInventoryOnStatusChange function called");

        var currentStatusLookup = formContext.getAttribute("cr4d3_status").getValue();
        var previousStatus = formContext.getAttribute("new_previousstatus").getValue();
        var modelLookup = formContext.getAttribute("cr4d3_model").getValue();

        // make sure the status and model fields have values
        if (!currentStatusLookup || !modelLookup) {
            return resolve(); // No status or model set, no update necessary
        }

        var currentStatusId = currentStatusLookup[0].id.replace("{", "").replace("}", "").toLowerCase();
        var modelId = modelLookup[0].id.replace("{", "").replace("}", "").toLowerCase();

        // status GUIDs
        var statusAssigned = "1de317bd-9a42-4733-b4a0-946b364a5f41";
        var statusStored = "c4b1d5f6-3186-4741-ad01-cc4006a17e3a";
        var statusRetired = "61b39594-75ea-4342-b3ea-5ca29669fcda";

        // Determine if inventory needs to be updated based on status change
        var inventoryAdjustment = 0;
        var availableAdjustment = 0;

        // for updating existing asset record
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
            // for asset record creation
            if (currentStatusId === statusStored) { // C to S
                inventoryAdjustment = 1;
                availableAdjustment = 1;
            } else if (currentStatusId === statusAssigned) { // C to A
                inventoryAdjustment = 1;
            }
        }

        if (inventoryAdjustment !== 0 || availableAdjustment !== 0) {
            // Retrieve the current inventory 
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

