// AssetOnChange.js

// To store initial state of category and asset code
let originalCategoryId = null;
let originalAssetCode = null;
let originalCategoryName = null; // For logging category name

function onCategoryChange(executionContext) {
    console.log("Category change detected.");

    var formContext = executionContext.getFormContext();
    var categoryNameAttribute = formContext.getAttribute("cr4d3_category");
    var assetCodeAttribute = formContext.getAttribute("cr4d3_assetcode"); // Asset Code field

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

    // FIX: Compare against initialCategoryId instead of originalCategoryId
    if (categoryId === initialCategory) {
        // If category is reverted to the original, restore the original asset code
        console.log(`Category reverted back to original: ${initialCategoryName}. Restoring initial asset code: ${initialAssetCode}`);
        formContext.getAttribute("cr4d3_assetcode").setValue(initialAssetCode); // Restore initial asset code
        return; // Skip generating a new code
    }

    // If the category has changed, regenerate the asset code ONLY if it's a different category
    if (categoryId !== initialCategory) {
        console.log(`Category changed from ${initialCategoryName} to ${categoryName}. Generating new asset code.`);
        originalCategoryId = categoryId; // Update the original category
        originalCategoryName = categoryName;

        // Fetch the category prefix for the new selected category and regenerate asset code
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
    } else {
        console.log("Category has not changed. No need to regenerate asset code.");
    }
}

function onStatusChange(executionContext) {
    console.log("Status change detected.");

    var formContext = executionContext.getFormContext();
    var statusAttribute = formContext.getAttribute("cr4d3_status"); // Device status field
    var assignedDateAttribute = formContext.getAttribute("cr4d3_assigneddate"); // Assigned Date field

    // Check if the device status is "Assigned" and set the assigned date
    if (statusAttribute && statusAttribute.getValue()) {
        var statusValue = statusAttribute.getValue()[0].name;

        if (statusValue === "Assigned") {
            // Set the current date to "Assigned Date" field
            var currentDate = new Date();
            assignedDateAttribute.setValue(currentDate);

            console.log("Device status set to 'Assigned', updating Assigned Date to current date.");
        } else {
            // Clear the assigned date if status is not "Assigned"
            assignedDateAttribute.setValue(null);
            console.log("Device status is not 'Assigned', clearing Assigned Date.");
        }
    }
}

// Function to update the device identifier field label based on category
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
