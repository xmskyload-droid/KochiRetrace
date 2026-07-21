// dashboard.js - User dashboard panel logic for managing reports and claims (Updated with Event Delegation)

document.addEventListener('DOMContentLoaded', () => {
    // 1. Force Authentication via shared check
    if (!window.Storage) return;
    const currentUser = window.Storage.getUser();
    if (!currentUser) {
        return;
    }

    // Elements
    const userAvatarEl = document.getElementById('dash-user-avatar');
    const userNameEl = document.getElementById('dash-user-name');
    const userEmailEl = document.getElementById('dash-user-email');
    
    const countReportedEl = document.getElementById('count-reported');
    const countClaimsEl = document.getElementById('count-claims');
    const countPendingEl = document.getElementById('count-pending');
    
    const tabReportsBtn = document.getElementById('tab-reports-btn');
    const tabClaimsBtn = document.getElementById('tab-claims-btn');
    const tabRequestsBtn = document.getElementById('tab-requests-btn');
    const tabNotifsBtn = document.getElementById('tab-notifs-btn');
    
    const panelReports = document.getElementById('panel-reports');
    const panelClaims = document.getElementById('panel-claims');
    const panelRequests = document.getElementById('panel-requests');
    const panelNotifs = document.getElementById('panel-notifs');

    const reportsContainer = document.getElementById('my-reports-list');
    const requestsContainer = document.getElementById('received-requests-list');

    // Set user profile details
    if (userAvatarEl) userAvatarEl.src = currentUser.avatar;
    if (userNameEl) userNameEl.textContent = currentUser.name;
    if (userEmailEl) userEmailEl.textContent = currentUser.email;

    // Avatar upload handling
    const avatarUploadInput = document.getElementById('avatar-upload');
    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (!file.type.match('image.*')) {
                    window.showToast("File is not a valid image!", "error");
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(evt) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // Crop/resize to 120x120 square for clean avatar scaling
                        const size = 120;
                        canvas.width = size;
                        canvas.height = size;
                        
                        // Calculate center-crop coordinates
                        let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
                        if (img.width > img.height) {
                            sx = (img.width - img.height) / 2;
                            sWidth = img.height;
                        } else {
                            sy = (img.height - img.width) / 2;
                            sHeight = img.width;
                        }

                        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size);
                        const base64Avatar = canvas.toDataURL('image/jpeg', 0.85);

                        // Save updated avatar in storage layer
                        window.Storage.updateUser(currentUser.id, { avatar: base64Avatar });
                        window.showToast("Profile picture updated!");
                        
                        // Refresh to sync session with global headers
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Tab switcher
    const tabs = [
        { btn: tabReportsBtn, panel: panelReports },
        { btn: tabClaimsBtn, panel: panelClaims },
        { btn: tabRequestsBtn, panel: panelRequests },
        { btn: tabNotifsBtn, panel: panelNotifs }
    ];

    tabs.forEach(tab => {
        if (tab.btn) {
            tab.btn.addEventListener('click', () => {
                // Remove active classes
                tabs.forEach(t => {
                    t.btn.classList.remove('border-primary', 'text-primary', 'dark:border-primary-fixed', 'dark:text-primary-fixed', 'font-bold');
                    t.btn.classList.add('border-transparent', 'text-slate-500');
                    t.panel.classList.add('hidden');
                });
                // Add active classes
                tab.btn.classList.add('border-primary', 'text-primary', 'dark:border-primary-fixed', 'dark:text-primary-fixed', 'font-bold');
                tab.btn.classList.remove('border-transparent', 'text-slate-500');
                tab.panel.classList.remove('hidden');
            });
        }
    });

    // --- EVENT DELEGATION FOR LISTS ---
    if (reportsContainer) {
        reportsContainer.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-item-btn');
            const deleteBtn = e.target.closest('.delete-item-btn');

            if (viewBtn) {
                const id = viewBtn.getAttribute('data-id');
                window.location.href = `browse.html?itemId=${id}`;
            } else if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-id');
                if (confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
                    window.Storage.deleteItem(id);
                    window.showToast("Listing deleted successfully.");
                    renderAll();
                }
            }
        });
    }

    if (requestsContainer) {
        requestsContainer.addEventListener('click', (e) => {
            const verifyBtn = e.target.closest('.verify-claim-btn');
            const declineBtn = e.target.closest('.decline-claim-btn');
            const completeBtn = e.target.closest('.complete-claim-btn');

            if (verifyBtn) {
                const id = verifyBtn.getAttribute('data-id');
                window.Storage.updateClaim(id, 'Verified');
                window.showToast("Claim request verified! Claimant notified.");
                renderAll();
            } else if (declineBtn) {
                const id = declineBtn.getAttribute('data-id');
                if (confirm("Decline this claim? The claimant will be notified.")) {
                    window.Storage.updateClaim(id, 'Declined');
                    window.showToast("Claim request declined.");
                    renderAll();
                }
            } else if (completeBtn) {
                const id = completeBtn.getAttribute('data-id');
                window.Storage.updateClaim(id, 'Returned');
                window.showToast("Item successfully returned. Reconnection completed!");
                renderAll();
            }
        });
    }

    // RENDER FUNCTIONS
    function renderStats() {
        const items = window.Storage.getItems(true); // include unverified — user should see their own
        const claims = window.Storage.getClaims();

        const myReports = items.filter(i => i.reporterId === currentUser.id);
        const myClaims = claims.filter(c => c.claimerId === currentUser.id);
        
        // Requests received: claims on my items
        const receivedRequests = claims.filter(c => {
            const item = items.find(i => i.id === c.itemId);
            return item && item.reporterId === currentUser.id && c.status === 'Claim Requested';
        });

        if (countReportedEl) countReportedEl.textContent = myReports.length;
        if (countClaimsEl) countClaimsEl.textContent = myClaims.length;
        if (countPendingEl) countPendingEl.textContent = receivedRequests.length;
    }

    function renderMyReports() {
        const myReports = window.Storage.getItems(true).filter(i => i.reporterId === currentUser.id);
        if (!reportsContainer) return;

        if (myReports.length === 0) {
            reportsContainer.innerHTML = `
                <div class="py-12 text-center text-slate-500 dark:text-slate-400 col-span-full">
                    <span class="material-symbols-outlined text-4xl opacity-30 mb-2">post_add</span>
                    <p class="font-semibold">No items reported yet</p>
                    <a href="report.html" class="text-xs text-primary dark:text-primary-fixed hover:underline mt-1 block">Report an item now</a>
                </div>
            `;
            return;
        }

        const badgeClasses = {
            'Lost': 'bg-error-container text-on-error-container border-error/20',
            'Found': 'bg-secondary-container text-on-secondary-container border-secondary/20',
            'Claim Requested': 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300',
            'Verified': 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300',
            'Returned': 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300'
        };

        reportsContainer.innerHTML = myReports.map(item => `
            <div class="flex items-center gap-4 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm relative">
                <img class="w-16 h-16 rounded-xl object-cover bg-slate-100 dark:bg-slate-900" src="${item.image}" alt="${item.name}">
                <div class="flex-grow min-w-0">
                    <h4 class="font-bold text-slate-900 dark:text-white truncate text-sm">${item.name}</h4>
                    <p class="text-[10px] text-slate-405 dark:text-slate-400 mt-0.5">${item.locality} • ${item.date}</p>
                    <span class="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${badgeClasses[item.status] || 'bg-slate-100'}">
                        ${item.status}
                    </span>
                </div>
                <div class="flex items-center gap-1">
                    <button data-id="${item.id}" class="view-item-btn p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-primary transition-colors" title="View details">
                        <span class="material-symbols-outlined text-lg">visibility</span>
                    </button>
                    <button data-id="${item.id}" class="delete-item-btn p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-slate-400 hover:text-error transition-colors" title="Delete listing">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    function renderClaimsMade() {
        const claims = window.Storage.getClaims().filter(c => c.claimerId === currentUser.id);
        const container = document.getElementById('my-claims-list');
        if (!container) return;

        if (claims.length === 0) {
            container.innerHTML = `
                <div class="py-12 text-center text-slate-500 dark:text-slate-400">
                    <span class="material-symbols-outlined text-4xl opacity-30 mb-2">handshake</span>
                    <p class="font-semibold">You haven't claimed any items yet</p>
                </div>
            `;
            return;
        }

        const badgeClasses = {
            'Claim Requested': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200',
            'Verified': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200',
            'Returned': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200',
            'Declined': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200'
        };

        container.innerHTML = claims.map(claim => `
            <div class="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div class="flex justify-between items-start gap-4">
                    <h4 class="font-bold text-slate-900 dark:text-white hover:underline cursor-pointer text-sm" onclick="window.location.href='browse.html?itemId=${claim.itemId}'">
                        ${claim.itemName}
                    </h4>
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${badgeClasses[claim.status] || 'bg-slate-100'}">
                        ${claim.status}
                    </span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 leading-normal"><strong>Verification details:</strong> ${claim.reason}</p>
                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[9px] text-slate-400">
                    <span>Submitted ${formatTimeAgo(claim.timestamp)}</span>
                    <span class="font-bold">Claim ID: ${claim.id}</span>
                </div>
            </div>
        `).join('');
    }

    function renderReceivedRequests() {
        const items = window.Storage.getItems(true); // include unverified for received claims check
        const claims = window.Storage.getClaims();
        
        // Filter claims on items that belong to the current user
        const requests = claims.filter(c => {
            const item = items.find(i => i.id === c.itemId);
            return item && item.reporterId === currentUser.id;
        });

        if (!requestsContainer) return;

        if (requests.length === 0) {
            requestsContainer.innerHTML = `
                <div class="py-12 text-center text-slate-500 dark:text-slate-400">
                    <span class="material-symbols-outlined text-4xl opacity-30 mb-2">inbox</span>
                    <p class="font-semibold">No claim requests received</p>
                </div>
            `;
            return;
        }

        requestsContainer.innerHTML = requests.map(req => {
            const isPending = req.status === 'Claim Requested';
            const isVerified = req.status === 'Verified';

            return `
            <div class="p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
                <div class="flex justify-between items-start gap-4">
                    <div>
                        <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Item Listed:</span>
                        <h4 class="font-bold text-slate-900 dark:text-white hover:underline cursor-pointer text-sm" onclick="window.location.href='browse.html?itemId=${req.itemId}'">${req.itemName}</h4>
                    </div>
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold border border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-350">
                        ${req.status}
                    </span>
                </div>
                
                <div class="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-2 text-xs">
                    <p class="text-slate-500 dark:text-slate-400"><strong>Claimant:</strong> ${req.claimerName} (${req.email})</p>
                    <p class="text-slate-500 dark:text-slate-400"><strong>Claimant Phone:</strong> ${req.phone}</p>
                    <p class="text-slate-700 dark:text-slate-300 italic mt-2">" ${req.reason} "</p>
                </div>

                <div class="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <a href="messages.html?claimId=${req.id}" class="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline">
                        <span class="material-symbols-outlined text-sm">chat</span> Open Recovery Workspace
                    </a>
                    
                    ${isPending ? `
                        <div class="flex justify-end gap-2">
                            <button data-id="${req.id}" class="decline-claim-btn px-3 py-1.5 border border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 text-error rounded-lg text-xs font-bold transition-all active:scale-95">
                                Decline
                            </button>
                            <button data-id="${req.id}" class="verify-claim-btn px-4 py-1.5 bg-primary text-white hover:opacity-95 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-md flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm">verified</span> Approve Claim
                            </button>
                        </div>
                    ` : ''}

                    ${isVerified ? `
                        <div class="flex justify-end gap-2">
                            <button data-id="${req.id}" class="complete-claim-btn px-4 py-1.5 bg-secondary text-white hover:opacity-95 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-md flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm">check_circle</span> Mark as Returned
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
            `;
        }).join('');
    }

    function renderNotifications() {
        const notifs = window.Storage.getNotifications(currentUser.id);
        const container = document.getElementById('notifications-list');
        if (!container) return;

        if (notifs.length === 0) {
            container.innerHTML = `
                <div class="py-12 text-center text-slate-500 dark:text-slate-400">
                    <span class="material-symbols-outlined text-4xl opacity-30 mb-2">notifications_off</span>
                    <p class="font-semibold">No notifications</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notifs.map(n => `
            <a href="${n.link}" class="block p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 shadow-sm transition-all ${!n.read ? 'border-l-4 border-l-primary font-semibold' : ''}">
                <p class="text-xs font-bold text-slate-800 dark:text-slate-200">${n.title || 'Notification'}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${n.text}</p>
                <span class="text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 block">${formatTimeAgo(n.timestamp)}</span>
            </a>
        `).join('');
    }

    function renderAll() {
        renderStats();
        renderMyReports();
        renderClaimsMade();
        renderReceivedRequests();
        renderNotifications();
    }

    // Listen for realtime multi-device sync updates from Firestore
    window.addEventListener('storage-updated', renderAll);

    // Initial Load
    renderAll();
});
