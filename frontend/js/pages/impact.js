import { api } from '../core/api.js';
import { mountShell, bindBack } from '../core/layout.js';
import { $, $$, html, raw, renderError, showError, toast, withLoading, lei, plural, relativeTime } from '../core/ui.js';

const content = $('#content');
const PRESETS = [10, 25, 50, 100];

function stats(i) {
  return html`<div class="stat-grid">
    <div class="stat"><div class="stat-value">${i.soloTripsAvoided}</div><div class="stat-label">Deplasări solo evitate</div></div>
    <div class="stat"><div class="stat-value">${i.kmSaved} km</div><div class="stat-label">Kilometri economisiți</div></div>
    <div class="stat"><div class="stat-value">${i.co2SavedKg} kg</div><div class="stat-label">CO₂ evitat</div></div>
    <div class="stat"><div class="stat-value">~${i.hoursSaved} h</div><div class="stat-label">Timp economisit în trafic</div></div>
    <div class="stat"><div class="stat-value">${lei(i.moneySavedLei)}</div><div class="stat-label">Bani economisiți</div></div>
  </div>`;
}

async function load() {
  try {
    await mountShell({ active: 'profile', roles: ['parent', 'parent_driver', 'community_driver'] });
    bindBack($('#back'), 'profile.html');
    const [impact, fund] = await Promise.all([api.get('/me/impact'), api.get('/social-fund')]);
    const surname = impact.familyName.split(' ').slice(-1)[0];

    content.innerHTML = html`
      <h1 class="page-title">Impactul familiei ${surname}</h1>
      <p class="page-subtitle">Rezultatele drumurilor făcute împreună</p>
      <div class="card impact-hero">
        <div class="card-title">Când copiii merg cu alți părinți</div>
        <p class="small muted" style="margin-bottom:12px">${plural(impact.ridesWithClassmates, 'cursă', 'curse')} de carpool cu colegii · ${impact.greenPoints} puncte Erou Verde</p>
        ${raw(stats(impact.asPassenger))}
      </div>
      ${impact.childrenDriven ? raw(html`<div class="card">
        <div class="card-title">Când tu duci copiii altor familii</div>
        <p class="small muted" style="margin-bottom:12px">Ai dus la destinație ${plural(impact.childrenDriven, 'copil', 'copii')} ai altor familii</p>
        ${raw(stats(impact.asDriver))}</div>`) : ''}

      <h2 class="section-title">Fondul Social pentru copiii de la sat</h2>
      <div class="card card-yellow">
        <span class="small muted">Sold disponibil</span>
        <div class="fund-balance">${lei(fund.balance)}</div>
        <p class="small muted">${plural(fund.ridesFunded, 'cursă finanțată', 'curse finanțate')} · ${plural(fund.childrenHelped, 'transport de copil', 'transporturi de copii')} din satele fără microbuz${fund.sponsorMatchRatio > 0 ? ` · fiecare leu donat e dublat de sponsor` : ''}</p>
      </div>
      <form class="card" id="donateForm" novalidate>
        <div class="card-title">Donează în fond${impact.donatedLei ? ` · ai donat deja ${lei(impact.donatedLei)}` : ''}</div>
        <div class="donate-row" role="group" aria-label="Sumă">${PRESETS.map((v) => raw(html`<button type="button" class="chip" data-amount="${v}" aria-pressed="false">${v} lei</button>`))}</div>
        <div class="form-group"><label class="form-label" for="amount">Altă sumă (lei)</label><input class="form-input" id="amount" type="number" min="5" max="5000" step="1"></div>
        <button class="btn btn-yellow btn-block" type="submit" id="donate">Donează</button>
        <p class="form-hint">Demo: donația este înregistrată în registrul transparent al fondului, fără plată reală.</p>
      </form>
      <div class="card">
        <div class="card-title">Registru transparent</div>
        ${fund.recent.map((t) => raw(html`<div class="tx"><span>${t.description}<br><span class="muted small">${relativeTime(t.createdAt)}</span></span>
          <span class="amount ${t.type === 'driver_payout' ? 'out' : 'in'}">${t.type === 'driver_payout' ? '−' : '+'}${lei(t.amount)}</span></div>`))}
      </div>
      <a class="btn btn-primary btn-block" href="my-rides.html?scope=history">Vezi istoricul curselor</a>`;

    $$('[data-amount]').forEach((c) => c.addEventListener('click', () => {
      $$('[data-amount]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      c.setAttribute('aria-pressed', 'true');
      $('#amount').value = c.dataset.amount;
    }));
    $('#donateForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = Number($('#amount').value);
      if (!(amount >= 5)) { showError(new Error('Suma minimă este 5 lei')); return; }
      withLoading($('#donate'), async () => {
        try {
          await api.post('/social-fund/donations', { amount });
          toast(`Mulțumim pentru cei ${amount} lei! `);
          await load();
        } catch (err) { showError(err); }
      });
    });
  } catch (err) {
    renderError(content, err, load);
  }
}

load();
