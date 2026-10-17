/**
 * TakeMe SchoolPool — API Routes
 * Conforme cu cele 4 ecrane din aplicație:
 * 1. Detalii cursă (Vedere șofer: locuri ocupate, acceptă/sună părinte, începe cursa)
 * 2. Șoferi disponibili (Vedere părinte: caută șoferi, sună șoferul, selectează)
 * 3. Detalii cursă (Vedere părinte: acceptat, mașină, șofer, punct predare)
 * 4. Anunță cursă (Vedere șofer: Dus la școală 08:00 / Întors de la școală 12:00)
 */

const express = require('express');
const router = express.Router();
const schoolStore = require('../services/schoolStore');

// GET /api/schools — Lista școlilor pentru selecție în dropdown
router.get('/schools', (req, res) => {
  res.json({ success: true, schools: schoolStore.getSchools() });
});

// POST /api/rides — Ecranul 4: "Anunță cursă" (șoferul creează cursa)
router.post('/rides', (req, res) => {
  try {
    const { driver_name, driver_phone, vehicle, school_name, type, school_time, seats } = req.body;
    const ride = schoolStore.createRide({
      driver_name,
      driver_phone,
      vehicle,
      school_name,
      type,
      school_time,
      seats
    });

    res.status(201).json({
      success: true,
      message: `Cursa pentru '${ride.school_name}' (${ride.type_label}, ${ride.school_time}) a fost publicată cu succes!`,
      ride
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/rides/available — Ecranul 2: "Șoferi disponibili" (părintele caută curse)
router.get('/rides/available', (req, res) => {
  try {
    const { school_name, type, school_time, seats } = req.query;
    const availableRides = schoolStore.findAvailableRides({
      school_name,
      type,
      school_time,
      seats_needed: seats
    });

    res.json({
      success: true,
      count: availableRides.length,
      rides: availableRides
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/rides/:id — Ecranul 1 (Șofer) și Ecranul 3 (Părinte): "Detalii cursă"
router.get('/rides/:id', (req, res) => {
  try {
    const ride = schoolStore.getRideDetails(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, error: "Cursa nu a fost găsită" });
    }
    res.json({ success: true, ride });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/rides/:id/book — Ecranul 2 -> 3: "Rezervă cursa" (părintele rezervă pentru copii)
router.post('/rides/:id/book', (req, res) => {
  try {
    const { parent_name, parent_phone, children, address, seats } = req.body;
    const result = schoolStore.bookRide(req.params.id, {
      parent_name,
      parent_phone,
      children,
      address,
      seats
    });

    res.status(201).json({
      success: true,
      message: `Rezervarea a fost confirmată pentru ${result.booking.children.join(' & ')}!`,
      booking: result.booking,
      ride: schoolStore.getRideDetails(req.params.id)
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/rides/:id/start — Ecranul 1: "Începe cursa"
router.post('/rides/:id/start', (req, res) => {
  try {
    const ride = schoolStore.startRide(req.params.id);
    res.json({
      success: true,
      message: "Cursa a început! Părinții au fost notificați cu privire la plecare.",
      ride
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/rides/:id/position — Trimitere GPS live + Motor de Siguranță (Abateri traseu)
router.post('/rides/:id/position', (req, res) => {
  try {
    const { lat, lng, speed } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: "Latitudine și longitudine obligatorii" });
    }

    const check = schoolStore.recordPosition(req.params.id, parseFloat(lat), parseFloat(lng), speed);
    res.json({ success: true, check });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/rides/:id/bookings/:bookingId/arrive — Confirmare sosire sigură cu cod PIN
router.post('/rides/:id/bookings/:bookingId/arrive', (req, res) => {
  try {
    const { code } = req.body;
    const result = schoolStore.confirmArrival(req.params.id, req.params.bookingId, code);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/stats/impact — Impact școală & reducerea traficului pentru pitch
router.get('/stats/impact', (_req, res) => {
  res.json({
    success: true,
    impact: schoolStore.getSchoolImpactStats()
  });
});

module.exports = router;

