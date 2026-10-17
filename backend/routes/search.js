/**
 * Search routes
 * POST /search — route matching algorithm
 */

const express = require('express');
const { query } = require('../db');
const { scoreTrip } = require('../services/matching');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /search
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    const {
      from,
      to,
      date,
      time,
      women_only = false,
      verified_only = false,
    } = req.body;

    if (!from || !to || !from.lat || !from.lng || !to.lat || !to.lng || !date) {
      return res.status(400).json({
        error: 'from (lat/lng), to (lat/lng) și date sunt obligatorii',
      });
    }

    const fromLat = parseFloat(from.lat);
    const fromLng = parseFloat(from.lng);
    const toLat = parseFloat(to.lat);
    const toLng = parseFloat(to.lng);

    // Find trips for the given date within ±30 minutes of desired time
    // We use a window on departure_at
    let timeFilter = '';
    const params = [date];

    if (time) {
      // Build timestamp bounds
      params.push(`${date} ${time}`);
      timeFilter = `AND t.departure_at BETWEEN ($2::timestamp - INTERVAL '30 minutes')
                                         AND ($2::timestamp + INTERVAL '30 minutes')`;
    }

    const tripsRes = await query(
      `SELECT
         t.id          AS trip_id,
         t.departure_at,
         t.status,
         t.seats_available,
         r.polyline,
         r.price_per_seat,
         r.price_cap,
         r.women_only,
         r.verified_only,
         u.id          AS driver_id,
         u.full_name   AS driver_name,
         u.rating_avg,
         u.gender      AS driver_gender,
         v.id          AS vehicle_id,
         v.make,
         v.model,
         v.color,
         v.plate
       FROM trips t
       JOIN routes r  ON r.id = t.route_id
       JOIN users  u  ON u.id = r.driver_id
       JOIN vehicles v ON v.id = r.vehicle_id
       WHERE t.date = $1::date
         AND t.status = 'scheduled'
         ${timeFilter}`,
      params
    );

    const filters = {
      women_only: women_only === true || women_only === 'true',
      verified_only: verified_only === true || verified_only === 'true',
    };

    const results = [];

    for (const trip of tripsRes.rows) {
      const scored = scoreTrip(
        trip,
        fromLat,
        fromLng,
        toLat,
        toLng,
        time || null,
        filters
      );

      if (!scored) continue;

      results.push({
        trip_id: trip.trip_id,
        driver: {
          id: trip.driver_id,
          full_name: trip.driver_name,
          rating_avg: parseFloat(trip.rating_avg) || null,
          gender: trip.driver_gender,
        },
        vehicle: {
          make: trip.make,
          model: trip.model,
          color: trip.color,
          plate: trip.plate,
        },
        departure_at: trip.departure_at,
        eta_pickup: scored.etaAtPickup,
        pickup_distance_m: scored.pickupDistance,
        dropoff_distance_m: scored.dropoffDistance,
        price: scored.price,
        seats_available: trip.seats_available,
        score: Math.round(scored.score),
      });
    }

    // Sort by score ascending (lower = better) and return top 5
    results.sort((a, b) => a.score - b.score);
    const top5 = results.slice(0, 5);

    return res.json(top5);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
