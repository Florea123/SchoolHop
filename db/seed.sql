-- ==============================================================================
-- SchoolHop - Seed realist pentru Carpooling Școlar (Iași)
-- Parola pentru toate conturile demo: TakeMe2026!
-- Datele (cursele) sunt generate relativ la ziua curentă, ca demo-ul să fie mereu actual.
-- ==============================================================================

SET TIME ZONE 'Europe/Bucharest';

TRUNCATE TABLE
    notifications, reviews, social_fund_transactions, ai_interest_matches,
    ride_alerts, ride_locations, bookings, rides, vehicles, children,
    users, interests, areas, schools
RESTART IDENTITY CASCADE;

-- 1. ȘCOLI PARTENERE
INSERT INTO schools (name, short_name, address, city, lat, lon, dropoff_point_label, phone, bell_time) VALUES
    ('Colegiul Național „Costache Negruzzi”', 'Colegiul Negruzzi', 'Strada Toma Cozma 4, Iași', 'Iași',
     47.172500, 27.568200, 'Punct Sigur Debarcare Elevi (Parcarea Laterală Toma Cozma)', '+40232215000', '08:00'),
    ('Colegiul Național „Emil Racoviță”', 'Colegiul Racoviță', 'Aleea Nicolina 4, Iași', 'Iași',
     47.152800, 27.581000, 'Punct Sigur Debarcare (Rond Podu Roș / Parcare Liceu)', '+40232230000', '08:00'),
    ('Colegiul Național Iași', 'Colegiul Național', 'Strada Arcu 4, Iași', 'Iași',
     47.166200, 27.576800, 'Punct Sigur Debarcare (Bulevardul Independenței / Arcu)', '+40232214000', '08:00');

-- Celelalte școli și licee din municipiul Iași (nume, adresă și coordonate din OpenStreetMap)
INSERT INTO schools (name, short_name, address, city, lat, lon, dropoff_point_label, phone, bell_time) VALUES
    ('Colegiul Național „Mihai Eminescu”', 'CN Mihai Eminescu', 'Strada Mihail Kogălniceanu 10, Iași', 'Iași',
     47.172750, 27.581727, 'Intrarea principală', NULL, '08:00'),
    ('Colegiul Național „Garabet Ibrăileanu”', 'CN Garabet Ibrăileanu', 'Strada Oastei 1, Iași', 'Iași',
     47.180193, 27.569848, 'Intrarea principală', NULL, '08:00'),
    ('Colegiul Național de Artă „Octav Băncilă”', 'CN de Artă Octav Băncilă', 'Strada Ion Constantin Brătianu, Iași', 'Iași',
     47.165320, 27.585863, 'Intrarea principală', NULL, '08:00'),
    ('Colegiul Pedagogic „Vasile Lupu”', 'Colegiul Pedagogic', 'Pista Copou, Iași', 'Iași',
     47.201017, 27.540382, 'Intrarea principală', NULL, '08:00'),
    ('Colegiul „Richard Wurmbrand”', 'Colegiul Richard Wurmbrand', 'Strada Barbu Lăutaru, Iași', 'Iași',
     47.157888, 27.599799, 'Intrarea principală', NULL, '08:00'),
    ('Colegiul Tehnic „Ioan C. Ștefănescu”', 'CT Ioan C. Ștefănescu', 'Bulevardul Socola 51-53, Iași', 'Iași',
     47.143763, 27.598237, 'Intrarea principală', NULL, '08:00'),
    ('Colegiul Tehnic „Gheorghe Asachi”', 'CT Gheorghe Asachi', 'Strada Sărărie 189, Iași', 'Iași',
     47.182123, 27.570062, 'Intrarea principală', NULL, '08:00'),
    ('Colegiul Tehnic „Mihail Sturdza”', 'CT Mihail Sturdza', 'Fundacul Boiangiu 2, Iași', 'Iași',
     47.141523, 27.601461, 'Intrarea principală', NULL, '08:00'),
    ('Colegiul Tehnic „Ion Holban”', 'CT Ion Holban', 'Strada Pantelimon Halipa 16, Iași', 'Iași',
     47.148141, 27.575612, 'Intrarea principală', NULL, '08:00'),
    ('Liceul Economic „Virgil Madgearu”', 'Liceul Virgil Madgearu', 'Strada Plăieșilor, Iași', 'Iași',
     47.163532, 27.559025, 'Intrarea principală', NULL, '08:00'),
    ('Liceul Tehnologic de Mecatronică și Automatizări', 'Liceul de Mecatronică', 'Strada Mitropolit Varlaam 54, Iași', 'Iași',
     47.144001, 27.593119, 'Intrarea principală', NULL, '08:00'),
    ('Liceul Tehnologic „Dimitrie Leonida”', 'Liceul Dimitrie Leonida', 'Bulevardul Socola 188-190, Iași', 'Iași',
     47.142211, 27.597180, 'Intrarea principală', NULL, '08:00'),
    ('Liceul Tehnologic UCECOM „Spiru Haret”', 'Liceul UCECOM Spiru Haret', 'Bulevardul C.A. Rosetti 14-16, Iași', 'Iași',
     47.168726, 27.593699, 'Intrarea principală', NULL, '08:00'),
    ('Liceul Teoretic „Dimitrie Cantemir”', 'Liceul Dimitrie Cantemir', 'Strada Decebal 13, Iași', 'Iași',
     47.150299, 27.581592, 'Intrarea principală', NULL, '08:00'),
    ('Liceul Teoretic Internațional „Spectrum”', 'Liceul Spectrum', 'Bulevardul C.A. Rosetti 12-14, Iași', 'Iași',
     47.169267, 27.593843, 'Intrarea principală', NULL, '08:00'),
    ('Liceul Teoretic Waldorf Iași', 'Liceul Waldorf', 'Calea Chișinăului 132 bis, Iași', 'Iași',
     47.144849, 27.622453, 'Intrarea principală', NULL, '08:00'),
    ('Liceul Teoretic de Informatică „Grigore C. Moisil”', 'Liceul Grigore Moisil', 'Strada Petre Andrei 9, Iași', 'Iași',
     47.185426, 27.567026, 'Intrarea principală', NULL, '08:00'),
    ('Liceul Teoretic „Vasile Alecsandri”', 'Liceul Vasile Alecsandri', 'Strada Costache Negri, Iași', 'Iași',
     47.161244, 27.588008, 'Intrarea principală', NULL, '08:00'),
    ('Liceul cu Program Sportiv Iași', 'Liceul cu Program Sportiv', 'Strada Petre Andrei, Iași', 'Iași',
     47.186510, 27.564109, 'Intrarea principală', NULL, '08:00'),
    ('Școala Gimnazială „Alexandru Vlahuță”', 'Școala Alexandru Vlahuță', 'Strada Buridava, Iași', 'Iași',
     47.168834, 27.551357, 'Intrarea principală', NULL, '08:00'),
    ('Școala Gimnazială „Carmen Sylva”', 'Școala Carmen Sylva', 'Strada Grigore Ghica Vodă, Iași', 'Iași',
     47.160475, 27.593938, 'Intrarea principală', NULL, '08:00'),
    ('Școala Gimnazială „Petru Poni”', 'Școala Petru Poni', 'Strada Păcurari 112, Iași', 'Iași',
     47.173525, 27.561327, 'Intrarea principală', NULL, '08:00'),
    ('Școala Gimnazială „Ion Neculce”', 'Școala Ion Neculce', 'Strada Dacia, Iași', 'Iași',
     47.152963, 27.577081, 'Intrarea principală', NULL, '08:00'),
    ('Școala Gimnazială „Dimitrie A. Sturdza”', 'Școala Dimitrie A. Sturdza', 'Strada Radu Vodă, Iași', 'Iași',
     47.137925, 27.587220, 'Intrarea principală', NULL, '08:00'),
    ('Școala Gimnazială „Vasile Conta”', 'Școala Vasile Conta', 'Strada Gheorghe Doja 2, Iași', 'Iași',
     47.145409, 27.577896, 'Intrarea principală', NULL, '08:00'),
    ('Școala Gimnazială „Otilia Cazimir”', 'Școala Otilia Cazimir', 'Bulevardul Țuțora, Iași', 'Iași',
     47.149490, 27.591007, 'Intrarea principală', NULL, '08:00'),
    ('Școala Gimnazială Proselnici', 'Școala Proselnici', 'Str. Theodor Palade, Iași', 'Iași',
     47.110091, 27.485641, 'Intrarea principală', NULL, '08:00'),
    ('Școala Gimnazială „Ion Creangă”', 'Școala Ion Creangă', 'Strada Neculau, Iași', 'Iași',
     47.174963, 27.552721, 'Intrarea principală', NULL, '08:00'),
    ('Școala Primară Vișan', 'Școala Primară Vișan', 'Strada Castanul Unirii, Iași', 'Iași',
     47.116426, 27.597734, 'Intrarea principală', NULL, '08:00');

-- 2. ZONE (cartiere și sate)
INSERT INTO areas (name, lat, lon, is_rural) VALUES
    ('Valea Lupului', 47.181200, 27.502300, false),
    ('Miroslava', 47.147200, 27.525500, false),
    ('Bucium', 47.130000, 27.620000, false),
    ('Copou', 47.180000, 27.565000, false),
    ('Tătărași', 47.168000, 27.605000, false),
    ('Nicolina', 47.145000, 27.585000, false),
    ('Păcurari', 47.175000, 27.540000, false),
    ('Sat Horlești (Rediu)', 47.218500, 27.481200, true),
    ('Lunca Cetățuii', 47.115000, 27.570000, true);

-- 3. CATALOG INTERESE
INSERT INTO interests (slug, label) VALUES
    ('robotica', 'Robotică'),
    ('fotbal', 'Fotbal'),
    ('sah', 'Șah'),
    ('lego', 'Lego'),
    ('pian', 'Pian'),
    ('desen', 'Desen & Pictură'),
    ('inot', 'Înot'),
    ('dans', 'Dans'),
    ('matematica', 'Matematică'),
    ('lectura', 'Lectură'),
    ('stiinta', 'Știință & Experimente'),
    ('muzica', 'Muzică'),
    ('astronomie', 'Spațiu & Astronomie'),
    ('dinozauri', 'Dinozauri'),
    ('baschet', 'Baschet');

-- 4. UTILIZATORI (parola demo: TakeMe2026!)
INSERT INTO users (full_name, email, password_hash, phone, school_id, role, is_school_verified, emergency_contact_name, emergency_contact_phone) VALUES
    ('Andreea Rusu', 'andreea.rusu@parinte.edu.ro', crypt('TakeMe2026!', gen_salt('bf', 10)), '+40740123456', 1, 'parent_driver', true, 'Ion Rusu (Bunic)', '+40740111222'),
    ('Gabriel Enache', 'gabriel.enache@parinte.edu.ro', crypt('TakeMe2026!', gen_salt('bf', 10)), '+40740987654', 1, 'parent', true, 'Irina Enache (Mamă)', '+40740333444'),
    ('Dan Radu', 'dan.radu@parinte.edu.ro', crypt('TakeMe2026!', gen_salt('bf', 10)), '+40742111222', 2, 'parent_driver', true, 'Ana Radu (Mamă)', '+40742555666'),
    ('Elena Vasiliu', 'elena.vasiliu@parinte.edu.ro', crypt('TakeMe2026!', gen_salt('bf', 10)), '+40743333444', 1, 'parent_driver', true, 'Mihai Vasiliu (Tată)', '+40743777888'),
    ('Ionel Ciobanu', 'ionel.ciobanu@comunitate.schoolhop.ro', crypt('TakeMe2026!', gen_salt('bf', 10)), '+40749888999', 1, 'community_driver', true, 'Primăria Rediu', '+40232299000'),
    ('Maria Moraru', 'maria.moraru@parinte.edu.ro', crypt('TakeMe2026!', gen_salt('bf', 10)), '+40755123789', 1, 'parent', true, 'Vasile Moraru (Tată)', '+40755999000'),
    ('Cristina Pavel', 'cristina.pavel@parinte.edu.ro', crypt('TakeMe2026!', gen_salt('bf', 10)), '+40744222333', 1, 'parent_driver', true, 'Sorin Pavel (Tată)', '+40744666777'),
    ('Secretariat Negruzzi', 'secretariat@negruzzi.schoolhop.ro', crypt('TakeMe2026!', gen_salt('bf', 10)), '+40232215000', 1, 'admin', true, NULL, NULL),
    ('Mihai Stan', 'mihai.stan@parinte.edu.ro', crypt('TakeMe2026!', gen_salt('bf', 10)), '+40746444555', 1, 'parent_driver', true, 'Laura Stan (Mamă)', '+40746888999');


-- 6. COPII
INSERT INTO children (parent_id, school_id, full_name, birth_date, grade, teacher, bio, interests, needs_booster, home_village_or_area, home_address, home_lat, home_lon, is_social_beneficiary) VALUES
    (1, 1, 'Matei Rusu', '2014-03-02', 'Clasa a VI-a B', 'Prof. Carmen Ursu', 'Construiește roboței și joacă fotbal în pauze.', '["robotica", "fotbal", "sah"]', false, 'Valea Lupului', 'Str. Cireșilor 12, Valea Lupului', 47.182600, 27.500900, false),
    (2, 1, 'David Enache', '2014-07-19', 'Clasa a VI-a A', 'Prof. Doina Lazăr', 'Pasionat de Lego Technic și roboți.', '["robotica", "fotbal", "lego"]', false, 'Valea Lupului', 'Str. Soarelui 8, Valea Lupului', 47.180500, 27.509000, false),
    (3, 2, 'Mara Radu', '2016-09-10', 'Clasa a IV-a C', 'Înv. Lucia Popovici', 'Cântă la pian și desenează.', '["pian", "desen", "inot"]', true, 'Miroslava', 'Str. Rozelor 21, Miroslava', 47.146100, 27.523800, false),
    (4, 1, 'Sofia Vasiliu', '2016-04-04', 'Clasa a IV-a B', 'Înv. Ana Dumitrescu', 'Iubește dansul și pianul.', '["pian", "dans"]', true, 'Bucium', 'Șos. Bucium 45, Iași', 47.131200, 27.618300, false),
    (6, 1, 'Andrei Moraru', '2013-02-11', 'Clasa a VII-a A', 'Prof. Victor Bejan', 'Olimpic la matematică, joacă fotbal.', '["matematica", "fotbal", "lectura"]', false, 'Sat Horlești (Rediu)', 'Nr. 74, Sat Horlești', 47.218000, 27.481900, true),
    (7, 1, 'Ioana Pavel', '2014-10-01', 'Clasa a VI-a B', 'Prof. Carmen Ursu', 'Citește mult și face roboți la cercul școlii.', '["robotica", "desen", "lectura"]', false, 'Valea Lupului', 'Str. Livezii 3, Valea Lupului', 47.181900, 27.505600, false),
    (9, 1, 'Tudor Stan', '2014-01-15', 'Clasa a VI-a B', 'Prof. Carmen Ursu', 'Căpitanul echipei de baschet a clasei.', '["fotbal", "baschet", "sah"]', false, 'Copou', 'Bd. Carol I 60, Iași', 47.178900, 27.563100, false),
    (2, 1, 'Ana Enache', '2017-06-20', 'Clasa a III-a A', 'Înv. Elena Cozma', 'Desenează dinozauri și merge la dans.', '["desen", "dans", "dinozauri"]', true, 'Valea Lupului', 'Str. Soarelui 8, Valea Lupului', 47.180500, 27.509000, false);

-- 7. AUTOVEHICULE
INSERT INTO vehicles (owner_id, brand, model, color, license_plate, child_seats, booster_seats) VALUES
    (1, 'Dacia', 'Jogger Eco-G', 'Gri Urban', 'IS 23 TKM', 4, 2),
    (3, 'Toyota', 'Corolla Hybrid', 'Alb Perlat', 'IS 10 TKM', 3, 1),
    (4, 'Renault', 'Megane', 'Albastru', 'IS 45 TKM', 3, 1),
    (5, 'Dacia', 'Duster', 'Maro Metalizat', 'IS 01 HRT', 4, 1),
    (7, 'Skoda', 'Octavia Combi', 'Negru', 'IS 77 PVL', 3, 2),
    (9, 'Volkswagen', 'Touran', 'Argintiu', 'IS 09 STN', 4, 1);

-- 8. CURSE (generate pentru următoarele 5 zile de școală și ultimele 10 zile de școală)
CREATE TEMP TABLE seed_days AS
SELECT d::date AS day, 'upcoming'::text AS kind
FROM generate_series(CURRENT_DATE + 1, CURRENT_DATE + 9, INTERVAL '1 day') d
WHERE EXTRACT(ISODOW FROM d) < 6
ORDER BY d LIMIT 5;

INSERT INTO seed_days
SELECT day, 'past' FROM (
    SELECT d::date AS day
    FROM generate_series(CURRENT_DATE - 20, CURRENT_DATE - 1, INTERVAL '1 day') d
    WHERE EXTRACT(ISODOW FROM d) < 6
    ORDER BY d DESC LIMIT 10
) p;

CREATE TEMP TABLE seed_ride_templates (
    driver_id INT, vehicle_id INT, school_id INT, direction TEXT,
    area TEXT, address TEXT, lat DECIMAL(9,6), lon DECIMAL(9,6),
    dest TEXT, dlat DECIMAL(9,6), dlon DECIMAL(9,6),
    dep TIME, seats INT, price DECIMAL(10,2), social BOOLEAN, stipend DECIMAL(10,2), notes TEXT
);

INSERT INTO seed_ride_templates VALUES
    (1, 1, 1, 'to_school', 'Valea Lupului', 'DN28 Valea Lupului (parcare Kaufland)', 47.181200, 27.502300,
     'Colegiul Negruzzi - Parcare Toma Cozma', 47.172500, 27.568200, '07:30', 4, 4.00, false, 0,
     'Sosire la Negruzzi la 07:50, înainte de începerea orelor.'),
    (1, 1, 1, 'from_school', 'Colegiul Negruzzi', 'Colegiul Negruzzi - Parcare Toma Cozma', 47.172500, 27.568200,
     'DN28 Valea Lupului (parcare Kaufland)', 47.181200, 27.502300, '14:00', 4, 4.00, false, 0,
     'Preluare după ore, la parcarea laterală.'),
    (7, 5, 1, 'to_school', 'Valea Lupului', 'Str. Livezii (stația de autobuz)', 47.181900, 27.506200,
     'Colegiul Negruzzi - Parcare Toma Cozma', 47.172500, 27.568200, '07:20', 3, 4.00, false, 0,
     'Mașină cu 2 înălțătoare. Plecăm la fix.'),
    (4, 3, 1, 'to_school', 'Bucium', 'Șos. Bucium - stația Plopii fără Soț', 47.132000, 27.616000,
     'Colegiul Negruzzi - Parcare Toma Cozma', 47.172500, 27.568200, '07:25', 3, 5.00, false, 0,
     'Traseu prin Podu Roș.'),
    (9, 6, 1, 'to_school', 'Copou', 'Bd. Carol I - Parcul Copou', 47.180000, 27.565000,
     'Colegiul Negruzzi - Parcare Toma Cozma', 47.172500, 27.568200, '07:40', 4, 3.00, false, 0,
     'Drum scurt prin Copou.'),
    (5, 4, 1, 'to_school', 'Sat Horlești (Rediu)', 'Centru Sat Horlești (Biserică)', 47.218500, 27.481200,
     'Colegiul Negruzzi - Punct Sigur Toma Cozma', 47.172500, 27.568200, '07:05', 4, 0.00, true, 30.00,
     'Cursă finanțată 100% din Fondul Social pentru copiii de la sat fără microbuz școlar.'),
    (3, 2, 2, 'to_school', 'Miroslava', 'Primăria Miroslava', 47.147200, 27.525500,
     'Colegiul Racoviță - Parcare Liceu', 47.152800, 27.581000, '07:35', 3, 3.50, false, 0,
     'Locuri disponibile pentru copiii din Miroslava.');

INSERT INTO rides (
    driver_id, vehicle_id, school_id, direction,
    departure_village_or_area, departure_address, departure_lat, departure_lon,
    destination_dropoff_point, destination_lat, destination_lon,
    departure_time, total_seats, available_seats, price_per_seat, is_social_fund, social_driver_stipend,
    notes, ride_status, started_at, completed_at
)
SELECT t.driver_id, t.vehicle_id, t.school_id, t.direction,
       t.area, t.address, t.lat, t.lon, t.dest, t.dlat, t.dlon,
       (d.day + t.dep)::timestamptz, t.seats, t.seats, t.price, t.social, t.stipend, t.notes,
       CASE WHEN d.kind = 'past' THEN 'completed' ELSE 'scheduled' END,
       CASE WHEN d.kind = 'past' THEN (d.day + t.dep)::timestamptz END,
       CASE WHEN d.kind = 'past' THEN (d.day + t.dep)::timestamptz + INTERVAL '22 minutes' END
FROM seed_ride_templates t
CROSS JOIN seed_days d
-- Cursele de întoarcere și cele ale lui Mihai/Cristina există doar în săptămâna curentă
WHERE d.kind = 'upcoming' OR (t.direction = 'to_school' AND t.driver_id IN (1, 4, 5, 3));

-- 9. REZERVĂRI
-- Locuri: copilul șoferului ocupă și el un loc în mașină.
CREATE TEMP TABLE seed_booking_plan (driver_id INT, direction TEXT, child_id INT, seat TEXT, kind TEXT, max_days INT);
INSERT INTO seed_booking_plan VALUES
    (1, 'to_school', 1, 'back_left', 'all', 99),       -- Matei cu mama lui (Andreea)
    (1, 'to_school', 2, 'back_right', 'all', 3),       -- David cu Andreea (primele 3 zile viitoare + istoric)
    (1, 'from_school', 1, 'back_left', 'upcoming', 99),
    (7, 'to_school', 6, 'back_left', 'all', 99),       -- Ioana cu mama ei (Cristina)
    (4, 'to_school', 4, 'back_left', 'all', 99),       -- Sofia cu mama ei (Elena)
    (9, 'to_school', 7, 'front_right', 'all', 99),     -- Tudor cu tatăl lui (Mihai)
    (5, 'to_school', 5, 'front_right', 'all', 99),     -- Andrei (Fond Social) cu Ionel
    (3, 'to_school', 3, 'back_left', 'all', 99);       -- Mara cu tatăl ei (Dan)

INSERT INTO bookings (
    ride_id, child_id, parent_id, seat_position, uses_booster,
    pickup_address, pickup_lat, pickup_lon, price,
    pickup_time, dropoff_time, parent_confirmed_at, booking_status, is_funded_by_social_fund
)
SELECT r.ride_id, c.child_id, c.parent_id, p.seat, c.needs_booster,
       r.departure_address, r.departure_lat, r.departure_lon,
       CASE WHEN c.parent_id = r.driver_id OR r.is_social_fund THEN 0 ELSE r.price_per_seat END,
       CASE WHEN r.ride_status = 'completed' THEN r.departure_time END,
       CASE WHEN r.ride_status = 'completed' THEN r.completed_at END,
       CASE WHEN r.ride_status = 'completed' AND c.parent_id <> r.driver_id THEN r.completed_at + INTERVAL '3 minutes' END,
       CASE WHEN r.ride_status = 'completed' THEN 'arrived_at_school' ELSE 'confirmed' END,
       r.is_social_fund AND c.is_social_beneficiary
FROM seed_booking_plan p
JOIN children c ON c.child_id = p.child_id
JOIN LATERAL (
    SELECT rr.*, ROW_NUMBER() OVER (ORDER BY rr.departure_time) AS rn
    FROM rides rr
    WHERE rr.driver_id = p.driver_id AND rr.direction = p.direction
      AND rr.departure_time > now()
) r_up ON TRUE
JOIN rides r ON r.ride_id = r_up.ride_id
WHERE r_up.rn <= p.max_days AND p.kind IN ('all', 'upcoming')
UNION ALL
SELECT r.ride_id, c.child_id, c.parent_id, p.seat, c.needs_booster,
       r.departure_address, r.departure_lat, r.departure_lon,
       CASE WHEN c.parent_id = r.driver_id OR r.is_social_fund THEN 0 ELSE r.price_per_seat END,
       r.departure_time, r.completed_at,
       CASE WHEN c.parent_id <> r.driver_id THEN r.completed_at + INTERVAL '3 minutes' END,
       'arrived_at_school',
       r.is_social_fund AND c.is_social_beneficiary
FROM seed_booking_plan p
JOIN children c ON c.child_id = p.child_id
JOIN rides r ON r.driver_id = p.driver_id AND r.direction = p.direction AND r.ride_status = 'completed'
WHERE p.kind = 'all';

UPDATE rides r SET available_seats = r.total_seats - (
    SELECT COUNT(*) FROM bookings b WHERE b.ride_id = r.ride_id AND b.booking_status <> 'cancelled'
);

-- 10. POTRIVIRI AI (cache; scorurile se recalculează de backend la fiecare căutare)
INSERT INTO ai_interest_matches (child_id_1, child_id_2, common_interests, compatibility_score, ai_recommendation) VALUES
    (1, 2, '["robotica", "fotbal"]', 0.82,
     'Matei și David sunt colegi la Colegiul Negruzzi și ambii sunt pasionați de robotică și fotbal! Drumul împreună îi va ajuta să se împrietenească.'),
    (3, 4, '["pian"]', 0.41,
     'Mara și Sofia studiază pianul. Se recomandă carpooling comun pentru activitățile extrașcolare.');

-- 11. FONDUL SOCIAL
INSERT INTO social_fund_transactions (transaction_type, donor_id, ride_id, amount, target_village, children_helped_count, description, created_at) VALUES
    ('corporate_match', NULL, NULL, 5000.00, 'Satele din zona metropolitană Iași', 0,
     'Sponsorizare corporate partener (dublarea donațiilor comunității pentru transport școlar rural)', CURRENT_DATE - 30),
    ('donation', 1, NULL, 100.00, 'Sat Horlești (Rediu)', 0,
     'Donație voluntară oferită de Andreea Rusu', CURRENT_DATE - 12),
    ('corporate_match', NULL, NULL, 100.00, 'Sat Horlești (Rediu)', 0,
     'Dublare sponsor pentru donația Andreei Rusu', CURRENT_DATE - 12);

INSERT INTO social_fund_transactions (transaction_type, donor_id, ride_id, amount, target_village, children_helped_count, description, created_at)
SELECT 'driver_payout', NULL, r.ride_id, r.social_driver_stipend, r.departure_village_or_area,
       (SELECT COUNT(*) FROM bookings b WHERE b.ride_id = r.ride_id AND b.booking_status = 'arrived_at_school'),
       'Plată fixă pentru cursa școlară ' || r.departure_village_or_area || ' → Colegiul Negruzzi',
       r.completed_at
FROM rides r WHERE r.is_social_fund AND r.ride_status = 'completed';

-- 12. RECENZII (Gabriel o evaluează pe Andreea pentru cursele lui David)
INSERT INTO reviews (booking_id, parent_id, driver_id, rating, safety_rating, punctuality_rating, comment, created_at)
SELECT b.booking_id, b.parent_id, r.driver_id,
       CASE WHEN ROW_NUMBER() OVER (ORDER BY r.departure_time) % 4 = 0 THEN 4 ELSE 5 END, 5, 5,
       CASE WHEN ROW_NUMBER() OVER (ORDER BY r.departure_time) = 1
            THEN 'Andreea este extraordinară! David ajunge mereu cu 10 minute înainte de clopoțel.' END,
       b.parent_confirmed_at + INTERVAL '10 minutes'
FROM bookings b JOIN rides r ON r.ride_id = b.ride_id
WHERE b.child_id = 2 AND b.booking_status = 'arrived_at_school'
LIMIT 6;

INSERT INTO reviews (booking_id, parent_id, driver_id, rating, safety_rating, punctuality_rating, comment, created_at)
SELECT b.booking_id, b.parent_id, r.driver_id, 5, 5, 4,
       'Domnul Ionel e foarte atent cu copiii. Mulțumim pentru transport!', b.parent_confirmed_at + INTERVAL '1 hour'
FROM bookings b JOIN rides r ON r.ride_id = b.ride_id
WHERE b.child_id = 5 AND b.booking_status = 'arrived_at_school'
ORDER BY r.departure_time DESC LIMIT 3;

-- 13. PUNCTE ERou VERDE (calculate din istoric: 10 pct / copil predat sau confirmat)
UPDATE users u SET green_points =
    10 * (SELECT COUNT(*) FROM bookings b WHERE b.parent_id = u.user_id AND b.parent_confirmed_at IS NOT NULL)
  + 10 * (SELECT COUNT(*) FROM bookings b JOIN rides r ON r.ride_id = b.ride_id
          WHERE r.driver_id = u.user_id AND b.parent_id <> u.user_id AND b.booking_status = 'arrived_at_school');

-- 14. NOTIFICĂRI
INSERT INTO notifications (user_id, title, message, notification_type, link, is_read, created_at) VALUES
    (2, 'David a ajuns la Colegiul Negruzzi ', 'Copilul a fost lăsat în siguranță la Punctul Sigur de Debarcare Toma Cozma.', 'arrived_at_school', 'my-rides.html', true, CURRENT_DATE - 1 + TIME '07:52'),
    (1, 'Nouă potrivire AI găsită! ', 'David Enache din Valea Lupului are interese comune cu Matei (robotică, fotbal).', 'ai_match', 'my-rides.html', false, CURRENT_DATE - 2 + TIME '18:00'),
    (6, 'Transport confirmat din Fondul Social ', 'Cursele pentru Andrei din Satul Horlești sunt programate cu șoferul Ionel Ciobanu.', 'social_fund', 'my-rides.html', false, CURRENT_DATE - 1 + TIME '19:00');

DROP TABLE seed_days, seed_ride_templates, seed_booking_plan;
