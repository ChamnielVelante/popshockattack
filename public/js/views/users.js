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
