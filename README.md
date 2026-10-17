# TakeMe - Carpooling sigur pentru navetiști (Iași)

> **Stack:** PostgreSQL (Bază de date) + Node.js (Backend) + HTML/CSS/JavaScript (Frontend)

---

## 🗄️ Baza de date PostgreSQL (`/db`)

Tabelele definite conform specificațiilor proiectului:
1. **`users`**: Pasageri și șoferi (nume, email, telefon, parolă hash, `gender`, `id_verified`, `selfie_verified`, `arrival_code_hash`, `duress_code_hash`, `points`, `rating_avg`).
2. **`emergency_contacts`**: Persoane de contact notificate automat la incidente pe traseu.
3. **`vehicles`**: Autovehicule (marcă, model, culoare, număr de înmatriculare, locuri).
4. **`routes`**: Traseele recurente din Iași, incluzând polilinia OSRM în format JSONB (`[[lat, lng], ...]`), ore de plecare, preț și plafon de cost combustibil (`price_cap`).
5. **`trips`**: Curse concrete programate pentru o zi (`scheduled`, `in_progress`, `completed`, `cancelled`) + token public de share.
6. **`bookings`**: Rezervările pasagerilor (`pickup_index`, `dropoff_index`, `seat_pref`, `price`, `status`).
7. **`trip_positions`**: Poziții GPS live ale mașinii (`lat`, `lng`, `speed`, `recorded_at`).
8. **`safety_events`**: Alerte de siguranță (`route_deviation`, `long_stop`, `arrival_timeout`, `duress_code`, `sos`).
9. **`reviews`**: Evaluări și stele (1-5) între șoferi și pasageri.
10. **`points_ledger`**: Jurnalul de puncte și impact ecologic (CO₂ evitat).

---

## 🚀 Pornire și Utilizare

### 1. Pornire PostgreSQL prin Docker
```bash
docker compose up -d postgres
```
*(Baza de date pornește pe portul `5432`, iar scripturile `01_schema.sql` și `02_seed.sql` sunt executate automat la prima inițializare).*

### 2. Inițializare / Reîncărcare din Node.js
Dacă vrei să rulezi crearea tabelelor și popularea datelor din Node.js:
```bash
npm install
npm run db:init
```

### 3. Resetare rapidă înainte de DEMO
Pentru a aduce baza de date la starea curată de test înainte de prezentare:
```bash
npm run db:reset
```

### 4. Utilizare în backend-ul Node.js
Modulul de conexiune este pregătit în [`db/db.js`](file:///Users/dianaplosnita/MarkAiHackathon/TakeMe/db/db.js). Îl poți importa direct în rutele tale Express / Node:

```javascript
const db = require('./db/db');

// Exemplu interogare rute active:
async function getRoutes() {
  const { rows } = await db.query(
    'SELECT * FROM routes WHERE active = true ORDER BY departure_time ASC'
  );
  return rows;
}

// Exemplu căutare utilizator:
async function getUserByEmail(email) {
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0];
}
```