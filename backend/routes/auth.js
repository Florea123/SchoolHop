/**
 * Auth routes
 * POST /auth/register
 * POST /auth/login
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------
router.post('/register', async (req, res, next) => {
  try {
    const { full_name, email, phone, password, gender } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'full_name, email și password sunt obligatorii' });
    }

    // Check uniqueness
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email deja înregistrat' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (full_name, email, phone, password_hash, gender, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, email, full_name`,
      [full_name, email, phone || null, password_hash, gender || null]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({ token, user: { id: user.id, full_name: user.full_name, email: user.email } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email și password sunt obligatorii' });
    }

    const result = await query(
      'SELECT id, email, password_hash, full_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email sau parolă incorectă' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Email sau parolă incorectă' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
