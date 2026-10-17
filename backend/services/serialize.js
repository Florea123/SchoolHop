// Formatul JSON trimis către frontend

const { ageOn } = require('./seats');

function child(c, labels = {}) {
  return {
    id: c.child_id, parentId: c.parent_id, schoolId: c.school_id, fullName: c.full_name,
    birthDate: c.birth_date, age: ageOn(c.birth_date), grade: c.grade, teacher: c.teacher, bio: c.bio,
    interests: (c.interests || []).map((slug) => ({ slug, label: labels[slug] || slug })),
    needsBooster: c.needs_booster, homeArea: c.home_village_or_area, homeAddress: c.home_address,
    homeLat: c.home_lat, homeLon: c.home_lon, isSocialBeneficiary: c.is_social_beneficiary,
    profileComplete: Boolean(c.home_village_or_area && c.home_lat != null),
  };
}

function vehicle(v) {
  return {
    id: v.vehicle_id, brand: v.brand, model: v.model, color: v.color, licensePlate: v.license_plate,
    childSeats: v.child_seats, boosterSeats: v.booster_seats,
  };
}

function rideSummary(r) {
  return {
    id: r.ride_id, direction: r.direction, status: r.ride_status, departureTime: r.departure_time,
    departureArea: r.departure_village_or_area, departureAddress: r.departure_address,
    departureLat: r.departure_lat, departureLon: r.departure_lon,
    destination: r.destination_dropoff_point, destinationLat: r.destination_lat, destinationLon: r.destination_lon,
    totalSeats: r.total_seats, availableSeats: r.available_seats, pricePerSeat: r.price_per_seat,
    isSocialFund: r.is_social_fund, notes: r.notes,
    school: r.school_name !== undefined ? {
      id: r.school_id, name: r.school_name, shortName: r.school_short_name, phone: r.school_phone,
      bellTime: r.bell_time, dropoffPoint: r.dropoff_point_label,
    } : { id: r.school_id },
    driver: r.driver_name !== undefined ? {
      id: r.driver_id, fullName: r.driver_name, phone: r.driver_phone, role: r.driver_role,
      rating: r.driver_rating, reviews: r.driver_reviews,
    } : { id: r.driver_id },
    vehicle: r.brand !== undefined ? {
      brand: r.brand, model: r.model, color: r.color, licensePlate: r.license_plate,
      childSeats: r.child_seats, boosterSeats: r.booster_seats,
    } : null,
  };
}

module.exports = { child, vehicle, rideSummary };
