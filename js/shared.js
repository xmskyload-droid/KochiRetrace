// shared.js - Shared UI utilities, header/footer rendering, dark mode, route protection, and session management

document.addEventListener('DOMContentLoaded', () => {
    // Determine path prefixes
    const isSubPage = window.location.pathname.includes('/pages/');
    const rootPrefix = isSubPage ? '../' : './';
    const pagesPrefix = isSubPage ? './' : 'pages/';

    // 1. Centralized Route Protection
    protectRoutes(pagesPrefix);

    // Initialize Theme
    initTheme();

    // Render Global Header and Footer
    renderHeader(rootPrefix, pagesPrefix);
    renderFooter(rootPrefix, pagesPrefix);

    // Setup active state on nav links
    highlightActiveLink();
});

// --- ROUTE PROTECTION SYSTEM ---
function protectRoutes(pagesPrefix) {
    const protectedPaths = ['dashboard.html', 'messages.html', 'report.html'];
    const currentFile = window.location.pathname.split('/').pop();
    
    if (protectedPaths.includes(currentFile)) {
        const user = window.Storage ? window.Storage.getUser() : null;
        if (!user) {
            alert("Access Denied: Please sign in to view this page.");
            window.location.href = `${pagesPrefix}login.html`;
        }
    }

    if (currentFile === 'admin.html') {
        const user = window.Storage ? window.Storage.getUser() : null;
        if (!user || !user.isAdmin) {
            alert("Access Denied: Administrator privileges required.");
            const redirectPath = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
            window.location.href = redirectPath;
        }
    }
}

// --- THEME MANAGEMENT ---
function initTheme() {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
}

function toggleTheme() {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
}

// --- RENDER DYNAMIC NAVIGATION HEADER ---
function renderHeader(rootPrefix, pagesPrefix) {
    const headerEl = document.getElementById('global-header') || document.querySelector('header');
    if (!headerEl) return;

    // Apply header classes
    headerEl.className = "bg-surface-container-lowest/90 backdrop-blur-md dark:bg-slate-900/90 shadow-sm sticky top-0 z-50 transition-all duration-300 w-full";
    headerEl.style.height = "80px";

    const user = window.Storage ? window.Storage.getUser() : null;
    const notifs = user ? window.Storage.getNotifications(user.id) : [];
    const unreadNotifs = notifs.filter(n => !n.read);

    // Create Navigation HTML
    let navHtml = `
    <nav class="flex justify-between items-center w-full px-6 md:px-10 max-w-[1280px] mx-auto h-full">
        <!-- Logo -->
        <a class="flex items-center" href="${rootPrefix}index.html">
            <img src="${rootPrefix}assets/images/logo.png" class="h-14 w-auto object-contain bg-white rounded-lg p-1 shadow-sm border border-slate-100" alt="KochiRetrace Logo">
        </a>

        <!-- Middle Nav Links -->
        <div class="hidden md:flex gap-8 items-center">
            <a class="nav-link text-on-surface-variant dark:text-slate-300 hover:text-primary dark:hover:text-primary-fixed transition-colors font-semibold" href="${rootPrefix}index.html" id="nav-home">Home</a>
            <a class="nav-link text-on-surface-variant dark:text-slate-300 hover:text-primary dark:hover:text-primary-fixed transition-colors font-semibold" href="${pagesPrefix}browse.html" id="nav-browse">Browse</a>
            <a class="nav-link text-on-surface-variant dark:text-slate-300 hover:text-primary dark:hover:text-primary-fixed transition-colors font-semibold" href="${pagesPrefix}map.html" id="nav-map">Map</a>
            <a class="nav-link text-on-surface-variant dark:text-slate-300 hover:text-primary dark:hover:text-primary-fixed transition-colors font-semibold" href="${pagesPrefix}community.html" id="nav-community">Community</a>
            ${user ? `<a class="nav-link text-on-surface-variant dark:text-slate-300 hover:text-primary dark:hover:text-primary-fixed transition-colors font-semibold" href="${pagesPrefix}dashboard.html" id="nav-dashboard">Dashboard</a>` : ''}
        </div>

        <!-- Right Side Controls -->
        <div class="flex items-center gap-4">
            <!-- Report Button -->
            <a href="${pagesPrefix}report.html" class="hidden lg:flex items-center gap-2 bg-primary dark:bg-primary-container text-white px-5 py-2 rounded-full font-semibold text-sm transition-all active:scale-95 hover:opacity-90 shadow-md">
                <span class="material-symbols-outlined text-base">add_circle</span>
                Report Item
            </a>
    `;

    if (user) {
        // Logged In Controls
        navHtml += `
            <!-- Notification Bell -->
            <div class="relative">
                <button id="notif-bell-btn" class="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-full transition-colors text-on-surface-variant dark:text-slate-300 flex items-center justify-center">
                    <span class="material-symbols-outlined">notifications</span>
                    ${unreadNotifs.length > 0 ? `<span class="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[9px] rounded-full flex items-center justify-center font-bold">${unreadNotifs.length}</span>` : ''}
                </button>
                
                <!-- Notification Dropdown -->
                <div id="notif-dropdown" class="hidden absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div class="p-4 border-b border-outline-variant dark:border-slate-700 flex justify-between items-center">
                        <span class="font-bold text-sm text-on-surface dark:text-white">Notifications</span>
                        ${unreadNotifs.length > 0 ? `<button onclick="markAllNotificationsRead()" class="text-xs text-primary dark:text-primary-fixed hover:underline">Mark read</button>` : ''}
                    </div>
                    <div class="max-h-64 overflow-y-auto">
                        ${notifs.length === 0 ? `
                            <div class="p-6 text-center text-xs text-on-surface-variant dark:text-slate-400">No notifications yet</div>
                        ` : notifs.map(n => `
                            <a href="${pagesPrefix}${n.link}" class="block p-4 border-b border-outline-variant/30 dark:border-slate-700/30 hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors ${!n.read ? 'bg-primary-container/10 dark:bg-primary-container/5 font-semibold' : ''}">
                                <p class="text-xs font-bold text-slate-800 dark:text-slate-200">${n.title || 'Update'}</p>
                                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${n.text}</p>
                                <span class="text-[10px] text-outline dark:text-slate-500 mt-1 block">${formatTimeAgo(n.timestamp)}</span>
                            </a>
                        `).join('')}
                    </div>
                    <div class="p-3 bg-surface-container-low dark:bg-slate-900 border-t border-outline-variant dark:border-slate-700 text-center">
                        <a href="${pagesPrefix}dashboard.html" class="text-xs text-primary dark:text-primary-fixed hover:underline font-bold">View all notifications</a>
                    </div>
                </div>
            </div>

            <!-- Profile Menu Dropdown -->
            <div class="relative">
                <div id="profile-dropdown-btn" class="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-fixed cursor-pointer transition-all active:scale-95">
                    <img class="w-full h-full object-cover" src="${user.avatar}" alt="Profile">
                </div>
                
                <!-- Profile Dropdown -->
                <div id="profile-dropdown" class="hidden absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div class="p-4 border-b border-outline-variant dark:border-slate-700">
                        <p class="font-bold text-sm text-on-surface dark:text-white truncate">${user.name}</p>
                        <p class="text-xs text-on-surface-variant dark:text-slate-400 truncate">${user.email}</p>
                    </div>
                    <div class="py-1">
                        ${user.isAdmin ? `
                            <a href="${pagesPrefix}admin.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-primary dark:text-primary-fixed hover:bg-surface-container dark:hover:bg-slate-700 transition-colors font-bold">
                                <span class="material-symbols-outlined text-lg">admin_panel_settings</span> Admin Panel
                            </a>
                        ` : ''}
                        <a href="${pagesPrefix}dashboard.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface dark:text-slate-200 hover:bg-surface-container dark:hover:bg-slate-700 transition-colors">
                            <span class="material-symbols-outlined text-lg">dashboard</span> Dashboard
                        </a>
                        <a href="${pagesPrefix}messages.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface dark:text-slate-200 hover:bg-surface-container dark:hover:bg-slate-700 transition-colors">
                            <span class="material-symbols-outlined text-lg">mail</span> Messages
                        </a>
                    </div>
                    <div class="border-t border-outline-variant dark:border-slate-700 py-1">
                        <button onclick="handleLogout('${rootPrefix}')" class="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error-container/20 transition-colors">
                            <span class="material-symbols-outlined text-lg">logout</span> Log Out
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        // Logged Out Controls
        navHtml += `
            <a href="${pagesPrefix}login.html" class="bg-primary-container/20 text-primary dark:text-primary-fixed border border-primary-container/30 px-5 py-2 rounded-full font-semibold text-sm hover:bg-primary-container/30 transition-all active:scale-95">
                Sign In
            </a>
        `;
    }

    navHtml += `
            <!-- Mobile Menu Toggle -->
            <button id="mobile-menu-btn" class="md:hidden p-2 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container dark:hover:bg-slate-800 rounded-full flex items-center justify-center">
                <span class="material-symbols-outlined">menu</span>
            </button>
        </div>
    </nav>

    <!-- Mobile Drawer Nav -->
    <div id="mobile-drawer" class="hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden flex justify-end">
        <div class="w-72 bg-white dark:bg-slate-800 h-full p-6 flex flex-col gap-6 shadow-2xl relative">
            <button id="mobile-drawer-close" class="absolute top-4 right-4 p-2 text-on-surface-variant dark:text-slate-300">
                <span class="material-symbols-outlined">close</span>
            </button>
            <div class="text-xl font-extrabold text-primary dark:text-primary-fixed mt-6">KochiRetrace</div>
            <div class="flex flex-col gap-4 mt-8">
                <a class="text-lg font-semibold text-on-surface dark:text-slate-200" href="${rootPrefix}index.html">Home</a>
                <a class="text-lg font-semibold text-on-surface dark:text-slate-200" href="${pagesPrefix}browse.html">Browse</a>
                <a class="text-lg font-semibold text-on-surface dark:text-slate-200" href="${pagesPrefix}map.html">Map</a>
                <a class="text-lg font-semibold text-on-surface dark:text-slate-200" href="${pagesPrefix}community.html">Community</a>
                ${user ? `<a class="text-lg font-semibold text-on-surface dark:text-slate-200" href="${pagesPrefix}dashboard.html">Dashboard</a>` : ''}
                <hr class="border-outline-variant/30 my-2">
                <a href="${pagesPrefix}report.html" class="flex justify-center items-center gap-2 bg-primary text-white py-3 rounded-full font-semibold shadow-md">
                    <span class="material-symbols-outlined">add_circle</span> Report Item
                </a>
            </div>
        </div>
    </div>
    `;

    headerEl.innerHTML = navHtml;

    // Attach Dropdown Toggle Handlers
    setupHeaderDropdowns();
}

// --- RENDER DYNAMIC NAVIGATION FOOTER ---
function renderFooter(rootPrefix, pagesPrefix) {
    const footerEl = document.getElementById('global-footer') || document.querySelector('footer');
    if (!footerEl) return;

    footerEl.className = "bg-slate-950 dark:bg-slate-950 text-slate-400 py-16 w-full";
    footerEl.innerHTML = `
    <div class="w-full px-6 md:px-10 max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <div class="space-y-6">
            <div class="flex items-center">
                <img src="${rootPrefix}assets/images/logo.png" class="h-16 w-auto object-contain bg-white rounded-xl p-1.5 shadow-sm" alt="KochiRetrace Logo">
            </div>
            <p class="text-sm max-w-sm">
                Empowering the people of Ernakulam to find what they've lost and return what they've found. Community trust in action.
            </p>
            <div class="text-xs opacity-60">
                © 2026 KochiRetrace. Serving the Greater Ernakulam Community.
            </div>
        </div>
        <div class="grid grid-cols-2 gap-8">
            <div class="space-y-4">
                <h4 class="text-primary-fixed font-bold text-sm uppercase tracking-wider">Emergency</h4>
                <ul class="space-y-2 text-xs">
                    <li><a class="hover:text-white transition-all" href="#">Police Helpline: 112</a></li>
                    <li><a class="hover:text-white transition-all" href="#">Fire Force: 101</a></li>
                    <li><a class="hover:text-white transition-all" href="#">Metro Lost Property</a></li>
                </ul>
            </div>
            <div class="space-y-4">
                <h4 class="text-primary-fixed font-bold text-sm uppercase tracking-wider">Resources</h4>
                <ul class="space-y-2 text-xs">
                    <li><a class="hover:text-white transition-all" href="${pagesPrefix}browse.html">Browse Listings</a></li>
                    <li><a class="hover:text-white transition-all" href="${pagesPrefix}map.html">Interactive Map</a></li>
                    <li><a class="hover:text-white transition-all" href="${pagesPrefix}community.html">Success Stories</a></li>
                </ul>
            </div>
        </div>
    </div>
    `;
}

// --- SETUP DROPDOWNS & DRAWER HANDLERS ---
function setupHeaderDropdowns() {
    const notifBtn = document.getElementById('notif-bell-btn');
    const notifDropdown = document.getElementById('notif-dropdown');
    const profileBtn = document.getElementById('profile-dropdown-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileDrawer = document.getElementById('mobile-drawer');
    const mobileDrawerClose = document.getElementById('mobile-drawer-close');

    // Notif dropdown toggle
    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (profileDropdown) profileDropdown.classList.add('hidden');
            notifDropdown.classList.toggle('hidden');
        });
    }

    // Profile dropdown toggle
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (notifDropdown) notifDropdown.classList.add('hidden');
            profileDropdown.classList.toggle('hidden');
        });
    }

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
        if (notifDropdown) notifDropdown.classList.add('hidden');
        if (profileDropdown) profileDropdown.classList.add('hidden');
    });

    // Mobile Menu Drawer
    if (mobileMenuBtn && mobileDrawer) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileDrawer.classList.remove('hidden');
        });
    }

    if (mobileDrawerClose && mobileDrawer) {
        mobileDrawerClose.addEventListener('click', () => {
            mobileDrawer.classList.add('hidden');
        });
        mobileDrawer.addEventListener('click', (e) => {
            if (e.target === mobileDrawer) mobileDrawer.classList.add('hidden');
        });
    }
}

// --- LOGOUT ACTION ---
function handleLogout(rootPrefix) {
    if (window.Storage) {
        window.Storage.logout();
        window.location.href = rootPrefix + 'index.html';
    }
}

// --- MARK ALL NOTIFS READ ---
function markAllNotificationsRead() {
    if (window.Storage) {
        window.Storage.markNotificationsRead();
        window.location.reload();
    }
}

// --- NAV LINK HIGHLIGHTER ---
function highlightActiveLink() {
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    const linkIds = {
        'index.html': 'nav-home',
        'browse.html': 'nav-browse',
        'map.html': 'nav-map',
        'community.html': 'nav-community',
        'dashboard.html': 'nav-dashboard'
    };
    
    const activeId = linkIds[filename];
    if (activeId) {
        const link = document.getElementById(activeId);
        if (link) {
            link.classList.remove('text-on-surface-variant', 'dark:text-slate-300');
            link.classList.add('text-primary', 'dark:text-primary-fixed', 'border-b-2', 'border-primary', 'dark:border-primary-fixed', 'pb-1');
        }
    }
}

// --- TIME FORMATTING UTILITY ---
function formatTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// --- Toast alert animation ---
function showToast(text, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl z-[999] flex items-center gap-3 animate-fade-in transition-all text-sm font-semibold ${
        type === 'success' 
            ? 'bg-secondary text-white' 
            : type === 'error' 
                ? 'bg-error text-white' 
                : 'bg-primary text-white'
    }`;
    
    const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
    toast.innerHTML = `<span class="material-symbols-outlined">${icon}</span> ${text}`;
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.showToast = showToast;
window.formatTimeAgo = formatTimeAgo;
