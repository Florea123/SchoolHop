// Link public pentru bunici / celălalt părinte (fără autentificare)

const express = require('express');
const db = require('../../db/db');
const rides = require('../services/rides');
const { firstName } = require('../services/ai');
const { notFound } = require('../utils/http');

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/:token', async (req, res) => {
  if (!UUID_RE.test(req.params.token)) throw notFound('Link invalid');
  const { rows: [b] } = await db.query(
    `SELECT b.*, c.full_name AS child_name FROM bookings b JOIN children c ON c.child_id = b.child_id
     WHERE b.share_token = $1 AND b.booking_status <> 'cancelled'`,
    [req.params.token]
  );
  if (!b) throw notFound('Linkul a expirat sau rezervarea a fost anulată');
  const ride = await rides.getRide(b.ride_id);
  const live = await rides.liveState(ride);
  // Doar informațiile strict necesare: fără telefoane, fără alți copii
  res.json({
    childName: firstName(b.child_name),
    bookingStatus: b.booking_status,
    pickupTime: b.pickup_time,
    dropoffTime: b.dropoff_time,
    driverName: ride.driver_name,
    vehicle: `${ride.brand} ${ride.model} · ${ride.color}`,
    schoolName: ride.school_name,
    dropoffPoint: ride.dropoff_point_label,
    departureAddress: ride.departure_address,
    departureTime: ride.departure_time,
    rideStatus: ride.ride_status,
    eta: live.eta,
    progress: live.progress,
    route: live.route,
    location: live.location,
    hasActiveAlert: live.alerts.length > 0,
  });
});

module.exports = router;
