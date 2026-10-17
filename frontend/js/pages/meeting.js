import { api } from '../core/api.js';
import { mountShell, bindBack } from '../core/layout.js';
import { renderMap } from '../core/map.js';
import { $, html, raw, params, renderError, formatTime, formatDate, firstName, initials } from '../core/ui.js';

const q = params();
const content = $('#content');

async function load() {
  try {
    await mountShell({ active: 'search', roles: ['parent', 'parent_driver', 'community_driver'] });
    bindBack($('#back'), 'search.html');
    const data = await api.get(`/rides/${encodeURIComponent(q.get('rideId'))}?childId=${encodeURIComponent(q.get('childId'))}`);
    const { ride, child } = data;
    const toSchool = ride.direction === 'to_school';
    const meet = toSchool
      ? { lat: ride.departureLat, lon: ride.departureLon, label: 'Punct de urcare', kind: 'meet' }
      : { lat: ride.destinationLat, lon: ride.destinationLon, label: 'Punct de coborâre', kind: 'meet' };
    const school = toSchool
      ? { lat: ride.destinationLat, lon: ride.destinationLon, label: `${ride.school.shortName}`, kind: 'school' }
      : { lat: ride.departureLat, lon: ride.departureLon, label: `${ride.school.shortName}`, kind: 'school' };
    const home = data.home ? { ...data.home, label: `${firstName(child.fullName)} · acasă`, kind: 'home' } : null;

    content.innerHTML = html`
      <h1 class="page-title">${toSchool ? 'Punct de întâlnire' : 'Punct de coborâre'}</h1>
      <p class="page-subtitle">${formatDate(ride.departureTime)} · ${toSchool ? `plecare împreună spre ${ride.school.shortName}` : `întoarcere de la ${ride.school.shortName}`}</p>
      <div class="map-box" id="map"></div>
      <div class="card card-blue meet-card">
        <div class="card-title">${toSchool ? 'Punctul de urcare al copiilor' : 'Punctul de coborâre'}</div>
        <p class="small muted" style="margin-bottom:8px">${toSchool ? ride.departureAddress : ride.destination}</p>
        ${data.walkMinutes != null ? raw(html`<div class="card-row"><span>${firstName(child.fullName)} merge pe jos de acasă:</span><strong class="walk">${data.walkMinutes} min</strong></div>`) : ''}
        <div class="card-row"><span>Ora ${toSchool ? 'urcării în mașină' : 'plecării de la școală'}:</span><strong>${formatTime(ride.departureTime)}</strong></div>
        <div class="card-row"><span>Durata estimată a drumului:</span><strong>~${data.durationMin} min</strong></div>
        <div class="card-row"><span>Predare la:</span><strong>${toSchool ? ride.school.dropoffPoint : ride.destination}</strong></div>
      </div>
      <div class="card">
        <div style="display:flex;gap:10px;align-items:center">
          <div class="avatar">${initials(ride.driver.fullName)}</div>
          <div><div class="strong">${ride.driver.fullName}</div>
          <div class="small muted">${ride.vehicle.brand} ${ride.vehicle.model} · ${ride.vehicle.color} · ${ride.vehicle.licensePlate}</div></div>
        </div>
        ${data.companions.length ? raw(html`<div class="companions">${data.companions.map((c) => raw(html`<span class="badge badge-blue">${c.name} · ${c.grade}</span>`))}</div>`) : ''}
        ${ride.notes ? raw(html`<p class="small muted" style="margin-top:8px">${ride.notes}</p>`) : ''}
      </div>
      <a class="btn btn-primary btn-block" href="seat.html?${q}">Alege locul lui ${firstName(child.fullName)} în mașină</a>`;

    renderMap($('#map'), {
      route: toSchool ? [meet, school] : [school, meet],
      points: [home, meet, school].filter(Boolean),
      walk: home ? [home, meet] : null,
      caption: 'Linia punctată = drumul pe jos',
    });
  } catch (err) {
    renderError(content, err, load);
  }
}

load();
