-- ==============================================================================
-- SchoolHop - Bază de Date Carpooling Școlar Sigur (Iași)
--   1. Public țintă: exclusiv transportul copiilor la școală (fără adulți pasageri).
--   2. Autentificare cu cont școlar, verificat în registrul școlii (catalog).
--   3. Profil copii cu școală, clasă și interese (fotbal, pian, robotică etc.).
--   4. Componentă AI: potrivire copii după interese comune.
--   5. Fond social & donații: curse gratuite pentru copiii din sate greu accesibile.
--   6. Puncte sigure de predare la școală (evită aglomerația la poartă - ex: Negruzzi).
--   7. Urmărire live a cursei, alerte de deviere și SOS.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. TABELUL SCHOOLS
CREATE TABLE IF NOT EXISTS schools (
    school_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    short_name VARCHAR(60) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) DEFAULT 'Iași',
    lat DECIMAL(9, 6) NOT NULL,
    lon DECIMAL(9, 6) NOT NULL,
    dropoff_point_label VARCHAR(255) NOT NULL, -- Punct de predare stabilit (evită aglomerația)
    phone VARCHAR(20),                         -- Secretariat (apel SOS)
    account_prefix VARCHAR(40) NOT NULL,       -- Prefixul conturilor din catalog (ex: EDU-IS-NEGRUZZI)
    bell_time TIME NOT NULL DEFAULT '08:00',   -- Ora de începere a orelor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELUL AREAS (Cartiere / sate din zona metropolitană)
CREATE TABLE IF NOT EXISTS areas (
    area_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    lat DECIMAL(9, 6) NOT NULL,
    lon DECIMAL(9, 6) NOT NULL,
    is_rural BOOLEAN DEFAULT FALSE
);

-- 3. TABELUL INTERESTS (catalogul de pasiuni folosit de componenta AI)
CREATE TABLE IF NOT EXISTS interests (
    slug VARCHAR(40) PRIMARY KEY,
    label VARCHAR(60) NOT NULL
);

-- 4. TABELUL USERS (Părinți, șoferi verificați, administratori școală)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    school_id INT REFERENCES schools(school_id) ON DELETE SET NULL,
    school_account_id VARCHAR(100) UNIQUE,     -- ID cont catalog electronic (Edu/Școală)
    role VARCHAR(30) DEFAULT 'parent'
        CHECK (role IN ('parent', 'parent_driver', 'community_driver', 'admin')),
    is_school_verified BOOLEAN DEFAULT FALSE,  -- Verificat prin registrul școlii
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    green_points INT NOT NULL DEFAULT 0,       -- Puncte "Erou Verde"
    profile_photo VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELUL SCHOOL_REGISTRY (simulare catalog electronic al școlii)
-- La înregistrare, contul școlar al părintelui trebuie să existe aici.
CREATE TABLE IF NOT EXISTS school_registry (
    registry_id SERIAL PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    account_id VARCHAR(100) UNIQUE NOT NULL,
    parent_full_name VARCHAR(100) NOT NULL,
    child_full_name VARCHAR(100) NOT NULL,
    child_birth_date DATE NOT NULL,
    grade VARCHAR(30) NOT NULL,
    teacher VARCHAR(100),
    claimed_by INT REFERENCES users(user_id) ON DELETE SET NULL
);

-- 6. TABELUL CHILDREN (Copiii - singurii pasageri!)
CREATE TABLE IF NOT EXISTS children (
    child_id SERIAL PRIMARY KEY,
    parent_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    school_id INT NOT NULL REFERENCES schools(school_id) ON DELETE RESTRICT,
    full_name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    grade VARCHAR(30) NOT NULL,                -- ex: 'Clasa a V-a B'
    teacher VARCHAR(100),
    bio TEXT,
    interests JSONB DEFAULT '[]'::jsonb,       -- slug-uri din tabelul interests
    needs_booster BOOLEAN DEFAULT FALSE,       -- Necesită înălțător
    home_village_or_area VARCHAR(100),
    home_address VARCHAR(255),
    home_lat DECIMAL(9, 6),
    home_lon DECIMAL(9, 6),
    is_social_beneficiary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELUL VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    color VARCHAR(30) NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    child_seats INT NOT NULL DEFAULT 3 CHECK (child_seats BETWEEN 1 AND 7),
    booster_seats INT DEFAULT 0 CHECK (booster_seats >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABELUL RIDES (Curse școlare)
CREATE TABLE IF NOT EXISTS rides (
    ride_id SERIAL PRIMARY KEY,
    driver_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vehicle_id INT NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE RESTRICT,
    school_id INT NOT NULL REFERENCES schools(school_id) ON DELETE RESTRICT,
    direction VARCHAR(20) NOT NULL DEFAULT 'to_school'
        CHECK (direction IN ('to_school', 'from_school')),
    departure_village_or_area VARCHAR(100) NOT NULL,
    departure_address VARCHAR(255) NOT NULL,
    departure_lat DECIMAL(9, 6) NOT NULL,
    departure_lon DECIMAL(9, 6) NOT NULL,
    destination_dropoff_point VARCHAR(255) NOT NULL,
    destination_lat DECIMAL(9, 6) NOT NULL,
    destination_lon DECIMAL(9, 6) NOT NULL,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_seats INT NOT NULL CHECK (total_seats > 0),
    available_seats INT NOT NULL CHECK (available_seats >= 0),
    price_per_seat DECIMAL(10, 2) DEFAULT 0.00,
    is_social_fund BOOLEAN DEFAULT FALSE,
    social_driver_stipend DECIMAL(10, 2) DEFAULT 0.00,
    notes TEXT,
    ai_topic TEXT,                             -- Întrebarea zilei generată pentru copii
    ride_status VARCHAR(20) DEFAULT 'scheduled'
        CHECK (ride_status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABELUL BOOKINGS (Rezervările copiilor pe cursă)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id SERIAL PRIMARY KEY,
    ride_id INT NOT NULL REFERENCES rides(ride_id) ON DELETE CASCADE,
    child_id INT NOT NULL REFERENCES children(child_id) ON DELETE CASCADE,
    parent_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    seat_position VARCHAR(20) NOT NULL,        -- front_right, back_left, back_middle, back_right, third_left...
    uses_booster BOOLEAN DEFAULT FALSE,
    pickup_address VARCHAR(255) NOT NULL,
    pickup_lat DECIMAL(9, 6) NOT NULL,
    pickup_lon DECIMAL(9, 6) NOT NULL,
    price DECIMAL(10, 2) DEFAULT 0.00,
    pickup_time TIMESTAMP WITH TIME ZONE,
    dropoff_time TIMESTAMP WITH TIME ZONE,
    parent_confirmed_at TIMESTAMP WITH TIME ZONE,
    booking_status VARCHAR(30) DEFAULT 'confirmed'
        CHECK (booking_status IN ('confirmed', 'picked_up', 'arrived_at_school', 'cancelled')),
    is_funded_by_social_fund BOOLEAN DEFAULT FALSE,
    share_token UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Un copil o singură dată pe cursă, un singur copil pe loc (rezervări active)
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_child_active
    ON bookings(ride_id, child_id) WHERE booking_status <> 'cancelled';
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_seat_active
    ON bookings(ride_id, seat_position) WHERE booking_status <> 'cancelled';
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_share_token ON bookings(share_token);

-- 10. TABELUL RIDE_LOCATIONS (poziții GPS transmise de șofer)
CREATE TABLE IF NOT EXISTS ride_locations (
    location_id SERIAL PRIMARY KEY,
    ride_id INT NOT NULL REFERENCES rides(ride_id) ON DELETE CASCADE,
    lat DECIMAL(9, 6) NOT NULL,
    lon DECIMAL(9, 6) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABELUL RIDE_ALERTS (deviere de la traseu, SOS)
CREATE TABLE IF NOT EXISTS ride_alerts (
    alert_id SERIAL PRIMARY KEY,
    ride_id INT NOT NULL REFERENCES rides(ride_id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('deviation', 'sos')),
    message TEXT NOT NULL,
    lat DECIMAL(9, 6),
    lon DECIMAL(9, 6),
    distance_m INT,
    raised_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    resolved_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. TABELUL AI_INTEREST_MATCHES (Componenta de Inteligență Artificială)
CREATE TABLE IF NOT EXISTS ai_interest_matches (
    match_id SERIAL PRIMARY KEY,
    child_id_1 INT NOT NULL REFERENCES children(child_id) ON DELETE CASCADE,
    child_id_2 INT NOT NULL REFERENCES children(child_id) ON DELETE CASCADE,
    common_interests JSONB NOT NULL,
    compatibility_score DECIMAL(4, 2) NOT NULL,
    ai_recommendation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_different_children CHECK (child_id_1 <> child_id_2),
    CONSTRAINT check_ordered_children CHECK (child_id_1 < child_id_2),
    CONSTRAINT uq_ai_match_pair UNIQUE (child_id_1, child_id_2)
);

-- 13. TABELUL SOCIAL_FUND_TRANSACTIONS
CREATE TABLE IF NOT EXISTS social_fund_transactions (
    transaction_id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(30) NOT NULL
        CHECK (transaction_type IN ('donation', 'corporate_match', 'driver_payout')),
    donor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    ride_id INT REFERENCES rides(ride_id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    target_village VARCHAR(100),
    children_helped_count INT DEFAULT 0,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. TABELUL REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
    review_id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    parent_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    driver_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    safety_rating INT CHECK (safety_rating >= 1 AND safety_rating <= 5),
    punctuality_rating INT CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_review_booking UNIQUE (booking_id, parent_id)
);

-- 15. TABELUL NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,    -- 'child_picked_up', 'arrived_at_school', 'ai_match', 'social_fund', 'booking', 'deviation', 'sos', 'ride'
    link VARCHAR(255),                          -- pagina din aplicație asociată
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- INDECȘI PENTRU CĂUTARE ȘI PERFORMANȚĂ
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_school ON children(school_id);
CREATE INDEX IF NOT EXISTS idx_rides_school ON rides(school_id, departure_time);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id, departure_time);
CREATE INDEX IF NOT EXISTS idx_rides_area ON rides(departure_village_or_area);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(ride_status);
CREATE INDEX IF NOT EXISTS idx_bookings_ride ON bookings(ride_id);
CREATE INDEX IF NOT EXISTS idx_bookings_child ON bookings(child_id);
CREATE INDEX IF NOT EXISTS idx_bookings_parent ON bookings(parent_id);
CREATE INDEX IF NOT EXISTS idx_ride_locations_ride ON ride_locations(ride_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ride_alerts_ride ON ride_alerts(ride_id, resolved_at);
CREATE INDEX IF NOT EXISTS idx_ai_matches_children ON ai_interest_matches(child_id_1, child_id_2);
CREATE INDEX IF NOT EXISTS idx_social_fund_type ON social_fund_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
