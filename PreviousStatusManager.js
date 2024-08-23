function onFormLoad(executionContext) {
    var formContext = executionContext.getFormContext();

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
    }
}

function beforeFormSubmit(executionContext) {
    var formContext = executionContext.getFormContext();

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

    // Ensure the Previous Status is stored before the form is saved
    formContext.getAttribute("new_previousstatus").setValue(currentStatus);
}

// Register the functions on form load and before form submit events
function registerEvents(executionContext) {
    var formContext = executionContext.getFormContext();
    formContext.ui.addOnLoad(onFormLoad);
    formContext.data.entity.addOnSave(beforeFormSubmit);
}
