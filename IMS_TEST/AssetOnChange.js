// AssetOnChange.js

// To store initial state of category and asset code
let originalCategoryId = null;
let originalAssetCode = null;
let originalCategoryName = null; // For logging category name

function onFieldChange(executionContext) {
    console.log("Category change detected.");

    var formContext = executionContext.getFormContext();
    var categoryNameAttribute = formContext.getAttribute("cr4d3_category");

    // Check if category field exists and has a value
    if (!categoryNameAttribute || !categoryNameAttribute.getValue()) {
        console.error("Category is empty, cannot generate asset code.");
        return;
    }

    var categoryValue = categoryNameAttribute.getValue();
    var categoryId = categoryValue[0].id.replace("{", "").replace("}", ""); // Get Category GUID
    var categoryName = categoryValue[0].name; // Get Category Name

    // Log category name for tracking
    console.log(`Category: ${categoryName}`);

    // Change the field label based on the category selected
    updateDeviceIdentifierFieldLabel(formContext, categoryName);

    // If the category is unchanged, restore original asset code
    if (originalCategoryId && categoryId === originalCategoryId) {
        console.log(`Category reverted to original: ${originalCategoryName}, restoring asset code.`);
        formContext.getAttribute("cr4d3_assetcode").setValue(originalAssetCode);
        return;
    }

    // Fetch the category prefix for the selected category
    Xrm.WebApi.retrieveRecord("cr4d3_category", categoryId, "?$select=cr4d3_categoryprefix").then(
        function success(result) {
            var categoryPrefix = result.cr4d3_categoryprefix;
            console.log(`Prefix for ${categoryName}: ${categoryPrefix}`);

            // Generate the asset code based on the category prefix
            generateAssetCode(formContext, categoryPrefix);
        },
        function error(error) {
            console.error(`Error fetching prefix for ${categoryName}:`, error.message);
        }
    );
}

// Function to update the device identifier field label based on category
function updateDeviceIdentifierFieldLabel(formContext, categoryName) {
    var deviceIdentifierControl = formContext.getControl("cr4d3_serialnumber");

    if (!deviceIdentifierControl) {
        console.error("Device Identifier field not found.");
        return;
    }

    // Modify the label according to the category
    if (categoryName === "Laptop" || categoryName === "Desktop") {
        deviceIdentifierControl.setLabel("Device Identifier (Enter Serial Number)");
    } else if (categoryName === "Phone" || categoryName === "Tablet") {
        deviceIdentifierControl.setLabel("Device Identifier (Enter IMEI Number)");
    } else {
        deviceIdentifierControl.setLabel("Device Identifier");
    }
}

function generateAssetCode(formContext, categoryPrefix) {
    console.log(`Generating asset code for prefix: ${categoryPrefix}`);

    // Build a query to fetch the latest asset code for the given category prefix
    var assetQuery = `?$filter=startswith(cr4d3_assetcode, '${categoryPrefix}')&$orderby=cr4d3_assetcode desc&$top=1`;

    Xrm.WebApi.retrieveMultipleRecords("cr4d3_asset", assetQuery).then(
        function success(result) {
            var nextSequenceNumber = "001"; // Default sequence

            if (result.entities.length > 0) {
                // Extract the numeric part from the latest asset code
                var latestAssetCode = result.entities[0].cr4d3_assetcode;
                var numericPart = parseInt(latestAssetCode.replace(categoryPrefix, "")) + 1;
                nextSequenceNumber = ("000" + numericPart).slice(-3); // Pad to 3 digits
            }

            // Create new asset code
            var newAssetCode = categoryPrefix + nextSequenceNumber;
            console.log(`New asset code: ${newAssetCode}`);

            // Set the new asset code in the form
            formContext.getAttribute("cr4d3_assetcode").setValue(newAssetCode);
        },
        function error(error) {
            console.error("Error retrieving asset code:", error.message);
        }
    );
}
