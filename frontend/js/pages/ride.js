// Cursa live: poziția mașinii, ETA, copiii din mașină, SOS, partajare, acțiunile șoferului
import { api } from '../core/api.js';
import { mountShell, bindBack } from '../core/layout.js';
import { renderMap } from '../core/map.js';
import { $, html, raw, params, renderError, showError, toast, withLoading, formatTime, formatDate, firstName, initials, statusBadge, relativeTime } from '../core/ui.js';

const rideId = params().get('rideId');
const POLL_MS = 4000;
let me;
let state;
let pollTimer;
let gpsWatch = null;

function myBookings() {
  return state.bookings.filter((b) => b.parentId === me.user.id && b.parentId !== state.ride.driver.id);
}

function renderHeader() {
  const { ride } = state;
  const toSchool = ride.direction === 'to_school';
  const kids = state.bookings.map((b) => firstName(b.childName));
  $('#eyebrow').textContent = state.status === 'in_progress' ? (toSchool ? 'În drum spre școală' : 'În drum spre casă') : 'Cursa';
  $('#statusBadge').innerHTML = statusBadge(state.status).value;
  $('#title').textContent = state.role === 'driver'
    ? `Cursa ta · ${formatTime(ride.departureTime)}`
    : `${kids.filter((k, i) => state.bookings[i].parentId === me.user.id).join(' și ') || 'Copilul'} ${toSchool ? 'merge la școală' : 'vine acasă'}`;
  $('#subtitle').textContent = `${formatDate(ride.departureTime)} · ${ride.departureAddress} → ${ride.destination}`;
}

function renderAlerts() {
  $('#alerts').innerHTML = state.alerts.map((a) => raw(html`
    <div class="callout callout-alert">
      <span>${a.alert_type === 'sos' ? '' : ''}</span>
      <div><strong>${a.alert_type === 'sos' ? 'Alertă SOS' : 'Deviere de la traseu'}</strong> · ${relativeTime(a.created_at)}<br>${a.message}
      <br><a href="alert.html?rideId=${rideId}" class="strong">Vezi detalii și confirmă situația →</a></div>
    </div>`)).join('');
}

function renderMapAndEta() {
  const { ride } = state;
  const deviation = state.alerts.find((a) => a.alert_type === 'deviation');
  const start = { lat: ride.departureLat, lon: ride.departureLon, label: ride.direction === 'to_school' ? 'Punct urcare' : `${ride.school.shortName}`, kind: ride.direction === 'to_school' ? 'meet' : 'school' };
  const end = { lat: ride.destinationLat, lon: ride.destinationLon, label: ride.direction === 'to_school' ? `${ride.school.shortName}` : 'Punct coborâre', kind: ride.direction === 'to_school' ? 'school' : 'meet' };
  renderMap($('#map'), {
    route: state.route,
    points: [start, end],
    car: state.status === 'in_progress' && state.location ? state.location : null,
    alert: deviation && deviation.lat != null ? { lat: deviation.lat, lon: deviation.lon } : null,
    caption: state.location ? `Ultima poziție: ${relativeTime(state.location.recorded_at)}` : 'Cursa nu a pornit încă',
  });

  const label = state.status === 'completed' ? 'Sosire' : state.status === 'in_progress' ? 'Sosire estimată' : 'Sosire estimată (după plecare)';
  const bell = ride.school.bellTime ? ride.school.bellTime.slice(0, 5) : null;
  const etaTime = formatTime(state.eta);
  const beforeBell = bell && ride.direction === 'to_school' ? (etaTime <= bell ? `Înainte de clopoțel (${bell})` : `După clopoțel (${bell})`) : '';
  $('#eta').innerHTML = html`
    <div class="card card-blue">
      <div class="eta-card">
        <div><span class="small muted">${label} · ${ride.direction === 'to_school' ? ride.school.dropoffPoint : ride.destination}</span>
          <div class="eta">${etaTime}</div></div>
        ${beforeBell ? raw(html`<span class="badge ${etaTime <= bell ? 'badge-green' : 'badge-red'}">${beforeBell}</span>`) : ''}
      </div>
      <div class="progress" aria-label="Progres traseu"><span style="width:${Math.round(state.progress * 100)}%"></span></div>
    </div>`;
}

function renderPeople() {
  const { ride } = state;
  const isDriver = state.role === 'driver';
  $('#people').innerHTML = html`
    <div class="card">
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
        <div class="avatar">${initials(ride.driver.fullName)}</div>
        <div><div class="strong">${ride.driver.fullName}</div>
          <div class="small muted">${ride.vehicle.brand} ${ride.vehicle.model} · ${ride.vehicle.color} · ${ride.vehicle.licensePlate}</div></div>
        ${!isDriver && ride.driver.phone ? raw(html`<a class="btn btn-secondary btn-sm" style="margin-left:auto" href="tel:${ride.driver.phone}">Sună</a>`) : ''}
      </div>
      ${state.bookings.map((b) => raw(html`
        <div class="kid-row">
          <span><strong>${b.childName}</strong> <span class="small muted">· ${b.grade} · ${b.seatLabel}</span></span>
          <span>${statusBadge(b.status)}
            ${isDriver && state.status === 'in_progress' && b.status === 'confirmed' ? raw(html`<button class="btn btn-secondary btn-sm" data-pickup="${b.bookingId}">Preluat</button>`) : ''}</span>
        </div>`))}
    </div>`;
  document.querySelectorAll('[data-pickup]').forEach((btn) => btn.addEventListener('click', () => withLoading(btn, async () => {
    try { applyState(await api.post(`/bookings/${btn.dataset.pickup}/pickup`)); } catch (err) { showError(err); }
  })));
}

function renderActions() {
  const isDriver = state.role === 'driver';
  const active = ['scheduled', 'in_progress'].includes(state.status);
  const mine = myBookings();
  const arrivedMine = mine.find((b) => b.status === 'arrived_at_school');
  const parts = [];

  if (!isDriver && active) {
    parts.push(html`<div class="actions-grid two">
      <button class="btn btn-danger" id="sosBtn">SOS · Siguranță</button>
      ${mine.length ? raw('<button class="btn btn-secondary" id="shareBtn">Trimite bunicilor</button>') : ''}</div>`);
  }
  if (arrivedMine) {
    parts.push(html`<a class="btn btn-primary btn-block" href="dropoff.html?bookingId=${arrivedMine.bookingId}">${arrivedMine.parentConfirmedAt ? 'Vezi predarea la școală' : 'Confirmă predarea'}</a>`);
  }
  if (isDriver && state.status === 'scheduled') {
    parts.push(html`<div class="actions-grid"><button class="btn btn-primary" id="startBtn">Pornește cursa</button>
      <button class="btn-link danger" id="cancelBtn">Anulează cursa</button></div>`);
  }
  if (isDriver && state.status === 'in_progress') {
    parts.push(html`<div class="actions-grid two">
      <button class="btn btn-secondary" id="gpsBtn">${gpsWatch === null ? 'Transmite locația GPS' : 'Oprește transmiterea GPS'}</button>
      <button class="btn btn-danger" id="sosBtn">SOS</button></div>
      <button class="btn btn-primary btn-block" id="arriveBtn">Am ajuns · predare la ${state.ride.direction === 'to_school' ? 'poarta școlii' : 'destinație'}</button>`);
  }
  if (state.allowSimulation && active) {
    parts.push(html`<div class="sim-box"><span class="eyebrow">Mod demonstrativ (fără GPS real)</span>
      <div class="actions-grid two"><button class="btn btn-secondary btn-sm" id="simStep">▶ Simulează deplasarea</button>
      <button class="btn btn-secondary btn-sm" id="simDeviate">Simulează o deviere</button></div></div>`);
  }
  if (state.status === 'completed' && !arrivedMine) parts.push(html`<div class="callout callout-info">Cursa s-a încheiat ${state.ride.direction === 'to_school' ? 'la școală' : ''}. Mulțumim!</div>`);
  if (state.status === 'cancelled') parts.push(html`<div class="callout callout-alert">Cursa a fost anulată de șofer.</div><a class="btn btn-primary btn-block" href="search.html">Caută altă cursă</a>`);

  $('#actions').innerHTML = parts.join('');
  bindActions();
}

function post(path, body) {
  return api.post(`/rides/${rideId}${path}`, body).then((s) => { if (s && s.status) applyState(s); return s; });
}

function bindActions() {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', () => withLoading(el, () => fn().catch(showError))); };
  on('startBtn', () => post('/start').then(() => toast('Cursa a pornit. Părinții au fost anunțați.')));
  on('arriveBtn', () => post('/arrive').then(() => toast('Copiii au fost predați. Părinții au fost anunțați.')));
  on('simStep', () => post('/simulate', { action: 'step' }));
  on('simDeviate', () => post('/simulate', { action: 'deviate' }).then(() => toast('Deviere simulată', { icon: '' })));
  const cancel = document.getElementById('cancelBtn');
  if (cancel) cancel.addEventListener('click', async () => {
    if (!window.confirm('Sigur anulezi cursa? Părinții copiilor rezervați vor fi anunțați.')) return;
    try { await api.post(`/rides/${rideId}/cancel`); toast('Cursa a fost anulată'); await refresh(); } catch (err) { showError(err); }
  });
  const gps = document.getElementById('gpsBtn');
  if (gps) gps.addEventListener('click', toggleGps);
  const sos = document.getElementById('sosBtn');
  if (sos) sos.addEventListener('click', () => { $('#sosResult').innerHTML = ''; $('#sosButtons').hidden = false; $('#sosDialog').showModal(); });
  const share = document.getElementById('shareBtn');
  if (share) share.addEventListener('click', () => withLoading(share, () => shareLink().catch(showError)));
}

function toggleGps() {
  if (gpsWatch !== null) {
    navigator.geolocation.clearWatch(gpsWatch);
    gpsWatch = null;
    renderActions();
    return;
  }
  if (!navigator.geolocation) { showError(new Error('Browserul nu permite localizarea')); return; }
  let last = 0;
  gpsWatch = navigator.geolocation.watchPosition(async (pos) => {
    if (Date.now() - last < 5000) return;
    last = Date.now();
    try { applyState(await api.post(`/rides/${rideId}/location`, { lat: pos.coords.latitude, lon: pos.coords.longitude })); } catch (err) { showError(err); }
  }, () => { showError(new Error('Nu am acces la locație')); gpsWatch = null; renderActions(); }, { enableHighAccuracy: true });
  renderActions();
  toast('Locația se transmite părinților');
}

async function shareLink() {
  const booking = myBookings()[0];
  const { booking: b } = await api.get(`/bookings/${booking.bookingId}`);
  const url = `${window.location.origin}/share.html?token=${b.shareToken}`;
  const text = `Urmărește drumul lui ${firstName(b.childName)} spre ${state.ride.school.shortName}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'SchoolHop', text, url }); return; } catch { /* anulat: arătăm dialogul */ }
  }
  $('#shareUrl').value = url;
  $('#shareDialog').showModal();
}

$('#shareCopy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#shareUrl').value); toast('Link copiat'); } catch { $('#shareUrl').select(); }
});
$('#shareClose').addEventListener('click', () => $('#shareDialog').close());
$('#sosCancel').addEventListener('click', () => $('#sosDialog').close());
$('#sosConfirm').addEventListener('click', () => withLoading($('#sosConfirm'), async () => {
  try {
    const r = await api.post(`/rides/${rideId}/sos`, {});
    $('#sosButtons').hidden = true;
    $('#sosResult').innerHTML = html`<div class="callout callout-alert">Alertă trimisă către ${r.notified} persoane.</div>
      <div class="contacts">
        ${r.schoolPhone ? raw(html`<a class="btn btn-danger btn-block" href="tel:${r.schoolPhone}">Sună secretariatul școlii</a>`) : ''}
        ${state.role !== 'driver' && r.driverPhone ? raw(html`<a class="btn btn-secondary btn-block" href="tel:${r.driverPhone}">Sună șoferul</a>`) : ''}
        ${r.emergencyContacts.map((c) => raw(html`<a class="btn btn-secondary btn-block" href="tel:${c.phone}">${c.name}</a>`))}
        <a class="btn btn-secondary btn-block" href="tel:112">112</a>
        <button class="btn-link" id="sosDone" style="margin-top:8px">Închide</button>
      </div>`;
    $('#sosDone').addEventListener('click', () => $('#sosDialog').close());
    await refresh();
  } catch (err) { showError(err); }
}));

function applyState(s) {
  state = { ...state, ...s };
  renderHeader();
  renderAlerts();
  renderMapAndEta();
  renderPeople();
  renderActions();
  schedulePoll();
}

async function refresh() {
  applyState(await api.get(`/rides/${rideId}/live`));
}

function schedulePoll() {
  clearTimeout(pollTimer);
  if (['completed', 'cancelled'].includes(state.status)) return;
  pollTimer = setTimeout(() => {
    if (document.hidden) { schedulePoll(); return; }
    refresh().catch(() => schedulePoll());
  }, POLL_MS);
}

async function load() {
  try {
    me = await mountShell({ active: 'rides' });
    bindBack($('#back'), 'my-rides.html');
    if (!rideId) throw new Error('Cursa nu a fost specificată');
    await refresh();
    api.get(`/rides/${rideId}/topic`).then(({ topic }) => {
      $('#topic').innerHTML = html`<span class="eyebrow">Întrebarea zilei pentru copii</span><p>„${topic}”</p>`;
      $('#topic').hidden = false;
    }).catch(() => {});
  } catch (err) {
    renderError($('#people'), err, load);
    $('#title').textContent = 'Cursa nu poate fi afișată';
  }
}

document.addEventListener('visibilitychange', () => { if (!document.hidden && state) refresh().catch(() => {}); });
load();
