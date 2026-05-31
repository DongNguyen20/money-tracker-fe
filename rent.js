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


    init() {
        this.loadSettings();
        if (!App.state.rentHistory) {
            App.state.rentHistory = [];
        }

        this.bindEvents();
        this.updateYearFilter();
        this.render();
    },

    updateYearFilter() {
        const select = document.getElementById('rentYearFilter');
        const history = App.state.rentHistory || [];
        const years = new Set(history.map(b => b.month.split('-')[0]));
        years.add(new Date().getFullYear().toString());

        const sortedYears = Array.from(years).sort((a, b) => b - a);
        select.innerHTML = sortedYears.map(y => `<option value="${y}" ${y == this.state.currentYear ? 'selected' : ''}>Năm ${y}</option>`).join('');
    },

    loadSettings() {
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

    saveSettings() {
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

    updateSettings() {
        this.state.settings = {
            defaultBase: App.parseCurrency(document.getElementById('defaultBase').value),
            priceElec: App.parseCurrency(document.getElementById('priceElec').value),
            priceWater: App.parseCurrency(document.getElementById('priceWater').value),
            defaultWifi: App.parseCurrency(document.getElementById('defaultWifi').value),
            defaultGarbage: App.parseCurrency(document.getElementById('defaultGarbage').value)
        };
        this.saveSettings();
        this.closeSettings();
        App.showToast('Đã cập nhật cấu hình');
    },

    saveBill() {
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
            id: this.state.editingId || App.generateId(),
            month,
            base,
            wifi,
            garbage,
            other,
            elecUsage,
            waterUsage,
            elecPrice: this.state.settings.priceElec,
            waterPrice: this.state.settings.priceWater,
            elecTotal,
            waterTotal,
            total
        };

        if (this.state.editingId) {
            const index = App.state.rentHistory.findIndex(b => b.id === this.state.editingId);
            App.state.rentHistory[index] = billData;
        } else {
            App.state.rentHistory.push(billData);
        }

        App.saveState();
        this.closeModal();
        this.updateYearFilter();
        this.render();
        App.showToast('Đã lưu hoá đơn');
    },

    deleteBill(id) {
        if (confirm('Bạn có chắc muốn xoá hoá đơn này?')) {
            App.state.rentHistory = App.state.rentHistory.filter(b => b.id !== id);
            App.saveState();
            this.updateYearFilter();
            this.render();
            App.showToast('Đã xoá hoá đơn');
        }
    },

    render() {
        const container = document.getElementById('rentList');
        const summary = document.getElementById('rentYearSummary');
        const history = App.state.rentHistory || [];

        // Filter by year
        const filtered = history.filter(b => b.month.startsWith(this.state.currentYear));

        // Calculate year total
        const yearTotal = filtered.reduce((acc, curr) => acc + curr.total, 0);
        summary.innerHTML = `
            <div class="summary-year-label">Tổng tiền nhà năm ${this.state.currentYear}</div>
            <div class="summary-year-value">${App.formatCurrency(yearTotal)}</div>
        `;

        if (filtered.length === 0) {
            container.innerHTML = '<div class="no-data">Không có dữ liệu hoá đơn cho năm này.</div>';
            return;
        }

        // Sort by month
        if (this.state.sortOrder === 'asc') {
            filtered.sort((a, b) => a.month.localeCompare(b.month));
        } else {
            filtered.sort((a, b) => b.month.localeCompare(a.month));
        }

        container.innerHTML = filtered.map(b => `
            <div class="rent-bill-card">
                <div class="bill-header" style="margin-bottom: 12px; padding-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="bill-month" style="font-size: 1.1rem;">Tháng ${b.month.split('-')[1]}/${b.month.split('-')[0]}</div>
                        <div class="bill-total" style="font-size: 1.2rem;">${App.formatCurrency(b.total)}</div>
                    </div>
                    <div class="txn-actions">
                        <button class="btn-icon" onclick="RentManager.openModal('${b.id}')" title="Sửa">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn-icon btn-delete" onclick="RentManager.deleteBill('${b.id}')" title="Xoá">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
                <div class="bill-grid" style="gap: 10px;">
                    <div class="bill-item">
                        <span class="bill-label">Tiền phòng</span>
                        <span class="bill-value" style="font-size: 0.9rem;">${App.formatCurrency(b.base)}</span>
                    </div>
                    <div class="bill-item">
                        <span class="bill-label">Điện</span>
                        <span class="bill-value" style="font-size: 0.9rem;">${App.formatCurrency(b.elecTotal)}</span>
                        <span class="bill-subtext">${b.elecUsage} kWh</span>
                    </div>
                    <div class="bill-item">
                        <span class="bill-label">Nước</span>
                        <span class="bill-value" style="font-size: 0.9rem;">${App.formatCurrency(b.waterTotal)}</span>
                        <span class="bill-subtext">${b.waterUsage} m³</span>
                    </div>
                    <div class="bill-item">
                        <span class="bill-label">Dịch vụ</span>
                        <span class="bill-value" style="font-size: 0.9rem;">${App.formatCurrency(b.wifi + b.garbage + (b.other || 0))}</span>
                        <div class="bill-subtext">Wifi: ${App.formatCurrency(b.wifi)}; Rác: ${App.formatCurrency(b.garbage)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }
};
