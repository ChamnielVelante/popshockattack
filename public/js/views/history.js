// ============================================================
// MotoTrack — Global service-history search (Objective 2.3)
// Staff/admin look up any unit's complete record — active or
// released — by plate/engine number, customer, or model, to
// recover previous tuning parameters for returning units.
// ============================================================

function renderHistory(ctx) {
    ctx.title.innerText = 'Service History';
    ctx.desc.innerText = 'Search every past and active job by plate / engine no., customer, or model';
    ctx.actions.innerHTML = `
        <input type="text" id="historySearchInput" class="search-bar"
               placeholder="e.g. ABC-1234, juan_rider, NMAX..."
               onkeydown="if (event.key === 'Enter') searchHistory()">
        <button class="btn btn-primary" onclick="searchHistory()">Search</button>
    `;

    ctx.content.innerHTML = `
        <div style="text-align:center; padding: 4rem 1rem; color: var(--text-muted);">
            <p style="font-size: 1.05rem; font-weight: 600; margin-bottom: 6px;">Look up a unit's full service history</p>
            <p style="font-size: 0.9rem;">Type a plate / engine number, customer username, or motorcycle model above.<br>
            Results include released jobs, so returning units' previous tuning setups are always recoverable.</p>
        </div>
    `;

    document.getElementById('historySearchInput').focus();
}

window.searchHistory = async function () {
    const q = document.getElementById('historySearchInput').value.trim();

    if (q.length < 2) {
        showNotification('Enter at least 2 characters to search.', 'error');
        return;
    }

    try {
        const response = await apiFetch(`/api/jobs/search?q=${encodeURIComponent(q)}`);
        if (!response.ok) {
            showNotification('Search failed.', 'error');
            return;
        }

        renderHistoryResults(await response.json(), q);
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

function renderHistoryResults(jobs, q) {
    const content = document.getElementById('mainContentArea');

    if (jobs.length === 0) {
        content.innerHTML = `
            <div style="text-align:center; padding: 4rem 1rem; color: var(--text-muted);">
                <p style="font-size: 1.05rem; font-weight: 600;">No records found for "${esc(q)}"</p>
                <p style="font-size: 0.9rem; margin-top: 6px;">Check the spelling, or try part of the plate number only.</p>
            </div>
        `;
        return;
    }

    let rows = '';
    jobs.forEach(job => {
        const isReleased = job.stage === 'Release';
        const stageBadge = isReleased
            ? `<span class="badge-good">RELEASED</span>`
            : `<span class="badge-low" style="background:#fef9c3; color:#92400e; border-color:#fde68a;">${esc(job.stage).toUpperCase()}</span>`;

        const claim = job.is_warranty_claim
            ? `<div style="color:#92400e; font-size:0.72rem; font-weight:700; margin-top:3px;">RE-SERVICE CLAIM</div>`
            : '';

        const setup = job.specs
            ? `Oil: ${esc(job.specs.oil)}<br>Seals: ${esc(job.specs.oilSeal)} / ${esc(job.specs.dustSeal)}<br>Springs: ${esc(job.specs.springs)}`
            : `<span style="color:var(--text-muted);">No tuning logged yet</span>`;

        const bill = job.specs
            ? `<strong style="color:#15803d;">${peso(job.specs.totalBill || 0)}</strong>`
            : '—';

        const warrantyText = job.warranty_status || 'Pending';
        const warrantyColor = warrantyText.includes('Active') ? '#15803d'
            : (warrantyText.includes('Expired') ? '#b91c1c' : 'var(--text-muted)');

        rows += `<tr>
            <td>${esc(job.date_in)}</td>
            <td><strong>${esc(job.customer)}</strong></td>
            <td><strong>${esc(job.moto_model)}</strong><br><code style="color:#6b7280; font-size:0.8rem;">${esc(job.plate_number)}</code></td>
            <td>${stageBadge}${claim}</td>
            <td style="font-size:0.8rem; line-height:1.5;">${setup}</td>
            <td style="font-size:0.8rem; color:${warrantyColor}; font-weight:600;">${esc(warrantyText)}</td>
            <td>${bill}</td>
        </tr>`;
    });

    content.innerHTML = `
        <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
            <strong>${jobs.length}</strong> record${jobs.length === 1 ? '' : 's'} found for "<strong>${esc(q)}</strong>"
        </p>
        <div class="table-container"><table class="data-table">
            <thead><tr>
                <th>Date In</th><th>Customer</th><th>Unit</th><th>Status</th>
                <th>Tuning Setup</th><th>Warranty</th><th>Billed</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
    `;
}
