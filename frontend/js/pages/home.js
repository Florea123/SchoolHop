import { api } from '../core/api.js';
import { mountShell } from '../core/layout.js';
import { $, html, raw, renderError, formatTime, formatDate, firstName, plural, initials } from '../core/ui.js';

const content = $('#content');

function greeting(name) {
  const h = Number(new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Bucharest', hour: '2-digit', hourCycle: 'h23' }));
  const part = h < 11 ? 'Bună dimineața' : h < 18 ? 'Bună ziua' : 'Bună seara';
  return `${part}, ${firstName(name)}!`;
}

function kidCard(c) {
  return html`<a class="kid-card" href="profile.html?childId=${c.id}">
    <div class="avatar avatar-kid" aria-hidden="true">${initials(c.fullName)}</div>
    <div>
      <div class="strong">${c.fullName}</div>
      <div class="small muted">${c.grade} · ${c.age} ani${c.homeArea ? ` · ${c.homeArea}` : ''}</div>
      <div class="chips">${c.interests.slice(0, 4).map((i) => raw(html`<span class="chip chip-static">${i.label}</span>`))}</div>
    </div></a>`;
}

async function load() {
  try {
    await mountShell({ active: 'home', roles: ['parent', 'parent_driver', 'community_driver'] });
    const data = await api.get('/me/home');
    const incomplete = data.children.filter((c) => !c.profileComplete);
    const school = data.schoolImpact;
    const fam = data.familyImpact;
    const firstChild = data.children[0];
    const next = data.nextRide;

    content.innerHTML = html`
      ${incomplete.length ? raw(html`<div class="callout callout-warn">Completează zona de domiciliu pentru ${incomplete.map((c) => firstName(c.fullName)).join(', ')} ca să găsim colegi de drum. <a href="verify.html" class="strong">Completează acum</a></div>`) : ''}
      <div class="kid-switch">${data.children.map((c) => raw(kidCard(c)))}</div>
      <h1 class="page-title">${greeting(data.user.fullName)}</h1>
      <p class="page-subtitle">${firstChild ? `${firstName(firstChild.fullName)} merge la școală cu colegii?` : 'Adaugă copilul din catalogul școlii pentru a începe.'}</p>

      <div class="home-actions">
        <a class="btn btn-primary" href="search.html">Caută curse spre școală</a>
        <a class="btn btn-secondary" href="publish.html">Iau eu copiii (ofer locuri)</a>
      </div>

      ${next ? raw(html`
        <a class="card next-ride" href="ride.html?rideId=${next.rideId}">
          <div>
            <span class="eyebrow">${next.isOwnRide ? 'Următoarea ta cursă ca șofer' : 'Următoarea cursă'}</span>
            <div class="time">${formatTime(next.departureTime)}</div>
            <div class="small muted">${formatDate(next.departureTime)} · ${next.direction === 'to_school' ? 'spre școală' : 'spre casă'}</div>
            <div class="small">${firstName(next.childName)} ${next.isOwnRide ? 'merge cu tine' : `cu ${next.driverName}`} · ${next.departureAddress}</div>
          </div>
          <span aria-hidden="true">→</span>
        </a>`) : raw('<div class="card"><div class="card-title">Nicio cursă programată</div><p class="small muted">Caută un coleg de drum pentru săptămâna aceasta.</p></div>')}

      ${school ? raw(html`
        <a class="impact-hero" href="impact.html">
          <div class="card-row" style="padding:0"><span class="eyebrow">${data.school.shortName}</span><span class="badge badge-ai">ultimele 7 zile</span></div>
          <div class="big">${plural(school.period.soloTripsAvoided, 'mașină', 'mașini')}</div>
          <div class="small strong muted">eliminate din aglomerația de la poarta școlii</div>
          <div class="stat-grid">
            <div class="stat"><div class="stat-value">${school.verifiedParents}</div><div class="stat-label">Părinți verificați</div></div>
            <div class="stat"><div class="stat-value">${school.period.co2SavedKg} kg</div><div class="stat-label">CO₂ evitat</div></div>
            <div class="stat"><div class="stat-value">${fam.greenPoints} pct</div><div class="stat-label">Punctele tale Erou Verde</div></div>
            <div class="stat"><div class="stat-value">${plural(fam.ridesWithClassmates, 'cursă', 'curse')}</div><div class="stat-label">Cu colegii de drum</div></div>
          </div>
        </a>`) : ''}`;
  } catch (err) {
    renderError(content, err, load);
  }
}

load();
