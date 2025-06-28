// PDF to Image Converter Tool JavaScript
class PDFToImageConverter {
    constructor() {
        this.pdfData = null;
        this.pageImages = [];
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.pdfInput = document.getElementById('pdfInput');
        this.uploadZone = document.getElementById('uploadZone');
        this.imageFormat = document.getElementById('imageFormat');
        this.imageQuality = document.getElementById('imageQuality');
        this.qualityValue = document.getElementById('qualityValue');
        this.imageScale = document.getElementById('imageScale');
        this.pdfInfo = document.getElementById('pdfInfo');
        this.pdfName = document.getElementById('pdfName');
        this.pageCount = document.getElementById('pageCount');
        this.pdfSize = document.getElementById('pdfSize');
        this.convertBtn = document.getElementById('convertBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.clearBtn = document.getElementById('clearBtn');
    }

    bindEvents() {
        this.pdfInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
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
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        this.imageQuality.addEventListener('input', (e) => {
            this.qualityValue.textContent = e.target.value + '%';
        });

        this.convertBtn.addEventListener('click', () => {
            this.convertPDFToImages();
        });

        this.downloadAllBtn.addEventListener('click', () => {
            this.downloadAllImages();
        });

        this.clearBtn.addEventListener('click', () => {
            this.clearAll();
        });
    }

    handleFileSelect(file) {
        if (!file || file.type !== 'application/pdf') {
            this.showMessage('Please select a valid PDF file.', 'error');
            return;
        }

        this.pdfData = {
            file: file,
            name: file.name,
            size: file.size
        };

        this.displayPDFInfo();
        this.loadPDFPreview();
        this.updateUI();
    }

    displayPDFInfo() {
        this.pdfName.textContent = this.pdfData.name;
        this.pdfSize.textContent = this.formatFileSize(this.pdfData.size);
        this.pdfInfo.style.display = 'block';
    }

    async loadPDFPreview() {
        try {
            const arrayBuffer = await this.pdfData.file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            this.pageCount.textContent = pdf.numPages;
            this.pdfData.numPages = pdf.numPages;
            this.pdfData.pdf = pdf;

        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showMessage('Error loading PDF. Please try again.', 'error');
        }
    }

    async convertPDFToImages() {
        if (!this.pdfData || !this.pdfData.pdf) {
            this.showMessage('Please upload a PDF file first.', 'error');
            return;
        }

        this.convertBtn.disabled = true;
        this.convertBtn.textContent = 'Converting...';

        try {
            this.pageImages = [];
            const pdf = this.pdfData.pdf;
            const format = this.imageFormat.value;
            const quality = parseInt(this.imageQuality.value) / 100;
            const scale = parseFloat(this.imageScale.value);

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                await page.render(renderContext).promise;

                // Convert canvas to blob
                const blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, format.replace('image/', ''), quality);
                });

                this.pageImages.push({
                    pageNumber: pageNum,
                    blob: blob,
                    dataUrl: canvas.toDataURL(format, quality)
                });
            }

            this.downloadAllBtn.style.display = 'inline-block';
            this.convertBtn.textContent = 'Convert to Images';
            this.convertBtn.disabled = false;

            this.showMessage(`Successfully converted ${this.pageImages.length} pages to images!`, 'success');

        } catch (error) {
            console.error('Error converting PDF to images:', error);
            this.showMessage('Error converting PDF. Please try again.', 'error');
            this.convertBtn.textContent = 'Convert to Images';
            this.convertBtn.disabled = false;
        }
    }

    downloadAllImages() {
        if (this.pageImages.length === 0) {
            this.showMessage('No images to download. Please convert the PDF first.', 'error');
            return;
        }

        this.pageImages.forEach((image, index) => {
            setTimeout(() => {
                this.downloadImage(image, index + 1);
            }, index * 100);
        });
    }

    downloadImage(image, pageNumber) {
        const link = document.createElement('a');
        link.href = image.dataUrl;
        
        const format = this.imageFormat.value.replace('image/', '');
        const baseName = this.pdfData.name.replace('.pdf', '');
        link.download = `${baseName}_page_${pageNumber}.${format}`;
        
        link.click();
    }

    clearAll() {
        this.pdfData = null;
        this.pageImages = [];
        this.pdfInfo.style.display = 'none';
        this.updateUI();
        this.pdfInput.value = '';
    }

    updateUI() {
        if (this.pdfData) {
            this.convertBtn.style.display = 'inline-block';
            this.clearBtn.style.display = 'inline-block';
            this.downloadAllBtn.style.display = 'none';
        } else {
            this.convertBtn.style.display = 'none';
            this.clearBtn.style.display = 'none';
            this.downloadAllBtn.style.display = 'none';
        }
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 6px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            ${type === 'success' ? 'background: #27ae60;' : 'background: #e74c3c;'}
        `;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
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

// Initialize the PDF to Image converter when the page loads
let pdfToImageConverter;
document.addEventListener('DOMContentLoaded', () => {
    pdfToImageConverter = new PDFToImageConverter();
}); 
