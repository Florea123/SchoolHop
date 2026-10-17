import { api } from '../core/api.js';
import { mountShell, bindBack } from '../core/layout.js';
import { $, html, raw, renderError } from '../core/ui.js';

const content = $('#content');

async function load() {
  try {
    await mountShell({ active: 'profile', roles: ['parent', 'parent_driver', 'community_driver'] });
    bindBack($('#back'), 'profile.html');
    const { badges } = await api.get('/me/badges');
    const earned = badges.filter((b) => b.earned);
    content.innerHTML = html`
      <p class="strong" style="margin-bottom:12px">${earned.length} din ${badges.length} insigne obținute</p>
      <div class="card-grid cols-2">
      ${badges.map((b) => raw(html`
        <div class="card badge-card ${b.earned ? '' : 'locked'}">
          <div class="badge-icon" aria-hidden="true">${b.title.charAt(0)}</div>
          <div class="badge-body">
            <div class="strong">${b.title} ${b.earned ? raw('<span class="badge badge-green">obținută</span>') : ''}</div>
            <div class="small muted">${b.description}</div>
            ${b.earned ? '' : raw(html`<div class="bar" aria-label="Progres"><span style="width:${Math.round(b.progress * 100)}%"></span></div><div class="small muted">${Math.min(b.value, b.goal)} / ${b.goal}</div>`)}
          </div>
        </div>`))}
      </div>
      <a class="btn btn-secondary btn-block" href="profile.html">Înapoi la profil</a>`;
  } catch (err) {
    renderError(content, err, load);
  }
}

load();
