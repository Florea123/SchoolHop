// Hartă schematică SVG generată din coordonatele reale (fără servicii externe)

import { escapeHtml } from './ui.js';

const W = 360;
const H = 200;
const PAD = 34;

const KIND_STYLE = {
  home: { fill: '#E8A060', r: 6 },
  meet: { fill: '#1F3434', r: 7 },
  start: { fill: '#0F6E6E', r: 6 },
  school: { fill: '#E8A060', r: 8 },
};

function projector(points) {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const minX = Math.min(...lons) * kx;
  const maxX = Math.max(...lons) * kx;
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const spanX = Math.max(maxX - minX, 0.004);
  const spanY = Math.max(maxY - minY, 0.004);
  const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
  const offX = (W - spanX * scale) / 2;
  const offY = (H - spanY * scale) / 2;
  return (p) => ({
    x: offX + (p.lon * kx - minX) * scale,
    y: H - (offY + (p.lat - minY) * scale),
  });
}

/**
 * @param {HTMLElement} container
 * @param {{route?: {lat,lon}[], points?: {lat,lon,label,kind}[], car?: {lat,lon}|null, alert?: {lat,lon}|null, walk?: [{lat,lon},{lat,lon}]}} data
 */
export function renderMap(container, { route = [], points = [], car = null, alert = null, walk = null, caption = '' }) {
  const all = [...route, ...points, ...(car ? [car] : []), ...(alert ? [alert] : [])].filter((p) => p && p.lat != null);
  if (!all.length) { container.innerHTML = ''; return; }
  const project = projector(all);

  const routePath = route.length > 1 ? route.map((p, i) => { const q = project(p); return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join(' ') : '';
  const walkPath = walk ? walk.map((p, i) => { const q = project(p); return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join(' ') : '';

  const markers = points.filter((p) => p.lat != null).map((p) => {
    const q = project(p);
    const s = KIND_STYLE[p.kind] || KIND_STYLE.start;
    const anchor = q.x > W * 0.62 ? 'end' : 'start';
    const dx = anchor === 'end' ? -(s.r + 5) : s.r + 5;
    return `<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${s.r}" fill="${s.fill}" stroke="#fff" stroke-width="2"/>
      <text x="${(q.x + dx).toFixed(1)}" y="${(q.y + 4).toFixed(1)}" text-anchor="${anchor}" fill="#1F3434" font-size="11" font-weight="800" paint-order="stroke" stroke="#E6F2F1" stroke-width="3">${escapeHtml(p.label)}</text>`;
  }).join('');

  let carMarker = '';
  if (car) {
    const q = project(car);
    carMarker = `<g transform="translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})">
      <circle r="16" fill="rgba(15,110,110,0.2)" class="live-pulse"/>
      <circle r="10" fill="#0F6E6E" stroke="#fff" stroke-width="2"/>
      <path d="M-5 -1 L5 -1 L4 3 L-4 3 Z" fill="#fff"/></g>`;
  }
  let alertMarker = '';
  if (alert) {
    const q = project(alert);
    alertMarker = `<g transform="translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})"><circle r="13" fill="#B83232"/>
      <text y="5" fill="#fff" font-size="14" font-weight="900" text-anchor="middle">!</text></g>`;
  }

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hartă traseu" preserveAspectRatio="xMidYMid meet">
      <rect width="${W}" height="${H}" fill="#E6F2F1"/>
      <path d="M-20 ${H - 20} C80 ${H - 50}, 160 ${H - 30}, 260 ${H - 90} S340 70, 400 40" stroke="#E3EFEC" stroke-width="24" fill="none" stroke-linecap="round"/>
      ${routePath ? `<path d="${routePath}" stroke="#8CC5BF" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${routePath}" stroke="#0F6E6E" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      ${walkPath ? `<path d="${walkPath}" stroke="#E8A060" stroke-width="3" stroke-dasharray="4 4" fill="none" stroke-linecap="round"/>` : ''}
      ${markers}${alertMarker}${carMarker}
    </svg>${caption ? `<span class="map-caption">${escapeHtml(caption)}</span>` : ''}`;
}
