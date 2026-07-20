// admin.js - Core control panel for KochiRetrace single-admin moderation

document.addEventListener('DOMContentLoaded', () => {
    // 1. Double check Authentication (guarded by shared protectRoutes, but redundant check is safe)
    if (!window.Storage) return;
    const currentUser = window.Storage.getUser();
    if (!currentUser || !currentUser.isAdmin) {
        window.location.href = '../index.html';
        return;
    }

    // 2. Sidebar Tab Switching
    const tabButtons = document.querySelectorAll('.admin-tab-btn');
    const panels = document.querySelectorAll('.admin-panel');
    let activeTab = 'dashboard';

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    function switchTab(tabName) {
        activeTab = tabName;
        
        // Toggle Active Classes
        tabButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('text-primary', 'bg-primary-fixed/15');
                btn.classList.remove('text-slate-500');
            } else {
                btn.classList.remove('text-primary', 'bg-primary-fixed/15');
                btn.classList.add('text-slate-500');
            }
        });

        // Toggle panel visibility
        panels.forEach(panel => {
            if (panel.id === `panel-${tabName}`) {
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
            }
        });

        // Trigger dynamic rendering for active tab
        renderTabContent(tabName);
    }

    function renderTabContent(tabName) {
        switch (tabName) {
            case 'dashboard':
                renderDashboard();
                break;
            case 'users':
                renderUsers();
                break;
            case 'items':
                renderItems();
                break;
            case 'claims':
                renderClaims();
                break;
            case 'verification':
                renderVerificationQueue();
                break;
            case 'stories':
                renderStories();
                break;
            case 'map':
                renderMap();
                break;
            case 'settings':
                renderSettings();
                break;
            case 'logs':
                renderLogs();
                break;
        }
        
        // Update badge counts in sidebar
        updateSidebarBadges();
    }

    // 3. Update Sidebar Badge Counts
    function updateSidebarBadges() {
        const items = window.Storage.getItems(true);
        const unverifiedCount = items.filter(i => i.verifiedByAdmin === false).length;
        const queueBadge = document.getElementById('queue-badge');
        if (queueBadge) {
            if (unverifiedCount > 0) {
                queueBadge.textContent = unverifiedCount;
                queueBadge.classList.remove('hidden');
            } else {
                queueBadge.classList.add('hidden');
            }
        }

        const stories = window.Storage.getStories();
        const unverifiedStories = stories.filter(s => s.verifiedByAdmin === false).length;
        const storiesBadge = document.getElementById('stories-queue-badge');
        if (storiesBadge) {
            if (unverifiedStories > 0) {
                storiesBadge.textContent = unverifiedStories;
                storiesBadge.classList.remove('hidden');
            } else {
                storiesBadge.classList.add('hidden');
            }
        }
    }

    // 4. RENDER: DASHBOARD OVERVIEW
    function renderDashboard() {
        const users = window.Storage.getUsers();
        const items = window.Storage.getItems(true);
        const claims = window.Storage.getClaims();

        const registeredUsers = users.length;
        const lostCount = items.filter(i => i.status === 'Lost').length;
        const foundCount = items.filter(i => i.status === 'Found').length;
        const returnedCount = items.filter(i => i.status === 'Returned').length;
        const claimsCount = claims.filter(c => c.status === 'Claim Requested').length;
        const pendingVerify = items.filter(i => i.verifiedByAdmin === false).length;
        
        // Calculate recovery rate
        const recoveryRate = Math.round((returnedCount / (lostCount + foundCount + returnedCount || 1)) * 100);

        document.getElementById('stat-total-users').textContent = registeredUsers;
        document.getElementById('stat-active-lost').textContent = lostCount;
        document.getElementById('stat-active-found').textContent = foundCount;
        document.getElementById('stat-returned-items').textContent = returnedCount;
        document.getElementById('stat-recovery-rate').textContent = `${recoveryRate}%`;
        document.getElementById('stat-active-claims').textContent = claimsCount;
        document.getElementById('stat-pending-verify').textContent = pendingVerify;

        // Render Recent Audit logs inside dashboard
        const logs = window.Storage.getAuditLogs().slice(0, 5);
        const activityLog = document.getElementById('dash-activity-log');
        if (activityLog) {
            if (logs.length === 0) {
                activityLog.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">No recent activities</p>`;
            } else {
                activityLog.innerHTML = logs.map(l => `
                    <div class="flex justify-between items-start gap-4 text-xs border-b border-slate-100 dark:border-slate-800 pb-2 last:border-none">
                        <div class="space-y-0.5">
                            <span class="font-bold text-slate-800 dark:text-slate-200 block">${l.action}</span>
                            <span class="text-slate-500 dark:text-slate-400 block">${l.details}</span>
                        </div>
                        <span class="text-[10px] text-slate-400 font-semibold whitespace-nowrap">${window.formatTimeAgo(l.timestamp)}</span>
                    </div>
                `).join('');
            }
        }
    }

    // 5. RENDER: USERS TABLE
    const usersTbody = document.getElementById('users-tbody');
    const userSearch = document.getElementById('user-search');

    if (userSearch) {
        userSearch.addEventListener('input', renderUsers);
    }

    function renderUsers() {
        if (!usersTbody) return;
        const users = window.Storage.getUsers();
        const searchQuery = userSearch ? userSearch.value.trim().toLowerCase() : '';

        const filtered = users.filter(u => 
            u.name.toLowerCase().includes(searchQuery) || 
            u.email.toLowerCase().includes(searchQuery)
        );

        if (filtered.length === 0) {
            usersTbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">No users found</td></tr>`;
            return;
        }

        usersTbody.innerHTML = filtered.map(u => `
            <tr class="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td class="p-4 flex items-center gap-3">
                    <img class="w-8 h-8 rounded-full object-cover bg-slate-100 dark:bg-slate-900" src="${u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=50&h=50&q=80'}" alt="">
                    <span class="font-bold text-slate-900 dark:text-white">${u.name}</span>
                </td>
                <td class="p-4 text-slate-500 dark:text-slate-400">${u.email}</td>
                <td class="p-4 font-semibold text-slate-700 dark:text-slate-300">${u.isAdmin ? 'Admin' : 'User'}</td>
                <td class="p-4">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        u.status === 'Suspended' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        u.status === 'Banned' ? 'bg-red-100 text-red-800 border-red-300' :
                        'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }">${u.status || 'Active'}</span>
                </td>
                <td class="p-4 text-right space-x-1.5 whitespace-nowrap">
                    ${!u.isAdmin ? `
                        <button data-id="${u.id}" data-action="toggle-suspend" class="user-action-btn border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-3 py-1.5 rounded-lg">
                            ${u.status === 'Suspended' ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button data-id="${u.id}" data-action="ban" class="user-action-btn border border-red-200 hover:bg-red-55/20 text-error font-bold px-3 py-1.5 rounded-lg">
                            ${u.status === 'Banned' ? 'Unban' : 'Ban'}
                        </button>
                        <button data-id="${u.id}" data-action="delete" class="user-action-btn p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-error rounded-lg" title="Delete account">
                            <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                    ` : '<span class="text-xs text-slate-400 italic">Protected</span>'}
                </td>
            </tr>
        `).join('');
    }

    // Event Delegation: User actions
    if (usersTbody) {
        usersTbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.user-action-btn');
            if (!btn) return;

            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');
            const users = window.Storage.getUsers();
            const user = users.find(u => u.id === id);

            if (!user) return;

            if (action === 'toggle-suspend') {
                const newStatus = user.status === 'Suspended' ? 'Active' : 'Suspended';
                window.Storage.updateUserStatus(id, newStatus);
                window.showToast(`User status set to ${newStatus}`);
                renderUsers();
            } else if (action === 'ban') {
                const newStatus = user.status === 'Banned' ? 'Active' : 'Banned';
                window.Storage.updateUserStatus(id, newStatus);
                window.showToast(`User status set to ${newStatus}`);
                renderUsers();
            } else if (action === 'delete') {
                if (confirm(`Are you sure you want to permanently delete user "${user.name}"? This removes them from system.`)) {
                    window.Storage.deleteUser(id);
                    window.showToast("User account deleted");
                    renderUsers();
                }
            }
        });
    }

    // 6. RENDER: ITEMS INVENTORY
    const itemsTbody = document.getElementById('items-tbody');
    const itemSearch = document.getElementById('item-search');
    const itemFilter = document.getElementById('item-status-filter');

    if (itemSearch) itemSearch.addEventListener('input', renderItems);
    if (itemFilter) itemFilter.addEventListener('change', renderItems);

    function renderItems() {
        if (!itemsTbody) return;
        const items = window.Storage.getItems(true); // include unverified
        const query = itemSearch ? itemSearch.value.trim().toLowerCase() : '';
        const statusVal = itemFilter ? itemFilter.value : 'All';

        let filtered = items;

        if (query) {
            filtered = filtered.filter(i => i.name.toLowerCase().includes(query) || i.locality.toLowerCase().includes(query));
        }

        if (statusVal !== 'All') {
            filtered = filtered.filter(i => i.status === statusVal);
        }

        if (filtered.length === 0) {
            itemsTbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">No items found</td></tr>`;
            return;
        }

        itemsTbody.innerHTML = filtered.map(item => {
            const statusClasses =
                item.status === 'Lost'  ? 'bg-red-50 text-error border-red-200' :
                item.status === 'Found' ? 'bg-secondary-container text-on-secondary-container border-secondary/20' :
                'bg-emerald-50 text-emerald-800 border-emerald-200';
            const verifiedBadge = item.verifiedByAdmin === false
                ? `<span class="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">PENDING</span>`
                : '';
            return `
            <tr class="item-row border-b border-slate-100 hover:bg-slate-50/60 transition-colors" data-item-id="${item.id}">
                <td class="p-4 flex items-center gap-3">
                    <img
                        class="w-10 h-10 rounded-xl object-cover bg-slate-100 cursor-zoom-in hover:scale-110 transition-transform"
                        src="${item.image || 'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&w=50&h=50&q=80'}"
                        alt="${item.name}"
                        data-lightbox
                        data-lightbox-caption="${item.name} · ${item.locality}"
                        title="Click to enlarge"
                    >
                    <span class="font-bold text-slate-900 truncate max-w-[140px] block" title="${item.name}">${item.name}</span>
                </td>
                <td class="p-4 text-slate-500">${item.category}</td>
                <td class="p-4 text-slate-600">${item.locality}</td>
                <td class="p-4 text-slate-600">${item.reporterName || '—'}</td>
                <td class="p-4">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusClasses}">${item.status}</span>
                    ${verifiedBadge}
                </td>
                <td class="p-4 text-right space-x-1 whitespace-nowrap">
                    <button data-id="${item.id}" data-action="expand"
                        class="item-action-btn p-1.5 hover:bg-primary/10 text-primary rounded-lg" title="View details">
                        <span class="material-symbols-outlined text-lg">expand_more</span>
                    </button>
                    ${item.verifiedByAdmin === false ? `
                    <button data-id="${item.id}" data-action="verify"
                        class="item-action-btn p-1.5 hover:bg-emerald-50 text-emerald-700 rounded-lg" title="Approve listing">
                        <span class="material-symbols-outlined text-lg">check_circle</span>
                    </button>` : ''}
                    <button data-id="${item.id}" data-action="delete"
                        class="item-action-btn p-1.5 hover:bg-red-50 text-error rounded-lg" title="Delete listing">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </td>
            </tr>
            <tr class="detail-row hidden bg-slate-50 border-b border-slate-200" id="detail-${item.id}">
                <td colspan="6" class="px-6 py-5">
                    <div class="flex gap-6 flex-wrap">
                        <img
                            src="${item.image || 'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&w=300&q=80'}"
                            class="w-36 h-36 rounded-2xl object-cover flex-shrink-0 cursor-zoom-in shadow"
                            data-lightbox
                            data-lightbox-caption="${item.name} · ${item.locality}"
                            alt="${item.name}"
                        >
                        <div class="flex-1 grid grid-cols-2 gap-x-8 gap-y-2 text-sm min-w-[240px]">
                            <div><span class="text-slate-400 text-xs uppercase tracking-wide">Item ID</span><p class="font-mono text-xs text-slate-600 mt-0.5">${item.id}</p></div>
                            <div><span class="text-slate-400 text-xs uppercase tracking-wide">Date Lost/Found</span><p class="font-semibold text-slate-700 mt-0.5">${item.date || '—'}</p></div>
                            <div><span class="text-slate-400 text-xs uppercase tracking-wide">Landmark</span><p class="font-semibold text-slate-700 mt-0.5">${item.landmark || '—'}</p></div>
                            <div><span class="text-slate-400 text-xs uppercase tracking-wide">Reporter</span><p class="font-semibold text-slate-700 mt-0.5">${item.reporterName || '—'}</p></div>
                            <div><span class="text-slate-400 text-xs uppercase tracking-wide">Contact Phone</span><p class="font-semibold text-slate-700 mt-0.5">${item.phone || '—'}</p></div>
                            <div><span class="text-slate-400 text-xs uppercase tracking-wide">Contact Email</span><p class="font-semibold text-slate-700 mt-0.5">${item.email || '—'}</p></div>
                            <div class="col-span-2"><span class="text-slate-400 text-xs uppercase tracking-wide">Description</span><p class="text-slate-700 mt-0.5 leading-relaxed">${item.description || '—'}</p></div>
                            <div><span class="text-slate-400 text-xs uppercase tracking-wide">Status</span><p class="font-semibold mt-0.5">${item.status}</p></div>
                            <div><span class="text-slate-400 text-xs uppercase tracking-wide">Admin Verified</span><p class="font-semibold mt-0.5 ${item.verifiedByAdmin === false ? 'text-amber-600' : 'text-emerald-600'}">${item.verifiedByAdmin === false ? '⏳ Pending' : '✅ Approved'}</p></div>
                        </div>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    if (itemsTbody) {
        itemsTbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.item-action-btn');
            if (!btn) return;

            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');

            if (action === 'expand') {
                const detailRow = document.getElementById(`detail-${id}`);
                const icon = btn.querySelector('.material-symbols-outlined');
                if (detailRow) {
                    detailRow.classList.toggle('hidden');
                    icon.textContent = detailRow.classList.contains('hidden') ? 'expand_more' : 'expand_less';
                    btn.title = detailRow.classList.contains('hidden') ? 'View details' : 'Hide details';
                }
            } else if (action === 'verify') {
                window.Storage.updateItem(id, { verifiedByAdmin: true });
                window.Storage.addAuditLog('Item Approved', `Admin approved listing ID: ${id}`);
                window.showToast('Listing approved and published! ✅');
                renderItems();
                updateSidebarBadges();
            } else if (action === 'delete') {
                if (confirm('Delete this listing permanently?')) {
                    window.Storage.deleteItem(id);
                    window.Storage.addAuditLog('Item Deleted', `Deleted item ID: ${id}`);
                    window.showToast('Listing deleted');
                    renderItems();
                    updateSidebarBadges();
                }
            }
        });
    }


    // 7. RENDER: CLAIMS MANAGEMENT
    const claimsTbody = document.getElementById('claims-tbody');

    function renderClaims() {
        if (!claimsTbody) return;
        const claims = window.Storage.getClaims();

        if (claims.length === 0) {
            claimsTbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">No claims submitted</td></tr>`;
            return;
        }

        claimsTbody.innerHTML = claims.map(c => `
            <tr class="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td class="p-4">
                    <span class="font-bold text-slate-900 dark:text-white">${c.itemName}</span>
                    <span class="text-[9px] text-slate-400 block mt-0.5">Item ID: ${c.itemId}</span>
                </td>
                <td class="p-4">
                    <span class="font-bold text-slate-800 dark:text-slate-350 block">${c.claimerName}</span>
                    <span class="text-[10px] text-slate-500 block">${c.email}</span>
                </td>
                <td class="p-4 text-slate-600 dark:text-slate-400 max-w-sm truncate" title="${c.reason}">${c.reason}</td>
                <td class="p-4">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        c.status === 'Claim Requested' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        c.status === 'Verified' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        c.status === 'Returned' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        'bg-red-105 text-red-800 border-red-300'
                    }">${c.status}</span>
                </td>
                <td class="p-4 text-right space-x-1.5 whitespace-nowrap">
                    ${c.status === 'Claim Requested' ? `
                        <button data-id="${c.id}" data-action="approve" class="claim-action-btn bg-primary text-white font-bold px-3 py-1.5 rounded-lg hover:opacity-95 transition-all">
                            Approve
                        </button>
                        <button data-id="${c.id}" data-action="reject" class="claim-action-btn border border-red-300 text-error hover:bg-red-50 font-bold px-3 py-1.5 rounded-lg transition-all">
                            Reject
                        </button>
                    ` : `<span class="text-xs text-slate-400 italic">Settled</span>`}
                </td>
            </tr>
        `).join('');
    }

    if (claimsTbody) {
        claimsTbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.claim-action-btn');
            if (!btn) return;

            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');

            if (action === 'approve') {
                window.Storage.updateClaim(id, 'Verified');
                window.showToast("Claim request verified successfully.");
                renderClaims();
            } else if (action === 'reject') {
                if (confirm("Decline this claim? The user will be notified.")) {
                    window.Storage.updateClaim(id, 'Declined');
                    window.showToast("Claim declined.");
                    renderClaims();
                }
            }
        });
    }

    // 8. RENDER: VERIFICATION QUEUE
    const verificationList = document.getElementById('verification-list');

    function renderVerificationQueue() {
        if (!verificationList) return;
        const items = window.Storage.getItems(true).filter(i => i.verifiedByAdmin === false);

        if (items.length === 0) {
            verificationList.innerHTML = `
                <div class="py-12 text-center text-slate-400 border border-dashed rounded-3xl">
                    <span class="material-symbols-outlined text-4xl opacity-30 mb-2">fact_check</span>
                    <p class="font-semibold text-slate-700 dark:text-slate-350">Verification Queue is clean</p>
                    <p class="text-xs mt-0.5">No new listings require moderation.</p>
                </div>
            `;
            return;
        }

        verificationList.innerHTML = items.map(i => `
            <div class="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-5 items-center justify-between shadow-sm">
                <div class="flex items-center gap-4 w-full sm:w-auto">
                    <img class="w-16 h-16 rounded-xl object-cover bg-slate-100 border" src="${i.image}" alt="">
                    <div>
                        <span class="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[9px] font-bold uppercase tracking-wider">${i.status}</span>
                        <h4 class="font-extrabold text-sm text-slate-900 dark:text-white mt-1 leading-snug">${i.name}</h4>
                        <p class="text-xs text-slate-500 mt-0.5">${i.locality} • Reported by ${i.reporterName}</p>
                    </div>
                </div>
                
                <!-- Action CTA -->
                <div class="flex gap-2 w-full sm:w-auto justify-end">
                    <button data-id="${i.id}" data-action="reject-verify" class="verify-queue-btn px-4 py-2 border border-red-300 text-error hover:bg-red-50 dark:hover:bg-red-950/20 font-bold text-xs rounded-xl transition-all active:scale-95">
                        Decline
                    </button>
                    <button data-id="${i.id}" data-action="approve-verify" class="verify-queue-btn px-5 py-2 bg-secondary text-white hover:opacity-95 font-bold text-xs rounded-xl transition-all active:scale-95 shadow flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">check</span> Approve
                    </button>
                </div>
            </div>
        `).join('');
    }

    if (verificationList) {
        verificationList.addEventListener('click', (e) => {
            const btn = e.target.closest('.verify-queue-btn');
            if (!btn) return;

            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');

            if (action === 'approve-verify') {
                window.Storage.updateItem(id, { verifiedByAdmin: true });
                window.Storage.addAuditLog('Listing Approved', `Approved item listing "${id}"`);
                window.showToast("Listing approved! It is now visible publicly.");
                renderVerificationQueue();
            } else if (action === 'reject-verify') {
                if (confirm("Reject and delete this listing?")) {
                    window.Storage.deleteItem(id);
                    window.Storage.addAuditLog('Listing Rejected', `Rejected & deleted item listing "${id}"`);
                    window.showToast("Listing declined & removed.");
                    renderVerificationQueue();
                }
            }
        });
    }

    // 9. RENDER: COMMUNITY STORIES
    const storiesTbody = document.getElementById('stories-tbody');

    function renderStories() {
        if (!storiesTbody) return;
        const stories = window.Storage.getStories();

        if (stories.length === 0) {
            storiesTbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">No stories found</td></tr>`;
            return;
        }

        storiesTbody.innerHTML = stories.map(s => `
            <tr class="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td class="p-4 font-bold text-slate-900 dark:text-white max-w-[150px] truncate" title="${s.title}">${s.title}</td>
                <td class="p-4 text-slate-500">${s.author}</td>
                <td class="p-4 text-slate-500 max-w-sm truncate" title="${s.content}">${s.content}</td>
                <td class="p-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.verifiedByAdmin !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }">${s.verifiedByAdmin !== false ? 'Approved' : 'Pending'}</span>
                </td>
                <td class="p-4 text-right space-x-1 whitespace-nowrap">
                    ${s.verifiedByAdmin === false ? `
                        <button data-id="${s.id}" data-action="approve-story" class="story-action-btn bg-secondary text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm hover:opacity-95">Approve</button>
                    ` : ''}
                    <button data-id="${s.id}" data-action="delete-story" class="story-action-btn border border-red-300 text-error hover:bg-red-50 text-[11px] font-bold px-2.5 py-1.5 rounded-lg">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    if (storiesTbody) {
        storiesTbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.story-action-btn');
            if (!btn) return;

            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');

            if (action === 'approve-story') {
                window.Storage.updateStoryStatus(id, true);
                window.showToast("Story approved for community wall!");
                renderStories();
            } else if (action === 'delete-story') {
                if (confirm("Delete this story permanently?")) {
                    window.Storage.deleteStory(id);
                    window.showToast("Story deleted");
                    renderStories();
                }
            }
        });
    }

    // 10. RENDER: MAP MANAGEMENT
    const mapTbody = document.getElementById('map-tbody');
    const openLocalityBtn = document.getElementById('add-locality-btn');
    const localityModal = document.getElementById('locality-modal');
    const localityForm = document.getElementById('locality-form');
    
    let editingLocalityKey = null;

    function renderMap() {
        if (!mapTbody) return;
        const localities = window.Config.LOCALITIES;

        mapTbody.innerHTML = Object.keys(localities).map(name => {
            const data = localities[name];
            return `
                <tr class="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td class="p-4 font-bold text-slate-900 dark:text-white">${name}</td>
                    <td class="p-4 text-slate-500 font-mono">${data.lat}</td>
                    <td class="p-4 text-slate-500 font-mono">${data.lng}</td>
                    <td class="p-4 text-right space-x-1 whitespace-nowrap">
                        <button data-id="${name}" data-action="edit" class="map-action-btn border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-100 font-bold px-2.5 py-1.5 rounded-lg">Edit</button>
                        <button data-id="${name}" data-action="delete" class="map-action-btn border border-red-300 text-error hover:bg-red-55/10 font-bold px-2.5 py-1.5 rounded-lg">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Open Add Modal
    if (openLocalityBtn && localityModal) {
        openLocalityBtn.addEventListener('click', () => {
            editingLocalityKey = null;
            document.getElementById('locality-modal-title').textContent = "Add Locality";
            localityForm.reset();
            localityModal.classList.remove('hidden');
        });
    }

    // Close Modals
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (localityModal) localityModal.classList.add('hidden');
        });
    });

    // Form submit coordinates
    if (localityForm) {
        localityForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('loc-name').value.trim();
            const lat = parseFloat(document.getElementById('loc-lat').value);
            const lng = parseFloat(document.getElementById('loc-lng').value);

            if (!name || isNaN(lat) || isNaN(lng)) return;

            const localities = window.Config.LOCALITIES;
            
            if (editingLocalityKey) {
                // If name changed, delete old key
                if (editingLocalityKey !== name) {
                    delete localities[editingLocalityKey];
                }
            }

            localities[name] = { lat, lng };
            localStorage.setItem('kochiretrace_localities', JSON.stringify(localities));
            
            window.Storage.addAuditLog('Map Location Updated', `Locality ${name} configured at [${lat}, ${lng}]`);
            window.showToast("Locality saved!");

            localityModal.classList.add('hidden');
            renderMap();
        });
    }

    // Edit/delete localities
    if (mapTbody) {
        mapTbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.map-action-btn');
            if (!btn) return;

            const name = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');
            const localities = window.Config.LOCALITIES;

            if (action === 'edit') {
                editingLocalityKey = name;
                document.getElementById('locality-modal-title').textContent = "Edit Locality";
                
                document.getElementById('loc-name').value = name;
                document.getElementById('loc-lat').value = localities[name].lat;
                document.getElementById('loc-lng').value = localities[name].lng;
                
                localityModal.classList.remove('hidden');
            } else if (action === 'delete') {
                if (confirm(`Remove locality "${name}" from system settings?`)) {
                    delete localities[name];
                    localStorage.setItem('kochiretrace_localities', JSON.stringify(localities));
                    window.Storage.addAuditLog('Map Location Removed', `Removed locality: ${name}`);
                    window.showToast("Locality deleted");
                    renderMap();
                }
            }
        });
    }

    // 11. RENDER: SYSTEM SETTINGS
    const settingsForm = document.getElementById('admin-settings-form');

    function renderSettings() {
        if (!settingsForm) return;
        const s = window.Storage.getSettings();

        document.getElementById('set-site-name').value = s.siteName;
        document.getElementById('set-support-email').value = s.contactEmail;
        document.getElementById('set-upload-limit').value = s.uploadLimit;
        document.getElementById('set-archive-days').value = s.autoArchiveDays;
        document.getElementById('set-require-verification').checked = !!s.requireVerification;
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const settings = {
                siteName: document.getElementById('set-site-name').value.trim(),
                contactEmail: document.getElementById('set-support-email').value.trim(),
                uploadLimit: document.getElementById('set-upload-limit').value,
                autoArchiveDays: parseInt(document.getElementById('set-archive-days').value) || 30,
                requireVerification: document.getElementById('set-require-verification').checked
            };

            window.Storage.saveSettings(settings);
            window.showToast("Global system preferences saved.");
            renderSettings();
        });
    }

    // 12. RENDER: AUDIT LOGS
    const logsTbody = document.getElementById('logs-tbody');

    function renderLogs() {
        if (!logsTbody) return;
        const logs = window.Storage.getAuditLogs();

        if (logs.length === 0) {
            logsTbody.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-slate-400">No logs stored</td></tr>`;
            return;
        }

        logsTbody.innerHTML = logs.map(l => {
            const timeStr = new Date(l.timestamp).toLocaleString();
            return `
                <tr class="border-b border-slate-100 dark:border-slate-800/60 text-slate-655 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td class="p-4 font-semibold text-slate-500 whitespace-nowrap">${timeStr}</td>
                    <td class="p-4 font-bold text-slate-800 dark:text-slate-350">${l.action}</td>
                    <td class="p-4 text-slate-600 dark:text-slate-400">${l.details}</td>
                </tr>
            `;
        }).join('');
    }

    // 13. LOGOUT BUTTON
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.Storage.logout();
            window.location.href = '../index.html';
        });
    }

    // Initial Load default Dashboard Tab
    switchTab('dashboard');
});
