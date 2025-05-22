const MAX_IMAGES = 10; // Define the maximum number of images allowed
const MESSAGE_TIMEOUT = 4000; // 2 seconds

// Helper function to display messages with a timeout
function displayMessage(container, messageHTML, messageType) {
    container.innerHTML = `<p class="${messageType}-message">${messageHTML}</p>`;
    setTimeout(() => {
        container.innerHTML = '';
    }, MESSAGE_TIMEOUT);
}

// --- NEW: Function to reset the application UI ---
function resetAppUI() {
    const previewsContainer = document.getElementById("imagePreviews");
    previewsContainer.innerHTML = ''; // Clear all image boxes

    // Clear any active messages (though displayMessage's timeout should handle it)
    uploadMessageContainer.innerHTML = '';

    document.getElementById("imageUpload").value = ''; // Reset file input

    downloadLink.style.display = "none"; // Hide download link

    convertBtn.style.display = "inline-block"; // Show Convert PDF button
    clearImagesBtn.style.display = "none"; // Hide Clear All button

    updateFileSelectContainerLayout(); // Update layout to initial state (show Choose Files button)
}

// Function to update the layout of fileSelectContainer based on content
function updateFileSelectContainerLayout() {
    const fileSelectContainer = document.getElementById("fileSelectContainer");
    const chooseFileButton = document.getElementById("chooseFileButton");
    const imagePreviews = document.getElementById("imagePreviews");
    const imageUploadInput = document.getElementById("imageUpload");
    const uploadMessageContainer = document.getElementById("uploadMessageContainer"); // Get message container

    // Check if there are any actual image boxes
    const currentImageBoxes = imagePreviews.querySelectorAll('.imageBox').length;

    // Clear any previous warning messages when the layout updates
    uploadMessageContainer.innerHTML = '';

    if (currentImageBoxes > 0) {
        // If images are present, hide the initial 'Choose Files' button, align container to start
        chooseFileButton.style.display = "none";
        fileSelectContainer.style.justifyContent = "flex-start";
        fileSelectContainer.style.alignItems = "flex-start";
        imagePreviews.style.overflowY = "auto"; // Enable scrolling for previews

        // --- NEW/UPDATED LOGIC FOR '+' BUTTON APPEARANCE/DISAPPEARANCE ---
        const existingAddMoreBox = imagePreviews.querySelector('.addMoreBox');
        if (currentImageBoxes < MAX_IMAGES) {
            // If below max images, ensure the '+' button is present
            if (!existingAddMoreBox) {
                const addMoreBox = document.createElement("div");
                addMoreBox.className = "addMoreBox";
                addMoreBox.innerHTML = '<span class="material-symbols-outlined add-icon">add</span>';
                addMoreBox.addEventListener('click', () => {
                    document.getElementById("imageUpload").click();
                });
                imagePreviews.appendChild(addMoreBox);
            }
            // If it exists but might be out of order (e.g., if images were cleared and re-added)
            // or if a cleared image made it no longer the last child
            else if (imagePreviews.lastChild !== existingAddMoreBox) {
                imagePreviews.appendChild(existingAddMoreBox); // Move it to the end
            }
        } else {
            // If at or above max images, ensure the '+' button is removed
            if (existingAddMoreBox) {
                existingAddMoreBox.remove();
            }
            // Display message only if exactly at max, not if currentImageBoxes somehow > MAX_IMAGES (shouldn't happen with logic)
            if (currentImageBoxes === MAX_IMAGES) {
                uploadMessageContainer.innerHTML = `<p class="warning-message">You have reached the maximum of ${MAX_IMAGES} images.</p>`;
            }
        }
        // --- END NEW/UPDATED LOGIC ---
        // Show the "Clear All Images" button when there's at least one image
        convertBtn.style.display = "inline-block";
        clearImagesBtn.style.display = "inline-block";
        downloadLink.style.display = "none"; // Hide download link until PDF is created

    } else {
        // If no images, show the initial 'Choose Files' button, center container
        chooseFileButton.style.display = "block";
        fileSelectContainer.style.justifyContent = "center";
        fileSelectContainer.style.alignItems = "center";
        imagePreviews.style.overflowY = "hidden"; // Hide scrollbar if no content

        // Additionally, remove the add more box if no images are left and it's still there
        const existingAddMoreBox = imagePreviews.querySelector('.addMoreBox');
        if (existingAddMoreBox) {
            existingAddMoreBox.remove();
        }

        // Crucially, reset the file input's value ONLY when all images are cleared.
        // This allows the user to re-select the same file later.
        imageUploadInput.value = '';

        // Hide the "Clear All Images" button when no images are present
        clearImagesBtn.style.display = "none";
        downloadLink.style.display = "none";
    }
}


document.getElementById("chooseFileButton").addEventListener("click", () => {
    document.getElementById("imageUpload").click();
});

document.getElementById("imageUpload").addEventListener("change", (event) => {
    const files = event.target.files;
    const previewsContainer = document.getElementById("imagePreviews");
    const uploadMessageContainer = document.getElementById("uploadMessageContainer");

    // Clear any previous messages before processing new files
    uploadMessageContainer.innerHTML = '';

    if (!files.length) {
        // If no files were selected (e.g., user opened dialog and cancelled)
        updateFileSelectContainerLayout(); // Recalculate layout
        return;
    }

    const currentImageCount = previewsContainer.querySelectorAll('.imageBox').length;
    const allSelectedFiles = Array.from(files);

    // --- NEW: Strict File Type Validation ---
    const areAllFilesImages = allSelectedFiles.every(file => file.type.startsWith('image/'));

    if (!areAllFilesImages) {
        displayMessage(
            uploadMessageContainer,
            "Please select only image files (e.g., JPEG, PNG, etc.,).",
            "warning"
        );

        setTimeout(() => {
            event.target.value = '';
            updateFileSelectContainerLayout();
        }, MESSAGE_TIMEOUT + 500);
        return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB max size per file
    const areAllFilesValidSize = allSelectedFiles.every(file => file.size <= maxSize);

    if (!areAllFilesValidSize) {
        displayMessage(
            uploadMessageContainer,
            "File size must be 5MB or less.",
            "warning"
        );

        setTimeout(() => {
            event.target.value = '';
            updateFileSelectContainerLayout();
        }, MESSAGE_TIMEOUT + 500);
        return;
    }
    // --- END NEW: Strict File Type Validation ---

    const remainingSlots = MAX_IMAGES - currentImageCount;

    // Check if adding all selected files would exceed the limit
    if (currentImageCount + allSelectedFiles.length > MAX_IMAGES) {
        const excessFiles = allSelectedFiles.length - remainingSlots;
        uploadMessageContainer.innerHTML = `<p class="warning-message">You selected ${allSelectedFiles.length} image(s). You can only add ${remainingSlots} more. The first ${remainingSlots} images will be added.</p>`;
        // Truncate the files array to only add allowed number of images
        const limitedFiles = allSelectedFiles.slice(0, remainingSlots);
        processFiles(limitedFiles, previewsContainer, uploadMessageContainer); // Process only the allowed files
    } else {
        processFiles(allSelectedFiles, previewsContainer, uploadMessageContainer); // Process all selected files
    }

    // Reset the file input's value immediately after processing
    // This allows selecting the same files again if needed later.
    event.target.value = '';
});

// Helper function to process files and add them to the preview
function processFiles(filesToProcess, previewsContainer, uploadMessageContainer) {
    const existingAddMoreBox = previewsContainer.querySelector('.addMoreBox');
    if (existingAddMoreBox) {
        existingAddMoreBox.remove();
    }

    // Process new files - Using a promise-based approach to ensure addMoreBox is added after ALL images are processed
    const imageLoadPromises = filesToProcess.map(file => { // Use filesToProcess here
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const imgBox = document.createElement("div");
                imgBox.className = "imageBox";

                const img = document.createElement("img");
                img.src = e.target.result;
                img.alt = "Preview";
                img.dataset.rotation = "0";

                const controls = document.createElement("div");
                controls.className = "rotationControls";

                const rotateLeft = document.createElement("button");
                rotateLeft.innerHTML = '<span class="material-symbols-outlined">rotate_left</span>';
                rotateLeft.className = "rotateBtn";
                rotateLeft.onclick = () => rotateImage(img, -90);

                const rotateRight = document.createElement("button");
                rotateRight.innerHTML = '<span class="material-symbols-outlined">rotate_right</span>';
                rotateRight.className = "rotateBtn";
                rotateRight.onclick = () => rotateImage(img, 90);

                const clearBtn = document.createElement("button");
                clearBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
                clearBtn.className = "clearBtn";
                clearBtn.onclick = () => {
                    imgBox.remove(); // Remove the image box
                    updateFileSelectContainerLayout(); // Update layout after removal
                    // Clear any warning messages if we remove an image and are no longer at MAX_IMAGES
                    if (previewsContainer.querySelectorAll('.imageBox').length < MAX_IMAGES) {
                        uploadMessageContainer.innerHTML = '';
                    }
                };

                controls.appendChild(rotateLeft);
                controls.appendChild(rotateRight);
                controls.appendChild(clearBtn);

                imgBox.appendChild(img);
                imgBox.appendChild(controls);

                previewsContainer.appendChild(imgBox);
                resolve(); // Resolve the promise once the imageBox is appended
            };
            reader.readAsDataURL(file);
        });
    });

    // Use Promise.all to ensure all image loading and appending is complete
    Promise.all(imageLoadPromises).then(() => {
        // After ALL images from the current selection are processed and appended,
        // then update the layout, which will handle adding the "+" button if needed.
        updateFileSelectContainerLayout();
    });
}


// Initial layout update when the page loads (or script runs)
document.addEventListener('DOMContentLoaded', updateFileSelectContainerLayout);


document.getElementById("convertBtn").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    const imageElements = document.querySelectorAll("#imagePreviews .imageBox img");


    const uploadMessageContainer = document.getElementById("uploadMessageContainer"); // Get the message container

    // Clear any previous messages before starting PDF generation
    uploadMessageContainer.innerHTML = '';

    if (!imageElements.length) {
        uploadMessageContainer.innerHTML = '<p class="warning-message">Please select at least one image to convert.</p>';

        return;
    }

    const loadImage = (imgEl) =>
        new Promise((resolve) => {
            const image = new Image();
            image.src = imgEl.src;
            image.onload = () => {
                resolve({
                    img: image,
                    rotation: parseInt(imgEl.dataset.rotation || "0", 10),
                });
            };
        });

    (async () => {
        try { // Added try-catch for better error handling during PDF creation
            for (let i = 0; i < imageElements.length; i++) {
                const { img, rotation } = await loadImage(imageElements[i]);

                // Create canvas and apply rotation
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                // Determine new canvas size after rotation
                const angle = rotation % 360;
                const radians = (angle * Math.PI) / 180;
                const is90or270 = angle % 180 !== 0;

                canvas.width = is90or270 ? img.height : img.width;
                canvas.height = is90or270 ? img.width : img.height;

                // Translate and rotate context
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(radians);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);

                // Add to PDF
                const imgData = canvas.toDataURL("image/jpeg", 1.0);
                if (i > 0) pdf.addPage();

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgAspect = canvas.width / canvas.height;

                let width = pdfWidth * 0.9;
                let height = width / imgAspect;
                if (height > pdfHeight * 0.9) {
                    height = pdfHeight * 0.9;
                    width = height * imgAspect;
                }

                const x = (pdfWidth - width) / 2;
                const y = (pdfHeight - height) / 2;

                pdf.addImage(imgData, "JPEG", x, y, width, height);
            }

            // Save PDF
            const pdfBlob = pdf.output("blob");
            const url = URL.createObjectURL(pdfBlob);
            const downloadLink = document.getElementById("downloadLink");
            downloadLink.href = url;
            downloadLink.download = "converted.pdf";
            downloadLink.textContent = "Download PDF";
            downloadLink.style.display = "inline-block";
            convertBtn.style.display = "none";
            clearImagesBtn.style.display = "inline-block";

            displayMessage(uploadMessageContainer, "PDF successfully created! Please download it by clicking on the **Download PDF** button.", "success");

            // Remove any previous click listeners to prevent duplicates
            downloadLink.removeEventListener('click', handleDownloadClick);
            // Add a new click listener for download completion message
            downloadLink.addEventListener('click', handleDownloadClick);

        } catch (error) {
            console.error("Error creating PDF:", error);
            displayMessage(uploadMessageContainer, "Error creating PDF. Please try again.", "warning");
            // Re-enable convert button in case of error
            convertBtn.disabled = false;
            convertBtn.textContent = "Create PDF";
            convertBtn.style.backgroundColor = "#2ecc71";

            downloadLink.style.display = "none"; // Hide download link on error

        }

    })();
});

// Define the handler function for download link click
function handleDownloadClick() {
    const uploadMessageContainer = document.getElementById("uploadMessageContainer");
    displayMessage(uploadMessageContainer, "PDF Downloaded Successfully!", "success");

    // 2. Immediately trigger the "Clear All Images" functionality
    // This will clear previews, hide download/clear buttons, show choose files button
    setTimeout(() => {
        resetAppUI();
    }, MESSAGE_TIMEOUT);
}

function rotateImage(img, degrees) {
    let currentRotation = parseInt(img.dataset.rotation || "0", 10);
    currentRotation = (currentRotation + degrees + 360) % 360;
    img.dataset.rotation = currentRotation.toString();
    img.style.transform = `rotate(${currentRotation}deg)`;
}


// Clear All Images button event
document.getElementById("clearImagesBtn").addEventListener("click", () => {
    const previewsContainer = document.getElementById("imagePreviews");
    previewsContainer.innerHTML = ''; // Clear all image boxes

    // Optionally reset any other UI elements like the upload message
    const uploadMessageContainer = document.getElementById("uploadMessageContainer");
    uploadMessageContainer.innerHTML = '';

    // Reset file input to allow the same files to be selected again
    document.getElementById("imageUpload").value = '';

    // Hide the "Download PDF" button after clearing images
    const downloadLink = document.getElementById("downloadLink");
    downloadLink.style.display = "none";

    // Reset button visibility: show "Create PDF" button, hide "Clear All Images"
    convertBtn.style.display = "inline-block";
    clearImagesBtn.style.display = "none";

    // Update the layout after clearing the images
    updateFileSelectContainerLayout();
});