// Test end-to-end al API-ului pe datele de demo.
// Rulează pe o bază SEPARATĂ (<numele bazei din .env>_test sau TEST_DATABASE_URL),
// creată automat; baza aplicației nu este atinsă.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const appUrl = new URL(process.env.DATABASE_URL
  || `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'takeme_db'}`);
const testUrl = process.env.TEST_DATABASE_URL ? new URL(process.env.TEST_DATABASE_URL) : new URL(appUrl);
if (!process.env.TEST_DATABASE_URL) testUrl.pathname = `${appUrl.pathname}_test`;
if (testUrl.pathname === appUrl.pathname) throw new Error('Baza de test trebuie să fie diferită de baza aplicației');
process.env.DATABASE_URL = testUrl.toString();
process.env.ALLOW_SIMULATION = 'true';

const db = require('../db/db');
const app = require('../backend/app');

let server;
let base;

async function call(method, url, { token, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function login(email, password = 'TakeMe2026!') {
  const r = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.token;
}

async function ensureTestDatabase() {
  const admin = new URL(testUrl);
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  const name = decodeURIComponent(testUrl.pathname.slice(1));
  const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (!rows.length) await client.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
  await client.end();
}

before(async () => {
  await ensureTestDatabase();
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await db.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
  await db.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'seed.sql'), 'utf8'));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await db.pool.end();
});

test('autentificare: parolă greșită respinsă, rute protejate', async () => {
  const bad = await call('POST', '/api/auth/login', { body: { email: 'gabriel.enache@parinte.edu.ro', password: 'x' } });
  assert.equal(bad.status, 401);
  const anon = await call('GET', '/api/me');
  assert.equal(anon.status, 401);
});

test('flux părinte: căutare AI → rezervare săptămânală → cursă live → predare → evaluare', async () => {
  const gabriel = await login('gabriel.enache@parinte.edu.ro');
  const me = await call('GET', '/api/me', { token: gabriel });
  const ana = me.body.children.find((c) => c.fullName === 'Ana Enache');
  assert.ok(ana && ana.needsBooster);

  const andreea = await login('andreea.rusu@parinte.edu.ro');
  const andreeaRides = await call('GET', '/api/me/rides?scope=upcoming', { token: andreea });
  const firstRide = andreeaRides.body.driving.find((r) => r.direction === 'to_school');
  const date = new Date(firstRide.departureTime).toLocaleDateString('sv-SE', { timeZone: 'Europe/Bucharest' });

  const search = await call('GET', `/api/rides/search?childId=${ana.id}&date=${date}&area=Valea%20Lupului&arriveBy=07:55`, { token: gabriel });
  assert.equal(search.status, 200, JSON.stringify(search.body));
  assert.ok(search.body.results.length >= 2);
  const top = search.body.results[0];
  assert.ok(top.nearby && top.bookable);
  assert.ok(search.body.results.every((r) => r.ride.school.id === ana.schoolId));

  const detail = await call('GET', `/api/rides/${top.ride.id}?childId=${ana.id}`, { token: gabriel });
  assert.equal(detail.status, 200);
  const freeSeat = detail.body.seatMap.seats.find((s) => s.status === 'free');
  assert.notEqual(freeSeat.position, 'front_right', 'copil de 9 ani nu are voie în față');
  const days = detail.body.series.filter((d) => !d.isReturn && !d.alreadyBooked).slice(0, 2).map((d) => d.rideId);

  const booking = await call('POST', '/api/bookings', { token: gabriel, body: { childId: ana.id, rideIds: days, seatPosition: freeSeat.position } });
  assert.equal(booking.status, 201, JSON.stringify(booking.body));
  assert.equal(booking.body.bookings.length, days.length);
  const dup = await call('POST', '/api/bookings', { token: gabriel, body: { childId: ana.id, rideIds: [days[0]] } });
  assert.equal(dup.status, 409);

  const rideId = booking.body.bookings[0].rideId;
  const bookingId = booking.body.bookings[0].bookingId;
  const topic = await call('GET', `/api/rides/${rideId}/topic`, { token: gabriel });
  assert.ok(topic.body.topic.length > 10);

  // Devierea declanșează alertă; rezolvarea o închide
  const dev = await call('POST', `/api/rides/${rideId}/simulate`, { token: gabriel, body: { action: 'deviate' } });
  assert.equal(dev.status, 200, JSON.stringify(dev.body));
  assert.equal(dev.body.status, 'in_progress');
  const alert = dev.body.alerts.find((a) => a.alert_type === 'deviation');
  assert.ok(alert, 'alerta de deviere trebuie creată');
  const resolved = await call('POST', `/api/rides/${rideId}/alerts/${alert.alert_id}/resolve`, { token: gabriel });
  assert.equal(resolved.status, 200);

  const sos = await call('POST', `/api/rides/${rideId}/sos`, { token: gabriel, body: {} });
  assert.equal(sos.status, 201);
  assert.ok(sos.body.schoolPhone);

  let live;
  for (let i = 0; i < 6; i += 1) {
    live = await call('POST', `/api/rides/${rideId}/simulate`, { token: gabriel, body: { action: 'step' } });
    if (live.body.status === 'completed') break;
  }
  assert.equal(live.body.status, 'completed');
  assert.equal(live.body.bookings.find((b) => b.bookingId === bookingId).status, 'arrived_at_school');

  const confirm = await call('POST', `/api/bookings/${bookingId}/confirm-arrival`, { token: gabriel });
  assert.equal(confirm.body.pointsAwarded, 10);
  const again = await call('POST', `/api/bookings/${bookingId}/confirm-arrival`, { token: gabriel });
  assert.equal(again.body.pointsAwarded, 0);

  const review = await call('POST', '/api/reviews', { token: gabriel, body: { bookingId, rating: 5, comment: 'Super!' } });
  assert.equal(review.status, 201);

  const b = await call('GET', `/api/bookings/${bookingId}`, { token: gabriel });
  const share = await call('GET', `/api/share/${b.body.booking.shareToken}`);
  assert.equal(share.status, 200);
  assert.equal(share.body.childName, 'Ana');
  assert.equal(share.body.driverPhone, undefined);

  const notifs = await call('GET', '/api/notifications', { token: gabriel });
  assert.ok(notifs.body.notifications.some((n) => n.type === 'arrived_at_school'));
});

test('înregistrare cu școala și datele copilului', async () => {
  const base = { fullName: 'Ioana Popa', email: 'ioana.popa@test.ro', phone: '0744000111', password: 'parola-sigura1',
    schoolId: 1, childName: 'Luca Popa', childBirthDate: '2014-05-12', childGradeLevel: 'a VI-a', childGradeLetter: 'b', consent: true };
  assert.equal((await call('POST', '/api/auth/register', { body: { ...base, schoolId: 999 } })).status, 400);
  assert.equal((await call('POST', '/api/auth/register', { body: { ...base, childBirthDate: '2024-01-01' } })).status, 400);
  assert.equal((await call('POST', '/api/auth/register', { body: { ...base, childGradeLevel: 'a XX-a' } })).status, 400);

  const ok = await call('POST', '/api/auth/register', { body: base });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  assert.equal(ok.body.child.full_name, 'Luca Popa');
  assert.equal(ok.body.child.grade, 'Clasa a VI-a B');
  const token = ok.body.token;
  assert.equal((await call('POST', '/api/auth/register', { body: base })).status, 409, 'email deja folosit');

  const second = await call('POST', '/api/children', { token, body: { schoolId: 1, childName: 'Irina Popa', childBirthDate: '2017-11-03', childGradeLevel: 'a III-a', childGradeLetter: 'A' } });
  assert.equal(second.status, 201, JSON.stringify(second.body));
  assert.equal((await call('POST', '/api/children', { token, body: { schoolId: 1, childName: 'Irina Popa', childBirthDate: '2017-11-03', childGradeLevel: 'a III-a' } })).status, 400, 'duplicat');

  const patch = await call('PATCH', `/api/children/${ok.body.child.child_id}`, { token, body: { homeArea: 'Copou', interests: ['robotica', 'sah'], bio: 'Test' } });
  assert.equal(patch.status, 200);
  assert.ok(patch.body.child.profileComplete);
  const badInterest = await call('PATCH', `/api/children/${ok.body.child.child_id}`, { token, body: { interests: ['zbor'] } });
  assert.equal(badInterest.status, 400);

  const em = await call('PATCH', '/api/me', { token, body: { emergencyContactName: 'Bunica Popa', emergencyContactPhone: '+40722123456' } });
  assert.equal(em.body.user.emergencyContactName, 'Bunica Popa');
});

test('publicare cursă de către un părinte nou devenit șofer', async () => {
  const token = await login('ioana.popa@test.ro', 'parola-sigura1');
  const v = await call('POST', '/api/vehicles', { token, body: { brand: 'Dacia', model: 'Logan', color: 'Alb', licensePlate: 'is 11 pop', childSeats: 3, boosterSeats: 1 } });
  assert.equal(v.status, 201, JSON.stringify(v.body));
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Bucharest' });
  const pub = await call('POST', '/api/rides', { token, body: {
    schoolId: 1, area: 'Copou', address: 'Bd. Carol I nr. 20', startDate: tomorrow, time: '07:35', days: [1, 2, 3, 4, 5],
    vehicleId: v.body.vehicle.id, seats: 1, price: 3, returnTime: '14:30' } });
  assert.equal(pub.status, 201, JSON.stringify(pub.body));
  assert.ok(pub.body.count >= 2);
  const tooMany = await call('POST', '/api/rides', { token, body: {
    schoolId: 1, area: 'Copou', address: 'x', startDate: tomorrow, time: '07:35', days: [1, 2, 3, 4, 5],
    vehicleId: v.body.vehicle.id, seats: 3, price: 3 } });
  assert.equal(tooMany.status, 400, 'doi copii proprii + 3 locuri depășesc capacitatea');
  const me = await call('GET', '/api/me', { token });
  assert.equal(me.body.user.role, 'parent_driver');
});

test('panoul școlii este doar pentru administrator; fondul social primește donații dublate', async () => {
  const parent = await login('gabriel.enache@parinte.edu.ro');
  assert.equal((await call('GET', '/api/schools/1/dashboard', { token: parent })).status, 403);
  const admin = await login('secretariat@negruzzi.schoolhop.ro');
  const dash = await call('GET', '/api/schools/1/dashboard', { token: admin });
  assert.equal(dash.status, 200);
  assert.ok(dash.body.carsRemoved > 0);
  assert.ok(dash.body.corridors.length > 0);

  const before = (await call('GET', '/api/social-fund', { token: parent })).body.balance;
  const after = await call('POST', '/api/social-fund/donations', { token: parent, body: { amount: 50 } });
  assert.equal(after.status, 201);
  assert.equal(after.body.balance, before + 100);
  const badges = await call('GET', '/api/me/badges', { token: parent });
  assert.ok(badges.body.badges.find((x) => x.code === 'donor').earned);
});

test('validare: date invalide respinse, login doar cu cont existent', async () => {
  const base = { fullName: 'Radu Ionescu', email: 'radu@test.ro', phone: '0744000222', password: 'parola123',
    schoolId: 2, childName: 'Sara Ionescu', childBirthDate: '2016-02-27', childGradeLevel: 'a IV-a', consent: true };
  const cases = [
    { email: 'fara-arond.ro' },
    { email: 'a@b' },
    { phone: '07440002221234567890' },
    { phone: '12345' },
    { password: 'scurta1' },
    { password: 'fara-cifre-deloc' },
    { fullName: 'Radu' },
    { fullName: 'R4du Ion3scu' },
    { childName: 'Sara' },
    { childGradeLetter: 'AB' },
    { consent: false },
  ];
  for (const override of cases) {
    const r = await call('POST', '/api/auth/register', { body: { ...base, ...override } });
    assert.equal(r.status, 400, `${JSON.stringify(override)} -> ${r.status} ${JSON.stringify(r.body)}`);
  }

  // Cont inexistent: login refuzat
  const noAccount = await call('POST', '/api/auth/login', { body: { email: 'nimeni@test.ro', password: 'parola123' } });
  assert.equal(noAccount.status, 401);

  // Cont creat corect, telefonul e normalizat
  const ok = await call('POST', '/api/auth/register', { body: { ...base, phone: '0744 000 222' } });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  assert.equal(ok.body.user.phone, '+40744000222');

  // Profil: telefon prea lung, nume invalid
  assert.equal((await call('PATCH', '/api/me', { token: ok.body.token, body: { emergencyContactPhone: '0'.repeat(30) } })).status, 400);
  assert.equal((await call('PATCH', '/api/me', { token: ok.body.token, body: { emergencyContactName: '<script>' } })).status, 400);
  // Mașină: număr de înmatriculare invalid
  assert.equal((await call('POST', '/api/vehicles', { token: ok.body.token, body: { brand: 'Dacia', model: 'Logan', color: 'Alb', licensePlate: 'XYZ', childSeats: 3 } })).status, 400);

  // Contul șters: token-ul vechi nu mai dă acces
  await db.query('DELETE FROM users WHERE user_id = $1', [ok.body.user.id]);
  const gone = await call('GET', '/api/me', { token: ok.body.token });
  assert.equal(gone.status, 401);
});

test('asistent: răspuns când modelul AI nu e configurat, validarea mesajelor', async () => {
  const token = await login('gabriel.enache@parinte.edu.ro');
  const ok = await call('POST', '/api/assistant', { token, body: { messages: [{ role: 'user', content: 'Caută o cursă pentru mâine' }] } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.configured, false);
  assert.ok(ok.body.reply.length > 10);
  assert.equal((await call('POST', '/api/assistant', { token, body: { messages: [] } })).status, 400);
  assert.equal((await call('POST', '/api/assistant', { token, body: { messages: [{ role: 'user', content: 'x'.repeat(1001) }] } })).status, 400);
  assert.equal((await call('POST', '/api/assistant', { body: { messages: [{ role: 'user', content: 'salut' }] } })).status, 401);
});
