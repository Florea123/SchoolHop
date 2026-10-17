// Pagina publică (fără cont) pentru bunici: statusul copilului și ora estimată
import { api } from '../core/api.js';
import { renderMap } from '../core/map.js';
import { $, html, raw, params, renderError, formatTime, formatDate } from '../core/ui.js';

const token = params().get('token');
const content = $('#content');
let timer;

const STATUS = {
  confirmed: 'Așteaptă mașina la punctul de întâlnire',
  picked_up: 'Este în mașină, în drum',
  arrived_at_school: 'A ajuns',
};

async function load() {
  try {
    if (!token) throw new Error('Linkul nu este complet');
    const s = await api.get(`/share/${encodeURIComponent(token)}`);
    document.title = `${s.childName} · SchoolHop`;
    content.innerHTML = html`
      <span class="badge badge-blue">Link live părinți / bunici</span>
      <h1 class="page-title" style="margin-top:10px">${s.childName} ${s.bookingStatus === 'arrived_at_school' ? 'a ajuns' : 'este în drum'}</h1>
      <p class="page-subtitle">${formatDate(s.departureTime)} · cu ${s.driverName} (${s.vehicle})</p>
      ${s.hasActiveAlert ? raw('<div class="callout callout-alert">Există o alertă activă pe această cursă. Părinții au fost anunțați.</div>') : ''}
      <div class="map-box" id="map"></div>
      <div class="card">
        <div class="share-status">${STATUS[s.bookingStatus] || ''}</div>
        <div class="progress"><span style="width:${Math.round(s.progress * 100)}%"></span></div>
        <div class="card-row"><span>Destinație</span><strong>${s.schoolName}</strong></div>
        <div class="card-row"><span>Punct de predare</span><strong>${s.dropoffPoint}</strong></div>
        <div class="card-row"><span>${s.bookingStatus === 'arrived_at_school' ? 'A ajuns la' : 'Sosire estimată'}</span><strong>${formatTime(s.dropoffTime || s.eta)}</strong></div>
      </div>`;
    renderMap($('#map'), {
      route: s.route,
      points: [{ ...s.route[0], label: 'Plecare', kind: 'meet' }, { ...s.route[s.route.length - 1], label: 'Destinație', kind: 'school' }],
      car: s.rideStatus === 'in_progress' ? s.location : null,
    });
    clearTimeout(timer);
    if (!['completed', 'cancelled'].includes(s.rideStatus)) timer = setTimeout(load, 10000);
  } catch (err) {
    renderError(content, err);
  }
}

load();
