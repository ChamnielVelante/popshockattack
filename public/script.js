// --- 1. DUMMY DATA INITIALIZATION (FINAL V15 - With Expenses & Mechanics) ---
const initialUsers = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'staff', password: 'staff123', role: 'staff' },
    { username: 'juan_rider', password: 'pass123', role: 'customer' }
];

const initialJobs = [];

const initialInv = [];

const initialExpenses = [
    { id: '1', desc: 'Shop Utilities', amount: 1500, date: '2026-04-28' },
    { id: '2', desc: 'Restock Consumables', amount: 800, date: '2026-04-30' }
];

let dbUsers = [];
let dbJobs = [];
let dbInv = [];
let dbExpenses = [];

try {
    dbUsers = JSON.parse(localStorage.getItem('mt_users_v15')) || initialUsers;
    dbJobs = JSON.parse(localStorage.getItem('mt_jobs_v15')) || initialJobs;
    dbInv = JSON.parse(localStorage.getItem('mt_inv_v15')) || initialInv;
    dbExpenses = JSON.parse(localStorage.getItem('mt_exp_v15')) || initialExpenses;
} catch (error) {
    dbUsers = initialUsers; dbJobs = initialJobs; dbInv = initialInv; dbExpenses = initialExpenses;
}

let currentUser = null; 
let currentRole = null;
const stages = ['Intake', 'Disassembly', 'Tuning', 'QA', 'Release'];

// --- TOAST NOTIFICATIONS ---
function showNotification(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'fadeOut 0.4s ease forwards'; setTimeout(() => toast.remove(), 400); }, 4000);
}

// --- AUTHENTICATION ---
window.toggleAuthMode = function(mode) {
    document.getElementById('mainLoginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('forgotForm').classList.add('hidden');
    document.getElementById('demoGuide').classList.add('hidden');
    document.getElementById('loginError').classList.add('hidden');
    
    if(mode === 'register') { document.getElementById('registerForm').classList.remove('hidden'); } 
    else if (mode === 'forgot') { document.getElementById('forgotForm').classList.remove('hidden'); }
    else { document.getElementById('mainLoginForm').classList.remove('hidden'); document.getElementById('demoGuide').classList.remove('hidden'); }
}

window.handleRegister = async function(e) {
    e.preventDefault();
    const user = document.getElementById('regUser').value.trim().toLowerCase();
    const pass = document.getElementById('regPass').value.trim();
    const confirmPass = document.getElementById('regPassConfirm').value.trim();

    if(pass !== confirmPass) { 
        showNotification("Error: Passwords do not match.", "error"); 
        return; 
    }
    
    try {
        // Send to Laravel API
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });

        if (response.ok) {
            showNotification("Account registered! Pending staff approval.", "success");
            e.target.reset(); 
            toggleAuthMode('login');
            
            // CRITICAL: Fetch fresh data immediately so Staff sees the new pending user!
            await fetchUsersFromDatabase(); 
        } else {
            const data = await response.json();
            showNotification(data.message || "Registration failed.", "error");
        }
    } catch (err) {
        showNotification("Server connection error. Is Laravel running?", "error");
    }
}


window.handleForgot = function(e) {
    e.preventDefault();
    const user = document.getElementById('forgotUser').value.trim().toLowerCase();
    const found = dbUsers.find(u => u.username === user);
    if(found) { 
        showNotification(`Recovery Link Sent! (Demo: Your password is ${found.password})`, 'warning'); 
        toggleAuthMode('login');
    } else { showNotification("Username not found in database.", "error"); }
}

window.handleUnifiedLogin = async function(e) {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value.trim();
    const err = document.getElementById('loginError'); 
    err.classList.add('hidden');
    
    try {
        // Send credentials to Laravel API
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });

        if (response.ok) {
            const data = await response.json();
            const foundUser = data.user; // Extract the user data from MySQL

            if (foundUser.role === 'admin') { 
                loginSuccess('Shop Owner', 'admin'); 
                showNotification('Welcome back, Owner!', 'success'); 
            } 
            else if (foundUser.role === 'staff') { 
                loginSuccess('Head Tech', 'staff'); 
                showNotification('Workspace accessed.', 'success'); 
            } 
            else { 
                loginSuccess(foundUser.username, 'customer'); 
                showNotification('Welcome to your portal.', 'success'); 
            }
        } else {
            err.classList.remove('hidden'); 
            err.innerText = "Invalid credentials.";
        }
    } catch (error) {
        console.error("Login failed:", error);
        err.classList.remove('hidden'); 
        err.innerText = "Server connection error.";
    }
}

async function loginSuccess(userName, roleName) {
    currentUser = userName; 
    currentRole = roleName;
    
    
    // Save the session to the browser so it survives a refresh
    localStorage.setItem('mt_session_user', userName);
    localStorage.setItem('mt_session_role', roleName);
    
    document.getElementById('view-login').classList.remove('active-view');
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-system').classList.remove('hidden');
    document.getElementById('view-system').classList.add('active-view');
    document.getElementById('displayRole').innerText = roleName.toUpperCase();
    
    // FETCH LIVE DATA FROM MYSQL BEFORE BUILDING SIDEBAR
    await fetchJobsFromDatabase();
    await fetchInventoryFromDatabase();
    await fetchUsersFromDatabase();
    
    buildSidebar();
}

window.logout = function() {
    document.getElementById('modal-logout').classList.remove('hidden');
}

// 2. Function na aandar lang kapag pinindot nila ang "Yes, Log out" sa modal
window.executeLogout = function() {
    // Clear the saved session
    localStorage.removeItem('mt_session_user');
    localStorage.removeItem('mt_session_role');
    currentUser = null;
    currentRole = null;

    // Bumalik sa Login Screen
    document.getElementById('view-system').classList.remove('active-view');
    document.getElementById('view-system').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('view-login').classList.add('active-view');
    document.getElementById('mainLoginForm').reset();
    document.getElementById('loginError').classList.add('hidden');
    
    // Itago ulit yung floating modal para hindi nakaharang pag login ulit
    closeModal('modal-logout');
    
    showNotification('Logged out successfully!', 'success');
}

// --- DYNAMIC VIEWS ---
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

window.loadView = async function(viewType) {
    // 1. RE-FETCH ALL FRESH DATA FROM MYSQL BEFORE CHANGING VIEWS
    try {
        await fetchJobsFromDatabase();
        await fetchUsersFromDatabase();
        if (typeof fetchInventoryFromDatabase === 'function') {
            await fetchInventoryFromDatabase();
        }
    } catch (error) {
        console.error("Failed to sync database arrays on navigation:", error);
    }

    // 2. VISUAL NAVIGATION: Update active styles
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    if(typeof event !== 'undefined' && event && event.currentTarget) { 
        event.currentTarget.classList.add('active'); 
    }
    
    const title = document.getElementById('pageTitle');
    const desc = document.getElementById('pageDesc');
    const actions = document.getElementById('headerActions');
    const content = document.getElementById('mainContentArea');
    actions.innerHTML = '';

if (viewType === 'overview') {
        title.innerText = "Business Overview"; desc.innerText = "High-level summary of shop operations & financials";
        actions.innerHTML = `<button class="btn btn-danger" onclick="openExpenseModal()">+ Add Expense</button>`;

        let d = new Date();
        let todayStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
        let currentMonthStr = todayStr.substring(0, 7);
        
        let lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        let lastWeekStr = lastWeek.getFullYear() + "-" + String(lastWeek.getMonth() + 1).padStart(2, '0') + "-" + String(lastWeek.getDate()).padStart(2, '0');

        let totalSales = 0, dailySales = 0, weeklySales = 0, monthlySales = 0;
        let totalExpenses = 0;
        
        let salesByDate = {}; 
        let expByDate = {};
        let mechanicStats = {};
        let oilSealUsage = {};

        // Calculate Sales, Mechanic Stats, and Part Usage
        // Calculate Sales, Mechanic Stats, and Part Usage from MySQL
        dbJobs.filter(j => j.stage === 'Release').forEach(job => {
            // Financials
            if (job.specs && job.specs.totalBill !== undefined) {
                let bill = Number(job.specs.totalBill);
                totalSales += bill;
                if (job.date_in === todayStr) dailySales += bill;
                if (job.date_in >= lastWeekStr && job.date_in <= todayStr) weeklySales += bill;
                if (job.date_in && job.date_in.startsWith(currentMonthStr)) monthlySales += bill;
                
                salesByDate[job.date_in] = (salesByDate[job.date_in] || 0) + bill;
                
                // Track Oil Seals
                if (job.specs.oilSeal && job.specs.oilSeal !== 'None') {
                    let sealName = job.specs.oilSeal.split(' (')[0];
                    let qtyMatch = job.specs.oilSeal.match(/\((\d+)/);
                    let qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
                    
                    if(!oilSealUsage[sealName]) oilSealUsage[sealName] = 0;
                    oilSealUsage[sealName] += qty;
                }
            }

            // Mechanic Backjob Logic
            if (job.mechanic_name) {
                let mech = job.mechanic_name;
                if (!mechanicStats[mech]) mechanicStats[mech] = { total: 0, backjobs: 0 };
                mechanicStats[mech].total += 1;
                if (job.is_warranty_claim) mechanicStats[mech].backjobs += 1;
            }
        });

        // Calculate Expenses
        dbExpenses.forEach(exp => {
            totalExpenses += exp.amount;
            expByDate[exp.date] = (expByDate[exp.date] || 0) + exp.amount;
        });

        let netProfit = totalSales - totalExpenses;

        // Prepare Chart Data
        let allDates = Array.from(new Set([...Object.keys(salesByDate), ...Object.keys(expByDate)])).sort();
        let chartSalesData = allDates.map(date => salesByDate[date] || 0);
        let chartExpData = allDates.map(date => expByDate[date] || 0);

        // Generate Mechanic Table HTML
        let mechTableHtml = `
            <div style="flex: 1; min-width: 300px;">
                <h3 style="margin-top: 1rem; margin-bottom: 1rem; color: var(--text-primary); font-size: 1.15rem;">Mechanic Performance</h3>
                <div class="table-container"><table class="data-table">
                <thead><tr><th>Mechanic Name</th><th>Completed</th><th>Backjobs</th><th>Rate</th></tr></thead><tbody>
        `;
        let sortedMechs = Object.keys(mechanicStats).sort((a,b) => mechanicStats[b].backjobs - mechanicStats[a].backjobs);
        
        if(sortedMechs.length === 0) {
            mechTableHtml += `<tr><td colspan="4" style="text-align:center; padding: 1.5rem; color: #777;">No data yet.</td></tr>`;
        } else {
            sortedMechs.forEach(mech => {
                let stats = mechanicStats[mech];
                let rate = stats.total > 0 ? ((stats.backjobs / stats.total) * 100).toFixed(1) : 0;
                let alertStyle = rate > 10 ? 'color: var(--primary); font-weight: bold; background: #fef2f2; padding: 2px 6px; border-radius: 4px;' : 'color: #15803d; font-weight: bold;'; 
                mechTableHtml += `<tr>
                    <td style="color: var(--primary); font-weight: 700;">${mech}</td>
                    <td>${stats.total}</td>
                    <td style="color: ${stats.backjobs > 0 ? 'var(--primary)' : '#15803d'}; font-weight: bold;">${stats.backjobs}</td>
                    <td><span style="${alertStyle}">${rate}%</span></td>
                </tr>`;
            });
        }
        mechTableHtml += `</tbody></table></div></div>`;

        // --- NEW: Generate Oil Seal Consumption Table HTML ---
        let sealTableHtml = `
            <div style="flex: 1; min-width: 300px;">
                <h3 style="margin-top: 1rem; margin-bottom: 1rem; color: var(--text-primary); font-size: 1.15rem;">Oil Seal Consumption</h3>
                <div class="table-container"><table class="data-table">
                <thead><tr><th>Oil Seal Size</th><th>Quantity Used</th></tr></thead><tbody>
        `;
        let sortedSeals = Object.keys(oilSealUsage).sort((a,b) => oilSealUsage[b] - oilSealUsage[a]);
        
        if(sortedSeals.length === 0) {
            sealTableHtml += `<tr><td colspan="2" style="text-align:center; padding: 1.5rem; color: #777;">No seals used yet.</td></tr>`;
        } else {
            sortedSeals.forEach(seal => {
                sealTableHtml += `<tr>
                    <td style="font-weight: 600; color: var(--text-primary);">${seal}</td>
                    <td style="color: #f59e0b; font-weight: bold;">${oilSealUsage[seal]} pcs</td>
                </tr>`;
            });
        }
        sealTableHtml += `</tbody></table></div></div>`;

        // Render Dashboard HTML
        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><h3>₱${dailySales.toLocaleString()}</h3><p>Daily Sales</p></div>
                <div class="stat-card"><h3>₱${weeklySales.toLocaleString()}</h3><p>Weekly Sales</p></div>
                <div class="stat-card"><h3>₱${monthlySales.toLocaleString()}</h3><p>Monthly Sales</p></div>
                <div class="stat-card" style="border-bottom: 3px solid #28a745;"><h3>₱${totalSales.toLocaleString()}</h3><p style="color:#28a745;">Total Revenue</p></div>
                <div class="stat-card" style="border-bottom: 3px solid #dc3545;"><h3>₱${totalExpenses.toLocaleString()}</h3><p style="color:#dc3545;">Total Expenses</p></div>
                <div class="stat-card" style="border-bottom: 3px solid #0ea5e9;"><h3>₱${netProfit.toLocaleString()}</h3><p style="color:#0ea5e9;">Net Profit</p></div>
            </div>
            
            <div class="chart-container">
                <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.15rem;">Financial Overview: Sales vs Expenses</h3>
                <canvas id="financialChart" height="80"></canvas>
            </div>
            
            <!-- Tables rendered side-by-side using flexbox -->
            <div style="display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 1rem;">
                ${mechTableHtml}
                ${sealTableHtml}
            </div>
        `;

        setTimeout(() => {
            const ctx = document.getElementById('financialChart');
            if (ctx) {
                new Chart(ctx.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: allDates,
                        datasets: [
                            {
                                label: 'Gross Sales (₱)',
                                data: chartSalesData,
                                backgroundColor: '#28a745',
                                borderRadius: 4
                            },
                            {
                                label: 'Expenses (₱)',
                                data: chartExpData,
                                backgroundColor: '#dc3545',
                                borderRadius: 4
                            }
                        ]
                    },
                    options: { 
                        responsive: true, 
                        plugins: { legend: { position: 'top' } }, 
                        scales: { y: { beginAtZero: true } } 
                    }
                });
            }
        }, 50);
    }

    else if (viewType === 'approvals') {
        title.innerText = "Pending Customer Approvals"; 
        desc.innerText = "Review and approve new customer registrations";
        const pendingUsers = dbUsers.filter(u => u.status === 'pending');
        
        let html = `<div class="table-container"><table class="data-table"><thead><tr><th>Username</th><th>Action</th></tr></thead><tbody>`;
        if(pendingUsers.length === 0) { 
            html += `<tr><td colspan="2" style="text-align:center; padding: 2rem;">No pending accounts.</td></tr>`; 
        } else {
            pendingUsers.forEach(u => {
                html += `<tr>
                    <td><strong>${u.username}</strong></td>
                    <td><button class="btn btn-primary btn-sm" onclick="approveUser(${u.id})">Approve Account</button></td>
                </tr>`;
            });
        }
        html += `</tbody></table></div>`;
        content.innerHTML = html;
    }
    
    else if (viewType === 'reports') {
        title.innerText = "Sales & Financial Reports"; desc.innerText = "Itemized breakdown of all completed and released services.";
        actions.innerHTML = `
            <input type="date" id="filterStart" class="search-bar" style="width: 150px; min-width: auto;">
            <input type="date" id="filterEnd" class="search-bar" style="width: 150px; min-width: auto;">
            <button class="btn btn-primary" onclick="filterReports()">Filter Data</button>
            <button class="btn" style="background:#555; color:#fff;" onclick="window.print()">🖨️ Print Report</button>
        `;
        renderReportTable(dbJobs.filter(j => j.stage === 'Release' && j.specs));
    }
    
    else if (viewType === 'kanban') {
        title.innerText = "Stage-Gate Workflow"; desc.innerText = currentRole === 'staff' ? "Manage and move active service units" : "View-only monitoring of shop floor";
        
        let actHtml = `<input type="text" id="searchKanbanInput" class="search-bar" placeholder="Search Plate or Name..." onkeyup="searchKanban()">`;
        if (currentRole === 'staff') { actHtml += `<button class="btn btn-primary" onclick="document.getElementById('modal-intake').classList.remove('hidden')">+ New Intake</button>`; }
        actions.innerHTML = actHtml;
        let kbHtml = `<div class="kanban-board">`;
        
        stages.forEach(s => {
            kbHtml += `<div class="stage-column"><div class="stage-header">${s}</div><div class="job-list" id="col-${s}">`;
            dbJobs.filter(j => j.stage === s).forEach(job => {
                let btnHtml = '';
                // Use is_warranty_claim from DB
                let wBadge = job.is_warranty_claim ? `<span class="badge-warranty">RE-SERVICE</span>` : '';
                let specHtml = job.specs ? `<div class="specs-box"><strong>Oil:</strong> ${job.specs.oil}<br><strong>Oil Seal:</strong> ${job.specs.oilSeal}<br><strong>Dust Seal:</strong> ${job.specs.dustSeal}<br><strong>Springs:</strong> ${job.specs.springs}<hr style="margin:5px 0; border:0; border-top:1px dashed #ccc;"><strong style="color:#28a745;">Bill: ₱${job.specs.totalBill.toLocaleString()}</strong></div>` : '';
                
                let mechanicHtml = '';
                if (currentRole === 'staff' && s === 'Disassembly') {
                    const mechanicsList = ['John Hendrix', 'Vince Sael', 'Dhax Allen', 'Jan Cairo'];
                    let options = `<option value="">-- Unassigned --</option>`;
                    mechanicsList.forEach(m => {
                        // Use mechanic_name from DB
                        let selected = job.mechanic_name === m ? 'selected' : '';
                        options += `<option value="${m}" ${selected}>${m}</option>`;
                    });
                    mechanicHtml = `
                        <div style="margin-top: 10px; background: #f8f9fa; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
                            <label style="font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">Assign Mechanic:</label>
                            <select style="width: 100%; padding: 0.4rem; margin-top: 4px; border-radius: 4px; border: 1px solid #ccc; font-family: inherit; font-size: 0.85rem;" onchange="assignMechanic('${job.id}', this.value)">
                                ${options}
                            </select>
                        </div>
                    `;
                } else if (job.mechanic_name) {
                    // Use mechanic_name from DB
                    mechanicHtml = `<div style="margin-top: 10px;"><p style="font-size: 0.85rem;"><strong>Assigned Tech:</strong> <span style="color:var(--primary); font-weight:700;">${job.mechanic_name}</span></p></div>`;
                }

                if (currentRole === 'staff') {
                    const idx = stages.indexOf(s);
                    let delBtn = `<button class="btn-sm btn-danger" onclick="deleteJob('${job.id}')" style="margin-top:5px;">Cancel Job</button>`;
                    
                    if (s === 'Tuning') { 
                        btnHtml = `<div class="action-btns"><button class="btn-sm" style="background:var(--primary);" onclick="openSpecs('${job.id}')">Log Specs & Compute</button>${delBtn}</div>`; 
                    } 
                    else if (s === 'QA') {
                        btnHtml = `<div class="action-btns">
                            <button class="btn-sm" onclick="moveStage('${job.id}', 'Release')">Move to Release</button>
                            <button class="btn-sm" style="background:#f59e0b; color:#fff;" onclick="moveStage('${job.id}', 'Tuning')">⏪ Back to Tuning</button>
                            ${delBtn}
                        </div>`;
                    }
                    else if (idx < stages.length - 1) { 
                        btnHtml = `<div class="action-btns"><button class="btn-sm" onclick="moveStage('${job.id}', '${stages[idx+1]}')">Move to ${stages[idx+1]}</button>${delBtn}</div>`; 
                    }
                }
                if (s === 'Release') { btnHtml = `<div class="action-btns"><span class="badge-done">✅ Completed</span></div>`; }
                
                // Use plate_number and moto_model from DB
                kbHtml += `<div class="card kanban-card" data-search="${job.plate_number} ${job.customer} ${job.moto_model}">${wBadge}<h4>${job.moto_model}</h4><p><strong>Customer:</strong> ${job.customer}</p><p><strong>Plate:</strong> ${job.plate_number}</p>${mechanicHtml}${specHtml}${btnHtml}</div>`;
            });
            kbHtml += `</div></div>`;
        });
        kbHtml += `</div>`;
        content.innerHTML = kbHtml;
    }
    
else if (viewType === 'inventory') {
    title.innerText = currentRole === 'admin' ? "Consumables Tracker" : "Inventory Check";
    desc.innerText = "Monitor real-time shop stock levels and material re-order thresholds";
    
    // FIX 1: Corrected the function name from openModal to openItemModal('add')
    let addBtn = currentRole === 'admin' ? `<button class="btn" style="margin-bottom:1.5rem; background:var(--primary);" onclick="openItemModal('add')">+ Add New Stock Item</button>` : '';
    
    // FIX 2: Added an 'Options' column header
    let invHtml = `${addBtn}<div class="table-container"><table class="data-table"><thead><tr><th>Item No.</th><th>Item Name</th><th>Description</th><th>Current Stock</th><th>Status</th><th>Options</th></tr></thead><tbody>`;
    
    dbInv.forEach(item => {
        let isLow = item.stock <= item.threshold;
        let statusBadge = isLow ? `<span class="badge-warranty" style="background:#dc3545; position:static;">LOW STOCK</span>` : `<span class="badge-done" style="background:#28a745;">GOOD</span>`;
        
        // FIX 3: Create an Edit button for the Admin
        let editBtn = currentRole === 'admin' ? `<button class="btn-sm btn-primary" onclick="openItemModal('edit', '${item.name || item.id}')">Edit</button>` : '';
        
        invHtml += `<tr>
            <td><code style="font-weight:bold; color:#6b7280;">${item.item_no}</code></td>
            <td><strong>${item.name}</strong></td>
            <td style="color:#666; font-size:0.85rem;">${item.description}</td>
            <td style="font-weight:bold; font-size:1.1rem; color:${isLow ? '#dc3545' : 'inherit'};">${item.stock} units</td>
            <td>${statusBadge}</td>
            <td>${editBtn}</td>
        </tr>`;
    });
    
    invHtml += `</tbody></table></div>`;
    content.innerHTML = invHtml;
}
    
    else if (viewType === 'users') { 
        title.innerText = "Manage Users"; desc.innerText = "Add, Edit, or Delete system accounts.";
        actions.innerHTML = `<button class="btn btn-primary" onclick="openUserModal('add')">+ Add Account</button>`;
        let uHtml = `<div class="table-container"><table class="data-table"><thead><tr><th>Username</th><th>Password</th><th>Role</th><th>Options</th></tr></thead><tbody>`;
        dbUsers.forEach(u => {
            let roleBadge = u.role === 'admin' ? '<span style="color:var(--primary); font-weight:bold;">Admin</span>' : (u.role === 'staff' ? '<span style="color:#28a745; font-weight:bold;">Staff</span>' : 'Customer');
            uHtml += `<tr><td>${u.username}</td><td>***</td><td>${roleBadge}</td><td><button class="btn-edit" onclick="openUserModal('edit', '${u.username}')">Edit</button> <button class="btn-danger btn-sm" style="width:auto; margin-left:5px;" onclick="deleteUser('${u.username}')">Delete</button></td></tr>`;
        });
        uHtml += `</tbody></table></div>`;
        content.innerHTML = uHtml;
    }
    
 else if (viewType === 'customer') {
        title.innerText = `Welcome, ${currentUser}`; 
        desc.innerText = "Track your active services and view warranty history";
        const myJobs = dbJobs.filter(j => j.customer === currentUser);
        let cHtml = `<div class="grid-layout">`;
        
        if(myJobs.length === 0) { 
            cHtml += `<p>No records found.</p>`; 
        } else {
            myJobs.forEach(job => {
                // Use is_warranty_claim from DB
                let wBadge = job.is_warranty_claim ? `<span class="badge-warranty" style="position:static; display:inline-block; margin-bottom:10px;">RE-SERVICE CLAIM</span>` : '';
                
                let specHtml = job.specs ? `<div class="specs-box" style="margin-top:15px;"><strong>Historical Setup Data:</strong><br>Oil: ${job.specs.oil}<br>Oil Seal: ${job.specs.oilSeal}<br>Dust Seal: ${job.specs.dustSeal}<br>Springs: ${job.specs.springs}<hr style="margin:10px 0; border:0; border-top:1px dashed #ccc;"><strong style="color:#28a745; font-size:1.1rem;">Total Billed: ₱${(job.specs.totalBill || 0).toLocaleString()}</strong></div>` : '';
                
                // Use warranty_status from DB
                let warrantyText = job.warranty_status || 'Pending';
                let isWarrantyActive = warrantyText.includes('Active');
                
                // NEW: Print Button (Lalabas lang kapag tapos na ang setup at may specs na)
                let printBtn = job.specs ? `<button class="btn btn-primary" style="width:100%; margin-top: 15px; font-weight: bold; background: #374151; color: #fff; border:none;" onclick="printReceipt('${job.id}')">🖨️ Print Detailed Receipt</button>` : '';
                
                // Added ${printBtn} sa dulo bago mag-close ang </div>
                cHtml += `<div class="card" style="border-top: 5px solid var(--primary);">${wBadge}<h3 style="color: var(--primary); font-size: 1.4rem; margin-bottom: 10px;">${job.moto_model}</h3><p><strong>Status:</strong> ${job.stage}</p><p><strong>Plate:</strong> ${job.plate_number}</p><p><strong>Date In:</strong> ${job.date_in}</p><hr style="margin: 15px 0; border: 0; border-top: 1px solid #eee;"><p><strong>Warranty:</strong> <span style="color:${isWarrantyActive ? '#28a745' : '#777'}; font-weight:bold;">${warrantyText}</span></p>${specHtml}${printBtn}</div>`;
            });
        }
        cHtml += `</div>`;
        content.innerHTML = cHtml;
    }
}

// --- NEW API-CONNECTED ASSIGN MECHANIC FUNCTION ---
window.assignMechanic = async function(id, mechanicName) {
    try {
        // Send the mechanic assignment to the Laravel backend
        const response = await fetch(`/api/jobs/${id}/mechanic`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mechanic: mechanicName })
        });

        if (response.ok) {
            // Pull the fresh data and rebuild the Kanban board so it instantly displays
            await fetchJobsFromDatabase(); 
            loadView('kanban'); 
            showNotification(mechanicName ? `Assigned to ${mechanicName}` : 'Mechanic unassigned', 'success');
        } else {
            showNotification('Error saving mechanic to database.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
}

window.searchKanban = function() {
    let filter = document.getElementById('searchKanbanInput').value.toLowerCase();
    let cards = document.querySelectorAll('.kanban-card');
    cards.forEach(card => {
        let text = card.getAttribute('data-search').toLowerCase();
        card.style.display = text.includes(filter) ? "block" : "none";
    });
}

window.searchInventory = function() {
    let filter = document.getElementById('searchInvInput').value.toLowerCase();
    let rows = document.querySelectorAll('.inv-row');
    rows.forEach(row => {
        let text = row.getAttribute('data-search').toLowerCase();
        row.style.display = text.includes(filter) ? "" : "none";
    });
}

window.deleteItem = function(id) {
    if(confirm(`Are you sure you want to delete "${id}"? This action cannot be undone.`)) {
        dbInv = dbInv.filter(i => i.id !== id);
        saveDB(); loadView('inventory'); showNotification("Item successfully deleted.", "success");
    }
}

window.filterReports = function() {
    const start = document.getElementById('filterStart').value;
    const end = document.getElementById('filterEnd').value;
    if(!start || !end) { showNotification("Please select both dates.", "error"); return; }
    
    // Filter using the new database date_in column
    let filteredJobs = dbJobs.filter(j => j.stage === 'Release' && j.specs && j.date_in >= start && j.date_in <= end);
    renderReportTable(filteredJobs);
}

function renderReportTable(jobsArray) {
    let totalSales = 0;
    let reportHtml = `<div class="table-container"><table class="data-table"><thead><tr><th>Date</th><th>Customer</th><th>Motorcycle</th><th>Parts Used</th><th>Total Billed</th></tr></thead><tbody>`;
    
    jobsArray.forEach(job => {
        totalSales += Number(job.specs.totalBill || 0);
        let wBadge = job.is_warranty_claim ? '<br><span style="color:#856404; font-size:0.75rem; font-weight:bold;">(WARRANTY CLAIM)</span>' : '';
        
        // Render using the proper SQL column names
        reportHtml += `<tr>
            <td>${job.date_in}</td>
            <td><strong style="color: var(--primary);">${job.customer}</strong></td>
            <td>${job.moto_model} (${job.plate_number})</td>
            <td style="font-size:0.85rem; color:#666;">
                Base: ₱${job.specs.enginePrice}<br>
                ${job.specs.oilSeal !== 'None' ? 'Oil Seals<br>' : ''}
                ${job.specs.dustSeal !== 'None' ? 'Dust Seals<br>' : ''}
                ${job.specs.springs !== 'None' ? 'Springs' : ''}
            </td>
            <td style="font-weight:bold; color:#28a745; font-size:1.1rem;">₱${Number(job.specs.totalBill || 0).toLocaleString()}${wBadge}</td>
        </tr>`;
    });
    
    reportHtml += `</tbody></table></div>`;
    document.getElementById('mainContentArea').innerHTML = `<div style="background: #fff; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 5px solid #28a745; box-shadow: 0 2px 5px rgba(0,0,0,0.05);"><p style="font-size: 1rem; color: #555;">Total Shop Revenue Generated</p><h2 style="color: #28a745; font-size: 2.5rem;">₱${totalSales.toLocaleString()}</h2></div>${reportHtml}`;
}

// --- 4. SYSTEM FUNCTIONS ---
window.submitIntake = async function(e) {
    e.preventDefault();
    const plateInput = document.getElementById('in_plate').value.trim().toUpperCase();
    
    // Check if plate is already active in the shop
    if(dbJobs.some(job => job.plate_number === plateInput && job.stage !== 'Release')) { 
        showNotification(`Error: Plate number ${plateInput} is already active.`, 'error'); 
        return; 
    }
    
    let d = new Date(); 
    let ds = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
    
    // Prepare the data payload for Laravel
    const payload = {
        customer: document.getElementById('in_cust').value.toLowerCase().trim(),
        moto: document.getElementById('in_moto').value.trim(),
        plate: plateInput,
        dateIn: ds
    };

    try {
        // Send the payload to your MySQL database via Laravel API
        const response = await fetch('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            e.target.reset(); 
            closeModal('modal-intake'); 
            
            showNotification('Intake successfully registered in MySQL!', 'success');
            
            // Simply call loadView! It will now auto-fetch the database and redraw the board instantly.
            await window.loadView('kanban'); 
        } else {
            showNotification('Error saving to database.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
}

window.deleteJob = async function(id) {
    if(confirm("Are you sure you want to cancel and delete this job from the database?")) {
        try {
            // Send a DELETE request to the Laravel API
            const response = await fetch(`/api/jobs/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Re-fetch the live array to remove the deleted card from the screen
                await fetchJobsFromDatabase(); 
                loadView('kanban'); 
                showNotification("Job permanently deleted.", "success");
            } else {
                showNotification("Error deleting job.", "error");
            }
        } catch (error) {
            console.error(error);
            showNotification('Server connection error.', 'error');
        }
    }
}

window.moveStage = async function(id, nextStage) {
    try {
        // Send a PUT request to the Laravel API with the specific job ID
        const response = await fetch(`/api/jobs/${id}/stage`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage: nextStage })
        });

        if (response.ok) {
            // Pull the fresh data and rebuild the Kanban board
            await fetchJobsFromDatabase(); 
            loadView('kanban'); 
            showNotification(`Moved to ${nextStage}`, 'success');
        } else {
            showNotification('Error moving job in database.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
}

window.openSpecs = function(id) { document.getElementById('spec_job_id').value = id; document.getElementById('spec_is_warranty').checked = false; document.getElementById('modal-specs').classList.remove('hidden'); }

window.submitSpecs = async function(e) {
    e.preventDefault();
    const jobId = document.getElementById('spec_job_id').value;
    
    // Grab all the input values
    const enginePrice = parseInt(document.getElementById('spec_engine').value) || 1500;
    const isWarranty = document.getElementById('spec_is_warranty').checked;
    
    const oil = document.getElementById('spec_oil').value;
    const springs = document.getElementById('spec_springs').value;
    const osSize = document.getElementById('spec_oil_seal').value;
    const osQty = parseInt(document.getElementById('spec_oil_seal_qty').value) || 0;
    const osSide = document.getElementById('spec_oil_seal_side').value;
    const dsSize = document.getElementById('spec_dust_seal').value;
    const dsQty = parseInt(document.getElementById('spec_dust_seal_qty').value) || 0;
    const dsSide = document.getElementById('spec_dust_seal_side').value;
    
    if((osSize !== 'None' && osQty === 0) || (dsSize !== 'None' && dsQty === 0)) { 
        showNotification('Specify quantity for seals.', 'error'); 
        return; 
    }
    
    // Compute the Bill
    let computedBill = enginePrice; 
    let oilSealPrice = enginePrice >= 2800 ? 500 : 300; 
    
    if(osSize !== 'None') computedBill += (osQty * oilSealPrice); 
    if(dsSize !== 'None') computedBill += (dsQty * 75);  
    if(springs !== 'None') computedBill += 580; 
    
    if (isWarranty) computedBill = 0; // Free if it's a backjob/warranty claim
    
    // Prepare data payload for Laravel
    const payload = {
        enginePrice: enginePrice,
        totalBill: computedBill,
        oil: oil,
        oilSeal: osSize !== 'None' ? `${osSize} (${osQty} - ${osSide})` : 'None',
        dustSeal: dsSize !== 'None' ? `${dsSize} (${dsQty} - ${dsSide})` : 'None',
        springs: springs,
        isWarranty: isWarranty,
        
        // NEW: Send raw data so MySQL can deduct inventory
        rawOil: oil,
        rawOsSize: osSize,
        rawOsQty: osQty,
        rawDsSize: dsSize,
        rawDsQty: dsQty,
        rawSprings: springs
    };

    try {
        const response = await fetch(`/api/jobs/${jobId}/specs`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            e.target.reset(); 
            closeModal('modal-specs'); 
            
            // Re-fetch jobs AND inventory to refresh the screen
            await fetchJobsFromDatabase(); 
            await fetchInventoryFromDatabase();
            loadView('kanban');
            
            showNotification(`Specs logged. Bill: ₱${computedBill.toLocaleString()}`, 'success');
        } else {
            showNotification('Error logging specs.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
}

// --- NEW CRUD MODALS (ITEMS & USERS) ---
window.openItemModal = function(mode, identifier = null) {
    document.getElementById('edit_item_mode').value = mode;
    
    const modal = document.getElementById('modal-edit-item');
    const form = modal.querySelector('form');
    
    if (mode === 'add') {
        document.getElementById('itemModalTitle').innerText = "Add New Item";
        form.reset();
    } else {
        document.getElementById('itemModalTitle').innerText = "Edit Item";
        
        // Safely find the item using either the MySQL 'id' or the old 'name'
        const item = dbInv.find(i => i.id == identifier || i.name === identifier || i.itemNo === identifier);
        
        if (!item) {
            console.error("Item not found for identifier:", identifier);
            showNotification("Error: Could not load item data.", "error");
            return; // Stop here so it doesn't crash!
        }

        document.getElementById('original_item_id').value = item.name || item.id;
        document.getElementById('m_item_id').value = item.name || item.id; 
        document.getElementById('m_item_desc').value = item.description || item.desc || ''; 
        document.getElementById('m_item_stock').value = item.stock || 0; 
        document.getElementById('m_item_threshold').value = item.threshold || 0;
        
        // Safely check if the price input exists before trying to set it
        const priceInput = document.getElementById('m_item_price');
        if (priceInput) {
            priceInput.value = item.price || 0;
        }
    }
    
    modal.classList.remove('hidden');
}

window.submitItemForm = async function(e) {
    e.preventDefault();
    const mode = document.getElementById('edit_item_mode').value;
    const nameInput = document.getElementById('m_item_id').value.trim(); // Frontend uses 'm_item_id' for the item name
    const descInput = document.getElementById('m_item_desc').value;
    const stockInput = parseInt(document.getElementById('m_item_stock').value) || 0;
    const thresholdInput = parseInt(document.getElementById('m_item_threshold').value) || 0;
    
    // Grab the new price input, default to 0 if empty
    const priceInput = parseFloat(document.getElementById('m_item_price').value) || 0;

    const payload = {
        name: nameInput,
        description: descInput,
        stock: stockInput,
        threshold: thresholdInput,
        price: priceInput
    };

    try {
        if (mode === 'add') {
            // Generate a random 6-digit item number for new items
            payload.item_no = String(Math.floor(Math.random() * 900000) + 100000);
            
            const response = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) throw new Error("Item name might already exist.");
            showNotification("New item saved to database.", 'success');
            
        } else {
            // For editing, grab the original name to update it in the database
            const origName = document.getElementById('original_item_id').value;
            
            const response = await fetch(`/api/inventory/${origName}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) throw new Error("Failed to update item.");
            showNotification("Item updated in database.", 'success');
        }
        
        closeModal('modal-edit-item');
        
        // Refresh the UI with the live MySQL data
        await fetchInventoryFromDatabase();
        loadView('inventory'); 
        
    } catch (error) {
        showNotification("Error: " + error.message, 'error');
    }
}

window.openUserModal = function(mode, username = null) {
    document.getElementById('edit_user_mode').value = mode;
    const form = document.getElementById('modal-manage-user').querySelector('form');
    if(mode === 'add') { document.getElementById('userModalTitle').innerText = "Add User"; form.reset(); } 
    else {
        document.getElementById('userModalTitle').innerText = "Edit User";
        const u = dbUsers.find(x => x.username === username);
        document.getElementById('original_username').value = username; document.getElementById('m_username').value = u.username; document.getElementById('m_password').value = u.password; document.getElementById('m_role').value = u.role;
    }
    document.getElementById('modal-manage-user').classList.remove('hidden');
}

window.submitUserForm = async function(e) {
    e.preventDefault();
    const mode = document.getElementById('edit_user_mode').value;
    const uInput = document.getElementById('m_username').value.trim().toLowerCase();
    const pInput = document.getElementById('m_password').value;
    const rInput = document.getElementById('m_role').value;

    try {
        if (mode === 'add') {
            // Send new user to API
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: uInput, password: pInput })
            });
            if (!response.ok) throw new Error("Registration failed");
        } else {
            showNotification("Edit functionality requires API update", "warning");
            return;
        }
        
        closeModal('modal-manage-user');
        await fetchUsersFromDatabase(); // Pull fresh data from MySQL
        await loadView('users');       // Refresh UI
        showNotification("User saved to database.", 'success');
    } catch (error) {
        showNotification("Error: " + error.message, 'error');
    }
}

window.deleteUser = function(username) {
    if(username === 'admin') { showNotification("Cannot delete main admin.", "error"); return; }
    if(confirm(`Delete user ${username}?`)) { 
        dbUsers = dbUsers.filter(u => u.username !== username); 
        loadView('users'); 
        showNotification("User deleted locally (API connection needed for DB).", "success"); 
    }
}

window.openAddStockModal = function(itemId) {
    document.getElementById('add_stock_item_id').value = itemId; document.getElementById('add_stock_item_name').innerText = itemId; document.getElementById('add_stock_qty').value = 10; document.getElementById('modal-add-stock').classList.remove('hidden');
}

window.submitAddStock = function(e) {
    e.preventDefault();
    const itemId = document.getElementById('add_stock_item_id').value;
    const qty = parseInt(document.getElementById('add_stock_qty').value);
    if (!isNaN(qty) && qty > 0) { let item = dbInv.find(i => i.id === itemId); if (item) { item.stock += qty; saveDB(); closeModal('modal-add-stock'); loadView('inventory'); showNotification(`Added ${qty} units.`, 'success'); } }
}

window.openExpenseModal = function() {
    document.getElementById('modal-add-expense').classList.remove('hidden');
}

window.submitExpense = function(e) {
    e.preventDefault();
    const desc = document.getElementById('exp_desc').value;
    const amt = parseFloat(document.getElementById('exp_amount').value);
    
    let d = new Date();
    let todayStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
    
    dbExpenses.push({ 
        id: Date.now().toString(), 
        desc: desc, 
        amount: amt, 
        date: todayStr 
    });
    
    saveDB();
    e.target.reset();
    closeModal('modal-add-expense');
    loadView('overview'); 
    showNotification('Expense recorded successfully.', 'success');
}

function saveDB() {
    try { 
        localStorage.setItem('mt_users_v15', JSON.stringify(dbUsers)); 
        localStorage.setItem('mt_jobs_v15', JSON.stringify(dbJobs)); 
        localStorage.setItem('mt_inv_v15', JSON.stringify(dbInv)); 
        localStorage.setItem('mt_exp_v15', JSON.stringify(dbExpenses));
    } catch (error) { 
        showNotification("Error saving.", "error"); 
    } 
}

window.closeModal = function(id) { document.getElementById(id).classList.add('hidden'); }

async function fetchJobsFromDatabase() {
    try {
        const response = await fetch('/api/jobs');
        if (!response.ok) throw new Error('Network response was not ok');
        
        // ONLY update the array, do NOT touch the UI here
        dbJobs = await response.json(); 
    } catch (error) {
        console.error('Failed to pull live jobs:', error);
    }
}

// --- AUTO LOGIN CHECK ON PAGE LOAD ---
window.addEventListener('DOMContentLoaded', () => {
    // Check if the browser remembers a logged-in user
    const savedUser = localStorage.getItem('mt_session_user');
    const savedRole = localStorage.getItem('mt_session_role');
    
    if (savedUser && savedRole) {
        // Automatically log them back in and bypass the login screen
        loginSuccess(savedUser, savedRole);
    }
});

async function fetchInventoryFromDatabase() {
    try {
        const response = await fetch('/api/inventory');
        if (!response.ok) throw new Error('Network response was not ok');
        
        dbInv = await response.json();
    } catch (error) {
        console.error('Failed to pull live inventory:', error);
    }
}

async function fetchUsersFromDatabase() {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            dbUsers = await response.json();
            console.log("Database Users fetched:", dbUsers);
        }
    } catch (error) {
        console.error('Failed to pull users from database:', error);
    }
}

window.approveUser = async function(id) {
    try {
        const res = await fetch(`/api/users/${id}/approve`, { method: 'PUT' });
        if(res.ok) {
            showNotification("Account approved!", "success");
            await fetchUsersFromDatabase(); // Pull fresh list
            await window.loadView('approvals'); // Refresh the view
        } else {
            showNotification("Error approving user.", "error");
        }
    } catch(e) { 
        showNotification("Server connection error.", "error"); 
    }
}

// --- PRINT RECEIPT FUNCTION ---
window.printReceipt = function(jobId) {
    // 1. Hanapin yung motor sa database array mo gamit ang ID
    const job = dbJobs.find(j => j.id == jobId);
    
    if(!job || !job.specs) {
        showNotification("Hindi pa tapos ang computation para sa unit na ito.", "error");
        return;
    }

    // 2. I-prepare ang mga detalye para hindi mag-error
    const customerName = job.customer || currentUser;
    const dateStr = job.date_in || 'N/A';
    const moto = `${job.moto_model} (${job.plate_number})`;
    
    // Gawa ng mga item rows ng walang split error
    let partsHtml = '';
    if(job.specs.oilSeal && job.specs.oilSeal !== 'None') {
        partsHtml += `<div class="item-row"><span>Oil Seal: ${job.specs.oilSeal}</span><span>Included</span></div>`;
    }
    if(job.specs.dustSeal && job.specs.dustSeal !== 'None') {
        partsHtml += `<div class="item-row"><span>Dust Seal: ${job.specs.dustSeal}</span><span>Included</span></div>`;
    }
    if(job.specs.springs && job.specs.springs !== 'None') {
        partsHtml += `<div class="item-row"><span>Springs: ${job.specs.springs}</span><span>Included</span></div>`;
    }

    // 3. Buuin yung magandang POS Thermal Receipt Design
    let printHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>MotoTrack Receipt - ${moto}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
                body { 
                    font-family: 'Courier Prime', monospace; 
                    color: #000; 
                    background: #e5e7eb; 
                    margin: 0; 
                    padding: 40px 20px;
                    display: flex;
                    justify-content: center;
                }
                .receipt {
                    background: #fff;
                    width: 100%;
                    max-width: 380px;
                    padding: 30px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                    border-top: 5px solid #dc3545;
                }
                .header { text-align: center; margin-bottom: 20px; }
                .header h2 { margin: 0; color: #dc3545; font-size: 24px; letter-spacing: -1px; font-weight: bold; }
                .header p { margin: 4px 0; font-size: 13px; color: #555; }
                .divider { border-top: 1px dashed #bbb; margin: 15px 0; }
                .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                .row.bold { font-weight: 700; font-size: 15px; }
                .item-list { font-size: 13px; color: #333; }
                .item-row { display: flex; justify-content: space-between; padding: 4px 0; }
                .total-section { background: #f9fafb; padding: 15px; margin-top: 20px; border-radius: 4px; border: 1px solid #eee; }
                .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #dc3545; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
                
                /* Ito ang nag-a-activate kapag magpi-print na */
                @media print {
                    body { background: #fff; padding: 0; display: block; }
                    .receipt { box-shadow: none; border-top: none; max-width: 100%; padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h2>POP SHOCK ATTACK</h2>
                    <p>Suspension Specialists & Tuning</p>
                    <p>San Pedro, Laguna</p>
                </div>
                
                <div class="row"><span>Date:</span> <span>${dateStr}</span></div>
                <div class="row"><span>Customer:</span> <span style="text-transform: capitalize;">${customerName}</span></div>
                <div class="row"><span>Unit:</span> <span>${moto}</span></div>
                <div class="row"><span>Assigned Tech:</span> <span>${job.mechanic_name || 'Unassigned'}</span></div>

                <div class="divider"></div>
                <div class="row bold"><span>SERVICES & PARTS</span></div>
                <div class="divider"></div>
                
                <div class="item-list">
                    <div class="item-row">
                        <span>Base Engine/Labor</span>
                        <span>₱${Number(job.specs.enginePrice || 0).toLocaleString()}</span>
                    </div>
                    <div class="item-row">
                        <span>Oil: ${job.specs.oil}</span>
                        <span>Included</span>
                    </div>
                    ${partsHtml}
                </div>
                
                <div class="total-section">
                    <div class="total-row">
                        <span>TOTAL PAID:</span>
                        <span>₱${Number(job.specs.totalBill || 0).toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Thank you for trusting MotoTrack!</p>
                    <p><strong>Warranty Status:</strong> ${job.warranty_status || 'Pending'}</p>
                    <p style="margin-top: 15px;"><i>This acts as your official warranty claim stub. Please keep it safe.</i></p>
                </div>
            </div>
            
            <script>
                // Maghihintay ng half second bago i-trigger ang computer printer dialog
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                }
            </script>
        </body>
        </html>
    `;

    // 4. Buksan sa panibagong window ang resibo
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
}