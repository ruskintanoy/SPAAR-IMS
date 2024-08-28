let initialAssetCode = null;
let initialCategory = null;
let isManualAssetCode = false; // Flag to detect manual asset code entry

function onLoadAssetFormAssetCode(executionContext) {
    console.log("onLoadAssetFormAssetCode function called");

    var formContext = executionContext.getFormContext();
    var assetCodeAttribute = formContext.getAttribute("cr4d3_assetcode");
    var categoryNameAttribute = formContext.getAttribute("cr4d3_category");

    // Capture initial Asset Code and Category ID
    if (assetCodeAttribute && categoryNameAttribute) {
        initialAssetCode = assetCodeAttribute.getValue();
        var categoryValue = categoryNameAttribute.getValue();
        if (categoryValue && categoryValue.length > 0) {
            initialCategory = categoryValue[0].id.replace("{", "").replace("}", "");
        }

        console.log("Initial asset code:", initialAssetCode);
        console.log("Initial category:", initialCategory);

        // Attach event handler for manual entry detection
        assetCodeAttribute.addOnChange(onAssetCodeChange);
        categoryNameAttribute.addOnChange(onCategoryChange);
    }
}

function onCategoryChange(executionContext) {
    console.log("onCategoryChange function called");

    var formContext = executionContext.getFormContext();
    var categoryNameAttribute = formContext.getAttribute("cr4d3_category");
    var categoryValue = categoryNameAttribute.getValue();

    if (!categoryValue || categoryValue.length === 0) {
        console.error("Category name is empty.");
        return;
    }

    var categoryId = categoryValue[0].id.replace("{", "").replace("}", ""); // Clean the GUID format

    if (categoryId !== initialCategory) {
        // Clear the current asset code to force regeneration
        formContext.getAttribute("cr4d3_assetcode").setValue(null);
        generateAssetCode(formContext, true).then(
            function() {
                console.log("Asset code generated on category change");
            },
            function(error) {
                console.error("Error during asset code generation on category change:", error);
            }
        );
    } else {
        // Restore the initial asset code if category is changed back
        formContext.getAttribute("cr4d3_assetcode").setValue(initialAssetCode);
        console.log("Asset code restored to initial value:", initialAssetCode);
    }
}

function generateAssetCode(formContext, reset = false) {
    return new Promise(function (resolve, reject) {
        console.log("generateAssetCode function called");

        // Check if the asset code attribute exists
        var assetCodeAttribute = formContext.getAttribute("cr4d3_assetcode");
        if (!assetCodeAttribute) {
            console.error("Asset code attribute not found.");
            return resolve();
        }

        // Check if the category name attribute exists
        var categoryNameAttribute = formContext.getAttribute("cr4d3_category");
        if (!categoryNameAttribute) {
            console.error("Category name attribute not found.");
            return resolve();
        }

        var categoryValue = categoryNameAttribute.getValue();
        if (!categoryValue || categoryValue.length === 0) {
            console.error("Category name is empty.");
            return resolve();
        }

        var categoryName = categoryValue[0].name;
        var categoryId = categoryValue[0].id.replace("{", "").replace("}", ""); // Clean the GUID format
        console.log("Category name:", categoryName);
        console.log("Category ID:", categoryId);

        var categoryPrefix = "";
        var nextSequenceNumber = "";

        // Retrieve the category prefix using the category ID
        Xrm.WebApi.retrieveRecord("cr4d3_category", categoryId, "?$select=cr4d3_categoryprefix").then(
            function success(result) {
                categoryPrefix = result.cr4d3_categoryprefix;
                console.log("Category prefix:", categoryPrefix);

                // Retrieve the latest asset code
                var assetQuery = `?$filter=_cr4d3_category_value eq ${categoryId}&$orderby=cr4d3_assetcode desc&$top=1`;
                Xrm.WebApi.retrieveMultipleRecords("cr4d3_asset", assetQuery).then(
                    function success(assetResults) {
                        if (assetResults.entities.length > 0) {
                            var latestAssetCode = assetResults.entities[0].cr4d3_assetcode;
                            if (latestAssetCode) {
                                var numericPart = parseInt(latestAssetCode.replace(categoryPrefix, "")) + 1;
                                nextSequenceNumber = ("000" + numericPart).slice(-3);
                                console.log("Latest asset code:", latestAssetCode, "Next sequence number:", nextSequenceNumber);
                            } else {
                                nextSequenceNumber = "001";
                                console.log("No valid asset code found. Starting sequence at 001.");
                            }
                        } else {
                            nextSequenceNumber = "001";
                            console.log("No previous asset codes found. Starting sequence at 001.");
                        }
                        
                        // Combine prefix and sequence number to form new asset code
                        var newAssetCode = categoryPrefix + nextSequenceNumber;

                        if (reset || formContext.ui.getFormType() === 1 || formContext.ui.getFormType() === 5) { // Check if it's a new record or Quick Create form
                            formContext.getAttribute("cr4d3_assetcode").setValue(newAssetCode);
                            console.log("New asset code set:", newAssetCode);
                        }
                        resolve();
                    },
                    function error(error) {
                        console.error("Error retrieving latest asset code:", error.message);
                        resolve();
                    }
                );
            },
            function error(error) {
                console.error("Error retrieving category prefix:", error.message);
                resolve();
            }
        );
    });
}

function onAssetCodeChange(executionContext) {
    console.log("onAssetCodeChange function called");

    var formContext = executionContext.getFormContext();
    var assetCode = formContext.getAttribute("cr4d3_assetcode").getValue();

    if (assetCode && assetCode !== initialAssetCode) {
        isManualAssetCode = true;
        console.log("Manual asset code entry detected:", assetCode);
    }
}

function onSaveAssetFormAssetCode(executionContext) {
    console.log("onSaveAssetFormAssetCode function called");

    var formContext = executionContext.getFormContext();
    var assetCode = formContext.getAttribute("cr4d3_assetcode").getValue();
    
    var categoryNameAttribute = formContext.getAttribute("cr4d3_category");
    var categoryValue = categoryNameAttribute.getValue();
    var categoryId = categoryValue[0].id.replace("{", "").replace("}", "");

    // Check if the client is Web (Desktop)
    var clientType = Xrm.Utility.getGlobalContext().client.getClient();

    if (!isManualAssetCode) {
        if (categoryId === initialCategory && assetCode !== initialAssetCode) {
            formContext.getAttribute("cr4d3_assetcode").setValue(initialAssetCode);
            console.log("Asset code restored to initial value during save:", initialAssetCode);
        } else if (!assetCode) {
            generateAssetCode(formContext).then(
                function() {
                    console.log("Asset code generated during save");
                    if (clientType === "Web") {
                        printAssetCode(formContext);
                    }
                },
                function(error) {
                    console.error("Error during asset code generation during save:", error);
                }
            );
        } else if (assetCode !== initialAssetCode) {
            console.log("Asset code changed during save");
            if (clientType === "Web") {
                printAssetCode(formContext);
            }
        }
    } else {
        console.log("Manual asset code entry detected during save. Skipping auto-generation.");
        isManualAssetCode = false;
    }
}

function printAssetCode(formContext) {
    console.log("printAssetCode function called");
    var assetCode = formContext.getAttribute("cr4d3_assetcode").getValue();
    if (assetCode) {
        console.log("Printing asset code:", assetCode);
        var printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Print Asset Code</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        margin-top: 10px;
                    }
                    h1 {
                        font-size: 14px;
                    }
                    p {
                        font-size: 10px;
                    }
                    @media print {
                        @page {
                            margin: 0;
                        }
                        body {
                            margin: 1.6cm;
                        }
                    }
                </style>
            </head>
                <body>
                    <h1>Asset Code</h1>
                    <p>${assetCode}</p>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    } else {
        console.error("No asset code found to print.");
    }
}
