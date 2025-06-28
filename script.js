class ImageToPdfConverter {
    constructor() {
        this.images = [];
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.uploadZone = document.getElementById('uploadZone');
        this.imageUpload = document.getElementById('imageUpload');
        this.imagePreviews = document.getElementById('imagePreviews');
        this.convertBtn = document.getElementById('convertBtn');
        this.downloadLink = document.getElementById('downloadLink');
        this.clearImagesBtn = document.getElementById('clearImagesBtn');
    }

    bindEvents() {
        // File upload events
        this.uploadZone.addEventListener('click', () => this.imageUpload.click());
        this.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadZone.classList.add('drag-over');
        });
        this.uploadZone.addEventListener('dragleave', () => {
            this.uploadZone.classList.remove('drag-over');
        });
        this.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadZone.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });

        this.imageUpload.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFiles(files);
        });

        // Button events
        this.convertBtn.addEventListener('click', () => this.convertToPdf());
        this.clearImagesBtn.addEventListener('click', () => this.clearAll());
        this.downloadLink.addEventListener('click', () => this.downloadPdf());
    }

    handleFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            this.showMessage('Please select only image files.', 'warning');
            return;
        }

        if (this.images.length + imageFiles.length > 10) {
            this.showMessage('Maximum 10 images allowed.', 'warning');
            return;
        }

        imageFiles.forEach(file => {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                this.showMessage(`${file.name} is too large. Maximum size is 5MB.`, 'warning');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = {
                    file: file,
                    url: e.target.result,
                    name: file.name,
                    rotation: 0
                };
                this.images.push(imageData);
                this.renderImageItem(imageData);
                this.updateUI();
            };
            reader.readAsDataURL(file);
        });

        this.imageUpload.value = '';
    }

    renderImageItem(imageData) {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        imageItem.innerHTML = `
            <div class="image-preview">
                <img src="${imageData.url}" alt="${imageData.name}" style="transform: rotate(${imageData.rotation}deg)">
                <div class="image-controls">
                    <button class="rotate-btn" onclick="imageConverter.rotateImage(this, ${this.images.length - 1})">🔄</button>
                    <button class="remove-btn" onclick="imageConverter.removeImage(${this.images.length - 1})">✕</button>
                </div>
            </div>
            <div class="image-info">
                <span class="image-name">${imageData.name}</span>
                <span class="image-size">${this.formatFileSize(imageData.file.size)}</span>
            </div>
        `;
        this.imagePreviews.appendChild(imageItem);
    }

    rotateImage(button, index) {
        const imageData = this.images[index];
        imageData.rotation = (imageData.rotation + 90) % 360;
        const img = button.closest('.image-preview').querySelector('img');
        img.style.transform = `rotate(${imageData.rotation}deg)`;
    }

    removeImage(index) {
        this.images.splice(index, 1);
        this.updateImageList();
        this.updateUI();
    }

    updateImageList() {
        this.imagePreviews.innerHTML = '';
        this.images.forEach((imageData, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.innerHTML = `
                <div class="image-preview">
                    <img src="${imageData.url}" alt="${imageData.name}" style="transform: rotate(${imageData.rotation}deg)">
                    <div class="image-controls">
                        <button class="rotate-btn" onclick="imageConverter.rotateImage(this, ${index})">🔄</button>
                        <button class="remove-btn" onclick="imageConverter.removeImage(${index})">✕</button>
                    </div>
                </div>
                <div class="image-info">
                    <span class="image-name">${imageData.name}</span>
                    <span class="image-size">${this.formatFileSize(imageData.file.size)}</span>
                </div>
            `;
            this.imagePreviews.appendChild(imageItem);
        });
    }

    updateUI() {
        if (this.images.length > 0) {
            this.convertBtn.style.display = 'inline-block';
            this.clearImagesBtn.style.display = 'inline-block';
            this.downloadLink.style.display = 'none';
        } else {
            this.convertBtn.style.display = 'none';
            this.clearImagesBtn.style.display = 'none';
            this.downloadLink.style.display = 'none';
        }
    }

    async convertToPdf() {
        if (this.images.length === 0) {
            this.showMessage('Please add some images first.', 'warning');
            return;
        }

        this.convertBtn.textContent = 'Creating PDF...';
        this.convertBtn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();

            for (let i = 0; i < this.images.length; i++) {
                const imageData = this.images[i];
                
                // Create a canvas to handle rotation
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                await new Promise((resolve) => {
                    img.onload = () => {
                        // Calculate dimensions after rotation
                        const isRotated = imageData.rotation === 90 || imageData.rotation === 270;
                        const imgWidth = isRotated ? img.height : img.width;
                        const imgHeight = isRotated ? img.width : img.height;
                        
                        // Set canvas size
                        canvas.width = imgWidth;
                        canvas.height = imgHeight;
                        
                        // Rotate and draw image
                        ctx.save();
                        ctx.translate(canvas.width / 2, canvas.height / 2);
                        ctx.rotate((imageData.rotation * Math.PI) / 180);
                        ctx.drawImage(img, -img.width / 2, -img.height / 2);
                        ctx.restore();
                        
                        resolve();
                    };
                    img.src = imageData.url;
                });

                // Add page to PDF
                if (i > 0) {
                    pdf.addPage();
                }

                // Calculate dimensions to fit on page
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const margin = 20;
                const maxWidth = pageWidth - (2 * margin);
                const maxHeight = pageHeight - (2 * margin);

                let imgWidth = canvas.width;
                let imgHeight = canvas.height;

                // Scale to fit page
                const scaleX = maxWidth / imgWidth;
                const scaleY = maxHeight / imgHeight;
                const scale = Math.min(scaleX, scaleY);

                imgWidth *= scale;
                imgHeight *= scale;

                // Center image on page
                const x = (pageWidth - imgWidth) / 2;
                const y = (pageHeight - imgHeight) / 2;

                pdf.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', x, y, imgWidth, imgHeight);
            }

            // Create download link
            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            
            this.downloadLink.href = url;
            this.downloadLink.download = 'converted-images.pdf';
            this.downloadLink.style.display = 'inline-block';
            
            this.convertBtn.textContent = 'Create PDF';
            this.convertBtn.disabled = false;
            
            this.showMessage('PDF created successfully!', 'success');

        } catch (error) {
            console.error('Error creating PDF:', error);
            this.showMessage('Error creating PDF. Please try again.', 'error');
            this.convertBtn.textContent = 'Create PDF';
            this.convertBtn.disabled = false;
        }
    }

    downloadPdf() {
        // The download is handled by the anchor tag
        // Clean up the blob URL after download
        setTimeout(() => {
            URL.revokeObjectURL(this.downloadLink.href);
        }, 1000);
    }

    clearAll() {
        this.images = [];
        this.imagePreviews.innerHTML = '';
        this.updateUI();
        this.showMessage('All images cleared.', 'info');
    }

    showMessage(message, type) {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}-message`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

        // Set background color based on message type
        switch (type) {
            case 'success':
                messageEl.style.backgroundColor = '#4CAF50';
                break;
            case 'warning':
                messageEl.style.backgroundColor = '#FF9800';
                break;
            case 'error':
                messageEl.style.backgroundColor = '#F44336';
                break;
            default:
                messageEl.style.backgroundColor = '#2196F3';
        }

        document.body.appendChild(messageEl);

        // Remove message after 3 seconds
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize when DOM is loaded
let imageConverter;
document.addEventListener('DOMContentLoaded', function() {
    imageConverter = new ImageToPdfConverter();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
