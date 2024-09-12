// AssetFieldChange.js

function onFieldChange(executionContext) {
    console.log("Field change detected. Processing field change.");

    var formContext = executionContext.getFormContext();
    var categoryNameAttribute = formContext.getAttribute("cr4d3_category");

    // Check if category field exists and has a value
    if (!categoryNameAttribute || !categoryNameAttribute.getValue()) {
        console.error("Category field is empty. Cannot generate asset code.");
        return;
    }

    var categoryValue = categoryNameAttribute.getValue();
    var categoryId = categoryValue[0].id.replace("{", "").replace("}", ""); // Get Category GUID

    // Fetch the category prefix based on the selected category
    Xrm.WebApi.retrieveRecord("cr4d3_category", categoryId, "?$select=cr4d3_categoryprefix").then(
        function success(result) {
            var categoryPrefix = result.cr4d3_categoryprefix;
            console.log("Category prefix found:", categoryPrefix);

            // Now, retrieve the latest asset code for this category
            generateAssetCode(formContext, categoryPrefix);
        },
        function error(error) {
            console.error("Error fetching category prefix:", error.message);
        }
    );
}

function generateAssetCode(formContext, categoryPrefix) {
    console.log("Generating asset code for category:", categoryPrefix);

    // Build a query to fetch the latest asset code for the given category prefix
    var assetQuery = `?$filter=startswith(cr4d3_assetcode, '${categoryPrefix}')&$orderby=cr4d3_assetcode desc&$top=1`;

    Xrm.WebApi.retrieveMultipleRecords("cr4d3_asset", assetQuery).then(
        function success(result) {
            var nextSequenceNumber = "001"; // Start sequence at 001 by default

            if (result.entities.length > 0) {
                // Extract the numeric part from the latest asset code
                var latestAssetCode = result.entities[0].cr4d3_assetcode;
                var numericPart = parseInt(latestAssetCode.replace(categoryPrefix, "")) + 1;
                nextSequenceNumber = ("000" + numericPart).slice(-3); // Pad the number to 3 digits
            }

            // Combine prefix and sequence number to form new asset code
            var newAssetCode = categoryPrefix + nextSequenceNumber;
            console.log("New asset code generated:", newAssetCode);

            // Set the generated asset code in the form
            formContext.getAttribute("cr4d3_assetcode").setValue(newAssetCode);
        },
        function error(error) {
            console.error("Error retrieving latest asset code:", error.message);
        }
    );
}
