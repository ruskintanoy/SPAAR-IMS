// AssetOnSave.js

function onSaveAssetForm(executionContext) {
    console.log("[INFO] Saving asset form...");

    var formContext = executionContext.getFormContext();
    var assetId = formContext.data.entity.getId();
    var modelLookup = formContext.getAttribute("cr4d3_model").getValue();
    var assignedToValue = formContext.getAttribute("new_assignedto").getValue();
    var newStatus = formContext.getAttribute("cr4d3_status").getValue();

    if (!modelLookup || modelLookup.length === 0) {
        console.error("[ERROR] No model selected. Cannot update inventory.");
        return;
    }

    var modelId = modelLookup[0].id.replace("{", "").replace("}", "");
    var newStatusName = newStatus ? newStatus[0].name : null;

    var assetCode = formContext.getAttribute("cr4d3_assetcode").getValue(); 

    if (newStatusName === "Assigned" && !assignedToValue) {
        console.warn("[WARNING] 'Assigned To' field is empty but status is 'Assigned'. Blocking save.");
        var alertStrings = { 
            confirmButtonLabel: "OK", 
            title: "⚠️ User Assignment Required", 
            text: "The 'Assigned To' field cannot be left blank when the device status is 'Assigned'. Please assign this device to a user before saving." 
        };
        var alertOptions = { height: 240, width: 180 };
        Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
        executionContext.getEventArgs().preventDefault();
        return;
    }

    var initialStatus = formContext.getAttribute("new_previousstatus").getValue();
    var isNewAsset = !assetId;

    if (initialStatus !== newStatusName) {
        console.log(`[INFO] Status change detected: ${initialStatus} → ${newStatusName}. Updating inventory.`);
        updateInventoryBasedOnStatusChange(modelId, initialStatus, newStatusName);
        formContext.getAttribute("new_previousstatus").setValue(newStatusName);
    } else {
        console.log("[INFO] No status change detected. Skipping inventory update.");
    }

    var successMessage = isNewAsset 
        ? { title: `✅ Asset ${assetCode} Created`, text: `New asset created.\nThe asset record has been added to the system.` }
        : { title: `✅ Asset ${assetCode} Updated`, text: `Asset updated successfully.\nThe asset record has been modified and saved.` };

    Xrm.Navigation.openAlertDialog({ confirmButtonLabel: "OK", title: successMessage.title, text: successMessage.text }).then(
        function success() {
            console.log("[INFO] Dialog closed. Proceeding with timeline log.");
            if (isNewAsset) {
                var newlyCreatedAssetId = formContext.data.entity.getId();
                logAssetChangesToTimeline(formContext, isNewAsset, newlyCreatedAssetId).then(() => refreshTimeline(formContext));
            } else {
                logAssetChangesToTimeline(formContext, isNewAsset, assetId).then(() => refreshTimeline(formContext));
            }

            // Update the initial values after save to reflect the new state
            captureInitialValues(formContext);
        },
        function error() {
            console.error("[ERROR] Error occurred while closing the dialog.");
        }
    );
}

function refreshTimeline(formContext) {
    var timelineControl = formContext.getControl("Timeline");
    if (timelineControl) {
        console.log("[INFO] Refreshing timeline.");
        timelineControl.refresh();
    } else {
        console.error("[ERROR] Timeline control not found.");
    }
}

function logAssetChangesToTimeline(formContext, isNewAsset, assetId) {
    console.log("[INFO] Logging asset changes to timeline.");

    var notesContent = "";
    var assetCode = formContext.getAttribute("cr4d3_assetcode").getValue();
    var modelValue = formContext.getAttribute("cr4d3_model").getValue();
    var modelName = modelValue ? modelValue[0].name : null;
    var categoryValue = formContext.getAttribute("cr4d3_category").getValue();
    var categoryName = categoryValue ? categoryValue[0].name : null;
    var deviceIdentifier = formContext.getAttribute("cr4d3_serialnumber").getValue();
    var statusValue = formContext.getAttribute("cr4d3_status").getValue();
    var statusName = statusValue ? statusValue[0].name : null;
    var assignedToValue = formContext.getAttribute("new_assignedto").getValue();
    var assignedToName = assignedToValue ? assignedToValue[0].name : null;

    var hasChanges = false;
    var subject = "";  // Variable to hold the subject for the timeline entry

    // Check if this is a new asset creation
    if (isNewAsset) {
        console.log("New asset creation detected. Logging all fields.");
        subject = `Asset ${assetCode} Created`;  // Subject for the new asset creation
        notesContent += `Asset ${assetCode} created with the following information:\n\n`;

        if (assetCode) notesContent += `Asset Code: ${assetCode}\n`;
        if (modelName) notesContent += `Model: ${modelName}\n`;
        if (categoryName) notesContent += `Category: ${categoryName}\n`;
        if (deviceIdentifier) notesContent += `Device Identifier: ${deviceIdentifier}\n`;
        if (statusName) notesContent += `Device Status: ${statusName}\n`;
        if (assignedToName) notesContent += `Assigned To: ${assignedToName}\n`;
        hasChanges = true;
    } else {
        console.log("Asset update detected. Logging only changed fields.");
        subject = `Asset ${assetCode} Updated`;  // Subject for the asset update
        notesContent += `Asset ${assetCode} updated with the following information:\n\n`;

        // Log only fields that have changed
        if (assetCode && assetCode !== initialAssetCode) {
            notesContent += `Asset Code: ${assetCode}\n`;
            hasChanges = true;
        }
        if (modelName && modelName !== initialModelName) {
            notesContent += `Model: ${modelName}\n`;
            hasChanges = true;
        }
        if (categoryName && categoryName !== initialCategoryName) {
            notesContent += `Category: ${categoryName}\n`;
            hasChanges = true;
        }
        if (deviceIdentifier && deviceIdentifier !== initialDeviceIdentifier) {
            notesContent += `Device Identifier: ${deviceIdentifier}\n`;
            hasChanges = true;
        }
        if (statusName && statusName !== initialStatusName) {
            notesContent += `Device Status: ${statusName}\n`;
            hasChanges = true;
        }
        if (assignedToName && assignedToName !== initialAssignedTo) {
            notesContent += `Assigned To: ${assignedToName}\n`;
            hasChanges = true;
        }
    }

    // Ensure the assetId is formatted correctly
    assetId = assetId.replace("{", "").replace("}", "");

    // If there are no changes, don't create a note
    if (!hasChanges) {
        console.log("No changes detected. Skipping timeline log.");
        return Promise.resolve();
    }

    // Create the note entity
    var note = {
        "subject": subject,  // Set the subject for the timeline entry
        "notetext": notesContent,
        "objectid_cr4d3_asset@odata.bind": `/cr4d3_assets(${assetId})`  // Bind to the asset ID
    };

    // Save the note to the timeline
    return Xrm.WebApi.createRecord("annotation", note).then(
        function success() {
            console.log("Asset changes successfully logged in timeline.");
        },
        function error(error) {
            console.error("Error logging asset changes to timeline:", error.message);
        }
    );
}

function updateInventoryBasedOnStatusChange(modelId, initialStatus, newStatus) {
    console.log(`[INFO] Updating inventory based on status change: ${initialStatus} → ${newStatus}`);
    
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
