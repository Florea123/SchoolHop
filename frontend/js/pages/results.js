import { api } from '../core/api.js';
import { mountShell, bindBack } from '../core/layout.js';
import { $, html, raw, params, renderError, formatTime, formatDate, lei, firstName, initials, plural } from '../core/ui.js';

const q = params();
const container = $('#results');

function card(r, child, isBest) {
  const ride = r.ride;
  const score = Math.round(r.match.score * 100);
  let blocked = '';
  if (r.alreadyBooked) blocked = `${firstName(child.fullName)} are deja loc pe această cursă`;
  else if (!r.freeSeats) blocked = 'Niciun loc potrivit vârstei copilului';
  else if (!r.boosterAvailable) blocked = 'Nu mai are înălțător disponibil';
  const next = new URLSearchParams({ rideId: ride.id, childId: child.id });

  return html`
    <article class="card match-card ${isBest ? 'best' : ''} ${r.bookable ? '' : 'unavailable'}">
      <div class="match-top">
        <span class="badge ${score >= 50 ? 'badge-ai' : 'badge-blue'}">Potrivire ${score}%</span>
        ${r.match.companion && r.match.companion.sameClass ? raw('<span class="badge badge-green">Aceeași clasă</span>') : ''}
        ${ride.isSocialFund ? raw('<span class="badge badge-yellow">Fond Social</span>') : ''}
      </div>
      <div class="driver">
        <div class="avatar">${initials(ride.driver.fullName)}</div>
        <div>
          <div class="strong">${ride.driver.fullName}${r.companions.length ? ` · cu ${r.companions.map((c) => `${c.name} (${c.grade.replace('Clasa a ', '')})`).join(', ')}` : ''}</div>
          <div class="small muted">${ride.driver.reviews ? `★${ride.driver.rating} (${ride.driver.reviews})` : 'Fără evaluări încă'} · ${ride.driver.role === 'community_driver' ? 'Șofer comunitar' : 'Părinte'}</div>
        </div>
      </div>
      <div class="ai-box"><div>
        ${r.match.reasons.length ? raw(html`<strong>De ce se potrivesc:</strong> ${r.match.reasons.join(' · ')}.<br>`) : ''}${r.match.recommendation}
      </div></div>
      <div class="small"><strong>${ride.vehicle.brand} ${ride.vehicle.model}</strong> · ${ride.vehicle.color} · ${plural(ride.vehicle.boosterSeats, 'înălțător', 'înălțătoare')}</div>
      <div class="time-price">
        <span class="time">${formatTime(ride.departureTime)}</span>
        <span class="price">${lei(ride.pricePerSeat)}</span>
      </div>
      <div class="meta-row">
        <span>${ride.direction === 'to_school' ? ride.departureAddress : ride.destination}</span>
        ${r.walkMinutes != null ? raw(html`<span>${r.walkMinutes} min pe jos (${r.distanceKm} km)</span>`) : ''}
        <span>sosire ~${formatTime(r.estimatedArrival)}</span>
        ${r.arrivesOnTime ? '' : raw('<span class="warn">după ora dorită</span>')}
        <span class="${r.freeSeats ? 'ok' : 'warn'}">${plural(r.freeSeats, 'loc liber', 'locuri libere')}</span>
      </div>
      ${blocked ? raw(html`<div class="callout callout-warn" style="margin:0">${blocked}</div>`) : ''}
      ${r.bookable
    ? raw(html`<a class="btn btn-primary btn-block" href="meeting.html?${next}">Alege cursa${r.match.companion ? ` cu ${firstName(r.match.companion.name)}` : ''}</a>`)
    : r.alreadyBooked
      ? raw(html`<a class="btn btn-secondary btn-block" href="ride.html?rideId=${ride.id}">Vezi cursa rezervată</a>`)
      : raw('<button class="btn btn-secondary btn-block" disabled>Indisponibilă</button>')}
    </article>`;
}

async function load() {
  try {
    await mountShell({ active: 'search', roles: ['parent', 'parent_driver', 'community_driver'] });
    bindBack($('#back'), `search.html?${q}`);
    $('#editSearch').href = `search.html?${q}`;
    const data = await api.get(`/rides/search?${q}`);
    const child = data.child;
    const nearby = data.results.filter((r) => r.nearby);
    const far = data.results.filter((r) => !r.nearby);
    const bookable = data.results.filter((r) => r.bookable).length;

    $('#title').textContent = `Colegi potriviți pentru ${firstName(child.fullName)}`;
    $('#subtitle').textContent = `${formatDate(data.date)} · ${data.direction === 'to_school' ? 'spre școală' : 'spre casă'} · ${data.origin ? data.origin.label : ''} · ${plural(bookable, 'cursă disponibilă', 'curse disponibile')}`;

    if (!data.results.length) {
      container.innerHTML = html`<div class="empty-state" style="grid-column:1/-1"><p>Nu există încă nicio cursă publicată pentru această zi.</p>
        <div class="btn-row" style="justify-content:center;margin-top:14px;max-width:420px;margin-inline:auto">
          <a class="btn btn-secondary" href="search.html?${q}">Altă zi</a><a class="btn btn-primary" href="publish.html">Publică tu o cursă</a></div></div>`;
      return;
    }
    container.innerHTML = [
      ...nearby.map((r, i) => card(r, child, i === 0 && r.bookable)),
      far.length ? html`<div class="results-divider">Mai departe de ${data.origin ? data.origin.label : 'casă'} (peste 3 km)</div>` : '',
      ...far.map((r) => card(r, child, false)),
    ].join('');
  } catch (err) {
    renderError(container, err, load);
  }
}

load();
