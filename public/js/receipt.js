// ============================================================
// MotoTrack — Printable customer receipt
// ============================================================

window.printReceipt = function (jobId) {
    const job = dbJobs.find(j => j.id == jobId);

    if (!job || !job.specs) {
        showNotification('This unit has no completed billing yet.', 'error');
        return;
    }

    const customerName = esc(job.customer || currentUser);
    const dateStr = esc(job.date_in || 'N/A');
    const moto = esc(`${job.moto_model} (${job.plate_number})`);

    let partsHtml = '';
    if (job.specs.oilSeal && job.specs.oilSeal !== 'None') {
        partsHtml += `<div class="item-row"><span>Oil Seal: ${esc(job.specs.oilSeal)}</span><span>Included</span></div>`;
    }
    if (job.specs.dustSeal && job.specs.dustSeal !== 'None') {
        partsHtml += `<div class="item-row"><span>Dust Seal: ${esc(job.specs.dustSeal)}</span><span>Included</span></div>`;
    }
    if (job.specs.springs && job.specs.springs !== 'None') {
        partsHtml += `<div class="item-row"><span>Springs: ${esc(job.specs.springs)}</span><span>Included</span></div>`;
    }

    const printHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>MotoTrack Receipt - ${moto}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
                body {
                    font-family: 'Courier Prime', monospace;
                    color: #000;
                    background: #e5e7eb;
                    margin: 0;
                    padding: 40px 20px;
                    display: flex;
                    justify-content: center;
                }
                .receipt {
                    background: #fff;
                    width: 100%;
                    max-width: 380px;
                    padding: 30px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                    border-top: 5px solid #dc3545;
                }
                .header { text-align: center; margin-bottom: 20px; }
                .header h2 { margin: 0; color: #dc3545; font-size: 24px; letter-spacing: -1px; font-weight: bold; }
                .header p { margin: 4px 0; font-size: 13px; color: #555; }
                .divider { border-top: 1px dashed #bbb; margin: 15px 0; }
                .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                .row.bold { font-weight: 700; font-size: 15px; }
                .item-list { font-size: 13px; color: #333; }
                .item-row { display: flex; justify-content: space-between; padding: 4px 0; }
                .total-section { background: #f9fafb; padding: 15px; margin-top: 20px; border-radius: 4px; border: 1px solid #eee; }
                .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #dc3545; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }

                @media print {
                    body { background: #fff; padding: 0; display: block; }
                    .receipt { box-shadow: none; border-top: none; max-width: 100%; padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h2>POP SHOCK ATTACK</h2>
                    <p>Suspension Specialists & Tuning</p>
                    <p>San Pedro, Laguna</p>
                </div>

                <div class="row"><span>Date:</span> <span>${dateStr}</span></div>
                <div class="row"><span>Customer:</span> <span style="text-transform: capitalize;">${customerName}</span></div>
                <div class="row"><span>Unit:</span> <span>${moto}</span></div>
                <div class="row"><span>Assigned Tech:</span> <span>${esc(job.mechanic_name || 'Unassigned')}</span></div>

                <div class="divider"></div>
                <div class="row bold"><span>SERVICES & PARTS</span></div>
                <div class="divider"></div>

                <div class="item-list">
                    <div class="item-row">
                        <span>Base Engine/Labor</span>
                        <span>₱${Number(job.specs.enginePrice || 0).toLocaleString()}</span>
                    </div>
                    <div class="item-row">
                        <span>Oil: ${esc(job.specs.oil)}</span>
                        <span>Included</span>
                    </div>
                    ${partsHtml}
                </div>

                <div class="total-section">
                    <div class="total-row">
                        <span>TOTAL PAID:</span>
                        <span>₱${Number(job.specs.totalBill || 0).toLocaleString()}</span>
                    </div>
                </div>

                <div class="footer">
                    <p>Thank you for trusting MotoTrack!</p>
                    <p><strong>Warranty Status:</strong> ${esc(job.warranty_status || 'Pending')}</p>
                    <p style="margin-top: 15px;"><i>This acts as your official warranty claim stub. Please keep it safe.</i></p>
                </div>
            </div>

            <script>
                window.onload = function () {
                    setTimeout(() => window.print(), 500);
                };
            <\/script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
};
