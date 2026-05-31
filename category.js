/**
 * Money Tracker — Category Management
 */

window.CategoryManager = {
    state: {
        activeType: 'expense',
        editingId: null,
        selectedEmoji: '📌'
    },



    init() {
        this.initEventListeners();
        this.initEmojiPicker();
    },

    initEventListeners() {
        document.getElementById('btnAddCategory').addEventListener('click', () => this.openModal());
        document.getElementById('catModalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('catCancel').addEventListener('click', () => this.closeModal());

        document.getElementById('catTabs').addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-tab')) {
                document.querySelectorAll('#catTabs .filter-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.state.activeType = e.target.dataset.type;
                this.render();
            }
        });

        document.getElementById('catTypeSelector').addEventListener('click', (e) => {
            const btn = e.target.closest('.type-btn');
            if (btn) {
                document.querySelectorAll('#catTypeSelector .type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });

        document.getElementById('catForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCategory();
        });

        document.getElementById('catEmojiBtn').addEventListener('click', () => {
            const grid = document.getElementById('catEmojiGrid');
            grid.style.display = grid.style.display === 'none' ? 'grid' : 'none';
        });
    },

    initEmojiPicker() {
        const emojis = ['📌', '🍜', '🏠', '🚗', '💰', '🏦', '📈', '🎮', '📱', '🛍️', '💊', '📚', '🎁', '💵', '📦', '🎯', '👗', '🎬', '☕', '🥦', '🐖'];
        const grid = document.getElementById('catEmojiGrid');
        grid.innerHTML = emojis.map(e => `<span class="emoji-item">${e}</span>`).join('');

        grid.addEventListener('click', (e) => {
            if (e.target.classList.contains('emoji-item')) {
                this.state.selectedEmoji = e.target.textContent;
                document.getElementById('catEmojiBtn').textContent = this.state.selectedEmoji;
                grid.style.display = 'none';
            }
        });
    },

    openModal(id = null) {
        this.state.editingId = id;
        const modal = document.getElementById('catModal');
        const title = document.getElementById('catModalTitle');
        const form = document.getElementById('catForm');

        if (id) {
            const cat = App.state.categories.find(c => c.id === id);
            title.textContent = 'Chỉnh sửa danh mục';
            document.getElementById('catEditId').value = id;
            document.getElementById('catName').value = cat.name;
            this.state.selectedEmoji = cat.icon;
            document.getElementById('catEmojiBtn').textContent = cat.icon;

            document.querySelectorAll('#catTypeSelector .type-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === cat.type);
            });
        } else {
            title.textContent = 'Thêm danh mục';
            form.reset();
            this.state.selectedEmoji = '📌';
            document.getElementById('catEmojiBtn').textContent = '📌';
            document.getElementById('catEditId').value = '';
        }

        modal.classList.add('active');
    },

    closeModal() {
        document.getElementById('catModal').classList.remove('active');
        document.getElementById('catEmojiGrid').style.display = 'none';
    },

    saveCategory() {
        const name = document.getElementById('catName').value;
        const type = document.querySelector('#catTypeSelector .type-btn.active').dataset.type;
        const id = document.getElementById('catEditId').value;

        const catData = {
            id: id || App.generateId(),
            name,
            icon: this.state.selectedEmoji,
            type,
            color: this.getTypeColor(type)
        };

        if (id) {
            const index = App.state.categories.findIndex(c => c.id === id);
            App.state.categories[index] = catData;
            App.showToast('Đã cập nhật danh mục');
        } else {
            App.state.categories.push(catData);
            App.showToast('Đã thêm danh mục mới');
        }

        App.saveCategories();
        this.closeModal();
        this.render();
    },

    getTypeColor(type) {
        if (type === 'income') return '#10b981';
        if (type === 'expense') return '#ef4444';
        return '#6366f1';
    },

    deleteCategory(id) {
        // Check if transactions exist for this category
        const hasTxns = App.state.transactions.some(t => t.categoryId === id);
        if (hasTxns) {
            App.showToast('Không thể xoá danh mục đang có giao dịch', 'error');
            return;
        }

        if (confirm('Bạn có chắc muốn xoá danh mục này?')) {
            App.state.categories = App.state.categories.filter(c => c.id !== id);
            App.saveCategories();
            App.showToast('Đã xoá danh mục');
            this.render();
        }
    },

    render() {
        const grid = document.getElementById('catGrid');
        const empty = document.getElementById('catEmpty');
        const filtered = App.state.categories.filter(c => c.type === this.state.activeType);

        if (filtered.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'flex';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = filtered.map(c => {
            const count = App.state.transactions.filter(t => t.categoryId === c.id).length;
            return `
                <div class="cat-card">
                    <div class="cat-icon-large" style="background: ${c.color}15; color: ${c.color}; width: 40px; height: 40px; font-size: 1.2rem; border-radius: 10px;">
                        ${c.icon}
                    </div>
                    <div class="cat-card-info" style="flex: 1; display: flex; align-items: center; justify-content: space-between;">
                        <span class="cat-card-name" style="font-weight: 600;">${c.name}</span>
                        <span class="cat-card-count" style="font-size: 0.8rem; color: var(--text-muted);">${count} giao dịch</span>
                    </div>
                    <div class="cat-actions" style="display: flex; gap: 6px;">
                        <button class="btn-icon" onclick="CategoryManager.openModal('${c.id}')" title="Sửa">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn-icon btn-delete" onclick="CategoryManager.deleteCategory('${c.id}')" title="Xoá">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
};
