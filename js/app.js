/**
 * Money Tracker — Core Logic & Router
 */

window.App = {
    state: {
        currentView: 'dashboard',
        currentMonth: new Date(),
        transactions: [],
        categories: [],
        stocks: [],
        stockCash: [],
        rent: [],
        templateCache: {},
        rentHistory: [],
        balance: 0
    },

    init() {
        this.loadData();
        this.initEventListeners();
        this.renderSidebarDate();
        this.renderView();
    },

    loadData() {
        const storedTransactions = localStorage.getItem('mt_transactions');
        const storedCategories = localStorage.getItem('mt_categories');
        const storedStocks = localStorage.getItem('mt_stocks');
        
        // Note: rent data is now loaded from backend API in RentManager.init()

        if (storedCategories) {
            this.state.categories = JSON.parse(storedCategories);
        } else {
            this.state.categories = this.getDefaultCategories();
            this.saveCategories();
        }

        if (storedTransactions) {
            this.state.transactions = JSON.parse(storedTransactions);
        }

        if (storedStocks) {
            this.state.stocks = JSON.parse(storedStocks);
        }

        const storedStockCash = localStorage.getItem('mt_stock_cash');
        if (storedStockCash) {
            this.state.stockCash = JSON.parse(storedStockCash);
        }
    },

    saveState() {
        this.saveTransactions();
        this.saveStocks();
    },

    saveStocks() {
        localStorage.setItem('mt_stocks', JSON.stringify(this.state.stocks));
        localStorage.setItem('mt_stock_cash', JSON.stringify(this.state.stockCash));
        if (this.state.currentView === 'stocks' && window.StockManager) StockManager.render();
    },

    saveTransactions() {
        localStorage.setItem('mt_transactions', JSON.stringify(this.state.transactions));
        this.updateGlobalStats();
        
        if (this.state.currentView === 'dashboard' && window.DashboardManager) DashboardManager.render();
        if (this.state.currentView === 'transactions' && window.TransactionManager) TransactionManager.render();
    },

    saveCategories() {
        localStorage.setItem('mt_categories', JSON.stringify(this.state.categories));
        if (this.state.currentView === 'categories' && window.CategoryManager) CategoryManager.render();
    },

    getDefaultCategories() {
        return [
            { id: 'cat_1', name: 'Ăn uống', icon: '🍜', type: 'expense', color: '#ef4444' },
            { id: 'cat_2', name: 'Thuê nhà', icon: '🏠', type: 'expense', color: '#f59e0b' },
            { id: 'cat_3', name: 'Di chuyển', icon: '🚗', type: 'expense', color: '#3b82f6' },
            { id: 'cat_4', name: 'Lương', icon: '💰', type: 'income', color: '#10b981' },
            { id: 'cat_5', name: 'Tiết kiệm', icon: '🏦', type: 'saving', color: '#6366f1' },
            { id: 'cat_6', name: 'Đầu tư', icon: '📈', type: 'expense', color: '#8b5cf6' }
        ];
    },

    initEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                if (view) this.switchView(view);
            });
        });

        // FAB
        const fab = document.getElementById('fabBtn');
        const fabMobile = document.getElementById('fabMobile');
        const openTxnModal = () => TransactionManager.openModal();

        if (fab) fab.addEventListener('click', openTxnModal);
        if (fabMobile) fabMobile.addEventListener('click', openTxnModal);
    },

    switchView(viewId) {
        this.state.currentView = viewId;

        document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-view') === viewId);
        });

        this.renderView();
    },

    async renderView() {
        const mainContent = document.getElementById('mainContent');
        const viewId = this.state.currentView;
        
        const managers = {
            dashboard: window.DashboardManager,
            transactions: window.TransactionManager,
            income: window.IncomeManager,
            reports: window.ReportsManager,
            stocks: window.StockManager,
            rent: window.RentManager,
            categories: window.CategoryManager
        };

        const manager = managers[viewId];
        if (manager) {
            let html = this.state.templateCache[viewId];
            if (!html) {
                try {
                    const response = await fetch(`views/${viewId}.html`);
                    if (!response.ok) throw new Error('Network response was not ok');
                    html = await response.text();
                    this.state.templateCache[viewId] = html;
                } catch (error) {
                    console.error('Error loading template:', error);
                    html = '<div class="empty-state"><h3>Lỗi tải giao diện</h3><p>Vui lòng thử lại sau.</p></div>';
                }
            }

            mainContent.innerHTML = `<section class="view animate-fade-in" id="view${viewId.charAt(0).toUpperCase() + viewId.slice(1)}">${html}</section>`;
            
            if (manager.init) await manager.init();
            if (manager.render) manager.render();
        }

        this.updateMonthDisplay();
        this.updateGlobalStats();
    },

    updateMonthDisplay() {
        const options = { month: 'long', year: 'numeric' };
        const monthStr = this.state.currentMonth.toLocaleDateString('vi-VN', options);
        const el = document.getElementById('currentMonth');
        if (el) el.textContent = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
    },

    renderSidebarDate() {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const dateStr = new Date().toLocaleDateString('vi-VN', options);
        document.getElementById('sidebarDate').textContent = dateStr;
    },

    updateGlobalStats() {
        const month = this.state.currentMonth.getMonth();
        const year = this.state.currentMonth.getFullYear();

        const monthTxns = this.state.transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });

        let income = 0;
        let expense = 0;
        let saving = 0;

        monthTxns.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else if (t.type === 'expense') expense += t.amount;
            else if (t.type === 'saving') saving += t.amount;
        });

        // Overall balance (from all time)
        let totalBalance = 0;
        this.state.transactions.forEach(t => {
            if (t.type === 'income') totalBalance += t.amount;
            else if (t.type === 'expense') totalBalance -= t.amount;
            else if (t.type === 'saving') totalBalance -= t.amount;
        });

        // Add Stock Assets (Cash + Market Value)
        let stockAssets = 0;
        if (this.state.stockCash) {
            this.state.stockCash.forEach(c => {
                if (c.type === 'deposit') stockAssets += c.amount;
                else stockAssets -= c.amount;
            });
        }
        if (this.state.stocks) {
            // Add current market value of stocks
            const currentPrices = JSON.parse(localStorage.getItem('mt_stock_prices') || '{}');
            const tickers = [...new Set(this.state.stocks.map(s => s.ticker))];

            tickers.forEach(ticker => {
                const tickerStocks = this.state.stocks.filter(s => s.ticker === ticker);
                let netQty = 0;
                tickerStocks.forEach(s => {
                    if (s.type === 'buy') netQty += s.quantity;
                    else netQty -= s.quantity;
                });
                
                if (currentPrices[ticker] && netQty > 0) {
                    stockAssets += currentPrices[ticker] * netQty;
                }
            });
        }

        totalBalance += stockAssets;

        const balanceEl = document.getElementById('sidebarBalance');
        if (balanceEl) balanceEl.textContent = this.formatCurrency(totalBalance);
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    },

    formatCurrencyRaw(amount) {
        return new Intl.NumberFormat('vi-VN').format(amount);
    },

    parseCurrency(str) {
        if (!str) return 0;
        return parseInt(str.replace(/\D/g, '')) || 0;
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};