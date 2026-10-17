/**
 * OSRM route fetching service
 * Fetches a driving polyline from the public OSRM API.
 * Falls back to a straight-line [[start],[end]] on any error or timeout.
 */

const axios = require('axios');

const OSRM_BASE = 'http://router.project-osrm.org/route/v1/driving';
const TIMEOUT_MS = 5000;

/**
 * Fetch a driving route polyline from OSRM.
 * @param {number} startLat
 * @param {number} startLng
 * @param {number} endLat
 * @param {number} endLng
 * @returns {Promise<Array<[number, number]>>} Array of [lat, lng] points
 */
async function fetchRoute(startLat, startLng, endLat, endLng) {
  const url = `${OSRM_BASE}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

  try {
    const response = await axios.get(url, { timeout: TIMEOUT_MS });
    const routes = response.data && response.data.routes;

    if (!routes || routes.length === 0) {
      throw new Error('No routes returned from OSRM');
    }

    // GeoJSON coordinates are [lng, lat] — swap to [lat, lng]
    const coords = routes[0].geometry.coordinates;
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch (err) {
    console.warn('[OSRM] Falling back to straight-line:', err.message);
    return [
      [startLat, startLng],
      [endLat, endLng],
    ];
  }
}

module.exports = { fetchRoute };
