// ============================================================
// MotoTrack — Business Overview (admin dashboard)
// Stats computation, the three Chart.js charts, metric tiles,
// and the mechanic/consumption tables.
// ============================================================

// One shared look for every chart: app font, muted ink, dark rounded
// tooltips, and dot-style legends instead of Chart.js's default boxes.
if (window.Chart) {
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#6b7280';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17,24,39,0.92)';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.titleFont = { weight: '700', size: 12 };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.legend.labels.boxHeight = 8;
    Chart.defaults.plugins.legend.labels.padding = 14;
}

// Fixed hue order, validated for adjacent colorblind-safe separation. Each
// slot belongs to one brand (in MOTO_BRANDS order: Honda, Yamaha, Suzuki,
// Kawasaki, Rusi), so a brand keeps its color no matter which brands appear.
// "Others" always gets neutral gray.
const BRAND_CHART_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7'];
const OTHERS_CHART_COLOR = '#6b7280';

// Best-effort brand extraction from the free-text model field (e.g. "Yamaha NMAX" -> "Yamaha").
// There's no dedicated brand column yet, so this assumes the brand is the first word.
function extractBrand(motoModel) {
    const first = (motoModel || '').trim().split(/\s+/)[0];
    if (!first) return 'Unknown';
    // Normalize casing so "honda", "HONDA" and "Honda" count as one brand
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function computeOverviewStats() {
    const todayStr = toISODate();
    const currentMonthStr = todayStr.substring(0, 7);
    const currentYearStr = todayStr.substring(0, 4);

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStr = toISODate(lastWeek);

    const stats = {
        totalSales: 0, dailySales: 0, weeklySales: 0, monthlySales: 0, yearlySales: 0,
        totalExpenses: 0,
        salesByDate: {}, expByDate: {}, revenueByMonth: {},
        mechanicStats: {}, oilSealUsage: {}, brandStats: {},
        totalReleased: 0, totalBackjobs: 0, backjobRate: 0,
    };

    // Brand distribution counts every unit in the shop (any stage), so a new
    // intake shows on the chart immediately. Brands outside MOTO_BRANDS are
    // grouped under "Others", matching the intake form's dropdown. Billing
    // stats below still count released (completed) jobs only.
    dbJobs.forEach(job => {
        const brand = extractBrand(job.moto_model);
        const key = MOTO_BRANDS.includes(brand) ? brand : 'Others';
        stats.brandStats[key] = (stats.brandStats[key] || 0) + 1;
    });

    dbJobs.filter(j => j.stage === 'Release').forEach(job => {
        stats.totalReleased += 1;
        if (job.is_warranty_claim) stats.totalBackjobs += 1;

        if (job.specs && job.specs.totalBill !== undefined) {
            const bill = Number(job.specs.totalBill);
            stats.totalSales += bill;
            if (job.date_in === todayStr) stats.dailySales += bill;
            if (job.date_in >= lastWeekStr && job.date_in <= todayStr) stats.weeklySales += bill;
            if (job.date_in && job.date_in.startsWith(currentMonthStr)) stats.monthlySales += bill;
            if (job.date_in && job.date_in.startsWith(currentYearStr)) stats.yearlySales += bill;

            stats.salesByDate[job.date_in] = (stats.salesByDate[job.date_in] || 0) + bill;

            if (job.date_in) {
                const monthKey = job.date_in.substring(0, 7);
                stats.revenueByMonth[monthKey] = (stats.revenueByMonth[monthKey] || 0) + bill;
            }

            // Track oil seal consumption ("Oil Seal 41x54x11 (2 - Both)" -> name + qty)
            if (job.specs.oilSeal && job.specs.oilSeal !== 'None') {
                const sealName = job.specs.oilSeal.split(' (')[0];
                const qtyMatch = job.specs.oilSeal.match(/\((\d+)/);
                const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
                stats.oilSealUsage[sealName] = (stats.oilSealUsage[sealName] || 0) + qty;
            }
        }

        if (job.mechanic_name) {
            const mech = job.mechanic_name;
            if (!stats.mechanicStats[mech]) stats.mechanicStats[mech] = { total: 0, backjobs: 0 };
            stats.mechanicStats[mech].total += 1;
            if (job.is_warranty_claim) stats.mechanicStats[mech].backjobs += 1;
        }
    });

    stats.backjobRate = stats.totalReleased > 0 ? (stats.totalBackjobs / stats.totalReleased) * 100 : 0;

    dbExpenses.forEach(exp => {
        stats.totalExpenses += exp.amount;
        stats.expByDate[exp.date] = (stats.expByDate[exp.date] || 0) + exp.amount;
    });

    return stats;
}

function buildMechanicTable(mechanicStats) {
    let html = `
        <div style="flex: 1; min-width: 300px;">
            <h3 style="margin-top: 1rem; margin-bottom: 1rem; color: var(--text-primary); font-size: 1.15rem;">Mechanic Performance</h3>
            <div class="table-container"><table class="data-table">
            <thead><tr><th>Mechanic Name</th><th>Completed</th><th>Backjobs</th><th>Rate</th></tr></thead><tbody>
    `;

    const sorted = Object.keys(mechanicStats).sort((a, b) => mechanicStats[b].backjobs - mechanicStats[a].backjobs);

    if (sorted.length === 0) {
        html += `<tr><td colspan="4" style="text-align:center; padding: 1.5rem; color: #777;">No data yet.</td></tr>`;
    } else {
        sorted.forEach(mech => {
            const stats = mechanicStats[mech];
            const rate = stats.total > 0 ? ((stats.backjobs / stats.total) * 100).toFixed(1) : 0;
            const alertStyle = rate > 10
                ? 'color: var(--primary); font-weight: bold; background: #fef2f2; padding: 2px 6px; border-radius: 4px;'
                : 'color: #15803d; font-weight: bold;';
            html += `<tr>
                <td style="color: var(--text-primary); font-weight: 700;">${esc(mech)}</td>
                <td>${stats.total}</td>
                <td style="color: ${stats.backjobs > 0 ? 'var(--primary)' : '#15803d'}; font-weight: bold;">${stats.backjobs}</td>
                <td><span style="${alertStyle}">${rate}%</span></td>
            </tr>`;
        });
    }

    return html + `</tbody></table></div></div>`;
}

function buildSealTable(oilSealUsage) {
    let html = `
        <div style="flex: 1; min-width: 300px;">
            <h3 style="margin-top: 1rem; margin-bottom: 1rem; color: var(--text-primary); font-size: 1.15rem;">Oil Seal Consumption</h3>
            <div class="table-container"><table class="data-table">
            <thead><tr><th>Oil Seal Size</th><th>Quantity Used</th></tr></thead><tbody>
    `;

    const sorted = Object.keys(oilSealUsage).sort((a, b) => oilSealUsage[b] - oilSealUsage[a]);

    if (sorted.length === 0) {
        html += `<tr><td colspan="2" style="text-align:center; padding: 1.5rem; color: #777;">No seals used yet.</td></tr>`;
    } else {
        sorted.forEach(seal => {
            html += `<tr>
                <td style="font-weight: 600; color: var(--text-primary);">${esc(seal)}</td>
                <td style="color: var(--text-primary); font-weight: bold;">${oilSealUsage[seal]} pcs</td>
            </tr>`;
        });
    }

    return html + `</tbody></table></div></div>`;
}

function drawFinancialChart(stats) {
    const allDates = Array.from(new Set([...Object.keys(stats.salesByDate), ...Object.keys(stats.expByDate)])).sort();
    const salesData = allDates.map(date => stats.salesByDate[date] || 0);
    const expData = allDates.map(date => stats.expByDate[date] || 0);

    const ctx = document.getElementById('financialChart');
    if (!ctx) return;

    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: allDates.map(dayLabel),
            datasets: [
                { label: 'Gross Sales', data: salesData, backgroundColor: '#28a745', borderRadius: 4, maxBarThickness: 56 },
                { label: 'Expenses', data: expData, backgroundColor: '#f59e0b', borderRadius: 4, maxBarThickness: 56 },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: { label: c => ` ${c.dataset.label}: ${peso(c.parsed.y)}` },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { maxTicksLimit: 6, callback: v => peso(v) },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    border: { display: false },
                },
                x: {
                    grid: { display: false },
                    border: { display: false },
                },
            },
        },
    });
}

function drawRevenueTrendChart(stats) {
    const months = Object.keys(stats.revenueByMonth).sort();
    const ctx = document.getElementById('revenueTrendChart');
    if (!ctx) return;

    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: months.map(monthLabel),
            datasets: [{
                label: 'Revenue',
                data: months.map(m => stats.revenueByMonth[m]),
                borderColor: '#2a78d6',
                backgroundColor: 'rgba(42,120,214,0.10)',
                borderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#2a78d6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                tension: 0.35,
                fill: true,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: c => ' Revenue: ' + peso(c.parsed.y) },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '15%',
                    ticks: { maxTicksLimit: 6, callback: v => peso(v) },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    border: { display: false },
                },
                x: {
                    grid: { display: false },
                    border: { display: false },
                },
            },
        },
    });
}

// Draws the total unit count in the doughnut's open center.
const brandCenterText = {
    id: 'brandCenterText',
    beforeDraw(chart) {
        const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
        const { left, right, top, bottom } = chart.chartArea;
        const x = (left + right) / 2;
        const y = (top + bottom) / 2;
        const c = chart.ctx;

        c.save();
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = "700 30px 'Bebas Neue', sans-serif";
        c.fillStyle = '#1a1c20';
        c.fillText(total, x, y - 9);
        c.font = "600 10px 'DM Sans', sans-serif";
        c.fillStyle = '#898781';
        c.fillText(total === 1 ? 'UNIT' : 'TOTAL UNITS', x, y + 14);
        c.restore();
    },
};

function drawBrandChart(stats) {
    const labels = [];
    const data = [];
    const colors = [];

    // Known brands first, each with its fixed color slot
    MOTO_BRANDS.forEach((brand, i) => {
        if (stats.brandStats[brand]) {
            labels.push(brand);
            data.push(stats.brandStats[brand]);
            colors.push(BRAND_CHART_COLORS[i]);
        }
    });

    // The grouped catch-all always renders last, in gray
    if (stats.brandStats['Others']) {
        labels.push('Others');
        data.push(stats.brandStats['Others']);
        colors.push(OTHERS_CHART_COLOR);
    }

    const ctx = document.getElementById('brandChart');
    if (!ctx) return;

    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 8,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '64%',
            layout: { padding: 6 },
            plugins: {
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label(c) {
                            const total = c.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total ? Math.round((c.parsed / total) * 100) : 0;
                            return ` ${c.label}: ${c.parsed} unit${c.parsed === 1 ? '' : 's'} (${pct}%)`;
                        },
                    },
                },
            },
        },
        plugins: [brandCenterText],
    });
}

// One metric card: soft-tinted icon chip + value + label.
// `tint` must be a 6-digit hex so the chip background can take 10% alpha.
function statTile({ icon: name, tint, value, label, accent, labelColor, valueColor }) {
    return `
        <div class="stat-card"${accent ? ` style="border-bottom: 3px solid ${accent};"` : ''}>
            <div class="stat-icon" style="background:${tint}1A; color:${tint};">${icon(name)}</div>
            <div>
                <h3${valueColor ? ` style="color:${valueColor};"` : ''}>${value}</h3>
                <p${labelColor ? ` style="color:${labelColor};"` : ''}>${label}</p>
            </div>
        </div>`;
}

function renderOverview(ctx) {
    ctx.title.innerText = 'Business Overview';
    ctx.desc.innerText = 'High-level summary of shop operations & financials';
    ctx.actions.innerHTML = `<button class="btn btn-expense" onclick="openModal('modal-add-expense')">${icon('plus')} Add Expense</button>`;

    const stats = computeOverviewStats();
    const netProfit = stats.totalSales - stats.totalExpenses;

    // Same threshold/coloring convention as the mechanic table below,
    // so "backjob rate" reads consistently everywhere it appears.
    const backjobRateColor = stats.backjobRate > 10 ? '#d9381e' : '#15803d';

    ctx.content.innerHTML = `
        <div class="stats-grid">
            ${statTile({ icon: 'calendar', tint: '#64748b', value: peso(stats.dailySales), label: 'Daily Sales' })}
            ${statTile({ icon: 'calendar-days', tint: '#64748b', value: peso(stats.weeklySales), label: 'Weekly Sales' })}
            ${statTile({ icon: 'calendar-range', tint: '#64748b', value: peso(stats.monthlySales), label: 'Monthly Sales' })}
            ${statTile({ icon: 'calendar-clock', tint: '#64748b', value: peso(stats.yearlySales), label: 'Yearly Sales' })}
            ${statTile({ icon: 'banknote', tint: '#28a745', value: peso(stats.totalSales), label: 'Total Revenue', accent: '#28a745', labelColor: '#28a745' })}
            ${statTile({ icon: 'receipt', tint: '#d97706', value: peso(stats.totalExpenses), label: 'Total Expenses', accent: '#d97706', labelColor: '#d97706' })}
            ${statTile({ icon: 'trending-up', tint: '#0ea5e9', value: peso(netProfit), label: 'Net Profit', accent: '#0ea5e9', labelColor: '#0ea5e9' })}
            ${statTile({ icon: 'rotate-ccw', tint: backjobRateColor, value: stats.backjobRate.toFixed(1) + '%', label: 'Back-job / Claim Rate', accent: backjobRateColor, valueColor: backjobRateColor })}
        </div>

        <div class="chart-container">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.15rem;">Financial Overview: Sales vs Expenses</h3>
            <div style="position: relative; height: 300px;"><canvas id="financialChart"></canvas></div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 1.5rem;">
            <div class="chart-container" style="flex: 2; min-width: 320px; margin-top: 0;">
                <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.15rem;">Revenue Trend (by Month)</h3>
                <div style="position: relative; height: 280px;"><canvas id="revenueTrendChart"></canvas></div>
            </div>
            <div class="chart-container" style="flex: 1; min-width: 280px; margin-top: 0;">
                <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.15rem;">Services by Motorcycle Brand</h3>
                <div style="position: relative; height: 280px;"><canvas id="brandChart"></canvas></div>
            </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 1rem;">
            ${buildMechanicTable(stats.mechanicStats)}
            ${buildSealTable(stats.oilSealUsage)}
        </div>
    `;

    // Wait one tick so the canvases exist in the DOM before Chart.js draws on them
    setTimeout(() => {
        drawFinancialChart(stats);
        drawRevenueTrendChart(stats);
        drawBrandChart(stats);
    }, 50);
}
