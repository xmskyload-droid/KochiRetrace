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

    // Initialize databases
    function initDatabase() {
        if (!localStorage.getItem(KEYS.USERS)) {
            const defaultUsers = [
                {
                    id: 'usr_admin',
                    name: 'Administrator',
                    email: 'abhishekvp9746@gmail.com',
                    password: 'Abhishekvp@2006',
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

    // --- FIREBASE DETECTOR ---
    let useFirebase = false;
    let db, auth;

    if (window.Config && window.Config.FIREBASE && window.Config.FIREBASE.apiKey && typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(window.Config.FIREBASE);
            db = firebase.firestore();
            auth = firebase.auth();
            useFirebase = true;
            console.log("KochiRetrace: Connected successfully to real-time Cloud Firebase backend.");
            
            // Start Realtime snapshot listeners to keep local cache synchronized dynamically
            db.collection("items").onSnapshot(snapshot => {
                const list = [];
                snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
                save(KEYS.ITEMS, list);
            });

            db.collection("users").onSnapshot(snapshot => {
                const list = [];
                snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
                save(KEYS.USERS, list);
            });

            db.collection("claims").onSnapshot(snapshot => {
                const list = [];
                snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
                save(KEYS.CLAIMS, list);
            });

            db.collection("stories").onSnapshot(snapshot => {
                const list = [];
                snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
                save(KEYS.STORIES, list);
            });

            db.collection("messages").onSnapshot(snapshot => {
                const list = [];
                snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
                save(KEYS.MESSAGES, list);
            });

            db.collection("notifications").onSnapshot(snapshot => {
                const list = [];
                snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
                save(KEYS.NOTIFICATIONS, list);
            });

            db.collection("audit_logs").onSnapshot(snapshot => {
                const list = [];
                snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
                save(KEYS.AUDIT_LOGS, list);
            });

            db.collection("settings").doc("global").onSnapshot(doc => {
                if (doc.exists) {
                    save(KEYS.SETTINGS, doc.data());
                }
            });
        } catch (err) {
            console.error("Firebase Initialization Error. Falling back to LocalStorage:", err);
            useFirebase = false;
        }
    }

    return {
        // --- ITEMS API ---
        getItems(includeUnverified = false) {
            const items = load(KEYS.ITEMS);
            if (includeUnverified) return items;
            return items.filter(i => i.verifiedByAdmin !== false);
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
                db.collection("items").doc(item.id).set(item).catch(e => console.error("Cloud save failed:", e));
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
                    db.collection("items").doc(id).update(updates).catch(e => console.error("Cloud update failed:", e));
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
                db.collection("items").doc(id).delete().catch(e => console.error("Cloud delete failed:", e));
            }
            return true;
        },

        // --- AUTH API ---
        getUser() {
            return load(KEYS.SESSION, null);
        },

        login(email, password) {
            if (useFirebase) {
                // Cloud Auth signin returning Promise to caller
                return auth.signInWithEmailAndPassword(email, password)
                    .then(cred => {
                        return db.collection("users").doc(cred.user.uid).get().then(doc => {
                            const isAdmin = email === 'abhishekvp9746@gmail.com';
                            if (doc.exists) {
                                const user = doc.data();
                                if (user.status === 'Suspended' || user.status === 'Banned') {
                                    auth.signOut();
                                    alert(`Access Denied: Your account has been ${user.status.toLowerCase()}.`);
                                    return null;
                                }
                                const sessionUser = { 
                                    id: user.id, 
                                    name: user.name, 
                                    email: user.email, 
                                    avatar: user.avatar,
                                    isAdmin: !!user.isAdmin || isAdmin
                                };
                                save(KEYS.SESSION, sessionUser);
                                return sessionUser;
                            } else {
                                // Self-healing: document missing in Firestore, create doc automatically
                                const newUser = {
                                    id: cred.user.uid,
                                    name: email.split('@')[0],
                                    email: email,
                                    status: 'Active',
                                    isAdmin: isAdmin,
                                    avatar: window.Config.PLACEHOLDERS.USER_AVATAR
                                };
                                return db.collection("users").doc(newUser.id).set(newUser).then(() => {
                                    const sessionUser = { id: newUser.id, name: newUser.name, email: newUser.email, avatar: newUser.avatar, isAdmin: isAdmin };
                                    save(KEYS.SESSION, sessionUser);
                                    return sessionUser;
                                });
                            }
                        });
                    }).catch(err => {
                        console.error("Firebase Login failed:", err);
                        return null;
                    });
            } else {
                // Local Mode check
                const users = load(KEYS.USERS);
                const user = users.find(u => u.email === email && u.password === password);
                if (user) {
                    if (user.status === 'Suspended' || user.status === 'Banned') {
                        alert(`Access Denied: Your account has been ${user.status.toLowerCase()}.`);
                        return null;
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
                return null;
            }
        },

        signup(name, email, password) {
            const isAdmin = email === 'abhishekvp9746@gmail.com';
            if (useFirebase) {
                // Cloud Auth registration returning Promise to caller
                return auth.createUserWithEmailAndPassword(email, password)
                    .then(cred => {
                        const newUser = {
                            id: cred.user.uid,
                            name: name,
                            email: email,
                            status: 'Active',
                            isAdmin: isAdmin,
                            avatar: window.Config.PLACEHOLDERS.USER_AVATAR
                        };
                        return db.collection("users").doc(newUser.id).set(newUser).then(() => {
                            const sessionUser = { 
                                id: newUser.id, 
                                name: newUser.name, 
                                email: newUser.email, 
                                avatar: newUser.avatar, 
                                isAdmin: isAdmin 
                            };
                            save(KEYS.SESSION, sessionUser);
                            this.addAuditLog('User Registered', `New cloud account created for ${name} (${email})`);
                            return sessionUser;
                        });
                    }).catch(err => {
                        console.error("Firebase Registration failed:", err);
                        if (err && (err.code === 'auth/email-already-in-use' || err.message.includes('already in use'))) {
                            // Self-heal: Email already registered in Firebase Auth, automatically attempt login!
                            return this.login(email, password);
                        }
                        return null;
                    });
            } else {
                // Local Mode signup
                const users = load(KEYS.USERS);
                if (users.some(u => u.email === email)) {
                    return null;
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
                auth.signOut().catch(e => console.error("Cloud logout error:", e));
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
                    db.collection("users").doc(userId).update(updates).catch(e => console.error("Cloud user update failed:", e));
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
                    db.collection("users").doc(userId).update({ status }).catch(e => console.error("Cloud status update failed:", e));
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
                    db.collection("users").doc(userId).delete().catch(e => console.error("Cloud user delete failed:", e));
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
                db.collection("claims").doc(claim.id).set(claim).catch(e => console.error("Cloud claim save failed:", e));
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
                    db.collection("claims").doc(id).update({ status }).catch(e => console.error("Cloud update claim failed:", e));
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
                db.collection("notifications").doc(notif.id).set(notif).catch(e => console.error("Cloud notification save failed:", e));
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
                        db.collection("notifications").doc(n.id).update({ read: true }).catch(e => console.error("Cloud notif read failed:", e));
                    }
                }
            });
            save(KEYS.NOTIFICATIONS, all);
        },

        // --- MESSAGES API ---
        getMessages(chatId) {
            const all = load(KEYS.MESSAGES);
            if (chatId) {
                return all.filter(m => m.chatId === chatId);
            }
            return all;
        },

        sendMessage(chatId, senderId, text, itemName) {
            const msg = {
                id: generateId('msg'),
                chatId,
                senderId,
                text,
                timestamp: Date.now(),
                itemName
            };

            // Local save
            const messages = load(KEYS.MESSAGES);
            messages.push(msg);
            save(KEYS.MESSAGES, messages);

            // Cloud Sync
            if (useFirebase) {
                db.collection("messages").doc(msg.id).set(msg).catch(e => console.error("Cloud message send failed:", e));
            }
            return msg;
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
                db.collection("stories").doc(story.id).set(story).catch(e => console.error("Cloud story save failed:", e));
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
                    db.collection("stories").doc(storyId).update({ verifiedByAdmin: verified }).catch(e => console.error("Cloud story verify failed:", e));
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
                db.collection("stories").doc(storyId).delete().catch(e => console.error("Cloud story delete failed:", e));
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
                db.collection("audit_logs").doc(log.id).set(log).catch(e => console.error("Cloud log save failed:", e));
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
                db.collection("settings").doc("global").set(settings).catch(e => console.error("Cloud settings save failed:", e));
            }
        }
    };
})();

// Export storage to window context
window.Storage = Storage;
