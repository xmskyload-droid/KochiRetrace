// browse.js - Item browsing, filtering, search, and claim workflows (Updated with Event Delegation)

document.addEventListener('DOMContentLoaded', () => {
    // Check if Storage is loaded
    if (!window.Storage) {
        console.error("Storage module not loaded!");
        return;
    }

    // Parse URL Parameters
    const params = new URLSearchParams(window.location.search);
    let searchQuery = params.get('search') || '';
    let selectedLocation = params.get('location') || 'All Ernakulam';
    let selectedCategory = params.get('category') || '';
    let selectedStatus = params.get('status') || 'All'; // All, Lost, Found
    let selectedItemId = params.get('itemId') || '';

    // Elements
    const searchInput = document.getElementById('search-input');
    const locationSelect = document.getElementById('location-select');
    const categoryChecks = document.querySelectorAll('.category-checkbox');
    const statusButtons = document.querySelectorAll('.status-btn');
    const dateInput = document.getElementById('date-filter');
    const sortSelect = document.getElementById('sort-select');
    const itemsGrid = document.getElementById('items-grid');
    const resultsCount = document.getElementById('results-count');
    const viewGridBtn = document.getElementById('view-grid-btn');
    const viewListBtn = document.getElementById('view-list-btn');

    // UI state
    let isGridView = true;

    // Initialize Inputs from URL params
    if (searchInput) searchInput.value = searchQuery;
    if (locationSelect) {
        // Find matching option
        for (let option of locationSelect.options) {
            if (option.value.toLowerCase().includes(selectedLocation.toLowerCase()) || selectedLocation.toLowerCase().includes(option.value.toLowerCase())) {
                locationSelect.value = option.value;
                break;
            }
        }
    }
    if (selectedCategory && categoryChecks.length > 0) {
        categoryChecks.forEach(cb => {
            if (cb.value.toLowerCase() === selectedCategory.toLowerCase()) {
                cb.checked = true;
            } else {
                cb.checked = false;
            }
        });
    }
    if (selectedStatus && statusButtons.length > 0) {
        statusButtons.forEach(btn => {
            if (btn.textContent.trim().toLowerCase() === selectedStatus.toLowerCase()) {
                setActiveStatusButton(btn);
            }
        });
    }

    // Event Listeners (Form inputs)
    if (searchInput) searchInput.addEventListener('input', debounce(filterAndRender, 300));
    if (locationSelect) locationSelect.addEventListener('change', filterAndRender);
    if (dateInput) dateInput.addEventListener('change', filterAndRender);
    if (sortSelect) sortSelect.addEventListener('change', filterAndRender);

    if (categoryChecks.length > 0) {
        categoryChecks.forEach(cb => {
            cb.addEventListener('change', filterAndRender);
        });
    }

    if (statusButtons.length > 0) {
        statusButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                setActiveStatusButton(btn);
                filterAndRender();
            });
        });
    }

    if (viewGridBtn && viewListBtn) {
        viewGridBtn.addEventListener('click', () => {
            isGridView = true;
            viewGridBtn.classList.add('bg-primary-fixed', 'text-primary');
            viewListBtn.classList.remove('bg-primary-fixed', 'text-primary');
            filterAndRender();
        });
        viewListBtn.addEventListener('click', () => {
            isGridView = false;
            viewListBtn.classList.add('bg-primary-fixed', 'text-primary');
            viewGridBtn.classList.remove('bg-primary-fixed', 'text-primary');
            filterAndRender();
        });
    }

    // Clear filters helper
    const clearFiltersBtn = document.getElementById('clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (locationSelect) locationSelect.value = 'All Ernakulam';
            if (dateInput) dateInput.value = '';
            if (sortSelect) sortSelect.value = 'newest';
            categoryChecks.forEach(cb => cb.checked = false);
            statusButtons.forEach(btn => {
                if (btn.textContent.trim().toLowerCase() === 'all') {
                    setActiveStatusButton(btn);
                }
            });
            filterAndRender();
        });
    }

    // Set active class for status buttons
    function setActiveStatusButton(activeBtn) {
        statusButtons.forEach(btn => {
            btn.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-primary', 'dark:text-white');
            btn.classList.add('text-slate-500', 'dark:text-slate-400');
        });
        activeBtn.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-primary', 'dark:text-white');
        activeBtn.classList.remove('text-slate-500', 'dark:text-slate-400');
    }

    // Debounce Helper for Search
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // FILTER & RENDER FUNCTION
    function filterAndRender() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const loc = locationSelect ? locationSelect.value : 'All Ernakulam';
        const dateVal = dateInput ? dateInput.value : '';
        const sortVal = sortSelect ? sortSelect.value : 'newest';
        
        // Active Categories
        const activeCategories = [];
        categoryChecks.forEach(cb => {
            if (cb.checked) activeCategories.push(cb.value);
        });

        // Active Status
        let statusFilter = 'all';
        statusButtons.forEach(btn => {
            if (btn.classList.contains('bg-white') || btn.classList.contains('dark:bg-slate-700')) {
                statusFilter = btn.textContent.trim().toLowerCase();
            }
        });

        let items = window.Storage.getItems();

        // 1. Text Search (title, description, category, location, landmark)
        if (query) {
            const queryWords = query.split(/\s+/).filter(w => w.length > 0);
            items = items.filter(item => {
                const searchableText = `${item.name} ${item.description} ${item.category} ${item.locality} ${item.landmark}`.toLowerCase();
                // Match all words (multi-word match)
                return queryWords.every(word => searchableText.includes(word));
            });
        }

        // 2. Locality Filter
        if (loc !== 'All Ernakulam') {
            items = items.filter(item => item.locality.toLowerCase().includes(loc.toLowerCase()) || loc.toLowerCase().includes(item.locality.toLowerCase()));
        }

        // 3. Category Filter
        if (activeCategories.length > 0) {
            items = items.filter(item => activeCategories.some(c => item.category.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(item.category.toLowerCase())));
        }

        // 4. Status Filter
        if (statusFilter !== 'all') {
            items = items.filter(item => item.status.toLowerCase() === statusFilter);
        }

        // 5. Date Filter (equal to or after dateVal)
        if (dateVal) {
            items = items.filter(item => item.date >= dateVal);
        }

        // 6. Sorting
        if (sortVal === 'newest') {
            items.sort((a, b) => b.createdAt - a.createdAt);
        } else if (sortVal === 'oldest') {
            items.sort((a, b) => a.createdAt - b.createdAt);
        } else if (sortVal === 'alphabetical') {
            items.sort((a, b) => a.name.localeCompare(b.name));
        }

        // Render counts
        if (resultsCount) {
            resultsCount.innerHTML = `Showing <span class="font-bold text-on-surface dark:text-white">${items.length}</span> results across Kochi`;
        }

        // Grid vs List Layout classes
        if (isGridView) {
            itemsGrid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";
        } else {
            itemsGrid.className = "flex flex-col gap-4 w-full";
        }

        // Render items
        if (items.length === 0) {
            itemsGrid.innerHTML = `
                <div class="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
                    <span class="material-symbols-outlined text-5xl opacity-40 mb-4">search_off</span>
                    <p class="font-semibold text-lg">No items match your filters</p>
                    <p class="text-sm mt-1">Try widening your search or clearing active filters.</p>
                </div>
            `;
            return;
        }

        itemsGrid.innerHTML = items.map(item => renderItemCard(item, isGridView)).join('');
    }

    // HTML CARD BUILDER
    function renderItemCard(item, isGrid) {
        const timeAgo = formatTimeAgo(item.createdAt);
        const placeholders = window.Config ? window.Config.PLACEHOLDERS : { LOST_ITEM: "" };
        const defaultImg = item.status === 'Found' ? (window.Config ? window.Config.PLACEHOLDERS.FOUND_ITEM : '') : (window.Config ? window.Config.PLACEHOLDERS.LOST_ITEM : '');
        
        // Status Badge Style mapping
        const badgeClasses = {
            'Lost': 'bg-error-container text-on-error-container border-error/20',
            'Found': 'bg-secondary-container text-on-secondary-container border-secondary/20',
            'Claim Requested': 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300',
            'Verified': 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300',
            'Returned': 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300',
            'Archived': 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300'
        };
        const badgeClass = badgeClasses[item.status] || 'bg-slate-100 text-slate-800';

        if (isGrid) {
            return `
            <article class="group bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-primary transition-all duration-300 hover:shadow-xl flex flex-col">
                <div class="relative h-48 overflow-hidden bg-slate-50 dark:bg-slate-900">
                    <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="${item.image || defaultImg}" alt="${item.name}">
                    <div class="absolute top-4 left-4 ${badgeClass} px-3 py-1 rounded-full text-xs font-bold shadow-sm border">
                        ${item.status}
                    </div>
                </div>
                <div class="p-6 flex-1 flex flex-col">
                    <h3 class="font-bold text-lg text-slate-900 dark:text-white mb-2 leading-snug line-clamp-1">${item.name}</h3>
                    <div class="space-y-1.5 mb-6 text-sm text-slate-500 dark:text-slate-400">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-base text-primary">location_on</span>
                            <span>${item.locality}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-base">calendar_today</span>
                            <span>${item.date}</span>
                        </div>
                    </div>
                    <button data-id="${item.id}" class="view-details-btn mt-auto w-full py-2.5 bg-primary dark:bg-primary-container text-white rounded-xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm">
                        View Details
                    </button>
                </div>
            </article>
            `;
        } else {
            // List View Card
            return `
            <article class="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-primary transition-all duration-300 hover:shadow-lg p-4 flex flex-col sm:flex-row gap-4 items-center w-full">
                <div class="relative w-full sm:w-40 h-28 overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                    <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="${item.image || defaultImg}" alt="${item.name}">
                    <div class="absolute top-2 left-2 ${badgeClass} px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm border">
                        ${item.status}
                    </div>
                </div>
                <div class="flex-1 w-full min-w-0 flex flex-col justify-between h-full py-1">
                    <div>
                        <div class="flex justify-between items-start gap-2">
                            <h3 class="font-bold text-lg text-slate-900 dark:text-white leading-tight truncate">${item.name}</h3>
                            <span class="text-xs text-outline font-medium flex-shrink-0">${timeAgo}</span>
                        </div>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">${item.description}</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-xs text-slate-500 dark:text-slate-400">
                        <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-sm text-primary">location_on</span> ${item.locality}</span>
                        <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-sm">calendar_today</span> ${item.date}</span>
                        <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-sm">folder</span> ${item.category}</span>
                    </div>
                </div>
                <div class="w-full sm:w-auto flex-shrink-0">
                    <button data-id="${item.id}" class="view-details-btn w-full sm:w-auto px-6 py-3 bg-primary dark:bg-primary-container text-white rounded-xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm">
                        View Details
                    </button>
                </div>
            </article>
            `;
        }
    }

    // MODAL STATE & ACTIONS
    const detailsModal = document.getElementById('details-modal');
    const claimModal = document.getElementById('claim-modal');
    let currentItemForClaim = null;

    // --- EVENT DELEGATION FOR ITEMS GRID ---
    if (itemsGrid) {
        itemsGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.view-details-btn');
            if (btn) {
                const id = btn.getAttribute('data-id');
                openDetailsModal(id);
            }
        });
    }

    // Open item details modal
    function openDetailsModal(id) {
        const item = window.Storage.getItems().find(i => i.id === id);
        if (!item) return;

        currentItemForClaim = item;

        // Fill modal fields
        document.getElementById('modal-item-name').textContent = item.name;
        document.getElementById('modal-item-status').textContent = item.status;
        
        // Badge styles
        const badgeClasses = {
            'Lost': 'bg-error-container text-on-error-container',
            'Found': 'bg-secondary-container text-on-secondary-container',
            'Claim Requested': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
            'Verified': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
            'Returned': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
            'Archived': 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
        };
        document.getElementById('modal-item-status').className = `px-3 py-1 rounded-full text-xs font-bold border ${badgeClasses[item.status] || 'bg-slate-100'}`;

        const defaultImg = item.status === 'Found' ? (window.Config ? window.Config.PLACEHOLDERS.FOUND_ITEM : '') : (window.Config ? window.Config.PLACEHOLDERS.LOST_ITEM : '');
        document.getElementById('modal-item-image').src = item.image || defaultImg;
        document.getElementById('modal-item-description').textContent = item.description;
        document.getElementById('modal-item-locality').textContent = item.locality;
        document.getElementById('modal-item-landmark').textContent = item.landmark || 'Not specified';
        document.getElementById('modal-item-date').textContent = item.date;
        document.getElementById('modal-item-category').textContent = item.category;
        document.getElementById('modal-item-reporter').textContent = item.reporterName;

        // Reset image zoom state
        const imgEl = document.getElementById('modal-item-image');
        imgEl.classList.remove('scale-150', 'z-10');
        const zoomImgBtn = document.getElementById('zoom-image-btn');
        if (zoomImgBtn) zoomImgBtn.innerHTML = '<span class="material-symbols-outlined">zoom_in</span>';

        // Claim button visibility
        const currentUser = window.Storage.getUser();
        const claimBtn = document.getElementById('modal-claim-btn');
        const contactDetailsDiv = document.getElementById('modal-contact-details');

        if (currentUser && currentUser.id === item.reporterId) {
            // Reporter viewing their own item
            claimBtn.classList.add('hidden');
            contactDetailsDiv.innerHTML = `
                <div class="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <p class="font-bold text-slate-700 dark:text-slate-350">Your Contact Details Listed:</p>
                    <p class="mt-1 text-slate-500 dark:text-slate-400">Phone: ${item.phone}</p>
                    <p class="text-slate-500 dark:text-slate-400">Email: ${item.email}</p>
                </div>
            `;
            contactDetailsDiv.classList.remove('hidden');
        } else if (item.status === 'Returned' || item.status === 'Archived') {
            // Already closed items
            claimBtn.classList.add('hidden');
            contactDetailsDiv.classList.add('hidden');
        } else {
            // Other user viewing the item
            claimBtn.classList.remove('hidden');
            
            // Customize button text depending on Lost vs Found
            if (item.status === 'Found') {
                claimBtn.innerHTML = `<span class="material-symbols-outlined">verified</span> Claim Ownership`;
            } else {
                claimBtn.innerHTML = `<span class="material-symbols-outlined">handshake</span> I Found This Item`;
            }

            contactDetailsDiv.classList.add('hidden');
        }

        // Run AI Match Assistant Engine
        const aiMatchContainer = document.getElementById('ai-match-container');
        if (aiMatchContainer) {
            const matches = window.Storage.findAIMatches ? window.Storage.findAIMatches(item) : [];
            if (matches.length > 0) {
                const topMatch = matches[0];
                aiMatchContainer.innerHTML = `
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-primary text-xl">psychology</span>
                            <div>
                                <h4 class="text-xs font-extrabold text-primary uppercase tracking-wide">AI Match Assistant (${topMatch.matchScore}% Confidence)</h4>
                                <p class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Potential Match: ${topMatch.item.name} (${topMatch.item.locality})</p>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">${topMatch.matchScore}% Match</span>
                    </div>
                    <p class="text-[11px] text-slate-600 dark:text-slate-400">
                        Matches ${item.status === 'Lost' ? 'found' : 'lost'} listing reported on ${topMatch.item.date}. ${topMatch.matchedKeywords.length > 0 ? `Shared attributes: <strong>${topMatch.matchedKeywords.join(', ')}</strong>.` : ''}
                    </p>
                    <div class="pt-1 flex justify-end">
                        <button onclick="window.location.href='browse.html?itemId=${topMatch.item.id}'" class="px-3 py-1 bg-primary text-white rounded-lg text-[11px] font-bold hover:opacity-90 transition-all flex items-center gap-1">
                            Compare Listing <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                `;
                aiMatchContainer.classList.remove('hidden');
            } else {
                aiMatchContainer.classList.add('hidden');
            }
        }

        // Show modal
        detailsModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }

    // Modal Close buttons
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            detailsModal.classList.add('hidden');
            claimModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        });
    });

    // Close details, open claim modal
    const modalClaimBtn = document.getElementById('modal-claim-btn');
    if (modalClaimBtn) {
        modalClaimBtn.addEventListener('click', () => {
            const currentUser = window.Storage.getUser();
            if (!currentUser) {
                window.showToast("Please log in to submit a claim!", "error");
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1200);
                return;
            }

            // Fill claim modal default inputs
            document.getElementById('claim-item-name').textContent = currentItemForClaim.name;
            document.getElementById('claim-phone').value = currentUser.phone || '';
            document.getElementById('claim-email').value = currentUser.email || '';

            // Hide details, open claim
            detailsModal.classList.add('hidden');
            claimModal.classList.remove('hidden');
        });
    }

    // Handle Claim Submission
    const claimForm = document.getElementById('claim-form');
    if (claimForm) {
        claimForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const currentUser = window.Storage.getUser();
            if (!currentUser || !currentItemForClaim) return;

            const reason = document.getElementById('claim-reason').value.trim();
            const phone = document.getElementById('claim-phone').value.trim();
            const email = document.getElementById('claim-email').value.trim();

            const claimData = {
                itemId: currentItemForClaim.id,
                itemName: currentItemForClaim.name,
                claimerId: currentUser.id,
                claimerName: currentUser.name,
                reason,
                phone,
                email
            };

            // Save Claim
            const newClaim = window.Storage.createClaim(claimData);

            // Close modal
            claimModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');

            window.showToast("Claim request submitted! Redirecting to Recovery Workspace...");
            
            // Reset form
            claimForm.reset();

            // Refresh cards & redirect to Recovery Workspace
            filterAndRender();
            setTimeout(() => {
                window.location.href = `messages.html?claimId=${newClaim.id}`;
            }, 800);
        });
    }

    // Image Zoom Feature
    const zoomImgBtn = document.getElementById('zoom-image-btn');
    if (zoomImgBtn) {
        zoomImgBtn.addEventListener('click', () => {
            const imgEl = document.getElementById('modal-item-image');
            if (imgEl.classList.contains('scale-150')) {
                imgEl.classList.remove('scale-150', 'z-10');
                zoomImgBtn.innerHTML = '<span class="material-symbols-outlined">zoom_in</span>';
            } else {
                imgEl.classList.add('scale-150', 'z-10');
                zoomImgBtn.innerHTML = '<span class="material-symbols-outlined">zoom_out</span>';
            }
        });
    }

    // Run Initial Load
    filterAndRender();

    // Trigger URL Item open if requested
    if (selectedItemId) {
        setTimeout(() => {
            openDetailsModal(selectedItemId);
        }, 300);
    }
});
