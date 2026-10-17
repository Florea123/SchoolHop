import { api, auth, getMeta } from '../core/api.js';
import { mountShell } from '../core/layout.js';
import { $, $$, html, raw, params, renderError, showError, toast, withLoading, getCurrentPosition, initials, firstName } from '../core/ui.js';
import { check, firstError } from '../core/validate.js';
import { childFieldsHtml, readChildFields } from '../core/childForm.js';

const content = $('#content');
let me;
let meta;
let activeChildId = params().get('childId');
let coords = null;

function childEditor(c) {
  const selected = new Set(c.interests.map((i) => i.slug));
  return html`
    <div class="card card-blue" id="childCard">
      <div class="card-row" style="padding:0 0 10px"><span class="card-title" style="margin:0">${c.fullName}</span><span class="badge badge-ai">POTRIVIRI AI</span></div>
      <p class="small muted" style="margin-bottom:12px">${c.grade} · ${c.age} ani${c.teacher ? ` · ${c.teacher}` : ''}</p>
      <div class="form-group">
        <label class="form-label" for="bio">Descriere / pasiuni (pentru potrivirea cu colegii)</label>
        <textarea class="form-input" id="bio" maxlength="500">${c.bio || ''}</textarea>
      </div>
      <span class="form-label">Interesele copilului (max. 8)</span>
      <div class="chips" style="margin-bottom:14px" role="group" aria-label="Interese">
        ${meta.interests.map((i) => raw(html`<button type="button" class="chip" data-interest="${i.slug}" aria-pressed="${selected.has(i.slug)}">${i.label}</button>`))}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="area">Zona de domiciliu</label>
          <select class="form-input" id="area">${meta.areas.map((a) => raw(html`<option value="${a.name}" ${raw(a.name === c.homeArea ? 'selected' : '')}>${a.name}</option>`))}</select>
        </div>
        <div class="form-group">
          <label class="form-label" for="address">Adresa (privată)</label>
          <input class="form-input" id="address" maxlength="255" value="${c.homeAddress || ''}">
        </div>
      </div>
      <div class="btn-row" style="margin:-4px 0 14px"><button type="button" class="btn btn-secondary btn-sm" id="locate">Actualizează cu locația mea</button></div>
      <label class="checkbox"><input type="checkbox" id="booster" ${raw(c.needsBooster ? 'checked' : '')}> <span>Are nevoie de înălțător auto</span></label>
      <button class="btn btn-primary btn-block" id="saveChild">Salvează profilul lui ${firstName(c.fullName)}</button>
    </div>`;
}

function render() {
  const u = me.user;
  const isAdmin = u.role === 'admin';
  const child = me.children.find((c) => String(c.id) === String(activeChildId)) || me.children[0];
  if (child) activeChildId = child.id;

  content.innerHTML = html`
    <div class="card">
      <div class="parent-head">
        <div class="avatar" style="background:var(--brand-blue);color:#fff">${initials(u.fullName)}</div>
        <div><div class="strong">${u.fullName}</div>
          <div class="verified">${me.school ? me.school.name : ''}</div>
          <div class="small muted">${u.email}</div></div>
      </div>
      <form id="contactForm" novalidate>
        <div class="form-row">
          <div class="form-group"><label class="form-label" for="phone">Telefon</label><input class="form-input" id="phone" type="tel" inputmode="tel" maxlength="16" value="${u.phone || ''}"></div>
          ${isAdmin ? '' : raw(html`<div class="form-group"><label class="form-label" for="ecPhone">Telefon contact urgență</label><input class="form-input" id="ecPhone" type="tel" inputmode="tel" maxlength="16" value="${u.emergencyContactPhone || ''}"></div>`)}
        </div>
        ${isAdmin ? '' : raw(html`<div class="form-group"><label class="form-label" for="ecName">Contact de urgență</label><input class="form-input" id="ecName" maxlength="100" value="${u.emergencyContactName || ''}"></div>`)}
        <button class="btn btn-secondary btn-block" type="submit" id="saveContact">Salvează datele de contact</button>
      </form>
    </div>

    ${isAdmin ? '' : raw(html`
      <h2 class="section-title">Copiii mei</h2>
      ${me.children.length > 1 ? raw(html`<div class="child-tabs">${me.children.map((c) => raw(html`<button class="chip" data-child="${c.id}" aria-pressed="${c.id === activeChildId}">${firstName(c.fullName)}</button>`))}</div>`) : ''}
      ${child ? raw(childEditor(child)) : raw('<p class="muted">Niciun copil asociat.</p>')}
      <details class="card" id="addChildBox">
        <summary class="strong">Adaugă alt copil</summary>
        <form id="addChildForm" style="margin-top:12px" novalidate>
          <div class="form-group"><label class="form-label" for="addSchool">Școala</label>
            <select class="form-input" id="addSchool">${meta.schools.map((s) => raw(html`<option value="${s.id}" ${raw(s.id === u.schoolId ? 'selected' : '')}>${s.name}</option>`))}</select></div>
          ${childFieldsHtml('add', meta.config.gradeLevels)}
          <button class="btn btn-secondary btn-block" type="submit" id="addChildSubmit">Adaugă copilul</button>
        </form>
      </details>

      <h2 class="section-title">Mașinile mele</h2>
      <div class="card">
        ${me.vehicles.length ? me.vehicles.map((v) => raw(html`<div class="vehicle-row"><span><strong>${v.brand} ${v.model}</strong> · ${v.licensePlate}<br><span class="small muted">${v.color} · ${v.childSeats} locuri copii · ${v.boosterSeats} înălțătoare</span></span>
          <button class="btn-link danger" data-del-vehicle="${v.id}">Șterge</button></div>`)) : raw('<p class="small muted">Nicio mașină. O poți adăuga când publici o cursă.</p>')}
        <a class="btn btn-secondary btn-block" href="publish.html" style="margin-top:10px">Publică o cursă / adaugă mașină</a>
      </div>

      <div class="profile-links">
        <a class="btn btn-secondary" href="impact.html">Impact</a>
        <a class="btn btn-secondary" href="rewards.html">Insigne (${u.greenPoints} pct)</a>
      </div>`)}
    <button class="btn btn-link danger btn-block" id="logout">Ieși din cont</button>`;
  bind(child);
}

function bind(child) {
  $('#logout').addEventListener('click', () => auth.logout());
  $('#contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const error = firstError([
      [$('#phone'), check.phone($('#phone').value)],
      ...($('#ecName') ? [[$('#ecName'), check.name($('#ecName').value, 'Numele contactului')], [$('#ecPhone'), check.phone($('#ecPhone').value, 'Telefonul contactului')]] : []),
    ]);
    if (error) { showError(new Error(error)); return; }
    withLoading($('#saveContact'), async () => {
      try {
        const body = { phone: $('#phone').value };
        if ($('#ecName')) { body.emergencyContactName = $('#ecName').value; body.emergencyContactPhone = $('#ecPhone').value; }
        me = { ...me, ...(await api.patch('/me', body)) };
        toast('Datele de contact au fost salvate');
      } catch (err) { showError(err); }
    });
  });
  if (me.user.role === 'admin') return;

  $$('[data-child]').forEach((b) => b.addEventListener('click', () => {
    activeChildId = Number(b.dataset.child);
    coords = null;
    render();
  }));
  $$('[data-del-vehicle]').forEach((b) => b.addEventListener('click', async () => {
    if (!window.confirm('Ștergi mașina?')) return;
    try {
      await api.del(`/vehicles/${b.dataset.delVehicle}`);
      me.vehicles = me.vehicles.filter((v) => String(v.id) !== b.dataset.delVehicle);
      toast('Mașina a fost ștearsă');
      render();
    } catch (err) { showError(err); }
  }));
  $('#addChildForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const { body, rules } = readChildFields('add');
    const error = firstError(rules);
    if (error) { showError(new Error(error)); return; }
    withLoading($('#addChildSubmit'), async () => {
      try {
        const { child: added } = await api.post('/children', { schoolId: Number($('#addSchool').value), ...body });
        toast(`${added.fullName} a fost adăugat(ă). Completează-i zona de domiciliu.`);
        me = await api.get('/me');
        activeChildId = added.id;
        render();
      } catch (err) { showError(err); }
    });
  });
  if (!child) return;

  $$('[data-interest]').forEach((chip) => chip.addEventListener('click', () => {
    const on = chip.getAttribute('aria-pressed') === 'true';
    if (!on && $$('[data-interest][aria-pressed="true"]').length >= 8) { showError(new Error('Poți alege cel mult 8 interese')); return; }
    chip.setAttribute('aria-pressed', String(!on));
  }));
  $('#area').addEventListener('change', () => { coords = null; });
  $('#locate').addEventListener('click', async () => {
    try { coords = await getCurrentPosition(); toast('Locația va fi salvată la apăsarea butonului „Salvează”'); } catch (err) { showError(err); }
  });
  $('#saveChild').addEventListener('click', () => withLoading($('#saveChild'), async () => {
    const error = firstError([
      [$('#bio'), check.text($('#bio').value, 'Descrierea', { max: 500, required: false })],
      [$('#address'), check.text($('#address').value, 'Adresa', { min: 3, max: 255, required: false })],
    ]);
    if (error) { showError(new Error(error)); return; }
    try {
      const body = {
        bio: $('#bio').value,
        interests: $$('[data-interest][aria-pressed="true"]').map((c) => c.dataset.interest),
        homeArea: $('#area').value,
        homeAddress: $('#address').value,
        needsBooster: $('#booster').checked,
      };
      if (coords) { body.homeLat = coords.lat; body.homeLon = coords.lon; }
      const { child: updated } = await api.patch(`/children/${child.id}`, body);
      me.children = me.children.map((c) => (c.id === updated.id ? updated : c));
      coords = null;
      toast(`Profilul lui ${firstName(updated.fullName)} a fost salvat `);
    } catch (err) { showError(err); }
  }));
}

async function load() {
  try {
    [me, meta] = await Promise.all([mountShell({ active: 'profile' }), getMeta()]);
    render();
  } catch (err) {
    renderError(content, err, load);
  }
}

load();
