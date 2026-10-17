import { api, getMeta } from '../core/api.js';
import { mountShell, bindBack } from '../core/layout.js';
import { $, $$, html, raw, params, renderError, lei, firstName, plural } from '../core/ui.js';

const q = params();
const content = $('#content');
let selected = null;

const ROWS = [['driver', 'front_right'], ['back_left', 'back_middle', 'back_right'], ['third_left', 'third_middle', 'third_right']];

function seatHtml(seat, data, frontAge) {
  if (seat === 'driver') return html`<div class="seat driver">Șofer<small>${firstName(data.ride.driver.fullName)}</small></div>`;
  const s = data.seatMap.seats.find((x) => x.position === seat);
  if (!s) return '';
  if (s.status === 'occupied' || s.status === 'mine') {
    return html`<div class="seat occupied">${s.label}<small>${s.childName}</small>${s.usesBooster ? raw('<span class="booster-tag">Înălțător</span>') : ''}</div>`;
  }
  if (s.status === 'not_allowed') return html`<div class="seat not_allowed" title="Doar de la ${frontAge} ani">${s.label}<small>de la ${frontAge} ani</small></div>`;
  return html`<button type="button" class="seat free" data-seat="${s.position}" aria-pressed="false">${s.label}<small data-status>Liber</small>${data.child.needsBooster ? raw('<span class="booster-tag">Înălțător </span>') : ''}</button>`;
}

async function load() {
  try {
    const [, meta] = await Promise.all([mountShell({ active: 'search', roles: ['parent', 'parent_driver', 'community_driver'] }), getMeta()]);
    bindBack($('#back'), `meeting.html?${q}`);
    const data = await api.get(`/rides/${encodeURIComponent(q.get('rideId'))}?childId=${encodeURIComponent(q.get('childId'))}`);
    const { ride, child, seatMap } = data;
    const name = firstName(child.fullName);
    const free = seatMap.seats.filter((s) => s.status === 'free');
    const frontAge = meta.config.frontSeatMinAge;
    const boosterProblem = child.needsBooster && seatMap.boostersLeft === 0;

    content.innerHTML = html`
      <h1 class="page-title">Alege locul lui ${name}</h1>
      <p class="page-subtitle">${ride.vehicle.brand} ${ride.vehicle.model} · ${plural(seatMap.boosterSeats, 'înălțător omologat', 'înălțătoare omologate')} (${seatMap.boostersLeft} disponibile)</p>
      <div class="cabin">
        <div class="cabin-hood">Fața mașinii </div>
        ${ROWS.map((row) => {
    const cells = row.map((s) => seatHtml(s, data, frontAge)).filter(Boolean);
    return cells.length > (row[0] === 'driver' ? 1 : 0) ? raw(`<div class="seat-row">${cells.join('')}</div>`) : '';
  })}
      </div>
      <div class="legend"><span><i class="l-free"></i>Liber</span><span><i class="l-sel"></i>Selectat</span><span><i class="l-occ"></i>Ocupat</span></div>
      ${boosterProblem ? raw(html`<div class="callout callout-alert">${name} are nevoie de înălțător, dar toate înălțătoarele din mașină sunt ocupate. Alege altă cursă.</div>`) : ''}
      ${!free.length ? raw('<div class="callout callout-warn">Nu mai există locuri potrivite vârstei copilului pe această cursă.</div>') : ''}
      <div class="card">
        <p class="small muted">${child.age < frontAge ? `Copiii sub ${frontAge} ani stau doar pe bancheta din spate.` : `${name} poate sta și în față (are ${child.age} ani).`}
          ${child.needsBooster ? ` ${name} va folosi un înălțător auto omologat.` : ''}</p>
        <hr class="divider">
        <div class="card-row"><span>Locul lui ${name}:</span><strong id="seatLabel" style="color:var(--teal)">neselectat</strong></div>
        <div class="card-row"><span>Contribuție drum:</span><strong>${lei(ride.isSocialFund ? 0 : ride.pricePerSeat)} / cursă</strong></div>
      </div>
      <button class="btn btn-primary btn-block" id="confirm" disabled>Confirmă locul și alege zilele</button>`;

    $$('.seat.free').forEach((btn) => btn.addEventListener('click', () => {
      $$('.seat.free').forEach((b) => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
        b.querySelector('[data-status]').textContent = 'Liber';
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
      btn.querySelector('[data-status]').textContent = `${name} · selectat`;
      selected = btn.dataset.seat;
      $('#seatLabel').textContent = seatMap.seats.find((s) => s.position === selected).label;
      $('#confirm').disabled = boosterProblem;
    }));
    // Preselectăm primul loc liber din spate
    const preferred = $$('.seat.free').find((b) => b.dataset.seat !== 'front_right') || $$('.seat.free')[0];
    if (preferred && !boosterProblem) preferred.click();

    $('#confirm').addEventListener('click', () => {
      const next = new URLSearchParams(q);
      next.set('seat', selected);
      window.location.href = `schedule.html?${next}`;
    });
  } catch (err) {
    renderError(content, err, load);
  }
}

load();
