/**
 * Money Tracker — Stock Management
 */

window.StockManager = {
    state: {
        editingId: null,
        editingCashId: null,
        currentView: 'portfolio', // portfolio or history
        currentPrices: JSON.parse(localStorage.getItem('mt_stock_prices') || '{}'),
        chart: null
    },


    init() {
        if (!App.state.stocks) {
            App.state.stocks = [];
            App.saveState();
        }

        // Initialize cash transactions if not exists
        if (!App.state.stockCash) {
            App.state.stockCash = [];
            App.saveState();
        }

        this.bindEvents();
        this.render();
    },

    bindEvents() {
        const modal = document.getElementById('stockModal');
        const form = document.getElementById('stockForm');

        document.getElementById('btnAddStock').addEventListener('click', () => this.openModal());
        document.getElementById('stockModalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('stockCancel').addEventListener('click', () => this.closeModal());

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveStock();
        });

        // Type selector
        const typeBtns = document.querySelectorAll('#stockTypeSelector .type-btn');
        typeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                typeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // View Tabs
        document.getElementById('stockViewTabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.filter-tab');
            if (tab) {
                document.querySelectorAll('#stockViewTabs .filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.state.currentView = tab.dataset.view;
                this.render();
            }
        });

        // Amount formatting
        const priceInput = document.getElementById('stockPrice');
        priceInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value) {
                e.target.value = new Intl.NumberFormat('vi-VN').format(value);
            } else {
                e.target.value = '';
            }
        });

        // Cash Modal
        document.getElementById('btnStockCash').addEventListener('click', () => this.openCashModal());
        document.getElementById('stockCashClose').addEventListener('click', () => this.closeCashModal());

        document.getElementById('stockCashType').addEventListener('click', (e) => {
            const btn = e.target.closest('.type-btn');
            if (btn) {
                document.querySelectorAll('#stockCashType .type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });

        document.getElementById('stockCashForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCash();
        });

        const cashAmount = document.getElementById('stockCashAmount');
        cashAmount.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            e.target.value = value ? new Intl.NumberFormat('vi-VN').format(value) : '';
        });
    },

    openModal(id = null) {
        const modal = document.getElementById('stockModal');
        const title = document.getElementById('stockModalTitle');
        const form = document.getElementById('stockForm');

        form.reset();
        this.state.editingId = id;

        // Default type
        const typeBtns = document.querySelectorAll('#stockTypeSelector .type-btn');
        typeBtns.forEach(b => b.classList.remove('active'));
        typeBtns[0].classList.add('active');

        if (id) {
            const stock = App.state.stocks.find(s => s.id === id);
            title.textContent = 'Chỉnh sửa lệnh';
            document.getElementById('stockTicker').value = stock.ticker;
            document.getElementById('stockQuantity').value = stock.quantity;
            document.getElementById('stockPrice').value = new Intl.NumberFormat('vi-VN').format(stock.price);
            document.getElementById('stockDate').value = stock.date;

            typeBtns.forEach(btn => {
                if (btn.dataset.type === stock.type) btn.classList.add('active');
                else btn.classList.remove('active');
            });
        } else {
            title.textContent = 'Thêm lệnh chứng khoán';

            // Get today's date in YYYY-MM-DD format
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;

            document.getElementById('stockDate').value = today;
        }

        modal.classList.add('active');
    },

    closeModal() {
        document.getElementById('stockModal').classList.remove('active');
    },

    saveStock() {
        const ticker = document.getElementById('stockTicker').value.toUpperCase();
        const type = document.querySelector('#stockTypeSelector .type-btn.active').dataset.type;
        const quantity = parseInt(document.getElementById('stockQuantity').value);
        const priceStr = document.getElementById('stockPrice').value;
        const price = parseFloat(priceStr.replace(/\./g, ''));
        let date = document.getElementById('stockDate').value;

        if (isNaN(price) || price <= 0 || isNaN(quantity) || quantity <= 0) {
            App.showToast('Vui lòng nhập số liệu hợp lệ', 'error');
            return;
        }

        // If date is empty, use today's date
        if (!date) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            date = `${year}-${month}-${day}`;
        }

        const stockData = {
            id: this.state.editingId || Date.now().toString(),
            ticker,
            type,
            quantity,
            price,
            date,
            total: quantity * price
        };

        if (this.state.editingId) {
            const index = App.state.stocks.findIndex(s => s.id === this.state.editingId);
            App.state.stocks[index] = stockData;
            App.showToast('Đã cập nhật lệnh');
        } else {
            App.state.stocks.push(stockData);
            App.showToast('Đã thêm lệnh mới');
        }

        App.saveState();
        this.closeModal();
        this.render();
        DashboardManager.render(); // Update dashboard if needed
    },

    deleteStock(id) {
        if (confirm('Bạn có chắc muốn xoá lệnh này?')) {
            App.state.stocks = App.state.stocks.filter(s => s.id !== id);
            App.saveState();
            App.showToast('Đã xoá lệnh');
            this.render();
            DashboardManager.render();
        }
    },

    savePrices() {
        localStorage.setItem('mt_stock_prices', JSON.stringify(this.state.currentPrices));
    },

    updateCurrentPrice(ticker, price) {
        this.state.currentPrices[ticker] = parseFloat(price.replace(/\./g, '')) || 0;
        this.savePrices();
        this.render();
    },

    openCashModal(id = null) {
        const modal = document.getElementById('stockCashModal');
        const form = document.getElementById('stockCashForm');
        const title = modal.querySelector('h2');

        form.reset();
        this.state.editingCashId = id;

        if (id) {
            const cash = App.state.stockCash.find(c => c.id === id);
            title.textContent = 'Chỉnh sửa giao dịch';

            // Set type
            const typeBtns = document.querySelectorAll('#stockCashType .type-btn');
            typeBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === cash.type);
            });

            document.getElementById('stockCashAmount').value = App.formatCurrencyRaw(cash.amount);
            document.getElementById('stockCashDate').value = cash.date;
        } else {
            title.textContent = 'Nộp/Rút tiền chứng khoán';

            // Get today's date in YYYY-MM-DD format
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;

            document.getElementById('stockCashDate').value = today;
        }

        modal.classList.add('active');
    },

    closeCashModal() {
        document.getElementById('stockCashModal').classList.remove('active');
    },

    saveCash() {
        const type = document.querySelector('#stockCashType .type-btn.active').dataset.type;
        const amountStr = document.getElementById('stockCashAmount').value;
        const amount = parseFloat(amountStr.replace(/\./g, ''));
        let date = document.getElementById('stockCashDate').value;

        if (isNaN(amount) || amount <= 0) {
            App.showToast('Vui lòng nhập số tiền hợp lệ', 'error');
            return;
        }

        // If date is empty, use today's date
        if (!date) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            date = `${year}-${month}-${day}`;
        }

        const cashData = {
            id: this.state.editingCashId || Date.now().toString(),
            type,
            amount,
            date
        };

        if (this.state.editingCashId) {
            const index = App.state.stockCash.findIndex(c => c.id === this.state.editingCashId);
            App.state.stockCash[index] = cashData;
            App.showToast('Đã cập nhật giao dịch');
        } else {
            App.state.stockCash.push(cashData);
            App.showToast('Đã ghi nhận giao dịch tiền mặt');
        }

        App.saveState();
        this.closeCashModal();
        this.render();
    },

    render() {
        const historyContainer = document.getElementById('stockHistoryView');
        const portfolioContainer = document.getElementById('stockPortfolioView');
        const tradesContainer = document.getElementById('stockTradesView');
        const list = document.getElementById('stockList');

        const stocks = App.state.stocks || [];
        const cashTransactions = App.state.stockCash || [];

        // Toggle Views
        if (this.state.currentView === 'history') {
            historyContainer.classList.remove('hidden');
            portfolioContainer.classList.add('hidden');
            tradesContainer.classList.add('hidden');
        } else if (this.state.currentView === 'trades') {
            historyContainer.classList.add('hidden');
            portfolioContainer.classList.add('hidden');
            tradesContainer.classList.remove('hidden');
        } else {
            historyContainer.classList.add('hidden');
            portfolioContainer.classList.remove('hidden');
            tradesContainer.classList.add('hidden');
        }

        // Calculate Cash Balance
        let cashBalance = 0;
        cashTransactions.forEach(c => {
            if (c.type === 'deposit') cashBalance += c.amount;
            else cashBalance -= c.amount;
        });

        // Subtract/Add from buy/sell orders
        stocks.forEach(s => {
            if (s.type === 'buy') cashBalance -= s.total;
            else cashBalance += s.total;
        });

        // Calculate Portfolio Data & Cycles
        const portfolio = {};
        const completedTrades = [];
        const tickers = [...new Set(stocks.map(s => s.ticker))];

        let totalMarketValue = 0;
        let totalRealizedProfit = 0;

        tickers.forEach(ticker => {
            const tickerStocks = stocks.filter(s => s.ticker === ticker).sort((a, b) => new Date(a.date) - new Date(b.date));
            let netQty = 0;
            let totalCost = 0;
            let realizedProfit = 0;

            // For cycle detection
            let currentCycleBuys = [];
            let currentCycleTotalCost = 0;
            let currentCycleNetQty = 0;

            tickerStocks.forEach(s => {
                if (s.type === 'buy') {
                    netQty += s.quantity;
                    totalCost += s.total;

                    currentCycleNetQty += s.quantity;
                    currentCycleTotalCost += s.total;
                } else {
                    if (netQty > 0) {
                        const avgCost = totalCost / netQty;
                        const profit = (s.price - avgCost) * s.quantity;
                        realizedProfit += profit;
                        totalCost -= (avgCost * s.quantity);
                        netQty -= s.quantity;

                        // Cycle detection
                        currentCycleNetQty -= s.quantity;
                        if (currentCycleNetQty <= 0) {
                            // Position fully closed
                            completedTrades.push({
                                ticker,
                                profit: realizedProfit,
                                date: s.date
                            });
                            // Reset for next cycle
                            currentCycleNetQty = 0;
                        }
                    }
                }
            });

            const currentPrice = this.state.currentPrices[ticker] || 0;
            const marketValue = netQty * currentPrice;
            const unrealizedProfit = netQty > 0 ? (marketValue - totalCost) : 0;

            if (netQty > 0) {
                portfolio[ticker] = {
                    netQty,
                    avgPrice: netQty > 0 ? totalCost / netQty : 0,
                    totalCost,
                    realizedProfit,
                    currentPrice,
                    marketValue,
                    unrealizedProfit
                };
                totalMarketValue += marketValue;
            }
            totalRealizedProfit += realizedProfit;
        });

        // Update Summary Stats
        document.getElementById('stockCashBalance').textContent = App.formatCurrency(cashBalance);
        document.getElementById('stockMarketValue').textContent = App.formatCurrency(totalMarketValue);
        document.getElementById('stockTotalAssets').textContent = App.formatCurrency(cashBalance + totalMarketValue);
        document.getElementById('stockRealizedTotal').textContent = App.formatCurrency(totalRealizedProfit);

        // Render Charts if in portfolio view
        if (this.state.currentView === 'portfolio') {
            this.renderCharts(portfolio);
        }

        // Render Portfolio View
        const activeTickers = Object.keys(portfolio);
        if (activeTickers.length === 0) {
            portfolioContainer.innerHTML = '<div class="no-data">Chưa có cổ phiếu nào trong danh mục.</div>';
        } else {
            portfolioContainer.innerHTML = `
                <div class="portfolio-grid">
                    ${activeTickers.map(ticker => {
                const data = portfolio[ticker];
                const profitClass = data.unrealizedProfit >= 0 ? 'income' : 'expense';
                return `
                            <div class="portfolio-card">
                                <div class="portfolio-card-header">
                                    <div style="display: flex; flex-direction: column;">
                                        <div class="stock-ticker-badge">${ticker}</div>
                                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Đang nắm giữ</div>
                                    </div>
                                    <div class="portfolio-qty" style="font-size: 1.4rem; font-weight: 800; color: var(--accent-primary);">${data.netQty} <span style="font-size: 0.8rem; font-weight: 500;">CP</span></div>
                                </div>
                                <div class="portfolio-stats-grid">
                                    <div class="p-stat">
                                        <span class="p-label">Giá vốn</span>
                                        <span class="p-value">${App.formatCurrency(data.avgPrice)}</span>
                                    </div>
                                    <div class="p-stat">
                                        <span class="p-label">Giá hiện tại</span>
                                        <input type="text" class="p-input" value="${App.formatCurrencyRaw(data.currentPrice)}" 
                                            onchange="StockManager.updateCurrentPrice('${ticker}', this.value)" placeholder="Nhập giá...">
                                    </div>
                                    <div class="p-stat">
                                        <span class="p-label">Lãi/Lỗ tạm tính</span>
                                        <span class="p-value ${profitClass}">${data.unrealizedProfit >= 0 ? '+' : ''}${App.formatCurrency(data.unrealizedProfit)}</span>
                                    </div>
                                    <div class="p-stat">
                                        <span class="p-label">Thị giá</span>
                                        <span class="p-value">${App.formatCurrency(data.marketValue)}</span>
                                    </div>
                                </div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }

        // Render Trades View (Cycles)
        if (completedTrades.length === 0) {
            tradesContainer.innerHTML = '<div class="no-data">Chưa có lịch sử chốt lãi/lỗ.</div>';
        } else {
            completedTrades.sort((a, b) => new Date(b.date) - new Date(a.date));
            tradesContainer.innerHTML = completedTrades.map(t => `
                <div class="trade-item">
                    <div class="trade-info">
                        <span class="trade-ticker">${t.ticker}</span>
                        <span class="trade-meta">Ngày chốt: ${new Date(t.date).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div class="trade-profit ${t.profit >= 0 ? 'income' : 'expense'}">
                        ${t.profit >= 0 ? '+' : ''}${App.formatCurrency(t.profit)}
                    </div>
                </div>
            `).join('');
        }

        // Render History View
        if (stocks.length === 0 && cashTransactions.length === 0) {
            list.innerHTML = '<div class="no-data">Chưa có giao dịch nào.</div>';
        } else {
            const allHistory = [
                ...stocks.map(s => ({ ...s, category: 'order' })),
                ...cashTransactions.map(c => ({ ...c, category: 'cash', ticker: 'CASH', total: c.amount }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            list.innerHTML = allHistory.map(s => `
                <div class="stock-item">
                    <div class="stock-ticker-badge" style="${s.category === 'cash' ? 'background: var(--accent-income)20; color: var(--accent-income)' : ''}">${s.ticker}</div>
                    <div class="stock-item-info">
                        <div class="stock-item-main">
                            <span class="stock-type ${s.type}">${s.type === 'buy' ? 'Mua' : s.type === 'sell' ? 'Bán' : s.type === 'deposit' ? 'Nộp tiền' : 'Rút tiền'}</span>
                            <span>${s.category === 'order' ? s.quantity + ' cổ phiếu' : App.formatCurrency(s.amount)}</span>
                        </div>
                        <div class="stock-details">
                            ${s.category === 'order' ? 'Giá: ' + App.formatCurrency(s.price) + ' | ' : ''}Ngày: ${new Date(s.date).toLocaleDateString('vi-VN')}
                        </div>
                    </div>
                    <div class="stock-item-amount">
                        <div class="stock-total ${s.type === 'buy' || s.type === 'withdraw' ? 'expense' : 'income'}">
                            ${s.type === 'buy' || s.type === 'withdraw' ? '-' : '+'}${App.formatCurrency(s.total)}
                        </div>
                        <div class="txn-actions" style="margin-top: 8px">
                            <button class="btn-icon" onclick="${s.category === 'order' ? 'StockManager.openModal' : 'StockManager.openCashModal'}('${s.id}')" title="Sửa">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn-icon btn-delete" onclick="${s.category === 'order' ? 'StockManager.deleteStock' : 'StockManager.deleteCash'}('${s.id}')" title="Xoá">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    },

    deleteCash(id) {
        if (confirm('Bạn có chắc muốn xoá giao dịch tiền mặt này?')) {
            App.state.stockCash = App.state.stockCash.filter(c => c.id !== id);
            App.saveState();
            App.showToast('Đã xoá giao dịch tiền mặt');
            this.render();
        }
    },

    renderCharts(portfolio) {
        const tickers = Object.keys(portfolio);
        const chartSection = document.getElementById('stockChartSection');
        if (!chartSection) return;

        if (tickers.length === 0) {
            chartSection.style.display = 'none';
            return;
        }

        chartSection.style.display = 'block';
        this.renderProfitChart(portfolio, tickers);
        this.renderAllocationChart(portfolio, tickers);
    },

    renderProfitChart(portfolio, tickers) {
        const ctx = document.getElementById('stockProfitChart');
        if (!ctx) return;

        const data = tickers.map(t => portfolio[t].unrealizedProfit);
        const colors = data.map(v => v >= 0 ? '#10b981' : '#ef4444');

        if (this.state.chart) this.state.chart.destroy();

        this.state.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: tickers,
                datasets: [{
                    label: 'Lãi/Lỗ tạm tính',
                    data: data,
                    backgroundColor: colors,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => ` Lãi/Lỗ: ${App.formatCurrency(context.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { size: 10 }, callback: v => v.toLocaleString('vi-VN') }
                    },
                    x: { grid: { display: false }, ticks: { color: 'rgba(255, 255, 255, 0.7)', font: { weight: 'bold' } } }
                }
            }
        });
    },

    renderAllocationChart(portfolio, tickers) {
        const ctx = document.getElementById('stockAllocationChart');
        if (!ctx) return;

        const data = tickers.map(t => portfolio[t].marketValue);
        const palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

        if (this.state.allocationChart) this.state.allocationChart.destroy();

        this.state.allocationChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: tickers,
                datasets: [{
                    data: data,
                    backgroundColor: palette,
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: 'rgba(255, 255, 255, 0.7)', font: { size: 11 }, usePointStyle: true, padding: 15 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return ` ${context.label}: ${App.formatCurrency(context.raw)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
};
