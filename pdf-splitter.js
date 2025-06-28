class PDFSplitter {
    constructor() {
        this.pdfData = null;
        this.splitResult = null;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.pdfInput = document.getElementById('pdfInput');
        this.uploadZone = document.getElementById('uploadZone');
        this.pdfInfo = document.getElementById('pdfInfo');
        this.pdfName = document.getElementById('pdfName');
        this.pageCount = document.getElementById('pageCount');
        this.pdfSize = document.getElementById('pdfSize');
        this.splitOptions = document.getElementById('splitOptions');
        this.startPage = document.getElementById('startPage');
        this.endPage = document.getElementById('endPage');
        this.splitBtn = document.getElementById('splitBtn');
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
            this.handleFileSelect(e.dataTransfer.files[0]);
        });

        this.splitBtn.addEventListener('click', () => {
            this.splitPDF();
        });

        this.downloadAllBtn.addEventListener('click', () => {
            this.downloadFile();
        });

        this.clearBtn.addEventListener('click', () => {
            this.clearAll();
        });
    }

    handleFileSelect(file) {
        if (file && file.type === 'application/pdf') {
            this.loadPDF(file);
        } else {
            this.showMessage('Please select a valid PDF file.', 'error');
        }
    }

    async loadPDF(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                
                this.pdfData = {
                    file: file,
                    name: file.name,
                    size: file.size,
                    data: arrayBuffer,
                    pages: pdfDoc.getPageCount()
                };

                this.displayPDFInfo();
                this.splitOptions.style.display = 'block';
                this.updateUI();
                
                // Set default end page
                this.endPage.value = this.pdfData.pages;
                this.endPage.max = this.pdfData.pages;
                this.startPage.max = this.pdfData.pages;

            } catch (error) {
                console.error('Error loading PDF:', error);
                this.showMessage('Error loading PDF. Please try again.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    displayPDFInfo() {
        this.pdfName.textContent = this.pdfData.name;
        this.pageCount.textContent = this.pdfData.pages;
        this.pdfSize.textContent = this.formatFileSize(this.pdfData.size);
        this.pdfInfo.style.display = 'block';
    }

    updateUI() {
        const hasResult = this.splitResult !== null;
        
        this.splitBtn.style.display = this.pdfData ? 'inline-block' : 'none';
        this.downloadAllBtn.style.display = hasResult ? 'inline-block' : 'none';
        this.clearBtn.style.display = (this.pdfData || hasResult) ? 'inline-block' : 'none';
    }

    async splitPDF() {
        if (!this.pdfData) return;

        const start = parseInt(this.startPage.value);
        const end = parseInt(this.endPage.value);
        
        if (start > end) {
            this.showMessage('Start page cannot be greater than end page.', 'error');
            return;
        }
        
        if (start < 1 || end > this.pdfData.pages) {
            this.showMessage(`Page range must be between 1 and ${this.pdfData.pages}.`, 'error');
            return;
        }

        this.splitBtn.disabled = true;
        this.splitBtn.textContent = 'Extracting...';

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(this.pdfData.data);
            const newPdf = await PDFLib.PDFDocument.create();
            
            // Get page indices (0-based)
            const pageIndices = [];
            for (let i = start - 1; i <= end - 1; i++) {
                pageIndices.push(i);
            }
            
            const pages = await newPdf.copyPages(pdfDoc, pageIndices);
            pages.forEach(page => newPdf.addPage(page));
            
            const pdfBytes = await newPdf.save();
            this.splitResult = {
                name: `${this.getFileNameWithoutExt()}_pages_${start}-${end}.pdf`,
                data: pdfBytes
            };

            this.splitBtn.textContent = 'Extract Pages';
            this.splitBtn.disabled = false;
            this.updateUI();
            this.showMessage('Pages extracted successfully!', 'success');

        } catch (error) {
            console.error('Error extracting pages:', error);
            this.showMessage('Error extracting pages. Please try again.', 'error');
            this.splitBtn.textContent = 'Extract Pages';
            this.splitBtn.disabled = false;
        }
    }

    getFileNameWithoutExt() {
        return this.pdfData.name.replace(/\.pdf$/i, '');
    }

    downloadFile() {
        if (this.splitResult) {
            const blob = new Blob([this.splitResult.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = this.splitResult.name;
            link.click();
            URL.revokeObjectURL(url);
        }
    }

    clearAll() {
        this.pdfData = null;
        this.splitResult = null;
        this.pdfInfo.style.display = 'none';
        this.splitOptions.style.display = 'none';
        this.pdfInput.value = '';
        this.updateUI();
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

// Initialize the PDF splitter when the page loads
let pdfSplitter;
document.addEventListener('DOMContentLoaded', () => {
    pdfSplitter = new PDFSplitter();
}); 
