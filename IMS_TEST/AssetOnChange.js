// AssetOnChange.js

// To store initial state of category and asset code
let originalCategoryId = null;
let originalAssetCode = null;
let originalCategoryName = null;

function onCategoryChange(executionContext) {
  console.log("Category change event triggered.");

  var formContext = executionContext.getFormContext();
  var categoryNameAttribute = formContext.getAttribute("cr4d3_category");
  var assetCodeAttribute = formContext.getAttribute("cr4d3_assetcode");

  if (!categoryNameAttribute || !categoryNameAttribute.getValue()) {
    console.error("[ERROR] Category is empty, cannot generate asset code.");
    return;
  }

  var categoryValue = categoryNameAttribute.getValue();
  var categoryId = categoryValue[0].id.replace("{", "").replace("}", "");
  var categoryName = categoryValue[0].name;

  updateDeviceIdentifierFieldLabel(formContext, categoryName);
  console.log(`[INFO] Category Selected: ${categoryName}, ID: ${categoryId}`);

  if (categoryId === initialCategory) {
    console.log(
      `[INFO] Category reverted to initial value: ${initialCategoryName}. Restoring asset code.`
    );
    formContext.getAttribute("cr4d3_assetcode").setValue(initialAssetCode);
    return;
  }

  if (categoryId !== initialCategory) {
    console.log(
      `[INFO] Category changed from ${initialCategoryName} to ${categoryName}. Regenerating asset code.`
    );
    originalCategoryId = categoryId;
    originalCategoryName = categoryName;

    Xrm.WebApi.retrieveRecord(
      "cr4d3_category",
      categoryId,
      "?$select=cr4d3_categoryprefix"
    ).then(
      function success(result) {
        var categoryPrefix = result.cr4d3_categoryprefix;
        console.log(
          `[INFO] Retrieved Prefix for ${categoryName}: ${categoryPrefix}`
        );
        generateAssetCode(formContext, categoryPrefix);
      },
      function error(error) {
        console.error(
          `[ERROR] Failed to retrieve prefix for ${categoryName}:`,
          error.message
        );
      }
    );
  }
}

function onStatusChange(executionContext) {
  console.log("Status change event triggered.");

  var formContext = executionContext.getFormContext();
  var statusAttribute = formContext.getAttribute("cr4d3_status");

  var assignedToControl = formContext.getControl("header_new_assignedto");
  var assignedDateControl = formContext.getControl("header_cr4d3_assigneddate");

  if (statusAttribute && statusAttribute.getValue()) {
    var statusValue = statusAttribute.getValue()[0].name;

    if (statusValue === "Assigned") {
      var currentDate = new Date();
      formContext.getAttribute("cr4d3_assigneddate").setValue(currentDate);
      console.log(
        "[INFO] Status set to 'Assigned'. Updated Assigned Date to current date."
      );

      if (assignedToControl) assignedToControl.setVisible(true);
      if (assignedDateControl) assignedDateControl.setVisible(true);
    } else if (statusValue === "Retired" || statusValue === "Stored") {
      formContext.getAttribute("new_assignedto").setValue(null);
      formContext.getAttribute("cr4d3_assigneddate").setValue(null);
      console.log(
        "[INFO] Status is 'Retired' or 'Stored'. Cleared Assigned To and Assigned Date fields."
      );

      if (assignedToControl) assignedToControl.setVisible(false);
      if (assignedDateControl) assignedDateControl.setVisible(false);
    }
  } else {
    console.error("[ERROR] Status value not found.");
  }
}

function updateDeviceIdentifierFieldLabel(formContext, categoryName) {
  var deviceIdentifierControl = formContext.getControl("cr4d3_serialnumber");

  if (!deviceIdentifierControl) {
    console.error("[ERROR] Device Identifier field control not found.");
    return;
  }

  if (categoryName === "Laptop" || categoryName === "Desktop") {
    deviceIdentifierControl.setLabel("Device Identifier (Enter Serial Number)");
  } else if (categoryName === "Phone" || categoryName === "Tablet") {
    deviceIdentifierControl.setLabel("Device Identifier (Enter IMEI Number)");
  } else {
    deviceIdentifierControl.setLabel("Device Identifier");
  }
  console.log(
    `[INFO] Updated Device Identifier label for category: ${categoryName}`
  );
}

function generateAssetCode(formContext, categoryPrefix) {
  console.log(`[INFO] Generating asset code for prefix: ${categoryPrefix}`);

  // Build a query to fetch all asset codes for the given category prefix
  var assetQuery = `?$filter=startswith(cr4d3_assetcode, '${categoryPrefix}')&$orderby=cr4d3_assetcode asc`;

  Xrm.WebApi.retrieveMultipleRecords("cr4d3_asset", assetQuery).then(
    function success(result) {
      var existingCodes = [];
      result.entities.forEach(function (entity) {
        var code = entity.cr4d3_assetcode;
        var numericPart = parseInt(code.replace(categoryPrefix, ""));
        existingCodes.push(numericPart);
      });

      // Sort the codes numerically to check for missing numbers
      existingCodes.sort(function (a, b) {
        return a - b;
      });

      var nextSequenceNumber = null;

      // Find the first missing number in the sequence
      for (var i = 0; i < existingCodes.length; i++) {
        if (existingCodes[i] !== i + 1) {
          // Sequence should start from 1
          nextSequenceNumber = i + 1;
          break;
        }
      }

      // If no missing number is found, assign the next in sequence
      if (nextSequenceNumber === null) {
        nextSequenceNumber = existingCodes.length + 1;
      }

      var formattedSequence = ("000" + nextSequenceNumber).slice(-3); // Pad to 3 digits
      var newAssetCode = categoryPrefix + formattedSequence;

      console.log(`[INFO] New Asset Code Generated: ${newAssetCode}`);
      formContext.getAttribute("cr4d3_assetcode").setValue(newAssetCode);
    },
    function error(error) {
      console.error("[ERROR] Failed to retrieve asset codes:", error.message);
    }
  );
}
