// AssetOnSave.js

function onSaveAssetForm(executionContext) {
    console.log("Saving asset form...");

    var formContext = executionContext.getFormContext();
    var assetId = formContext.data.entity.getId(); // Get the record ID

    // Define the dialog options for visual appeal
    var alertOptions = {
        height: 240,
        width: 180
    };

    // Define message for new or updated asset
    var successMessage = {};

    // If assetId exists, it's an update, otherwise, it's a new record
    if (assetId) {
        successMessage = {
            title: "✅ Asset Updated",
            text: "Asset updated successfully.\nThe asset record has been modified and saved."
        };
        console.log("Asset updated.");
    } else {
        successMessage = {
            title: "✅ Asset Created",
            text: "New asset created.\nThe asset record has been added to the system."
        };
        console.log("New asset created.");
    }

    // Show the alert dialog with improved message
    var alertStrings = { confirmButtonLabel: "OK", title: successMessage.title, text: successMessage.text };

    Xrm.Navigation.openAlertDialog(alertStrings, alertOptions).then(
        function success() {
            console.log("Dialog closed.");
        },
        function error() {
            console.error("Error closing dialog.");
        }
    );
}
