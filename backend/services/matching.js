/**
 * Route matching service
 * Core algorithm for finding and scoring trips that cover a passenger's
 * pickup and drop-off points.
 */

const { haversine } = require('./haversine');

const MAX_PICKUP_DROPOFF_DISTANCE_M = 800;
const AVG_SPEED_MPS = 30000 / 3600; // 30 km/h in m/s

/**
 * Find the nearest point on a polyline to a given lat/lng.
 * @param {Array<[number, number]>} polyline  Array of [lat, lng]
 * @param {number} lat
 * @param {number} lng
 * @returns {{ index: number, distance: number }}
 */
function findNearestPointOnPolyline(polyline, lat, lng) {
  let minDist = Infinity;
  let minIndex = 0;

  for (let i = 0; i < polyline.length; i++) {
    const [pLat, pLng] = polyline[i];
    const dist = haversine(lat, lng, pLat, pLng);
    if (dist < minDist) {
      minDist = dist;
      minIndex = i;
    }
  }

  return { index: minIndex, distance: minDist };
}

/**
 * Calculate cumulative distance along the polyline from index 0 to targetIndex.
 * @param {Array<[number, number]>} polyline
 * @param {number} targetIndex
 * @returns {number} distance in meters
 */
function distanceAlongPolyline(polyline, targetIndex) {
  let total = 0;
  for (let i = 0; i < targetIndex && i < polyline.length - 1; i++) {
    const [lat1, lng1] = polyline[i];
    const [lat2, lng2] = polyline[i + 1];
    total += haversine(lat1, lng1, lat2, lng2);
  }
  return total;
}

/**
 * Score a trip for a given passenger request.
 *
 * @param {object} trip - must contain: trip_id, departure_at, seats_available,
 *                        polyline (Array<[lat,lng]>), price_per_seat, price_cap,
 *                        women_only, verified_only, rating_avg
 * @param {number} fromLat
 * @param {number} fromLng
 * @param {number} toLat
 * @param {number} toLng
 * @param {string} desiredTime  - "HH:MM" 24-hour
 * @param {object} filters      - { women_only?: bool, verified_only?: bool }
 * @returns {object|null} scoring result or null if trip is not valid
 */
function scoreTrip(trip, fromLat, fromLng, toLat, toLng, desiredTime, filters) {
  const polyline = trip.polyline;
  if (!polyline || polyline.length < 2) return null;

  const pickup = findNearestPointOnPolyline(polyline, fromLat, fromLng);
  const dropoff = findNearestPointOnPolyline(polyline, toLat, toLng);

  // --- validity checks ---
  if (pickup.distance > MAX_PICKUP_DROPOFF_DISTANCE_M) return null;
  if (dropoff.distance > MAX_PICKUP_DROPOFF_DISTANCE_M) return null;
  if (pickup.index >= dropoff.index) return null; // wrong direction
  if (trip.seats_available <= 0) return null;

  if (filters.women_only && !trip.women_only) return null;
  if (filters.verified_only && !trip.verified_only) return null;

  // --- time score ---
  const departureDate = new Date(trip.departure_at);
  const tripMinutes = departureDate.getHours() * 60 + departureDate.getMinutes();

  let desiredMinutes = 0;
  if (desiredTime) {
    const [h, m] = desiredTime.split(':').map(Number);
    desiredMinutes = h * 60 + m;
  }
  const minuteDiff = Math.abs(tripMinutes - desiredMinutes);

  const ratingAvg = parseFloat(trip.rating_avg) || 0;

  // Lower score = better
  const score =
    pickup.distance + dropoff.distance + 10 * minuteDiff - 200 * ratingAvg;

  // --- ETA at pickup ---
  const distToPickup = distanceAlongPolyline(polyline, pickup.index);
  const secondsToPickup = distToPickup / AVG_SPEED_MPS;
  const etaAtPickup = new Date(
    departureDate.getTime() + secondsToPickup * 1000
  );

  // --- price (segment-based, capped) ---
  const totalPolylineDist = distanceAlongPolyline(polyline, polyline.length - 1);
  const segmentDist = distanceAlongPolyline(polyline, dropoff.index) - distToPickup;
  const priceFraction =
    totalPolylineDist > 0 ? segmentDist / totalPolylineDist : 1;
  let price = parseFloat(trip.price_per_seat) * priceFraction;
  if (trip.price_cap && price > parseFloat(trip.price_cap)) {
    price = parseFloat(trip.price_cap);
  }
  price = Math.round(price * 100) / 100;

  return {
    tripId: trip.trip_id,
    score,
    pickupIndex: pickup.index,
    dropoffIndex: dropoff.index,
    pickupDistance: Math.round(pickup.distance),
    dropoffDistance: Math.round(dropoff.distance),
    etaAtPickup,
    price,
  };
}

module.exports = { findNearestPointOnPolyline, distanceAlongPolyline, scoreTrip };
