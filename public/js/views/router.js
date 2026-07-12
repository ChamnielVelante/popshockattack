// ============================================================
// MotoTrack — View router
// buildSidebar() draws the role-based nav; loadView() syncs data
// then dispatches to one render function per view. The render
// functions live in the other files of this folder, one per view.
// ============================================================

function buildSidebar() {
    const nav = document.getElementById('sidebarNav');
    nav.innerHTML = '';

    if (currentRole === 'admin') {
        nav.innerHTML += `<li class="nav-item active" onclick="loadView('overview')">Shop Overview</li>`;
        nav.innerHTML += `<li class="nav-item" onclick="loadView('kanban')">Stage-Gate Tracker</li>`;
        nav.innerHTML += `<li class="nav-item" onclick="loadView('history')">Service History</li>`;
        nav.innerHTML += `<li class="nav-item" onclick="loadView('inventory')">Consumables Tracker</li>`;
        nav.innerHTML += `<li class="nav-item" onclick="loadView('reports')">Sales & Reports</li>`;
        nav.innerHTML += `<li class="nav-item" onclick="loadView('users')">Manage Users</li>`;
        loadView('overview');
    } else if (currentRole === 'staff') {
        nav.innerHTML += `<li class="nav-item active" onclick="loadView('kanban')">Active Workflow</li>`;
        nav.innerHTML += `<li class="nav-item" onclick="loadView('history')">Service History</li>`;
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
        history: renderHistory,
        inventory: renderInventory,
        users: renderUsers,
        customer: renderCustomerDashboard,
    };

    const render = renderers[viewType];
    if (render) render(ctx);
};
