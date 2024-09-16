// AssetOnSave.js

function onSaveAssetForm(executionContext) {
    console.log("Saving asset form...");

    var formContext = executionContext.getFormContext();
    var assetId = formContext.data.entity.getId(); // Get the record ID
    var modelLookup = formContext.getAttribute("cr4d3_model").getValue(); // Get the related model
    var assignedToValue = formContext.getAttribute("new_assignedto").getValue(); // Get "Assigned To" field
    var newStatus = formContext.getAttribute("cr4d3_status").getValue(); // Get the current status

    if (!modelLookup || modelLookup.length === 0) {
        console.error("No model selected. Cannot update inventory.");
        return;
    }

    var modelId = modelLookup[0].id.replace("{", "").replace("}", ""); // Get model GUID
    var newStatusName = newStatus ? newStatus[0].name : null; // Current device status

    // Validation: Prevent save if status is "Assigned" and "Assigned To" is null
    if (newStatusName === "Assigned" && !assignedToValue) {
        var alertStrings = { 
            confirmButtonLabel: "OK", 
            title: "⚠️ User Assignment Required", 
            text: "The 'Assigned To' field cannot be left blank when the device status is 'Assigned'. Please assign this device to a user before saving." 
        };

        var alertOptions = {
            height: 240,
            width: 180
        };

        Xrm.Navigation.openAlertDialog(alertStrings, alertOptions).then(function success() {
            console.log("Alert shown: 'Assigned To' is required.");
        });

        // Prevent save
        executionContext.getEventArgs().preventDefault();
        return;
    }

    var initialStatus = formContext.getAttribute("new_previousstatus").getValue(); // Previous status as string

    // Handle the first-time creation and populate previous fields on first save
    if (!assetId) {
        console.log("New asset being created, populating previous fields on first save.");

        formContext.getAttribute("new_previouscategory").setValue(formContext.getAttribute("cr4d3_category").getValue()[0].name);
        formContext.getAttribute("new_previousmodel").setValue(formContext.getAttribute("cr4d3_model").getValue()[0].name);
        formContext.getAttribute("new_previoususer").setValue(assignedToValue ? assignedToValue[0].name : null);
        formContext.getAttribute("new_previousstatus").setValue(newStatusName);

        console.log("Previous fields populated on new asset creation.");
    }

    // Perform inventory updates based on status changes
    if (initialStatus !== newStatusName) {
        updateInventoryBasedOnStatusChange(modelId, initialStatus, newStatusName);
        // Update the previous status to match the new status after the save
        formContext.getAttribute("new_previousstatus").setValue(newStatusName);
    } else {
        console.log("Status hasn't changed. No inventory update needed.");
    }

    // Continue with form saving process
    var alertOptions = {
        height: 240,
        width: 180
    };

    var successMessage = assetId 
        ? { title: "✅ Asset Updated", text: "Asset updated successfully.\nThe asset record has been modified and saved." }
        : { title: "✅ Asset Created", text: "New asset created.\nThe asset record has been added to the system." };

    var alertStrings = { confirmButtonLabel: "OK", title: successMessage.title, text: successMessage.text };

    Xrm.Navigation.openAlertDialog(alertStrings, alertOptions).then(
        function success() {
            console.log("Dialog closed.");
        },
        function error() {
            console.error("Error closing dialog.");
        }
    );
}

// Function to update inventory based on status changes
function updateInventoryBasedOnStatusChange(modelId, initialStatus, newStatus) {
    console.log(`Initial Status: ${initialStatus}, New Status: ${newStatus}`);

    // Fetch the model record to get current inventory and units available
    Xrm.WebApi.retrieveRecord("cr4d3_model", modelId, "?$select=cr4d3_inventoryquantity,new_available").then(
        function success(result) {
            var totalInventory = result.cr4d3_inventoryquantity || 0;
            var unitsAvailable = result.new_available || 0;

            if (initialStatus === "Assigned" && newStatus === "Stored") {
                unitsAvailable += 1;
            } else if (initialStatus === "Assigned" && newStatus === "Retired") {
                totalInventory -= 1;
            } else if (initialStatus === "Stored" && newStatus === "Assigned") {
                unitsAvailable -= 1;
            } else if (initialStatus === "Stored" && newStatus === "Retired") {
                unitsAvailable -= 1;
                totalInventory -= 1;
            } else if (initialStatus === "Retired" && newStatus === "Assigned") {
                totalInventory += 1;
            } else if (initialStatus === "Retired" && newStatus === "Stored") {
                totalInventory += 1;
                unitsAvailable += 1;
            } else if (!initialStatus && newStatus === "Stored") {
                totalInventory += 1;
                unitsAvailable += 1;
            } else if (!initialStatus && newStatus === "Assigned") {
                totalInventory += 1;
            }

            var updateData = {
                cr4d3_inventoryquantity: totalInventory,
                new_available: unitsAvailable
            };

            Xrm.WebApi.updateRecord("cr4d3_model", modelId, updateData).then(
                function success() {
                    console.log("Model inventory updated successfully.");
                },
                function error(error) {
                    console.error("Error updating model inventory:", error.message);
                }
            );
        },
        function error(error) {
            console.error("Error retrieving model record:", error.message);
        }
    );
}
