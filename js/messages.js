// messages.js - Interactive chat panel with active conversations and auto-replier simulation

document.addEventListener('DOMContentLoaded', () => {
    // 1. Force Authentication
    if (!window.Storage) return;
    const currentUser = window.Storage.getUser();
    if (!currentUser) {
        window.showToast("Please log in to check your messages!", "error");
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    // Chat thread data
    const CHATS = [
        {
            id: 'usr_arjun',
            name: 'Arjun K.',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD16U5MbLpwJsQ90l8erjLlmjMIaf_POTCUkdx_2IhkwM1m8GR0qfDqyOXOVj6R_LlixlO9zcyHyaUjRpg3HALln3kLjuXvbamqRFxAaYdX7K3VY3eF8LbFakS7ag29YKqdaUHPqrwPxgYe3bjCf2Jf-r5XensRgp7OsZIMvlJWzSzggseZhR0gAWi8ckGAffzyAh2UfKVDEWmArPr9yaiT75okeNhqZC-IbxW-32tMx9tSDOYYtJ7ivSfCtv5fXpvQXKwaMHfZ-CQ',
            itemName: 'Found Wallet - MG Road',
            itemStatus: 'Found',
            online: true,
            replies: [
                "That works for me! I will carry the wallet. See you tomorrow at the station.",
                "Glad I could find it. You can inspect the ID cards inside when we meet.",
                "I am near the metro customer service counter. Wearing a green shirt."
            ]
        },
        {
            id: 'usr_meera',
            name: 'Meera S.',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDD3TJj_fyuVtKFQCt6ty5RJoAw7nGCARri89dvhcZEe1CAyMflt3R2A-AyCmDrC3yU33PnalQCXwcrlRulr3toNRsWN9q6q3Lk5NlbnWaB3mBdOKCbx0KMiWM4cITpE7AeqVufpUx_GHN4BKytCWeDxdTcVMrV4HAkFqSABxqND5hiZI9wfI1BIg39-Znu5KeczEZoSIVG9V6UFWsunIqijOLzhgAxuEXcvgTg2YnFV5pd9lc6rO5srRC_OT5VLrmrD8PcxLxxABg',
            itemName: 'Lost Keys - Lulu Mall',
            itemStatus: 'Lost',
            online: false,
            replies: [
                "Thank you so much! I can meet you at the Vyttila Mobility Hub bus stand office tomorrow.",
                "Let me know when you reach there, I work nearby so I can drop by quickly.",
                "Perfect, let's coordinate once you are on the way."
            ]
        }
    ];

    let activeChatId = CHATS[0].id;

    // Elements
    const chatList = document.getElementById('chat-list');
    const messageContainer = document.getElementById('message-container');
    const chatHeaderAvatar = document.getElementById('chat-header-avatar');
    const chatHeaderName = document.getElementById('chat-header-name');
    const chatHeaderItem = document.getElementById('chat-header-item');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const searchChats = document.getElementById('search-chats');

    // Event Listeners
    if (messageForm) {
        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendMessage();
        });
    }

    if (searchChats) {
        searchChats.addEventListener('input', (e) => {
            renderChatList(e.target.value.trim().toLowerCase());
        });
    }

    // Load and Render Chat Sidebar
    function renderChatList(filterQuery = '') {
        if (!chatList) return;

        let filtered = CHATS;
        if (filterQuery) {
            filtered = CHATS.filter(c => c.name.toLowerCase().includes(filterQuery) || c.itemName.toLowerCase().includes(filterQuery));
        }

        chatList.innerHTML = filtered.map(chat => {
            const isActive = chat.id === activeChatId;
            const messages = window.Storage.getMessages(chat.id);
            const lastMsg = messages[messages.length - 1] || { text: 'No messages yet', timestamp: Date.now() };
            const timeStr = window.formatTimeAgo(lastMsg.timestamp);

            return `
                <div data-id="${chat.id}" class="chat-item p-4 flex gap-4 border-b border-slate-100 dark:border-slate-800/40 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isActive ? 'bg-primary-container/10 border-l-4 border-l-primary dark:bg-primary-container/5' : ''}">
                    <div class="relative flex-shrink-0">
                        <img class="w-12 h-12 rounded-full object-cover bg-slate-100 dark:bg-slate-900" src="${chat.avatar}" alt="${chat.name}">
                        ${chat.online ? `<div class="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full border-2 border-white dark:border-slate-900"></div>` : ''}
                    </div>
                    <div class="flex-grow min-w-0">
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white truncate">${chat.name}</h3>
                            <span class="text-[10px] text-slate-400 font-semibold">${timeStr}</span>
                        </div>
                        <p class="text-[11px] ${chat.itemStatus === 'Lost' ? 'text-error' : 'text-secondary'} font-bold truncate mb-1">${chat.itemName}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 truncate">${lastMsg.text}</p>
                    </div>
                </div>
            `;
        }).join('');

        // Bind click events
        chatList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                activeChatId = item.getAttribute('data-id');
                renderChatList(filterQuery);
                renderActiveChat();

                // Toggle mobile view panels
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

    // Load and Render Active Thread Messages
    function renderActiveChat() {
        const chat = CHATS.find(c => c.id === activeChatId);
        if (!chat) return;

        // Update header UI
        if (chatHeaderAvatar) chatHeaderAvatar.src = chat.avatar;
        if (chatHeaderName) chatHeaderName.textContent = chat.name;
        if (chatHeaderItem) {
            chatHeaderItem.innerHTML = `
                <span class="material-symbols-outlined text-[16px] text-primary">inventory_2</span>
                ${chat.itemName}
            `;
        }

        // Get messages from storage
        const msgs = window.Storage.getMessages(chat.id);
        if (!messageContainer) return;

        if (msgs.length === 0) {
            messageContainer.innerHTML = `
                <div class="flex-grow flex items-center justify-center text-slate-400 py-12">
                    Start a safe conversation about the reported item.
                </div>
            `;
            return;
        }

        messageContainer.innerHTML = msgs.map(msg => {
            const isMe = msg.senderId === 'current_user';
            
            return `
                <div class="flex ${isMe ? 'justify-end' : 'justify-start'} w-full">
                    <div class="max-w-[70%] space-y-1">
                        <div class="px-4 py-3 rounded-2xl text-sm ${
                            isMe 
                                ? 'bg-primary text-white rounded-tr-none shadow-sm' 
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/80 rounded-tl-none shadow-sm'
                        }">
                            <p class="leading-relaxed break-words">${msg.text}</p>
                        </div>
                        <span class="text-[9px] text-slate-400 block ${isMe ? 'text-right' : 'text-left'}">${window.formatTimeAgo(msg.timestamp)}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        setTimeout(() => {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }, 100);
    }

    // Send Message Workflow
    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        const chat = CHATS.find(c => c.id === activeChatId);
        if (!chat) return;

        // Save and Render My Message
        window.Storage.sendMessage(chat.id, 'current_user', text, chat.itemName);
        messageInput.value = '';
        renderActiveChat();
        renderChatList();

        // Simulate auto-reply response
        setTimeout(() => {
            // Pick a reply
            const replies = chat.replies;
            const replyText = replies[Math.floor(Math.random() * replies.length)];
            
            // Save and Render Auto Reply
            window.Storage.sendMessage(chat.id, chat.id, replyText, chat.itemName);
            renderActiveChat();
            renderChatList();

            // Highlight sound or notification toast
            window.showToast(`New message from ${chat.name}`);
        }, 1500);
    }

    // Initial Load
    renderChatList();
    renderActiveChat();
});
