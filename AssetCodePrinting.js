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

        // Focus the print window to ensure it loads properly
        printWindow.focus();

        // Set a flag to track whether the print dialog was used
        var printActionTriggered = false;

        // Trigger the print dialog
        printWindow.print();

        // Detect when the print dialog is closed, or the print window is closed
        printWindow.onafterprint = function () {
            console.log("Print action completed.");
            printActionTriggered = true;
            printWindow.close();
        };

        // Check if the window was closed directly without printing
        var printCheckInterval = setInterval(function () {
            if (printWindow.closed) {
                console.log("Print window closed directly by the user.");
                clearInterval(printCheckInterval);

                if (!printActionTriggered) {
                    console.log("Print dialog was bypassed (window closed directly).");
                    // Perform necessary cleanup actions if the window was closed directly
                }
            }
        }, 500);

        // Event listener to catch the direct closure of the window
        printWindow.onbeforeunload = function () {
            clearInterval(printCheckInterval);
            console.log("Print window unloaded or closed.");
        };
    } else {
        console.error("No asset code found to print.");
    }
}
