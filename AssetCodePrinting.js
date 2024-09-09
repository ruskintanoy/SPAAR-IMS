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

        // Wait for the print window to fully load before triggering print
        printWindow.focus();
        printWindow.print();

        // Implement a timeout to check if the print window is closed
        var printCheckInterval = setInterval(function () {
            if (printWindow.closed) {
                console.log("Print window closed.");
                clearInterval(printCheckInterval);
                // Restore functionality in your app or perform any necessary cleanup here
            }
        }, 500);

        // Ensure the window is closed after printing or if the user directly closes the tab
        printWindow.onafterprint = function () {
            console.log("Print action completed.");
            printWindow.close();
            clearInterval(printCheckInterval); // Clear the interval if the window is closed properly
        };
    } else {
        console.error("No asset code found to print.");
    }
}
