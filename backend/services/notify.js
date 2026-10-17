// Notificări în aplicație pentru părinți și șoferi

async function notify(db, userId, { title, message, type, link = null }) {
  await db.query(
    `INSERT INTO notifications (user_id, title, message, notification_type, link)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, title, message, type, link]
  );
}

async function notifyMany(db, userIds, payload) {
  const unique = [...new Set(userIds.filter(Boolean))];
  for (const id of unique) await notify(db, id, payload);
}

module.exports = { notify, notifyMany };
