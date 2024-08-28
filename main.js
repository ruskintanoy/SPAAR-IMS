function registerEvents(executionContext) {
    var formContext = executionContext.getFormContext();

    // Register events for asset code management
    formContext.ui.addOnLoad(onLoadAssetFormAssetCode); // Handles asset code logic
    formContext.data.entity.addOnSave(onSaveAssetFormAssetCode); // Handles asset code generation and saving logic

    // Register events for status management
    formContext.ui.addOnLoad(onLoadAssetFormStatus); // Handles status logic
    formContext.data.entity.addOnSave(beforeFormSubmitStatus); // Ensures Previous Status is updated before saving
}
