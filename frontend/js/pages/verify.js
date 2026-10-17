// Pasul 2: date sincronizate din catalog + completarea profilului copilului
import { api, auth, getMeta } from '../core/api.js';
import { $, $$, html, raw, showError, toast, withLoading, getCurrentPosition, formatDate, initials } from '../core/ui.js';
import { check, firstError } from '../core/validate.js';

if (!auth.isLoggedIn) window.location.replace('login.html');

let me;
let meta;
const coords = {}; // childId -> {lat, lon} obținute prin GPS

function childForm(c) {
  return html`
    <div class="card child-card" data-child="${c.id}">
      <div class="child-head">
        <div class="avatar avatar-kid" aria-hidden="true">${initials(c.fullName)}</div>
        <div>
          <div class="strong">${c.fullName}</div>
          <div class="small muted">${c.grade} · ${c.age} ani${c.teacher ? ` · ${c.teacher}` : ''}</div>
          <div class="synced">Sincronizat cu catalogul școlii · născut(ă) ${formatDate(c.birthDate, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="area-${c.id}">Zona de domiciliu</label>
        <select class="form-input" id="area-${c.id}" data-field="area">
          <option value="">Alege cartierul / satul</option>
          ${meta.areas.map((a) => raw(html`<option value="${a.name}" ${raw(a.name === c.homeArea ? 'selected' : '')}>${a.name}${a.isRural ? ' (rural)' : ''}</option>`))}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="addr-${c.id}">Adresa (opțional, vizibilă doar ție)</label>
        <input class="form-input" id="addr-${c.id}" data-field="address" value="${c.homeAddress || ''}" autocomplete="street-address" maxlength="255">
      </div>
      <div class="form-group location-row">
        <button type="button" class="btn btn-secondary btn-sm" data-locate>Folosește locația mea exactă</button>
        <span class="form-hint" data-locate-hint>${c.homeLat != null ? 'Locație salvată' : 'Altfel folosim centrul zonei'}</span>
      </div>
      <label class="checkbox"><input type="checkbox" data-field="booster" ${raw(c.needsBooster || (c.homeArea == null && c.age < 10) ? 'checked' : '')}>
        <span>Are nevoie de înălțător auto (recomandat sub 1,35 m / 10 ani)</span></label>
    </div>`;
}

function render() {
  $('#subtitle').textContent = `Registrul ${me.school ? me.school.name : 'școlii'}`;
  $('#children').innerHTML = me.children.length
    ? me.children.map((c) => raw(childForm(c))).join('')
    : html`<p class="muted">Niciun copil asociat încă.</p>`;

  $$('[data-locate]').forEach((btn) => btn.addEventListener('click', async () => {
    const card = btn.closest('[data-child]');
    try {
      coords[card.dataset.child] = await getCurrentPosition();
      card.querySelector('[data-locate-hint]').textContent = 'Locație exactă preluată ';
    } catch (err) { showError(err); }
  }));
}

async function load() {
  try {
    [me, meta] = await Promise.all([api.get('/me'), getMeta()]);
    if (me.user.role === 'admin') return window.location.replace('dashboard.html');
    render();
  } catch (err) { showError(err); }
}

$('#claimForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const error = firstError([[$('#claimAccount'), check.accountId($('#claimAccount').value)]]);
  if (error) { showError(new Error(error)); return; }
  await withLoading($('#claimSubmit'), async () => {
    try {
      await api.post('/children/claim', { schoolId: me.user.schoolId, schoolAccountId: $('#claimAccount').value.trim() });
      toast('Copilul a fost găsit în catalog și adăugat');
      $('#claimAccount').value = '';
      $('#addChild').open = false;
      await load();
    } catch (err) { showError(err); }
  });
});

$('#continue').addEventListener('click', async () => {
  const errorEl = $('#formError');
  errorEl.hidden = true;
  const cards = $$('[data-child]');
  const error = firstError(cards.flatMap((card) => [
    [card.querySelector('[data-field="area"]'), card.querySelector('[data-field="area"]').value ? null : 'Alege zona de domiciliu pentru fiecare copil.'],
    [card.querySelector('[data-field="address"]'), check.text(card.querySelector('[data-field="address"]').value, 'Adresa', { min: 3, max: 255, required: false })],
  ]));
  if (error) {
    errorEl.textContent = error;
    errorEl.hidden = false;
    return;
  }
  await withLoading($('#continue'), async () => {
    try {
      for (const card of cards) {
        const id = card.dataset.child;
        const body = {
          homeArea: card.querySelector('[data-field="area"]').value,
          homeAddress: card.querySelector('[data-field="address"]').value,
          needsBooster: card.querySelector('[data-field="booster"]').checked,
        };
        if (coords[id]) { body.homeLat = coords[id].lat; body.homeLon = coords[id].lon; }
        await api.patch(`/children/${id}`, body);
      }
      window.location.href = 'emergency.html';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });
});

load();
