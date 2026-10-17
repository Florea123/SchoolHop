import { getMeta } from '../core/api.js';
import { mountShell, bindBack } from '../core/layout.js';
import { renderMap } from '../core/map.js';
import { $, html, raw, params, showError, nextSchoolDay, isoDate, addMinutesToTime } from '../core/ui.js';

let me;
let meta;

function selectedChild() {
  return me.children.find((c) => String(c.id) === $('#child').value);
}

function refresh() {
  const child = selectedChild();
  if (!child) return;
  const school = meta.schools.find((s) => s.id === child.schoolId);
  const area = meta.areas.find((a) => a.name === $('#area').value);
  const toSchool = $('#direction').value === 'to_school';
  $('#school').value = school ? `${school.name} · ${school.dropoffPoint}` : '';
  $('#subtitle').textContent = toSchool ? `Plecare din cartier către ${school.shortName}` : `După ore, de la ${school.shortName} spre casă`;
  const bell = school.bellTime.slice(0, 5);
  $('#bellHint').textContent = toSchool ? `Clopoțelul sună la ${bell}` : '';
  if (toSchool && !$('#arriveBy').dataset.touched) $('#arriveBy').value = addMinutesToTime(bell, -5);
  if (!toSchool && !$('#arriveBy').dataset.touched) $('#arriveBy').value = '';
  const home = area ? { lat: area.lat, lon: area.lon, label: area.name, kind: 'start' } : null;
  const dest = { lat: school.lat, lon: school.lon, label: `${school.shortName}`, kind: 'school' };
  renderMap($('#map'), {
    route: home ? (toSchool ? [home, dest] : [dest, home]) : [],
    points: [home, dest].filter(Boolean),
    caption: 'Traseu schematic · locațiile exacte apar după alegerea cursei',
  });
}

async function init() {
  try {
    [me, meta] = await Promise.all([mountShell({ active: 'search', roles: ['parent', 'parent_driver', 'community_driver'] }), getMeta()]);
    bindBack($('#back'), 'home.html');
    const q = params();
    if (!me.children.length) {
      $('#searchForm').innerHTML = '<div class="empty-state"><p>Nu ai niciun copil asociat contului.</p><a class="btn btn-primary" href="profile.html" style="margin-top:12px">Adaugă copilul</a></div>';
      return;
    }
    $('#child').innerHTML = me.children.map((c) => raw(html`<option value="${c.id}">${c.fullName} · ${c.grade}${c.needsBooster ? ' (înălțător)' : ''}</option>`)).join('');
    if (q.get('childId')) $('#child').value = q.get('childId');
    $('#area').innerHTML = meta.areas.map((a) => raw(html`<option value="${a.name}">${a.name}</option>`)).join('');
    $('#area').value = q.get('area') || selectedChild().homeArea || meta.areas[0].name;
    if (q.get('direction')) $('#direction').value = q.get('direction');
    $('#date').min = isoDate(new Date());
    $('#date').value = q.get('date') || nextSchoolDay();
    refresh();
  } catch (err) { showError(err); }
}

$('#child').addEventListener('change', () => {
  const c = selectedChild();
  if (c && c.homeArea) $('#area').value = c.homeArea;
  refresh();
});
$('#area').addEventListener('change', refresh);
$('#direction').addEventListener('change', refresh);
$('#arriveBy').addEventListener('input', (e) => { e.target.dataset.touched = '1'; });

$('#searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const err = $('#formError');
  err.hidden = true;
  const child = selectedChild();
  if (!child.profileComplete) {
    err.innerHTML = 'Completează mai întâi zona de domiciliu a copilului în <a href="verify.html">profil</a>.';
    err.hidden = false;
    return;
  }
  if (!$('#date').value) { err.textContent = 'Alege data.'; err.hidden = false; return; }
  const q = new URLSearchParams({ childId: child.id, date: $('#date').value, area: $('#area').value, direction: $('#direction').value });
  if ($('#arriveBy').value) q.set('arriveBy', $('#arriveBy').value);
  window.location.href = `results.html?${q}`;
});

init();
