// ============================================================
// MotoTrack — User actions (forms + mutations)
// Every handler posts to the API, re-syncs the caches, then
// re-renders the relevant view.
// ============================================================

// ------------------------------------------------------------
// Service jobs
// ------------------------------------------------------------

// Show the free-text brand field only when "Others" is selected.
window.toggleOtherBrand = function () {
    const isOther = document.getElementById('in_brand').value === 'Others';
    const group = document.getElementById('otherBrandGroup');
    const input = document.getElementById('in_brand_other');
    group.classList.toggle('hidden', !isOther);
    input.required = isOther;
    if (!isOther) input.value = '';
};

window.submitIntake = async function (e) {
    e.preventDefault();
    const plate = document.getElementById('in_plate').value.trim().toUpperCase();

    // A unit can only be in the shop once at a time
    if (dbJobs.some(job => job.plate_number === plate && job.stage !== 'Release')) {
        showNotification(`Error: Plate number ${plate} is already active.`, 'error');
        return;
    }

    // Brand comes from the dropdown, or the manual field when "Others"
    const brandChoice = document.getElementById('in_brand').value;
    const brand = brandChoice === 'Others'
        ? document.getElementById('in_brand_other').value.trim()
        : brandChoice;

    if (!brand) {
        showNotification('Please enter the motorcycle brand.', 'error');
        return;
    }

    const payload = {
        customer: document.getElementById('in_cust').value.toLowerCase().trim(),
        // Stored as "<Brand> <Model>" — the brand chart groups by the first word
        moto: `${brand} ${document.getElementById('in_moto').value.trim()}`.trim(),
        plate: plate,
        dateIn: toISODate(),
    };

    try {
        const response = await apiFetch('/api/jobs', { method: 'POST', body: JSON.stringify(payload) });

        if (response.ok) {
            e.target.reset();
            toggleOtherBrand(); // re-hide the "Others" field after the reset
            closeModal('modal-intake');
            showNotification('Intake successfully registered!', 'success');
            await loadView('kanban');
        } else {
            const data = await response.json().catch(() => ({}));
            showNotification(data.message || 'Error saving to database.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

window.moveStage = async function (id, nextStage) {
    try {
        const response = await apiFetch(`/api/jobs/${id}/stage`, {
            method: 'PUT',
            body: JSON.stringify({ stage: nextStage }),
        });

        if (response.ok) {
            showNotification(`Moved to ${nextStage}`, 'success');
            await loadView('kanban');
        } else {
            showNotification('Error moving job in database.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

window.assignMechanic = async function (id, mechanicName) {
    try {
        const response = await apiFetch(`/api/jobs/${id}/mechanic`, {
            method: 'PUT',
            body: JSON.stringify({ mechanic: mechanicName }),
        });

        if (response.ok) {
            showNotification(mechanicName ? `Assigned to ${mechanicName}` : 'Mechanic unassigned', 'success');
            await loadView('kanban');
        } else {
            showNotification('Error saving mechanic to database.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

window.deleteJob = async function (id) {
    if (!confirm('Are you sure you want to cancel and delete this job from the database?')) return;

    try {
        const response = await apiFetch(`/api/jobs/${id}`, { method: 'DELETE' });

        if (response.ok) {
            showNotification('Job permanently deleted.', 'success');
            await loadView('kanban');
        } else {
            showNotification('Error deleting job.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

// ------------------------------------------------------------
// Tuning specs & billing
// ------------------------------------------------------------

window.openSpecs = function (id) {
    document.getElementById('spec_job_id').value = id;
    document.getElementById('spec_is_warranty').checked = false;
    openModal('modal-specs');
};

function computeBill({ enginePrice, isWarranty, osSize, osQty, dsSize, dsQty, springs }) {
    if (isWarranty) return 0; // back-jobs under warranty are free

    let bill = enginePrice;
    const oilSealPrice = enginePrice >= 2800 ? 500 : 300;

    if (osSize !== 'None') bill += osQty * oilSealPrice;
    if (dsSize !== 'None') bill += dsQty * 75;
    if (springs !== 'None') bill += 580;

    return bill;
}

window.submitSpecs = async function (e) {
    e.preventDefault();
    const jobId = document.getElementById('spec_job_id').value;

    const enginePrice = parseInt(document.getElementById('spec_engine').value) || 1500;
    const isWarranty = document.getElementById('spec_is_warranty').checked;
    const oil = document.getElementById('spec_oil').value;
    const springs = document.getElementById('spec_springs').value;
    const osSize = document.getElementById('spec_oil_seal').value;
    const osQty = parseInt(document.getElementById('spec_oil_seal_qty').value) || 0;
    const osSide = document.getElementById('spec_oil_seal_side').value;
    const dsSize = document.getElementById('spec_dust_seal').value;
    const dsQty = parseInt(document.getElementById('spec_dust_seal_qty').value) || 0;
    const dsSide = document.getElementById('spec_dust_seal_side').value;

    if ((osSize !== 'None' && osQty === 0) || (dsSize !== 'None' && dsQty === 0)) {
        showNotification('Specify quantity for seals.', 'error');
        return;
    }

    const totalBill = computeBill({ enginePrice, isWarranty, osSize, osQty, dsSize, dsQty, springs });

    const payload = {
        enginePrice: enginePrice,
        totalBill: totalBill,
        oil: oil,
        oilSeal: osSize !== 'None' ? `${osSize} (${osQty} - ${osSide})` : 'None',
        dustSeal: dsSize !== 'None' ? `${dsSize} (${dsQty} - ${dsSide})` : 'None',
        springs: springs,
        isWarranty: isWarranty,

        // Raw values so the backend can deduct inventory
        rawOil: oil,
        rawOsSize: osSize,
        rawOsQty: osQty,
        rawDsSize: dsSize,
        rawDsQty: dsQty,
        rawSprings: springs,
    };

    try {
        const response = await apiFetch(`/api/jobs/${jobId}/specs`, { method: 'PUT', body: JSON.stringify(payload) });

        if (response.ok) {
            e.target.reset();
            closeModal('modal-specs');
            showNotification(`Specs logged. Bill: ₱${totalBill.toLocaleString()}`, 'success');
            await loadView('kanban');
        } else {
            showNotification('Error logging specs.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

// ------------------------------------------------------------
// Inventory items
// ------------------------------------------------------------

window.openItemModal = function (mode, id = null) {
    document.getElementById('edit_item_mode').value = mode;
    const modal = document.getElementById('modal-edit-item');
    const form = modal.querySelector('form');

    if (mode === 'add') {
        document.getElementById('itemModalTitle').innerText = 'Add New Item';
        form.reset();
    } else {
        document.getElementById('itemModalTitle').innerText = 'Edit Item';
        const item = dbInv.find(i => i.id === id);

        if (!item) {
            showNotification('Error: Could not load item data.', 'error');
            return;
        }

        document.getElementById('edit_item_id').value = item.id;
        document.getElementById('m_item_name').value = item.name;
        document.getElementById('m_item_desc').value = item.description || '';
        document.getElementById('m_item_stock').value = item.stock || 0;
        document.getElementById('m_item_threshold').value = item.threshold || 0;
        document.getElementById('m_item_price').value = item.price || 0;
    }

    modal.classList.remove('hidden');
};

window.submitItemForm = async function (e) {
    e.preventDefault();
    const mode = document.getElementById('edit_item_mode').value;

    const payload = {
        name: document.getElementById('m_item_name').value.trim(),
        description: document.getElementById('m_item_desc').value,
        stock: parseInt(document.getElementById('m_item_stock').value) || 0,
        threshold: parseInt(document.getElementById('m_item_threshold').value) || 0,
        price: parseFloat(document.getElementById('m_item_price').value) || 0,
    };

    try {
        let response;
        if (mode === 'add') {
            // New items get a random 6-digit item number
            payload.item_no = String(Math.floor(Math.random() * 900000) + 100000);
            response = await apiFetch('/api/inventory', { method: 'POST', body: JSON.stringify(payload) });
        } else {
            const id = document.getElementById('edit_item_id').value;
            response = await apiFetch(`/api/inventory/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        }

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to save item.');
        }

        closeModal('modal-edit-item');
        showNotification(mode === 'add' ? 'New item saved to database.' : 'Item updated in database.', 'success');
        await loadView('inventory');
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
};

window.openAddStockModal = function (id) {
    const item = dbInv.find(i => i.id === id);
    if (!item) {
        showNotification('Error: Could not load item data.', 'error');
        return;
    }

    document.getElementById('add_stock_item_id').value = item.id;
    document.getElementById('add_stock_item_name').innerText = item.name;
    document.getElementById('add_stock_qty').value = 10;
    openModal('modal-add-stock');
};

window.submitAddStock = async function (e) {
    e.preventDefault();
    const id = document.getElementById('add_stock_item_id').value;
    const qty = parseInt(document.getElementById('add_stock_qty').value);
    if (isNaN(qty) || qty <= 0) return;

    try {
        const response = await apiFetch(`/api/inventory/${id}/add-stock`, {
            method: 'PUT',
            body: JSON.stringify({ qty }),
        });

        if (response.ok) {
            closeModal('modal-add-stock');
            showNotification(`Added ${qty} units.`, 'success');
            await loadView('inventory');
        } else {
            showNotification('Error adding stock.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

window.deleteItem = async function (id) {
    const item = dbInv.find(i => i.id === id);
    const label = item ? item.name : 'this item';
    if (!confirm(`Are you sure you want to delete "${label}"? This action cannot be undone.`)) return;

    try {
        const response = await apiFetch(`/api/inventory/${id}`, { method: 'DELETE' });

        if (response.ok) {
            showNotification('Item successfully deleted.', 'success');
            await loadView('inventory');
        } else {
            showNotification('Error deleting item.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

// ------------------------------------------------------------
// User accounts
// ------------------------------------------------------------

window.openUserModal = function (mode, id = null) {
    document.getElementById('edit_user_mode').value = mode;
    const form = document.getElementById('modal-manage-user').querySelector('form');
    const passwordInput = document.getElementById('m_password');

    if (mode === 'add') {
        document.getElementById('userModalTitle').innerText = 'Add User';
        form.reset();
        passwordInput.required = true;
        passwordInput.placeholder = '';
    } else {
        document.getElementById('userModalTitle').innerText = 'Edit User';
        const user = dbUsers.find(u => u.id === id);

        if (!user) {
            showNotification('Error: Could not load user data.', 'error');
            return;
        }

        document.getElementById('edit_user_id').value = user.id;
        document.getElementById('m_username').value = user.username;
        // Hashes are never sent to the browser; blank means "keep current password"
        passwordInput.value = '';
        passwordInput.required = false;
        passwordInput.placeholder = 'Leave blank to keep current password';
        document.getElementById('m_role').value = user.role;
    }

    openModal('modal-manage-user');
};

window.submitUserForm = async function (e) {
    e.preventDefault();
    const mode = document.getElementById('edit_user_mode').value;
    const username = document.getElementById('m_username').value.trim().toLowerCase();
    const password = document.getElementById('m_password').value;
    const role = document.getElementById('m_role').value;

    try {
        let response;
        if (mode === 'add') {
            response = await apiFetch('/api/users', {
                method: 'POST',
                body: JSON.stringify({ username, password, role }),
            });
        } else {
            const id = document.getElementById('edit_user_id').value;
            const payload = { username, role };
            if (password) payload.password = password;

            response = await apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        }

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to save user.');
        }

        closeModal('modal-manage-user');
        showNotification('User saved to database.', 'success');
        await loadView('users');
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
};

window.deleteUser = async function (id) {
    const user = dbUsers.find(u => u.id === id);
    const username = user ? user.username : 'this user';

    if (username === 'admin') {
        showNotification('Cannot delete main admin.', 'error');
        return;
    }
    if (!confirm(`Delete user ${username}?`)) return;

    try {
        const response = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });

        if (response.ok) {
            showNotification('User deleted.', 'success');
            await loadView('users');
        } else {
            const data = await response.json().catch(() => ({}));
            showNotification(data.message || 'Error deleting user.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

window.approveUser = async function (id) {
    try {
        const response = await apiFetch(`/api/users/${id}/approve`, { method: 'PUT' });

        if (response.ok) {
            showNotification('Account approved!', 'success');
            await loadView('approvals');
        } else {
            showNotification('Error approving user.', 'error');
        }
    } catch (error) {
        showNotification('Server connection error.', 'error');
    }
};

// ------------------------------------------------------------
// Expenses
// ------------------------------------------------------------

window.submitExpense = async function (e) {
    e.preventDefault();
    const description = document.getElementById('exp_desc').value;
    const amount = parseFloat(document.getElementById('exp_amount').value);

    try {
        const response = await apiFetch('/api/expenses', {
            method: 'POST',
            body: JSON.stringify({ description, amount, date: toISODate() }),
        });

        if (response.ok) {
            e.target.reset();
            closeModal('modal-add-expense');
            showNotification('Expense recorded successfully.', 'success');
            await loadView('overview');
        } else {
            showNotification('Error saving expense to database.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};
