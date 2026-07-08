// ============================================================
// MotoTrack — Notification bell
// Shows stage-change notifications for the logged-in user
// (owner sees all units; customers see their own motorcycle).
// ============================================================

let notifUnreadCount = 0;
let notifItems = [];

async function fetchNotifications() {
    if (!authToken || !currentRole) return;

    try {
        const response = await apiFetch('/api/notifications');
        if (!response.ok) return;

        const data = await response.json();
        notifUnreadCount = data.unread_count;
        notifItems = data.notifications;
        renderNotifBadge();
        renderNotifPanel();
    } catch (error) {
        console.error('Failed to pull notifications:', error);
    }
}

function renderNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    badge.innerText = notifUnreadCount > 9 ? '9+' : notifUnreadCount;
    badge.classList.toggle('hidden', notifUnreadCount === 0);
}

// "3m ago" / "2h ago" / "Jul 6" relative timestamps for the panel
function notifTimeAgo(isoString) {
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(isoString).toLocaleString('en-US', { month: 'short', day: 'numeric' });
}

function renderNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;

    if (notifItems.length === 0) {
        panel.innerHTML = `<div class="notif-empty">No notifications yet.</div>`;
        return;
    }

    let html = `<div class="notif-header">Notifications</div>`;
    notifItems.forEach(n => {
        const unread = !n.read_at;
        html += `<div class="notif-item${unread ? ' unread' : ''}">
            <div class="notif-message">${esc(n.data.message)}</div>
            <div class="notif-time">${notifTimeAgo(n.created_at)}</div>
        </div>`;
    });
    panel.innerHTML = html;
}

window.toggleNotifPanel = async function () {
    const panel = document.getElementById('notifPanel');
    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');

    // Opening the panel marks everything as read (badge clears immediately;
    // items keep their unread highlight until the next data sync).
    if (opening && notifUnreadCount > 0) {
        notifUnreadCount = 0;
        renderNotifBadge();
        try {
            await apiFetch('/api/notifications/mark-read', { method: 'PUT' });
        } catch (error) {
            console.error('Failed to mark notifications read:', error);
        }
    }
};

// Clicking anywhere outside the bell closes the panel
document.addEventListener('click', (e) => {
    const wrap = document.getElementById('notifWrap');
    const panel = document.getElementById('notifPanel');
    if (wrap && panel && !wrap.contains(e.target)) {
        panel.classList.add('hidden');
    }
});
