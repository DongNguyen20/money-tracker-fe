/**
 * Money Tracker — Rent & Utility Management
 */

window.RentManager = {
    state: {
        editingId: null,
        currentYear: new Date().getFullYear(),
        sortOrder: 'desc', // 'desc' or 'asc'
        settings: {
            defaultBase: 2200000,
            priceElec: 4500,
            priceWater: 20000,
            defaultWifi: 200000,
            defaultGarbage: 30000
        }
    },


    async init() {
        await this.loadSettings();
        await this.loadRentHistory();
        
        if (!App.state.rentHistory) {
            App.state.rentHistory = [];
        }

        this.bindEvents();
        this.updateYearFilter();
        this.render();
    },

    async loadRentHistory() {
        try {
            const rents = await ApiService.rent.getAll();
            App.state.rentHistory = rents || [];
        } catch (error) {
            console.error('Failed to load rent history from API:', error);
            // Fallback to localStorage if API fails
            const stored = localStorage.getItem('mt_rent_history');
            if (stored) {
                try {
                    App.state.rentHistory = JSON.parse(stored);
                } catch (e) {
                    App.state.rentHistory = [];
                }
            } else {
                App.state.rentHistory = [];
            }
        }
    },

    updateYearFilter() {
        const select = document.getElementById('rentYearFilter');
        const history = App.state.rentHistory || [];
        const years = new Set(history.map(b => b.month.split('-')[0]));
        years.add(new Date().getFullYear().toString());

        const sortedYears = Array.from(years).sort((a, b) => b - a);
        select.innerHTML = sortedYears.map(y => `<option value="${y}" ${y == this.state.currentYear ? 'selected' : ''}>Năm ${y}</option>`).join('');
    },

    async loadSettings() {
        // Load from localStorage only - disabled API calls to config params
        const stored = localStorage.getItem('mt_rent_settings');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                this.state.settings = { ...this.state.settings, ...parsed };
            } catch (e) {
                console.error('Failed to parse rent settings', e);
            }
        }
    },

    async saveSettings() {
        // Save to localStorage only - disabled API calls
        localStorage.setItem('mt_rent_settings', JSON.stringify(this.state.settings));
    },

    bindEvents() {
        // Main Actions
        document.getElementById('btnAddRent').addEventListener('click', () => this.openModal());
        document.getElementById('btnRentSettings').addEventListener('click', () => this.openSettings());
        document.getElementById('btnRentRefresh').addEventListener('click', () => {
            this.state.sortOrder = this.state.sortOrder === 'desc' ? 'asc' : 'desc';
            const btn = document.getElementById('btnRentRefresh');
            btn.title = this.state.sortOrder === 'asc' ? 'Sắp xếp giảm dần' : 'Sắp xếp tăng dần';
            App.showToast(`Đã sắp xếp ${this.state.sortOrder === 'asc' ? 'tăng' : 'giảm'} dần theo tháng`);
            this.render();
        });

        document.getElementById('rentYearFilter').addEventListener('change', (e) => {
            this.state.currentYear = e.target.value;
            this.render();
        });

        // Modal Events
        document.getElementById('rentModalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('rentCancel').addEventListener('click', () => this.closeModal());
        document.getElementById('rentSettingsClose').addEventListener('click', () => this.closeSettings());

        // Forms
        document.getElementById('rentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBill();
        });

        document.getElementById('rentSettingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateSettings();
        });

        // Auto-formatting for amount inputs
        const amountInputs = ['rentBase', 'rentWifi', 'rentGarbage', 'rentOther', 'defaultBase', 'priceElec', 'priceWater', 'defaultWifi', 'defaultGarbage'];
        amountInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value) e.target.value = new Intl.NumberFormat('vi-VN').format(value);
                    else e.target.value = '';
                });
            }
        });
    },

    openModal(id = null) {
        const form = document.getElementById('rentForm');
        form.reset();
        this.state.editingId = id;

        // Set defaults from settings
        document.getElementById('rentBase').value = App.formatCurrencyRaw(this.state.settings.defaultBase || 2200000);
        document.getElementById('rentWifi').value = App.formatCurrencyRaw(this.state.settings.defaultWifi || 0);
        document.getElementById('rentGarbage').value = App.formatCurrencyRaw(this.state.settings.defaultGarbage || 0);

        // Get current month in YYYY-MM format
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const currentMonth = `${year}-${month}`;

        document.getElementById('rentMonth').value = currentMonth;

        // Pre-fill indices if creating new bill
        const history = [...App.state.rentHistory].sort((a, b) => a.month.localeCompare(b.month));
        const prevBill = history.length > 0 ? history[history.length - 1] : null;

        if (id) {
            const bill = App.state.rentHistory.find(b => b.id === id);
            document.getElementById('rentModalTitle').textContent = 'Chỉnh sửa hoá đơn';
            document.getElementById('rentEditId').value = id;
            document.getElementById('rentMonth').value = bill.month;
            document.getElementById('rentBase').value = App.formatCurrencyRaw(bill.base);
            document.getElementById('rentWifi').value = App.formatCurrencyRaw(bill.wifi);
            document.getElementById('rentGarbage').value = App.formatCurrencyRaw(bill.garbage);
            document.getElementById('rentOther').value = App.formatCurrencyRaw(bill.other || 0);
            document.getElementById('rentElec').value = bill.elecUsage;
            document.getElementById('rentWater').value = bill.waterUsage;
        } else {
            document.getElementById('rentModalTitle').textContent = 'Ghi hoá đơn mới';
        }

        document.getElementById('rentModal').classList.add('active');
    },

    closeModal() {
        document.getElementById('rentModal').classList.remove('active');
    },

    openSettings() {
        document.getElementById('defaultBase').value = App.formatCurrencyRaw(this.state.settings.defaultBase);
        document.getElementById('priceElec').value = App.formatCurrencyRaw(this.state.settings.priceElec);
        document.getElementById('priceWater').value = App.formatCurrencyRaw(this.state.settings.priceWater);
        document.getElementById('defaultWifi').value = App.formatCurrencyRaw(this.state.settings.defaultWifi);
        document.getElementById('defaultGarbage').value = App.formatCurrencyRaw(this.state.settings.defaultGarbage);
        document.getElementById('rentSettingsModal').classList.add('active');
    },

    closeSettings() {
        document.getElementById('rentSettingsModal').classList.remove('active');
    },

    async updateSettings() {
        this.state.settings = {
            defaultBase: App.parseCurrency(document.getElementById('defaultBase').value),
            priceElec: App.parseCurrency(document.getElementById('priceElec').value),
            priceWater: App.parseCurrency(document.getElementById('priceWater').value),
            defaultWifi: App.parseCurrency(document.getElementById('defaultWifi').value),
            defaultGarbage: App.parseCurrency(document.getElementById('defaultGarbage').value)
        };
        await this.saveSettings();
        this.closeSettings();
        App.showToast('Đã cập nhật cấu hình');
    },

    async saveBill() {
        let month = document.getElementById('rentMonth').value;
        const base = App.parseCurrency(document.getElementById('rentBase').value);
        const wifi = App.parseCurrency(document.getElementById('rentWifi').value);
        const garbage = App.parseCurrency(document.getElementById('rentGarbage').value);
        const other = App.parseCurrency(document.getElementById('rentOther').value);
        const elecUsage = parseInt(document.getElementById('rentElec').value) || 0;
        const waterUsage = parseInt(document.getElementById('rentWater').value) || 0;

        // If month is empty, use current month
        if (!month) {
            const now = new Date();
            const year = now.getFullYear();
            const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
            month = `${year}-${currentMonth}`;
        }

        const elecTotal = elecUsage * this.state.settings.priceElec;
        const waterTotal = waterUsage * this.state.settings.priceWater;
        const total = base + wifi + garbage + other + elecTotal + waterTotal;

        const billData = {
            month: month,
            base: base,
            wifi: wifi,
            garbage: garbage,
            other: other,
            elecUsage: elecUsage,
            waterUsage: waterUsage,
            elecTotal: elecTotal,
            waterTotal: waterTotal,
            total: total,
            status: 'PAID'
        };

        try {
            if (this.state.editingId) {
                // Update existing bill
                const updated = await ApiService.rent.update(this.state.editingId, billData);
                const index = App.state.rentHistory.findIndex(b => b.id === this.state.editingId);
                if (index !== -1) {
                    App.state.rentHistory[index] = updated;
                }
                App.showToast('Đã cập nhật hoá đơn');
            } else {
                // Create new bill
                const created = await ApiService.rent.create(billData);
                App.state.rentHistory.push(created);
                App.showToast('Đã lưu hoá đơn mới');
            }

            // Save to localStorage as backup
            localStorage.setItem('mt_rent_history', JSON.stringify(App.state.rentHistory));

            this.closeModal();
            this.updateYearFilter();
            this.render();
        } catch (error) {
            console.error('Failed to save bill:', error);
            App.showToast('Lỗi khi lưu hoá đơn');
        }
    },

    async deleteBill(id) {
        if (!confirm('Bạn có chắc muốn xóa hoá đơn này?')) return;

        try {
            await ApiService.rent.delete(id);
            App.state.rentHistory = App.state.rentHistory.filter(b => b.id !== id);
            
            // Save to localStorage as backup
            localStorage.setItem('mt_rent_history', JSON.stringify(App.state.rentHistory));

            this.updateYearFilter();
            this.render();
            App.showToast('Đã xóa hoá đơn');
        } catch (error) {
            console.error('Failed to delete bill:', error);
            App.showToast('Lỗi khi xóa hoá đơn');
        }
    },

    async updateBillStatus(id, newStatus) {
        try {
            await ApiService.rent.updateStatus(id, newStatus);
            const bill = App.state.rentHistory.find(b => b.id === id);
            if (bill) {
                bill.status = newStatus;
            }
            
            // Save to localStorage as backup
            localStorage.setItem('mt_rent_history', JSON.stringify(App.state.rentHistory));

            this.render();
            App.showToast('Đã cập nhật trạng thái');
        } catch (error) {
            console.error('Failed to update bill status:', error);
            App.showToast('Lỗi khi cập nhật trạng thái');
        }
    },

    render() {
        const container = document.getElementById('rentList');
        if (!container) return;

        const history = App.state.rentHistory || [];
        const filteredHistory = history.filter(b => b.month.startsWith(this.state.currentYear));
        const sortedHistory = [...filteredHistory].sort((a, b) => {
            if (this.state.sortOrder === 'desc') {
                return b.month.localeCompare(a.month);
            } else {
                return a.month.localeCompare(b.month);
            }
        });

        // Update year summary
        const yearTotal = filteredHistory.reduce((sum, b) => sum + (b.total || 0), 0);
        const summaryEl = document.getElementById('rentYearSummary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <span class="summary-year-label">Tổng tiền nhà năm ${this.state.currentYear}</span>
                <span class="summary-year-value">${App.formatCurrency(yearTotal)}</span>
            `;
        }

        if (sortedHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    </svg>
                    <h3>Chưa có hoá đơn tiền nhà</h3>
                    <p>Nhấn nút "Ghi hoá đơn" để ghi hoá đơn đầu tiên</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sortedHistory.map(bill => {
            const monthName = new Date(bill.month + '-01').toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });

            // Build services (Dịch vụ) aggregation
            const servicesTotal = (bill.wifi || 0) + (bill.garbage || 0) + (bill.other || 0);
            const serviceParts = [];
            if (bill.wifi) serviceParts.push(`Wifi: ${App.formatCurrency(bill.wifi)}`);
            if (bill.garbage) serviceParts.push(`Rác: ${App.formatCurrency(bill.garbage)}`);
            if (bill.other) serviceParts.push(`Khác: ${App.formatCurrency(bill.other)}`);
            const serviceSubtext = serviceParts.join('; ');

            return `
                <div class="rent-bill-card">
                    <div class="bill-header">
                        <div class="bill-header-left">
                            <span class="bill-month" style="text-transform: capitalize;">${monthName}</span>
                            <span class="bill-total">${App.formatCurrency(bill.total)}</span>
                        </div>
                        <div class="bill-actions">
                            <button class="btn-icon" onclick="RentManager.openModal(${bill.id})" title="Sửa">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="btn-icon btn-delete" onclick="RentManager.deleteBill(${bill.id})" title="Xóa">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="bill-grid">
                        <div class="bill-item">
                            <span class="bill-label">Tiền phòng</span>
                            <span class="bill-value">${App.formatCurrency(bill.base)}</span>
                        </div>
                        <div class="bill-item">
                            <span class="bill-label">Điện</span>
                            <span class="bill-value">${App.formatCurrency(bill.elecTotal)}</span>
                            <span class="bill-subtext">${bill.elecUsage} kWh</span>
                        </div>
                        <div class="bill-item">
                            <span class="bill-label">Nước</span>
                            <span class="bill-value">${App.formatCurrency(bill.waterTotal)}</span>
                            <span class="bill-subtext">${bill.waterUsage} m³</span>
                        </div>
                        <div class="bill-item">
                            <span class="bill-label">Dịch vụ</span>
                            <span class="bill-value">${App.formatCurrency(servicesTotal)}</span>
                            ${serviceSubtext ? `<span class="bill-subtext">${serviceSubtext}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    getStatusClass(status) {
        switch (status) {
            case 'PAID': return 'status-paid';
            case 'PENDING': return 'status-pending';
            case 'OVERDUE': return 'status-overdue';
            case 'PARTIALLY_PAID': return 'status-partial';
            default: return '';
        }
    },

    getStatusText(status) {
        switch (status) {
            case 'PAID': return 'Đã thanh toán';
            case 'PENDING': return 'Chờ thanh toán';
            case 'OVERDUE': return 'Quá hạn';
            case 'PARTIALLY_PAID': return 'Thanh toán một phần';
            default: return status;
        }
    }
};
