document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENT SELECTORS ---
    const fileInput = document.getElementById('file-input');
    const uploaderContainer = document.getElementById('uploader-container');
    const uploadedFileContainer = document.getElementById('uploaded-file-container');
    const uploadedFileName = document.getElementById('uploaded-file-name');
    const pageCountStatus = document.getElementById('page-count-status');
    const deselectFileBtn = document.getElementById('deselect-file-btn');
    const orderDetailsSection = document.getElementById('order-details-section');
    const tokenModal = document.getElementById('token-modal');
    const tokenIdEl = document.getElementById('token-id');
    const closeModalButton = document.getElementById('close-modal-button');

    let currentFile = null;
    let currentOrderOptions = {};
    const RUSH_FEE = 20;

    // --- EVENT LISTENERS ---
    if(fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    if(deselectFileBtn) {
        deselectFileBtn.addEventListener('click', resetUploader);
    }
    if(closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            tokenModal.classList.add('hidden');
            resetUploader(); 
        });
    }

    // --- Navigation Listeners ---
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    const pageSections = document.querySelectorAll('.page-section');
    const menuButton = document.getElementById('menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    function showPage(pageId) {
        pageSections.forEach(section => {
            section.classList.add('hidden');
        });
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageId);
        });
        mobileNavLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageId); 
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = e.currentTarget.dataset.page;
            showPage(pageId);
            window.location.hash = pageId;
        });
    });

    mobileNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = e.currentTarget.dataset.page;
            showPage(pageId);
            window.location.hash = pageId;
            if(mobileMenu) mobileMenu.classList.add('hidden'); 
        });
    });

    if(menuButton) {
        menuButton.addEventListener('click', () => {
            if(mobileMenu) mobileMenu.classList.toggle('hidden');
        });
    }

    // Check URL hash on load
    const initialPage = window.location.hash.substring(1) || 'home';
    showPage(initialPage);


    // --- CORE LOGIC ---
    function resetUploader() {
        currentFile = null;
        fileInput.value = ''; 
        uploaderContainer.classList.remove('hidden');
        uploadedFileContainer.classList.add('hidden');
        orderDetailsSection.classList.add('hidden');
        orderDetailsSection.innerHTML = '';
        
        
        showPage('home');
    }

    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.size > 30 * 1024 * 1024) { // 30MB
            alert('File is too large (Max 30MB).');
            resetUploader();
            return;
        }

        currentFile = file;
        uploaderContainer.classList.add('hidden');
        uploadedFileContainer.classList.remove('hidden');
        uploadedFileName.textContent = file.name;
        orderDetailsSection.innerHTML = '';

        const isImage = file.type.includes('jpeg') || file.type.includes('png') || file.type.includes('jpg');

        if (file.type === 'application/pdf') {
            pageCountStatus.textContent = 'Analyzing PDF, please wait...';
            try {
                const formData = new FormData();
                formData.append('file', file);
                const response = await fetch('/api/count-pages', { method: 'POST', body: formData });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Server error during page count.');
                }
                
                const data = await response.json();
                const pageCount = data.pageCount > 0 ? data.pageCount : 1;
                pageCountStatus.textContent = `✓ ${pageCount} page(s) detected.`;
                renderOrderUI({ type: 'document', pages: pageCount, pagesLocked: true });
            } catch (error) {
                console.error(error);
                pageCountStatus.textContent = 'Could not count pages. Please enter manually.';
                renderOrderUI({ type: 'document', pages: 1, pagesLocked: false });
            }
        } else if (isImage) {
            pageCountStatus.textContent = '✓ Image file selected.';
            renderOrderUI({ type: 'image' });
        } else {
            alert('Invalid file type. Please upload a PDF, JPEG, JPG, or PNG.');
            resetUploader();
        }
    }

    function renderOrderUI(config) {
        orderDetailsSection.classList.remove('hidden');
        
        let optionsHTML = '';
        if (config.type === 'document') {
             optionsHTML = `
                <!-- ** STYLES FIXED FOR DARK MODE ** -->
                <h3 class="text-xl font-semibold text-center text-white mb-6">Customize Your Document</h3>
                <div class="space-y-4">
                    <div>
                        <label for="pages" class="block text-sm font-medium text-gray-300">Number of Pages</label>
                        <input type="number" id="pages" value="${config.pages}" ${config.pagesLocked ? 'readonly' : ''} min="1" 
                               class="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm sm:text-sm ${config.pagesLocked ? 'cursor-not-allowed' : ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300">Print Type</label>
                        <div class="mt-1 flex gap-4 text-gray-300"><label><input type="radio" name="printType" value="bw" checked class="text-indigo-500"> B&W</label><label><input type="radio" name="printType" value="color" class="text-indigo-500"> Color</label></div>
                    </div>
                    <div id="first-page-color-container" class="hidden pl-5 pt-2">
                        <label class="flex items-center">
                            <input type="checkbox" id="first-page-color" class="h-4 w-4 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500">
                            <span class="ml-3 text-sm text-gray-300">Print first page in color</span>
                        </label>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300">Layout</label>
                        <div class="mt-1 flex gap-4 text-gray-300"><label><input type="radio" name="layout" value="singleSided" checked class="text-indigo-500"> Single-Sided</label><label><input type="radio" name="layout" value="doubleSided" class="text-indigo-500"> Double-Sided</label></div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300">Binding</label>
                        <div class="mt-1 flex gap-4 text-gray-300"><label><input type="radio" name="binding" value="none" checked class="text-indigo-500"> None</label><label><input type="radio" name="binding" value="spiral" class="text-indigo-500"> Spiral Binding</label></div>
                    </div>
                    <div>
                        <label for="copies" class="block text-sm font-medium text-gray-300">Number of Copies</label>
                        <input type="number" id="copies" value="1" min="1" class="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm sm:text-sm">
                    </div>
                </div>`;
        } else { 
            optionsHTML = `
                <!-- ** STYLES FIXED FOR DARK MODE ** -->
                <h3 class="text-xl font-semibold text-center text-white mb-6">Choose Photo Service</h3>
                <div>
                    <label class="block text-sm font-medium text-gray-300">Service Type</label>
                    <select id="service" class="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm sm:text-sm">
                        <option value="photo_4x6">Standard 4x6 Print</option>
                        <option value="passport">Passport Photos (8-pack)</option>
                    </select>
                </div>`;
        }

        const summaryHTML = `
            <!-- ** STYLES FIXED FOR DARK MODE ** -->
            <h3 class="text-lg font-semibold border-b border-gray-700 pb-3 mb-4 text-white">Order Summary</h3>
            <div id="summary-details" class="space-y-2 text-sm text-gray-300 min-h-[60px]"></div>
            <div class="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                <span class="text-base font-medium text-white">Total Price:</span>
                <span id="total-price" class="text-2xl font-bold text-indigo-400">₹0.00</span>
            </div>
            <div class="mt-6">
                <label class="flex items-center">
                    <input type="checkbox" id="rush-order" class="h-4 w-4 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500">
                    <span class="ml-3 text-sm text-gray-300">Rush Order (Pickup in 15 mins) - <span class="font-semibold">Add ₹${RUSH_FEE}</span></span>
                </label>
            </div>
            <div class="mt-6">
                <label for="whatsapp-number" class="block text-sm font-medium text-white">Your WhatsApp Number</label>
                <input type="tel" id="whatsapp-number" class="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm" placeholder="e.g., 9123456789">
                <p class="text-xs text-gray-400 mt-1">We'll send your token ID and pickup notification here.</p>
            </div>
            <button id="pay-button" class="mt-6 w-full bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled>Proceed to Pay</button>
        `;

        orderDetailsSection.innerHTML = `
            <!-- ** STYLES FIXED FOR DARK MODE ** -->
            <div class="bg-gray-800/70 p-6 rounded-lg border border-gray-700">${optionsHTML}</div>
            <div class="bg-gray-800/70 p-6 rounded-lg border border-gray-700">${summaryHTML}</div>
        `;

        // --- ATTACH ALL EVENT LISTENERS AFTER CREATING THE HTML ---
        orderDetailsSection.querySelectorAll('input, select').forEach(el => el.addEventListener('change', updateSummary));
        document.getElementById('whatsapp-number').addEventListener('input', updateSummary);
        document.getElementById('pay-button').addEventListener('click', processPayment);
        
        const printTypeRadios = document.querySelectorAll('input[name="printType"]');
        if (printTypeRadios.length) {
            const firstPageColorContainer = document.getElementById('first-page-color-container');
            function toggleFirstPageColorOption() {
                const isBwSelected = document.querySelector('input[name="printType"]:checked').value === 'bw';
                if (isBwSelected) {
                    firstPageColorContainer.classList.remove('hidden');
                } else {
                    firstPageColorContainer.classList.add('hidden');
                    if (document.getElementById('first-page-color')) {
                         document.getElementById('first-page-color').checked = false;
                    }
                }
            }
            printTypeRadios.forEach(radio => radio.addEventListener('change', () => {
                toggleFirstPageColorOption();
                updateSummary();
            }));
            toggleFirstPageColorOption();
        }
        updateSummary(); 
    }
    
    function updateSummary() {
        const isDocument = !!document.getElementById('pages');
        
        let options = { rush: document.getElementById('rush-order').checked };
        let price = 0;
        let summaryText = '';

        // These prices must match the backend
        const prices = { bw: 2, color: 10, firstPageColor: 8, singleSided: 0, doubleSided: -0.5, spiral: 30, photo_4x6: 15, passport: 50 };

        if (isDocument) {
            options.pages = parseInt(document.getElementById('pages').value) || 1;
            options.copies = parseInt(document.getElementById('copies').value) || 1;
            options.printType = document.querySelector('input[name="printType"]:checked').value;
            options.layout = document.querySelector('input[name="layout"]:checked').value;
            options.binding = document.querySelector('input[name="binding"]:checked').value;
            options.firstPageColor = document.getElementById('first-page-color').checked && !document.getElementById('first-page-color-container').classList.contains('hidden');
            
            let singleCopyPrice = 0;
            const pageCost = prices[options.printType] + prices[options.layout];
            singleCopyPrice = options.pages * pageCost;

            if (options.firstPageColor && options.pages >= 1) {
                singleCopyPrice += prices.firstPageColor; 
            }
            if (options.binding === 'spiral') {
                singleCopyPrice += prices.spiral;
            }

            price = singleCopyPrice * options.copies;

            summaryText = `<p>Pages: ${options.pages}</p><p>Copies: ${options.copies}</p>`;
            if (options.firstPageColor) {
                summaryText += `<p>Print: B&W (First Page Color)</p>`;
            } else {
                summaryText += `<p>Print: ${options.printType.toUpperCase()}</p>`;
            }
            summaryText += `<p>Layout: ${options.layout === 'singleSided' ? 'Single-Sided' : 'Double-Sided'}</p>`;
            if (options.binding === 'spiral') summaryText += `<p>Binding: Spiral</p>`;
        } else {
            options.service = document.getElementById('service').value;
            options.copies = 1; 
            price = prices[options.service];
            summaryText = `<p>Service: ${options.service === 'passport' ? 'Passport Photos' : '4x6 Print'}</p>`;
        }

        if (options.rush) price += RUSH_FEE;
        if (options.rush) summaryText += `<p class="text-red-400 font-semibold">Rush Order: +₹${RUSH_FEE}</p>`; 
        
        document.getElementById('total-price').textContent = `₹${Math.max(0, price).toFixed(2)}`;
        document.getElementById('summary-details').innerHTML = summaryText;

        const phone = document.getElementById('whatsapp-number').value;
        const payButton = document.getElementById('pay-button');
        
        if (phone.trim().length === 10 && /^\d{10}$/.test(phone.trim())) {
            payButton.disabled = false;
        } else {
            payButton.disabled = true;
        }
        currentOrderOptions = { ...options, phone: phone.trim() };
    }

    async function processPayment() {
        const payButton = document.getElementById('pay-button');
        payButton.disabled = true;
        payButton.textContent = 'Processing...';

        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('options', JSON.stringify(currentOrderOptions));

        try {
            const orderRes = await fetch('/create-order', { method: 'POST', body: formData });
            if (!orderRes.ok) {
                const errorData = await orderRes.json();
                throw new Error(errorData.error || 'Could not create order.');
            }
            const orderData = await orderRes.json();
            
            if (orderData.keyId === 'dummy_key') {
                console.log("Dummy Mode: Simulating payment verification...");
                const verificationRes = await fetch('/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ razorpay_order_id: orderData.orderId })
                });
                const verificationData = await verificationRes.json();
                if (verificationData.status === 'success') {
                    if(tokenIdEl && tokenModal) {
                        tokenIdEl.textContent = verificationData.tokenId;
                        tokenModal.classList.remove('hidden');
                    } else {
                        console.error('Token modal elements not found!');
                    }
                } else {
                    alert('Dummy payment verification failed.');
                }
                return;
            }
            
            const razorpayOptions = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: "INR",
                name: "SRMAP Stationery Hub",
                description: "Print & Photo Services",
                order_id: orderData.orderId,
                handler: async function(response) {
                    const verificationRes = await fetch('/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(response)
                    });
                    const verificationData = await verificationRes.json();
                    if (verificationData.status === 'success') {
                        if(tokenIdEl && tokenModal) {
                            tokenIdEl.textContent = verificationData.tokenId;
                            tokenModal.classList.remove('hidden');
                        } else {
                            console.error('Token modal elements not found!');
                        }
                    } else {
                        alert('Payment verification failed. Please contact the shop.');
                    }
                },
                prefill: { contact: currentOrderOptions.phone },
                theme: { color: "#4F46E5" }
            };
            const rzp = new Razorpay(razorpayOptions);
            rzp.on('payment.failed', function (response) {
                alert('Payment failed. Please try again.');
                console.error(response);
            });
            rzp.open();

        } catch (error) {
            console.error('Payment Error:', error);
            alert(`An error occurred: ${error.message}`);
        } finally {
            payButton.disabled = false;
            payButton.textContent = 'Proceed to Pay';
        }
    }

}); // <-- This is the closing tag for DOMContentLoaded
