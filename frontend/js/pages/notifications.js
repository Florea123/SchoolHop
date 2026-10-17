import { api } from '../core/api.js';
import { mountShell } from '../core/layout.js';
import { $, $$, html, raw, renderError, showError, relativeTime } from '../core/ui.js';

const content = $('#content');
const SAFE_LINK = /^[a-z0-9-]+\.html(\?[\w%=&.-]*)?$/i;

async function load() {
  try {
    const { notifications, unread } = await api.get('/notifications');
    $('#readAll').hidden = !unread;
    if (!notifications.length) {
      content.innerHTML = '<div class="empty-state"><p>Nicio notificare încă.</p></div>';
      return;
    }
    content.innerHTML = notifications.map((n) => raw(html`
      <button class="card notif ${n.isRead ? 'read' : 'unread'}" data-id="${n.id}" data-link="${n.link && SAFE_LINK.test(n.link) ? n.link : ''}">
        <span class="dot" aria-hidden="true"></span>
        <span><span class="strong">${n.title}</span><br><span class="small">${n.message}</span><span class="time" style="display:block">${relativeTime(n.createdAt)}</span></span>
      </button>`)).join('');
    $$('.notif').forEach((el) => el.addEventListener('click', async () => {
      try {
        if (el.classList.contains('unread')) await api.post(`/notifications/${el.dataset.id}/read`);
        if (el.dataset.link) window.location.href = el.dataset.link;
        else load();
      } catch (err) { showError(err); }
    }));
  } catch (err) {
    renderError(content, err, load);
  }
}

$('#readAll').addEventListener('click', async () => {
  try {
    await api.post('/notifications/read-all');
    await mountShell({});
    load();
  } catch (err) { showError(err); }
});

mountShell({}).then(load).catch((err) => renderError(content, err));
