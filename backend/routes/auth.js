// Autentificare: login și înregistrare (părinte + primul copil)

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../../db/db');
const { signToken } = require('../middleware/auth');
const { badRequest, conflict, HttpError, requireFields, toInt } = require('../utils/http');
const validate = require('../utils/validate');
const { createChild } = require('../services/childProfile');

const router = express.Router();

function publicUser(u) {
  return {
    id: u.user_id, fullName: u.full_name, email: u.email, phone: u.phone, role: u.role,
    schoolId: u.school_id, isSchoolVerified: u.is_school_verified,
  };
}

router.post('/login', async (req, res) => {
  requireFields(req.body, ['email', 'password']);
  const email = validate.email(req.body.email);
  const { rows } = await db.query('SELECT * FROM users WHERE lower(email) = $1', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(String(req.body.password), user.password_hash))) {
    throw new HttpError(401, 'Email sau parolă incorectă');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post('/register', async (req, res) => {
  requireFields(req.body, ['fullName', 'email', 'phone', 'password', 'schoolId', 'childName', 'childBirthDate', 'childGradeLevel']);
  const fullName = validate.fullName(req.body.fullName);
  const email = validate.email(req.body.email);
  const phone = validate.phone(req.body.phone);
  const password = validate.password(req.body.password);
  const schoolId = toInt(req.body.schoolId, 'Școala', { min: 1 });
  if (req.body.consent !== true) throw badRequest('Trebuie să confirmi că ești părintele / tutorele legal al elevului');

  const existing = await db.query('SELECT 1 FROM users WHERE lower(email) = $1', [email]);
  if (existing.rows.length) throw conflict('Există deja un cont cu acest email');

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.withTransaction(async (client) => {
    const { rows: [user] } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, phone, school_id, role)
       VALUES ($1, $2, $3, $4, $5, 'parent') RETURNING *`,
      [fullName, email, passwordHash, phone, schoolId]
    );
    const child = await createChild(client, user.user_id, schoolId, req.body);
    return { user, child };
  });

  res.status(201).json({ token: signToken(result.user), user: publicUser(result.user), child: result.child });
});

module.exports = router;
module.exports.publicUser = publicUser;
