// Fondul Social: transparență și donații (dublate de sponsor)

const express = require('express');
const db = require('../../db/db');
const config = require('../config');
const { toNumber } = require('../utils/http');
const { notify } = require('../services/notify');

const router = express.Router();

async function fundSummary() {
  const { rows: [t] } = await db.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'donation'), 0) AS donations,
       COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'corporate_match'), 0) AS corporate,
       COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'driver_payout'), 0) AS payouts,
       COALESCE(SUM(children_helped_count) FILTER (WHERE transaction_type = 'driver_payout'), 0) AS children_helped,
       COUNT(*) FILTER (WHERE transaction_type = 'driver_payout') AS rides_funded
     FROM social_fund_transactions`
  );
  const { rows: recent } = await db.query(
    `SELECT t.transaction_id AS id, t.transaction_type AS type, t.amount, t.target_village AS village,
            t.description, t.created_at AS "createdAt", u.full_name AS donor
     FROM social_fund_transactions t LEFT JOIN users u ON u.user_id = t.donor_id
     ORDER BY t.created_at DESC, t.transaction_id DESC LIMIT 15`
  );
  return {
    balance: Math.round((t.donations + t.corporate - t.payouts) * 100) / 100,
    donations: t.donations, corporate: t.corporate, payouts: t.payouts,
    childrenHelped: t.children_helped, ridesFunded: t.rides_funded,
    sponsorMatchRatio: config.sponsorMatchRatio,
    recent,
  };
}

router.get('/', async (_req, res) => {
  res.json(await fundSummary());
});

router.post('/donations', async (req, res) => {
  const amount = toNumber(req.body.amount, 'Suma', { min: 5, max: 5000 });
  const rounded = Math.round(amount * 100) / 100;
  const { rows: [u] } = await db.query('SELECT full_name FROM users WHERE user_id = $1', [req.user.id]);
  await db.withTransaction(async (client) => {
    await client.query(
      `INSERT INTO social_fund_transactions (transaction_type, donor_id, amount, target_village, description)
       VALUES ('donation', $1, $2, 'Satele din zona metropolitană Iași', $3)`,
      [req.user.id, rounded, `Donație voluntară oferită de ${u.full_name}`]
    );
    if (config.sponsorMatchRatio > 0) {
      await client.query(
        `INSERT INTO social_fund_transactions (transaction_type, amount, target_village, description)
         VALUES ('corporate_match', $1, 'Satele din zona metropolitană Iași', $2)`,
        [Math.round(rounded * config.sponsorMatchRatio * 100) / 100, `Dublare sponsor pentru donația lui ${u.full_name}`]
      );
    }
    await notify(client, req.user.id, {
      title: 'Mulțumim pentru donație ',
      message: `Donația ta de ${rounded} lei${config.sponsorMatchRatio > 0 ? ' a fost dublată de sponsor și' : ''} ajută copiii de la sat să ajungă la școală.`,
      type: 'social_fund', link: 'impact.html',
    });
  });
  res.status(201).json(await fundSummary());
});

module.exports = router;
module.exports.fundSummary = fundSummary;
