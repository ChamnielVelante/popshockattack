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

// The caches each view actually depends on. Navigation only waits for
// (and refreshes) these instead of re-fetching everything, and a view
// paints instantly whenever its caches are already synced.
const VIEW_DATA = {
    overview: ['jobs', 'expenses'],
    approvals: ['users'],
    reports: ['jobs'],
    kanban: ['jobs'],
    history: [], // searches on demand
    inventory: ['inventory'],
    users: ['users'],
    customer: ['jobs'],
};

const FETCHERS = {
    jobs: fetchJobsFromDatabase,
    inventory: fetchInventoryFromDatabase,
    users: fetchUsersFromDatabase,
    expenses: fetchExpensesFromDatabase,
};

// Ignore stale background refreshes after the user has navigated on
let loadSequence = 0;

window.loadView = async function (viewType) {
    // Highlight the active nav item
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (typeof event !== 'undefined' && event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

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
    if (!render) return;

    const ctx = {
        title: document.getElementById('pageTitle'),
        desc: document.getElementById('pageDesc'),
        actions: document.getElementById('headerActions'),
        content: document.getElementById('mainContentArea'),
    };

    const needs = VIEW_DATA[viewType] ?? [];
    const cacheReady = needs.every(key => syncedKeys.has(key));
    const CACHES = { jobs: () => dbJobs, inventory: () => dbInv, users: () => dbUsers, expenses: () => dbExpenses };
    const snapshot = () => JSON.stringify(needs.map(key => CACHES[key]()));

    // 1) Paint immediately from cache when we can — navigation feels instant
    if (cacheReady) {
        ctx.actions.innerHTML = '';
        render(ctx);
    }

    // 2) Refresh this view's data (plus notifications) in the background
    const before = cacheReady ? snapshot() : null;
    const sequence = ++loadSequence;
    try {
        await Promise.all([...needs.map(key => FETCHERS[key]()), fetchNotifications()]);
    } catch (error) {
        console.error('Failed to sync data on navigation:', error);
    }

    // 3) Re-paint only if we haven't painted yet or the data actually changed,
    //    and only if the user hasn't already navigated somewhere else.
    if (sequence === loadSequence && (!cacheReady || snapshot() !== before)) {
        ctx.actions.innerHTML = '';
        render(ctx);
    }
};
