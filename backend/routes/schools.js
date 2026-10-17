// Panoul școlii (administrator): trafic la poartă, coridoare, familii verificate

const express = require('express');
const db = require('../../db/db');
const { forbidden, toInt } = require('../utils/http');
const { schoolImpact, impactFromTrips, SHARED_TRIPS_SQL } = require('../services/stats');
const { fundSummary } = require('./fund');

const router = express.Router();

router.get('/:id/dashboard', async (req, res) => {
  const schoolId = toInt(req.params.id, 'ID școală');
  if (req.user.role !== 'admin' || req.user.schoolId !== schoolId) throw forbidden('Panoul este disponibil doar administratorilor școlii');
  const days = toInt(req.query.days ?? 30, 'Perioada', { min: 1, max: 365 });

  const { rows: [school] } = await db.query('SELECT school_id AS id, name, short_name AS "shortName", bell_time AS "bellTime" FROM schools WHERE school_id = $1', [schoolId]);
  const impact = await schoolImpact(schoolId, { days });

  const { rows: trips } = await db.query(
    `${SHARED_TRIPS_SQL} AND r.school_id = $1 AND r.departure_time >= now() - make_interval(days => $2)`, [schoolId, days]
  );
  // Distribuția pe zone de plecare (coridoare)
  const byArea = new Map();
  trips.forEach((t) => byArea.set(t.departure_village_or_area, (byArea.get(t.departure_village_or_area) || 0) + 1));
  const corridors = [...byArea.entries()].sort((a, b) => b[1] - a[1])
    .map(([area, count]) => ({ area, count, share: trips.length ? Math.round((count / trips.length) * 100) : 0 }));

  // Mașini eliminate pe zi
  const { rows: perDay } = await db.query(
    `SELECT (r.departure_time AT TIME ZONE 'Europe/Bucharest')::date::text AS day, COUNT(*) AS cars
     FROM bookings b JOIN rides r ON r.ride_id = b.ride_id
     WHERE r.school_id = $1 AND b.booking_status = 'arrived_at_school' AND b.parent_id <> r.driver_id
       AND r.departure_time >= now() - make_interval(days => $2)
     GROUP BY 1 ORDER BY 1`,
    [schoolId, days]
  );

  const { rows: [match] } = await db.query(
    `SELECT ROUND(AVG(m.compatibility_score) * 100) AS avg_score, COUNT(*) AS pairs
     FROM ai_interest_matches m JOIN children c ON c.child_id = m.child_id_1 WHERE c.school_id = $1`, [schoolId]
  );
  const { rows: [upcoming] } = await db.query(
    `SELECT COUNT(*) AS rides, COALESCE(SUM(total_seats - available_seats), 0) AS children
     FROM rides WHERE school_id = $1 AND ride_status = 'scheduled' AND departure_time > now() AND departure_time < now() + interval '7 days'`,
    [schoolId]
  );
  const { rows: alerts } = await db.query(
    `SELECT a.alert_id AS id, a.alert_type AS type, a.message, a.created_at AS "createdAt", a.resolved_at AS "resolvedAt",
            u.full_name AS driver
     FROM ride_alerts a JOIN rides r ON r.ride_id = a.ride_id JOIN users u ON u.user_id = r.driver_id
     WHERE r.school_id = $1 ORDER BY a.created_at DESC LIMIT 10`, [schoolId]
  );
  const { rows: families } = await db.query(
    `SELECT u.user_id AS id, u.full_name AS "fullName", u.email, u.role, u.is_school_verified AS verified,
            u.green_points AS "greenPoints",
            (SELECT COUNT(*) FROM children c WHERE c.parent_id = u.user_id) AS children,
            (SELECT COUNT(*) FROM rides r WHERE r.driver_id = u.user_id AND r.ride_status = 'completed') AS "ridesDriven"
     FROM users u WHERE u.school_id = $1 AND u.role <> 'admin' ORDER BY u.full_name`, [schoolId]
  );

  res.json({
    school, days, impact,
    carsRemoved: impactFromTrips(trips).soloTripsAvoided,
    corridors, perDay,
    avgMatchScore: match.avg_score, matchedPairs: match.pairs,
    upcoming, alerts, families,
    fund: await fundSummary(),
  });
});

module.exports = router;
