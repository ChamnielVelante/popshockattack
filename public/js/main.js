// ============================================================
// MotoTrack — Bootstrap
// Restores a saved session on page load (loaded last).
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
    // Fill the intake form's brand dropdown from the shared brand list,
    // so the form and the admin brand chart always agree.
    const brandSelect = document.getElementById('in_brand');
    if (brandSelect) {
        MOTO_BRANDS.forEach(b => brandSelect.add(new Option(b, b)));
        brandSelect.add(new Option('Others (type it below)', 'Others'));
    }

    const savedUser = localStorage.getItem('mt_session_user');
    const savedRole = localStorage.getItem('mt_session_role');

    // Only auto-login when we still hold a token; if it has been revoked,
    // the first API call returns 401 and apiFetch() sends us back to login.
    if (savedUser && savedRole && authToken) {
        loginSuccess(savedUser, savedRole);
    }
});
