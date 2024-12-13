// ==UserScript==
// @name        Download Images from JupyterLab
// @namespace   https://github.com/alberti42/
// @match       http://*/lab/*
// @match       https://*/lab/*
// @grant       none
// @version     1.4
// @author      Andrea Alberti
// @description Handle image and SVG downloads in JupyterLab
// ==/UserScript==

const RETRY_INTERVAL_MS = 500; // Time between retries in milliseconds
const MAX_RETRIES = 40; // Maximum number of retries

// Function to create and append a button
function addDownloadButton(divElement) {
    if (divElement.querySelector('.download-image-button')) {
        return; // Avoid duplicates
    }

    // Ensure the parent div has `position: relative` for absolute positioning of the button
    divElement.style.position = 'relative';

    // Retrieve the <img> element and its src attribute
    const imgElement = divElement.querySelector('img');
    if (!imgElement || !imgElement.src) {
        console.warn('No <img> element with a valid src found inside this div.');
        return;
    }

    // Determine MIME type from the `data-mime-type` attribute
    const mimeType = divElement.getAttribute('data-mime-type');
    if (!mimeType) {
        console.warn('No data-mime-type attribute found on this div.');
        return;
    }

    // Create the button element
    const button = document.createElement('button');
    button.className = 'download-image-button';
    button.style.position = 'absolute'; // Absolute positioning
    button.style.top = '5px'; // Place near the top
    button.style.right = '5px'; // Place it on the right border
    button.style.border = 'none'; // Optional: Remove border for a cleaner look
    button.style.backgroundColor = 'transparent'; // Optional: Transparent background
    button.style.padding = '5px'; // Optional: Add some padding for a better click target
    button.style.cursor = 'pointer'; // Show pointer cursor on hover

    // Add a Font Awesome icon to the button
    const icon = document.createElement('i');
    icon.className = 'fas fa-download'; // Font Awesome class for a download icon
    icon.style.fontSize = '1.2em'; // Adjust icon size
    icon.style.color = '#007bff'; // Optional: Add a color to the icon

    button.appendChild(icon);

    // Attach an event listener to the button
    button.addEventListener('click', () => {
        // Check if the data is base64-encoded
        const isBase64 = imgElement.src.startsWith(`data:${mimeType};base64,`);

        // Check if the data is percent-encoded
        const isPercentEncoded = imgElement.src.startsWith(`data:${mimeType},`);

        if (isPercentEncoded || isBase64) {

            // Extract the content after the comma
            const content = imgElement.src.split(',')[1];

            // Decode the content based on the encoding type
            const decodedContent = isBase64 ? atob(content) : decodeURIComponent(content);

            // Log the decoded content (for debugging purposes)
            console.log(decodedContent);

            // Create a Blob for the decoded content
            const blob = new Blob(
                isBase64
                    ? [Uint8Array.from(decodedContent, char => char.charCodeAt(0))]
                    : [decodedContent],
                { type: mimeType }
            );

            // Create a temporary link element
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `plot.${mimeType.split('/')[1]}`; // Use MIME type to determine file extension
            document.body.appendChild(link); // Append to body for the click event
            link.click(); // Trigger the download
            document.body.removeChild(link); // Clean up
        } else {
            console.error(`Image source does not match expected MIME type or encoding: ${mimeType}`);
        }
    });


    // Append the button to the div
    divElement.appendChild(button);
}

// Function to process all existing image and SVG elements
function processExistingElements() {
    const divElements = document.querySelectorAll('.jp-RenderedSVG, .jp-RenderedImage');
    divElements.forEach(divElement => addDownloadButton(divElement));
}

// Mutation Observer callback
function observeElements(mutationsList) {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                // Check the descendants of the node for image and SVG containers
                if (node.querySelectorAll) {
                    const divElements = node.querySelectorAll('.jp-RenderedSVG, .jp-RenderedImage');
                    divElements.forEach(divElement => addDownloadButton(divElement));
                }
            });
        }
    }
}

// Function to set up the observer
function setupObserver(notebookContainer) {
    console.log('Setting up observer...');
    const observer = new MutationObserver(observeElements);
    observer.observe(notebookContainer, { childList: true, subtree: true });
    console.log('Observer set up successfully');
}

// Function to retry finding the notebook container
function waitForNotebookContainer(retriesLeft) {
    const notebookContainer = document.querySelector('.jp-Notebook');
    if (notebookContainer) {
        processExistingElements();
        setupObserver(notebookContainer);
    } else if (retriesLeft > 0) {
        console.log(`Retrying... (${retriesLeft} retries left)`);
        setTimeout(() => waitForNotebookContainer(retriesLeft - 1), RETRY_INTERVAL_MS);
    } else {
        console.error('Notebook container not found after maximum retries');
    }
}

// Initialize the script
function initialize() {
    console.log('Initializing script...');
    waitForNotebookContainer(MAX_RETRIES);
}

// Run the initialization when the DOM is fully loaded
window.addEventListener('load', initialize);
