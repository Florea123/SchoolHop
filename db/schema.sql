-- ==============================================================================
-- TakeMe - Baza de date PostgreSQL: Carpooling sigur pentru navetiști (Iași)
-- Script creare tabele, constrângeri și indecși
-- Compatibil direct cu Node.js (node-postgres / pg)
-- ==============================================================================

-- 1. TABELUL USERS
-- Utilizatori (șoferi și pasageri)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    gender VARCHAR(20) DEFAULT 'unspecified', -- 'female', 'male', 'unspecified'
    id_verified BOOLEAN DEFAULT FALSE,
    selfie_verified BOOLEAN DEFAULT FALSE,
    arrival_code_hash VARCHAR(255),          -- codul de sosire normal (hash bcrypt/sha256)
    duress_code_hash VARCHAR(255),           -- codul de alarmă silențios (hash)
    rating_avg NUMERIC(3, 2) DEFAULT 5.00,
    rating_count INT DEFAULT 0,
    points INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELUL EMERGENCY_CONTACTS
-- Contacte de urgență notificate automat la incidente sau cod de panică
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELUL VEHICLES
-- Autovehiculele înregistrate de șoferi
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plate VARCHAR(20) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    seats_total INT NOT NULL DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELUL ROUTES
-- Traseul recurent al șoferului (ex: Valea Lupului → Copou)
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    driver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id INT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,               -- ex: "Valea Lupului → Copou"
    start_lat DOUBLE PRECISION NOT NULL,
    start_lng DOUBLE PRECISION NOT NULL,
    start_label VARCHAR(255) NOT NULL,
    end_lat DOUBLE PRECISION NOT NULL,
    end_lng DOUBLE PRECISION NOT NULL,
    end_label VARCHAR(255) NOT NULL,
    polyline JSONB NOT NULL DEFAULT '[]'::jsonb, -- listă de [lat, lng] de la OSRM
    departure_time TIME NOT NULL,
    days_of_week VARCHAR(50) DEFAULT '1,2,3,4,5',
    price_per_seat NUMERIC(10, 2) NOT NULL,
    price_cap NUMERIC(10, 2) NOT NULL,        -- plafon legal de cost combustibil
    women_only BOOLEAN DEFAULT FALSE,
    verified_only BOOLEAN DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELUL TRIPS
-- O cursă concretă într-o anumită zi
CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    departure_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    seats_available INT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    share_token VARCHAR(100) UNIQUE,          -- token public pentru urmărire fără autentificare
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABELUL BOOKINGS
-- Rezervările pasagerilor pe cursă
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    passenger_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    pickup_label VARCHAR(255) NOT NULL,
    pickup_index INT NOT NULL DEFAULT 0,      -- poziția pe polilinie
    dropoff_lat DOUBLE PRECISION NOT NULL,
    dropoff_lng DOUBLE PRECISION NOT NULL,
    dropoff_label VARCHAR(255) NOT NULL,
    dropoff_index INT NOT NULL DEFAULT 0,     -- poziția de coborâre
    seat_pref VARCHAR(30) DEFAULT 'back_right'
        CHECK (seat_pref IN ('front', 'back_left', 'back_right')),
    price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'picked_up', 'arrived', 'alert', 'cancelled')),
    eta_arrival TIMESTAMP WITH TIME ZONE,
    arrival_confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELUL TRIP_POSITIONS
-- Poziția live a mașinii (transmisă la interval de secunde)
CREATE TABLE IF NOT EXISTS trip_positions (
    id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION DEFAULT 0.0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABELUL SAFETY_EVENTS
-- Evenimente de siguranță detectate de motorul de monitorizare
CREATE TABLE IF NOT EXISTS safety_events (
    id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    booking_id INT REFERENCES bookings(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL
        CHECK (type IN ('route_deviation', 'long_stop', 'arrival_timeout', 'duress_code', 'sos')),
    severity VARCHAR(30) NOT NULL
        CHECK (severity IN ('info', 'warning', 'critical')),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    details JSONB DEFAULT '{}'::jsonb,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABELUL REVIEWS
-- Recenzii și evaluări între utilizatori
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    author_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABELUL POINTS_LEDGER
-- Puncte acumulate și impact ecologic (CO2 evitat)
CREATE TABLE IF NOT EXISTS points_ledger (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delta INT NOT NULL,
    reason VARCHAR(255) NOT NULL,             -- ex: 'cursă împărțită', 'CO2 evitat'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- INDECȘI PENTRU PERFORMANȚĂ (stabiliți în secțiunea 3.2 din plan)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_trips_date_status ON trips(date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger_id ON bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_trip_positions_trip_recorded ON trip_positions(trip_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(active);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_safety_events_trip_id ON safety_events(trip_id);
