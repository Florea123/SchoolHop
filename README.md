# TakeMe - Platformă de Carpooling

> **Stack:** PostgreSQL (Bază de date) + Node.js (Backend) + HTML/CSS/JavaScript (Frontend)

---

## 🗄️ Baza de Date (Conform Diagramei Detaliate)

Baza de date este formată din cele 6 tabele relaționale:

1. **`USERS`**:
   - `user_id` (PK, INT)
   - `full_name` (VARCHAR 100)
   - `email` (VARCHAR 150, UNIQUE)
   - `password_hash` (VARCHAR 255)
   - `phone` (VARCHAR 20)
   - `profile_photo` (VARCHAR 255)
   - `created_at` (DATETIME / TIMESTAMP)
   - `account_status` (VARCHAR 20)
   - *Notă: Un utilizator poate fi atât șofer, cât și pasager.*

2. **`VEHICLES`**:
   - `vehicle_id` (PK, INT)
   - `owner_id` (FK -> users.user_id)
   - `brand` (VARCHAR 50)
   - `model` (VARCHAR 50)
   - `color` (VARCHAR 30)
   - `license_plate` (VARCHAR 20)
   - `seats` (INT)
   - `created_at` (DATETIME)

3. **`RIDES`**:
   - `ride_id` (PK, INT)
   - `driver_id` (FK -> users.user_id)
   - `vehicle_id` (FK -> vehicles.vehicle_id)
   - `departure_city` (VARCHAR 100)
   - `departure_address` (VARCHAR 255)
   - `departure_lat`, `departure_lon` (DECIMAL 9,6)
   - `destination_city` (VARCHAR 100)
   - `destination_address` (VARCHAR 255)
   - `destination_lat`, `destination_lon` (DECIMAL 9,6)
   - `departure_time` (DATETIME)
   - `available_seats` (INT - locurile rămase)
   - `price_per_seat` (DECIMAL 10,2)
   - `notes` (TEXT)
   - `ride_status` (VARCHAR 20)
   - `created_at` (DATETIME)

4. **`BOOKINGS`**:
   - `booking_id` (PK, INT)
   - `ride_id` (FK -> rides.ride_id)
   - `passenger_id` (FK -> users.user_id)
   - `seats_booked` (INT)
   - `total_price` (DECIMAL 10,2)
   - `booking_status` (VARCHAR 20)
   - `booked_at` (DATETIME)

5. **`REVIEWS`**:
   - `review_id` (PK, INT)
   - `booking_id` (FK -> bookings.booking_id)
   - `reviewer_id` (FK -> users.user_id)
   - `reviewee_id` (FK -> users.user_id)
   - `rating` (INT 1-5)
   - `comment` (TEXT)
   - `created_at` (DATETIME)

6. **`NOTIFICATIONS`**:
   - `notification_id` (PK, INT)
   - `user_id` (FK -> users.user_id)
   - `title` (VARCHAR 100)
   - `message` (TEXT)
   - `notification_type` (VARCHAR 30)
   - `is_read` (BOOLEAN)
   - `created_at` (DATETIME)

---

## 🚀 Utilizare în Proiect

### 1. Pornire PostgreSQL prin Docker
```bash
docker compose up -d postgres
```

### 2. Inițializare / Seed din Node.js
```bash
npm install
npm run db:init
```

### 3. Resetare rapidă pentru DEMO
```bash
npm run db:reset
```

### 4. Exemplu interogare în backend-ul Node.js (`Express` / `db.js`)
```javascript
const db = require('./db/db');

// Căutare curse după oraș de plecare și destinație
app.get('/api/rides/search', async (req, res) => {
  const { from, to } = req.query;
  const { rows } = await db.query(
    `SELECT r.*, u.full_name as driver_name, u.phone as driver_phone, v.brand, v.model, v.license_plate
     FROM rides r
     JOIN users u ON r.driver_id = u.user_id
     JOIN vehicles v ON r.vehicle_id = v.vehicle_id
     WHERE r.departure_city ILIKE $1 
       AND r.destination_city ILIKE $2 
       AND r.available_seats > 0
       AND r.ride_status = 'scheduled'
     ORDER BY r.departure_time ASC`,
    [`%${from}%`, `%${to}%`]
  );
  res.json(rows);
});
```