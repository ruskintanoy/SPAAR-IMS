// AssetFormLoad.js

let initialAssetCode = null;
let initialCategory = null;
let initialCategoryName = null; // Track initial category name for logs

function onLoadAssetForm(executionContext) {
    console.log("onLoadAssetForm function called");

    var formContext = executionContext.getFormContext();
    var assetCodeAttribute = formContext.getAttribute("cr4d3_assetcode");
    var categoryNameAttribute = formContext.getAttribute("cr4d3_category");

    // Capture initial Asset Code, Category ID, and Category Name if the asset already exists
    if (assetCodeAttribute && categoryNameAttribute) {
        initialAssetCode = assetCodeAttribute.getValue();
        var categoryValue = categoryNameAttribute.getValue();
        if (categoryValue && categoryValue.length > 0) {
            initialCategory = categoryValue[0].id.replace("{", "").replace("}", "");
            initialCategoryName = categoryValue[0].name; // Get the category name

            // Store the initial category and asset code to track changes
            originalCategoryId = initialCategory;
            originalAssetCode = initialAssetCode;
            originalCategoryName = initialCategoryName;
            console.log("Initial category: ", initialCategoryName, " (ID: ", originalCategoryId, ")");
            console.log("Initial asset code:", originalAssetCode);
        }
    }

    // Attach event handler for when the Category changes (onChange)
    formContext.getAttribute("cr4d3_category").addOnChange(onFieldChange);
}
