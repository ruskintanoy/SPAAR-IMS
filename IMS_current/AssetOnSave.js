

function onSaveAssetForm(executionContext) {
  console.log("[INFO] Saving asset form...");

  const formContext = executionContext.getFormContext();
  const assetId = formContext.data.entity.getId();
  const modelLookup = formContext.getAttribute("cr4d3_model").getValue();
  const assignedToValue = formContext.getAttribute("new_assignedto").getValue();
  const newStatus = formContext.getAttribute("cr4d3_status").getValue();
  const assetCode = formContext.getAttribute("cr4d3_assetcode").getValue();

  if (!modelLookup || modelLookup.length === 0) {
    console.error("[ERROR] No model selected. Cannot update inventory.");
    return;
  }

  const modelId = modelLookup[0].id.replace("{", "").replace("}", "");
  const newStatusName = newStatus ? newStatus[0].name : null;

  if (!checkAssignedToRequirement(newStatusName, assignedToValue, executionContext)) {
    return;
  }

  const initialStatus = formContext.getAttribute("new_previousstatus").getValue();
  const isNewAsset = !assetId;

  if (initialStatus !== newStatusName) {
    console.log(`[INFO] Status change detected: ${initialStatus} → ${newStatusName}. Updating inventory.`);
    updateInventoryBasedOnStatusChange(modelId, initialStatus, newStatusName);
    formContext.getAttribute("new_previousstatus").setValue(newStatusName);
  } else {
    console.log("[INFO] No status change detected. Skipping inventory update.");
  }

  showSuccessMessage(isNewAsset, assetCode).then(function success() {
    console.log("[INFO] Dialog closed. Proceeding with timeline log.");
    logAssetChangesToTimeline(formContext, isNewAsset, assetId || formContext.data.entity.getId())
      .then(() => refreshTimeline(formContext));

    captureInitialValues(formContext);
  });
}

function showSuccessMessage(isNewAsset, assetCode) {
  const successMessage = isNewAsset
    ? {
        title: `✅ Asset ${assetCode} Created`,
        text: `New asset created.\nThe asset record has been added to the system.`,
      }
    : {
        title: `✅ Asset ${assetCode} Updated`,
        text: `Asset updated successfully.\nThe asset record has been modified and saved.`,
      };

  return Xrm.Navigation.openAlertDialog({
    confirmButtonLabel: "OK",
    title: successMessage.title,
    text: successMessage.text,
  });
}

function checkAssignedToRequirement(newStatusName, assignedToValue, executionContext) {
  if (newStatusName === "Assigned" && !assignedToValue) {
    console.warn("[WARNING] 'Assigned To' field is empty but status is 'Assigned'. Blocking save.");
    openAlertDialog(
      "⚠️ User Assignment Required",
      "The 'Assigned To' field cannot be left blank when the device status is 'Assigned'. Please assign this device to a user before saving."
    );
    executionContext.getEventArgs().preventDefault();
    return false;
  }
  return true;
}

function openAlertDialog(title, text) {
  const alertStrings = { confirmButtonLabel: "OK", title: title, text: text };
  const alertOptions = { height: 240, width: 180 };
  return Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
}

function refreshTimeline(formContext) {
  const timelineControl = formContext.getControl("Timeline");
  if (timelineControl) {
    console.log("[INFO] Refreshing timeline.");
    timelineControl.refresh();
  } else {
    console.error("[ERROR] Timeline control not found.");
  }
}

function logAssetChangesToTimeline(formContext, isNewAsset, assetId) {
  console.log("[INFO] Logging asset changes to timeline.");

  let notesContent = "";
  const assetCode = formContext.getAttribute("cr4d3_assetcode").getValue();
  const deviceIdentifier = formContext.getAttribute("cr4d3_serialnumber").getValue();
  const modelValue = formContext.getAttribute("cr4d3_model").getValue();
  const modelName = modelValue ? modelValue[0].name : null;
  const categoryValue = formContext.getAttribute("cr4d3_category").getValue();
  const categoryName = categoryValue ? categoryValue[0].name : null;
  const statusValue = formContext.getAttribute("cr4d3_status").getValue();
  const statusName = statusValue ? statusValue[0].name : null;
  const assignedToValue = formContext.getAttribute("new_assignedto").getValue();
  const assignedToName = assignedToValue ? assignedToValue[0].name : null;

  let hasChanges = false;
  let subject = "";

  if (isNewAsset) {
    console.log("[INFO] New asset creation detected. Logging all fields.");
    subject = `Asset ${assetCode} Created`;
    notesContent += `Asset ${assetCode} created with the following information:\n\n`;

    if (assetCode) notesContent += `Asset Code: ${assetCode}\n`;
    if (modelName) notesContent += `Model: ${modelName}\n`;
    if (categoryName) notesContent += `Category: ${categoryName}\n`;
    if (deviceIdentifier) notesContent += `Device Identifier: ${deviceIdentifier}\n`;
    if (statusName) notesContent += `Device Status: ${statusName}\n`;
    if (assignedToName) notesContent += `Assigned To: ${assignedToName}\n`;

    hasChanges = true; 

  } else {
    console.log("[INFO] Asset update detected. Logging only changed fields.");
    subject = `Asset ${assetCode} Updated`;
    notesContent += `Asset ${assetCode} updated with the following information:\n\n`;

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

  assetId = assetId.replace("{", "").replace("}", "");

  if (!hasChanges) {
    console.log("[INFO] No changes detected. Skipping timeline log.");
    return Promise.resolve();
  }

  const note = {
    subject: subject,
    notetext: notesContent,
    "objectid_cr4d3_asset@odata.bind": `/cr4d3_assets(${assetId})`, 
  };

  return Xrm.WebApi.createRecord("annotation", note).then(
    function success() {
      console.log("[INFO] Asset changes successfully logged in the timeline.");
    },
    function error(error) {
      console.error("[ERROR] Failed to log asset changes to the timeline:", error.message);
    }
  );
}

function updateInventoryBasedOnStatusChange(modelId, initialStatus, newStatus) {
  console.log(`[INFO] Updating inventory based on status change: ${initialStatus} → ${newStatus}`);

  Xrm.WebApi.retrieveRecord("cr4d3_model", modelId, "?$select=cr4d3_inventoryquantity,new_available")
    .then(function success(result) {
      let totalInventory = result.cr4d3_inventoryquantity || 0;
      let unitsAvailable = result.new_available || 0;

      if (initialStatus === "Assigned" && newStatus === "Stored") unitsAvailable += 1;
      else if (initialStatus === "Assigned" && newStatus === "Retired") totalInventory -= 1;
      else if (initialStatus === "Stored" && newStatus === "Assigned") unitsAvailable -= 1;
      else if (initialStatus === "Stored" && newStatus === "Retired") {
        unitsAvailable -= 1;
        totalInventory -= 1;
      } else if (initialStatus === "Retired" && newStatus === "Assigned") totalInventory += 1;
      else if (initialStatus === "Retired" && newStatus === "Stored") {
        totalInventory += 1;
        unitsAvailable += 1;
      } else if (!initialStatus && newStatus === "Stored") {
        totalInventory += 1;
        unitsAvailable += 1;
      } else if (!initialStatus && newStatus === "Assigned") totalInventory += 1;

      const updateData = { cr4d3_inventoryquantity: totalInventory, new_available: unitsAvailable };

      Xrm.WebApi.updateRecord("cr4d3_model", modelId, updateData)
        .then(() => console.log("Model inventory updated successfully."))
        .catch((error) => console.error("Error updating model inventory:", error.message));
    })
    .catch((error) => console.error("Error retrieving model record:", error.message));
}
