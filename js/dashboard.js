/**
 * Money Tracker — Dashboard Logic
 */

window.DashboardManager = {


    init() {
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                App.state.currentMonth.setMonth(App.state.currentMonth.getMonth() - 1);
                App.updateMonthDisplay();
                App.updateGlobalStats();
                this.render();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                App.state.currentMonth.setMonth(App.state.currentMonth.getMonth() + 1);
                App.updateMonthDisplay();
                App.updateGlobalStats();
                this.render();
            });
        }
    },

    render() {
        const month = App.state.currentMonth.getMonth();
        const year = App.state.currentMonth.getFullYear();

        const monthTxns = App.state.transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });

        this.renderCharts(monthTxns);
        this.renderTopSpending(monthTxns);
        this.renderRecentTransactions();
    },

    renderCharts(monthTxns) {
        // Get today's date in YYYY-MM-DD format
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        const todayTxns = monthTxns.filter(t => t.date === today && t.type === 'expense');

        // Donut Chart - Breakdown today
        const donut = document.getElementById('donutChart');
        const legend = document.getElementById('donutLegend');

        if (todayTxns.length === 0) {
            donut.innerHTML = '<div class="no-data">Không có chi tiêu hôm nay</div>';
            legend.innerHTML = '';
        } else {
            const totals = {};
            todayTxns.forEach(t => {
                totals[t.categoryId] = (totals[t.categoryId] || 0) + t.amount;
            });

            const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
            const totalAmount = sorted.reduce((sum, item) => sum + item[1], 0);

            // Simple Donut using CSS conic-gradient
            let gradient = 'conic-gradient(';
            let currentPerc = 0;

            legend.innerHTML = sorted.map(([catId, amount], index) => {
                const cat = App.state.categories.find(c => c.id === catId);
                const perc = (amount / totalAmount) * 100;
                const nextPerc = currentPerc + perc;

                gradient += `${cat.color} ${currentPerc}% ${nextPerc}%${index === sorted.length - 1 ? '' : ', '}`;
                currentPerc = nextPerc;

                return `
                    <div class="legend-item">
                        <span class="dot" style="background: ${cat.color}"></span>
                        <span class="label">${cat.name}</span>
                        <span class="value">${Math.round(perc)}%</span>
                    </div>
                `;
            }).join('');

            gradient += ')';
            donut.innerHTML = `
                <div class="donut-svg" style="background: ${gradient}">
                    <div class="donut-inner">
                        <span class="donut-total">${App.formatCurrency(totalAmount)}</span>
                        <span class="donut-label">Hôm nay</span>
                    </div>
                </div>
            `;
        }

        // Bar Chart - Last 7 Days
        this.renderBarChart();
    },

    renderBarChart() {
        const container = document.getElementById('barChart');
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }

        const data = last7Days.map(date => {
            const dayTxns = App.state.transactions.filter(t => t.date === date);
            const income = dayTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const expense = dayTxns.filter(t => (t.type === 'expense' || t.type === 'saving')).reduce((sum, t) => sum + t.amount, 0);
            return { date, income, expense };
        });

        const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1000);

        container.innerHTML = `
            <div class="bar-chart">
                ${data.map(d => `
                    <div class="bar-group">
                        <div class="bars">
                            <div class="bar bar-income" 
                                 style="height: ${(d.income / maxVal) * 100}%" 
                                 data-value="${d.income > 0 ? App.formatCurrency(d.income) : ''}"
                                 title="Thu: ${App.formatCurrency(d.income)}"></div>
                            <div class="bar bar-expense" 
                                 style="height: ${(d.expense / maxVal) * 100}%" 
                                 data-value="${d.expense > 0 ? App.formatCurrency(d.expense) : ''}"
                                 title="Chi: ${App.formatCurrency(d.expense)}"></div>
                        </div>
                        <span class="bar-label">${new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderTopSpending(monthTxns) {
        const container = document.getElementById('topSpending');
        const expenses = monthTxns.filter(t => t.type === 'expense');

        const totals = {};
        expenses.forEach(t => {
            totals[t.categoryId] = (totals[t.categoryId] || 0) + t.amount;
        });

        const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);

        if (sorted.length === 0) {
            container.innerHTML = '<p class="no-data">Không có dữ liệu chi tiêu tháng này</p>';
            return;
        }

        const maxAmount = sorted[0][1];

        container.innerHTML = sorted.map(([catId, amount]) => {
            const cat = App.state.categories.find(c => c.id === catId);
            return `
                <div class="top-item">
                    <div class="top-info">
                        <span class="top-cat">${cat.icon} ${cat.name}</span>
                        <span class="top-val">${App.formatCurrency(amount)}</span>
                    </div>
                    <div class="progress-bg">
                        <div class="progress-fill" style="width: ${(amount / maxAmount) * 100}%; background: ${cat.color}"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderRecentTransactions() {
        const container = document.getElementById('recentTransactions');
        const recent = App.state.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        if (recent.length === 0) {
            container.innerHTML = '<p class="no-data">Chưa có giao dịch nào</p>';
            return;
        }

        container.innerHTML = recent.map(t => {
            const cat = App.state.categories.find(c => c.id === t.categoryId) || { icon: '❓', name: 'Unknown', color: '#666' };
            return `
                <div class="txn-item small">
                    <div class="txn-icon mini" style="background: ${cat.color}20; color: ${cat.color}">${cat.icon}</div>
                    <div class="txn-info">
                        <span class="txn-name">${t.note}</span>
                        <span class="txn-category">${cat.name}</span>
                    </div>
                    <div class="txn-amount ${t.type}" style="font-size: 0.9rem">${t.type === 'expense' ? '-' : '+'}${App.formatCurrency(t.amount)}</div>
                </div>
            `;
        }).join('');
    }
};
