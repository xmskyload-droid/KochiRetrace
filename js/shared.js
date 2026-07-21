// shared.js - Shared UI utilities, header/footer rendering, dark mode, route protection, and session management

document.addEventListener('DOMContentLoaded', () => {
    // Determine path prefixes
    const isSubPage = window.location.pathname.includes('/pages/');
    const rootPrefix = isSubPage ? '../' : './';
    const pagesPrefix = isSubPage ? './' : 'pages/';

    // Inject global mobile & PWA CSS fixes
    injectMobileStyles();

    // 1. Centralized Route Protection
    protectRoutes(pagesPrefix);

    // Initialize Theme
    initTheme();

    // Render Global Header, Bottom Mobile Nav, and Footer
    renderHeader(rootPrefix, pagesPrefix);
    renderBottomNav(rootPrefix, pagesPrefix);
    renderFooter(rootPrefix, pagesPrefix);

    // Setup active state on nav links
    highlightActiveLink();

    // Register PWA Service Worker
    if ('serviceWorker' in navigator) {
        const swPath = isSubPage ? '../sw.js' : './sw.js';
        navigator.serviceWorker.register(swPath).catch(() => {});
    }
});

// --- INJECT GLOBAL MOBILE & ACCESSIBILITY STYLES ---
function injectMobileStyles() {
    if (document.getElementById('kr-mobile-styles')) return;
    const style = document.createElement('style');
    style.id = 'kr-mobile-styles';
    style.innerHTML = `
        /* Safe area inset support */
        body {
            padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
            overflow-x: hidden;
            -webkit-tap-highlight-color: transparent;
        }

        @media (min-width: 1024px) {
            body {
                padding-bottom: 0 !important;
            }
        }

        /* Prevent auto-zoom on iOS Safari for inputs */
        @media (max-width: 767px) {
            input, select, textarea {
                font-size: 16px !important;
            }
        }

        /* Enforce minimum touch target sizes */
        button, a, input[type="submit"], input[type="button"] {
            min-height: 44px;
            touch-action: manipulation;
        }

        /* Custom scrollbar for mobile drawers */
        ::-webkit-scrollbar {
            width: 5px;
            height: 5px;
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.15);
            border-radius: 99px;
        }

        /* Responsive table wrappers */
        .table-responsive-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            width: 100%;
        }

        /* Bottom Nav Safe Padding */
        .bottom-nav-safe {
            padding-bottom: max(8px, env(safe-area-inset-bottom, 8px));
        }
    `;
    document.head.appendChild(style);
}

// --- ROUTE PROTECTION SYSTEM ---
function protectRoutes(pagesPrefix) {
    const protectedPaths = ['dashboard.html', 'messages.html', 'report.html'];
    const currentFile = window.location.pathname.split('/').pop();
    
    if (protectedPaths.includes(currentFile)) {
        const user = window.Storage ? window.Storage.getUser() : null;
        if (!user) {
            if (window.showToast) window.showToast('Please sign in to view this page.', 'error');
            setTimeout(() => { window.location.href = `${pagesPrefix}login.html`; }, 800);
        }
    }

    if (currentFile === 'admin.html') {
        const user = window.Storage ? window.Storage.getUser() : null;
        if (!user || !user.isAdmin) {
            if (window.showToast) window.showToast('Administrator privileges required.', 'error');
            const redirectPath = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
            setTimeout(() => { window.location.href = redirectPath; }, 800);
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
    headerEl.className = "bg-surface-container-lowest/95 backdrop-blur-md shadow-sm sticky top-0 z-50 transition-all duration-300 w-full border-b border-slate-100 h-20 flex items-center";
    headerEl.style.height = "";

    const user = window.Storage ? window.Storage.getUser() : null;
    const notifs = user ? window.Storage.getNotifications(user.id) : [];
    const unreadNotifs = notifs.filter(n => !n.read);

    // Create Navigation HTML
    let navHtml = `
    <nav class="flex justify-between items-center w-full px-4 md:px-8 max-w-[1280px] mx-auto h-full" aria-label="Main Navigation">
        <!-- Logo -->
        <a class="flex items-center gap-3 group" href="${rootPrefix}index.html" aria-label="KochiRetrace Home">
            <img src="${rootPrefix}assets/images/logo.png" class="h-12 w-auto object-contain bg-white rounded-lg p-1 shadow-sm border border-slate-100 transition-transform group-hover:scale-105" alt="KochiRetrace Logo">
        </a>

        <!-- Middle Nav Links -->
        <div class="hidden lg:flex gap-6 items-center">
            <a class="nav-link text-slate-700 hover:text-primary transition-colors font-semibold text-sm" href="${rootPrefix}index.html" id="nav-home">Home</a>
            <a class="nav-link text-slate-700 hover:text-primary transition-colors font-semibold text-sm" href="${pagesPrefix}browse.html" id="nav-browse">Browse Items</a>
            <a class="nav-link text-slate-700 hover:text-primary transition-colors font-semibold text-sm" href="${pagesPrefix}localities.html" id="nav-localities">Localities</a>
            <a class="nav-link text-slate-700 hover:text-primary transition-colors font-semibold text-sm" href="${pagesPrefix}guides.html" id="nav-guides">Guides & FAQ</a>
            <a class="nav-link text-slate-700 hover:text-primary transition-colors font-semibold text-sm" href="${pagesPrefix}map.html" id="nav-map">Map</a>
            <a class="nav-link text-slate-700 hover:text-primary transition-colors font-semibold text-sm" href="${pagesPrefix}community.html" id="nav-community">Community</a>
            ${user ? `<a class="nav-link text-slate-700 hover:text-primary transition-colors font-semibold text-sm" href="${pagesPrefix}dashboard.html" id="nav-dashboard">Dashboard</a>` : ''}
        </div>

        <!-- Right Side Controls -->
        <div class="flex items-center gap-3">
            <!-- Report Button -->
            <a href="${pagesPrefix}report.html" class="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full font-bold text-xs md:text-sm transition-all active:scale-95 hover:bg-primary-container shadow-md">
                <span class="material-symbols-outlined text-base">add_circle</span>
                <span>Report Item</span>
            </a>
    `;

    if (user) {
        // Logged In Controls
        navHtml += `
            <!-- Notification Bell -->
            <div class="relative">
                <button id="notif-bell-btn" aria-label="Notifications" class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-700 flex items-center justify-center">
                    <span class="material-symbols-outlined">notifications</span>
                    ${unreadNotifs.length > 0 ? `<span class="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[9px] rounded-full flex items-center justify-center font-bold">${unreadNotifs.length}</span>` : ''}
                </button>
                
                <!-- Notification Dropdown -->
                <div id="notif-dropdown" class="hidden absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <span class="font-bold text-sm text-slate-900">Notifications</span>
                        ${unreadNotifs.length > 0 ? `<button onclick="markAllNotificationsRead()" class="text-xs text-primary hover:underline">Mark read</button>` : ''}
                    </div>
                    <div class="max-h-64 overflow-y-auto">
                        ${notifs.length === 0 ? `
                            <div class="p-6 text-center text-xs text-slate-500">No notifications yet</div>
                        ` : notifs.map(n => `
                            <a href="${pagesPrefix}${n.link}" class="block p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/50 font-semibold' : ''}">
                                <p class="text-xs font-bold text-slate-800">${n.title || 'Update'}</p>
                                <p class="text-xs text-slate-500 mt-0.5">${n.text}</p>
                                <span class="text-[10px] text-slate-400 mt-1 block">${formatTimeAgo(n.timestamp)}</span>
                            </a>
                        `).join('')}
                    </div>
                    <div class="p-3 bg-slate-50 border-t border-slate-100 text-center">
                        <a href="${pagesPrefix}dashboard.html" class="text-xs text-primary hover:underline font-bold">View all notifications</a>
                    </div>
                </div>
            </div>

            <!-- Profile Menu Dropdown -->
            <div class="relative">
                <button id="profile-dropdown-btn" aria-label="User menu" class="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-fixed cursor-pointer transition-all active:scale-95 flex items-center justify-center bg-slate-100">
                    <img class="w-full h-full object-cover" src="${user.avatar}" alt="${user.name}">
                </button>
                
                <!-- Profile Dropdown -->
                <div id="profile-dropdown" class="hidden absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div class="p-4 border-b border-slate-100 bg-slate-50">
                        <p class="font-bold text-sm text-slate-900 truncate">${user.name}</p>
                        <p class="text-xs text-slate-500 truncate">${user.email}</p>
                    </div>
                    <div class="py-1">
                        ${user.isAdmin ? `
                            <a href="${pagesPrefix}admin.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-slate-50 transition-colors font-bold">
                                <span class="material-symbols-outlined text-lg">admin_panel_settings</span> Admin Panel
                            </a>
                        ` : ''}
                        <a href="${pagesPrefix}dashboard.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                            <span class="material-symbols-outlined text-lg">dashboard</span> Dashboard
                        </a>
                        <a href="${pagesPrefix}messages.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                            <span class="material-symbols-outlined text-lg">mail</span> Messages
                        </a>
                    </div>
                    <div class="border-t border-slate-100 py-1">
                        <button onclick="handleLogout('${rootPrefix}')" class="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-red-50 transition-colors">
                            <span class="material-symbols-outlined text-lg">logout</span> Log Out
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        // Logged Out Controls
        navHtml += `
            <a href="${pagesPrefix}login.html" class="bg-primary-container/20 text-primary border border-primary-container/30 px-4 py-2 rounded-full font-semibold text-xs md:text-sm hover:bg-primary-container/30 transition-all active:scale-95">
                Sign In
            </a>
        `;
    }

    navHtml += `
            <!-- Mobile Menu Toggle -->
            <button id="mobile-menu-btn" aria-label="Toggle Navigation Menu" class="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-full flex items-center justify-center">
                <span class="material-symbols-outlined">menu</span>
            </button>
        </div>
    </nav>

    <!-- Mobile Drawer Nav -->
    <div id="mobile-drawer" class="hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden flex justify-end">
        <div class="w-72 bg-white h-full p-6 flex flex-col gap-5 shadow-2xl relative overflow-y-auto">
            <button id="mobile-drawer-close" aria-label="Close menu" class="absolute top-4 right-4 p-2 text-slate-600 hover:bg-slate-100 rounded-full">
                <span class="material-symbols-outlined">close</span>
            </button>
            <div class="flex items-center gap-2 mt-4">
                <img src="${rootPrefix}assets/images/logo.png" class="h-10 w-auto" alt="KochiRetrace">
                <span class="text-lg font-extrabold text-primary">KochiRetrace</span>
            </div>
            <div class="flex flex-col gap-3 mt-4 text-sm">
                <a class="font-semibold text-slate-800 py-2 border-b border-slate-100 flex items-center gap-2" href="${rootPrefix}index.html">
                    <span class="material-symbols-outlined text-primary text-lg">home</span> Home
                </a>
                <a class="font-semibold text-slate-800 py-2 border-b border-slate-100 flex items-center gap-2" href="${pagesPrefix}browse.html">
                    <span class="material-symbols-outlined text-primary text-lg">search</span> Browse Lost & Found
                </a>
                <a class="font-semibold text-slate-800 py-2 border-b border-slate-100 flex items-center gap-2" href="${pagesPrefix}localities.html">
                    <span class="material-symbols-outlined text-primary text-lg">location_on</span> Ernakulam Localities
                </a>
                <a class="font-semibold text-slate-800 py-2 border-b border-slate-100 flex items-center gap-2" href="${pagesPrefix}guides.html">
                    <span class="material-symbols-outlined text-primary text-lg">menu_book</span> Guides & Help Center
                </a>
                <a class="font-semibold text-slate-800 py-2 border-b border-slate-100 flex items-center gap-2" href="${pagesPrefix}map.html">
                    <span class="material-symbols-outlined text-primary text-lg">map</span> Live Map
                </a>
                <a class="font-semibold text-slate-800 py-2 border-b border-slate-100 flex items-center gap-2" href="${pagesPrefix}community.html">
                    <span class="material-symbols-outlined text-primary text-lg">groups</span> Community Stories
                </a>
                <a class="font-semibold text-slate-800 py-2 border-b border-slate-100 flex items-center gap-2" href="${pagesPrefix}faq.html">
                    <span class="material-symbols-outlined text-primary text-lg">help_outline</span> FAQ & Safety
                </a>
                ${user ? `
                <a class="font-semibold text-slate-800 py-2 border-b border-slate-100 flex items-center gap-2" href="${pagesPrefix}dashboard.html">
                    <span class="material-symbols-outlined text-primary text-lg">dashboard</span> My Dashboard
                </a>` : ''}
                
                <div class="mt-4 pt-2">
                    <a href="${pagesPrefix}report.html" class="flex justify-center items-center gap-2 bg-primary text-white py-3 rounded-full font-bold shadow-md text-sm">
                        <span class="material-symbols-outlined text-base">add_circle</span> Report Lost or Found Item
                    </a>
                </div>
            </div>
        </div>
    </div>
    `;

    headerEl.innerHTML = navHtml;

    // Attach Dropdown Toggle Handlers
    setupHeaderDropdowns();
}

// --- RENDER MOBILE FIXED BOTTOM NAVIGATION BAR ---
function renderBottomNav(rootPrefix, pagesPrefix) {
    let bottomNavEl = document.getElementById('global-bottom-nav');
    if (!bottomNavEl) {
        bottomNavEl = document.createElement('nav');
        bottomNavEl.id = 'global-bottom-nav';
        document.body.appendChild(bottomNavEl);
    }

    bottomNavEl.className = "lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg bottom-nav-safe transition-all";
    
    const user = window.Storage ? window.Storage.getUser() : null;
    const profileLink = user ? `${pagesPrefix}dashboard.html` : `${pagesPrefix}login.html`;
    const profileIcon = user ? `<img src="${user.avatar}" class="w-6 h-6 rounded-full border border-primary object-cover" alt="Profile">` : `<span class="material-symbols-outlined text-2xl">person</span>`;
    const profileLabel = user ? 'Dashboard' : 'Sign In';

    const currentFile = window.location.pathname.split('/').pop() || 'index.html';

    bottomNavEl.innerHTML = `
        <div class="grid grid-cols-5 items-center h-14 max-w-md mx-auto px-2 text-center text-[10px] font-bold">
            <!-- Home -->
            <a href="${rootPrefix}index.html" class="flex flex-col items-center justify-center h-full ${currentFile === 'index.html' || currentFile === '' ? 'text-primary' : 'text-slate-500 hover:text-slate-900'} active:scale-95 transition-transform" aria-label="Home">
                <span class="material-symbols-outlined text-xl">home</span>
                <span>Home</span>
            </a>

            <!-- Browse -->
            <a href="${pagesPrefix}browse.html" class="flex flex-col items-center justify-center h-full ${currentFile === 'browse.html' ? 'text-primary' : 'text-slate-500 hover:text-slate-900'} active:scale-95 transition-transform" aria-label="Browse Items">
                <span class="material-symbols-outlined text-xl">search</span>
                <span>Browse</span>
            </a>

            <!-- Floating Central Report Item Button -->
            <div class="flex items-center justify-center relative">
                <a href="${pagesPrefix}report.html" class="absolute -top-5 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white active:scale-90 transition-transform" aria-label="Report Lost or Found Item">
                    <span class="material-symbols-outlined text-2xl">add</span>
                </a>
            </div>

            <!-- Map -->
            <a href="${pagesPrefix}map.html" class="flex flex-col items-center justify-center h-full ${currentFile === 'map.html' ? 'text-primary' : 'text-slate-500 hover:text-slate-900'} active:scale-95 transition-transform" aria-label="Live Map">
                <span class="material-symbols-outlined text-xl">map</span>
                <span>Map</span>
            </a>

            <!-- Profile / Dashboard -->
            <a href="${profileLink}" class="flex flex-col items-center justify-center h-full ${currentFile === 'dashboard.html' || currentFile === 'login.html' ? 'text-primary' : 'text-slate-500 hover:text-slate-900'} active:scale-95 transition-transform" aria-label="${profileLabel}">
                ${profileIcon}
                <span class="truncate max-w-[50px]">${profileLabel}</span>
            </a>
        </div>
    `;
}

// --- RENDER DYNAMIC NAVIGATION FOOTER ---
function renderFooter(rootPrefix, pagesPrefix) {
    const footerEl = document.getElementById('global-footer') || document.querySelector('footer');
    if (!footerEl) return;

    footerEl.className = "bg-slate-950 text-slate-300 py-16 w-full border-t border-slate-800";
    footerEl.innerHTML = `
    <div class="w-full px-4 md:px-8 max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        <div class="space-y-4 md:col-span-1">
            <div class="flex items-center gap-3">
                <img src="${rootPrefix}assets/images/logo.png" class="h-14 w-auto object-contain bg-white rounded-xl p-1.5 shadow-sm" alt="KochiRetrace Logo">
                <span class="text-xl font-extrabold text-white">KochiRetrace</span>
            </div>
            <p class="text-xs text-slate-400 leading-relaxed">
                Official Community Portal for Lost and Found Items in Ernakulam and Greater Kochi, Kerala. Empowering citizens to reunite with lost documents, phones, keys, and valuables.
            </p>
            <div class="text-[11px] text-slate-500 pt-2">
                © 2026 KochiRetrace. Serving Ernakulam, Kakkanad, Edappally, MG Road, Fort Kochi, Vyttila &amp; Aluva.
            </div>
        </div>

        <div class="space-y-3">
            <h4 class="text-primary-fixed font-bold text-xs uppercase tracking-wider text-blue-400">Popular Localities</h4>
            <ul class="space-y-1.5 text-xs text-slate-400">
                <li><a class="hover:text-white transition-all flex items-center gap-1.5" href="${pagesPrefix}browse.html?locality=Marine%20Drive"><span class="material-symbols-outlined text-[14px]">place</span> Marine Drive &amp; MG Road</a></li>
                <li><a class="hover:text-white transition-all flex items-center gap-1.5" href="${pagesPrefix}browse.html?locality=Lulu%20Mall,%20Edappally"><span class="material-symbols-outlined text-[14px]">place</span> Lulu Mall &amp; Edappally</a></li>
                <li><a class="hover:text-white transition-all flex items-center gap-1.5" href="${pagesPrefix}browse.html?locality=Kakkanad%20(Infopark)"><span class="material-symbols-outlined text-[14px]">place</span> Kakkanad &amp; Infopark</a></li>
                <li><a class="hover:text-white transition-all flex items-center gap-1.5" href="${pagesPrefix}browse.html?locality=Vyttila%20Hub"><span class="material-symbols-outlined text-[14px]">place</span> Vyttila Mobility Hub</a></li>
                <li><a class="hover:text-white transition-all flex items-center gap-1.5" href="${pagesPrefix}browse.html?locality=Fort%20Kochi"><span class="material-symbols-outlined text-[14px]">place</span> Fort Kochi &amp; Mattancherry</a></li>
                <li><a class="hover:text-white transition-all font-semibold text-primary-fixed pt-1 inline-block" href="${pagesPrefix}localities.html">View All Ernakulam Areas →</a></li>
            </ul>
        </div>

        <div class="space-y-3">
            <h4 class="text-primary-fixed font-bold text-xs uppercase tracking-wider text-blue-400">Help &amp; Guides</h4>
            <ul class="space-y-1.5 text-xs text-slate-400">
                <li><a class="hover:text-white transition-all" href="${pagesPrefix}guides.html#lost-phone">Lost Phone in Kochi Guide</a></li>
                <li><a class="hover:text-white transition-all" href="${pagesPrefix}guides.html#lost-aadhaar">Lost Aadhaar &amp; ID Recovery</a></li>
                <li><a class="hover:text-white transition-all" href="${pagesPrefix}guides.html#lost-passport">Lost Passport Emergency Steps</a></li>
                <li><a class="hover:text-white transition-all" href="${pagesPrefix}faq.html">Frequently Asked Questions</a></li>
                <li><a class="hover:text-white transition-all" href="${pagesPrefix}community.html">Success Stories &amp; Trust</a></li>
                <li><a class="hover:text-white transition-all" href="${pagesPrefix}contact.html">Contact Support Team</a></li>
            </ul>
        </div>

        <div class="space-y-3">
            <h4 class="text-primary-fixed font-bold text-xs uppercase tracking-wider text-blue-400">Legal &amp; Emergency</h4>
            <ul class="space-y-1.5 text-xs text-slate-400">
                <li><a class="hover:text-white transition-all" href="${pagesPrefix}about.html">About KochiRetrace</a></li>
                <li><a class="hover:text-white transition-all" href="${pagesPrefix}privacy.html">Privacy Policy</a></li>
                <li><a class="hover:text-white transition-all" href="${pagesPrefix}terms.html">Terms of Service</a></li>
                <li class="pt-2 font-semibold text-slate-300">Emergency Numbers:</li>
                <li class="text-[11px] text-slate-400">Kochi City Police: 112 / 0484 2394700</li>
                <li class="text-[11px] text-slate-400">Kochi Metro Lost Property: 1800 425 0355</li>
            </ul>
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
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
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

// --- Global Image Lightbox ---
function openLightbox(src, caption = '') {
    // Remove any existing lightbox
    const existing = document.getElementById('kr-lightbox');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'kr-lightbox';
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:99999;
        background:rgba(0,0,0,0.92);
        display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        cursor:zoom-out;
        animation:krLbFadeIn .18s ease;
    `;

    overlay.innerHTML = `
        <style>
            @keyframes krLbFadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
            #kr-lightbox img{max-width:92vw;max-height:82vh;border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.7);object-fit:contain;}
        </style>
        <button id="kr-lb-close" style="position:absolute;top:18px;right:22px;background:rgba(255,255,255,.12);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Close">✕</button>
        <img src="${src}" alt="${caption}" draggable="false">
        ${caption ? `<p style="color:rgba(255,255,255,.65);margin-top:14px;font-size:13px;text-align:center;max-width:520px;padding:0 16px;">${caption}</p>` : ''}
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const close = () => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity .15s';
        setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; }, 150);
    };

    overlay.addEventListener('click', close);
    document.getElementById('kr-lb-close').addEventListener('click', e => { e.stopPropagation(); close(); });
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
}

// Wire up lightbox on any img with data-lightbox attribute (works globally)
document.addEventListener('click', e => {
    const img = e.target.closest('img[data-lightbox]');
    if (img) openLightbox(img.src, img.getAttribute('data-lightbox-caption') || img.alt || '');
});

window.openLightbox = openLightbox;
