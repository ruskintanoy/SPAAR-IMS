// AssetOnChange.js

let originalCategoryId = null;
let originalAssetCode = null;
let originalCategoryName = null;

function onCategoryChange(executionContext) {
    console.log("Category change event triggered.");

    const formContext = executionContext.getFormContext();
    const categoryNameAttribute = formContext.getAttribute("cr4d3_category");

    if (!categoryNameAttribute || !categoryNameAttribute.getValue()) {
        console.error("[ERROR] Category is empty, cannot generate asset code.");
        return;
    }

    const categoryValue = categoryNameAttribute.getValue();
    const categoryId = categoryValue[0].id.replace("{", "").replace("}", "");
    const categoryName = categoryValue[0].name;

    updateDeviceIdentifierFieldLabel(formContext, categoryName);
    console.log(`[INFO] Category Selected: ${categoryName}, ID: ${categoryId}`);

    if (categoryId === initialCategory) {
        console.log(`[INFO] Category reverted to initial value: ${initialCategoryName}. Restoring asset code.`);
        formContext.getAttribute("cr4d3_assetcode").setValue(initialAssetCode);
        return;
    }

    if (categoryId !== initialCategory) {
        console.log(`[INFO] Category changed from ${initialCategoryName} to ${categoryName}. Regenerating asset code.`);
        originalCategoryId = categoryId;
        originalCategoryName = categoryName;

        Xrm.WebApi.retrieveRecord("cr4d3_category", categoryId, "?$select=cr4d3_categoryprefix")
            .then(
                function success(result) {
                    const categoryPrefix = result.cr4d3_categoryprefix;
                    console.log(`[INFO] Retrieved Prefix for ${categoryName}: ${categoryPrefix}`);
                    generateAssetCode(formContext, categoryPrefix);
                },
                function error(error) {
                    console.error(`[ERROR] Failed to retrieve prefix for ${categoryName}:`, error.message);
                }
            );
    }
}

function onStatusChange(executionContext) {
    console.log("Status change event triggered.");

    const formContext = executionContext.getFormContext();
    const statusAttribute = formContext.getAttribute("cr4d3_status");

    const assignedToControl = formContext.getControl("header_new_assignedto");
    const assignedDateControl = formContext.getControl("header_cr4d3_assigneddate");

    if (statusAttribute && statusAttribute.getValue()) {
        const statusValue = statusAttribute.getValue()[0].name;

        if (statusValue === "Assigned") {
            const currentDate = new Date();
            formContext.getAttribute("cr4d3_assigneddate").setValue(currentDate);
            console.log("[INFO] Status set to 'Assigned'. Updated Assigned Date to current date.");

            if (assignedToControl) assignedToControl.setVisible(true);
            if (assignedDateControl) assignedDateControl.setVisible(true);
        } else if (statusValue === "Retired" || statusValue === "Stored") {
            formContext.getAttribute("new_assignedto").setValue(null);
            formContext.getAttribute("cr4d3_assigneddate").setValue(null);
            console.log("[INFO] Status is 'Retired' or 'Stored'. Cleared Assigned To and Assigned Date fields.");

            if (assignedToControl) assignedToControl.setVisible(false);
            if (assignedDateControl) assignedDateControl.setVisible(false);
        }
    } else {
        console.error("[ERROR] Status value not found.");
    }
}

function updateDeviceIdentifierFieldLabel(formContext, categoryName) {
    const deviceIdentifierControl = formContext.getControl("cr4d3_serialnumber");

    if (!deviceIdentifierControl) {
        console.error("[ERROR] Device Identifier field control not found.");
        return;
    }

    let label = "Device Identifier";
    if (categoryName === "Laptop" || categoryName === "Desktop") {
        label = "Device Identifier (Enter Serial Number)";
    } else if (categoryName === "Phone" || categoryName === "Tablet") {
        label = "Device Identifier (Enter IMEI Number)";
    }

    deviceIdentifierControl.setLabel(label);
    console.log(`[INFO] Updated Device Identifier label for category: ${categoryName}`);
}

function generateAssetCode(formContext, categoryPrefix) {
    console.log(`[INFO] Generating asset code for prefix: ${categoryPrefix}`);

    const assetQuery = `?$filter=startswith(cr4d3_assetcode, '${categoryPrefix}')&$orderby=cr4d3_assetcode asc`;

    Xrm.WebApi.retrieveMultipleRecords("cr4d3_asset", assetQuery)
        .then(function success(result) {
            const existingCodes = result.entities.map(entity => {
                const code = entity.cr4d3_assetcode;
                return parseInt(code.replace(categoryPrefix, ""));
            }).sort((a, b) => a - b);

            let nextSequenceNumber = existingCodes.find((code, index) => code !== index + 1) || existingCodes.length + 1;
            const formattedSequence = ("000" + nextSequenceNumber).slice(-3);
            const newAssetCode = categoryPrefix + formattedSequence;

            console.log(`[INFO] New Asset Code Generated: ${newAssetCode}`);
            formContext.getAttribute("cr4d3_assetcode").setValue(newAssetCode);
        })
        .catch(error => {
            console.error("[ERROR] Failed to retrieve asset codes:", error.message);
        });
}

function onDeviceIdentifierChange(executionContext) {
    console.log("[INFO] Device Identifier change event triggered.");

    const formContext = executionContext.getFormContext();
    const deviceIdentifierAttribute = formContext.getAttribute("cr4d3_serialnumber");
    const deviceIdentifierControl = formContext.getControl("cr4d3_serialnumber");

    if (!deviceIdentifierAttribute || !deviceIdentifierAttribute.getValue()) {
        console.warn("[WARNING] Device Identifier is empty. No validation needed.");
        deviceIdentifierControl.clearNotification();
        return;
    }

    const deviceIdentifier = deviceIdentifierAttribute.getValue();
    const assetId = formContext.data.entity.getId();

    if (!assetId) {
        console.log("[INFO] New asset record. Validating uniqueness for Device Identifier:", deviceIdentifier);

        const query = `?$filter=cr4d3_serialnumber eq '${deviceIdentifier}'`;

        Xrm.WebApi.retrieveMultipleRecords("cr4d3_asset", query)
            .then(function success(result) {
                if (result.entities.length > 0) {
                    console.error("[ERROR] Device Identifier already exists. Displaying field error.");
                    deviceIdentifierControl.setNotification(
                        "This Device Identifier already exists. Please provide a unique ID.", 
                        "duplicateDeviceIdentifier"
                    );
                } else {
                    console.log("[INFO] Device Identifier is unique.");
                    deviceIdentifierControl.clearNotification();
                }
            })
            .catch(error => {
                console.error("[ERROR] Failed to validate Device Identifier uniqueness:", error.message);
            });
    } else {
        console.log("[INFO] Existing asset record. No validation needed.");
    }
}
