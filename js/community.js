// community.js - Success stories listing and publishing triggers

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Storage) return;

    // Elements
    const storiesGrid = document.getElementById('stories-grid');
    const openStoryModalBtn = document.getElementById('open-story-btn');
    const storyModal = document.getElementById('story-modal');
    const storyForm = document.getElementById('story-form');

    // RENDER STORIES
    function renderStories() {
        if (!storiesGrid) return;
        const stories = window.Storage.getStories().filter(s => s.verifiedByAdmin !== false);

        if (stories.length === 0) {
            storiesGrid.innerHTML = `
                <div class="col-span-full py-12 text-center text-slate-500">
                    No success stories shared yet. Be the first to share!
                </div>
            `;
            return;
        }

        storiesGrid.innerHTML = stories.map(story => `
            <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden group shadow-sm">
                <!-- Decorative Icon background -->
                <div class="absolute -top-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <span class="material-symbols-outlined text-[100px] text-primary">volunteer_activism</span>
                </div>
                
                <div class="space-y-4">
                    <div class="flex justify-between items-start gap-4">
                        <h3 class="text-lg font-bold text-slate-950 dark:text-white leading-snug">${story.title}</h3>
                        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">${story.date}</span>
                    </div>
                    <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-4 border-primary pl-4">
                        " ${story.content} "
                    </p>
                </div>

                <div class="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                    <span class="text-xs font-bold text-slate-900 dark:text-slate-200">- ${story.author}</span>
                    <button data-id="${story.id}" class="like-story-btn flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 font-bold transition-colors">
                        <span class="material-symbols-outlined text-base">favorite</span>
                        <span>${story.likes} Likes</span>
                    </button>
                </div>
            </div>
        `).join('');

        // Bind like handlers
        storiesGrid.querySelectorAll('.like-story-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                likeStory(id);
            });
        });
    }

    // LIKE STORY
    function likeStory(id) {
        const stories = window.Storage.getStories();
        const index = stories.findIndex(s => s.id === id);
        if (index !== -1) {
            stories[index].likes++;
            localStorage.setItem('kochiretrace_stories', JSON.stringify(stories));
            renderStories();
            window.showToast("Story liked!");
        }
    }

    // MODAL HANDLERS
    if (openStoryModalBtn && storyModal) {
        openStoryModalBtn.addEventListener('click', () => {
            const currentUser = window.Storage.getUser();
            if (!currentUser) {
                window.showToast("Please log in to share a story!", "error");
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
                return;
            }

            // Fill default author name
            document.getElementById('story-author').value = currentUser.name;
            storyModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        });
    }

    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (storyModal) storyModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        });
    });

    // Form Submission
    if (storyForm) {
        storyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const title = document.getElementById('story-title').value.trim();
            const author = document.getElementById('story-author').value.trim();
            const content = document.getElementById('story-content').value.trim();

            if (!title || !author || !content) {
                window.showToast("Please fill in all story fields!", "error");
                return;
            }

            window.Storage.saveStory({
                title,
                author,
                content
            });

            storyModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
            storyForm.reset();

            window.showToast("Success story shared instantly!");
            renderStories();
        });
    }

    // Initial render
    renderStories();
});
