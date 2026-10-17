-- ==============================================================================
-- TakeMe Kids - Bază de Date Carpooling Școlar Sigur (Iași)
-- Conform cerințelor și feedback-ului mentorilor:
--   1. Public țintă: exclusiv transportul copiilor la școală (fără adulți pasageri).
--   2. Autentificare cu cont școlar / catalog electronic (Edu / Școală).
--   3. Profil copii cu școală, clasă și interese (fotbal, pian, robotică etc.).
--   4. Componentă AI: potrivire copii după interese comune.
--   5. Fond social & donații: curse gratuite pentru copiii din sate greu accesibile.
--   6. Puncte sigure de predare la școală (evită aglomerația la poartă - ex: Negruzzi).
-- ==============================================================================

-- 1. TABELUL SCHOOLS
-- Școlile partenere și punctele sigure de debarcare (ex. Colegiul Negruzzi Iași)
CREATE TABLE IF NOT EXISTS schools (
    school_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) DEFAULT 'Iași',
    lat DECIMAL(9, 6) NOT NULL,
    lon DECIMAL(9, 6) NOT NULL,
    dropoff_point_label VARCHAR(255) NOT NULL, -- Punct de predare stabilit (evită aglomerația)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELUL USERS (Părinți și Șoferi verificați)
-- Autentificare prin contul școlar (catalog electronic)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    school_account_id VARCHAR(100),            -- ID cont catalog electronic (Edu/Școală)
    role VARCHAR(30) DEFAULT 'parent'          -- 'parent', 'parent_driver', 'community_driver', 'admin'
        CHECK (role IN ('parent', 'parent_driver', 'community_driver', 'admin')),
    is_school_verified BOOLEAN DEFAULT TRUE,   -- Verificat oficial prin școală
    profile_photo VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELUL CHILDREN (Copiii - singurii pasageri!)
CREATE TABLE IF NOT EXISTS children (
    child_id SERIAL PRIMARY KEY,
    parent_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    school_id INT NOT NULL REFERENCES schools(school_id) ON DELETE RESTRICT,
    full_name VARCHAR(100) NOT NULL,
    grade VARCHAR(30) NOT NULL,                -- ex: 'Clasa a V-a B'
    interests JSONB DEFAULT '[]'::jsonb,       -- interese completate de părinte (pian, fotbal, robotică)
    home_village_or_area VARCHAR(100),         -- ex: 'Valea Lupului', 'Sat Horlești', 'Miroslava'
    home_address VARCHAR(255),
    is_social_beneficiary BOOLEAN DEFAULT FALSE, -- Copil din sat sprijinit prin Fondul Social
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELUL VEHICLES
-- Mașinile părinților-șoferi sau ale șoferilor comunitari verificați
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    color VARCHAR(30) NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    child_seats INT NOT NULL DEFAULT 3,        -- Număr locuri dedicate pentru copii
    booster_seats INT DEFAULT 0,               -- Înălțătoare disponibile
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELUL RIDES (Curse școlare)
-- Traseul existent al unui șofer spre școală
CREATE TABLE IF NOT EXISTS rides (
    ride_id SERIAL PRIMARY KEY,
    driver_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vehicle_id INT NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE RESTRICT,
    school_id INT NOT NULL REFERENCES schools(school_id) ON DELETE RESTRICT,
    departure_village_or_area VARCHAR(100) NOT NULL, -- ex: 'Valea Lupului', 'Miroslava', 'Horlești'
    departure_address VARCHAR(255) NOT NULL,
    departure_lat DECIMAL(9, 6) NOT NULL,
    departure_lon DECIMAL(9, 6) NOT NULL,
    destination_dropoff_point VARCHAR(255) NOT NULL,
    destination_lat DECIMAL(9, 6) NOT NULL,
    destination_lon DECIMAL(9, 6) NOT NULL,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    available_seats INT NOT NULL,              -- Locuri libere rămase pentru copii
    price_per_seat DECIMAL(10, 2) DEFAULT 0.00, -- Cost combustibil împărțit (0 dacă e din fond social)
    is_social_fund BOOLEAN DEFAULT FALSE,      -- Cursă finanțată din Fondul Social pentru sate
    social_driver_stipend DECIMAL(10, 2) DEFAULT 0.00, -- Sumă fixă primită de șofer din fond
    notes TEXT,
    ride_status VARCHAR(20) DEFAULT 'scheduled'
        CHECK (ride_status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABELUL BOOKINGS (Rezervările copiilor pe cursă)
-- DOAR copiii sunt pasageri, fără cuplare adult-adult!
CREATE TABLE IF NOT EXISTS bookings (
    booking_id SERIAL PRIMARY KEY,
    ride_id INT NOT NULL REFERENCES rides(ride_id) ON DELETE CASCADE,
    child_id INT NOT NULL REFERENCES children(child_id) ON DELETE CASCADE,
    parent_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    pickup_address VARCHAR(255) NOT NULL,
    pickup_lat DECIMAL(9, 6) NOT NULL,
    pickup_lon DECIMAL(9, 6) NOT NULL,
    pickup_time TIMESTAMP WITH TIME ZONE,
    dropoff_time TIMESTAMP WITH TIME ZONE,
    booking_status VARCHAR(30) DEFAULT 'confirmed'
        CHECK (booking_status IN ('confirmed', 'picked_up', 'arrived_at_school', 'cancelled')),
    is_funded_by_social_fund BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELUL AI_INTEREST_MATCHES (Componenta de Inteligență Artificială)
-- Potrivirea copiilor după interese comune pentru socializare și prietenie pe drum
CREATE TABLE IF NOT EXISTS ai_interest_matches (
    match_id SERIAL PRIMARY KEY,
    child_id_1 INT NOT NULL REFERENCES children(child_id) ON DELETE CASCADE,
    child_id_2 INT NOT NULL REFERENCES children(child_id) ON DELETE CASCADE,
    common_interests JSONB NOT NULL,           -- ex: ["fotbal", "robotica"]
    compatibility_score DECIMAL(4, 2) NOT NULL,-- scor potrivire (ex: 0.95)
    ai_recommendation TEXT NOT NULL,           -- sugestie AI afișată părinților
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_different_children CHECK (child_id_1 <> child_id_2)
);

-- 8. TABELUL SOCIAL_FUND_TRANSACTIONS (Transparența Fondului Social și a Donațiilor)
-- Finanțarea curselor pentru copiii din satele greu accesibile fără transport
CREATE TABLE IF NOT EXISTS social_fund_transactions (
    transaction_id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(30) NOT NULL      -- 'donation', 'corporate_match', 'driver_payout'
        CHECK (transaction_type IN ('donation', 'corporate_match', 'driver_payout')),
    donor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    ride_id INT REFERENCES rides(ride_id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    target_village VARCHAR(100),               -- Satul beneficiar (ex: 'Horlești', 'Schitu Duca')
    children_helped_count INT DEFAULT 0,       -- Numărul de copii sprijiniți cu această cursă
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABELUL REVIEWS
-- Evaluarea șoferului de către părinte (siguranță și punctualitate la școală)
CREATE TABLE IF NOT EXISTS reviews (
    review_id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    parent_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    driver_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    safety_rating INT CHECK (safety_rating >= 1 AND safety_rating <= 5),
    punctuality_rating INT CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABELUL NOTIFICATIONS
-- Notificări live pentru liniștea părinților (copil preluat, ajuns la școală)
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,    -- 'child_picked_up', 'arrived_at_school', 'ai_match', 'social_fund'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- INDECȘI PENTRU CĂUTARE ȘI PERFORMANȚĂ
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_school ON children(school_id);
CREATE INDEX IF NOT EXISTS idx_rides_school ON rides(school_id, departure_time);
CREATE INDEX IF NOT EXISTS idx_rides_area ON rides(departure_village_or_area);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(ride_status);
CREATE INDEX IF NOT EXISTS idx_bookings_ride ON bookings(ride_id);
CREATE INDEX IF NOT EXISTS idx_bookings_child ON bookings(child_id);
CREATE INDEX IF NOT EXISTS idx_ai_matches_children ON ai_interest_matches(child_id_1, child_id_2);
CREATE INDEX IF NOT EXISTS idx_social_fund_type ON social_fund_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
