// Configurația locurilor pentru copii în mașină

const SEAT_LAYOUTS = {
  1: ['back_right'],
  2: ['back_left', 'back_right'],
  3: ['back_left', 'back_middle', 'back_right'],
  4: ['front_right', 'back_left', 'back_middle', 'back_right'],
  5: ['front_right', 'back_left', 'back_middle', 'back_right', 'third_left'],
  6: ['front_right', 'back_left', 'back_middle', 'back_right', 'third_left', 'third_right'],
  7: ['front_right', 'back_left', 'back_middle', 'back_right', 'third_left', 'third_middle', 'third_right'],
};

const SEAT_LABELS = {
  front_right: 'Față dreapta',
  back_left: 'Spate stânga',
  back_middle: 'Spate mijloc',
  back_right: 'Spate dreapta',
  third_left: 'Rând 3 stânga',
  third_middle: 'Rând 3 mijloc',
  third_right: 'Rând 3 dreapta',
};

// În România, copiii sub 12 ani (sau sub 1,50 m) nu stau pe locul din față fără sistem de reținere;
// aplicația permite locul din față doar de la 12 ani.
const FRONT_SEAT_MIN_AGE = 12;

function seatsForVehicle(childSeats) {
  return SEAT_LAYOUTS[Math.max(1, Math.min(7, childSeats))] || SEAT_LAYOUTS[3];
}

function ageOn(birthDate, onDate = new Date()) {
  const b = new Date(birthDate);
  let age = onDate.getFullYear() - b.getFullYear();
  const m = onDate.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && onDate.getDate() < b.getDate())) age -= 1;
  return age;
}

function seatAllowedForChild(position, childAge) {
  return position !== 'front_right' || childAge >= FRONT_SEAT_MIN_AGE;
}

module.exports = { seatsForVehicle, SEAT_LABELS, FRONT_SEAT_MIN_AGE, ageOn, seatAllowedForChild };
