// Panoul școlii: indicatori calculați din cursele reale ale comunității
import { api } from '../core/api.js';
import { mountShell } from '../core/layout.js';
import { $, $$, html, raw, renderError, formatDate, formatShortDate, lei, plural, relativeTime } from '../core/ui.js';

const content = $('#content');
const tip = $('#tip');
let me;
let data;
let tab = 'traffic';

function kpis() {
  const p = data.impact.period;
  return html`<div class="kpi-grid">
    <div class="kpi"><div class="kpi-number" style="color:var(--peach)">${data.carsRemoved}</div><div class="kpi-label">Mașini eliminate de la poartă</div><div class="kpi-sub">copii aduși de alți părinți</div></div>
    <div class="kpi"><div class="kpi-number">${data.impact.verifiedParents}</div><div class="kpi-label">Părinți înscriși</div><div class="kpi-sub">cu copii la această școală</div></div>
    <div class="kpi"><div class="kpi-number">${data.avgMatchScore ?? '—'}${data.avgMatchScore != null ? '%' : ''}</div><div class="kpi-label">Scor mediu potrivire AI</div><div class="kpi-sub">${plural(data.matchedPairs, 'pereche de colegi', 'perechi de colegi')}</div></div>
    <div class="kpi"><div class="kpi-number">${p.co2SavedKg} kg</div><div class="kpi-label">CO₂ evitat</div><div class="kpi-sub">${p.kmSaved} km nerulați</div></div>
  </div>`;
}

// Completează zilele lucrătoare fără curse cu 0, ca axa timpului să fie continuă
function dailySeries() {
  const byDay = new Map(data.perDay.map((d) => [d.day, d.cars]));
  const out = [];
  const end = new Date();
  for (let i = data.days - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    if ([0, 6].includes(d.getDay())) continue;
    const key = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Bucharest' });
    out.push({ day: key, cars: byDay.get(key) || 0 });
  }
  return out;
}

function trafficTab() {
  const series = dailySeries();
  const max = Math.max(1, ...series.map((d) => d.cars));
  return html`<div class="dash-grid">
    <div class="card">
      <div class="card-title">Mașini eliminate pe zi de școală</div>
      <p class="small muted" style="margin-bottom:8px">Fiecare copil adus de alt părinte = o mașină în minus la orele de vârf (${data.school.bellTime.slice(0, 5)})</p>
      <div class="col-chart" role="img" aria-label="Grafic mașini eliminate pe zi">
        ${series.map((d) => raw(html`<div class="col" tabindex="0" data-tip="${formatShortDate(d.day)}: ${plural(d.cars, 'mașină', 'mașini')}"><span style="height:${(d.cars / max) * 100}%"></span></div>`))}
      </div>
      <div class="col-axis"><span>${series.length ? formatShortDate(series[0].day) : ''}</span><span>maxim ${plural(max, "mașină", "mașini")} / zi</span><span>${series.length ? formatShortDate(series[series.length - 1].day) : ''}</span></div>
      <details class="data-table"><summary>Vezi datele ca tabel</summary><div class="table-wrap"><table class="data"><thead><tr><th>Zi</th><th class="num">Mașini eliminate</th></tr></thead>
        <tbody>${series.map((d) => raw(html`<tr><td>${formatDate(d.day)}</td><td class="num">${d.cars}</td></tr>`))}</tbody></table></div></details>
    </div>
    <div class="card">
      <div class="card-title">Săptămâna viitoare</div>
      <div class="card-row"><span>Curse programate</span><strong>${data.upcoming.rides}</strong></div>
      <div class="card-row"><span>Copii cu loc rezervat</span><strong>${data.upcoming.children}</strong></div>
      <hr class="divider">
      <div class="card-title">Alerte recente</div>
      ${data.alerts.length ? data.alerts.map((a) => raw(html`<div class="alert-row">${a.type === 'sos' ? '' : ''} ${a.message}<br>
        <span class="small muted">${relativeTime(a.createdAt)} · ${a.resolvedAt ? 'rezolvată' : 'activă'}</span></div>`)) : raw('<p class="small muted">Nicio alertă.</p>')}
    </div>
  </div>`;
}

function corridorsTab() {
  const f = data.fund;
  return html`<div class="dash-grid">
    <div class="card">
      <div class="card-title">De unde vin copiii aduși în carpool</div>
      <p class="small muted" style="margin-bottom:16px">Distribuția curselor pe zona de plecare · ultimele ${data.days} zile</p>
      ${data.corridors.length ? data.corridors.map((c) => raw(html`<div class="hbar">
        <div class="hbar-label"><span>${c.area}</span><span>${plural(c.count, 'elev', 'elevi')} (${c.share}%)</span></div>
        <div class="hbar-track"><span style="width:${c.share}%"></span></div></div>`)) : raw('<p class="small muted">Nicio cursă în această perioadă.</p>')}
    </div>
    <div class="card card-peach">
      <div class="card-title">Fondul Social</div>
      <div class="kpi-number" style="color:var(--peach-dark)">${lei(f.balance)}</div>
      <div class="card-row"><span>Donații comunitate</span><strong>${lei(f.donations)}</strong></div>
      <div class="card-row"><span>Sponsori corporate</span><strong>${lei(f.corporate)}</strong></div>
      <div class="card-row"><span>Plătit șoferilor comunitari</span><strong>${lei(f.payouts)}</strong></div>
      <div class="card-row"><span>Curse rurale finanțate</span><strong>${f.ridesFunded}</strong></div>
    </div>
  </div>`;
}

const ROLE = { parent: 'Părinte', parent_driver: 'Părinte-șofer', community_driver: 'Șofer comunitar' };
function familiesTab() {
  return html`<div class="card"><div class="card-title">Familii înscrise (${data.families.length})</div>
    <div class="table-wrap"><table class="data"><thead><tr><th>Nume</th><th>Rol</th><th class="num">Copii</th><th class="num">Curse conduse</th><th class="num">Puncte</th></tr></thead>
    <tbody>${data.families.map((u) => raw(html`<tr><td><strong>${u.fullName}</strong><br><span class="small muted">${u.email}</span></td><td>${ROLE[u.role] || u.role}</td>
      <td class="num">${u.children}</td><td class="num">${u.ridesDriven}</td><td class="num">${u.greenPoints}</td></tr>`))}</tbody></table></div></div>`;
}

function render() {
  $('#schoolTitle').textContent = data.school.name;
  const body = tab === 'traffic' ? trafficTab() : tab === 'corridors' ? corridorsTab() : familiesTab();
  content.innerHTML = kpis() + body;
  $$('.col').forEach((col) => {
    const show = () => {
      const r = col.getBoundingClientRect();
      tip.textContent = col.dataset.tip;
      tip.hidden = false;
      const w = tip.offsetWidth;
      tip.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2))}px`;
      tip.style.top = `${r.top - 36}px`;
    };
    col.addEventListener('mouseenter', show);
    col.addEventListener('focus', show);
    col.addEventListener('mouseleave', () => { tip.hidden = true; });
    col.addEventListener('blur', () => { tip.hidden = true; });
  });
}

async function load() {
  content.innerHTML = '<div class="skeleton"></div>';
  try {
    data = await api.get(`/schools/${me.user.schoolId}/dashboard?days=${$('#period').value}`);
    render();
  } catch (err) {
    renderError(content, err, load);
  }
}

$$('#tabs .tab').forEach((t) => t.addEventListener('click', () => {
  tab = t.dataset.tab;
  $$('#tabs .tab').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
  if (data) render();
}));
$('#period').addEventListener('change', load);
window.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

mountShell({ active: 'dashboard', roles: ['admin'] }).then((m) => { me = m; return load(); }).catch((err) => renderError(content, err));
