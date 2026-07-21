// report.js - Wizard workflow for listing a lost or found item with image compression

document.addEventListener('DOMContentLoaded', () => {
    // 1. Force Authentication via shared check
    if (!window.Storage) return;
    const currentUser = window.Storage.getUser();
    if (!currentUser) {
        // Redirection handled by protectRoutes in shared.js
        return;
    }

    // 2. Parse URL Params for Initial Type (Lost vs Found)
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get('type'); // 'lost' or 'found'
    const reportTypeRadios = document.getElementsByName('report-type');

    if (typeParam && reportTypeRadios.length > 0) {
        reportTypeRadios.forEach(radio => {
            if (radio.value.toLowerCase() === typeParam.toLowerCase()) {
                radio.checked = true;
            }
        });
    }

    // Wizard step state
    const steps = ['step-1', 'step-2', 'step-3'];
    let currentStep = 0;

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.getElementById('progress-bar');
    const successMessage = document.getElementById('successMessage');
    const reportForm = document.getElementById('reportForm');

    // Default contact details fill
    document.getElementById('contact-phone').value = currentUser.phone || '';
    document.getElementById('contact-email').value = currentUser.email || '';

    // File Upload Preview Logic
    const fileZone = document.getElementById('file-zone');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const filePreviewImg = document.getElementById('file-preview-img');
    const fileUploadPrompt = document.getElementById('file-upload-prompt');
    
    let base64Image = "";

    // Client-side image resizing and quality compression
    function processAndCompressImage(file) {
        // Only accept images
        if (!file.type.match('image.*')) {
            window.showToast("File is not a valid image!", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Max width/height 600px maintaining ratio
                const MAX_WIDTH = 600;
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress JPEG to 70% quality to fit localStorage bounds comfortably
                base64Image = canvas.toDataURL('image/jpeg', 0.7);
                filePreviewImg.src = base64Image;
                fileUploadPrompt.classList.add('hidden');
                filePreview.classList.remove('hidden');
                window.showToast("Image uploaded and optimized!");
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Trigger input click safely
    fileZone.addEventListener('click', (e) => {
        if (e.target !== fileInput) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            processAndCompressImage(file);
        }
    });

    // Drag and Drop
    fileZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileZone.classList.add('border-primary', 'bg-primary/5');
    });

    fileZone.addEventListener('dragleave', () => {
        fileZone.classList.remove('border-primary', 'bg-primary/5');
    });

    fileZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileZone.classList.remove('border-primary', 'bg-primary/5');
        const file = e.dataTransfer.files[0];
        if (file) {
            processAndCompressImage(file);
        }
    });

    // Update UI step state
    function updateUI() {
        steps.forEach((stepId, index) => {
            const element = document.getElementById(stepId);
            if (index === currentStep) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
            
            // Update step indicator dots
            const dot = document.getElementById(`step-dot-${index + 1}`);
            const label = dot.nextElementSibling;
            if (index <= currentStep) {
                dot.classList.remove('bg-slate-200', 'text-slate-500', 'dark:bg-slate-800', 'dark:text-slate-400');
                dot.classList.add('bg-primary', 'text-white');
                if (label) {
                    label.classList.remove('text-slate-500', 'dark:text-slate-450');
                    label.classList.add('text-primary', 'dark:text-primary-fixed', 'font-bold');
                }
            } else {
                dot.classList.remove('bg-primary', 'text-white');
                dot.classList.add('bg-slate-200', 'text-slate-500', 'dark:bg-slate-800', 'dark:text-slate-400');
                if (label) {
                    label.classList.remove('text-primary', 'dark:text-primary-fixed', 'font-bold');
                    label.classList.add('text-slate-500', 'dark:text-slate-400');
                }
            }
        });

        // Progress bar width
        progressBar.style.width = `${(currentStep / (steps.length - 1)) * 100}%`;

        // Nav buttons
        if (currentStep === 0) {
            prevBtn.classList.add('invisible');
        } else {
            prevBtn.classList.remove('invisible');
        }

        if (currentStep === steps.length - 1) {
            nextBtn.innerHTML = `Submit Report <span class="material-symbols-outlined text-sm">send</span>`;
            nextBtn.classList.remove('bg-primary');
            nextBtn.classList.add('bg-secondary');
        } else {
            nextBtn.innerHTML = `Next Step <span class="material-symbols-outlined text-sm">arrow_forward</span>`;
            nextBtn.classList.remove('bg-secondary');
            nextBtn.classList.add('bg-primary');
        }
    }

    // Step Validation
    function validateStep(stepIndex) {
        if (stepIndex === 0) {
            const itemName = document.getElementById('item-name').value.trim();
            const category = document.getElementById('item-category').value;
            const date = document.getElementById('item-date').value;
            const description = document.getElementById('item-desc').value.trim();

            if (!itemName || !category || !date || !description) {
                window.showToast("Please fill in all required fields!", "error");
                return false;
            }
        } else if (stepIndex === 1) {
            const locality = document.getElementById('item-locality').value;
            if (!locality) {
                window.showToast("Please select the precise area in Ernakulam!", "error");
                return false;
            }
        }
        return true;
    }

    nextBtn.addEventListener('click', () => {
        if (currentStep < steps.length - 1) {
            if (validateStep(currentStep)) {
                currentStep++;
                updateUI();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            // Submit form (Step 3 verification)
            const phone = document.getElementById('contact-phone').value.trim();
            const email = document.getElementById('contact-email').value.trim();
            const termsChecked = document.getElementById('terms').checked;

            if (!phone || !email) {
                window.showToast("Please provide contact information!", "error");
                return;
            }
            if (!termsChecked) {
                window.showToast("You must agree to the terms to proceed!", "error");
                return;
            }

            // Get selected report type (Lost vs Found)
            let status = "Lost";
            reportTypeRadios.forEach(radio => {
                if (radio.checked) status = radio.value;
            });

            // Fallback placeholder logic
            const placeholders = window.Config ? window.Config.PLACEHOLDERS : { LOST_ITEM: "", FOUND_ITEM: "" };
            const defaultPlaceholder = status === 'Found' ? placeholders.FOUND_ITEM : placeholders.LOST_ITEM;

            // Construct new item object
            const item = {
                name: document.getElementById('item-name').value.trim(),
                category: document.getElementById('item-category').value,
                date: document.getElementById('item-date').value,
                description: document.getElementById('item-desc').value.trim(),
                image: base64Image || defaultPlaceholder,
                status: status,
                locality: document.getElementById('item-locality').value,
                landmark: document.getElementById('item-landmark').value.trim(),
                phone: phone,
                email: email,
                reporterId: currentUser.id,
                reporterName: currentUser.name
            };

            // Save in database
            window.Storage.saveItem(item);

            // Show success screen overlay
            successMessage.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            updateUI();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Initialize UI
    updateUI();
});
