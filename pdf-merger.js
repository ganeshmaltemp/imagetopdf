// PDF Merger Tool JavaScript
class PDFMerger {
    constructor() {
        this.pdfs = [];
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.pdfInput = document.getElementById('pdfInput');
        this.uploadZone = document.getElementById('uploadZone');
        this.pdfList = document.getElementById('pdfList');
        this.mergerControls = document.getElementById('mergerControls');
        this.mergeBtn = document.getElementById('mergeBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
    }

    bindEvents() {
        this.pdfInput.addEventListener('change', (e) => {
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

        this.mergeBtn.addEventListener('click', () => {
            this.mergePDFs();
        });

        this.downloadBtn.addEventListener('click', () => {
            this.downloadMergedPDF();
        });

        this.clearAllBtn.addEventListener('click', () => {
            this.clearAllPDFs();
        });
    }

    handleFileSelect(files) {
        Array.from(files).forEach(file => {
            if (file.type === 'application/pdf') {
                this.addPDF(file);
            }
        });
        this.updateUI();
    }

    addPDF(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const pdfData = {
                file: file,
                name: file.name,
                size: file.size,
                data: e.target.result,
                pages: 0
            };
            this.pdfs.push(pdfData);
            this.renderPDFItem(pdfData);
            this.updateUI();
        };
        reader.readAsArrayBuffer(file);
    }

    renderPDFItem(pdfData) {
        const pdfItem = document.createElement('div');
        pdfItem.className = 'pdf-item';
        pdfItem.draggable = true;
        pdfItem.dataset.name = pdfData.name;
        pdfItem.innerHTML = `
            <div class="pdf-icon">📄</div>
            <div class="pdf-info">
                <h4>${pdfData.name}</h4>
                <p>Size: ${this.formatFileSize(pdfData.size)}</p>
                <p class="page-count">Pages: Loading...</p>
            </div>
            <div class="pdf-actions">
                <button class="move-up-btn" onclick="pdfMerger.movePDF('${pdfData.name}', -1)">↑</button>
                <button class="move-down-btn" onclick="pdfMerger.movePDF('${pdfData.name}', 1)">↓</button>
                <button class="remove-btn" onclick="pdfMerger.removePDF('${pdfData.name}')">Remove</button>
            </div>
        `;

        // Add drag and drop functionality
        pdfItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', pdfData.name);
        });

        pdfItem.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        pdfItem.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedName = e.dataTransfer.getData('text/plain');
            const targetName = pdfData.name;
            this.reorderPDFs(draggedName, targetName);
        });

        this.pdfList.appendChild(pdfItem);

        // Get page count
        this.getPageCount(pdfData);
    }

    async getPageCount(pdfData) {
        try {
            const pdfDoc = await PDFLib.PDFDocument.load(pdfData.data);
            pdfData.pages = pdfDoc.getPageCount();
            
            const pageCountEl = this.pdfList.querySelector(`[data-name="${pdfData.name}"] .page-count`);
            if (pageCountEl) {
                pageCountEl.textContent = `Pages: ${pdfData.pages}`;
            }
        } catch (error) {
            console.error('Error getting page count:', error);
        }
    }

    movePDF(fileName, direction) {
        const currentIndex = this.pdfs.findIndex(pdf => pdf.name === fileName);
        const newIndex = currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.pdfs.length) {
            const temp = this.pdfs[currentIndex];
            this.pdfs[currentIndex] = this.pdfs[newIndex];
            this.pdfs[newIndex] = temp;
            this.updatePDFList();
        }
    }

    reorderPDFs(draggedName, targetName) {
        const draggedIndex = this.pdfs.findIndex(pdf => pdf.name === draggedName);
        const targetIndex = this.pdfs.findIndex(pdf => pdf.name === targetName);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const draggedPDF = this.pdfs.splice(draggedIndex, 1)[0];
            this.pdfs.splice(targetIndex, 0, draggedPDF);
            this.updatePDFList();
        }
    }

    updatePDFList() {
        this.pdfList.innerHTML = '';
        this.pdfs.forEach(pdf => {
            this.renderPDFItem(pdf);
        });
    }

    removePDF(fileName) {
        const index = this.pdfs.findIndex(pdf => pdf.name === fileName);
        if (index > -1) {
            this.pdfs.splice(index, 1);
            this.updateUI();
        }
    }

    clearAllPDFs() {
        this.pdfs = [];
        this.pdfList.innerHTML = '';
        this.updateUI();
    }

    updateUI() {
        if (this.pdfs.length > 0) {
            this.mergerControls.style.display = 'block';
            this.mergeBtn.style.display = 'inline-block';
            this.clearAllBtn.style.display = 'inline-block';
            this.downloadBtn.style.display = 'none';
        } else {
            this.mergerControls.style.display = 'none';
            this.mergeBtn.style.display = 'none';
            this.clearAllBtn.style.display = 'none';
            this.downloadBtn.style.display = 'none';
        }
    }

    async mergePDFs() {
        if (this.pdfs.length === 0) return;

        this.mergeBtn.disabled = true;
        this.mergeBtn.textContent = 'Merging...';

        try {
            const mergedPdf = await PDFLib.PDFDocument.create();
            let currentPage = 0;

            for (let i = 0; i < this.pdfs.length; i++) {
                const pdfData = this.pdfs[i];
                const pdfDoc = await PDFLib.PDFDocument.load(pdfData.data);
                const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                
                // Add pages to merged document
                pages.forEach(page => {
                    mergedPdf.addPage(page);
                    currentPage++;
                });
            }

            const mergedPdfBytes = await mergedPdf.save();
            this.mergedPDFData = mergedPdfBytes;
            
            this.downloadBtn.style.display = 'inline-block';
            this.mergeBtn.textContent = 'Merge PDFs';
            this.mergeBtn.disabled = false;

            // Show success message
            this.showMessage('PDFs merged successfully!', 'success');

        } catch (error) {
            console.error('Error merging PDFs:', error);
            this.showMessage('Error merging PDFs. Please try again.', 'error');
            this.mergeBtn.textContent = 'Merge PDFs';
            this.mergeBtn.disabled = false;
        }
    }

    downloadMergedPDF() {
        if (this.mergedPDFData) {
            const blob = new Blob([this.mergedPDFData], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'merged_document.pdf';
            link.click();
            URL.revokeObjectURL(url);
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

// Initialize the PDF merger when the page loads
let pdfMerger;
document.addEventListener('DOMContentLoaded', () => {
    pdfMerger = new PDFMerger();
}); 
