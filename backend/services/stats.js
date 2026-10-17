// Statistici de impact (familie, școală) calculate din cursele reale

const db = require('../../db/db');
const config = require('../config');
const { haversineM } = require('./geo');

const { roadFactor, co2KgPerKm, costLeiPerKm, avgSpeedKmh } = config.impact;

// Un copil dus de alt părinte = o deplasare solo evitată (dus-întors de acasă la școală)
function impactFromTrips(trips) {
  let km = 0;
  trips.forEach((t) => {
    km += (haversineM({ lat: t.pickup_lat, lon: t.pickup_lon }, { lat: t.destination_lat, lon: t.destination_lon }) / 1000) * roadFactor * 2;
  });
  const paid = trips.reduce((s, t) => s + (t.price || 0), 0);
  return {
    soloTripsAvoided: trips.length,
    kmSaved: Math.round(km),
    co2SavedKg: Math.round(km * co2KgPerKm * 10) / 10,
    hoursSaved: Math.round((km / avgSpeedKmh) * 10) / 10,
    moneySavedLei: Math.max(0, Math.round(km * costLeiPerKm - paid)),
  };
}

const SHARED_TRIPS_SQL = `
  SELECT b.booking_id, b.pickup_lat, b.pickup_lon, b.price, b.parent_id, b.child_id,
         r.destination_lat, r.destination_lon, r.driver_id, r.departure_time, r.school_id,
         r.departure_village_or_area
  FROM bookings b
  JOIN rides r ON r.ride_id = b.ride_id
  WHERE b.booking_status = 'arrived_at_school' AND b.parent_id <> r.driver_id`;

async function familyImpact(userId) {
  const asPassenger = await db.query(`${SHARED_TRIPS_SQL} AND b.parent_id = $1`, [userId]);
  const asDriver = await db.query(`${SHARED_TRIPS_SQL} AND r.driver_id = $1`, [userId]);
  const { rows: [u] } = await db.query('SELECT green_points FROM users WHERE user_id = $1', [userId]);
  return {
    asPassenger: impactFromTrips(asPassenger.rows),
    asDriver: impactFromTrips(asDriver.rows),
    ridesWithClassmates: asPassenger.rows.length,
    childrenDriven: asDriver.rows.length,
    greenPoints: u ? u.green_points : 0,
  };
}

async function schoolImpact(schoolId, { days = 7 } = {}) {
  const trips = await db.query(
    `${SHARED_TRIPS_SQL} AND r.school_id = $1 AND r.departure_time >= now() - make_interval(days => $2)`,
    [schoolId, days]
  );
  const total = await db.query(`${SHARED_TRIPS_SQL} AND r.school_id = $1`, [schoolId]);
  const { rows: [verified] } = await db.query(
    `SELECT COUNT(*) AS n FROM users WHERE school_id = $1 AND is_school_verified AND role <> 'admin'`,
    [schoolId]
  );
  return {
    periodDays: days,
    period: impactFromTrips(trips.rows),
    allTime: impactFromTrips(total.rows),
    verifiedParents: verified.n,
  };
}

module.exports = { impactFromTrips, familyImpact, schoolImpact, SHARED_TRIPS_SQL };
