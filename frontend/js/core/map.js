// Harta reală a Iașiului (OpenStreetMap + Leaflet, inclus local în vendor/leaflet)

import { escapeHtml } from './ui.js';

const IASI_CENTER = [47.1585, 27.6014];
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

const KIND_STYLE = {
  home: { color: '#C9773A', fill: '#E8A060', radius: 7 },
  meet: { color: '#0A4747', fill: '#0F6E6E', radius: 8 },
  start: { color: '#0A4747', fill: '#0F6E6E', radius: 7 },
  school: { color: '#D9542A', fill: '#EE6A3F', radius: 9 },
};

let leafletPromise = null;

// Încarcă Leaflet o singură dată (script clasic care definește window.L)
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'vendor/leaflet/leaflet.css';
      document.head.appendChild(css);
      const script = document.createElement('script');
      script.src = 'vendor/leaflet/leaflet.js';
      script.onload = () => resolve(window.L);
      script.onerror = () => reject(new Error('Harta nu a putut fi încărcată'));
      document.head.appendChild(script);
    });
  }
  return leafletPromise;
}

const valid = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon));
const latLng = (p) => [Number(p.lat), Number(p.lon)];

function setup(L, container) {
  container.innerHTML = '';
  const canvas = document.createElement('div');
  canvas.className = 'map-canvas';
  const caption = document.createElement('span');
  caption.className = 'map-caption';
  container.append(canvas, caption);

  const map = L.map(canvas, { scrollWheelZoom: false, zoomControl: false }).setView(IASI_CENTER, 13);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
  // Zoom cu rotița doar după ce utilizatorul dă click pe hartă (nu blochează derularea paginii)
  map.on('click', () => map.scrollWheelZoom.enable());
  map.on('mouseout', () => map.scrollWheelZoom.disable());

  const state = { map, layer: L.layerGroup().addTo(map), caption, fitKey: '' };
  // Containerul își poate schimba dimensiunea după afișare (layout responsive)
  new ResizeObserver(() => map.invalidateSize()).observe(container);
  container._schoolhopMap = state;
  return state;
}

/**
 * Desenează (sau actualizează) harta în container.
 * @param {HTMLElement} container
 * @param {{route?: {lat,lon}[], points?: {lat,lon,label,kind}[], car?: {lat,lon}|null,
 *          alert?: {lat,lon}|null, walk?: {lat,lon}[]|null, caption?: string}} data
 */
export async function renderMap(container, { route = [], points = [], car = null, alert = null, walk = null, caption = '' }) {
  let L;
  try {
    L = await loadLeaflet();
  } catch (err) {
    container.innerHTML = `<span class="map-caption">${escapeHtml(err.message)}</span>`;
    return;
  }
  const state = container._schoolhopMap || setup(L, container);
  const { map, layer } = state;
  layer.clearLayers();

  const routePts = route.filter(valid).map(latLng);
  if (routePts.length > 1) {
    L.polyline(routePts, { color: '#8CC5BF', weight: 9, opacity: 0.9, lineCap: 'round' }).addTo(layer);
    L.polyline(routePts, { color: '#0F6E6E', weight: 4, lineCap: 'round' }).addTo(layer);
  }
  const walkPts = (walk || []).filter(valid).map(latLng);
  if (walkPts.length > 1) {
    L.polyline(walkPts, { color: '#C9773A', weight: 3, dashArray: '6 6' }).addTo(layer);
  }

  points.filter(valid).forEach((p) => {
    const s = KIND_STYLE[p.kind] || KIND_STYLE.start;
    L.circleMarker(latLng(p), { radius: s.radius, color: '#fff', weight: 3, fillColor: s.fill, fillOpacity: 1 })
      .bindTooltip(escapeHtml(p.label), {
        permanent: true, className: 'map-label',
        direction: p.kind === 'home' ? 'bottom' : 'top', offset: p.kind === 'home' ? [0, 8] : [0, -8],
      })
      .addTo(layer);
  });

  if (valid(alert)) {
    L.circleMarker(latLng(alert), { radius: 11, color: '#fff', weight: 3, fillColor: '#B83232', fillOpacity: 1 })
      .bindTooltip('Deviere', { permanent: true, direction: 'right', offset: [10, 0], className: 'map-label map-label-alert' })
      .addTo(layer);
  }
  if (valid(car)) {
    L.marker(latLng(car), {
      icon: L.divIcon({ className: 'map-car', html: '<span></span>', iconSize: [24, 24] }),
      zIndexOffset: 1000,
      keyboard: false,
    }).addTo(layer);
  }

  state.caption.textContent = caption;
  state.caption.hidden = !caption;

  // Încadrăm harta doar când se schimbă punctele fixe, ca actualizările live să nu reseteze zoom-ul
  const fixed = [...routePts, ...walkPts, ...points.filter(valid).map(latLng)];
  const key = JSON.stringify(fixed);
  if (key !== state.fitKey) {
    state.fitKey = key;
    if (fixed.length > 1) map.fitBounds(fixed, { padding: [36, 36], maxZoom: 16 });
    else if (fixed.length === 1) map.setView(fixed[0], 15);
    else map.setView(IASI_CENTER, 13);
  }
}
