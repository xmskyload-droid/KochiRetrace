// storage.js - Storage Layer Abstraction for KochiRetrace (Updated with Profile Upload & Old Avatar Purge)

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

    // Purge old seed items
    const firstItem = localStorage.getItem(KEYS.ITEMS);
    if (firstItem && firstItem.includes('item_1')) {
        localStorage.removeItem(KEYS.ITEMS);
        localStorage.removeItem(KEYS.USERS);
        localStorage.removeItem(KEYS.SESSION);
        localStorage.removeItem(KEYS.CLAIMS);
        localStorage.removeItem(KEYS.NOTIFICATIONS);
        localStorage.removeItem(KEYS.MESSAGES);
        localStorage.removeItem(KEYS.STORIES);
    }

    // Initialize databases
    function initDatabase() {
        if (!localStorage.getItem(KEYS.USERS)) {
            // Seed default Admin user
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
        if (!localStorage.getItem(KEYS.ITEMS)) {
            save(KEYS.ITEMS, []);
        }
        if (!localStorage.getItem(KEYS.STORIES)) {
            save(KEYS.STORIES, []);
        }
        if (!localStorage.getItem(KEYS.CLAIMS)) {
            save(KEYS.CLAIMS, []);
        }
        if (!localStorage.getItem(KEYS.MESSAGES)) {
            save(KEYS.MESSAGES, []);
        }
        if (!localStorage.getItem(KEYS.NOTIFICATIONS)) {
            save(KEYS.NOTIFICATIONS, []);
        }
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

        // AUTO-PURGE: Locate existing accounts with the old unsplash face avatar and force-reset to SVG
        const users = load(KEYS.USERS);
        let updated = false;
        const defaultAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";
        
        users.forEach(u => {
            if (u.avatar && u.avatar.includes('unsplash') && (u.avatar.includes('photo-1535713875002') || u.avatar.includes('150'))) {
                u.avatar = defaultAvatar;
                updated = true;
            }
        });
        if (updated) {
            save(KEYS.USERS, users);
            // Also reset session user
            const sess = load(KEYS.SESSION, null);
            if (sess && sess.avatar && sess.avatar.includes('unsplash')) {
                sess.avatar = defaultAvatar;
                save(KEYS.SESSION, sess);
            }
        }
    }

    initDatabase();

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
            const items = load(KEYS.ITEMS);
            item.id = item.id || generateId('item');
            item.createdAt = Date.now();
            item.coords = config.getCoordinates(item.locality);
            item.verifiedByAdmin = !settings.requireVerification;
            items.unshift(item);
            save(KEYS.ITEMS, items);
            return item;
        },

        updateItem(id, updates) {
            const config = window.Config || { getCoordinates: () => ({ lat: 9.9816, lng: 76.2995 }) };
            const items = load(KEYS.ITEMS);
            const index = items.findIndex(i => i.id === id);
            if (index !== -1) {
                items[index] = { ...items[index], ...updates };
                if (updates.locality) {
                    items[index].coords = config.getCoordinates(updates.locality);
                }
                save(KEYS.ITEMS, items);
                return items[index];
            }
            return null;
        },

        deleteItem(id) {
            const items = load(KEYS.ITEMS);
            const filtered = items.filter(i => i.id !== id);
            save(KEYS.ITEMS, filtered);
            return true;
        },

        // --- AUTH API ---
        getUser() {
            return load(KEYS.SESSION, null);
        },

        login(email, password) {
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
        },

        logout() {
            localStorage.removeItem(KEYS.SESSION);
        },

        // --- USERS MANAGEMENT (ADMIN & USER SETTINGS) ---
        getUsers() {
            return load(KEYS.USERS);
        },

        updateUser(userId, updates) {
            const users = load(KEYS.USERS);
            const index = users.findIndex(u => u.id === userId);
            if (index !== -1) {
                users[index] = { ...users[index], ...updates };
                save(KEYS.USERS, users);

                // Update active session if it corresponds to current user
                const session = load(KEYS.SESSION, null);
                if (session && session.id === userId) {
                    const updatedSession = { ...session, ...updates };
                    save(KEYS.SESSION, updatedSession);
                }
                return users[index];
            }
            return null;
        },

        updateUserStatus(userId, status) {
            const users = this.getUsers();
            const index = users.findIndex(u => u.id === userId);
            if (index !== -1) {
                users[index].status = status;
                save(KEYS.USERS, users);
                this.addAuditLog('User Status Changed', `User ${users[index].name} (${users[index].email}) status set to ${status}`);
                return users[index];
            }
            return null;
        },

        deleteUser(userId) {
            const users = this.getUsers();
            const index = users.findIndex(u => u.id === userId);
            if (index !== -1) {
                const userName = users[index].name;
                const filtered = users.filter(u => u.id !== userId);
                save(KEYS.USERS, filtered);
                this.addAuditLog('User Deleted', `User ${userName} (${userId}) removed from system`);
                return true;
            }
            return false;
        },

        // --- CLAIMS API ---
        getClaims() {
            return load(KEYS.CLAIMS);
        },

        createClaim(claimData) {
            const claims = this.getClaims();
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
            claims.unshift(claim);
            save(KEYS.CLAIMS, claims);

            // Update item lifecycle
            this.updateItem(claimData.itemId, { status: window.Config ? window.Config.STATUS_VALUES.CLAIM_REQUESTED : 'Claim Requested' });

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
            const notifications = load(KEYS.NOTIFICATIONS);
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
            notifications.unshift(notif);
            save(KEYS.NOTIFICATIONS, notifications);
            return notif;
        },

        markNotificationsRead() {
            const user = this.getUser();
            if (!user) return;
            const all = load(KEYS.NOTIFICATIONS);
            all.forEach(n => {
                if (n.userId === user.id) {
                    n.read = true;
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
            const messages = load(KEYS.MESSAGES);
            const msg = {
                id: generateId('msg'),
                chatId,
                senderId,
                text,
                timestamp: Date.now(),
                itemName
            };
            messages.push(msg);
            save(KEYS.MESSAGES, messages);
            return msg;
        },

        // --- STORIES API ---
        getStories() {
            return load(KEYS.STORIES);
        },

        saveStory(story) {
            const stories = this.getStories();
            story.id = story.id || generateId('story');
            story.date = new Date().toISOString().split('T')[0];
            story.likes = 0;
            story.verifiedByAdmin = false;
            stories.unshift(story);
            save(KEYS.STORIES, stories);
            return story;
        },

        updateStoryStatus(storyId, verified) {
            const stories = this.getStories();
            const index = stories.findIndex(s => s.id === storyId);
            if (index !== -1) {
                stories[index].verifiedByAdmin = verified;
                save(KEYS.STORIES, stories);
                this.addAuditLog('Story Moderation', `Success story ${storyId} verified: ${verified}`);
                return stories[index];
            }
            return null;
        },

        deleteStory(storyId) {
            const stories = this.getStories();
            const filtered = stories.filter(s => s.id !== storyId);
            save(KEYS.STORIES, filtered);
            this.addAuditLog('Story Deleted', `Success story ${storyId} deleted`);
            return true;
        },

        // --- AUDIT LOGS (ADMIN) ---
        getAuditLogs() {
            return load(KEYS.AUDIT_LOGS);
        },

        addAuditLog(action, details) {
            const logs = load(KEYS.AUDIT_LOGS);
            logs.unshift({
                id: generateId('log'),
                timestamp: Date.now(),
                action,
                details
            });
            save(KEYS.AUDIT_LOGS, logs);
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
        }
    };
})();

// Export storage to window context
window.Storage = Storage;
