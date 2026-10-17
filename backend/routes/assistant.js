// Chat-ul asistentului pentru părinți

const express = require('express');
const db = require('../../db/db');
const { badRequest } = require('../utils/http');
const assistant = require('../services/assistant');

const router = express.Router();
const MAX_MESSAGES = 20;
const MAX_LENGTH = 1000;

router.post('/', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || !messages.length) throw badRequest('Trimite cel puțin un mesaj');
  const clean = messages.slice(-MAX_MESSAGES).map((m) => {
    const role = m && m.role === 'assistant' ? 'assistant' : 'user';
    const content = String((m && m.content) || '').trim();
    if (!content) throw badRequest('Mesajele nu pot fi goale');
    if (content.length > MAX_LENGTH) throw badRequest(`Un mesaj poate avea cel mult ${MAX_LENGTH} de caractere`);
    return { role, content };
  });
  if (clean[clean.length - 1].role !== 'user') throw badRequest('Ultimul mesaj trebuie să fie al utilizatorului');

  // Context minimal pentru model: părintele, școala și copiii lui
  const { rows: [user] } = await db.query(
    `SELECT u.full_name, s.name AS school FROM users u LEFT JOIN schools s ON s.school_id = u.school_id WHERE u.user_id = $1`,
    [req.user.id]
  );
  const { rows: children } = await db.query(
    'SELECT full_name, grade, home_village_or_area AS area FROM children WHERE parent_id = $1', [req.user.id]
  );

  res.json(await assistant.reply(clean, { parent: user, children }));
});

module.exports = router;
