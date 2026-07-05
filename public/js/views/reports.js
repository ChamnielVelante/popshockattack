// ============================================================
// MotoTrack — Sales & financial reports (admin)
// Released-job transactions with date filtering and printing.
// ============================================================

function renderReports(ctx) {
    ctx.title.innerText = 'Sales & Financial Reports';
    ctx.desc.innerText = 'Itemized breakdown of all completed and released services.';
    ctx.actions.innerHTML = `
        <input type="date" id="filterStart" class="search-bar" style="width: 150px; min-width: auto;">
        <input type="date" id="filterEnd" class="search-bar" style="width: 150px; min-width: auto;">
        <button class="btn btn-primary" onclick="filterReports()">Filter Data</button>
        <button class="btn" style="background:#555; color:#fff;" onclick="window.print()">${icon('printer')} Print Report</button>
    `;

    renderReportTable(dbJobs.filter(j => j.stage === 'Release' && j.specs));
}

window.filterReports = function () {
    const start = document.getElementById('filterStart').value;
    const end = document.getElementById('filterEnd').value;
    if (!start || !end) {
        showNotification('Please select both dates.', 'error');
        return;
    }

    const filtered = dbJobs.filter(j => j.stage === 'Release' && j.specs && j.date_in >= start && j.date_in <= end);
    renderReportTable(filtered);
};

function renderReportTable(jobsArray) {
    let totalSales = 0;
    let rowsHtml = `<div class="table-container"><table class="data-table"><thead><tr><th>Date</th><th>Customer</th><th>Motorcycle</th><th>Parts Used</th><th>Total Billed</th></tr></thead><tbody>`;

    jobsArray.forEach(job => {
        totalSales += Number(job.specs.totalBill || 0);
        const wBadge = job.is_warranty_claim ? '<br><span style="color:#856404; font-size:0.75rem; font-weight:bold;">(WARRANTY CLAIM)</span>' : '';

        rowsHtml += `<tr>
            <td>${esc(job.date_in)}</td>
            <td><strong>${esc(job.customer)}</strong></td>
            <td>${esc(job.moto_model)} (${esc(job.plate_number)})</td>
            <td style="font-size:0.85rem; color:#666;">
                Base: ₱${job.specs.enginePrice}<br>
                ${job.specs.oilSeal !== 'None' ? 'Oil Seals<br>' : ''}
                ${job.specs.dustSeal !== 'None' ? 'Dust Seals<br>' : ''}
                ${job.specs.springs !== 'None' ? 'Springs' : ''}
            </td>
            <td style="font-weight:bold; color:#28a745; font-size:1.1rem;">₱${Number(job.specs.totalBill || 0).toLocaleString()}${wBadge}</td>
        </tr>`;
    });

    rowsHtml += `</tbody></table></div>`;
    document.getElementById('mainContentArea').innerHTML = `
        <div style="background: #fff; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 5px solid #28a745; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <p style="font-size: 1rem; color: #555;">Total Shop Revenue Generated</p>
            <h2 style="color: #28a745; font-size: 2.5rem;">₱${totalSales.toLocaleString()}</h2>
        </div>${rowsHtml}`;
}
