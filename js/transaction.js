/**
 * Money Tracker — Transaction Management
 */

window.TransactionManager = {
    state: {
        filterType: 'all',
        filterCategory: 'all',
        editingId: null,
        currentPage: 1,
        pageSize: 5
    },


    async init() {
        this.initEventListeners();
        await this.loadTransactions();
        // Set default date after a small delay to ensure DOM is ready
        setTimeout(() => this.initDefaultDate(), 100);
    },

    async loadTransactions() {
        try {
            const res = await ApiService.transaction.getAll({
                type: this.state.filterType,
                categoryId: this.state.filterCategory,
                page: this.state.currentPage,
                size: 1000 // Grab enough to sort/paginate locally for standard user or handle via server.
            });
            App.state.transactions = res.content || [];
        } catch (error) {
            console.error('Failed to load transactions from API:', error);
            const stored = localStorage.getItem('mt_transactions');
            if (stored) {
                App.state.transactions = JSON.parse(stored);
            }
        }
    },

    initDefaultDate() {
        const dateInput = document.getElementById('txnDate');
        if (dateInput) {
            // Remove any validation attributes
            dateInput.removeAttribute('required');
            dateInput.removeAttribute('pattern');
            dateInput.setAttribute('formnovalidate', '');

            // Set today's date
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;
            dateInput.value = today;
            console.log('Default date set to:', today, 'Input value:', dateInput.value);
        } else {
            console.log('Date input not found, retrying...');
            setTimeout(() => this.initDefaultDate(), 100);
        }
    },

    initEventListeners() {
        document.getElementById('btnAddTransaction').addEventListener('click', () => this.openModal());
        document.getElementById('txnModalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('txnCancel').addEventListener('click', () => this.closeModal());

        document.getElementById('txnFilterTabs').addEventListener('click', async (e) => {
            const tab = e.target.closest('.filter-tab');
            if (tab) {
                document.querySelectorAll('#txnFilterTabs .filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.state.filterType = tab.dataset.type;
                await this.loadTransactions();
                this.render();
            }
        });

        document.getElementById('txnTypeSelector').addEventListener('click', (e) => {
            const btn = e.target.closest('.type-btn');
            if (btn) {
                document.querySelectorAll('#txnTypeSelector .type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateCategoryDropdown(btn.dataset.type);
            }
        });

        document.getElementById('txnForm').addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submit triggered'); // Debug
            this.saveTransaction();
        });

        // Also handle button click directly to bypass any form validation
        document.getElementById('txnSaveBtn').addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Save button clicked directly'); // Debug
            this.saveTransaction();
        });

        document.getElementById('txnCategoryFilter').addEventListener('change', async (e) => {
            this.state.filterCategory = e.target.value;
            await this.loadTransactions();
            this.render();
        });

        const dateFrom = document.getElementById('txnDateFrom');
        const dateTo = document.getElementById('txnDateTo');
        [dateFrom, dateTo].forEach(el => el.addEventListener('change', async () => {
            this.state.currentPage = 1;
            await this.loadTransactions();
            this.render();
        }));

        // Pagination
        document.getElementById('txnPageSize').addEventListener('change', (e) => {
            this.state.pageSize = parseInt(e.target.value);
            this.state.currentPage = 1;
            this.render();
        });

        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.state.currentPage > 1) {
                this.state.currentPage--;
                this.render();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            this.state.currentPage++;
            this.render();
        });

        // Amount Formatting
        const amountInput = document.getElementById('txnAmount');
        amountInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value) {
                e.target.value = new Intl.NumberFormat('vi-VN').format(value);
            } else {
                e.target.value = '';
            }
        });
    },

    openModal(id = null) {
        this.state.editingId = id;
        const modal = document.getElementById('txnModal');
        const title = document.getElementById('txnModalTitle');
        const form = document.getElementById('txnForm');
        const dateInput = document.getElementById('txnDate');

        console.log('openModal called with id:', id); // Debug

        // Ensure date input has no validation and set default value BEFORE modal opens
        dateInput.removeAttribute('required');
        dateInput.setAttribute('formnovalidate', '');

        if (id) {
            const txn = App.state.transactions.find(t => t.id == id);
            title.textContent = 'Chỉnh sửa giao dịch';
            document.getElementById('txnEditId').value = id;
            document.getElementById('txnAmount').value = new Intl.NumberFormat('vi-VN').format(txn.amount);
            document.getElementById('txnNote').value = txn.note;
            dateInput.value = txn.date;

            document.querySelectorAll('#txnTypeSelector .type-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === txn.type);
            });

            this.updateCategoryDropdown(txn.type, txn.categoryId);
        } else {
            title.textContent = 'Thêm giao dịch';
            form.reset();
            document.getElementById('txnEditId').value = '';

            // Get today's date in YYYY-MM-DD format
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;

            dateInput.value = today;
            console.log('Date input set to:', today, 'Actual value:', dateInput.value); // Debug
            document.querySelector('#txnTypeSelector [data-type="expense"]').click();
        }

        // Set modal to active AFTER date value is set
        modal.classList.add('active');
    },

    closeModal() {
        document.getElementById('txnModal').classList.remove('active');
    },

    updateCategoryDropdown(type, selectedId = null) {
        const select = document.getElementById('txnCategory');
        const categories = App.state.categories.filter(c => c.type === type);

        select.innerHTML = categories.map(c => `
            <option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.icon} ${c.name}</option>
        `).join('');

        // Update global filter dropdown too
        this.updateFilterDropdown();
    },

    updateFilterDropdown() {
        const filterSelect = document.getElementById('txnCategoryFilter');
        filterSelect.innerHTML = '<option value="all">Tất cả danh mục</option>' +
            App.state.categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    },

    async saveTransaction() {
        console.log('saveTransaction called'); // Debug

        // Ensure date input has no validation before saving
        const dateInput = document.getElementById('txnDate');
        dateInput.removeAttribute('required');
        dateInput.setAttribute('formnovalidate', '');

        const amountStr = document.getElementById('txnAmount').value;
        const amount = parseFloat(amountStr.replace(/\./g, ''));

        console.log('Amount:', amount); // Debug

        if (isNaN(amount) || amount <= 0) {
            App.showToast('Vui lòng nhập số tiền hợp lệ', 'error');
            return;
        }

        const type = document.querySelector('#txnTypeSelector .type-btn.active').dataset.type;
        const categoryId = document.getElementById('txnCategory').value;
        const note = document.getElementById('txnNote').value;
        let date = dateInput.value;
        const id = document.getElementById('txnEditId').value;

        console.log('Date value before check:', date); // Debug

        // If date is empty, use today's date
        if (!date) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            date = `${year}-${month}-${day}`;
            console.log('Date set to today:', date); // Debug
        }

        console.log('Final date:', date); // Debug

        const txnData = {
            amount,
            type: type.toUpperCase(), // Backend expects INCOME, EXPENSE, SAVING
            categoryId,
            note: note || App.state.categories.find(c => c.id === categoryId).name,
            date
        };

        try {
            if (id) {
                // Update transaction on Backend
                const updated = await ApiService.transaction.update(id, txnData);
                const index = App.state.transactions.findIndex(t => t.id == id);
                if (index !== -1) {
                    App.state.transactions[index] = {
                        ...updated,
                        type: updated.type.toLowerCase() // Convert back to FE format
                    };
                }
                App.showToast('Đã cập nhật giao dịch');
            } else {
                // Create transaction on Backend
                const created = await ApiService.transaction.create(txnData);
                App.state.transactions.push({
                    ...created,
                    type: created.type.toLowerCase() // Convert back to FE format
                });
                App.showToast('Đã thêm giao dịch thành công');
            }

            // Save to localStorage as backup
            localStorage.setItem('mt_transactions', JSON.stringify(App.state.transactions));
            App.updateGlobalStats();

            // Refresh dashboards if active
            if (App.state.currentView === 'dashboard' && window.DashboardManager) DashboardManager.render();

            this.closeModal();
            this.render();
        } catch (error) {
            console.error('Failed to save transaction:', error);
            App.showToast('Lỗi khi lưu giao dịch', 'error');
        }
    },

    async deleteTransaction(id) {
        if (confirm('Bạn có chắc muốn xoá giao dịch này?')) {
            try {
                await ApiService.transaction.delete(id);
                App.state.transactions = App.state.transactions.filter(t => t.id !== id);
                
                // Save backup
                localStorage.setItem('mt_transactions', JSON.stringify(App.state.transactions));
                App.updateGlobalStats();
                
                if (App.state.currentView === 'dashboard' && window.DashboardManager) DashboardManager.render();
                
                App.showToast('Đã xoá giao dịch');
                this.render();
            } catch (error) {
                console.error('Failed to delete transaction:', error);
                App.showToast('Lỗi khi xoá giao dịch', 'error');
            }
        }
    },

    render() {
        const list = document.getElementById('txnList');
        const empty = document.getElementById('txnEmpty');

        const dateFrom = document.getElementById('txnDateFrom').value;
        const dateTo = document.getElementById('txnDateTo').value;

        let filtered = App.state.transactions;

        if (this.state.filterType !== 'all') {
            filtered = filtered.filter(t => t.type === this.state.filterType);
        }

        if (this.state.filterCategory !== 'all') {
            filtered = filtered.filter(t => t.categoryId === this.state.filterCategory);
        }

        if (dateFrom) {
            filtered = filtered.filter(t => t.date >= dateFrom);
        }
        if (dateTo) {
            filtered = filtered.filter(t => t.date <= dateTo);
        }

        // Sort by date desc
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Pagination logic
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / this.state.pageSize) || 1;

        if (this.state.currentPage > totalPages) this.state.currentPage = totalPages;

        const start = (this.state.currentPage - 1) * this.state.pageSize;
        const end = start + this.state.pageSize;
        const paginated = filtered.slice(start, end);

        // Update Pagination UI
        const paginationEl = document.getElementById('txnPagination');
        if (totalItems === 0) {
            paginationEl.style.display = 'none';
            list.innerHTML = '';
            empty.style.display = 'flex';
            return;
        }

        paginationEl.style.display = 'flex';
        document.getElementById('pageInfo').textContent = `Trang ${this.state.currentPage}/${totalPages}`;
        document.getElementById('totalInfo').textContent = `Tổng: ${totalItems} giao dịch`;
        document.getElementById('prevPage').disabled = this.state.currentPage === 1;
        document.getElementById('nextPage').disabled = this.state.currentPage === totalPages;

        empty.style.display = 'none';

        // Group by date
        const groups = {};
        paginated.forEach(t => {
            if (!groups[t.date]) groups[t.date] = [];
            groups[t.date].push(t);
        });

        list.innerHTML = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).map(date => {
            const dateObj = new Date(date);
            const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            const dayName = dayNames[dateObj.getDay()];
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            const dateStr = `${dayName} ${day}-${month}-${year}`;

            return `
                <div class="txn-group">
                    <div class="txn-group-header">${dateStr}</div>
                    ${groups[date].map(t => {
                const cat = App.state.categories.find(c => c.id === t.categoryId) || { icon: '❓', name: 'Unknown', color: '#666' };
                return `
                            <div class="txn-item">
                                <div class="txn-icon" style="background: ${cat.color}20; color: ${cat.color}">${cat.icon}</div>
                                <div class="txn-info">
                                    <span class="txn-name">${t.note}</span>
                                    <span class="txn-category">${cat.name}</span>
                                </div>
                                <div class="txn-amount ${t.type}">${t.type === 'expense' ? '-' : '+'}${App.formatCurrency(t.amount)}</div>
                                <div class="txn-actions" style="margin-left: 15px">
                                    <button class="btn-icon" onclick="TransactionManager.openModal('${t.id}')">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                    <button class="btn-icon btn-delete" onclick="TransactionManager.deleteTransaction('${t.id}')">
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
