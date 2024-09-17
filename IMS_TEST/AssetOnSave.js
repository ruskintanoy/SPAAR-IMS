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

    var isNewAsset = !assetId; // Check if it's a new asset

    // Perform inventory updates based on status changes
    if (initialStatus !== newStatusName) {
        updateInventoryBasedOnStatusChange(modelId, initialStatus, newStatusName);
        formContext.getAttribute("new_previousstatus").setValue(newStatusName); // Update the previous status after save
    } else {
        console.log("Status hasn't changed. No inventory update needed.");
    }

    // Populate the previous fields after a successful save
    populatePreviousFieldsOnSave(formContext);

    var alertOptions = {
        height: 240,
        width: 180
    };

    var successMessage = isNewAsset 
        ? { title: "✅ Asset Created", text: "New asset created.\nThe asset record has been added to the system." }
        : { title: "✅ Asset Updated", text: "Asset updated successfully.\nThe asset record has been modified and saved." };

    var alertStrings = { confirmButtonLabel: "OK", title: successMessage.title, text: successMessage.text };

    Xrm.Navigation.openAlertDialog(alertStrings, alertOptions).then(
        function success() {
            console.log("Dialog closed.");

            // Log changes to the timeline only after the asset has been saved
            if (isNewAsset) {
                // Retrieve the assetId after save for new assets
                var newlyCreatedAssetId = formContext.data.entity.getId();
                logAssetChangesToTimeline(formContext, isNewAsset, newlyCreatedAssetId); // Pass the newly created asset ID
            } else {
                // Log changes for existing assets
                logAssetChangesToTimeline(formContext, isNewAsset, assetId);
            }
        },
        function error() {
            console.error("Error closing dialog.");
        }
    );
}

// Function to populate previous fields after save
function populatePreviousFieldsOnSave(formContext) {
    console.log("Populating previous fields after save...");

    var categoryValue = formContext.getAttribute("cr4d3_category").getValue();
    var modelValue = formContext.getAttribute("cr4d3_model").getValue();
    var assignedToValue = formContext.getAttribute("new_assignedto").getValue();
    var newStatus = formContext.getAttribute("cr4d3_status").getValue();
    
    // Category
    if (categoryValue && categoryValue.length > 0) {
        formContext.getAttribute("new_previouscategory").setValue(categoryValue[0].name);
        console.log(`Previous Category set to: ${categoryValue[0].name}`);
    }

    // Model
    if (modelValue && modelValue.length > 0) {
        formContext.getAttribute("new_previousmodel").setValue(modelValue[0].name);
        console.log(`Previous Model set to: ${modelValue[0].name}`);
    }

    // Assigned To
    if (assignedToValue && assignedToValue.length > 0) {
        formContext.getAttribute("new_previoususer").setValue(assignedToValue[0].name);
        console.log(`Previous Assigned To set to: ${assignedToValue[0].name}`);
    }

    // Status
    var newStatusName = newStatus ? newStatus[0].name : null;
    if (newStatusName) {
        formContext.getAttribute("new_previousstatus").setValue(newStatusName);
        console.log(`Previous Status set to: ${newStatusName}`);
    }
}

// Updated logAssetChangesToTimeline to accept assetId as a parameter
function logAssetChangesToTimeline(formContext, isNewAsset, assetId) {
    console.log("Logging asset changes to timeline...");

    var notesContent = "";
    var assetCode = formContext.getAttribute("cr4d3_assetcode").getValue();
    var modelValue = formContext.getAttribute("cr4d3_model").getValue();
    var modelName = modelValue ? modelValue[0].name : null;
    var categoryValue = formContext.getAttribute("cr4d3_category").getValue();
    var categoryName = categoryValue ? categoryValue[0].name : null;
    var deviceIdentifier = formContext.getAttribute("cr4d3_serialnumber").getValue(); // Device Identifier (Serial Number/IMEI)
    var statusValue = formContext.getAttribute("cr4d3_status").getValue();
    var statusName = statusValue ? statusValue[0].name : null;
    var assignedToValue = formContext.getAttribute("new_assignedto").getValue();
    var assignedToName = assignedToValue ? assignedToValue[0].name : null;

    if (isNewAsset) {
        notesContent += `Asset "${assetCode}" Created\n\n`;
    } else {
        notesContent += `Asset "${assetCode}" Updated\n\n`;
    }

    if (assetCode) notesContent += `Asset Code: ${assetCode}\n`;
    if (modelName) notesContent += `Model: ${modelName}\n`;
    if (categoryName) notesContent += `Category: ${categoryName}\n`;
    if (deviceIdentifier) notesContent += `Device Identifier: ${deviceIdentifier}\n`;
    if (statusName) notesContent += `Device Status: ${statusName}\n`;
    if (assignedToName) notesContent += `Assigned To: ${assignedToName}\n`;

    // Ensure the assetId is formatted correctly
    assetId = assetId.replace("{", "").replace("}", "");

    // Create the note entity
    var note = {
        "notetext": notesContent,
        "objectid_cr4d3_asset@odata.bind": `/cr4d3_assets(${assetId})`  // Bind to the asset ID
    };

    // Save the note to the timeline
    Xrm.WebApi.createRecord("annotation", note).then(
        function success() {
            console.log("Asset changes successfully logged in timeline.");
        },
        function error(error) {
            console.error("Error logging asset changes to timeline:", error.message);
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
