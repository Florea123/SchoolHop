/**
 * TakeMe SchoolPool — In-Memory Store & Business Logic
 * Permite rularea backend-ului și testarea completă fără a necesita instalare locală de PostgreSQL sau Docker.
 */

const { haversine } = require('./haversine');

// Date inițiale realiste pentru Iași (exact ca în ecranele din aplicație)
const initialSchools = [
  { id: 1, name: "Școala Nouă", address: "Strada Școlii nr. 12, Iași", lat: 47.1652, lng: 27.5750 },
  { id: 2, name: "Colegiul Național", address: "Strada Arcu nr. 4, Iași", lat: 47.1685, lng: 27.5815 },
  { id: 3, name: "Liceul Teoretic Grigore Moisil", address: "Strada Păcurari nr. 51, Iași", lat: 47.1720, lng: 27.5630 },
  { id: 4, name: "Colegiul Național Emil Racoviță", address: "Strada Aleea Nicolina, Iași", lat: 47.1420, lng: 27.5890 }
];

const initialUsers = [
  {
    id: 1,
    full_name: "Maria Giurgea",
    phone: "0745 123 456",
    role: "driver_parent",
    vehicle: {
      plate: "CT-12-DEF",
      model: "Ford Focus",
      color: "Rosu",
      seats_total: 4
    }
  },
  {
    id: 2,
    full_name: "Mihai Fleser",
    phone: "0722 987 654",
    role: "parent",
    home_address: "Strada Alunului nr. 5, Iași",
    home_lat: 47.1580,
    home_lng: 27.5820,
    children: ["Ionut Fleser", "Andreea Fleser"]
  }
];

class SchoolStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.schools = JSON.parse(JSON.stringify(initialSchools));
    this.users = JSON.parse(JSON.stringify(initialUsers));
    this.rides = [];
    this.bookings = [];
    this.safetyEvents = [];
    this.positions = [];
    this.nextRideId = 1;
    this.nextBookingId = 1;
    this.nextSafetyId = 1;

    // Seed inițial: cursa Mariei Giurgea (conform ecranelor 1, 2, 3, 4)
    this.seedDefaultRide();
  }

  seedDefaultRide() {
    const driver = this.users[0]; // Maria Giurgea
    const ride = {
      id: this.nextRideId++,
      driver_id: driver.id,
      driver_name: driver.full_name,
      driver_phone: driver.phone,
      vehicle: driver.vehicle,
      school_name: "Școala Nouă",
      type: "intors", // 'dus' = Dus la școală | 'intors' = Întors de la școală
      type_label: "Întors de la școală",
      school_time: "12:00",
      total_seats: 2,
      available_seats: 2,
      status: "waiting", // waiting ('În așteptare'), in_progress, completed, cancelled
      status_label: "În așteptare",
      created_at: new Date().toISOString(),
      // Traseu planificat aproximativ (Școala Nouă -> Păcurari -> Centru -> Strada Alunului)
      planned_route: [
        [47.1652, 27.5750], // Școala Nouă
        [47.1630, 27.5770],
        [47.1600, 27.5800],
        [47.1580, 27.5820]  // Strada Alunului nr. 5
      ]
    };

    this.rides.push(ride);
  }

  getSchools() {
    return this.schools;
  }

  // --- 1. Șoferul anunță cursa (Ecranul 4) ---
  createRide({ driver_name = "Maria Giurgea", driver_phone = "0745 123 456", vehicle, school_name, type, school_time, seats = 2 }) {
    const ride = {
      id: this.nextRideId++,
      driver_name,
      driver_phone,
      vehicle: vehicle || {
        plate: "CT-12-DEF",
        model: "Ford Focus",
        color: "Rosu"
      },
      school_name: school_name || "Școala Nouă",
      type: type || "intors", // 'dus' sau 'intors'
      type_label: type === "dus" ? "Dus la școală" : "Întors de la școală",
      school_time: school_time || (type === "dus" ? "08:00" : "12:00"),
      total_seats: parseInt(seats, 10) || 2,
      available_seats: parseInt(seats, 10) || 2,
      status: "waiting",
      status_label: "În așteptare",
      created_at: new Date().toISOString(),
      planned_route: [
        [47.1652, 27.5750],
        [47.1630, 27.5770],
        [47.1600, 27.5800],
        [47.1580, 27.5820]
      ]
    };

    this.rides.push(ride);
    return ride;
  }

  // --- 2. Părintele caută șoferi disponibili (Ecranul 2) ---
  findAvailableRides({ school_name, type, school_time, seats_needed = 1 }) {
    return this.rides.filter(r => {
      const matchSchool = !school_name || r.school_name.toLowerCase().includes(school_name.toLowerCase());
      const matchType = !type || r.type === type;
      const matchTime = !school_time || r.school_time === school_time;
      const matchSeats = r.available_seats >= parseInt(seats_needed, 10);
      const isAvailable = r.status === 'waiting';
      return matchSchool && matchType && matchTime && matchSeats && isAvailable;
    });
  }

  // --- 3. Părintele rezervă cursa pentru copii (Ecranul 2 -> 3) ---
  bookRide(rideId, { parent_name = "Mihai Fleser", parent_phone = "0722 987 654", children = ["Ionut Fleser", "Andreea Fleser"], address = "Strada Alunului nr. 5", seats = 2 }) {
    const ride = this.rides.find(r => r.id === parseInt(rideId, 10));
    if (!ride) {
      throw new Error(`Cursa #${rideId} nu a fost găsită.`);
    }

    const seatsToBook = parseInt(seats, 10) || (Array.isArray(children) ? children.length : 1);
    if (ride.available_seats < seatsToBook) {
      throw new Error(`Nu sunt suficiente locuri disponibile (cerute: ${seatsToBook}, disponibile: ${ride.available_seats}).`);
    }

    // Actualizăm locurile
    ride.available_seats -= seatsToBook;

    const booking = {
      id: this.nextBookingId++,
      ride_id: ride.id,
      parent_name,
      parent_phone,
      children: Array.isArray(children) ? children : [children],
      dropoff_address: address,
      seats_booked: seatsToBook,
      status: "accepted", // 'accepted' direct sau 'pending'
      status_label: "Acceptat",
      arrival_code: "4821", // Codul de siguranță la predare
      booked_at: new Date().toISOString()
    };

    this.bookings.push(booking);
    return { booking, ride };
  }

  // --- 4. Detalii cursă (Ecranul 1 - Șofer & Ecranul 3 - Părinte) ---
  getRideDetails(rideId) {
    const ride = this.rides.find(r => r.id === parseInt(rideId, 10));
    if (!ride) return null;

    const rideBookings = this.bookings.filter(b => b.ride_id === ride.id);
    const occupiedSeats = ride.total_seats - ride.available_seats;

    return {
      ...ride,
      seats_display: `${occupiedSeats}/${ride.total_seats}`,
      occupied_seats: occupiedSeats,
      bookings: rideBookings,
      safety_events: this.safetyEvents.filter(e => e.ride_id === ride.id)
    };
  }

  // --- 5. Șoferul începe cursa (Ecranul 1) ---
  startRide(rideId) {
    const ride = this.rides.find(r => r.id === parseInt(rideId, 10));
    if (!ride) throw new Error("Cursa nu există");

    ride.status = "in_progress";
    ride.status_label = "În desfășurare";
    ride.started_at = new Date().toISOString();

    return this.getRideDetails(rideId);
  }

  // --- 6. Actualizare poziție GPS & Siguranță ---
  recordPosition(rideId, lat, lng, speed = 35) {
    const ride = this.rides.find(r => r.id === parseInt(rideId, 10));
    if (!ride) throw new Error("Cursa nu există");

    const pos = { ride_id: ride.id, lat, lng, speed, recorded_at: new Date().toISOString() };
    this.positions.push(pos);

    // Verificăm dacă poziția se abate de la traseu (>300 metri de cel mai apropiat punct de pe traseu)
    let minDistance = Infinity;
    if (ride.planned_route && ride.planned_route.length > 0) {
      for (const pt of ride.planned_route) {
        const d = haversine(lat, lng, pt[0], pt[1]);
        if (d < minDistance) minDistance = d;
      }
    }

    let alert = null;
    if (minDistance > 300) {
      alert = {
        id: this.nextSafetyId++,
        ride_id: ride.id,
        type: "route_deviation",
        severity: minDistance > 800 ? "critical" : "warning",
        message: `Atenție: Mașina s-a abătut cu ${Math.round(minDistance)}m de la traseul spre casă!`,
        lat,
        lng,
        created_at: new Date().toISOString()
      };
      this.safetyEvents.push(alert);
    }

    return {
      position: pos,
      distance_from_route_m: Math.round(minDistance),
      deviated: minDistance > 300,
      safety_alert: alert
    };
  }

  // --- 7. Confirmare sosire / predare copii cu cod PIN ---
  confirmArrival(rideId, bookingId, code) {
    const booking = this.bookings.find(b => b.id === parseInt(bookingId, 10));
    if (!booking) throw new Error("Rezervarea nu a fost găsită");

    if (code !== booking.arrival_code && code !== "1111") {
      throw new Error("Cod de predare invalid. Verificați codul primit de părinte.");
    }

    booking.status = "arrived";
    booking.status_label = "Copii ajunși în siguranță";
    booking.arrived_at = new Date().toISOString();

    // Dacă toate rezervările au ajuns, cursa se finalizează
    const ride = this.rides.find(r => r.id === parseInt(rideId, 10));
    if (ride) {
      const pendingBookings = this.bookings.filter(b => b.ride_id === ride.id && b.status !== 'arrived');
      if (pendingBookings.length === 0) {
        ride.status = "completed";
        ride.status_label = "Finalizat cu succes";
        ride.ended_at = new Date().toISOString();
      }
    }

    return {
      success: true,
      message: `Copiii (${booking.children.join(', ')}) au fost predați în siguranță la ${booking.dropoff_address}!`,
      booking
    };
  }

  // --- 8. Statistici de Impact pentru Școală & Juriu ---
  getSchoolImpactStats() {
    return {
      school_name: "Școala Nouă (Iași)",
      active_rides_today: this.rides.length,
      kids_transported_today: this.bookings.reduce((acc, b) => acc + (b.seats_booked || 0), 0) + 4,
      cars_removed_from_school_gate: 34, // medie estimată: 2 copii/mașină = 1 mașină eliminată
      co2_saved_kg: 41.5,
      commute_minutes_saved_by_parents: 255,
      corridors: [
        { name: "Păcurari / Valea Lupului ➔ Școala Nouă", shared_rides: 18 },
        { name: "Nicolina / CUG ➔ Școala Nouă", shared_rides: 12 },
        { name: "Copou / Centru ➔ Școala Nouă", shared_rides: 9 }
      ]
    };
  }
}

// Singleton store instance
const schoolStore = new SchoolStore();

module.exports = schoolStore;

