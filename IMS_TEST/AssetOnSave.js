// AssetOnSave.js

function onSaveAssetForm(executionContext) {
    console.log("onSaveAssetForm function called");

    var formContext = executionContext.getFormContext();
    var assetId = formContext.data.entity.getId(); // Get the record ID

    // Define the dialog options for visual appeal
    var alertOptions = {
        height: 200,
        width: 450
    };

    // Define message for new or updated asset
    var successMessage = "";

    // If assetId exists, it's an update, otherwise, it's a new record
    if (assetId) {
        successMessage = {
            title: "✅ Asset Updated",
            message: "The asset record has been updated successfully!"
        };
    } else {
        successMessage = {
            title: "✅ Asset Created",
            message: "The asset record has been created successfully!"
        };
    }

    // Show the alert dialog with icons and customized message
    Xrm.Navigation.openAlertDialog(successMessage, alertOptions);
}
