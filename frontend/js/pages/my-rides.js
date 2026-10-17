import { api } from '../core/api.js';
import { mountShell } from '../core/layout.js';
import { $, $$, html, raw, renderError, showError, toast, formatTime, formatDate, lei, plural, statusBadge } from '../core/ui.js';

const content = $('#content');
let scope = new URLSearchParams(window.location.search).get('scope') === 'history' ? 'history' : 'upcoming';

function bookingCard(b) {
  const done = b.status === 'arrived_at_school';
  return html`<article class="card ride-item">
    <div class="top"><span class="strong">${formatDate(b.departureTime)}</span>${statusBadge(b.rideStatus === 'cancelled' ? 'cancelled' : b.status)}</div>
    <div class="route"><strong>${formatTime(b.departureTime)}</strong> ${b.direction === 'to_school' ? `${b.departureArea} → ${b.schoolShortName}` : `${b.schoolShortName} → ${b.destination}`}</div>
    <div class="small muted">${b.childName} · ${b.seatLabel} · cu ${b.driverName} · ${lei(b.price)}</div>
    <div class="links">
      ${b.status !== 'cancelled' && b.rideStatus !== 'cancelled' ? raw(html`<a class="btn-link" href="ride.html?rideId=${b.rideId}">Detalii cursă →</a>`) : ''}
      ${b.status === 'confirmed' && b.rideStatus === 'scheduled' ? raw(html`<button class="btn-link danger" data-cancel="${b.bookingId}">Anulează</button>`) : ''}
      ${done && !b.parentConfirmed ? raw(html`<a class="btn-link" href="dropoff.html?bookingId=${b.bookingId}">Confirmă predarea</a>`) : ''}
      ${done && !b.reviewed ? raw(html`<a class="btn-link" href="review.html?bookingId=${b.bookingId}">★Evaluează</a>`) : ''}
    </div></article>`;
}

function drivingCard(r) {
  return html`<article class="card ride-item">
    <div class="top"><span class="strong">${formatDate(r.departureTime)}</span>${statusBadge(r.status)}</div>
    <div class="route"><strong>${formatTime(r.departureTime)}</strong> ${r.direction === 'to_school' ? `${r.departureArea} → ${r.schoolShortName}` : `${r.schoolShortName} → ${r.destination}`}</div>
    <div class="small muted">Tu conduci · ${plural(r.childrenCount, 'copil', 'copii')} în mașină · ${plural(r.availableSeats, 'loc liber', 'locuri libere')}</div>
    <div class="links"><a class="btn-link" href="ride.html?rideId=${r.rideId}">${r.status === 'scheduled' ? 'Gestionează cursa →' : 'Vezi cursa →'}</a></div></article>`;
}

async function load() {
  $('#tabUpcoming').setAttribute('aria-selected', String(scope === 'upcoming'));
  $('#tabHistory').setAttribute('aria-selected', String(scope === 'history'));
  content.innerHTML = '<div class="skeleton"></div>';
  try {
    const data = await api.get(`/me/rides?scope=${scope}`);
    if (!data.bookings.length && !data.driving.length) {
      content.innerHTML = html`<div class="empty-state"><p>${scope === 'upcoming' ? 'Nu ai nicio cursă programată.' : 'Încă nu ai istoric de curse.'}</p>
        <div class="btn-row" style="justify-content:center;max-width:420px;margin:14px auto 0">
          <a class="btn btn-primary" href="search.html">Caută o cursă</a><a class="btn btn-secondary" href="publish.html">Publică o cursă</a></div></div>`;
      return;
    }
    content.innerHTML = html`
      ${data.bookings.length ? raw(html`<h2 class="section-title">Copiii mei (${data.bookings.length})</h2><div class="card-grid cols-2">${data.bookings.map((b) => raw(bookingCard(b)))}</div>`) : ''}
      ${data.driving.length ? raw(html`<h2 class="section-title">Cursele pe care le conduc (${data.driving.length})</h2><div class="card-grid cols-2">${data.driving.map((r) => raw(drivingCard(r)))}</div>`) : ''}`;
    $$('[data-cancel]').forEach((btn) => btn.addEventListener('click', async () => {
      if (!window.confirm('Anulezi locul rezervat? Șoferul va fi anunțat.')) return;
      try {
        await api.post(`/bookings/${btn.dataset.cancel}/cancel`);
        toast('Rezervarea a fost anulată');
        load();
      } catch (err) { showError(err); }
    }));
  } catch (err) {
    renderError(content, err, load);
  }
}

function setScope(next) {
  scope = next;
  const url = new URL(window.location.href);
  url.searchParams.set('scope', scope);
  window.history.replaceState(null, '', url);
  load();
}

$('#tabUpcoming').addEventListener('click', () => setScope('upcoming'));
$('#tabHistory').addEventListener('click', () => setScope('history'));

mountShell({ active: 'rides', roles: ['parent', 'parent_driver', 'community_driver'] }).then(load).catch((err) => renderError(content, err));
