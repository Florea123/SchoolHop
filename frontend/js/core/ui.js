// Utilitare UI comune: toast, escape, formatare, parametri URL, stări de încărcare

const TZ = 'Europe/Bucharest';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// HTML de încredere: rezultatul lui html`` și raw(); se comportă ca un string obișnuit
class SafeHtml extends String {
  get __raw() { return true; }
  get value() { return this.toString(); }
}
export const raw = (value) => (value instanceof SafeHtml ? value : new SafeHtml(String(value ?? '')));

function renderValue(v) {
  if (v instanceof SafeHtml) return v.toString();
  if (Array.isArray(v)) return v.map(renderValue).join('');
  return escapeHtml(v);
}

// Template literal care face escape automat valorilor interpolate (rezultatele html``/raw() rămân neescapate)
export function html(strings, ...values) {
  const out = strings.reduce((acc, str, i) => acc + str + (i < values.length ? renderValue(values[i]) : ''), '');
  return new SafeHtml(out);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let toastTimer;
export function toast(message, { type = 'ok', icon } = {}) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.classList.toggle('error', type === 'error');
  el.textContent = `${icon || (type === 'error' ? '' : '')}  ${message}`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3800);
}

export function showError(err) {
  toast(err && err.message ? err.message : 'A apărut o eroare neașteptată', { type: 'error' });
}

export function params() {
  return new URLSearchParams(window.location.search);
}

export function requireParam(name) {
  const v = params().get(name);
  if (!v) throw new Error(`Lipsește parametrul „${name}” din adresă`);
  return v;
}

// Rulează o acțiune async cu butonul în stare de încărcare
export async function withLoading(button, fn) {
  const label = button.innerHTML;
  button.classList.add('is-loading');
  button.disabled = true;
  try {
    return await fn();
  } finally {
    button.classList.remove('is-loading');
    button.disabled = false;
    button.innerHTML = label;
  }
}

// Formatare (ora României)
export function formatTime(date) {
  return new Date(date).toLocaleTimeString('ro-RO', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}
export function formatDate(date, opts = { weekday: 'long', day: 'numeric', month: 'long' }) {
  const s = new Date(date).toLocaleDateString('ro-RO', { timeZone: TZ, ...opts });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function formatShortDate(date) {
  return formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' });
}
export function formatDateTime(date) {
  return `${formatShortDate(date)}, ${formatTime(date)}`;
}
export function isoDate(date) {
  return new Date(date).toLocaleDateString('sv-SE', { timeZone: TZ }); // AAAA-LL-ZZ
}
export function relativeTime(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'acum';
  if (diff < 3600) return `acum ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `acum ${Math.floor(diff / 3600)} h`;
  return formatShortDate(date);
}
export function lei(value) {
  const n = Number(value || 0);
  return n === 0 ? 'Gratuit' : `${n.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} lei`;
}
export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}
export function initials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}
export function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0];
}

// Următoarea zi de școală (luni-vineri), începând de mâine
export function nextSchoolDay(from = new Date()) {
  const d = new Date(from);
  do { d.setDate(d.getDate() + 1); } while ([0, 6].includes(d.getDay()));
  return isoDate(d);
}

export function addMinutesToTime(hhmm, delta) {
  const [h, m] = String(hhmm).slice(0, 5).split(':').map(Number);
  const total = (h * 60 + m + delta + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export const STATUS_LABELS = {
  confirmed: { text: 'Confirmată', cls: 'badge-teal' },
  picked_up: { text: 'În mașină', cls: 'badge-peach' },
  arrived_at_school: { text: 'Ajuns la școală', cls: 'badge-green' },
  cancelled: { text: 'Anulată', cls: 'badge-red' },
  scheduled: { text: 'Programată', cls: 'badge-teal' },
  in_progress: { text: 'În desfășurare', cls: 'badge-peach' },
  completed: { text: 'Finalizată', cls: 'badge-green' },
};

export function statusBadge(status) {
  const s = STATUS_LABELS[status] || { text: status, cls: '' };
  return raw(`<span class="badge ${s.cls}">${escapeHtml(s.text)}</span>`);
}

export function renderError(container, err, retry) {
  container.innerHTML = html`<div class="empty-state"><p>${err.message || 'Nu am putut încărca datele.'}</p>
    ${retry ? raw('<button class="btn btn-secondary btn-sm" data-retry style="margin-top:12px">Încearcă din nou</button>') : ''}</div>`;
  if (retry) container.querySelector('[data-retry]').addEventListener('click', retry);
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Browserul nu permite localizarea'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => reject(new Error('Nu am putut obține locația. Verifică permisiunile browserului.')),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
