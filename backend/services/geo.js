// Calcule geografice: distanțe, proiecție pe traseu, poziții simulate

const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

function haversineM(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// Proiecție echirectangulară locală (metri) — suficient de precisă la scara unui oraș
function toXY(p, origin) {
  const x = toRad(p.lon - origin.lon) * Math.cos(toRad(origin.lat)) * EARTH_RADIUS_M;
  const y = toRad(p.lat - origin.lat) * EARTH_RADIUS_M;
  return { x, y };
}

function fromXY(xy, origin) {
  const lat = origin.lat + (xy.y / EARTH_RADIUS_M) * (180 / Math.PI);
  const lon = origin.lon + (xy.x / (EARTH_RADIUS_M * Math.cos(toRad(origin.lat)))) * (180 / Math.PI);
  return { lat, lon };
}

function routeLengthM(route) {
  let total = 0;
  for (let i = 1; i < route.length; i += 1) total += haversineM(route[i - 1], route[i]);
  return total;
}

// Distanța minimă de la punct la traseu și progresul (0..1) al proiecției pe traseu
function projectOnRoute(point, route) {
  const origin = route[0];
  const p = toXY(point, origin);
  const total = routeLengthM(route) || 1;
  let best = { distanceM: Infinity, progress: 0 };
  let walked = 0;
  for (let i = 1; i < route.length; i += 1) {
    const a = toXY(route[i - 1], origin);
    const b = toXY(route[i], origin);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLen = Math.hypot(dx, dy) || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (segLen * segLen)));
    const proj = { x: a.x + t * dx, y: a.y + t * dy };
    const d = Math.hypot(p.x - proj.x, p.y - proj.y);
    if (d < best.distanceM) best = { distanceM: d, progress: (walked + t * segLen) / total };
    walked += segLen;
  }
  return best;
}

// Punctul aflat la fracția `progress` din lungimea traseului
function pointAlongRoute(route, progress) {
  const target = Math.max(0, Math.min(1, progress)) * routeLengthM(route);
  let walked = 0;
  for (let i = 1; i < route.length; i += 1) {
    const seg = haversineM(route[i - 1], route[i]);
    if (walked + seg >= target) {
      const t = seg ? (target - walked) / seg : 0;
      return {
        lat: route[i - 1].lat + (route[i].lat - route[i - 1].lat) * t,
        lon: route[i - 1].lon + (route[i].lon - route[i - 1].lon) * t,
      };
    }
    walked += seg;
  }
  return { ...route[route.length - 1] };
}

// Punct deplasat perpendicular față de traseu (folosit la simularea unei devieri)
function offsetFromRoute(route, progress, offsetM) {
  const origin = route[0];
  const p = pointAlongRoute(route, progress);
  const a = toXY(route[0], origin);
  const b = toXY(route[route.length - 1], origin);
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const normal = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  const pxy = toXY(p, origin);
  return fromXY({ x: pxy.x + normal.x * offsetM, y: pxy.y + normal.y * offsetM }, origin);
}

module.exports = { haversineM, routeLengthM, projectOnRoute, pointAlongRoute, offsetFromRoute };
