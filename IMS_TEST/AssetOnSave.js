// AssetOnSave.js

function onSaveAssetForm(executionContext) {
    console.log("onSaveAssetForm function called");

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
            text: "Asset updated successfully.\n\nThe asset record has been modified and saved.\n"
        };
    } else {
        successMessage = {
            title: "✅ Asset Updated",
            text: "New asset created.\n\nThe asset record has been successfully added to the system.\n"
        };
    }

    // Show the alert dialog with improved message and customized message
    var alertStrings = { confirmButtonLabel: "OK", title: successMessage.title, text: successMessage.text };

    Xrm.Navigation.openAlertDialog(alertStrings, alertOptions).then(
        function success() {
            console.log("Dialog closed successfully.");
        },
        function error() {
            console.error("Dialog failed to close.");
        }
    );
}
