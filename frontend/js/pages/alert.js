// Detaliile alertelor active (deviere / SOS) ale unei curse
import { api } from '../core/api.js';
import { mountShell, bindBack } from '../core/layout.js';
import { renderMap } from '../core/map.js';
import { $, $$, html, raw, params, renderError, showError, toast, withLoading, formatTime, relativeTime } from '../core/ui.js';

const rideId = params().get('rideId');
const content = $('#content');

async function load() {
  try {
    await mountShell({ active: 'rides' });
    bindBack($('#back'), `ride.html?rideId=${rideId}`);
    const s = await api.get(`/rides/${encodeURIComponent(rideId)}/live`);
    const { ride } = s;
    const deviation = s.alerts.find((a) => a.alert_type === 'deviation');
    $('#badge').hidden = !s.alerts.length;

    if (!s.alerts.length) {
      content.innerHTML = html`<h1 class="page-title">Nicio alertă activă</h1>
        <p class="page-subtitle">Cursa cu ${ride.driver.fullName} decurge normal.</p>
        <div class="callout callout-info">Toate alertele acestei curse au fost clarificate.</div>
        <a class="btn btn-primary btn-block" href="ride.html?rideId=${rideId}">Înapoi la cursă</a>`;
      return;
    }

    content.innerHTML = html`
      <h1 class="page-title">${deviation ? 'Verificare traseu elev' : 'Alertă SOS activă'}</h1>
      <p class="page-subtitle">${deviation ? 'Sistemul a detectat o abatere neprogramată de la drumul spre școală' : 'O persoană de pe cursă a cerut ajutor'}</p>
      ${s.alerts.map((a) => raw(html`
        <div class="callout callout-alert alert-item"><span>${a.alert_type === 'sos' ? '' : ''}</span>
          <div>${a.message}<div class="meta">${relativeTime(a.created_at)}${a.raised_by_name ? ` · de ${a.raised_by_name}` : ' · detectată automat'}${a.distance_m ? ` · ${a.distance_m} m de traseu` : ''}</div>
          <button class="btn btn-secondary btn-sm" style="margin-top:8px" data-resolve="${a.alert_id}">Situație clarificată</button></div>
        </div>`))}
      <div class="map-box" id="map"></div>
      <div class="card">
        <div class="card-row"><span>Șofer</span><strong>${ride.driver.fullName}</strong></div>
        <div class="card-row"><span>Mașina</span><strong>${ride.vehicle.brand} ${ride.vehicle.model} · ${ride.vehicle.licensePlate}</strong></div>
        <div class="card-row"><span>Ultima poziție</span><strong>${s.location ? formatTime(s.location.recorded_at) : '—'}</strong></div>
      </div>
      <div class="btn-row" style="margin-bottom:12px">
        ${ride.school.phone ? raw(html`<a class="btn btn-danger" href="tel:${ride.school.phone}">Apelează secretariatul</a>`) : ''}
        ${s.role !== 'driver' && ride.driver.phone ? raw(html`<a class="btn btn-secondary" href="tel:${ride.driver.phone}">Sună șoferul</a>`) : ''}
      </div>
      <a class="btn btn-primary btn-block" href="ride.html?rideId=${rideId}">Înapoi la urmărirea cursei</a>`;

    renderMap($('#map'), {
      route: s.route,
      points: [
        { ...s.route[0], label: 'Plecare', kind: 'meet' },
        { ...s.route[s.route.length - 1], label: `${ride.school.shortName}`, kind: 'school' },
      ],
      alert: deviation && deviation.lat != null ? { lat: deviation.lat, lon: deviation.lon } : null,
      car: s.location,
      caption: 'Roșu = locul în care a fost detectată devierea',
    });

    $$('[data-resolve]').forEach((btn) => btn.addEventListener('click', () => withLoading(btn, async () => {
      try {
        await api.post(`/rides/${rideId}/alerts/${btn.dataset.resolve}/resolve`);
        toast('Situația a fost marcată ca clarificată. Ceilalți părinți au fost anunțați.');
        await load();
      } catch (err) { showError(err); }
    })));
  } catch (err) {
    renderError(content, err, load);
  }
}

load();
