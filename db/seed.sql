-- ==============================================================================
-- TakeMe - Date de test (Seed) conform noii diagrame
-- ==============================================================================

-- 1. USERS
INSERT INTO users (user_id, full_name, email, password_hash, phone, profile_photo, account_status)
VALUES
    (1, 'Andreea Rusu', 'andreea.rusu@takeme.ro', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', '+40740123456', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'active'),
    (2, 'Mihai Costin', 'mihai.costin@takeme.ro', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', '+40740987654', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'active'),
    (3, 'Ioana Popa', 'ioana.popa@takeme.ro', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', '+40741223344', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'active'),
    (4, 'Dan Radu', 'dan.radu@takeme.ro', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', '+40742111222', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'active'),
    (5, 'Elena Vasiliu', 'elena.vasiliu@takeme.ro', '$2b$12$e86gqJ2aU6d1eR.7QYh8u.t9hXf4c6z8aK0lM3nO5pQ7rS9tU1vWy', '+40743333444', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'active')
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name;

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- 2. VEHICLES
INSERT INTO vehicles (vehicle_id, owner_id, brand, model, color, license_plate, seats)
VALUES
    (1, 1, 'Dacia', 'Jogger', 'Gri', 'IS 23 TKM', 6),
    (2, 4, 'Toyota', 'Corolla Hybrid', 'Alb', 'IS 10 TKM', 4),
    (3, 5, 'Renault', 'Megane', 'Albastru', 'IS 45 TKM', 4)
ON CONFLICT (vehicle_id) DO NOTHING;

SELECT setval('vehicles_vehicle_id_seq', (SELECT MAX(vehicle_id) FROM vehicles));

-- 3. RIDES
INSERT INTO rides (
    ride_id, driver_id, vehicle_id,
    departure_city, departure_address, departure_lat, departure_lon,
    destination_city, destination_address, destination_lat, destination_lon,
    departure_time, available_seats, price_per_seat, notes, ride_status
)
VALUES
    (
        1, 1, 1,
        'Iași', 'DN28 Valea Lupului (Kaufland)', 47.181200, 27.502300,
        'Iași', 'Universitatea Alexandru Ioan Cuza (Copou)', 47.174300, 27.571700,
        (CURRENT_DATE + TIME '07:40:00'), 2, 7.00,
        'Navetă zilnică. Preluare din stațiile de pe traseu. Fără fumat.', 'scheduled'
    ),
    (
        2, 4, 2,
        'Miroslava', 'Primăria Miroslava', 47.147200, 27.525500,
        'Iași', 'Complex Palas Mall', 47.158500, 27.587200,
        (CURRENT_DATE + TIME '08:00:00'), 3, 6.50,
        'Merg la birou la Palas. Aer condiționat, portbagaj spațios.', 'scheduled'
    ),
    (
        3, 5, 3,
        'Iași (Bucium)', 'Hanul Trei Sarmale', 47.127800, 27.625600,
        'Iași', 'Piața Unirii', 47.165000, 27.582000,
        (CURRENT_DATE + TIME '08:15:00'), 3, 6.00,
        'Plec din Bucium spre centru. Locuri disponibile pe bancheta din spate.', 'scheduled'
    ),
    (
        4, 1, 1,
        'Iași', 'Valea Lupului', 47.181200, 27.502300,
        'Iași', 'Copou', 47.174300, 27.571700,
        (CURRENT_DATE + 1 + TIME '07:40:00'), 4, 7.00,
        'Cursa de mâine dimineață.', 'scheduled'
    )
ON CONFLICT (ride_id) DO NOTHING;

SELECT setval('rides_ride_id_seq', (SELECT MAX(ride_id) FROM rides));

-- 4. BOOKINGS
INSERT INTO bookings (booking_id, ride_id, passenger_id, seats_booked, total_price, booking_status)
VALUES
    (1, 1, 2, 1, 7.00, 'confirmed'),
    (2, 1, 3, 1, 7.00, 'confirmed')
ON CONFLICT (booking_id) DO NOTHING;

SELECT setval('bookings_booking_id_seq', (SELECT MAX(booking_id) FROM bookings));

-- 5. REVIEWS
INSERT INTO reviews (review_id, booking_id, reviewer_id, reviewee_id, rating, comment)
VALUES
    (1, 1, 2, 1, 5, 'Andreea este foarte punctuală, mașina este curată și drumul a fost foarte plăcut!'),
    (2, 1, 3, 1, 5, 'Recomand cu încredere! Am ajuns la timp la facultate.')
ON CONFLICT (review_id) DO NOTHING;

SELECT setval('reviews_review_id_seq', (SELECT MAX(review_id) FROM reviews));

-- 6. NOTIFICATIONS
INSERT INTO notifications (notification_id, user_id, title, message, notification_type, is_read)
VALUES
    (1, 1, 'Rezervare confirmată', 'Mihai Costin a rezervat 1 loc pe cursa Valea Lupului → Copou.', 'booking_confirmed', true),
    (2, 1, 'Rezervare confirmată', 'Ioana Popa a rezervat 1 loc pe cursa Valea Lupului → Copou.', 'booking_confirmed', false),
    (3, 2, 'Confirmare cursă', 'Rezervarea ta pentru cursa de la 07:40 a fost confirmată!', 'ride_reminder', true)
ON CONFLICT (notification_id) DO NOTHING;

SELECT setval('notifications_notification_id_seq', (SELECT MAX(notification_id) FROM notifications));
