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

function managePreviousFields(formContext) {
    console.log("managePreviousFields function called");

    // Handle Previous Status
    managePreviousStatus(formContext);

    // Handle Previous Model
    var currentModelLookup = formContext.getAttribute("cr4d3_model").getValue();
    var currentModel = currentModelLookup ? currentModelLookup[0].id.replace("{", "").replace("}", "").toLowerCase() : "";
    var previousModel = formContext.getAttribute("new_previousmodel").getValue();

    if (!previousModel || previousModel !== currentModel) {
        formContext.getAttribute("new_previousmodel").setValue(currentModel);
        console.log("Previous model updated to:", currentModel);
    }

    // Handle Previous Category
    var currentCategoryLookup = formContext.getAttribute("cr4d3_category").getValue();
    var currentCategory = currentCategoryLookup ? currentCategoryLookup[0].id.replace("{", "").replace("}", "").toLowerCase() : "";
    var previousCategory = formContext.getAttribute("new_previouscategory").getValue();

    if (!previousCategory || previousCategory !== currentCategory) {
        formContext.getAttribute("new_previouscategory").setValue(currentCategory);
        console.log("Previous category updated to:", currentCategory);
    }

    // Handle Previous User
    var currentUserLookup = formContext.getAttribute("new_assignedto").getValue();
    var currentUser = currentUserLookup ? currentUserLookup[0].id.replace("{", "").replace("}", "").toLowerCase() : "";
    var previousUser = formContext.getAttribute("new_previoususer").getValue();

    if (!previousUser || previousUser !== currentUser) {
        formContext.getAttribute("new_previoususer").setValue(currentUser);
        console.log("Previous user updated to:", currentUser);
    }
}
