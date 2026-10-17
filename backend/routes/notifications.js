const express = require('express');
const db = require('../../db/db');
const { toInt } = require('../utils/http');

const router = express.Router();

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT notification_id AS id, title, message, notification_type AS type, link, is_read AS "isRead", created_at AS "createdAt"
     FROM notifications WHERE user_id = $1 ORDER BY created_at DESC, notification_id DESC LIMIT 100`,
    [req.user.id]
  );
  res.json({ notifications: rows, unread: rows.filter((n) => !n.isRead).length });
});

router.post('/read-all', async (req, res) => {
  await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND NOT is_read', [req.user.id]);
  res.json({ ok: true });
});

router.post('/:id/read', async (req, res) => {
  await db.query('UPDATE notifications SET is_read = true WHERE notification_id = $1 AND user_id = $2', [toInt(req.params.id, 'ID'), req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
