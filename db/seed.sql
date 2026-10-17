-- ==============================================================================
-- TakeMe - Date de test și Seed pentru Hackathon (Iași)
-- 16 utilizatori verificați, 6 rute reale, polilinii OSRM, mașini, curse demo
-- ==============================================================================

-- 1. UTILIZATORI
INSERT INTO users (id, full_name, email, phone, password_hash, gender, id_verified, selfie_verified, arrival_code_hash, duress_code_hash, rating_avg, rating_count, points)
VALUES
    -- Șoferița din scenariul de demo:
    (1, 'Andreea Rusu', 'andreea.rusu@takeme.ro', '+40740123456', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'female', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 4.92, 28, 340),
    -- Pasagerii din scenariul de demo:
    (2, 'Mihai Costin', 'mihai.costin@takeme.ro', '+40740987654', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'male', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 4.95, 14, 180),
    (3, 'Ioana Popa', 'ioana.popa@takeme.ro', '+40741223344', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'female', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 5.00, 9, 120),
    
    -- Alți șoferi din Iași:
    (4, 'Dan Radu', 'dan.radu@takeme.ro', '+40742111222', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'male', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 4.88, 35, 410),
    (5, 'Elena Vasiliu', 'elena.vasiliu@takeme.ro', '+40743333444', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'female', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 4.96, 42, 520),
    (6, 'Bogdan Ionescu', 'bogdan.ionescu@takeme.ro', '+40744555666', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'male', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 4.82, 19, 210),
    (7, 'Cristian Pintilie', 'cristian.p@takeme.ro', '+40745777888', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'male', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 4.85, 22, 260),
    (8, 'Simona Marinescu', 'simona.m@takeme.ro', '+40746999000', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'female', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 5.00, 16, 190),

    -- Alți pasageri navetiști:
    (9, 'Gabriel Enache', 'gabriel.e@takeme.ro', '+40751111222', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'male', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 4.90, 8, 90),
    (10, 'Ana Moraru', 'ana.moraru@takeme.ro', '+40752222333', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'female', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 4.95, 12, 140),
    (11, 'Raluca Stanciu', 'raluca.s@takeme.ro', '+40753333444', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'female', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 5.00, 6, 70),
    (12, 'Vlad Diaconu', 'vlad.d@takeme.ro', '+40754444555', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'male', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 4.78, 11, 110),
    (13, 'Carmen Teodorescu', 'carmen.t@takeme.ro', '+40755555666', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'female', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 4.90, 15, 160),
    (14, 'Radu Miron', 'radu.miron@takeme.ro', '+40756666777', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'male', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 4.86, 7, 80),
    (15, 'Oana Iliescu', 'oana.iliescu@takeme.ro', '+40757777888', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'female', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 5.00, 10, 130),
    (16, 'Alexandru Cojocaru', 'alex.c@takeme.ro', '+40758888999', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', 'male', true, true, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '341be97d9aff90c9978347f66f945b77c1510ce298ca14238e9c9c3e44927cb0', 4.88, 14, 150)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 2. CONTACTE DE URGENȚĂ
INSERT INTO emergency_contacts (id, user_id, name, phone)
VALUES
    (1, 1, 'Maria Rusu (Mama)', '+40740111222'),
    (2, 2, 'Laura Costin (Soția)', '+40740333444'),
    (3, 3, 'George Popa (Frate)', '+40740555666'),
    (4, 5, 'Ion Vasiliu (Soț)', '+40740777888')
ON CONFLICT (id) DO NOTHING;

SELECT setval('emergency_contacts_id_seq', (SELECT MAX(id) FROM emergency_contacts));

-- 3. AUTOVEHICULE
INSERT INTO vehicles (id, owner_id, plate, make, model, color, seats_total)
VALUES
    (1, 1, 'IS 23 TKM', 'Dacia', 'Jogger Eco-G', 'Gri Urban', 6),
    (2, 4, 'IS 10 TKM', 'Toyota', 'Corolla Hybrid', 'Alb Perlat', 4),
    (3, 5, 'IS 45 TKM', 'Renault', 'Megane', 'Albastru Cosmos', 4),
    (4, 6, 'IS 88 TKM', 'Skoda', 'Octavia Combi', 'Argintiu', 4),
    (5, 7, 'IS 07 TKM', 'Volkswagen', 'Golf 7', 'Negru Metalizat', 4),
    (6, 8, 'IS 19 TKM', 'Hyundai', 'i20', 'Roșu Passion', 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval('vehicles_id_seq', (SELECT MAX(id) FROM vehicles));

-- 4. RUTE REALE DIN IAȘI (CU POLILINII OSRM)
INSERT INTO routes (
    id, driver_id, vehicle_id, name,
    start_lat, start_lng, start_label,
    end_lat, end_lng, end_label,
    polyline,
    departure_time, days_of_week, price_per_seat, price_cap,
    women_only, verified_only, active
)
VALUES
    (
        1, 1, 1, 'Valea Lupului → Copou',
        47.1812, 27.5023, 'DN28 Valea Lupului (Kaufland)',
        47.1743, 27.5717, 'Universitatea Al. I. Cuza, Copou',
        '[
            [47.1812, 27.5023],
            [47.1798, 27.5145],
            [47.1785, 27.5270],
            [47.1772, 27.5395],
            [47.1764, 27.5456],
            [47.1745, 27.5530],
            [47.1725, 27.5615],
            [47.1702, 27.5685],
            [47.1718, 27.5702],
            [47.1743, 27.5717]
        ]'::jsonb,
        '07:40:00', '1,2,3,4,5', 7.00, 10.00,
        false, true, true
    ),
    (
        2, 4, 2, 'Miroslava → Palas',
        47.1472, 27.5255, 'Miroslava Primărie',
        47.1585, 27.5872, 'Complex Palas Mall',
        '[
            [47.1472, 27.5255],
            [47.1495, 27.5380],
            [47.1518, 27.5510],
            [47.1542, 27.5650],
            [47.1565, 27.5765],
            [47.1585, 27.5872]
        ]'::jsonb,
        '08:00:00', '1,2,3,4,5', 6.50, 9.00,
        false, true, true
    ),
    (
        3, 5, 3, 'Bucium → Universitate',
        47.1278, 27.6256, 'Hanul Trei Sarmale, Bucium',
        47.1743, 27.5717, 'Copou (UAIC Corp A)',
        '[
            [47.1278, 27.6256],
            [47.1360, 27.6140],
            [47.1450, 27.5990],
            [47.1550, 27.5850],
            [47.1650, 27.5780],
            [47.1743, 27.5717]
        ]'::jsonb,
        '07:30:00', '1,2,3,4,5', 8.00, 12.00,
        true, true, true
    ),
    (
        4, 6, 4, 'Tomești → Podu Roș',
        47.1245, 27.6934, 'Tomești Blocuri',
        47.1498, 27.5912, 'Podu Roș',
        '[
            [47.1245, 27.6934],
            [47.1320, 27.6610],
            [47.1390, 27.6320],
            [47.1445, 27.6080],
            [47.1498, 27.5912]
        ]'::jsonb,
        '07:50:00', '1,2,3,4,5', 7.50, 11.00,
        false, true, true
    ),
    (
        5, 7, 5, 'CUG → Universitate',
        47.1189, 27.5921, 'Rond Tehnopolis CUG',
        47.1743, 27.5717, 'Universitate (Copou)',
        '[
            [47.1189, 27.5921],
            [47.1290, 27.5905],
            [47.1420, 27.5880],
            [47.1550, 27.5820],
            [47.1680, 27.5740],
            [47.1743, 27.5717]
        ]'::jsonb,
        '07:45:00', '1,2,3,4,5', 7.00, 10.00,
        false, true, true
    ),
    (
        6, 8, 6, 'Păcurari → Gară',
        47.1764, 27.5456, 'Moara 1 Mai, Păcurari',
        47.1654, 27.5702, 'Gara Mare Iași',
        '[
            [47.1764, 27.5456],
            [47.1730, 27.5540],
            [47.1690, 27.5620],
            [47.1654, 27.5702]
        ]'::jsonb,
        '08:15:00', '1,2,3,4,5', 5.00, 8.00,
        false, true, true
    )
ON CONFLICT (id) DO NOTHING;

SELECT setval('routes_id_seq', (SELECT MAX(id) FROM routes));

-- 5. CURSE DEMO
INSERT INTO trips (
    id, route_id, date, departure_at,
    status, seats_available, share_token
)
VALUES
    -- Cursa DEMO principală (Andreea Rusu - Valea Lupului -> Copou, 07:40)
    (1, 1, CURRENT_DATE, (CURRENT_DATE + TIME '07:40:00'), 'scheduled', 3, 'track-andreea-copou-demo-2026'),
    (2, 1, CURRENT_DATE + 1, (CURRENT_DATE + 1 + TIME '07:40:00'), 'scheduled', 4, 'track-andreea-copou-tomorrow'),
    (3, 2, CURRENT_DATE, (CURRENT_DATE + TIME '08:00:00'), 'scheduled', 2, 'track-dan-palas-demo'),
    (4, 3, CURRENT_DATE, (CURRENT_DATE + TIME '07:30:00'), 'scheduled', 2, 'track-elena-copou-women')
ON CONFLICT (id) DO NOTHING;

SELECT setval('trips_id_seq', (SELECT MAX(id) FROM trips));

-- 6. REZERVĂRI DEMO
INSERT INTO bookings (
    id, trip_id, passenger_id,
    pickup_lat, pickup_lng, pickup_label, pickup_index,
    dropoff_lat, dropoff_lng, dropoff_label, dropoff_index,
    seat_pref, price, status, eta_arrival
)
VALUES
    -- Mihai a rezervat loc pe cursa Andreei pentru demo:
    (
        1, 1, 2,
        47.1798, 27.5145, 'Stația Popas Păcurari', 1,
        47.1743, 27.5717, 'Universitatea Al. I. Cuza (Copou)', 9,
        'back_right', 7.00, 'confirmed', (CURRENT_DATE + TIME '08:05:00')
    ),
    -- Ioana Popa a rezervat de la Moara 1 Mai:
    (
        2, 1, 3,
        47.1764, 27.5456, 'Moara 1 Mai (Păcurari)', 4,
        47.1743, 27.5717, 'Universitatea Al. I. Cuza (Copou)', 9,
        'back_left', 7.00, 'confirmed', (CURRENT_DATE + TIME '08:05:00')
    )
ON CONFLICT (id) DO NOTHING;

SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));

-- 7. RECENZII
INSERT INTO reviews (id, trip_id, author_id, target_id, stars, comment)
VALUES
    (1, 1, 2, 1, 5, 'Super punctuală Andreea! Mașină curată, am ajuns la timp la facultate fără aglomerația din autobuz.'),
    (2, 1, 3, 1, 5, 'M-am simțit în maximă siguranță. Codul de sosire și traseul live pe hartă îți dau liniște sufletească.'),
    (3, 1, 1, 2, 5, 'Pasager respectuos, a fost la punctul de întâlnire fix la secunda stabilită.'),
    (4, 3, 9, 4, 5, 'Dan conduce foarte prudent pe coridorul Miroslava - Palas!')
ON CONFLICT (id) DO NOTHING;

SELECT setval('reviews_id_seq', (SELECT MAX(id) FROM reviews));

-- 8. PUNCTE & IMPACT
INSERT INTO points_ledger (id, user_id, delta, reason)
VALUES
    (1, 1, 20, '2 pasageri preluați pe coridorul Valea Lupului'),
    (2, 1, 15, '1.8 kg CO2 evitat'),
    (3, 2, 10, 'Cursă finalizată cu cod de sosire'),
    (4, 2, 10, '0.9 kg CO2 evitat'),
    (5, 3, 10, 'Cursă finalizată cu cod de sosire')
ON CONFLICT (id) DO NOTHING;

SELECT setval('points_ledger_id_seq', (SELECT MAX(id) FROM points_ledger));
