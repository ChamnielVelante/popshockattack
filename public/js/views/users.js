// ============================================================
// MotoTrack — Account management
// Admin: full user CRUD. Staff: pending customer approvals.
// ============================================================

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

function renderApprovals(ctx) {
    const pendingUsers = dbUsers.filter(u => u.status === 'pending');

    ctx.title.innerText = 'Pending Customer Approvals';
    ctx.desc.innerText = pendingUsers.length === 0
        ? 'Review and approve new customer registrations'
        : `${pendingUsers.length} account${pendingUsers.length === 1 ? '' : 's'} waiting for review`;

    if (pendingUsers.length === 0) {
        ctx.content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${icon('inbox')}</div>
                <h3>All caught up!</h3>
                <p>No pending registrations right now.<br>
                New customer sign-ups will appear here for approval.</p>
            </div>`;
        return;
    }

    let cards = '';
    pendingUsers.forEach(u => {
        const registered = u.created_at
            ? `Registered ${new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${notifTimeAgo(u.created_at)}`
            : 'Registration date unavailable';

        cards += `
            <div class="approval-card">
                <div class="avatar-circle">${esc(u.username.charAt(0))}</div>
                <div class="approval-info">
                    <div class="username">${esc(u.username)}</div>
                    <div class="registered">${registered}</div>
                    <span class="badge-pending">PENDING APPROVAL</span>
                </div>
                <button class="btn-sm btn-success" style="width:auto; padding:0.55rem 1rem; white-space:nowrap;"
                        onclick="approveUser(${u.id})">${icon('check')} Approve</button>
            </div>`;
    });

    ctx.content.innerHTML = `<div class="approval-grid">${cards}</div>`;
}
