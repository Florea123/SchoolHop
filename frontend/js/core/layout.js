// App shell: verificare autentificare, header cu navigație, contor notificări

import { api, auth } from './api.js';
import { html, raw } from './ui.js';

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  rides: '<path d="M19 17h2v-4l-2.5-3.5c-.4-.6-1-1-1.7-1H7.2c-.7 0-1.3.4-1.7 1L3 13v4h2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>',
  publish: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
};

export function icon(name) {
  return raw(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`);
}

const PARENT_NAV = [
  { key: 'home', href: 'home.html', label: 'Acasă', icon: 'home' },
  { key: 'search', href: 'search.html', label: 'Caută', icon: 'search' },
  { key: 'rides', href: 'my-rides.html', label: 'Cursele mele', short: 'Curse', icon: 'rides' },
  { key: 'publish', href: 'publish.html', label: 'Publică', icon: 'publish' },
  { key: 'profile', href: 'profile.html', label: 'Profil', icon: 'profile' },
];
const ADMIN_NAV = [
  { key: 'dashboard', href: 'dashboard.html', label: 'Panou școală', icon: 'dashboard' },
  { key: 'profile', href: 'profile.html', label: 'Cont', icon: 'profile' },
];

function goLogin() {
  const next = encodeURIComponent(window.location.pathname.replace(/^\//, '') + window.location.search);
  window.location.replace(`login.html?next=${next}`);
}

/**
 * Montează header-ul + navigația și întoarce profilul utilizatorului (/api/me).
 * @param {{active: string, roles?: string[]}} options
 */
export async function mountShell({ active, roles } = {}) {
  if (!auth.isLoggedIn) {
    goLogin();
    return new Promise(() => {}); // pagina se schimbă
  }
  const me = await api.get('/me');
  const isAdmin = me.user.role === 'admin';
  if (roles && !roles.includes(me.user.role)) {
    window.location.replace(isAdmin ? 'dashboard.html' : 'home.html');
    return new Promise(() => {});
  }

  const nav = isAdmin ? ADMIN_NAV : PARENT_NAV;
  const header = document.getElementById('appHeader');
  header.className = 'app-header';
  header.innerHTML = html`
    <div class="app-header-inner">
      <a class="brand" href="${isAdmin ? 'dashboard.html' : 'home.html'}" aria-label="SchoolHop - acasă">
        <span class="brand-name">School<b>Hop</b></span>
      </a>
      ${me.school ? raw(`<span class="brand-school" title="${me.school.name.replace(/"/g, '&quot;')}">${me.school.shortName.replace(/</g, '&lt;')}</span>`) : ''}
      <span class="header-spacer"></span>
      <nav class="app-nav" aria-label="Navigație principală">
        ${nav.map((item) => raw(html`<a class="nav-item" href="${item.href}" ${raw(item.key === active ? 'aria-current="page"' : '')}>${icon(item.icon)}${item.short ? raw(html`<span class="label-long">${item.label}</span><span class="label-short">${item.short}</span>`) : raw(html`<span>${item.label}</span>`)}</a>`))}
      </nav>
      <a class="btn-icon bell" href="notifications.html" aria-label="Notificări${me.unreadNotifications ? ` (${me.unreadNotifications} necitite)` : ''}">
        ${icon('bell')}
        ${me.unreadNotifications ? raw(`<span class="bell-count">${me.unreadNotifications > 99 ? '99+' : me.unreadNotifications}</span>`) : ''}
      </a>
    </div>`;
  return me;
}

// Buton „înapoi” care folosește istoricul dacă există, altfel o pagină implicită
export function bindBack(button, fallbackHref) {
  button.addEventListener('click', (e) => {
    e.preventDefault();
    if (document.referrer && new URL(document.referrer).origin === window.location.origin && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = fallbackHref;
    }
  });
}
