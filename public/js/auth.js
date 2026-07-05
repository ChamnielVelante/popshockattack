// ============================================================
// MotoTrack — Authentication (login, registration, logout)
// ============================================================

window.toggleAuthMode = function (mode) {
    document.getElementById('mainLoginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('forgotForm').classList.add('hidden');
    document.getElementById('loginError').classList.add('hidden');

    if (mode === 'register') {
        document.getElementById('registerForm').classList.remove('hidden');
    } else if (mode === 'forgot') {
        document.getElementById('forgotForm').classList.remove('hidden');
    } else {
        document.getElementById('mainLoginForm').classList.remove('hidden');
    }
};

window.handleRegister = async function (e) {
    e.preventDefault();

    // Same double-submission guard as login
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    const originalLabel = submitBtn.innerText;
    submitBtn.innerText = 'Creating account...';

    const username = document.getElementById('regUser').value.trim().toLowerCase();
    const password = document.getElementById('regPass').value.trim();
    const confirm = document.getElementById('regPassConfirm').value.trim();

    try {
        if (password !== confirm) {
            showNotification('Error: Passwords do not match.', 'error');
            return;
        }

        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            showNotification('Account registered! Pending staff approval.', 'success');
            e.target.reset();
            toggleAuthMode('login');
        } else {
            const data = await response.json().catch(() => ({}));
            showNotification(data.message || 'Registration failed.', 'error');
        }
    } catch (err) {
        showNotification('Server connection error. Is Laravel running?', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalLabel;
    }
};

window.handleForgot = function (e) {
    e.preventDefault();
    // Passwords are hashed server-side and there is no reset-token flow yet,
    // so show a generic message (also avoids user enumeration).
    showNotification('Please contact shop staff to reset your password.', 'warning');
    toggleAuthMode('login');
};

window.handleUnifiedLogin = async function (e) {
    e.preventDefault();

    // Prevent double submission (double-click or Enter + click): one request,
    // one welcome toast. The button doubles as the loading indicator.
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    const originalLabel = submitBtn.innerText;
    submitBtn.innerText = 'Logging in...';

    const username = document.getElementById('loginUser').value.trim().toLowerCase();
    const password = document.getElementById('loginPass').value.trim();
    const err = document.getElementById('loginError');
    err.classList.add('hidden');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            err.classList.remove('hidden');
            err.innerText = data.message || 'Invalid credentials.';
            return;
        }

        const data = await response.json();
        authToken = data.token;
        localStorage.setItem('mt_token', authToken);

        if (data.user.role === 'admin') {
            loginSuccess('Shop Owner', 'admin');
            showNotification('Welcome back, Owner!', 'success');
        } else if (data.user.role === 'staff') {
            loginSuccess('Head Tech', 'staff');
            showNotification('Workspace accessed.', 'success');
        } else {
            loginSuccess(data.user.username, 'customer');
            showNotification('Welcome to your portal.', 'success');
        }
    } catch (error) {
        console.error('Login failed:', error);
        err.classList.remove('hidden');
        err.innerText = 'Server connection error.';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalLabel;
    }
};

async function loginSuccess(userName, roleName) {
    currentUser = userName;
    currentRole = roleName;

    // Persist the session so it survives a page refresh
    localStorage.setItem('mt_session_user', userName);
    localStorage.setItem('mt_session_role', roleName);

    document.getElementById('view-login').classList.remove('active-view');
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-system').classList.remove('hidden');
    document.getElementById('view-system').classList.add('active-view');
    document.getElementById('displayRole').innerText = roleName.toUpperCase();

    await syncAllData();
    buildSidebar();
}

window.logout = function () {
    openModal('modal-logout');
};

// User-initiated logout (the confirm modal's "Yes, Log out" button).
window.executeLogout = async function () {
    // Revoke the token server-side (best effort)
    try {
        if (authToken) {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${authToken}` },
            });
        }
    } catch (error) {
        console.error('Logout request failed:', error);
    }

    resetSession();
    showNotification('Logged out successfully!', 'success');
};

// Session-expiry path (called by apiFetch on 401): the token is already dead
// server-side, so skip the revoke call and show only the expiry message —
// not a misleading "Logged out successfully!".
window.forceLogout = function (message) {
    resetSession();
    showNotification(message, 'error');
};

// Clear the local session and return to the login screen.
function resetSession() {
    localStorage.removeItem('mt_session_user');
    localStorage.removeItem('mt_session_role');
    localStorage.removeItem('mt_token');
    authToken = null;
    currentUser = null;
    currentRole = null;

    document.getElementById('view-system').classList.remove('active-view');
    document.getElementById('view-system').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('view-login').classList.add('active-view');
    document.getElementById('mainLoginForm').reset();
    document.getElementById('loginError').classList.add('hidden');

    closeModal('modal-logout');
}
