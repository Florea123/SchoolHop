# TakeMe Kids - Carpooling Școlar Sigur (Iași)

> **Concept (conform feedback-ului mentorilor):**  
> Platformă dedicată exclusiv **transportului copiilor la școală**.  
> **Regulă de aur:** Șoferul este un părinte sau o persoană verificată prin contul școlar. **Pasagerii sunt exclusiv copiii** (fără potriviri între adulți).

---

## 🎯 Puncte Cheie & Funcționalități

1. **Autentificare prin contul școlar:** Login simulat / integrat cu catalogul electronic (Edu / Școală) pentru acces exclusiv al părinților verificați.
2. **Profilul copilului & componenta AI:** Părinții completează interesele copiilor (fotbal, pian, robotică, dans). AI-ul identifică potriviri între colegi de pe același traseu pentru a stimula prieteniile pe drum.
3. **Puncte sigure de predare (Drop-off):** Exemplul **Colegiul Național „Costache Negruzzi”** din Iași – puncte fixe de debarcare pentru a elimina blocajele din fața porții școlii.
4. **Fondul Social pentru copiii de la sat:** Finanțarea curselor pentru copiii din satele greu accesibile (ex: Sat Horlești / Rediu) cu șoferi comunitari care fac deja traseul spre oraș, plătiți cu o sumă fixă per cursă.
5. **Transparență totală:** Dashboard pentru fondul social, donații și dublarea sumelor de către sponsori corporate.

---

## 🗄️ Baza de Date PostgreSQL (`/db`)

Tabelele definite în [`db/schema.sql`](file:///Users/dianaplosnita/MarkAiHackathon/TakeMe/db/schema.sql):
- **`schools`**: Școli partenere și punctele sigure de predare (drop-off zones).
- **`users`**: Părinți și șoferi verificați prin contul școlar (`school_account_id`).
- **`children`**: Copiii (pasagerii) – conțin școala, clasa și interesele (`JSONB`).
- **`vehicles`**: Mașinile părinților, cu număr de locuri și înălțătoare disponibile.
- **`rides`**: Cursele școlare (curse obișnuite de părinte sau sponsorizate din Fondul Social).
- **`bookings`**: Rezervările copiilor (status: `confirmed`, `picked_up`, `arrived_at_school`).
- **`ai_interest_matches`**: Potrivirile AI între copii pe baza pasiunilor comune și scor de compatibilitate.
- **`social_fund_transactions`**: Jurnalul transparent al donațiilor și curselor rurale finanțate.
- **`reviews`**: Evaluări ale părinților (siguranță și punctualitate).
- **`notifications`**: Alerte live pentru părinți (copilul a fost preluat, a ajuns în siguranță la școală).

---

## 🚀 Utilizare în Node.js

### 1. Pornire PostgreSQL
```bash
docker compose up -d postgres
```

### 2. Inițializare / Reîncărcare Schema & Seed
```bash
npm install
npm run db:init
```

### 3. Resetare rapidă pentru DEMO
```bash
npm run db:reset
```

### 4. Exemplu interogare în backend-ul Node.js (`db/db.js`):
```javascript
const db = require('./db/db');

// Căutare curse către o anumită școală
app.get('/api/schools/:schoolId/rides', async (req, res) => {
  const { schoolId } = req.params;
  const { rows } = await db.query(
    `SELECT r.*, u.full_name as driver_name, u.phone, s.name as school_name, s.dropoff_point_label
     FROM rides r
     JOIN users u ON r.driver_id = u.user_id
     JOIN schools s ON r.school_id = s.school_id
     WHERE r.school_id = $1 AND r.available_seats > 0 AND r.ride_status = 'scheduled'
     ORDER BY r.departure_time ASC`,
    [schoolId]
  );
  res.json(rows);
});

// Potriviri AI de interese pentru un copil
app.get('/api/children/:childId/matches', async (req, res) => {
  const { childId } = req.params;
  const { rows } = await db.query(
    `SELECT m.*, c.full_name as matched_child_name, c.grade
     FROM ai_interest_matches m
     JOIN children c ON (c.child_id = CASE WHEN m.child_id_1 = $1 THEN m.child_id_2 ELSE m.child_id_1 END)
     WHERE m.child_id_1 = $1 OR m.child_id_2 = $1
     ORDER BY m.compatibility_score DESC`,
    [childId]
  );
  res.json(rows);
});
```