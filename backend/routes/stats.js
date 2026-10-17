/**
 * Stats routes
 * GET /stats/impact
 */

const express = require('express');
const { query } = require('../db');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /stats/impact
// ---------------------------------------------------------------------------
router.get('/impact', async (req, res, next) => {
  try {
    const [
      completedTripsRes,
      totalBookingsRes,
      co2Res,
      carsRemovedRes,
      popularCorridorsRes,
      avgPriceRes,
    ] = await Promise.all([
      // Total completed trips
      query("SELECT COUNT(*) AS count FROM trips WHERE status = 'completed'", []),

      // Total arrived bookings
      query("SELECT COUNT(*) AS count FROM bookings WHERE status = 'arrived'", []),

      // CO2 from points_ledger entries mentioning CO₂
      query(
        `SELECT COALESCE(
           SUM(
             CAST(
               REGEXP_REPLACE(reason, '[^0-9.]', '', 'g') AS NUMERIC
             )
           ), 0
         ) AS total_co2
         FROM points_ledger
         WHERE reason LIKE '%CO₂%'`,
        []
      ),

      // Cars removed today (distinct drivers with completed trips today)
      query(
        `SELECT COUNT(DISTINCT r.driver_id) AS count
         FROM trips t
         JOIN routes r ON r.id = t.route_id
         WHERE t.status = 'completed'
           AND t.date = CURRENT_DATE`,
        []
      ),

      // Popular corridors (top 5 routes by booking count)
      query(
        `SELECT r.id, r.name, r.start_label, r.end_label,
                COUNT(b.id) AS booking_count
         FROM routes r
         JOIN trips t ON t.route_id = r.id
         JOIN bookings b ON b.trip_id = t.id
         WHERE b.status NOT IN ('cancelled')
         GROUP BY r.id, r.name, r.start_label, r.end_label
         ORDER BY booking_count DESC
         LIMIT 5`,
        []
      ),

      // Average price for lei_saved calculation
      query(
        "SELECT COALESCE(AVG(price), 0) AS avg_price FROM bookings WHERE status = 'arrived'",
        []
      ),
    ]);

    const totalTrips = parseInt(completedTripsRes.rows[0].count, 10);
    const totalBookings = parseInt(totalBookingsRes.rows[0].count, 10);
    const co2SavedKg = parseFloat(co2Res.rows[0].total_co2) || 0;
    const avgPrice = parseFloat(avgPriceRes.rows[0].avg_price) || 0;

    // km_shared: each booking ~15km average
    const kmShared = totalBookings * 15;

    // lei_saved: what passengers would have paid in fuel vs what they paid
    // Assume fuel cost = 1.5x the carpool price; savings = 0.5x of fuel equiv
    const leiSaved = Math.round(totalBookings * avgPrice * 0.5 * 100) / 100;

    return res.json({
      total_trips_completed: totalTrips,
      total_bookings: totalBookings,
      km_shared: kmShared,
      co2_saved_kg: Math.round(co2SavedKg * 100) / 100,
      lei_saved: leiSaved,
      cars_removed_today: parseInt(carsRemovedRes.rows[0].count, 10),
      popular_corridors: popularCorridorsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
