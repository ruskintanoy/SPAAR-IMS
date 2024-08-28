let initialStatus = null; // To store the initial status GUID

function onLoadAssetFormStatus(executionContext) {
    console.log("onLoadAssetFormStatus function called");

    var formContext = executionContext.getFormContext();
    var statusAttribute = formContext.getAttribute("cr4d3_status");

    // Capture initial Status ID
    if (statusAttribute) {
        var statusValue = statusAttribute.getValue();
        if (statusValue && statusValue.length > 0) {
            initialStatus = statusValue[0].id.replace("{", "").replace("}", "");
        }

        console.log("Initial status:", initialStatus);

        // Attach event handler for status change detection
        statusAttribute.addOnChange(onStatusChange);
    }

    // Call the function to manage the Previous Status logic
    managePreviousStatus(formContext);
}

function managePreviousStatus(formContext) {
    console.log("managePreviousStatus function called");

    // Get the current value of the Device Status lookup field (assuming single value lookup)
    var currentStatusLookup = formContext.getAttribute("cr4d3_status").getValue();

    // Initialize currentStatus as an empty string
    var currentStatus = "";

    // Extract the GUID from the lookup value if it's not null
    if (currentStatusLookup !== null && currentStatusLookup.length > 0) {
        currentStatus = currentStatusLookup[0].id; // Extracting the GUID
        currentStatus = currentStatus.replace("{", "").replace("}", ""); // Remove curly brackets
        currentStatus = currentStatus.toLowerCase(); // Convert to lowercase
    }

    // Get the value of the Previous Status
    var previousStatus = formContext.getAttribute("new_previousstatus").getValue();

    // If Previous Status is not already set or differs from the current status, populate it
    if (previousStatus === null || previousStatus === "" || previousStatus !== currentStatus) {
        formContext.getAttribute("new_previousstatus").setValue(currentStatus);
        console.log("Previous status updated to:", currentStatus);
    }
}

function onStatusChange(executionContext) {
    console.log("onStatusChange function called");

    var formContext = executionContext.getFormContext();
    var statusAttribute = formContext.getAttribute("cr4d3_status");
    var previousStatusAttribute = formContext.getAttribute("new_previousstatus");

    if (!statusAttribute || !previousStatusAttribute) {
        console.error("Status or Previous Status attribute not found.");
        return;
    }

    // Get the current status value
    var currentStatusLookup = statusAttribute.getValue();
    var currentStatus = "";

    if (currentStatusLookup !== null && currentStatusLookup.length > 0) {
        currentStatus = currentStatusLookup[0].id.replace("{", "").replace("}", "").toLowerCase();
    }

    // If the status is changed back to the initial value, do nothing
    if (currentStatus === initialStatus) {
        console.log("Status unchanged, skipping update to Previous Status.");
        return;
    }

    // If the Previous Status is already set to the current status, do nothing
    if (previousStatusAttribute.getValue() === currentStatus) {
        console.log("Previous status is already set to the current status, no update needed.");
        return;
    }

    // Otherwise, update the Previous Status field
    previousStatusAttribute.setValue(currentStatus);
    console.log("Previous status updated to:", currentStatus);
}

function beforeFormSubmitStatus(executionContext) {
    var formContext = executionContext.getFormContext();

    // Call managePreviousStatus before submitting the form to ensure Previous Status is updated
    managePreviousStatus(formContext);
}
