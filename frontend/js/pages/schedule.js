import { api } from '../core/api.js';
import { mountShell, bindBack } from '../core/layout.js';
import { $, $$, html, raw, params, renderError, showError, toast, withLoading, formatTime, formatShortDate, isoDate, lei, firstName, plural } from '../core/ui.js';

const q = params();
const content = $('#content');

async function load() {
  try {
    await mountShell({ active: 'search', roles: ['parent', 'parent_driver', 'community_driver'] });
    bindBack($('#back'), `seat.html?${q}`);
    const data = await api.get(`/rides/${encodeURIComponent(q.get('rideId'))}?childId=${encodeURIComponent(q.get('childId'))}`);
    const { child, ride } = data;
    const name = firstName(child.fullName);
    const seat = q.get('seat');
    const seatLabel = (data.seatMap.seats.find((s) => s.position === seat) || {}).label || 'primul loc liber';
    const outbound = data.series.filter((d) => !d.isReturn);
    const returns = data.series.filter((d) => d.isReturn);
    const usable = (d) => !d.alreadyBooked && d.freeSeats.length > 0 && d.boosterOk;
    const returnFor = (d) => returns.find((r) => isoDate(r.departureTime) === isoDate(d.departureTime) && usable(r));
    const selected = new Set(outbound.filter((d) => d.rideId === ride.id && usable(d)).map((d) => d.rideId));

    content.innerHTML = html`
      <h1 class="page-title">Orar săptămânal</h1>
      <p class="page-subtitle">Rezervă drumul ${ride.direction === 'to_school' ? 'spre școală' : 'spre casă'} cu ${ride.driver.fullName} pentru una sau mai multe zile (ora ${formatTime(ride.departureTime)}).</p>
      <div class="day-pills" role="group" aria-label="Zilele cursei">
        ${outbound.map((d) => raw(html`<button type="button" class="day-pill" data-ride="${d.rideId}" aria-pressed="${selected.has(d.rideId)}" ${raw(usable(d) ? '' : 'disabled')}
            title="${d.alreadyBooked ? 'Deja rezervat' : !d.freeSeats.length ? 'Fără locuri libere' : !d.boosterOk ? 'Fără înălțător liber' : ''}">
            <small>${formatShortDate(d.departureTime).split(',')[0]}</small>${new Date(d.departureTime).toLocaleDateString('ro-RO', { timeZone: 'Europe/Bucharest', day: 'numeric' })}</button>`))}
      </div>
      <p class="small muted" id="daysCount"></p>
      ${returns.length ? raw(html`
        <label class="checkbox" style="margin-top:12px"><input type="checkbox" id="withReturn">
          <span><strong>Adaugă și întoarcerea după ore</strong>${raw('<br>')}<span class="small muted">${ride.driver.fullName} face și drumul înapoi (ora ${formatTime(returns[0].departureTime)}) în unele zile.</span></span></label>`) : ''}
      <div class="card">
        <div class="card-row"><span>Pasager</span><strong>${name} · ${child.grade}</strong></div>
        <div class="card-row"><span>Loc preferat</span><strong>${seatLabel}</strong></div>
        <div class="card-row"><span id="costMath"></span><strong id="subtotal"></strong></div>
        <div class="card-row total-row"><span>Total contribuție</span><strong id="total"></strong></div>
        <p class="small muted" style="margin-top:6px">Dacă locul preferat e ocupat într-o zi, îi alegem automat alt loc potrivit vârstei.</p>
      </div>
      <p class="form-hint error" id="formError" role="alert" hidden></p>
      <button class="btn btn-primary btn-block" id="confirm">Confirmă rezervarea</button>`;

    function chosenRideIds() {
      const ids = [...selected];
      if ($('#withReturn') && $('#withReturn').checked) {
        outbound.filter((d) => selected.has(d.rideId)).forEach((d) => { const r = returnFor(d); if (r) ids.push(r.rideId); });
      }
      return ids;
    }

    function update() {
      const ids = chosenRideIds();
      const all = [...outbound, ...returns];
      const total = ids.reduce((s, id) => s + Number(all.find((d) => d.rideId === id).price || 0), 0);
      $('#daysCount').textContent = `${plural(selected.size, 'zi selectată', 'zile selectate')} · 1 loc (${name})`;
      $('#costMath').textContent = `${plural(ids.length, 'cursă', 'curse')}`;
      $('#subtotal').textContent = lei(total);
      $('#total').textContent = lei(total);
      $('#confirm').textContent = `Confirmă rezervarea · ${lei(total)}`;
      $('#confirm').disabled = ids.length === 0;
    }

    $$('.day-pill').forEach((pill) => pill.addEventListener('click', () => {
      const id = Number(pill.dataset.ride);
      if (selected.has(id)) selected.delete(id); else selected.add(id);
      pill.setAttribute('aria-pressed', String(selected.has(id)));
      update();
    }));
    if ($('#withReturn')) $('#withReturn').addEventListener('change', update);
    update();

    $('#confirm').addEventListener('click', () => withLoading($('#confirm'), async () => {
      try {
        const result = await api.post('/bookings', { childId: child.id, rideIds: chosenRideIds(), seatPosition: seat });
        const moved = result.bookings.filter((b) => b.seatChanged).length;
        toast(`${name} are loc rezervat pe ${plural(result.bookings.length, 'cursă', 'curse')}${moved ? ` (alt loc în ${moved} ${moved === 1 ? 'zi' : 'zile'})` : ''}!`);
        setTimeout(() => { window.location.href = 'my-rides.html'; }, 900);
      } catch (err) {
        showError(err);
        $('#formError').textContent = err.message;
        $('#formError').hidden = false;
      }
    }));
  } catch (err) {
    renderError(content, err, load);
  }
}

load();
