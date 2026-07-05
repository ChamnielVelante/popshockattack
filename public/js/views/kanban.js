// ============================================================
// MotoTrack — Kanban stage-gate board
// Admin sees it read-only; staff move jobs, assign mechanics,
// and log specs from here.
// ============================================================

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
