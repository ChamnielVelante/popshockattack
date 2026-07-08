// ============================================================
// MotoTrack — API layer
// Central fetch wrapper (attaches the Sanctum bearer token) and
// the data-sync functions that refresh the local caches.
// ============================================================

async function apiFetch(url, options = {}) {
    const headers = Object.assign(
        {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        options.headers || {},
        authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
    );

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 && authToken) {
        // The token was revoked server-side. Reset the session exactly once —
        // syncAllData() fires several requests in parallel, and without the
        // authToken guard each stale 401 would pop its own pair of toasts.
        forceLogout('Session expired. Please log in again.');
    }

    return response;
}

async function fetchJobsFromDatabase() {
    try {
        // Customers only ever see their own jobs; admin/staff see the full board.
        const endpoint = currentRole === 'customer' ? '/api/my-jobs' : '/api/jobs';
        const response = await apiFetch(endpoint);
        if (!response.ok) throw new Error('Failed to load jobs');
        dbJobs = await response.json();
    } catch (error) {
        console.error('Failed to pull live jobs:', error);
    }
}

async function fetchInventoryFromDatabase() {
    if (currentRole === 'customer') return; // customers have no inventory access
    try {
        const response = await apiFetch('/api/inventory');
        if (!response.ok) throw new Error('Failed to load inventory');
        dbInv = await response.json();
    } catch (error) {
        console.error('Failed to pull live inventory:', error);
    }
}

async function fetchUsersFromDatabase() {
    if (currentRole === 'customer') return; // customers have no user-management access
    try {
        const response = await apiFetch('/api/users');
        if (!response.ok) throw new Error('Failed to load users');
        dbUsers = await response.json();
    } catch (error) {
        console.error('Failed to pull users from database:', error);
    }
}

async function fetchExpensesFromDatabase() {
    if (currentRole === 'customer') return; // customers have no expense access
    try {
        const response = await apiFetch('/api/expenses');
        if (!response.ok) throw new Error('Failed to load expenses');

        // Normalize backend field names to the shape the dashboard math expects.
        const rows = await response.json();
        dbExpenses = rows.map(exp => ({
            id: exp.id,
            desc: exp.description,
            amount: Number(exp.amount),
            date: exp.date,
        }));
    } catch (error) {
        console.error('Failed to pull live expenses:', error);
    }
}

// Refresh every cache the current role has access to.
async function syncAllData() {
    await Promise.all([
        fetchJobsFromDatabase(),
        fetchInventoryFromDatabase(),
        fetchUsersFromDatabase(),
        fetchExpensesFromDatabase(),
        fetchNotifications(),
    ]);
}
