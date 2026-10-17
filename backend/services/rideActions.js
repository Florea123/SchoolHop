// Tranziții de stare ale unei curse (folosite de șofer și de simulare)

const db = require('../../db/db');
const config = require('../config');
const geo = require('./geo');
const { getRide, getRideBookings, recordLocation, rideRoute, parentIdsOf } = require('./rides');
const { notify, notifyMany } = require('./notify');
const { badRequest } = require('../utils/http');
const { firstName } = require('./ai');

async function startRide(ride) {
  if (ride.ride_status === 'in_progress') return ride;
  if (ride.ride_status !== 'scheduled') throw badRequest('Cursa nu mai poate fi pornită');
  await db.query("UPDATE rides SET ride_status = 'in_progress', started_at = now() WHERE ride_id = $1", [ride.ride_id]);
  const started = await getRide(ride.ride_id);
  await recordLocation(started, { lat: ride.departure_lat, lon: ride.departure_lon });
  const bookings = await getRideBookings(ride.ride_id);
  await notifyMany(db, parentIdsOf(bookings, ride.driver_id), {
    title: 'Cursa a pornit ',
    message: `${ride.driver_name} a pornit spre ${ride.departure_address}.`,
    type: 'ride',
    link: `ride.html?rideId=${ride.ride_id}`,
  });
  return started;
}

async function pickUpBooking(ride, booking) {
  if (booking.booking_status !== 'confirmed') return false;
  if (ride.ride_status !== 'in_progress') throw badRequest('Pornește cursa înainte de a prelua copiii');
  await db.query("UPDATE bookings SET booking_status = 'picked_up', pickup_time = now() WHERE booking_id = $1", [booking.booking_id]);
  if (booking.parent_id !== ride.driver_id) {
    await notify(db, booking.parent_id, {
      title: `${firstName(booking.child_name)} a urcat în mașină `,
      message: `${ride.driver_name} l-a preluat pe ${firstName(booking.child_name)} de la ${ride.departure_address}.`,
      type: 'child_picked_up',
      link: `ride.html?rideId=${ride.ride_id}`,
    });
  }
  return true;
}

async function arriveRide(ride) {
  if (ride.ride_status !== 'in_progress') throw badRequest('Cursa nu este în desfășurare');
  return db.withTransaction(async (client) => {
    const { rows: arrived } = await client.query(
      `UPDATE bookings b SET booking_status = 'arrived_at_school', dropoff_time = now()
       FROM children c
       WHERE b.ride_id = $1 AND b.booking_status = 'picked_up' AND c.child_id = b.child_id
       RETURNING b.*, c.full_name AS child_name, c.is_social_beneficiary`,
      [ride.ride_id]
    );
    await client.query("UPDATE rides SET ride_status = 'completed', completed_at = now() WHERE ride_id = $1", [ride.ride_id]);
    await client.query('INSERT INTO ride_locations (ride_id, lat, lon) VALUES ($1, $2, $3)', [ride.ride_id, ride.destination_lat, ride.destination_lon]);
    await client.query('UPDATE ride_alerts SET resolved_at = now() WHERE ride_id = $1 AND resolved_at IS NULL', [ride.ride_id]);

    const others = arrived.filter((b) => b.parent_id !== ride.driver_id);
    if (others.length) {
      await client.query('UPDATE users SET green_points = green_points + $1 WHERE user_id = $2',
        [config.impact.pointsPerRide * others.length, ride.driver_id]);
    }
    if (ride.is_social_fund && ride.social_driver_stipend > 0) {
      await client.query(
        `INSERT INTO social_fund_transactions (transaction_type, ride_id, amount, target_village, children_helped_count, description)
         VALUES ('driver_payout', $1, $2, $3, $4, $5)`,
        [ride.ride_id, ride.social_driver_stipend, ride.departure_village_or_area,
          arrived.filter((b) => b.is_social_beneficiary).length,
          `Plată fixă pentru cursa școlară ${ride.departure_village_or_area} → ${ride.school_short_name}`]
      );
    }
    for (const b of others) {
      await notify(client, b.parent_id, {
        title: `${firstName(b.child_name)} a ajuns la ${ride.school_short_name} `,
        message: `Copilul a fost lăsat în siguranță la ${ride.dropoff_point_label}. Confirmă predarea în aplicație.`,
        type: 'arrived_at_school',
        link: `dropoff.html?bookingId=${b.booking_id}`,
      });
    }
    return arrived;
  });
}

// Simulare: avansează mașina pe traseu sau o abate de la el
async function simulate(ride, action) {
  let current = ride;
  if (current.ride_status === 'scheduled') current = await startRide(current);
  if (current.ride_status !== 'in_progress') throw badRequest('Cursa s-a încheiat deja');

  const route = rideRoute(current);
  const { rows: [last] } = await db.query(
    'SELECT lat, lon FROM ride_locations WHERE ride_id = $1 ORDER BY recorded_at DESC, location_id DESC LIMIT 1', [current.ride_id]
  );
  const progress = last ? geo.projectOnRoute(last, route).progress : 0;

  if (action === 'deviate') {
    const point = geo.offsetFromRoute(route, Math.min(0.9, progress + 0.1), config.deviationThresholdM + 500);
    return recordLocation(current, point);
  }

  // Preluarea copiilor are loc la punctul de întâlnire (plecare)
  const bookings = await getRideBookings(current.ride_id);
  for (const b of bookings) await pickUpBooking(current, b);

  const next = Math.min(1, progress + 0.25);
  if (next >= 0.999) {
    await recordLocation(current, route[route.length - 1]);
    await arriveRide(await getRide(current.ride_id));
    return { arrived: true };
  }
  return recordLocation(current, geo.pointAlongRoute(route, next));
}

module.exports = { startRide, pickUpBooking, arriveRide, simulate };
