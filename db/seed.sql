-- ==============================================================================
-- TakeMe Kids - Seed realist pentru Carpooling Școlar (Iași)
-- ==============================================================================

-- 1. ȘCOLI PARTENERE (inclusiv exemplul Colegiul Negruzzi din feedback)
INSERT INTO schools (school_id, name, address, city, lat, lon, dropoff_point_label)
VALUES
    (
        1,
        'Colegiul Național „Costache Negruzzi”',
        'Strada Toma Cozma 4, Iași',
        'Iași',
        47.172500, 27.568200,
        'Punct Sigur Debarcare Elevi (Parcarea Laterală Toma Cozma)'
    ),
    (
        2,
        'Colegiul Național „Emil Racoviță”',
        'Aleea Nicolina 4, Iași',
        'Iași',
        47.152800, 27.581000,
        'Punct Sigur Debarcare (Rond Podu Roș / Parcare Liceu)'
    ),
    (
        3,
        'Colegiul Național Iași',
        'Strada Arcu 4, Iași',
        'Iași',
        47.166200, 27.576800,
        'Punct Sigur Debarcare (Bulevardul Independenței / Arcu)'
    )
ON CONFLICT (school_id) DO UPDATE SET name = EXCLUDED.name;

SELECT setval('schools_school_id_seq', (SELECT MAX(school_id) FROM schools));

-- 2. UTILIZATORI (Părinți și Șoferi verificați prin contul școlar)
INSERT INTO users (user_id, full_name, email, password_hash, phone, school_account_id, role, is_school_verified, profile_photo)
VALUES
    -- Andreea Rusu: mamă și șoferiță (Valea Lupului -> Colegiul Negruzzi)
    (1, 'Andreea Rusu', 'andreea.rusu@parinte.edu.ro', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', '+40740123456', 'EDU-IS-NEGRUZZI-084', 'parent_driver', true, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
    
    -- Gabriel Enache: părinte pasager (Valea Lupului, tatăl lui David)
    (2, 'Gabriel Enache', 'gabriel.enache@parinte.edu.ro', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', '+40740987654', 'EDU-IS-NEGRUZZI-112', 'parent', true, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),

    -- Dan Radu: părinte șofer (Miroslava -> Colegiul Racoviță)
    (3, 'Dan Radu', 'dan.radu@parinte.edu.ro', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', '+40742111222', 'EDU-IS-RACOVITA-035', 'parent_driver', true, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'),

    -- Elena Vasiliu: părinte șofer (Bucium -> Colegiul Negruzzi)
    (4, 'Elena Vasiliu', 'elena.vasiliu@parinte.edu.ro', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', '+40743333444', 'EDU-IS-NEGRUZZI-091', 'parent_driver', true, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'),

    -- Ionel Ciobanu: șofer comunitar verificat pentru copiii din sat (Fond Social, ruta Sat Horlești -> Iași)
    (5, 'Ionel Ciobanu', 'ionel.ciobanu@comunitate.takeme.ro', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', '+40749888999', 'COM-IS-RURAL-003', 'community_driver', true, 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150'),

    -- Maria Moraru: mamă din satul Horlești (fără mașină, beneficiară a Fondului Social)
    (6, 'Maria Moraru', 'maria.moraru@parinte.edu.ro', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', '+40755123789', 'EDU-IS-NEGRUZZI-204', 'parent', true, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150')
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name;

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- 3. COPII (Pasagerii exclusivi)
INSERT INTO children (child_id, parent_id, school_id, full_name, grade, interests, home_village_or_area, home_address, is_social_beneficiary)
VALUES
    -- Matei Rusu (fiul Andreei, Negruzzi)
    (1, 1, 1, 'Matei Rusu', 'Clasa a VI-a B', '["robotica", "fotbal", "sah"]'::jsonb, 'Valea Lupului', 'Str. Cireșilor 12, Valea Lupului', false),
    
    -- David Enache (fiul lui Gabriel, Negruzzi) -> AI Match cu Matei!
    (2, 2, 1, 'David Enache', 'Clasa a VI-a A', '["robotica", "fotbal", "lego"]'::jsonb, 'Valea Lupului', 'Str. Soarelui 8, Valea Lupului', false),

    -- Mara Radu (fiica lui Dan, Racoviță)
    (3, 3, 2, 'Mara Radu', 'Clasa a IV-a C', '["pian", "desen", "inot"]'::jsonb, 'Miroslava', 'Str. Rozelor 21, Miroslava', false),

    -- Sofia Vasiliu (fiica Elenei, Negruzzi)
    (4, 4, 1, 'Sofia Vasiliu', 'Clasa a IV-a B', '["pian", "dans"]'::jsonb, 'Bucium', 'Șos. Bucium 45, Iași', false),

    -- Andrei Moraru (copil din mediul rural, Sat Horlești, beneficiar Fond Social)
    (5, 6, 1, 'Andrei Moraru', 'Clasa a VII-a A', '["matematica", "fotbal", "lectura"]'::jsonb, 'Sat Horlești (Com. Rediu)', 'Nr. 74, Sat Horlești', true)
ON CONFLICT (child_id) DO NOTHING;

SELECT setval('children_child_id_seq', (SELECT MAX(child_id) FROM children));

-- 4. AUTOVEHICULE
INSERT INTO vehicles (vehicle_id, owner_id, brand, model, color, license_plate, child_seats, booster_seats)
VALUES
    (1, 1, 'Dacia', 'Jogger Eco-G', 'Gri Urban', 'IS 23 TKM', 4, 2),
    (2, 3, 'Toyota', 'Corolla Hybrid', 'Alb Perlat', 'IS 10 TKM', 3, 1),
    (3, 4, 'Renault', 'Megane', 'Albastru', 'IS 45 TKM', 3, 1),
    (4, 5, 'Dacia', 'Duster', 'Maro Metalizat', 'IS 01 HRT', 4, 1)
ON CONFLICT (vehicle_id) DO NOTHING;

SELECT setval('vehicles_vehicle_id_seq', (SELECT MAX(vehicle_id) FROM vehicles));

-- 5. CURSE ȘCOLARE
INSERT INTO rides (
    ride_id, driver_id, vehicle_id, school_id,
    departure_village_or_area, departure_address, departure_lat, departure_lon,
    destination_dropoff_point, destination_lat, destination_lon,
    departure_time, available_seats, price_per_seat, is_social_fund, social_driver_stipend,
    notes, ride_status
)
VALUES
    -- Cursa 1: Andreea duce copiii din Valea Lupului la Colegiul Negruzzi
    (
        1, 1, 1, 1,
        'Valea Lupului', 'DN28 Valea Lupului (Kaufland)', 47.181200, 27.502300,
        'Colegiul Național Negruzzi - Parcare Toma Cozma', 47.172500, 27.568200,
        (CURRENT_DATE + TIME '07:30:00'), 2, 4.00, false, 0.00,
        'Preluare copii din Valea Lupului. Sosire la Negruzzi la 07:50, înainte de începerea orelor.', 'scheduled'
    ),

    -- Cursa 2: Fond Social - Ionel Ciobanu ia copiii din Satul Horlești spre Colegiul Negruzzi
    (
        2, 5, 4, 1,
        'Sat Horlești (Rediu)', 'Centru Sat Horlești (Biserică)', 47.218500, 27.481200,
        'Colegiul Național Negruzzi - Punct Sigur Toma Cozma', 47.172500, 27.568200,
        (CURRENT_DATE + TIME '07:15:00'), 3, 0.00, true, 30.00,
        'Cursă finanțată 100% din Fondul Social pentru copiii de la sat fără microbuz școlar.', 'scheduled'
    ),

    -- Cursa 3: Dan Radu - Miroslava spre Colegiul Racoviță
    (
        3, 3, 2, 2,
        'Miroslava', 'Primăria Miroslava', 47.147200, 27.525500,
        'Colegiul Racoviță - Parcare Liceu', 47.152800, 27.581000,
        (CURRENT_DATE + TIME '07:35:00'), 2, 3.50, false, 0.00,
        'Locuri disponibile pentru copiii din Miroslava.', 'scheduled'
    )
ON CONFLICT (ride_id) DO NOTHING;

SELECT setval('rides_ride_id_seq', (SELECT MAX(ride_id) FROM rides));

-- 6. REZERVĂRI COPII
INSERT INTO bookings (
    booking_id, ride_id, child_id, parent_id,
    pickup_address, pickup_lat, pickup_lon, pickup_time,
    booking_status, is_funded_by_social_fund
)
VALUES
    -- David Enache merge cu Andreea și Matei la Negruzzi:
    (
        1, 1, 2, 2,
        'Strada Soarelui 8, Valea Lupului', 47.180500, 27.509000,
        (CURRENT_DATE + TIME '07:35:00'),
        'confirmed', false
    ),
    -- Andrei Moraru din satul Horlești merge cu Ionel prin Fondul Social:
    (
        2, 2, 5, 6,
        'Nr. 74, Sat Horlești', 47.218000, 27.481900,
        (CURRENT_DATE + TIME '07:18:00'),
        'confirmed', true
    )
ON CONFLICT (booking_id) DO NOTHING;

SELECT setval('bookings_booking_id_seq', (SELECT MAX(booking_id) FROM bookings));

-- 7. POTRIVIRE AI DUPĂ INTERESE (AI Interest Matching)
INSERT INTO ai_interest_matches (match_id, child_id_1, child_id_2, common_interests, compatibility_score, ai_recommendation)
VALUES
    (
        1, 1, 2,
        '["robotica", "fotbal"]'::jsonb,
        0.95,
        'Matei și David sunt colegi la Colegiul Negruzzi și ambii sunt pasionați de robotică și fotbal! Drumul împreună îi va ajuta să se împrietenească.'
    ),
    (
        2, 3, 4,
        '["pian"]'::jsonb,
        0.85,
        'Mara și Sofia studiază pianul. Se recomandă carpooling comun pentru activitățile extrașcolare.'
    )
ON CONFLICT (match_id) DO NOTHING;

SELECT setval('ai_interest_matches_match_id_seq', (SELECT MAX(match_id) FROM ai_interest_matches));

-- 8. FONDUL SOCIAL & TRANSPARENȚA DONAȚIILOR (Dashboard Transparență)
INSERT INTO social_fund_transactions (
    transaction_id, transaction_type, donor_id, ride_id,
    amount, target_village, children_helped_count, description
)
VALUES
    (
        1, 'corporate_match', NULL, NULL,
        5000.00, 'Satele din zona metropolitană Iași', 0,
        'Sponsorizare corporate partener (dublarea donațiilor comunității pentru transport școlar rural)'
    ),
    (
        2, 'donation', 1, NULL,
        100.00, 'Sat Horlești / Rediu', 0,
        'Donație voluntară oferită de Andreea Rusu la finalul lunii'
    ),
    (
        3, 'driver_payout', NULL, 2,
        30.00, 'Sat Horlești', 1,
        'Plată sumă fixă compensatorie pentru cursa școlară Horlești → Colegiul Negruzzi (Andrei Moraru)'
    )
ON CONFLICT (transaction_id) DO NOTHING;

SELECT setval('social_fund_transactions_transaction_id_seq', (SELECT MAX(transaction_id) FROM social_fund_transactions));

-- 9. RECENZII
INSERT INTO reviews (review_id, booking_id, parent_id, driver_id, rating, safety_rating, punctuality_rating, comment)
VALUES
    (
        1, 1, 2, 1,
        5, 5, 5,
        'Andreea este extraordinară! David este încântat că merge cu Matei la școală și ajung mereu cu 10 minute înainte de clopoțel la Negruzzi.'
    )
ON CONFLICT (review_id) DO NOTHING;

SELECT setval('reviews_review_id_seq', (SELECT MAX(review_id) FROM reviews));

-- 10. NOTIFICĂRI PENTRU PĂRINȚI
INSERT INTO notifications (notification_id, user_id, title, message, notification_type, is_read)
VALUES
    (
        1, 2,
        'David a urcat în mașină 🚗',
        'Andreea Rusu l-a preluat pe David de la adresa din Valea Lupului la 07:35.',
        'child_picked_up', true
    ),
    (
        2, 2,
        'David a ajuns la Colegiul Negruzzi 🏫',
        'Copilul a fost lăsat în siguranță la Punctul Sigur de Debarcare Toma Cozma la 07:50.',
        'arrived_at_school', true
    ),
    (
        3, 1,
        'Nouă potrivire AI găsită! 🤖',
        'David Enache din Valea Lupului are interese comune cu Matei (robotică, fotbal).',
        'ai_match', false
    ),
    (
        4, 6,
        'Transport confirmat din Fondul Social 🌟',
        'Cursa pentru Andrei din Satul Horlești este programată la 07:15 cu șoferul Ionel Ciobanu.',
        'social_fund', true
    )
ON CONFLICT (notification_id) DO NOTHING;

SELECT setval('notifications_notification_id_seq', (SELECT MAX(notification_id) FROM notifications));
