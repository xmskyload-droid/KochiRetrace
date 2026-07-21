// storage.js - Storage Layer Abstraction for KochiRetrace (Hybrid Offline-First & Realtime Firebase Sync)

const Storage = (() => {
    // Local storage keys
    const KEYS = {
        ITEMS: 'kochiretrace_items',
        USERS: 'kochiretrace_users',
        SESSION: 'kochiretrace_session',
        CLAIMS: 'kochiretrace_claims',
        NOTIFICATIONS: 'kochiretrace_notifications',
        MESSAGES: 'kochiretrace_messages',
        STORIES: 'kochiretrace_stories',
        AUDIT_LOGS: 'kochiretrace_audit_logs',
        SETTINGS: 'kochiretrace_settings',
        LOCALITIES: 'kochiretrace_localities'
    };

    // Helper functions
    function load(key, defaultVal = []) {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : defaultVal;
    }

    function save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // Generate unique ID
    function generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }

    // Silent logger â€” set to true locally if you need debug output
    const DEBUG = false;
    function _log(...args)  { if (DEBUG) console.log(...args); }
    function _warn(...args) { if (DEBUG) _warn(...args); }
    function _err(...args)  { if (DEBUG) _err(...args); }

    // Initialize databases with safe defaults
    function initDatabase() {
        if (!localStorage.getItem(KEYS.USERS)) {
            // Seed only a placeholder admin entry (no plaintext password stored).
            // The real admin account is managed entirely by Firebase Authentication.
            const defaultUsers = [
                {
                    id: 'usr_admin',
                    name: 'Administrator',
                    email: 'abhishekvp9746@gmail.com',
                    isAdmin: true,
                    status: 'Active',
                    avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"
                }
            ];
            save(KEYS.USERS, defaultUsers);
        }
        if (!localStorage.getItem(KEYS.ITEMS)) save(KEYS.ITEMS, []);
        if (!localStorage.getItem(KEYS.STORIES)) save(KEYS.STORIES, []);
        if (!localStorage.getItem(KEYS.CLAIMS)) save(KEYS.CLAIMS, []);
        if (!localStorage.getItem(KEYS.MESSAGES)) save(KEYS.MESSAGES, []);
        if (!localStorage.getItem(KEYS.NOTIFICATIONS)) save(KEYS.NOTIFICATIONS, []);
        if (!localStorage.getItem(KEYS.AUDIT_LOGS)) {
            save(KEYS.AUDIT_LOGS, [
                { id: 'log_0', timestamp: Date.now(), action: 'System Setup', details: 'KochiRetrace portal database initialized' }
            ]);
        }
        if (!localStorage.getItem(KEYS.SETTINGS)) {
            save(KEYS.SETTINGS, {
                siteName: 'KochiRetrace',
                contactEmail: 'support@kochiretrace.in',
                logoUrl: 'assets/images/logo.png',
                uploadLimit: '5MB',
                autoArchiveDays: 30,
                requireVerification: true
            });
        }
    }

    initDatabase();

    // --- FIREBASE INITIALIZER (safe: prevents duplicate app instances) ---
    let useFirebase = false;
    let db, auth;

    if (window.Config && window.Config.FIREBASE && window.Config.FIREBASE.apiKey && typeof firebase !== 'undefined') {
        try {
            // Guard: only initialize if no app exists yet
            const existingApp = firebase.apps && firebase.apps.length > 0 ? firebase.apps[0] : null;
            const app = existingApp || firebase.initializeApp(window.Config.FIREBASE);
            db   = firebase.firestore(app);
            auth = firebase.auth(app);
            useFirebase = true;
            console.log('%cKochiRetrace \u2705 Firebase connected', 'color:green;font-weight:bold'); // intentional: visible connection status

            // Attach a safe live-sync listener with error handling
            function liveSync(collectionName, key) {
                db.collection(collectionName).onSnapshot(
                    snapshot => {
                        const list = [];
                        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
                        save(key, list);
                    },
                    err => _warn(`Firestore listener [${collectionName}]:`, err.message)
                );
            }

            liveSync('items',         KEYS.ITEMS);
            liveSync('users',         KEYS.USERS);
            liveSync('claims',        KEYS.CLAIMS);
            liveSync('stories',       KEYS.STORIES);
            liveSync('messages',      KEYS.MESSAGES);
            liveSync('notifications', KEYS.NOTIFICATIONS);
            liveSync('audit_logs',    KEYS.AUDIT_LOGS);

            // Settings (single doc, not a collection)
            db.collection('settings').doc('global').onSnapshot(
                doc => { if (doc.exists) save(KEYS.SETTINGS, doc.data()); },
                err => _warn('Firestore listener [settings]:', err.message)
            );

        } catch (err) {
            _err('Firebase init failed â€” falling back to LocalStorage:', err.message);
            useFirebase = false;
        }
    } else {
        _log('KochiRetrace: running in offline/localStorage mode.');
    }


    return {
        // --- ITEMS API ---
        getItems(includeUnverified = false) {
            const items = load(KEYS.ITEMS);
            if (includeUnverified) return items;
            return items.filter(i => i.verifiedByAdmin !== false);
        },

        findAIMatches(targetItem) {
            if (!targetItem) return [];
            const allItems = this.getItems(true);
            const isTargetLost = targetItem.status === 'Lost' || (targetItem.description && targetItem.description.toLowerCase().includes('lost'));
            const oppositeStatus = isTargetLost ? 'Found' : 'Lost';

            const candidates = allItems.filter(i => i.id !== targetItem.id && (i.status === oppositeStatus || (oppositeStatus === 'Found' ? i.description.toLowerCase().includes('found') : i.description.toLowerCase().includes('lost'))));

            const matches = [];

            candidates.forEach(cand => {
                let score = 0;

                // Category match (35%)
                if (cand.category && targetItem.category && cand.category.toLowerCase() === targetItem.category.toLowerCase()) {
                    score += 35;
                }

                // Locality match (30%)
                if (cand.locality && targetItem.locality && cand.locality.toLowerCase() === targetItem.locality.toLowerCase()) {
                    score += 30;
                }

                // Date Proximity (15%)
                if (cand.date && targetItem.date) {
                    const d1 = new Date(cand.date).getTime();
                    const d2 = new Date(targetItem.date).getTime();
                    const diffDays = Math.abs(d1 - d2) / (1000 * 3600 * 24);
                    if (diffDays <= 2) score += 15;
                    else if (diffDays <= 7) score += 10;
                }

                // Keyword overlap (20%)
                const words1 = (targetItem.name + ' ' + targetItem.description).toLowerCase().split(/\W+/).filter(w => w.length > 3);
                const words2 = (cand.name + ' ' + cand.description).toLowerCase().split(/\W+/).filter(w => w.length > 3);
                const commonWords = words1.filter(w => words2.includes(w));
                if (commonWords.length >= 3) score += 20;
                else if (commonWords.length >= 1) score += 10;

                if (score >= 45) {
                    matches.push({
                        item: cand,
                        matchScore: Math.min(score, 98),
                        matchedKeywords: [...new Set(commonWords)]
                    });
                }
            });

            return matches.sort((a, b) => b.matchScore - a.matchScore);
        },

        saveItem(item) {
            const config = window.Config || { getCoordinates: () => ({ lat: 9.9816, lng: 76.2995 }) };
            const settings = this.getSettings();
            
            item.id = item.id || generateId('item');
            item.createdAt = Date.now();
            item.coords = config.getCoordinates(item.locality);
            item.verifiedByAdmin = !settings.requireVerification;

            // Synchronous Local update
            const items = load(KEYS.ITEMS);
            items.unshift(item);
            save(KEYS.ITEMS, items);

            // Cloud sync
            if (useFirebase) {
                db.collection("items").doc(item.id).set(item).catch(e => _err("Cloud save failed:", e));
            }
            return item;
        },

        updateItem(id, updates) {
            const config = window.Config || { getCoordinates: () => ({ lat: 9.9816, lng: 76.2995 }) };
            
            // Synchronous Local update
            const items = load(KEYS.ITEMS);
            const index = items.findIndex(i => i.id === id);
            if (index !== -1) {
                items[index] = { ...items[index], ...updates };
                if (updates.locality) {
                    items[index].coords = config.getCoordinates(updates.locality);
                }
                save(KEYS.ITEMS, items);
                
                // Cloud sync
                if (useFirebase) {
                    db.collection("items").doc(id).update(updates).catch(e => _err("Cloud update failed:", e));
                }
                return items[index];
            }
            return null;
        },

        deleteItem(id) {
            // Synchronous Local update
            const items = load(KEYS.ITEMS);
            const filtered = items.filter(i => i.id !== id);
            save(KEYS.ITEMS, filtered);

            // Cloud sync
            if (useFirebase) {
                db.collection("items").doc(id).delete().catch(e => _err("Cloud delete failed:", e));
            }
            return true;
        },

        // --- AUTH API ---
        getUser() {
            return load(KEYS.SESSION, null);
        },

        // Alias for getUser
        getCurrentUser() {
            return this.getUser();
        },

        isLoggedIn() {
            return !!this.getUser();
        },

        requireAuth(redirectPath) {
            if (!this.isLoggedIn()) {
                window.location.href = redirectPath || 'login.html';
                return false;
            }
            return true;
        },

        requireAdmin(redirectPath) {
            const user = this.getUser();
            if (!user || !user.isAdmin) {
                window.location.href = redirectPath || '../index.html';
                return false;
            }
            return true;
        },

        updateSession(updates) {
            const session = this.getUser();
            if (session) {
                const updated = { ...session, ...updates };
                save(KEYS.SESSION, updated);
                return updated;
            }
            return null;
        },

        login(email, password) {
            if (useFirebase) {
                return auth.signInWithEmailAndPassword(email, password)
                    .then(cred => {
                        const isAdmin = email === 'abhishekvp9746@gmail.com';
                        // Build fallback session from Auth credential (works even if Firestore offline)
                        const fallbackSession = {
                            id: cred.user.uid,
                            name: cred.user.displayName || email.split('@')[0],
                            email: cred.user.email || email,
                            avatar: window.Config.PLACEHOLDERS.USER_AVATAR,
                            isAdmin: isAdmin
                        };

                        return db.collection("users").doc(cred.user.uid).get()
                            .then(doc => {
                                if (doc.exists) {
                                    const user = doc.data();
                                    if (user.status === 'Suspended' || user.status === 'Banned') {
                                        auth.signOut();
                                        throw new Error(`Your account has been ${user.status.toLowerCase()}.`);
                                    }
                                    const sessionUser = { 
                                        id: user.id || cred.user.uid, 
                                        name: user.name || fallbackSession.name, 
                                        email: user.email || email, 
                                        avatar: user.avatar || window.Config.PLACEHOLDERS.USER_AVATAR,
                                        isAdmin: !!user.isAdmin || isAdmin
                                    };
                                    save(KEYS.SESSION, sessionUser);
                                    return sessionUser;
                                } else {
                                    // Firestore doc missing â€” save fallback and try to create doc
                                    save(KEYS.SESSION, fallbackSession);
                                    db.collection("users").doc(cred.user.uid).set({
                                        id: cred.user.uid,
                                        name: fallbackSession.name,
                                        email: email,
                                        status: 'Active',
                                        isAdmin: isAdmin,
                                        avatar: window.Config.PLACEHOLDERS.USER_AVATAR
                                    }).catch(() => {});
                                    return fallbackSession;
                                }
                            })
                            .catch(firestoreErr => {
                                // Firestore offline â€” use Auth credential fallback so login still works
                                _warn("Firestore unavailable, using Auth-only session:", firestoreErr.message);
                                save(KEYS.SESSION, fallbackSession);
                                return fallbackSession;
                            });
                    }).catch(err => {
                        _err("Firebase Login error:", err.code, err.message);
                        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
                            throw new Error("Wrong password. Please try again.");
                        }
                        if (err.code === 'auth/user-not-found') {
                            throw new Error("No account found. Please sign up first.");
                        }
                        if (err.code === 'auth/too-many-requests') {
                            throw new Error("Too many failed attempts. Please try again later.");
                        }
                        if (err.code === 'auth/invalid-email') {
                            throw new Error("Invalid email address format.");
                        }
                        throw new Error(err.message || "Login failed. Please try again.");
                    });
            } else {
                // Local Mode
                const users = load(KEYS.USERS);
                const user = users.find(u => u.email === email && u.password === password);
                if (user) {
                    if (user.status === 'Suspended' || user.status === 'Banned') {
                        throw new Error(`Your account has been ${user.status.toLowerCase()}.`);
                    }
                    const sessionUser = { 
                        id: user.id, 
                        name: user.name, 
                        email: user.email, 
                        avatar: user.avatar,
                        isAdmin: !!user.isAdmin 
                    };
                    save(KEYS.SESSION, sessionUser);
                    return sessionUser;
                }
                throw new Error("Invalid email or password.");
            }
        },

        signup(name, email, password) {
            const isAdmin = email === 'abhishekvp9746@gmail.com';
            if (useFirebase) {
                return auth.createUserWithEmailAndPassword(email, password)
                    .then(cred => {
                        // Save session immediately from Auth credential (Firestore-independent)
                        const sessionUser = { 
                            id: cred.user.uid, 
                            name: name, 
                            email: email, 
                            avatar: window.Config.PLACEHOLDERS.USER_AVATAR, 
                            isAdmin: isAdmin 
                        };
                        save(KEYS.SESSION, sessionUser);

                        // Try to persist user doc to Firestore in background (non-blocking)
                        const newUser = {
                            id: cred.user.uid, name, email,
                            status: 'Active', isAdmin,
                            avatar: window.Config.PLACEHOLDERS.USER_AVATAR
                        };
                        db.collection("users").doc(newUser.id).set(newUser)
                            .then(() => this.addAuditLog('User Registered', `New cloud account created for ${name} (${email})`))
                            .catch(e => _warn("Firestore user doc save failed (offline):", e.message));

                        return sessionUser;
                    }).catch(err => {
                        _err("Firebase Signup error:", err.code, err.message);
                        if (err.code === 'auth/email-already-in-use') {
                            // Already registered â€” log them in instead
                            return this.login(email, password);
                        }
                        if (err.code === 'auth/weak-password') {
                            throw new Error("Password must be at least 6 characters.");
                        }
                        if (err.code === 'auth/invalid-email') {
                            throw new Error("Invalid email address format.");
                        }
                        throw new Error(err.message || "Sign up failed. Please try again.");
                    });
            } else {
                // Local Mode signup
                const users = load(KEYS.USERS);
                if (users.some(u => u.email === email)) {
                    throw new Error("This email is already registered. Please log in.");
                }
                if (password.length < 6) {
                    throw new Error("Password must be at least 6 characters.");
                }
                const newUser = {
                    id: generateId('usr'),
                    name: name,
                    email: email,
                    password: password,
                    status: 'Active',
                    isAdmin: isAdmin,
                    avatar: window.Config.PLACEHOLDERS.USER_AVATAR
                };
                users.push(newUser);
                save(KEYS.USERS, users);

                const sessionUser = { 
                    id: newUser.id, 
                    name: newUser.name, 
                    email: newUser.email, 
                    avatar: newUser.avatar, 
                    isAdmin: isAdmin 
                };
                save(KEYS.SESSION, sessionUser);
                this.addAuditLog('User Registered', `New account created for ${name} (${email})`);
                return sessionUser;
            }
        },

        logout() {
            if (useFirebase) {
                auth.signOut().catch(e => _err("Cloud logout error:", e));
            }
            localStorage.removeItem(KEYS.SESSION);
        },

        // --- USERS MANAGEMENT (ADMIN & USER SETTINGS) ---
        getUsers() {
            return load(KEYS.USERS);
        },

        updateUser(userId, updates) {
            // Local update
            const users = load(KEYS.USERS);
            const index = users.findIndex(u => u.id === userId);
            if (index !== -1) {
                users[index] = { ...users[index], ...updates };
                save(KEYS.USERS, users);

                // Update active session
                const session = load(KEYS.SESSION, null);
                if (session && session.id === userId) {
                    const updatedSession = { ...session, ...updates };
                    save(KEYS.SESSION, updatedSession);
                }

                // Cloud Sync
                if (useFirebase) {
                    db.collection("users").doc(userId).update(updates).catch(e => _err("Cloud user update failed:", e));
                }
                return users[index];
            }
            return null;
        },

        updateUserStatus(userId, status) {
            // Local update
            const users = this.getUsers();
            const index = users.findIndex(u => u.id === userId);
            if (index !== -1) {
                users[index].status = status;
                save(KEYS.USERS, users);
                this.addAuditLog('User Status Changed', `User ${users[index].name} (${users[index].email}) status set to ${status}`);
                
                // Cloud Sync
                if (useFirebase) {
                    db.collection("users").doc(userId).update({ status }).catch(e => _err("Cloud status update failed:", e));
                }
                return users[index];
            }
            return null;
        },

        deleteUser(userId) {
            // Local update
            const users = this.getUsers();
            const index = users.findIndex(u => u.id === userId);
            if (index !== -1) {
                const userName = users[index].name;
                const filtered = users.filter(u => u.id !== userId);
                save(KEYS.USERS, filtered);
                this.addAuditLog('User Deleted', `User ${userName} (${userId}) removed from system`);

                // Cloud Sync
                if (useFirebase) {
                    db.collection("users").doc(userId).delete().catch(e => _err("Cloud user delete failed:", e));
                }
                return true;
            }
            return false;
        },

        // --- CLAIMS API ---
        getClaims() {
            return load(KEYS.CLAIMS);
        },

        createClaim(claimData) {
            const claim = {
                id: generateId('claim'),
                itemId: claimData.itemId,
                itemName: claimData.itemName,
                claimerId: claimData.claimerId,
                claimerName: claimData.claimerName,
                reason: claimData.reason,
                phone: claimData.phone,
                email: claimData.email,
                status: window.Config ? window.Config.STATUS_VALUES.CLAIM_REQUESTED : 'Claim Requested',
                timestamp: Date.now()
            };

            // Local save
            const claims = this.getClaims();
            claims.unshift(claim);
            save(KEYS.CLAIMS, claims);

            // Update item status locally
            this.updateItem(claimData.itemId, { status: 'Claim Requested' });

            // Cloud Sync
            if (useFirebase) {
                db.collection("claims").doc(claim.id).set(claim).catch(e => _err("Cloud claim save failed:", e));
            }

            // Create notification for item reporter
            const item = this.getItems(true).find(i => i.id === claimData.itemId);
            if (item) {
                this.addNotification(
                    item.reporterId,
                    `Claim Request on ${item.name}`,
                    `${claimData.claimerName} submitted a claim request on your ${item.name}`,
                    'claim',
                    'dashboard.html'
                );
            }
            return claim;
        },

        updateClaim(id, status) {
            // Local update
            const claims = this.getClaims();
            const index = claims.findIndex(c => c.id === id);
            if (index !== -1) {
                claims[index].status = status;
                save(KEYS.CLAIMS, claims);

                // Sync status back to item
                const claim = claims[index];
                let itemStatus = 'Lost';
                if (status === 'Verified') {
                    itemStatus = 'Verified';
                } else if (status === 'Returned') {
                    itemStatus = 'Returned';
                } else if (status === 'Declined' || status === 'Rejected') {
                    const item = this.getItems(true).find(i => i.id === claim.itemId);
                    itemStatus = item ? (item.description.toLowerCase().includes('found') ? 'Found' : 'Lost') : 'Lost';
                }
                this.updateItem(claim.itemId, { status: itemStatus });

                // Cloud Sync
                if (useFirebase) {
                    db.collection("claims").doc(id).update({ status }).catch(e => _err("Cloud update claim failed:", e));
                }

                // Notify claimer of updates
                this.addNotification(
                    claim.claimerId,
                    `Claim Request Update`,
                    `Your claim request for "${claim.itemName}" has been ${status.toLowerCase()}`,
                    'claim_update',
                    'dashboard.html'
                );

                this.addAuditLog('Claim Updated', `Claim ${id} for "${claim.itemName}" set to ${status}`);
                return claims[index];
            }
            return null;
        },

        // --- NOTIFICATIONS API ---
        getNotifications(userId) {
            const all = load(KEYS.NOTIFICATIONS);
            if (!userId) {
                const user = this.getUser();
                if (!user) return [];
                userId = user.id;
            }
            return all.filter(n => n.userId === userId);
        },

        addNotification(userId, title, text, type, link) {
            const notif = {
                id: generateId('notif'),
                userId,
                title,
                text,
                type,
                link,
                read: false,
                timestamp: Date.now()
            };

            // Local save
            const notifications = load(KEYS.NOTIFICATIONS);
            notifications.unshift(notif);
            save(KEYS.NOTIFICATIONS, notifications);

            // Cloud Sync
            if (useFirebase) {
                db.collection("notifications").doc(notif.id).set(notif).catch(e => _err("Cloud notification save failed:", e));
            }
            return notif;
        },

        markNotificationsRead() {
            const user = this.getUser();
            if (!user) return;
            
            const all = load(KEYS.NOTIFICATIONS);
            all.forEach(n => {
                if (n.userId === user.id) {
                    n.read = true;
                    // Cloud Sync
                    if (useFirebase) {
                        db.collection("notifications").doc(n.id).update({ read: true }).catch(e => _err("Cloud notif read failed:", e));
                    }
                }
            });
            save(KEYS.NOTIFICATIONS, all);
        },

        // --- MESSAGES & RECOVERY WORKSPACE API ---
        getMessages(chatId) {
            const all = load(KEYS.MESSAGES);
            if (chatId) {
                return all.filter(m => m.chatId === chatId);
            }
            return all;
        },

        getChatRooms(userId) {
            const claims = this.getClaims();
            const items = this.getItems(true);
            const user = this.getUser();
            const uid = userId || (user ? user.id : null);
            if (!uid) return [];

            const rooms = [];

            claims.forEach(claim => {
                const item = items.find(i => i.id === claim.itemId);
                const reporterId = item ? item.reporterId : null;
                const reporterName = item ? item.reporterName : 'Reporter';

                // User is involved if they are either claimer or item reporter
                if (claim.claimerId === uid || reporterId === uid) {
                    const isReporter = reporterId === uid;
                    const isItemLost = item ? (item.status === 'Lost' || (item.description && item.description.toLowerCase().includes('lost'))) : true;

                    const ownerName = isItemLost ? reporterName : claim.claimerName;
                    const finderName = isItemLost ? claim.claimerName : reporterName;

                    const userRole = (isItemLost && isReporter) || (!isItemLost && !isReporter) ? 'Owner' : 'Finder';
                    const counterpartName = isReporter ? claim.claimerName : reporterName;
                    const counterpartRole = userRole === 'Owner' ? 'Finder' : 'Owner';

                    const refCode = `KR-2026-${claim.id.slice(-4).toUpperCase()}`;

                    const messages = this.getMessages(claim.id);
                    const lastMsg = messages[messages.length - 1] || null;
                    const unreadCount = messages.filter(m => m.senderId !== uid && !m.read).length;

                    rooms.push({
                        roomId: claim.id,
                        claimId: claim.id,
                        itemId: claim.itemId,
                        itemName: claim.itemName || (item ? item.name : 'Lost Item'),
                        itemStatus: item ? item.status : 'Lost',
                        locality: item ? item.locality : 'Kochi',
                        referenceCode: refCode,
                        ownerName,
                        finderName,
                        userRole,
                        counterpartName,
                        counterpartRole,
                        status: claim.status, // 'Claim Requested', 'Verified', 'Returned', 'Declined'
                        claimReason: claim.reason,
                        claimPhone: claim.phone,
                        claimEmail: claim.email,
                        unreadCount,
                        lastMsg
                    });
                }
            });

            return rooms;
        },

        sendMessage(chatId, senderId, text, itemName, extra = {}) {
            const msg = {
                id: generateId('msg'),
                chatId,
                senderId,
                text,
                timestamp: Date.now(),
                itemName,
                image: extra.image || null,
                location: extra.location || null,
                read: false,
                statusTicks: 'delivered'
            };

            // Local save
            const messages = load(KEYS.MESSAGES);
            messages.push(msg);
            save(KEYS.MESSAGES, messages);

            // Cloud Sync
            if (useFirebase) {
                db.collection("messages").doc(msg.id).set(msg).catch(e => _err("Cloud message send failed:", e));
            }
            return msg;
        },

        markMessagesRead(chatId, userId) {
            const messages = load(KEYS.MESSAGES);
            let updated = false;
            messages.forEach(m => {
                if (m.chatId === chatId && m.senderId !== userId && !m.read) {
                    m.read = true;
                    m.statusTicks = 'read';
                    updated = true;
                }
            });
            if (updated) save(KEYS.MESSAGES, messages);
        },

        completeRecovery(claimId, rating = 5, feedback = '') {
            const claims = this.getClaims();
            const claim = claims.find(c => c.id === claimId);
            if (!claim) return null;

            this.updateClaim(claimId, 'Returned');
            this.updateItem(claim.itemId, { status: 'Returned' });

            // Create story / feedback entry
            const user = this.getUser();
            if (user) {
                this.saveStory({
                    authorName: user.name,
                    title: `Recovered: ${claim.itemName}`,
                    content: feedback || `Successfully recovered ${claim.itemName} in Kochi thanks to KochiRetrace!`,
                    rating: rating,
                    verifiedByAdmin: true
                });
            }

            this.addAuditLog('Item Returned', `Item ${claim.itemName} marked as returned for claim ${claimId}`);
            return claim;
        },

        // --- STORIES API ---
        getStories() {
            return load(KEYS.STORIES);
        },

        saveStory(story) {
            story.id = story.id || generateId('story');
            story.date = new Date().toISOString().split('T')[0];
            story.likes = 0;
            story.verifiedByAdmin = false;

            // Local save
            const stories = this.getStories();
            stories.unshift(story);
            save(KEYS.STORIES, stories);

            // Cloud Sync
            if (useFirebase) {
                db.collection("stories").doc(story.id).set(story).catch(e => _err("Cloud story save failed:", e));
            }
            return story;
        },

        updateStoryStatus(storyId, verified) {
            // Local update
            const stories = this.getStories();
            const index = stories.findIndex(s => s.id === storyId);
            if (index !== -1) {
                stories[index].verifiedByAdmin = verified;
                save(KEYS.STORIES, stories);
                this.addAuditLog('Story Moderation', `Success story ${storyId} verified: ${verified}`);

                // Cloud Sync
                if (useFirebase) {
                    db.collection("stories").doc(storyId).update({ verifiedByAdmin: verified }).catch(e => _err("Cloud story verify failed:", e));
                }
                return stories[index];
            }
            return null;
        },

        deleteStory(storyId) {
            // Local update
            const stories = this.getStories();
            const filtered = stories.filter(s => s.id !== storyId);
            save(KEYS.STORIES, filtered);
            this.addAuditLog('Story Deleted', `Success story ${storyId} deleted`);

            // Cloud Sync
            if (useFirebase) {
                db.collection("stories").doc(storyId).delete().catch(e => _err("Cloud story delete failed:", e));
            }
            return true;
        },

        // --- AUDIT LOGS (ADMIN) ---
        getAuditLogs() {
            return load(KEYS.AUDIT_LOGS);
        },

        addAuditLog(action, details) {
            const log = {
                id: generateId('log'),
                timestamp: Date.now(),
                action,
                details
            };

            const logs = load(KEYS.AUDIT_LOGS);
            logs.unshift(log);
            save(KEYS.AUDIT_LOGS, logs);

            if (useFirebase) {
                db.collection("audit_logs").doc(log.id).set(log).catch(e => _err("Cloud log save failed:", e));
            }
        },

        // --- SETTINGS (ADMIN) ---
        getSettings() {
            return load(KEYS.SETTINGS, {
                siteName: 'KochiRetrace',
                contactEmail: 'support@kochiretrace.in',
                logoUrl: 'assets/images/logo.png',
                uploadLimit: '5MB',
                autoArchiveDays: 30,
                requireVerification: true
            });
        },

        saveSettings(settings) {
            save(KEYS.SETTINGS, settings);
            this.addAuditLog('System Settings Changed', 'Global website parameters updated by administrator');

            if (useFirebase) {
                db.collection("settings").doc("global").set(settings).catch(e => _err("Cloud settings save failed:", e));
            }
        }
    };
})();

// Export storage to window context
window.Storage = Storage;

