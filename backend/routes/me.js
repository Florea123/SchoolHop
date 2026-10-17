/**
 * /me routes — current user profile management
 * GET  /me
 * PUT  /me/codes
 * POST /me/verify-id
 * POST /me/emergency-contacts
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { query } = require('../db');

const router = express.Router();

// All /me routes require authentication
router.use(auth);

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, full_name, email, phone, gender,
              id_verified, selfie_verified,
              rating_avg, rating_count, points, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Utilizator negăsit' });
    }

    const user = result.rows[0];

    // Fetch emergency contacts
    const contactsRes = await query(
      'SELECT id, name, phone FROM emergency_contacts WHERE user_id = $1',
      [req.user.id]
    );
    user.emergency_contacts = contactsRes.rows;

    return res.json(user);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /me/codes
// ---------------------------------------------------------------------------
router.put('/codes', async (req, res, next) => {
  try {
    const { arrival_code, duress_code } = req.body;

    if (!arrival_code || !duress_code) {
      return res.status(400).json({ error: 'arrival_code și duress_code sunt obligatorii' });
    }

    const [arrival_code_hash, duress_code_hash] = await Promise.all([
      bcrypt.hash(arrival_code, 10),
      bcrypt.hash(duress_code, 10),
    ]);

    await query(
      'UPDATE users SET arrival_code_hash = $1, duress_code_hash = $2 WHERE id = $3',
      [arrival_code_hash, duress_code_hash, req.user.id]
    );

    return res.json({ message: 'Coduri actualizate cu succes' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /me/verify-id  (simulated)
// ---------------------------------------------------------------------------
router.post('/verify-id', async (req, res, next) => {
  try {
    await query('UPDATE users SET id_verified = true WHERE id = $1', [req.user.id]);
    return res.json({ message: 'Identitate verificată cu succes' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /me/emergency-contacts
// ---------------------------------------------------------------------------
router.post('/emergency-contacts', async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'name și phone sunt obligatorii' });
    }

    const result = await query(
      'INSERT INTO emergency_contacts (user_id, name, phone) VALUES ($1, $2, $3) RETURNING id, name, phone',
      [req.user.id, name, phone]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
