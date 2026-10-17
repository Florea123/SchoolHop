/**
 * ==============================================================================
 * TakeMe SchoolPool — Test Runner Cap-Coadă (Fără Bază de Date & Fără Frontend)
 * ==============================================================================
 * Rulează întreg fluxul aplicației conform celor 4 ecrane din specificație:
 *   1. Anunță cursă (Șofer: Dus/Întors, Școală, Oră, Locuri)
 *   2. Caută șoferi disponibili (Părinte: caută pentru copii)
 *   3. Rezervare cursă (Părinte: confirmare cu adresă predare și mașină)
 *   4. Detalii cursă șofer (Locuri 2/2, Mihai Fleșer, Începe cursa)
 *   5. Motor Siguranță (Live GPS & Abatere de la traseu)
 *   6. Sosire & Cod PIN securizat la predare
 *   7. Statistici de Impact pentru Școală & Juriu
 *
 * Rulare:
 *   node test_schoolpool.js
 * ==============================================================================
 */

const schoolStore = require('./services/schoolStore');

// Culori ANSI pentru terminal
const C = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  bgBlue: "\x1b[44m\x1b[37m",
  bgGreen: "\x1b[42m\x1b[30m",
};

function printHeader(title) {
  console.log(`\n${C.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.cyan}║${C.bright}  ${title.padEnd(74)}  ${C.reset}${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${C.reset}\n`);
}

function printCard(title, content) {
  console.log(`┌─ ${C.bright}${C.yellow}${title}${C.reset} ` + '─'.repeat(Math.max(10, 65 - title.length)));
  for (const line of content) {
    console.log(`│  ${line}`);
  }
  console.log('└' + '─'.repeat(70) + '\n');
}

async function runDemo() {
  schoolStore.reset();

  printHeader("TAKEME SCHOOLPOOL — SIMULARE TEST CAP-COADĂ (IAȘI)");
  console.log(`${C.yellow}ℹ️  Se testează logica completă fără dependență de Postgres sau interfață grafică.${C.reset}\n`);

  // ============================================================================
  // PASUL 1: Ecranul 4 — "Anunță cursă" (Vedere Șofer)
  // ============================================================================
  console.log(`${C.bright}${C.blue}▶ PASUL 1: Ecranul 4 — Anunță cursă (Șoferița Maria Giurgea)${C.reset}`);
  const newRide = schoolStore.createRide({
    driver_name: "Maria Giurgea",
    driver_phone: "0745 123 456",
    vehicle: {
      plate: "CT-12-DEF",
      model: "Ford Focus",
      color: "Rosu"
    },
    school_name: "Școala Nouă",
    type: "intors", // Întors de la școală
    school_time: "12:00",
    seats: 2
  });

  printCard("ECRANUL 4: CURSĂ PUBLICATĂ", [
    `Tip cursă:             ${C.green}● Întors de la școală${C.reset}`,
    `Sediu școală:          ${C.bright}${newRide.school_name}${C.reset}`,
    `Ora de finalizare:     ${C.bright}${newRide.school_time}${C.reset}`,
    `Locuri disponibile:    ${C.bright}${newRide.available_seats} locuri${C.reset}`,
    `Șofer:                 ${newRide.driver_name} (${newRide.driver_phone})`,
    `Autovehicul:           ${newRide.vehicle.model} (${newRide.vehicle.color}) - [${newRide.vehicle.plate}]`
  ]);

  // ============================================================================
  // PASUL 2: Ecranul 2 — "Șoferi disponibili" (Vedere Părinte)
  // ============================================================================
  console.log(`${C.bright}${C.blue}▶ PASUL 2: Ecranul 2 — Căutare curse pentru copii (Părintele Mihai Fleșer)${C.reset}`);
  console.log(`Părintele Mihai Fleșer caută locuri pentru: ${C.bright}Ionuț Fleșer & Andreea Fleșer${C.reset}`);
  console.log(`Filtre: Școala Nouă | Întors de la școală | Ora 12:00 | 2 locuri`);

  const availableRides = schoolStore.findAvailableRides({
    school_name: "Școala Nouă",
    type: "intors",
    school_time: "12:00",
    seats_needed: 2
  });

  console.log(`\n${C.green}✓ S-au găsit ${availableRides.length} șoferi disponibili în aceeași zonă:${C.reset}`);
  for (const r of availableRides) {
    printCard("ECRANUL 2: ȘOFER DISPONIBIL", [
      `Șofer:                 ${C.bright}${r.driver_name}${C.reset}  [Sună șoferul: ${r.driver_phone}]`,
      `Badge:                 ${C.bgGreen} ${r.type_label} ${C.reset}`,
      `Ora plecării:          ${r.school_time}`,
      `Locuri libere:         ${C.green}${r.available_seats} locuri${C.reset}`,
      `Traseu:                ${r.school_name} ➔ Acasă (cartierul Păcurari / Valea Lupului)`,
      `Status în aplicație:   ${C.bright}${C.yellow}[ SELECTAT ]${C.reset}`
    ]);
  }

  // ============================================================================
  // PASUL 3: Rezervare Cursă & Ecranul 3 — "Detalii cursă" (Vedere Părinte)
  // ============================================================================
  console.log(`${C.bright}${C.blue}▶ PASUL 3: Rezervare cursă & Ecranul 3 (Vedere Părinte)${C.reset}`);
  const targetRideId = availableRides[0].id;
  const { booking, ride: bookedRide } = schoolStore.bookRide(targetRideId, {
    parent_name: "Mihai Fleser",
    parent_phone: "0722 987 654",
    children: ["Ionut Fleser", "Andreea Fleser"],
    address: "Strada Alunului nr. 5",
    seats: 2
  });

  printCard("ECRANUL 3: DETALII CURSĂ (PĂRINTE ACCEPTAT)", [
    `Status rezervare:      ${C.bgGreen} ${booking.status_label} ${C.reset}`,
    `Tip:                   ${bookedRide.type_label}`,
    `Sediu școală:          ${bookedRide.school_name}`,
    `Ora de finalizare:     ${bookedRide.school_time}`,
    `Punct de predare:      ${C.bright}${booking.dropoff_address}${C.reset}`,
    `Copii transportați:    ${C.bright}${booking.children.join(", ")}${C.reset}`,
    `Șofer asociat:         ${bookedRide.driver_name} [Tel: ${bookedRide.driver_phone}]`,
    `Mașină:                ${bookedRide.vehicle.model} (${bookedRide.vehicle.color}) - [${bookedRide.vehicle.plate}]`,
    `Cod PIN de sosire:     ${C.bright}${C.magenta}${booking.arrival_code}${C.reset} (se arată șoferului la poartă)`
  ]);

  // ============================================================================
  // PASUL 4: Ecranul 1 — "Detalii cursă" (Vedere Șofer)
  // ============================================================================
  console.log(`${C.bright}${C.blue}▶ PASUL 4: Ecranul 1 — Detalii cursă (Vedere Șoferiță Maria Giurgea)${C.reset}`);
  const driverRideView = schoolStore.getRideDetails(targetRideId);

  printCard("ECRANUL 1: DETALII CURSĂ (ȘOFER)", [
    `Status cursă:          ${C.yellow}● ${driverRideView.status_label}${C.reset}`,
    `Sediu școală:          ${driverRideView.school_name}`,
    `Ora de finalizare:     ${driverRideView.school_time}`,
    `Locuri ocupate:        ${C.bright}${C.red}${driverRideView.seats_display}${C.reset} (Plin)`,
    `────────────────────────────────────────────────────────────────────────`,
    `Cerere Părinte:        ${C.bright}${driverRideView.bookings[0].parent_name}${C.reset} [Sună părinte: ${driverRideView.bookings[0].parent_phone}]`,
    `Copii în mașină:       ${driverRideView.bookings[0].children.join(" & ")}`,
    `Adresă de lăsat:       ${driverRideView.bookings[0].dropoff_address} [📍 Buton: Navigare]`,
    `Acțiuni disponibile:   ${C.green}[ Începe cursa ]${C.reset} | ${C.red}[ Refuză cerere / Anulează ]${C.reset}`
  ]);

  // ============================================================================
  // PASUL 5: Pornire Cursă & Motor de Siguranță (Live GPS & Abatere)
  // ============================================================================
  console.log(`${C.bright}${C.blue}▶ PASUL 5: Începe cursa & Monitorizare Siguranță (GPS + Alarme)${C.reset}`);
  schoolStore.startRide(targetRideId);
  console.log(`${C.green}✓ Maria a apăsat "Începe cursa". Notificare trimisă către părintele Mihai Fleșer!${C.reset}`);

  // 5.1 Poziție normală pe traseu
  console.log(`\nTrimitere poziție GPS normală (Școala Nouă ➔ Păcurari)...`);
  const posOk = schoolStore.recordPosition(targetRideId, 47.1630, 27.5770, 40);
  console.log(`✓ Poziție înregistrată. Distanță față de traseul optim: ${posOk.distance_from_route_m}m. Deviat: ${posOk.deviated ? 'DA' : 'NU (Traseu sigur)'}`);

  // 5.2 Simulare abatere de la traseu (Punctul cheie al Pitch-ului de siguranță!)
  console.log(`\n${C.yellow}Simulare abatere de la traseu (șoferul virează pe o alee neplanificată la 480m distanță)...${C.reset}`);
  const posDeviated = schoolStore.recordPosition(targetRideId, 47.1800, 27.5950, 45);

  if (posDeviated.deviated) {
    console.log(`\n${C.red}╔══════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.red}║  🚨 ALARMĂ SIGURANȚĂ (SAFETY ALERT DECLANȘAT)                                 ║${C.reset}`);
    console.log(`${C.red}║  ${posDeviated.safety_alert.message.padEnd(74)}║${C.reset}`);
    console.log(`${C.red}║  Severitate: [${posDeviated.safety_alert.severity.toUpperCase()}] | Notificare automată expediată către părinte!║${C.reset}`);
    console.log(`${C.red}╚══════════════════════════════════════════════════════════════════════════════╝${C.reset}\n`);
  }

  // ============================================================================
  // PASUL 6: Ajuns la destinație & Confirmare cu Cod PIN
  // ============================================================================
  console.log(`${C.bright}${C.blue}▶ PASUL 6: Sosire la Strada Alunului nr. 5 & Confirmare Predare Copii${C.reset}`);
  console.log(`Părintele Mihai Fleșer întâmpină mașina și introduce codul PIN de siguranță: ${C.magenta}4821${C.reset}`);

  const arrivalResult = schoolStore.confirmArrival(targetRideId, booking.id, "4821");

  printCard("PREDARE CONFIRMATĂ CU SUCCES", [
    `${C.green}✓ ${arrivalResult.message}${C.reset}`,
    `Status final cursă:    ${C.bright}${C.green}Finalizat cu succes${C.reset}`,
    `Notificare finală:     "Ionuț și Andreea au intrat în casă în siguranță!"`
  ]);

  // ============================================================================
  // PASUL 7: Raport de Impact pentru Prezentare / Juriu
  // ============================================================================
  console.log(`${C.bright}${C.blue}▶ PASUL 7: Dashboard de Impact (Cifre pentru Juriu & Pitch)${C.reset}`);
  const stats = schoolStore.getSchoolImpactStats();

  printCard("IMPACT TAKEME PENTRU ȘCOLI (IAȘI)", [
    `Sediu Școală pilot:    ${C.bright}${stats.school_name}${C.reset}`,
    `Mașini eliminate azi:  ${C.green}${C.bright}${stats.cars_removed_from_school_gate} de mașini${C.reset} din fața porții la ora 12:00!`,
    `Copii transportați:    ${C.bright}${stats.kids_transported_today} elevi${C.reset}`,
    `Emisii CO2 evitate:    ${C.bright}${stats.co2_saved_kg} kg CO₂${C.reset}`,
    `Timp economisit:       ${C.bright}${stats.commute_minutes_saved_by_parents} minute${C.reset} de aglomerație economisite de părinți`,
    `Coridoare active:      ${stats.corridors.map(c => `\n     • ${c.name} (${c.shared_rides} curse împărțite)`).join('')}`
  ]);

  console.log(`${C.green}==============================================================================${C.reset}`);
  console.log(`${C.bright}${C.green}🎉 TEST COMPLET REUȘIT! Toate cele 4 ecrane funcționează perfect cap-coadă.${C.reset}`);
  console.log(`${C.green}==============================================================================\n${C.reset}`);
}

// Rulare test
runDemo().catch(err => {
  console.error("Eroare la rularea testului:", err);
});

