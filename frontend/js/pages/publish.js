import { api, getMeta } from '../core/api.js';
import { mountShell } from '../core/layout.js';
import { $, $$, html, raw, renderError, showError, toast, withLoading, getCurrentPosition, nextSchoolDay, isoDate, addMinutesToTime, firstName, plural } from '../core/ui.js';
import { check, firstError } from '../core/validate.js';

const content = $('#content');
const DAYS = [['1', 'L', 'Luni'], ['2', 'Ma', 'Marți'], ['3', 'Mi', 'Miercuri'], ['4', 'J', 'Joi'], ['5', 'V', 'Vineri'], ['6', 'S', 'Sâmbătă'], ['7', 'D', 'Duminică']];
let me;
let meta;
let coords = null;

function vehicleOptions() {
  return me.vehicles.map((v) => raw(html`<option value="${v.id}">${v.brand} ${v.model} · ${v.licensePlate} (${v.childSeats} locuri copii)</option>`)).join('');
}

function ownKidsAt(schoolId) {
  return me.children.filter((c) => c.schoolId === schoolId);
}

function render() {
  const schoolIds = [...new Set(me.children.map((c) => c.schoolId).concat(me.user.role === 'community_driver' ? [me.user.schoolId] : []))].filter(Boolean);
  const schools = meta.schools.filter((s) => schoolIds.includes(s.id));
  const defaultArea = (me.children[0] && me.children[0].homeArea) || meta.areas[0].name;

  content.innerHTML = html`
    <form id="publishForm" novalidate>
      <div class="form-group">
        <label class="form-label" for="school">Școala (destinație)</label>
        <select class="form-input" id="school">${schools.map((s) => raw(html`<option value="${s.id}">${s.name}</option>`))}</select>
        <span class="form-hint" id="dropoffHint"></span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="area">Zona de plecare</label>
          <select class="form-input" id="area">${meta.areas.map((a) => raw(html`<option value="${a.name}" ${raw(a.name === defaultArea ? 'selected' : '')}>${a.name}</option>`))}</select>
        </div>
        <div class="form-group">
          <label class="form-label" for="address">Punct de întâlnire (adresă)</label>
          <input class="form-input" id="address" required maxlength="255" placeholder="ex: stația de autobuz de pe str. Livezii">
        </div>
      </div>
      <div class="location-row">
        <button type="button" class="btn btn-secondary btn-sm" id="locate">Folosește locația mea ca punct de întâlnire</button>
        <span class="form-hint" id="locateHint">Altfel folosim centrul zonei pe hartă</span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="startDate">Începând cu</label>
          <input class="form-input" type="date" id="startDate" min="${isoDate(new Date())}" value="${nextSchoolDay()}">
        </div>
        <div class="form-group">
          <label class="form-label" for="time">Ora plecării</label>
          <input class="form-input" type="time" id="time" required>
        </div>
      </div>
      <fieldset class="form-group">
        <legend>Zilele în care oferi cursa (în următoarele 7 zile)</legend>
        <div class="day-pills">${DAYS.map(([v, s, l]) => raw(html`<button type="button" class="day-pill" data-day="${v}" aria-label="${l}" aria-pressed="${Number(v) <= 5}">${s}</button>`))}</div>
      </fieldset>

      <div class="form-group">
        <label class="form-label" for="vehicle">Mașina</label>
        ${me.vehicles.length ? raw(html`<select class="form-input" id="vehicle">${raw(vehicleOptions())}</select>`) : raw('<p class="small muted" id="noVehicle">Nu ai nicio mașină înregistrată. Adaug-o mai jos.</p>')}
      </div>
      <details class="card vehicle-form" id="vehicleDetails" ${raw(me.vehicles.length ? '' : 'open')}>
        <summary class="strong">Adaugă o mașină</summary>
        <div class="form-row" style="margin-top:12px">
          <div class="form-group"><label class="form-label" for="vBrand">Marca</label><input class="form-input" id="vBrand" maxlength="50"></div>
          <div class="form-group"><label class="form-label" for="vModel">Modelul</label><input class="form-input" id="vModel" maxlength="50"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label" for="vColor">Culoarea</label><input class="form-input" id="vColor" maxlength="30"></div>
          <div class="form-group"><label class="form-label" for="vPlate">Nr. înmatriculare</label><input class="form-input" id="vPlate" placeholder="IS 12 ABC" autocapitalize="characters" maxlength="10"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label" for="vSeats">Locuri pentru copii</label><input class="form-input" type="number" id="vSeats" min="1" max="7" value="3"></div>
          <div class="form-group"><label class="form-label" for="vBoosters">Înălțătoare</label><input class="form-input" type="number" id="vBoosters" min="0" max="7" value="1"></div>
        </div>
        <button type="button" class="btn btn-secondary btn-block" id="addVehicle">Salvează mașina</button>
      </details>

      <label class="checkbox" id="ownKidsRow"><input type="checkbox" id="ownKids" checked> <span id="ownKidsLabel"></span></label>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="seats">Locuri oferite colegilor</label>
          <input class="form-input" type="number" id="seats" min="1" value="1">
          <span class="form-hint" id="seatsHint"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="price">Contribuție / copil (lei)</label>
          <input class="form-input" type="number" id="price" min="0" max="50" step="0.5" value="0">
          <span class="form-hint">Doar costul combustibilului, 0 = gratuit</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="returnTime">Fac și drumul înapoi după ore la (opțional)</label>
        <input class="form-input" type="time" id="returnTime">
      </div>
      <div class="form-group">
        <label class="form-label" for="notes">Note pentru părinți (opțional)</label>
        <textarea class="form-input" id="notes" maxlength="500" placeholder="ex: plecăm la fix, avem 2 înălțătoare"></textarea>
      </div>
      <p class="form-hint error" id="formError" role="alert" hidden></p>
      <button class="btn btn-primary btn-block" type="submit" id="submit">Publică cursa pentru părinții din școală</button>
    </form>`;
  bind();
  onSchoolChange();
}

function currentVehicle() {
  const sel = $('#vehicle');
  return sel ? me.vehicles.find((v) => String(v.id) === sel.value) : null;
}

function updateSeats() {
  const v = currentVehicle();
  const kids = $('#ownKids').checked ? ownKidsAt(Number($('#school').value)).length : 0;
  const max = v ? Math.max(0, v.childSeats - kids) : 0;
  $('#seats').max = String(max);
  if (Number($('#seats').value) > max) $('#seats').value = String(max);
  $('#seatsHint').textContent = v ? `Maxim ${max} (${v.childSeats} locuri pentru copii${kids ? `, ${kids} ocupate de copiii tăi` : ''})` : 'Adaugă mai întâi o mașină';
}

function onSchoolChange() {
  const school = meta.schools.find((s) => String(s.id) === $('#school').value);
  if (!school) return;
  $('#subtitle').textContent = `${me.user.fullName.split(' ')[0]}, oferi locuri pentru colegii de la ${school.shortName}`;
  $('#dropoffHint').textContent = `Predare la: ${school.dropoffPoint} · clopoțel ${school.bellTime.slice(0, 5)}`;
  if (!$('#time').value) $('#time').value = addMinutesToTime(school.bellTime, -30);
  const kids = ownKidsAt(school.id);
  $('#ownKidsRow').hidden = !kids.length;
  $('#ownKidsLabel').textContent = `Iau și ${kids.map((k) => firstName(k.fullName)).join(' și ')} în mașină (ocupă ${plural(kids.length, 'loc', 'locuri')})`;
  updateSeats();
}

function bind() {
  $('#school').addEventListener('change', onSchoolChange);
  $('#ownKids').addEventListener('change', updateSeats);
  if ($('#vehicle')) $('#vehicle').addEventListener('change', updateSeats);
  $('#area').addEventListener('change', () => { coords = null; $('#locateHint').textContent = 'Altfel folosim centrul zonei pe hartă'; });
  $$('.day-pill').forEach((p) => p.addEventListener('click', () => p.setAttribute('aria-pressed', String(p.getAttribute('aria-pressed') !== 'true'))));

  $('#locate').addEventListener('click', async () => {
    try {
      coords = await getCurrentPosition();
      $('#locateHint').textContent = 'Locația curentă va fi punctul de întâlnire ';
    } catch (err) { showError(err); }
  });

  $('#addVehicle').addEventListener('click', () => withLoading($('#addVehicle'), async () => {
    const seats = Number($('#vSeats').value);
    const boosters = Number($('#vBoosters').value);
    const error = firstError([
      [$('#vBrand'), check.text($('#vBrand').value, 'Marca', { min: 2, max: 50 })],
      [$('#vModel'), check.text($('#vModel').value, 'Modelul', { min: 1, max: 50 })],
      [$('#vColor'), check.text($('#vColor').value, 'Culoarea', { min: 3, max: 30 }) || (/^[\p{L} -]+$/u.test($('#vColor').value.trim()) ? null : 'Culoarea poate conține doar litere.')],
      [$('#vPlate'), check.plate($('#vPlate').value)],
      [$('#vSeats'), Number.isInteger(seats) && seats >= 1 && seats <= 7 ? null : 'Mașina poate avea între 1 și 7 locuri pentru copii.'],
      [$('#vBoosters'), Number.isInteger(boosters) && boosters >= 0 && boosters <= seats ? null : 'Numărul de înălțătoare trebuie să fie între 0 și numărul de locuri.'],
    ]);
    if (error) { showError(new Error(error)); return; }
    try {
      const { vehicle } = await api.post('/vehicles', {
        brand: $('#vBrand').value, model: $('#vModel').value, color: $('#vColor').value,
        licensePlate: $('#vPlate').value, childSeats: Number($('#vSeats').value), boosterSeats: Number($('#vBoosters').value),
      });
      me.vehicles.push(vehicle);
      toast('Mașina a fost adăugată');
      const keep = collect(false);
      render();
      restore(keep);
      $('#vehicle').value = String(vehicle.id);
      updateSeats();
    } catch (err) { showError(err); }
  }));

  $('#publishForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = $('#formError');
    errorEl.hidden = true;
    const body = collect(true);
    const maxSeats = Number($('#seats').max);
    const today = isoDate(new Date());
    const problem = firstError([
      [null, body.vehicleId ? null : 'Adaugă și selectează o mașină.'],
      [$('#address'), check.text(body.address, 'Punctul de întâlnire', { min: 3, max: 255 })],
      [$('#startDate'), body.startDate && body.startDate >= today ? null : 'Data de început nu poate fi în trecut.'],
      [$('#time'), body.time ? null : 'Alege ora plecării.'],
      [null, body.days.length ? null : 'Selectează cel puțin o zi.'],
      [$('#seats'), Number.isInteger(body.seats) && body.seats >= 1 && body.seats <= maxSeats ? null : `Poți oferi între 1 și ${maxSeats} locuri.`],
      [$('#price'), body.price >= 0 && body.price <= 50 ? null : 'Contribuția trebuie să fie între 0 și 50 lei.'],
      [$('#notes'), check.text(body.notes, 'Notele', { max: 500, required: false })],
    ]);
    if (problem) { errorEl.textContent = problem; errorEl.hidden = false; return; }
    await withLoading($('#submit'), async () => {
      try {
        const res = await api.post('/rides', body);
        toast(`Ai publicat ${plural(res.count, 'cursă', 'curse')}. Mulțumim!`);
        setTimeout(() => { window.location.href = 'my-rides.html'; }, 900);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      }
    });
  });
}

function collect(forSubmit) {
  const body = {
    schoolId: Number($('#school').value),
    area: $('#area').value,
    address: $('#address').value.trim(),
    startDate: $('#startDate').value,
    time: $('#time').value,
    days: $$('.day-pill[aria-pressed="true"]').map((p) => Number(p.dataset.day)),
    vehicleId: $('#vehicle') ? Number($('#vehicle').value) : null,
    seats: Number($('#seats').value),
    price: Number($('#price').value || 0),
    returnTime: $('#returnTime').value || undefined,
    notes: $('#notes').value.trim() || undefined,
    includeOwnChildren: $('#ownKids').checked,
  };
  if (forSubmit && coords) { body.lat = coords.lat; body.lon = coords.lon; }
  return body;
}

function restore(b) {
  $('#school').value = String(b.schoolId);
  $('#area').value = b.area;
  $('#address').value = b.address;
  $('#startDate').value = b.startDate;
  $('#time').value = b.time;
  $$('.day-pill').forEach((p) => p.setAttribute('aria-pressed', String(b.days.includes(Number(p.dataset.day)))));
  $('#seats').value = String(b.seats || 1);
  $('#price').value = String(b.price);
  $('#returnTime').value = b.returnTime || '';
  $('#notes').value = b.notes || '';
  $('#ownKids').checked = b.includeOwnChildren;
}

async function load() {
  try {
    [me, meta] = await Promise.all([mountShell({ active: 'publish', roles: ['parent', 'parent_driver', 'community_driver'] }), getMeta()]);
    if (!me.children.length && me.user.role !== 'community_driver') {
      content.innerHTML = '<div class="empty-state"><p>Poți publica doar curse către școala copiilor tăi. Adaugă mai întâi copilul.</p><a class="btn btn-primary" href="profile.html" style="margin-top:12px">Mergi la profil</a></div>';
      return;
    }
    render();
  } catch (err) {
    renderError(content, err, load);
  }
}

load();
