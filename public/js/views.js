// ============================================================
// MotoTrack — View rendering
// buildSidebar() draws the role-based nav; loadView() syncs data
// then dispatches to one render function per view.
// ============================================================

function buildSidebar() {
    const nav = document.getElementById('sidebarNav');
    nav.innerHTML = '';

    if (currentRole === 'admin') {
        nav.innerHTML += `<li class="nav-item active" onclick="loadView('overview')">Shop Overview</li>`;
        nav.innerHTML += `<li class="nav-item" onclick="loadView('kanban')">Stage-Gate Tracker</li>`;
        nav.innerHTML += `<li class="nav-item" onclick="loadView('inventory')">Consumables Tracker</li>`;
        nav.innerHTML += `<li class="nav-item" onclick="loadView('reports')">Sales & Reports</li>`;
        nav.innerHTML += `<li class="nav-item" onclick="loadView('users')">Manage Users</li>`;
        loadView('overview');
    } else if (currentRole === 'staff') {
        nav.innerHTML += `<li class="nav-item active" onclick="loadView('kanban')">Active Workflow</li>`;
        nav.innerHTML += `<li class="nav-item" onclick="loadView('inventory')">Inventory Check</li>`;
        nav.innerHTML += `<li class="nav-item" onclick="loadView('approvals')">Pending Accounts</li>`;
        loadView('kanban');
    } else if (currentRole === 'customer') {
        nav.innerHTML += `<li class="nav-item active" onclick="loadView('customer')">My Dashboard</li>`;
        loadView('customer');
    }
}

window.loadView = async function (viewType) {
    // Refresh every cache before rendering so views always show live data
    try {
        await syncAllData();
    } catch (error) {
        console.error('Failed to sync data on navigation:', error);
    }

    // Highlight the active nav item
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (typeof event !== 'undefined' && event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    const ctx = {
        title: document.getElementById('pageTitle'),
        desc: document.getElementById('pageDesc'),
        actions: document.getElementById('headerActions'),
        content: document.getElementById('mainContentArea'),
    };
    ctx.actions.innerHTML = '';

    const renderers = {
        overview: renderOverview,
        approvals: renderApprovals,
        reports: renderReports,
        kanban: renderKanban,
        inventory: renderInventory,
        users: renderUsers,
        customer: renderCustomerDashboard,
    };

    const render = renderers[viewType];
    if (render) render(ctx);
};

// ------------------------------------------------------------
// Overview dashboard (admin)
// ------------------------------------------------------------

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

// "2026-07-04" -> "Jul 4" without UTC parsing surprises
function dayLabel(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleString('en-US', { month: 'short', day: 'numeric' });
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

// Fixed hue order, validated for adjacent colorblind-safe separation. Each
// slot belongs to one brand (in MOTO_BRANDS order: Honda, Yamaha, Suzuki,
// Kawasaki, Rusi), so a brand keeps its color no matter which brands appear.
// "Others" always gets neutral gray.
const BRAND_CHART_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7'];
const OTHERS_CHART_COLOR = '#6b7280';

// Peso formatting for chart axes and tooltips
const peso = v => '₱' + Number(v).toLocaleString();

// "2026-07" -> "Jul 2026" for chart labels
function monthLabel(key) {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

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

// ------------------------------------------------------------
// Pending account approvals (staff)
// ------------------------------------------------------------

function renderApprovals(ctx) {
    ctx.title.innerText = 'Pending Customer Approvals';
    ctx.desc.innerText = 'Review and approve new customer registrations';

    const pendingUsers = dbUsers.filter(u => u.status === 'pending');

    let html = `<div class="table-container"><table class="data-table"><thead><tr><th>Username</th><th>Action</th></tr></thead><tbody>`;
    if (pendingUsers.length === 0) {
        html += `<tr><td colspan="2" style="text-align:center; padding: 2rem;">No pending accounts.</td></tr>`;
    } else {
        pendingUsers.forEach(u => {
            html += `<tr>
                <td><strong>${esc(u.username)}</strong></td>
                <td><button class="btn btn-primary btn-sm" onclick="approveUser(${u.id})">Approve Account</button></td>
            </tr>`;
        });
    }
    html += `</tbody></table></div>`;
    ctx.content.innerHTML = html;
}

// ------------------------------------------------------------
// Sales & financial reports (admin)
// ------------------------------------------------------------

function renderReports(ctx) {
    ctx.title.innerText = 'Sales & Financial Reports';
    ctx.desc.innerText = 'Itemized breakdown of all completed and released services.';
    ctx.actions.innerHTML = `
        <input type="date" id="filterStart" class="search-bar" style="width: 150px; min-width: auto;">
        <input type="date" id="filterEnd" class="search-bar" style="width: 150px; min-width: auto;">
        <button class="btn btn-primary" onclick="filterReports()">Filter Data</button>
        <button class="btn" style="background:#555; color:#fff;" onclick="window.print()">${icon('printer')} Print Report</button>
    `;

    renderReportTable(dbJobs.filter(j => j.stage === 'Release' && j.specs));
}

window.filterReports = function () {
    const start = document.getElementById('filterStart').value;
    const end = document.getElementById('filterEnd').value;
    if (!start || !end) {
        showNotification('Please select both dates.', 'error');
        return;
    }

    const filtered = dbJobs.filter(j => j.stage === 'Release' && j.specs && j.date_in >= start && j.date_in <= end);
    renderReportTable(filtered);
};

function renderReportTable(jobsArray) {
    let totalSales = 0;
    let rowsHtml = `<div class="table-container"><table class="data-table"><thead><tr><th>Date</th><th>Customer</th><th>Motorcycle</th><th>Parts Used</th><th>Total Billed</th></tr></thead><tbody>`;

    jobsArray.forEach(job => {
        totalSales += Number(job.specs.totalBill || 0);
        const wBadge = job.is_warranty_claim ? '<br><span style="color:#856404; font-size:0.75rem; font-weight:bold;">(WARRANTY CLAIM)</span>' : '';

        rowsHtml += `<tr>
            <td>${esc(job.date_in)}</td>
            <td><strong>${esc(job.customer)}</strong></td>
            <td>${esc(job.moto_model)} (${esc(job.plate_number)})</td>
            <td style="font-size:0.85rem; color:#666;">
                Base: ₱${job.specs.enginePrice}<br>
                ${job.specs.oilSeal !== 'None' ? 'Oil Seals<br>' : ''}
                ${job.specs.dustSeal !== 'None' ? 'Dust Seals<br>' : ''}
                ${job.specs.springs !== 'None' ? 'Springs' : ''}
            </td>
            <td style="font-weight:bold; color:#28a745; font-size:1.1rem;">₱${Number(job.specs.totalBill || 0).toLocaleString()}${wBadge}</td>
        </tr>`;
    });

    rowsHtml += `</tbody></table></div>`;
    document.getElementById('mainContentArea').innerHTML = `
        <div style="background: #fff; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 5px solid #28a745; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <p style="font-size: 1rem; color: #555;">Total Shop Revenue Generated</p>
            <h2 style="color: #28a745; font-size: 2.5rem;">₱${totalSales.toLocaleString()}</h2>
        </div>${rowsHtml}`;
}

// ------------------------------------------------------------
// Kanban stage-gate board (admin view-only, staff interactive)
// ------------------------------------------------------------

function buildKanbanCard(job, stage) {
    const wBadge = job.is_warranty_claim ? `<span class="badge-warranty">RE-SERVICE</span>` : '';
    const specHtml = job.specs
        ? `<div class="specs-box"><strong>Oil:</strong> ${esc(job.specs.oil)}<br><strong>Oil Seal:</strong> ${esc(job.specs.oilSeal)}<br><strong>Dust Seal:</strong> ${esc(job.specs.dustSeal)}<br><strong>Springs:</strong> ${esc(job.specs.springs)}<hr style="margin:5px 0; border:0; border-top:1px dashed #ccc;"><strong style="color:#28a745;">Bill: ₱${Number(job.specs.totalBill || 0).toLocaleString()}</strong></div>`
        : '';

    // Mechanic assignment (staff can set it during Disassembly)
    let mechanicHtml = '';
    if (currentRole === 'staff' && stage === 'Disassembly') {
        let options = `<option value="">-- Unassigned --</option>`;
        MECHANICS.forEach(m => {
            options += `<option value="${m}" ${job.mechanic_name === m ? 'selected' : ''}>${m}</option>`;
        });
        mechanicHtml = `
            <div style="margin-top: 10px; background: #f8f9fa; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <label style="font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">Assign Mechanic:</label>
                <select style="width: 100%; padding: 0.4rem; margin-top: 4px; border-radius: 4px; border: 1px solid #ccc; font-family: inherit; font-size: 0.85rem;" onchange="assignMechanic('${job.id}', this.value)">
                    ${options}
                </select>
            </div>`;
    } else if (job.mechanic_name) {
        mechanicHtml = `<div style="margin-top: 10px;"><p style="font-size: 0.85rem;"><strong>Assigned Tech:</strong> <span style="color:var(--text-primary); font-weight:700;">${esc(job.mechanic_name)}</span></p></div>`;
    }

    // Stage action buttons (staff only)
    let btnHtml = '';
    if (currentRole === 'staff') {
        const idx = STAGES.indexOf(stage);
        const delBtn = `<button class="btn-sm btn-danger" onclick="deleteJob('${job.id}')" style="margin-top:5px;">Cancel Job</button>`;

        if (stage === 'Tuning') {
            btnHtml = `<div class="action-btns"><button class="btn-sm" style="background:var(--primary);" onclick="openSpecs('${job.id}')">Log Specs & Compute</button>${delBtn}</div>`;
        } else if (stage === 'QA') {
            btnHtml = `<div class="action-btns">
                <button class="btn-sm" onclick="moveStage('${job.id}', 'Release')">Move to Release</button>
                <button class="btn-sm" style="background:#f59e0b; color:#fff;" onclick="moveStage('${job.id}', 'Tuning')">${icon('undo')} Back to Tuning</button>
                ${delBtn}
            </div>`;
        } else if (idx < STAGES.length - 1) {
            btnHtml = `<div class="action-btns"><button class="btn-sm" onclick="moveStage('${job.id}', '${STAGES[idx + 1]}')">Move to ${STAGES[idx + 1]}</button>${delBtn}</div>`;
        }
    }
    if (stage === 'Release') {
        btnHtml = `<div class="action-btns"><span class="badge-done">${icon('check')} Completed</span></div>`;
    }

    return `<div class="card kanban-card" data-search="${esc(`${job.plate_number} ${job.customer} ${job.moto_model}`)}">${wBadge}<h4>${esc(job.moto_model)}</h4><p><strong>Customer:</strong> ${esc(job.customer)}</p><p><strong>Plate:</strong> ${esc(job.plate_number)}</p>${mechanicHtml}${specHtml}${btnHtml}</div>`;
}

function renderKanban(ctx) {
    ctx.title.innerText = 'Stage-Gate Workflow';
    ctx.desc.innerText = currentRole === 'staff' ? 'Manage and move active service units' : 'View-only monitoring of shop floor';

    let actHtml = `<input type="text" id="searchKanbanInput" class="search-bar" placeholder="Search Plate or Name..." onkeyup="searchKanban()">`;
    if (currentRole === 'staff') {
        actHtml += `<button class="btn btn-primary" onclick="openModal('modal-intake')">${icon('plus')} New Intake</button>`;
    }
    ctx.actions.innerHTML = actHtml;

    let html = `<div class="kanban-board">`;
    STAGES.forEach(stage => {
        html += `<div class="stage-column"><div class="stage-header">${stage}</div><div class="job-list" id="col-${stage}">`;
        dbJobs.filter(j => j.stage === stage).forEach(job => {
            html += buildKanbanCard(job, stage);
        });
        html += `</div></div>`;
    });
    html += `</div>`;
    ctx.content.innerHTML = html;
}

window.searchKanban = function () {
    const filter = document.getElementById('searchKanbanInput').value.toLowerCase();
    document.querySelectorAll('.kanban-card').forEach(card => {
        const text = card.getAttribute('data-search').toLowerCase();
        card.style.display = text.includes(filter) ? 'block' : 'none';
    });
};

// ------------------------------------------------------------
// Inventory / consumables tracker
// ------------------------------------------------------------

function renderInventory(ctx) {
    ctx.title.innerText = currentRole === 'admin' ? 'Consumables Tracker' : 'Inventory Check';
    ctx.desc.innerText = 'Monitor real-time shop stock levels and material re-order thresholds';

    const isAdmin = currentRole === 'admin';
    const addBtn = isAdmin
        ? `<button class="btn" style="margin-bottom:1.5rem; background:var(--primary);" onclick="openItemModal('add')">${icon('plus')} Add New Stock Item</button>`
        : '';

    let html = `${addBtn}<div class="table-container"><table class="data-table"><thead><tr><th>Item No.</th><th>Item Name</th><th>Description</th><th>Current Stock</th><th>Status</th><th>Options</th></tr></thead><tbody>`;

    dbInv.forEach(item => {
        const isLow = item.stock <= item.threshold;
        const statusBadge = isLow
            ? `<span class="badge-warranty" style="background:#dc3545; position:static;">LOW STOCK</span>`
            : `<span class="badge-done" style="background:#28a745;">GOOD</span>`;

        const optionButtons = isAdmin
            ? `<button class="btn-sm btn-primary" onclick="openItemModal('edit', ${item.id})">Edit</button>
               <button class="btn-sm" style="background:#28a745; color:#fff;" onclick="openAddStockModal(${item.id})">${icon('plus')} Stock</button>
               <button class="btn-sm btn-danger" onclick="deleteItem(${item.id})">Delete</button>`
            : '';

        html += `<tr>
            <td><code style="font-weight:bold; color:#6b7280;">${esc(item.item_no)}</code></td>
            <td><strong>${esc(item.name)}</strong></td>
            <td style="color:#666; font-size:0.85rem;">${esc(item.description)}</td>
            <td style="font-weight:bold; font-size:1.1rem; color:${isLow ? '#dc3545' : 'inherit'};">${item.stock} units</td>
            <td>${statusBadge}</td>
            <td style="display:flex; gap:6px;">${optionButtons}</td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    ctx.content.innerHTML = html;
}

// ------------------------------------------------------------
// User management (admin)
// ------------------------------------------------------------

function renderUsers(ctx) {
    ctx.title.innerText = 'Manage Users';
    ctx.desc.innerText = 'Add, Edit, or Delete system accounts.';
    ctx.actions.innerHTML = `<button class="btn btn-primary" onclick="openUserModal('add')">${icon('plus')} Add Account</button>`;

    let html = `<div class="table-container"><table class="data-table"><thead><tr><th>Username</th><th>Password</th><th>Role</th><th>Options</th></tr></thead><tbody>`;
    dbUsers.forEach(u => {
        const roleBadge = u.role === 'admin'
            ? '<span style="color:var(--primary); font-weight:bold;">Admin</span>'
            : (u.role === 'staff' ? '<span style="color:#28a745; font-weight:bold;">Staff</span>' : 'Customer');
        html += `<tr>
            <td>${esc(u.username)}</td>
            <td>***</td>
            <td>${roleBadge}</td>
            <td>
                <button class="btn-edit" onclick="openUserModal('edit', ${u.id})">Edit</button>
                <button class="btn-danger btn-sm" style="width:auto; margin-left:5px;" onclick="deleteUser(${u.id})">Delete</button>
            </td>
        </tr>`;
    });
    html += `</tbody></table></div>`;
    ctx.content.innerHTML = html;
}

// ------------------------------------------------------------
// Customer portal
// ------------------------------------------------------------

function renderCustomerDashboard(ctx) {
    ctx.title.innerText = `Welcome, ${currentUser}`;
    ctx.desc.innerText = 'Track your active services and view warranty history';

    // dbJobs is already scoped to this customer by GET /api/my-jobs
    let html = `<div class="grid-layout">`;

    if (dbJobs.length === 0) {
        html += `<p>No records found.</p>`;
    } else {
        dbJobs.forEach(job => {
            const wBadge = job.is_warranty_claim
                ? `<span class="badge-warranty" style="position:static; display:inline-block; margin-bottom:10px;">RE-SERVICE CLAIM</span>`
                : '';

            const specHtml = job.specs
                ? `<div class="specs-box" style="margin-top:15px;"><strong>Historical Setup Data:</strong><br>Oil: ${esc(job.specs.oil)}<br>Oil Seal: ${esc(job.specs.oilSeal)}<br>Dust Seal: ${esc(job.specs.dustSeal)}<br>Springs: ${esc(job.specs.springs)}<hr style="margin:10px 0; border:0; border-top:1px dashed #ccc;"><strong style="color:#28a745; font-size:1.1rem;">Total Billed: ₱${Number(job.specs.totalBill || 0).toLocaleString()}</strong></div>`
                : '';

            const warrantyText = job.warranty_status || 'Pending';
            const isWarrantyActive = warrantyText.includes('Active');

            const printBtn = job.specs
                ? `<button class="btn btn-primary" style="width:100%; margin-top: 15px; font-weight: bold; background: #374151; color: #fff; border:none;" onclick="printReceipt('${job.id}')">${icon('printer')} Print Detailed Receipt</button>`
                : '';

            html += `<div class="card" style="border-top: 5px solid var(--primary);">${wBadge}
                <h3 style="color: var(--text-primary); font-size: 1.4rem; margin-bottom: 10px;">${esc(job.moto_model)}</h3>
                <p><strong>Status:</strong> ${esc(job.stage)}</p>
                <p><strong>Plate:</strong> ${esc(job.plate_number)}</p>
                <p><strong>Date In:</strong> ${esc(job.date_in)}</p>
                <hr style="margin: 15px 0; border: 0; border-top: 1px solid #eee;">
                <p><strong>Warranty:</strong> <span style="color:${isWarrantyActive ? '#28a745' : '#777'}; font-weight:bold;">${esc(warrantyText)}</span></p>
                ${specHtml}${printBtn}</div>`;
        });
    }

    html += `</div>`;
    ctx.content.innerHTML = html;
}
