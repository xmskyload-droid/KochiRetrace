// messages.js - Secure Item-Bound Claim-Based Recovery Workspace

document.addEventListener('DOMContentLoaded', () => {
    // 1. Force Authentication
    if (!window.Storage) return;
    const currentUser = window.Storage.getUser();
    if (!currentUser) {
        if (window.showToast) window.showToast("Please log in to access your recovery workspaces!", "error");
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1200);
        return;
    }

    let activeRoomId = null;
    let selectedRating = 5;

    // Elements
    const chatList = document.getElementById('chat-list');
    const messageContainer = document.getElementById('message-container');
    const chatHeaderName = document.getElementById('chat-header-name');
    const chatHeaderItem = document.getElementById('chat-header-item');
    const chatHeaderStatusBadge = document.getElementById('chat-header-status-badge');
    const chatHeaderRoles = document.getElementById('chat-header-roles');
    const chatHeaderIcon = document.getElementById('chat-header-icon');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const searchChats = document.getElementById('search-chats');
    const markReturnedBtn = document.getElementById('mark-returned-btn');
    const suggestPoliceBtn = document.getElementById('suggest-police-btn');
    const suggestMetroBtn = document.getElementById('suggest-metro-btn');
    const shareLocationBtn = document.getElementById('share-location-btn');
    const uploadImgBtn = document.getElementById('upload-img-btn');
    const chatImgInput = document.getElementById('chat-img-input');

    // Recovery Modal Elements
    const recoveryModal = document.getElementById('recovery-modal');
    const recoveryForm = document.getElementById('recovery-form');
    const starRatingContainer = document.getElementById('star-rating');

    // Check URL Params for deep linking to a specific claim ID
    const urlParams = new URLSearchParams(window.location.search);
    const claimParam = urlParams.get('claimId') || urlParams.get('id');

    // Event Listeners
    if (messageForm) {
        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendTextMessage();
        });
    }

    if (searchChats) {
        searchChats.addEventListener('input', (e) => {
            renderChatList(e.target.value.trim().toLowerCase());
        });
    }

    // Attach Photo Upload
    if (uploadImgBtn && chatImgInput) {
        uploadImgBtn.addEventListener('click', () => chatImgInput.click());
        chatImgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.match('image.*')) {
                if (window.showToast) window.showToast("Security Policy: Only image files are allowed!", "error");
                chatImgInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function(evt) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const MAX_SIZE = 600;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    const base64 = canvas.toDataURL('image/jpeg', 0.7);
                    sendMediaMessage({ image: base64 });
                    chatImgInput.value = '';
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Smart Quick Chips
    document.querySelectorAll('.chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!activeRoomId) return;
            messageInput.value = btn.textContent.trim();
            sendTextMessage();
        });
    });

    // Meetup Suggestion Handlers
    if (suggestPoliceBtn) {
        suggestPoliceBtn.addEventListener('click', () => {
            if (!activeRoomId) return;
            messageInput.value = "🚔 Safe Handover Suggestion: Let's meet at the nearest Kochi City Police Station Helpdesk.";
            sendTextMessage();
        });
    }

    if (suggestMetroBtn) {
        suggestMetroBtn.addEventListener('click', () => {
            if (!activeRoomId) return;
            messageInput.value = "🚇 Safe Handover Suggestion: Let's meet at the Kochi Metro Station customer service counter.";
            sendTextMessage();
        });
    }

    if (shareLocationBtn) {
        shareLocationBtn.addEventListener('click', () => {
            if (!activeRoomId) return;
            const place = prompt("Enter meeting point location (e.g. Kakkanad Civil Station / Edappally Metro Gate 2):");
            if (place && place.trim()) {
                const locUrl = `https://maps.google.com/?q=${encodeURIComponent(place.trim() + ', Kochi, Kerala')}`;
                sendMediaMessage({
                    location: {
                        name: place.trim(),
                        url: locUrl
                    }
                });
            }
        });
    }

    // Mark Item Returned Workflow
    if (markReturnedBtn) {
        markReturnedBtn.addEventListener('click', () => {
            if (!activeRoomId) return;
            if (recoveryModal) recoveryModal.classList.remove('hidden');
        });
    }

    document.querySelectorAll('.close-recovery-modal').forEach(el => {
        el.addEventListener('click', () => {
            if (recoveryModal) recoveryModal.classList.add('hidden');
        });
    });

    // Star Rating Handler
    if (starRatingContainer) {
        starRatingContainer.querySelectorAll('.star').forEach(star => {
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.getAttribute('data-val') || '5', 10);
                starRatingContainer.querySelectorAll('.star').forEach(s => {
                    const val = parseInt(s.getAttribute('data-val') || '0', 10);
                    s.classList.toggle('text-amber-400', val <= selectedRating);
                    s.classList.toggle('text-slate-300', val > selectedRating);
                });
            });
        });
    }

    if (recoveryForm) {
        recoveryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const feedbackText = document.getElementById('feedback-text').value.trim();
            if (!activeRoomId) return;

            window.Storage.completeRecovery(activeRoomId, selectedRating, feedbackText);
            if (recoveryModal) recoveryModal.classList.add('hidden');
            if (window.showToast) window.showToast("Item marked as returned! Thank you for strengthening community trust. 🎉");

            renderChatList();
            renderActiveChat();
        });
    }

    // Load and Render Workspace Sidebar
    function renderChatList(filterQuery = '') {
        if (!chatList) return;

        let rooms = window.Storage.getChatRooms(currentUser.id);

        if (filterQuery) {
            rooms = rooms.filter(r => 
                r.itemName.toLowerCase().includes(filterQuery) || 
                r.referenceCode.toLowerCase().includes(filterQuery) ||
                r.counterpartName.toLowerCase().includes(filterQuery) ||
                r.locality.toLowerCase().includes(filterQuery)
            );
        }

        if (rooms.length === 0) {
            chatList.innerHTML = `
                <div class="p-8 text-center max-w-sm mx-auto my-auto space-y-4">
                    <div class="w-14 h-14 rounded-full bg-blue-50 dark:bg-slate-800 text-primary flex items-center justify-center mx-auto text-2xl font-bold">
                        <span class="material-symbols-outlined">shield_lock</span>
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">No Conversations Yet</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            KochiRetrace uses a secure, claim-verified workspace. Conversations open automatically when your claim request is approved or when someone submits a claim on your listed item.
                        </p>
                    </div>
                    <a href="browse.html" class="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-full font-bold text-xs shadow-md hover:opacity-90 transition-all">
                        <span class="material-symbols-outlined text-base">search</span> Browse Lost Items
                    </a>
                </div>
            `;
            if (messageContainer) {
                messageContainer.innerHTML = `
                    <div class="flex-grow flex flex-col items-center justify-center text-slate-400 py-16 text-center space-y-3">
                        <span class="material-symbols-outlined text-5xl opacity-30">chat_bubble_outline</span>
                        <p class="text-xs font-semibold">Select a verified recovery workspace from the left panel.</p>
                    </div>
                `;
            }
            return;
        }

        // Set default active room if none selected
        if (!activeRoomId || !rooms.some(r => r.roomId === activeRoomId)) {
            if (claimParam && rooms.some(r => r.roomId === claimParam)) {
                activeRoomId = claimParam;
            } else {
                activeRoomId = rooms[0].roomId;
            }
        }

        chatList.innerHTML = rooms.map(room => {
            const isActive = room.roomId === activeRoomId;
            const timeStr = room.lastMsg ? window.formatTimeAgo(room.lastMsg.timestamp) : 'Recent';
            const lastText = room.lastMsg ? room.lastMsg.text : (room.status === 'Claim Requested' ? 'Waiting for owner approval...' : 'Workspace open for safe handover');
            
            // Status badge classes
            const isApproved = room.status === 'Verified' || room.status === 'Approved';
            const isReturned = room.status === 'Returned';
            const isPending  = room.status === 'Claim Requested';

            let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">Pending</span>`;
            if (isApproved) statusBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800">Approved</span>`;
            if (isReturned) statusBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">Returned</span>`;

            return `
                <div data-id="${room.roomId}" class="chat-item p-4 flex gap-3 border-b border-slate-100 dark:border-slate-800/40 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isActive ? 'bg-primary-container/10 border-l-4 border-l-primary dark:bg-primary-container/5' : ''}">
                    <div class="w-10 h-10 rounded-2xl ${room.itemStatus === 'Lost' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'} flex items-center justify-center font-bold text-xs flex-shrink-0">
                        <span class="material-symbols-outlined text-xl">${room.itemStatus === 'Lost' ? 'grid_view' : 'find_in_page'}</span>
                    </div>
                    <div class="flex-grow min-w-0">
                        <div class="flex justify-between items-start mb-0.5">
                            <h3 class="text-xs font-extrabold text-slate-900 dark:text-white truncate">${room.itemName}</h3>
                            <span class="text-[10px] text-slate-400 font-medium">${timeStr}</span>
                        </div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[10px] text-primary font-bold">${room.referenceCode}</span>
                            <span class="text-[10px] text-slate-400">• ${room.locality}</span>
                            ${statusBadge}
                        </div>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">${lastText}</p>
                    </div>
                </div>
            `;
        }).join('');

        // Bind click handlers
        chatList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                activeRoomId = item.getAttribute('data-id');
                window.Storage.markMessagesRead(activeRoomId, currentUser.id);
                renderChatList(filterQuery);
                renderActiveChat();

                // Mobile panel toggle
                const asidePanel = document.getElementById('chat-aside-panel');
                const threadPanel = document.getElementById('chat-thread-panel');
                if (window.innerWidth < 768 && asidePanel && threadPanel) {
                    asidePanel.classList.add('hidden');
                    threadPanel.classList.remove('hidden');
                }
            });
        });

        // Mobile back button handler
        const backBtn = document.getElementById('back-to-chats-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                const asidePanel = document.getElementById('chat-aside-panel');
                const threadPanel = document.getElementById('chat-thread-panel');
                if (asidePanel && threadPanel) {
                    asidePanel.classList.remove('hidden');
                    threadPanel.classList.add('hidden');
                }
            };
        }
    }

    // Load and Render Active Workspace Messages
    function renderActiveChat() {
        const rooms = window.Storage.getChatRooms(currentUser.id);
        const room = rooms.find(r => r.roomId === activeRoomId);
        if (!room) return;

        // Header details
        if (chatHeaderName) chatHeaderName.textContent = room.itemName;
        if (chatHeaderItem) {
            chatHeaderItem.innerHTML = `<span>Ref: ${room.referenceCode}</span> • <span>${room.locality}</span>`;
        }
        if (chatHeaderRoles) {
            chatHeaderRoles.textContent = `Owner: ${room.ownerName} | Finder: ${room.finderName}`;
        }

        // Status badge
        const isApproved = room.status === 'Verified' || room.status === 'Approved';
        const isReturned = room.status === 'Returned';

        if (chatHeaderStatusBadge) {
            if (isReturned) {
                chatHeaderStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800';
                chatHeaderStatusBadge.textContent = 'Returned & Completed';
            } else if (isApproved) {
                chatHeaderStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800';
                chatHeaderStatusBadge.textContent = 'Approved';
            } else {
                chatHeaderStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800';
                chatHeaderStatusBadge.textContent = 'Pending Owner Approval';
            }
        }

        // Show "Mark Returned" button if approved and user is involved
        if (markReturnedBtn) {
            if (isApproved && !isReturned) {
                markReturnedBtn.classList.remove('hidden');
            } else {
                markReturnedBtn.classList.add('hidden');
            }
        }

        // Get messages
        const msgs = window.Storage.getMessages(room.roomId);
        if (!messageContainer) return;

        let html = '';

        // If Pending verification: Show warning banner
        if (room.status === 'Claim Requested') {
            html += `
                <div class="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl text-amber-900 dark:text-amber-300 text-xs space-y-2 text-center">
                    <span class="material-symbols-outlined text-2xl text-amber-600">hourglass_top</span>
                    <p class="font-bold">Claim Request Submitted (${room.referenceCode})</p>
                    <p class="text-[11px] leading-relaxed text-amber-800 dark:text-amber-400">
                        Verification Details submitted by <span class="font-bold">${room.finderName}</span>: "${room.claimReason}". 
                        The owner (<span class="font-bold">${room.ownerName}</span>) must approve this request from their Dashboard to open active messaging.
                    </p>
                </div>
            `;
        } else if (isReturned) {
            html += `
                <div class="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-900 dark:text-emerald-300 text-xs space-y-1 text-center">
                    <span class="material-symbols-outlined text-2xl text-emerald-600">task_alt</span>
                    <p class="font-extrabold text-sm">Recovery Completed! 🎉</p>
                    <p class="text-[11px] text-emerald-800 dark:text-emerald-400">This lost property handover has been completed and verified. Thank you for using KochiRetrace!</p>
                </div>
            `;
        }

        if (msgs.length === 0) {
            html += `
                <div class="flex-grow flex items-center justify-center text-slate-400 py-10 text-xs">
                    Start a safe conversation to coordinate handover at a public location.
                </div>
            `;
        } else {
            html += msgs.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                const statusTick = msg.read ? '✓✓' : '✓';

                let bodyHtml = `<p class="leading-relaxed break-words">${msg.text || ''}</p>`;
                if (msg.image) {
                    bodyHtml += `<img src="${msg.image}" class="rounded-xl max-w-xs mt-2 border border-slate-200 shadow-sm" alt="Attached photo">`;
                }
                if (msg.location) {
                    bodyHtml += `
                        <a href="${msg.location.url}" target="_blank" class="mt-2 flex items-center gap-2 p-2 bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 rounded-xl text-xs font-bold border border-rose-200 hover:underline">
                            <span class="material-symbols-outlined text-base">location_on</span>
                            <span>Pinned Location: ${msg.location.name}</span>
                        </a>
                    `;
                }

                return `
                    <div class="flex ${isMe ? 'justify-end' : 'justify-start'} w-full">
                        <div class="max-w-[75%] space-y-1">
                            <div class="px-4 py-3 rounded-2xl text-xs md:text-sm ${
                                isMe 
                                    ? 'bg-primary text-white rounded-tr-none shadow-sm' 
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/80 rounded-tl-none shadow-sm'
                            }">
                                ${bodyHtml}
                            </div>
                            <div class="flex items-center gap-1 text-[9px] text-slate-400 ${isMe ? 'justify-end' : 'justify-start'}">
                                <span>${window.formatTimeAgo(msg.timestamp)}</span>
                                ${isMe ? `<span class="font-bold text-primary">${statusTick}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        messageContainer.innerHTML = html;

        setTimeout(() => {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }, 80);
    }

    // Send Text Message
    function sendTextMessage() {
        const text = messageInput.value.trim();
        if (!text || !activeRoomId) return;

        const rooms = window.Storage.getChatRooms(currentUser.id);
        const room = rooms.find(r => r.roomId === activeRoomId);
        if (!room) return;

        if (room.status === 'Claim Requested') {
            if (window.showToast) window.showToast("Messaging opens after the owner approves the claim request!", "error");
            return;
        }

        window.Storage.sendMessage(room.roomId, currentUser.id, text, room.itemName);
        messageInput.value = '';
        renderActiveChat();
        renderChatList();
    }

    // Send Media Message
    function sendMediaMessage(extra) {
        if (!activeRoomId) return;
        const rooms = window.Storage.getChatRooms(currentUser.id);
        const room = rooms.find(r => r.roomId === activeRoomId);
        if (!room) return;

        if (room.status === 'Claim Requested') {
            if (window.showToast) window.showToast("Messaging opens after the owner approves the claim request!", "error");
            return;
        }

        window.Storage.sendMessage(room.roomId, currentUser.id, extra.location ? `Shared location pin: ${extra.location.name}` : 'Shared photo attachment', room.itemName, extra);
        renderActiveChat();
        renderChatList();
    }

    // Initial Load
    renderChatList();
    renderActiveChat();
});
