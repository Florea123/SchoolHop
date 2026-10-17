/**
 * Reviews routes
 * POST /reviews
 */

const express = require('express');
const auth = require('../middleware/auth');
const { query } = require('../db');

const router = express.Router();

router.use(auth);

// ---------------------------------------------------------------------------
// POST /reviews
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    const { trip_id, target_id, stars, comment } = req.body;

    if (!trip_id || !target_id || !stars) {
      return res.status(400).json({ error: 'trip_id, target_id și stars sunt obligatorii' });
    }

    const starsNum = parseInt(stars, 10);
    if (starsNum < 1 || starsNum > 5) {
      return res.status(400).json({ error: 'stars trebuie să fie între 1 și 5' });
    }

    if (req.user.id === parseInt(target_id, 10)) {
      return res.status(400).json({ error: 'Nu te poți evalua pe tine însuți' });
    }

    // Prevent duplicate reviews for same trip+author+target
    const dupRes = await query(
      'SELECT id FROM reviews WHERE trip_id = $1 AND author_id = $2 AND target_id = $3',
      [trip_id, req.user.id, target_id]
    );
    if (dupRes.rows.length > 0) {
      return res.status(409).json({ error: 'Ai evaluat deja această persoană pentru această cursă' });
    }

    await query('BEGIN', []);
    try {
      // Insert review
      const reviewRes = await query(
        `INSERT INTO reviews (trip_id, author_id, target_id, stars, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, trip_id, author_id, target_id, stars, comment, created_at`,
        [trip_id, req.user.id, target_id, starsNum, comment || null]
      );

      // Recompute target user's rating_avg and rating_count
      await query(
        `UPDATE users
         SET rating_count = rating_count + 1,
             rating_avg   = (rating_avg * rating_count + $1) / (rating_count + 1)
         WHERE id = $2`,
        [starsNum, target_id]
      );

      await query('COMMIT', []);
      return res.status(201).json(reviewRes.rows[0]);
    } catch (txErr) {
      await query('ROLLBACK', []);
      throw txErr;
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
