// ============================================================
// MotoTrack — Customer portal
// Read-only view of the customer's own jobs, warranty status,
// and printable receipts.
// ============================================================

// Visual stepper showing how far the unit has moved through the workflow.
// Completed stages are green with a check, the current stage is highlighted,
// and upcoming stages stay grey. A released unit shows fully complete.
function buildStageTracker(currentStage) {
    const currentIdx = STAGES.indexOf(currentStage);
    const released = currentStage === 'Release';

    let steps = '';
    STAGES.forEach((stage, i) => {
        const cls = (i < currentIdx || released) ? 'done' : (i === currentIdx ? 'current' : '');
        const dotContent = (i < currentIdx || released) ? '✓' : '';
        steps += `<div class="stage-step ${cls}"><div class="stage-dot">${dotContent}</div><div class="stage-label">${stage}</div></div>`;
    });

    return `<div class="stage-tracker">${steps}</div>`;
}

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

            const statusLine = job.stage === 'Release'
                ? `<span style="color:#15803d; font-weight:700;">Completed — ready for pickup/released</span>`
                : `<span style="color:var(--primary); font-weight:700;">${esc(job.stage)}</span> — work in progress`;

            html += `<div class="card" style="border-top: 5px solid var(--primary);">${wBadge}
                <h3 style="color: var(--text-primary); font-size: 1.4rem; margin-bottom: 10px;">${esc(job.moto_model)}</h3>
                <p><strong>Status:</strong> ${statusLine}</p>
                ${buildStageTracker(job.stage)}
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
