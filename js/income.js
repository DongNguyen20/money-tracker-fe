/**
 * Money Tracker — Income Management
 */

window.IncomeManager = {
    state: {
        filterCategory: 'all',
        editingId: null,
        currentPage: 1,
        pageSize: 5
    },

    init() {
        this.initEventListeners();
    },

    initEventListeners() {
        const btnAdd = document.getElementById('btnAddIncome');
        if (btnAdd) btnAdd.addEventListener('click', () => this.openModal());
        
        const btnClose = document.getElementById('incomeModalClose');
        if (btnClose) btnClose.addEventListener('click', () => this.closeModal());
        
        const btnCancel = document.getElementById('incomeCancel');
        if (btnCancel) btnCancel.addEventListener('click', () => this.closeModal());

        const form = document.getElementById('incomeForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveIncome();
            });
        }

        const filterCat = document.getElementById('incomeCategoryFilter');
        if (filterCat) {
            filterCat.addEventListener('change', (e) => {
                this.state.filterCategory = e.target.value;
                this.render();
            });
        }

        const dateFrom = document.getElementById('incomeDateFrom');
        const dateTo = document.getElementById('incomeDateTo');
        if (dateFrom && dateTo) {
            [dateFrom, dateTo].forEach(el => el.addEventListener('change', () => {
                this.state.currentPage = 1;
                this.render();
            }));
        }

        const pageSizeSelect = document.getElementById('incomePageSize');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.state.pageSize = parseInt(e.target.value);
                this.state.currentPage = 1;
                this.render();
            });
        }

        const prevBtn = document.getElementById('prevIncomePage');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.state.currentPage > 1) {
                    this.state.currentPage--;
                    this.render();
                }
            });
        }

        const nextBtn = document.getElementById('nextIncomePage');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.state.currentPage++;
                this.render();
            });
        }

        // Amount Formatting
        const amountInput = document.getElementById('incomeAmount');
        if (amountInput) {
            amountInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value) {
                    e.target.value = new Intl.NumberFormat('vi-VN').format(value);
                } else {
                    e.target.value = '';
                }
            });
        }
    },

    openModal(id = null) {
        this.state.editingId = id;
        const modal = document.getElementById('incomeModal');
        const title = document.getElementById('incomeModalTitle');
        const form = document.getElementById('incomeForm');

        if (id) {
            const txn = App.state.transactions.find(t => t.id === id);
            title.textContent = 'Chỉnh sửa thu nhập';
            document.getElementById('incomeEditId').value = id;
            document.getElementById('incomeAmount').value = new Intl.NumberFormat('vi-VN').format(txn.amount);
            document.getElementById('incomeNote').value = txn.note;
            document.getElementById('incomeDate').value = txn.date;

            this.updateCategoryDropdown(txn.categoryId);
        } else {
            title.textContent = 'Thêm thu nhập';
            form.reset();
            document.getElementById('incomeEditId').value = '';

            // Get today's date in YYYY-MM-DD format
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;

            document.getElementById('incomeDate').value = today;
            this.updateCategoryDropdown();
        }

        modal.classList.add('active');
    },

    closeModal() {
        document.getElementById('incomeModal').classList.remove('active');
    },

    updateCategoryDropdown(selectedId = null) {
        const select = document.getElementById('incomeCategory');
        const categories = App.state.categories.filter(c => c.type === 'income');

        select.innerHTML = categories.map(c => `
            <option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.icon} ${c.name}</option>
        `).join('');

        this.updateFilterDropdown();
    },

    updateFilterDropdown() {
        const filterSelect = document.getElementById('incomeCategoryFilter');
        const incomeCats = App.state.categories.filter(c => c.type === 'income');
        filterSelect.innerHTML = '<option value="all">Tất cả danh mục</option>' +
            incomeCats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    },

    saveIncome() {
        const amountStr = document.getElementById('incomeAmount').value;
        const amount = parseFloat(amountStr.replace(/\./g, ''));

        if (isNaN(amount) || amount <= 0) {
            App.showToast('Vui lòng nhập số tiền hợp lệ', 'error');
            return;
        }

        const categoryId = document.getElementById('incomeCategory').value;
        const note = document.getElementById('incomeNote').value;
        let date = document.getElementById('incomeDate').value;
        const id = document.getElementById('incomeEditId').value;

        // If date is empty, use today's date
        if (!date) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            date = `${year}-${month}-${day}`;
        }

        const txnData = {
            id: id || App.generateId(),
            amount,
            type: 'income',
            categoryId,
            note: note || App.state.categories.find(c => c.id === categoryId).name,
            date,
            createdAt: new Date().toISOString()
        };

        if (id) {
            const index = App.state.transactions.findIndex(t => t.id === id);
            App.state.transactions[index] = txnData;
            App.showToast('Đã cập nhật thu nhập');
        } else {
            App.state.transactions.push(txnData);
            App.showToast('Đã thêm thu nhập thành công');
        }

        App.saveTransactions();
        this.closeModal();
        this.render();
    },

    deleteIncome(id) {
        if (confirm('Bạn có chắc muốn xoá khoản thu nhập này?')) {
            App.state.transactions = App.state.transactions.filter(t => t.id !== id);
            App.saveTransactions();
            App.showToast('Đã xoá thu nhập');
            this.render();
        }
    },

    render() {
        const list = document.getElementById('incomeList');
        const empty = document.getElementById('incomeEmpty');
        if (!list) return;

        const dateFrom = document.getElementById('incomeDateFrom').value;
        const dateTo = document.getElementById('incomeDateTo').value;

        let filtered = App.state.transactions.filter(t => t.type === 'income');

        if (this.state.filterCategory !== 'all') {
            filtered = filtered.filter(t => t.categoryId === this.state.filterCategory);
        }

        if (dateFrom) filtered = filtered.filter(t => t.date >= dateFrom);
        if (dateTo) filtered = filtered.filter(t => t.date <= dateTo);

        // Sort by date desc
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Stats
        const month = App.state.currentMonth.getMonth();
        const year = App.state.currentMonth.getFullYear();
        const monthIncome = filtered.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === month && d.getFullYear() === year;
        }).reduce((sum, t) => sum + t.amount, 0);

        document.getElementById('totalIncomeMonth').textContent = App.formatCurrency(monthIncome);
        document.getElementById('currentBalanceIncome').textContent = App.formatCurrency(App.state.balance);

        // Pagination logic
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / this.state.pageSize) || 1;

        if (this.state.currentPage > totalPages) this.state.currentPage = totalPages;

        const start = (this.state.currentPage - 1) * this.state.pageSize;
        const end = start + this.state.pageSize;
        const paginated = filtered.slice(start, end);

        // Update Pagination UI
        const paginationEl = document.getElementById('incomePagination');
        if (totalItems === 0) {
            if (paginationEl) paginationEl.style.display = 'none';
            list.innerHTML = '';
            empty.style.display = 'flex';
            empty.innerHTML = '<div class="no-data">Không có dữ liệu thu nhập</div>';
            return;
        }

        if (paginationEl) paginationEl.style.display = 'flex';
        document.getElementById('incomePageInfo').textContent = `Trang ${this.state.currentPage}/${totalPages}`;
        document.getElementById('incomeTotalInfo').textContent = `Tổng: ${totalItems} khoản thu`;
        document.getElementById('prevIncomePage').disabled = this.state.currentPage === 1;
        document.getElementById('nextIncomePage').disabled = this.state.currentPage === totalPages;

        empty.style.display = 'none';

        // Group by date
        const groups = {};
        paginated.forEach(t => {
            if (!groups[t.date]) groups[t.date] = [];
            groups[t.date].push(t);
        });

        list.innerHTML = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).map(date => {
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

            return `
                <div class="txn-group">
                    <div class="txn-group-header">${dateStr}</div>
                    ${groups[date].map(t => {
                const cat = App.state.categories.find(c => c.id === t.categoryId) || { icon: '💰', name: 'Thu nhập', color: '#10b981' };
                return `
                            <div class="txn-item">
                                <div class="txn-icon" style="background: ${cat.color}20; color: ${cat.color}">${cat.icon}</div>
                                <div class="txn-info">
                                    <span class="txn-name">${t.note}</span>
                                    <span class="txn-category">${cat.name}</span>
                                </div>
                                <div class="txn-amount income">+${App.formatCurrency(t.amount)}</div>
                                <div class="txn-actions" style="margin-left: 15px">
                                    <button class="btn-icon" onclick="IncomeManager.openModal('${t.id}')">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                    <button class="btn-icon btn-delete" onclick="IncomeManager.deleteIncome('${t.id}')">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }).join('');
    }
};
