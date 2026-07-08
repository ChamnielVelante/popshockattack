// ============================================================
// MotoTrack — Inventory / consumables tracker
// Admin manages the catalog; staff get a read-only stock check.
// ============================================================

function renderInventory(ctx) {
    ctx.title.innerText = currentRole === 'admin' ? 'Consumables Tracker' : 'Inventory Check';
    ctx.desc.innerText = 'Monitor real-time shop stock levels and material re-order thresholds';

    const isAdmin = currentRole === 'admin';
    const addBtn = isAdmin
        ? `<button class="btn" style="margin-bottom:1.5rem; background:var(--primary);" onclick="openItemModal('add')">${icon('plus')} Add New Stock Item</button>`
        : '';

    // Staff view is read-only, so it has no Options column at all
    const optionsHeader = isAdmin ? '<th>Options</th>' : '';

    let html = `${addBtn}<div class="table-container"><table class="data-table"><thead><tr><th>Item No.</th><th>Item Name</th><th>Description</th><th>Current Stock</th><th>Status</th>${optionsHeader}</tr></thead><tbody>`;

    dbInv.forEach(item => {
        const isLow = item.stock <= item.threshold;
        const statusBadge = isLow
            ? `<span class="badge-low">LOW STOCK</span>`
            : `<span class="badge-good">GOOD</span>`;

        const optionsCell = isAdmin
            ? `<td><div class="row-actions">
                   <button class="btn-sm" onclick="openItemModal('edit', ${item.id})">Edit</button>
                   <button class="btn-sm btn-success" onclick="openAddStockModal(${item.id})">${icon('plus')} Stock</button>
                   <button class="btn-sm btn-danger" onclick="deleteItem(${item.id})">Delete</button>
               </div></td>`
            : '';

        html += `<tr>
            <td><code style="font-weight:bold; color:#6b7280;">${esc(item.item_no)}</code></td>
            <td><strong>${esc(item.name)}</strong></td>
            <td style="color:var(--text-secondary); font-size:0.85rem;">${esc(item.description)}</td>
            <td style="font-weight:bold; font-size:1.1rem; color:${isLow ? '#dc3545' : 'inherit'};">${item.stock} units</td>
            <td>${statusBadge}</td>
            ${optionsCell}
        </tr>`;
    });

    html += `</tbody></table></div>`;
    ctx.content.innerHTML = html;
}
