function checkInventoryQuantity(executionContext) {
    var formContext = executionContext.getFormContext();
    var availableField = formContext.getAttribute("new_available"); // Use the logical name for the available field
    var modelNameField = formContext.getAttribute("cr4d3_modelname"); // Replace with your actual model name field logical name

    if (modelNameField) {
        var modelName = modelNameField.getValue();

        // Only proceed if the model name is not null, undefined, or an empty string
        if (modelName !== null && modelName !== undefined && modelName.trim() !== "") {
            if (availableField) {
                var availableQuantity = availableField.getValue();
                var iframeControl = formContext.getControl("WebResource_WarningMessage"); // Use the name of the HTML web resource control

                if (iframeControl) {
                    iframeControl.getContentWindow().then(function(contentWindow) {
                        var warningDiv = contentWindow.document.getElementById("warning-message");

                        if (warningDiv) {
                            // Display the warning only if availableQuantity is less than 2
                            if (availableQuantity < 2) {
                                warningDiv.style.display = "block";
                            } else {
                                warningDiv.style.display = "none";
                            }
                        } else {
                            console.log("Warning message element not found.");
                        }
                    }).catch(function(error) {
                        console.log("Error accessing web resource content: " + error.message);
                    });
                } else {
                    console.log("Web Resource control not found.");
                }
            } else {
                console.log("Available field not found.");
            }
        }
    } else {
        console.log("Model Name field not found.");
    }
}

function onLoad(executionContext) {
    checkInventoryQuantity(executionContext);
}
