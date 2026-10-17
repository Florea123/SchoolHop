# SchoolHop - Carpooling școlar sigur (Iași)

Platformă dedicată exclusiv **transportului copiilor la școală**. Șoferii sunt părinți ai copiilor de la aceeași școală (sau șoferi comunitari), iar **pasagerii sunt exclusiv copiii**.

**Stack:** PostgreSQL · Node.js (Express) · HTML/CSS/JavaScript fără framework-uri (ES modules).

---

## Funcționalități

1. **Cont de familie** - părintele își alege școala și introduce datele copilului (nume, data nașterii, clasa); alți copii se pot adăuga din profil. Toate datele sunt validate (email, telefon românesc, nume, parolă etc.).
2. **Potrivire „AI” între copii** - scor explicabil calculat din: aceeași clasă / același an, interese comune (Jaccard), aceeași zonă, vârstă apropiată. Rezultatele sunt sortate după apropiere și scor; recomandările se salvează în `ai_interest_matches`.
3. **Rezervare pe locuri** - harta locurilor din mașină, reguli de siguranță (locul din față doar de la 12 ani), înălțătoare disponibile, rezervare pe mai multe zile + întoarcere după ore.
4. **Publicare curse** - părintele-șofer alege zilele, mașina, locurile oferite; copiii proprii ocupă automat locuri; vecinii din aceeași zonă sunt notificați.
5. **Cursă live** - poziția mașinii (GPS din browserul șoferului sau simulare), ETA, preluare copii, **alertă automată de deviere** de la traseu, **SOS** (notifică părinții, șoferul și secretariatul), **link public pentru bunici**.
6. **Predare la școală** - confirmare de către părinte, puncte „Erou Verde”, evaluarea șoferului.
7. **Fondul Social** - curse gratuite pentru copiii din satele fără microbuz, donații dublate de sponsor, registru transparent, plata automată a șoferului comunitar la finalul cursei.
8. **Panou pentru școală** (rol `admin`) - mașini eliminate de la poartă, coridoare, alerte, familii verificate, fondul social.

Toate datele afișate vin din baza de date prin API; nimic nu este hardcodat în frontend.

---

## Pornire rapidă

```bash
# 1. PostgreSQL (Docker) - sau orice PostgreSQL 14+ local
docker compose up -d postgres

# 2. Dependențe și configurare
npm install
cp .env.example .env

# 3. Schema + date demo (doar dacă baza e goală; nu șterge conturile existente)
npm run db:init

# 4. Pornește serverul (API + frontend)
npm start            # sau: npm run dev (repornire automată)
```

Deschide **http://localhost:3000**.

### Conturi demo (parola: `TakeMe2026!`)

| Cont | Rol |
|---|---|
| `gabriel.enache@parinte.edu.ro` | părinte (David și Ana) - caută și rezervă curse |
| `andreea.rusu@parinte.edu.ro` | părinte-șofer (Valea Lupului → Negruzzi) |
| `ionel.ciobanu@comunitate.schoolhop.ro` | șofer comunitar (Fondul Social) |
| `secretariat@negruzzi.schoolhop.ro` | administrator școală (panou) |

Pentru **înregistrare** apasă „Creează cont”, alege școala și completează datele copilului.

### Teste

```bash
npm test   # test end-to-end al API-ului, pe o bază separată (<nume>_test), creată automat
```

`npm run db:reset` **șterge toate datele** (inclusiv conturile create din aplicație) și reîncarcă datele demo. Folosiți-l doar când vreți explicit să o luați de la zero.

---

## Structura proiectului

```
backend/
  server.js, app.js, config.js
  middleware/   auth (JWT), errors
  routes/       auth, meta, me, children, vehicles, rides, bookings, reviews,
                notifications, share (public), social-fund, schools (panou)
  services/     ai (potrivire), rides, rideActions, geo, seats, stats, badges, notify, childProfile
db/             schema.sql, seed.sql, db.js, init.js, reset.js
frontend/
  <pagina>.html            câte un fișier HTML pe pagină
  css/base.css, layout.css design system + app shell responsive
  css/pages/<pagina>.css   stiluri specifice paginii
  js/core/                 api (client HTTP), ui (utilitare), layout (header/navigație), map (hartă SVG)
  js/pages/<pagina>.js     logica paginii
tests/api.test.js
```

Pagini: `login`, `register` → `verify` (zona de domiciliu) → `emergency` (înregistrare în 3 pași), `home`, `search` → `results` → `meeting` → `seat` → `schedule` (rezervare), `publish`, `my-rides`, `ride` (live), `alert`, `dropoff`, `review`, `share` (public), `profile`, `impact`, `rewards`, `notifications`, `dashboard` (admin).

Layout responsive: pe telefon navigația e o bară fixă jos; de la 900px urcă în header, iar listele trec pe 2 coloane.

---

## Asistentul pentru părinți (chat)

Pe paginile părinților apare un robot mic, pe care îl poți muta trăgându-l; la click se deschide chat-ul lângă el. Interfața și endpoint-ul `POST /api/assistant` sunt gata. Modelul AI se conectează în `replyWithModel()` din `backend/services/assistant.js`, folosind cheia `AI_API_KEY` din `.env`. Cât timp cheia e goală, asistentul răspunde că nu este încă configurat.

## Integrarea unui model AI

Scorul de potrivire este calculat local (`backend/services/ai.js`). Textele generate (recomandarea pentru părinți și „întrebarea zilei” pentru copii) trec prin funcția `generateText()` din același fișier - momentan întoarce `null`, deci se folosesc textele generate local. Implementați acolo apelul către modelul ales.

## API (rezumat)

Toate rutele sunt sub `/api`; cele marcate cu * cer `Authorization: Bearer <token>`.

| Metodă | Rută | Descriere |
|---|---|---|
| POST | `/auth/login`, `/auth/register` | autentificare / înregistrare (părinte + primul copil) |
| GET | `/meta` | școli, zone, interese, configurare |
| GET/PATCH | `/me` * | profil, contact de urgență |
| GET | `/me/home`, `/me/rides?scope=upcoming\|history`, `/me/impact`, `/me/badges` * | date pentru pagini |
| PATCH | `/children/:id`, POST `/children` * | profil copil, adăugare copil |
| GET/POST/DELETE | `/vehicles` * | mașini |
| GET | `/rides/search?childId&date&area&arriveBy&direction` * | căutare cu potrivire AI |
| GET | `/rides/:id?childId` * | detalii, locuri, zilele cursei |
| POST | `/rides` * | publicare (repetată pe zile) |
| POST | `/rides/:id/start\|location\|arrive\|cancel` * | acțiunile șoferului |
| GET | `/rides/:id/live`, `/rides/:id/topic` * | urmărire live, întrebarea zilei |
| POST | `/rides/:id/sos`, `/rides/:id/alerts/:alertId/resolve`, `/rides/:id/simulate` * | siguranță, simulare |
| POST | `/bookings`, `/bookings/:id/cancel\|pickup\|confirm-arrival` * | rezervări |
| GET | `/share/:token` | link public pentru familie |
| POST | `/reviews` * | evaluare șofer |
| GET/POST | `/notifications`, `/social-fund`, `/social-fund/donations` * | notificări, fond social |
| GET | `/schools/:id/dashboard` * | panou școală (admin) |
| POST | `/assistant` * | chat cu asistentul pentru părinți |
