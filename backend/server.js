// Pornește serverul HTTP SchoolHop

const config = require('./config');
const app = require('./app');
const db = require('../db/db');

const server = app.listen(config.port, () => {
  console.log(`SchoolHop rulează pe http://localhost:${config.port}`);
});

function shutdown() {
  server.close(() => db.pool.end().then(() => process.exit(0)));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
