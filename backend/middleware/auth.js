// Autentificare JWT (Bearer token) și verificare de rol

const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../../db/db');
const { HttpError } = require('../utils/http');

function signToken(user) {
  return jwt.sign(
    { id: user.user_id, role: user.role, schoolId: user.school_id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// Token valid + contul există încă în baza de date (rolul se citește mereu din DB)
async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Trebuie să fii autentificat'));
  }
  let decoded;
  try {
    decoded = jwt.verify(header.slice(7), config.jwtSecret);
  } catch {
    return next(new HttpError(401, 'Sesiunea a expirat. Autentifică-te din nou.'));
  }
  try {
    const { rows: [user] } = await db.query('SELECT user_id, role, school_id FROM users WHERE user_id = $1', [decoded.id]);
    if (!user) return next(new HttpError(401, 'Contul nu mai există. Creează un cont nou.'));
    req.user = { id: user.user_id, role: user.role, schoolId: user.school_id };
    return next();
  } catch (err) {
    return next(err);
  }
}

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new HttpError(403, 'Nu ai drepturi pentru această acțiune'));
  }
  return next();
};

module.exports = { signToken, requireAuth, requireRole };
