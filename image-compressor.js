// Image Compressor Tool JavaScript
class ImageCompressor {
    constructor() {
        this.images = [];
        this.quality = 80;
        this.initializeElements();
        this.bindEvents();
        
        // Test if elements are found and show buttons
        if (this.compressBtn) {
            console.log('Compress button found, showing it');
            this.compressBtn.style.display = 'inline-block';
        } else {
            console.error('Compress button not found!');
        }
        if (this.clearAllBtn) {
            console.log('Clear all button found, showing it');
            this.clearAllBtn.style.display = 'inline-block';
        } else {
            console.error('Clear all button not found!');
        }
        
        // Check the action-buttons container
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            console.log('Action buttons container found:', actionButtons.innerHTML);
        } else {
            console.error('Action buttons container not found!');
        }
    }

    initializeElements() {
        this.uploadZone = document.getElementById('uploadZone');
        this.imageInput = document.getElementById('imageInput');
        this.imageList = document.getElementById('imageList');
        this.qualitySlider = document.getElementById('qualitySlider');
        this.qualityValue = document.getElementById('qualityValue');
        this.compressBtn = document.getElementById('compressBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.compressionStats = document.getElementById('compressionStats');
        this.originalSize = document.getElementById('originalSize');
        this.compressedSize = document.getElementById('compressedSize');
        this.sizeReduction = document.getElementById('sizeReduction');
        
        // Debug: Check if elements are found
        console.log('Elements found:', {
            uploadZone: !!this.uploadZone,
            imageInput: !!this.imageInput,
            imageList: !!this.imageList,
            qualitySlider: !!this.qualitySlider,
            qualityValue: !!this.qualityValue,
            compressBtn: !!this.compressBtn,
            downloadAllBtn: !!this.downloadAllBtn,
            clearAllBtn: !!this.clearAllBtn,
            compressionStats: !!this.compressionStats,
            originalSize: !!this.originalSize,
            compressedSize: !!this.compressedSize,
            sizeReduction: !!this.sizeReduction
        });
    }

    bindEvents() {
        this.qualitySlider.addEventListener('input', (e) => {
            this.quality = parseInt(e.target.value);
            this.qualityValue.textContent = this.quality + '%';
            this.updateCompressionPreview();
        });

        this.imageInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        this.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadZone.classList.add('drag-over');
        });

        this.uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.uploadZone.classList.remove('drag-over');
        });

        this.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadZone.classList.remove('drag-over');
            this.handleFileSelect(e.dataTransfer.files);
        });

        this.compressBtn.addEventListener('click', () => {
            this.compressAllImages();
        });

        this.downloadAllBtn.addEventListener('click', () => {
            this.downloadAllImages();
        });

        this.clearAllBtn.addEventListener('click', () => {
            this.clearAllImages();
        });
    }

    handleFileSelect(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                this.addImage(file);
            }
        });
        this.updateUI();
    }

    addImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = {
                file: file,
                originalSize: file.size,
                originalUrl: e.target.result,
                compressedUrl: null,
                compressedSize: 0,
                name: file.name,
                type: file.type
            };
            this.images.push(imageData);
            this.renderImageItem(imageData);
            this.updateUI();
            this.updateStats();
        };
        reader.readAsDataURL(file);
    }

    renderImageItem(imageData) {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        imageItem.setAttribute('data-name', imageData.name);
        imageItem.innerHTML = `
            <div class="image-preview">
                <img src="${imageData.originalUrl}" alt="${imageData.name}">
            </div>
            <div class="image-info">
                <h4>${imageData.name}</h4>
                <div class="size-info">
                    <span class="original-size">Original: ${this.formatFileSize(imageData.originalSize)}</span>
                    <span class="compressed-size" style="display: none;">Compressed: <span class="compressed-size-value">0 KB</span></span>
                </div>
                <div class="compression-ratio" style="display: none;">
                    <span class="reduction-percent">0% reduction</span>
                </div>
            </div>
            <div class="image-actions">
                <button class="download-btn" style="display: none;" onclick="imageCompressor.downloadImage('${imageData.name}')">Download</button>
                <button class="remove-btn" onclick="imageCompressor.removeImage('${imageData.name}')">Remove</button>
            </div>
        `;
        this.imageList.appendChild(imageItem);
    }

    async compressAllImages() {
        this.compressBtn.disabled = true;
        this.compressBtn.textContent = 'Compressing...';

        for (let imageData of this.images) {
            await this.compressImage(imageData);
        }

        this.compressBtn.disabled = false;
        this.compressBtn.textContent = 'Compress Images';
        this.downloadAllBtn.style.display = 'inline-block';
        this.updateStats();
    }

    async compressImage(imageData) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions while maintaining aspect ratio
                const maxWidth = 1920;
                const maxHeight = 1080;
                let { width, height } = img;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressedDataUrl = canvas.toDataURL(imageData.type, this.quality / 100);
                
                // Convert data URL to blob to get size
                fetch(compressedDataUrl)
                    .then(res => res.blob())
                    .then(blob => {
                        imageData.compressedUrl = compressedDataUrl;
                        imageData.compressedSize = blob.size;
                        this.updateImageItem(imageData);
                        resolve();
                    });
            };

            img.src = imageData.originalUrl;
        });
    }

    updateImageItem(imageData) {
        const imageItem = this.imageList.querySelector(`[data-name="${imageData.name}"]`);
        
        if (imageItem) {
            const compressedSizeEl = imageItem.querySelector('.compressed-size');
            const compressedSizeValue = imageItem.querySelector('.compressed-size-value');
            const compressionRatio = imageItem.querySelector('.compression-ratio');
            const reductionPercent = imageItem.querySelector('.reduction-percent');
            const downloadBtn = imageItem.querySelector('.download-btn');

            if (imageData.compressedSize > 0) {
                compressedSizeEl.style.display = 'inline';
                compressedSizeValue.textContent = this.formatFileSize(imageData.compressedSize);
                
                const reduction = ((imageData.originalSize - imageData.compressedSize) / imageData.originalSize * 100).toFixed(1);
                compressionRatio.style.display = 'block';
                reductionPercent.textContent = `${reduction}% reduction`;
                
                downloadBtn.style.display = 'inline-block';
            }
        }
    }

    downloadImage(fileName) {
        const imageData = this.images.find(img => img.name === fileName);
        if (imageData && imageData.compressedUrl) {
            const link = document.createElement('a');
            link.href = imageData.compressedUrl;
            link.download = `compressed_${imageData.name}`;
            link.click();
        }
    }

    downloadAllImages() {
        this.images.forEach(imageData => {
            if (imageData.compressedUrl) {
                setTimeout(() => {
                    this.downloadImage(imageData.name);
                }, 100);
            }
        });
    }

    removeImage(fileName) {
        const index = this.images.findIndex(img => img.name === fileName);
        if (index > -1) {
            this.images.splice(index, 1);
            // Remove the image item from DOM
            const imageItem = this.imageList.querySelector(`[data-name="${fileName}"]`);
            if (imageItem) {
                imageItem.remove();
            }
            this.updateUI();
        }
    }

    clearAllImages() {
        this.images = [];
        this.imageList.innerHTML = '';
        this.imageList.style.display = 'none';
        this.updateUI();
        this.updateStats();
    }

    updateUI() {
        if (this.images.length > 0) {
            this.imageList.style.display = 'block';
            this.compressBtn.style.display = 'inline-block';
            this.compressBtn.style.visibility = 'visible';
            this.clearAllBtn.style.display = 'inline-block';
            this.clearAllBtn.style.visibility = 'visible';
            this.downloadAllBtn.style.display = 'none';
        } else {
            this.imageList.style.display = 'none';
            this.compressBtn.style.display = 'none';
            this.clearAllBtn.style.display = 'none';
            this.downloadAllBtn.style.display = 'none';
        }
    }

    updateStats() {
        if (this.images.length === 0) {
            this.compressionStats.style.display = 'none';
            return;
        }

        const totalOriginal = this.images.reduce((sum, img) => sum + img.originalSize, 0);
        const totalCompressed = this.images.reduce((sum, img) => sum + (img.compressedSize || 0), 0);

        this.originalSize.textContent = this.formatFileSize(totalOriginal);
        this.compressedSize.textContent = this.formatFileSize(totalCompressed);

        if (totalCompressed > 0) {
            const reduction = ((totalOriginal - totalCompressed) / totalOriginal * 100).toFixed(1);
            this.sizeReduction.textContent = `${reduction}%`;
            this.compressionStats.style.display = 'flex';
        }
    }

    updateCompressionPreview() {
        // Update preview for already compressed images
        if (this.images.some(img => img.compressedSize > 0)) {
            this.compressAllImages();
        }
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
document.addEventListener('DOMContentLoaded', function() {
    new ImageCompressor();
}); 
