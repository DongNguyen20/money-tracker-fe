/**
 * Money Tracker — Reports Logic
 */

window.ReportsManager = {
    state: {
        activeTab: 'daily',
        selectedYear: new Date().getFullYear(),
        charts: {}
    },

    init() {
        this.initEventListeners();
    },

    initEventListeners() {
        const tabs = document.getElementById('reportTabs');
        if (tabs) {
            tabs.addEventListener('click', (e) => {
                const btn = e.target.closest('.filter-tab');
                if (btn) {
                    document.querySelectorAll('#reportTabs .filter-tab').forEach(t => t.classList.remove('active'));
                    btn.classList.add('active');
                    this.state.activeTab = btn.dataset.tab;
                    this.render();
                }
            });
        }

        const yearSelect = document.getElementById('reportYearSelect');
        if (yearSelect) {
            yearSelect.addEventListener('change', (e) => {
                this.state.selectedYear = parseInt(e.target.value);
                this.render();
            });
        }
    },

    render() {
        // Hide all panes
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        const activePane = document.getElementById(`pane-${this.state.activeTab}`);
        if (activePane) activePane.classList.add('active');

        // Destroy existing charts to prevent memory leaks and hover issues
        Object.values(this.state.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.state.charts = {};

        // Render specific tab
        if (this.state.activeTab === 'daily') this.renderDaily();
        else if (this.state.activeTab === 'yearly') this.renderYearly();
        else if (this.state.activeTab === 'all-years') this.renderAllYears();
    },

    renderDaily() {
        const month = App.state.currentMonth.getMonth();
        const year = App.state.currentMonth.getFullYear();
        const txns = App.state.transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });

        // 1. Pie Chart - Expenses by Category
        const expenseTxns = txns.filter(t => t.type === 'expense');
        const catTotals = {};
        expenseTxns.forEach(t => {
            catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
        });

        const catData = Object.entries(catTotals).map(([id, amount]) => {
            const cat = App.state.categories.find(c => c.id === id);
            return { name: cat ? cat.name : 'Khác', amount, color: cat ? cat.color : '#666' };
        }).sort((a, b) => b.amount - a.amount);

        const ctxDaily = document.getElementById('dailyExpenseChart');
        if (ctxDaily) {
            this.state.charts.dailyExpense = new Chart(ctxDaily, {
                type: 'doughnut',
                data: {
                    labels: catData.map(d => d.name),
                    datasets: [{
                        data: catData.map(d => d.amount),
                        backgroundColor: catData.map(d => d.color),
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20, usePointStyle: true } },
                        tooltip: { callbacks: { label: (context) => ` ${context.label}: ${App.formatCurrency(context.raw)}` } }
                    }
                }
            });
        }

        // 2. Trend Chart - Last 7 Days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }

        const trendData = last7Days.map(date => {
            const dayTxns = App.state.transactions.filter(t => t.date === date);
            return {
                date,
                income: dayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
                expense: dayTxns.filter(t => t.type === 'expense' || t.type === 'saving').reduce((s, t) => s + t.amount, 0)
            };
        });

        const ctxTrend = document.getElementById('dailyTrendChart');
        if (ctxTrend) {
            this.state.charts.dailyTrend = new Chart(ctxTrend, {
                type: 'bar',
                data: {
                    labels: trendData.map(d => new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'short' })),
                    datasets: [
                        { label: 'Thu nhập', data: trendData.map(d => d.income), backgroundColor: '#10b981', borderRadius: 4 },
                        { label: 'Chi tiêu', data: trendData.map(d => d.expense), backgroundColor: '#ef4444', borderRadius: 4 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', callback: (v) => v >= 1000000 ? (v / 1000000) + 'M' : v } },
                        x: { grid: { display: false }, ticks: { color: '#64748b' } }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (context) => ` ${context.dataset.label}: ${App.formatCurrency(context.raw)}` } }
                    }
                }
            });
        }

        // 3. Table
        const tableBody = document.getElementById('dailyTableBody');
        const recentTxns = [...App.state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
        tableBody.innerHTML = recentTxns.map(t => {
            const cat = App.state.categories.find(c => c.id === t.categoryId);
            return `
                <tr>
                    <td>${new Date(t.date).toLocaleDateString('vi-VN')}</td>
                    <td>${cat ? cat.icon + ' ' + cat.name : 'Khác'}</td>
                    <td>${t.note}</td>
                    <td><span class="stock-type ${t.type}">${t.type === 'income' ? 'Thu' : (t.type === 'expense' ? 'Chi' : 'Tích luỹ')}</span></td>
                    <td class="text-right ${t.type}">${t.type === 'income' ? '+' : '-'}${App.formatCurrency(t.amount)}</td>
                </tr>
            `;
        }).join('');
    },

    renderYearly() {
        const year = this.state.selectedYear;
        
        // Update year selector
        const yearSelect = document.getElementById('reportYearSelect');
        const availableYears = [...new Set(App.state.transactions.map(t => new Date(t.date).getFullYear()))];
        if (!availableYears.includes(new Date().getFullYear())) availableYears.push(new Date().getFullYear());
        availableYears.sort((a, b) => b - a);

        yearSelect.innerHTML = availableYears.map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>Năm ${y}</option>`).join('');

        const monthlyData = [];
        for (let m = 0; m < 12; m++) {
            const monthTxns = App.state.transactions.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === m && d.getFullYear() === year;
            });
            const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            const saving = monthTxns.filter(t => t.type === 'saving').reduce((s, t) => s + t.amount, 0);
            monthlyData.push({ month: m + 1, income, expense, saving });
        }

        // 1. Line Chart - Monthly Trend
        const ctxYearly = document.getElementById('yearlyTrendChart');
        if (ctxYearly) {
            this.state.charts.yearlyTrend = new Chart(ctxYearly, {
                type: 'line',
                data: {
                    labels: monthlyData.map(d => `Th ${d.month}`),
                    datasets: [
                        { label: 'Thu nhập', data: monthlyData.map(d => d.income), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 },
                        { label: 'Chi tiêu', data: monthlyData.map(d => d.expense), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                        x: { grid: { display: false }, ticks: { color: '#64748b' } }
                    },
                    plugins: {
                        legend: { position: 'top', labels: { color: '#94a3b8' } }
                    }
                }
            });
        }

        // 2. Detailed Category Trend (Multi-line chart)
        const yearlyAllTxns = App.state.transactions.filter(t => new Date(t.date).getFullYear() === year);
        
        // Find categories that have at least one transaction this year
        const activeCatIds = [...new Set(yearlyAllTxns.map(t => t.categoryId))];
        const activeCategories = App.state.categories.filter(c => activeCatIds.includes(c.id));

        const datasets = activeCategories.map(cat => {
            const monthlyValues = [];
            for (let m = 0; m < 12; m++) {
                const total = yearlyAllTxns
                    .filter(t => t.categoryId === cat.id && new Date(t.date).getMonth() === m)
                    .reduce((sum, t) => sum + t.amount, 0);
                monthlyValues.push(total);
            }

            return {
                label: cat.icon + ' ' + cat.name,
                data: monthlyValues,
                borderColor: cat.color,
                backgroundColor: cat.color + '20',
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 3,
                hidden: cat.type === 'income' // Default hide income lines to reduce clutter
            };
        });

        const ctxDetail = document.getElementById('yearlyCategoryDetailChart');
        if (ctxDetail) {
            this.state.charts.yearlyCategoryDetail = new Chart(ctxDetail, {
                type: 'line',
                data: {
                    labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            grid: { color: 'rgba(255,255,255,0.05)' }, 
                            ticks: { 
                                color: '#64748b',
                                callback: (v) => v >= 1000000 ? (v / 1000000) + 'M' : (v >= 1000 ? (v / 1000) + 'K' : v)
                            } 
                        },
                        x: { grid: { display: false }, ticks: { color: '#64748b' } }
                    },
                    plugins: {
                        legend: { 
                            position: 'bottom', 
                            labels: { 
                                color: '#94a3b8', 
                                boxWidth: 12, 
                                padding: 15,
                                font: { size: 11 }
                            } 
                        },
                        tooltip: { 
                            mode: 'index',
                            intersect: false,
                            callbacks: { label: (context) => ` ${context.dataset.label}: ${App.formatCurrency(context.raw)}` } 
                        }
                    }
                }
            });
        }

        // 3. Yearly Expense Pie
        const yearlyExpenseTxns = App.state.transactions.filter(t => new Date(t.date).getFullYear() === year && t.type === 'expense');
        const catTotals = {};
        yearlyExpenseTxns.forEach(t => {
            catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
        });
        const catData = Object.entries(catTotals).map(([id, amount]) => {
            const cat = App.state.categories.find(c => c.id === id);
            return { name: cat ? cat.name : 'Khác', amount, color: cat ? cat.color : '#666' };
        }).sort((a, b) => b.amount - a.amount);

        const ctxYearlyPie = document.getElementById('yearlyExpenseChart');
        if (ctxYearlyPie) {
            this.state.charts.yearlyExpense = new Chart(ctxYearlyPie, {
                type: 'pie',
                data: {
                    labels: catData.map(d => d.name),
                    datasets: [{
                        data: catData.map(d => d.amount),
                        backgroundColor: catData.map(d => d.color),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#94a3b8', usePointStyle: true } }
                    }
                }
            });
        }

        // 4. Yearly Table
        const tableBody = document.getElementById('yearlyTableBody');
        tableBody.innerHTML = monthlyData.map(d => `
            <tr>
                <td>Tháng ${d.month}</td>
                <td class="text-right income">${App.formatCurrency(d.income)}</td>
                <td class="text-right expense">${App.formatCurrency(d.expense)}</td>
                <td class="text-right saving">${App.formatCurrency(d.saving)}</td>
            </tr>
        `).join('');
    },

    renderAllYears() {
        const yearDataMap = {};
        App.state.transactions.forEach(t => {
            const year = new Date(t.date).getFullYear();
            if (!yearDataMap[year]) yearDataMap[year] = { income: 0, expense: 0, saving: 0 };
            if (t.type === 'income') yearDataMap[year].income += t.amount;
            else if (t.type === 'expense') yearDataMap[year].expense += t.amount;
            else if (t.type === 'saving') yearDataMap[year].saving += t.amount;
        });

        const sortedYears = Object.keys(yearDataMap).sort((a, b) => a - b);
        const yearsData = sortedYears.map(y => ({ year: y, ...yearDataMap[y] }));

        // 1. Multi-Year Bar Chart
        const ctxAllYears = document.getElementById('allYearsTrendChart');
        if (ctxAllYears) {
            this.state.charts.allYearsTrend = new Chart(ctxAllYears, {
                type: 'bar',
                data: {
                    labels: yearsData.map(d => d.year),
                    datasets: [
                        { label: 'Thu nhập', data: yearsData.map(d => d.income), backgroundColor: '#10b981' },
                        { label: 'Chi tiêu', data: yearsData.map(d => d.expense), backgroundColor: '#ef4444' },
                        { label: 'Tích luỹ', data: yearsData.map(d => d.saving), backgroundColor: '#6366f1' }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                        x: { ticks: { color: '#64748b' } }
                    }
                }
            });
        }

        // 2. All Years Table
        const tableBody = document.getElementById('allYearsTableBody');
        tableBody.innerHTML = yearsData.reverse().map(d => `
            <tr>
                <td>${d.year}</td>
                <td class="text-right income">${App.formatCurrency(d.income)}</td>
                <td class="text-right expense">${App.formatCurrency(d.expense)}</td>
                <td class="text-right saving">${App.formatCurrency(d.saving)}</td>
            </tr>
        `).join('');
    }
};
