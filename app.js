/**
 * TAKE ME - SCHOOL CARPOOL & AI MATCHING LOGIC
 * "Același drum spre școală. Mai siguri împreună."
 * Comunitate închisă și securizată prin autentificare cu email-ul școlar.
 */

// Application Central State
const AppState = {
  currentScreen: 'screen-05', // Start at Parent Home (Screen 05)
  deviceMode: 'web', // 'web' | 'phone' | 'fluid' | 'desktop'
  school: {
    name: 'Școala Gimnazială Nr. 195 "Hamburg"',
    shortName: 'Școala 195',
    domain: '@parinti.scoala195.edu.ro',
    city: 'București, Sector 3',
    verifiedTotalParents: 428,
    carsReducedToday: 156
  },
  user: {
    name: 'Elena Popescu',
    role: 'Părinte & Șofer ocazional',
    email: 'elena.popescu@parinti.scoala195.edu.ro',
    isSchoolVerified: true,
    points: 120, // Puncte ecologice "Eroul Verde al Școlii"
    ridesCompleted: 12,
    co2Saved: 36, // kg
    moneySaved: 72, // lei
    soloKmSaved: 240, // km
    emergencyContact: 'Maria Popescu (Bunică)',
    emergencyPhone: '+40 722 123 456',
    activeFrame: 'verde-urban',
    // Child Profile with Description & AI Interests
    child: {
      name: 'Matei Popescu',
      age: 9,
      grade: 'Clasa a III-a B',
      teacher: 'Prof. Anca Dumitrescu',
      avatar: '👦',
      bio: 'Pasionat de roboței, construcții Lego și meciuri de fotbal în pauză.',
      interests: ['🤖 Robotică', '🧱 Lego', '⚽ Fotbal', '♟️ Șah']
    }
  },
  aiMatches: [
    {
      id: 'match-radu',
      driver: 'Radu Ionescu',
      role: 'Tatăl lui Luca',
      childName: 'Luca',
      childGrade: 'Clasa a III-a B',
      aiScore: '98%',
      aiReason: 'Colegi în clasa a III-a B · Ambii adoră Robotica & Lego!',
      rating: 4.9,
      reviews: 48,
      car: 'Dacia Duster · B123PAR',
      equipment: 'Echipat cu 2 înălțătoare auto copii',
      depTime: '07:45',
      arrTime: '08:00',
      price: 8,
      walkTime: '3 min pe jos · punct urcare',
      seatsFree: 2
    },
    {
      id: 'match-maria',
      driver: 'Maria Marin',
      role: 'Mama Sofiei',
      childName: 'Sofia',
      childGrade: 'Clasa a III-a A',
      aiScore: '92%',
      aiReason: 'Același palier de clase · Pasiuni comune: Șah & Desen',
      rating: 4.8,
      reviews: 32,
      car: 'Renault Captur · B456PAR',
      equipment: 'Scaun ergonomic + înălțător',
      depTime: '07:40',
      arrTime: '07:55',
      price: 8,
      walkTime: '5 min pe jos · punct urcare',
      seatsFree: 1
    },
    {
      id: 'match-mihai',
      driver: 'Mihai Stan',
      role: 'Tatăl lui Tudor',
      childName: 'Tudor',
      childGrade: 'Clasa a IV-a B',
      aiScore: '86%',
      aiReason: 'Echipa de fotbal a școlii · Pasionați de sport',
      rating: 4.7,
      reviews: 26,
      car: 'Skoda Karoq · B789PAR',
      equipment: 'Centuri ajustabile junior',
      depTime: '07:50',
      arrTime: '08:05',
      price: 8,
      walkTime: '2 min pe jos',
      seatsFree: 2
    }
  ],
  activeBooking: {
    driver: 'Radu Ionescu (Tatăl lui Luca)',
    childInCar: 'Luca Ionescu (coleg a III-a B)',
    car: 'Dacia Duster · B123PAR · Scaune omologate',
    driverRating: 4.9,
    driverReviews: 48,
    date: 'Luni, 19 octombrie 2026',
    departure: 'Metrou Nicolae Grigorescu, Titan',
    destination: 'Școala Gimnazială Nr. 195 (Poarta 1)',
    depTime: '07:45',
    arrTime: '08:00',
    selectedSeat: 'spate-stanga', // Matei Popescu · Loc cu înălțător
    pricePerSeat: 8,
    selectedDays: ['19', '21'], // Oct 19, 21
    includeReturn: false,
    driverConfirmed: true,
    parentConfirmed: false,
    aiTopic: '🤖 Ce robot ați construi azi la școală dacă ați avea piese infinite?',
    ratingGiven: 5,
    reviewText: 'Excelent! Copiii au povestit tot drumul despre roboți, iar predarea la poarta școlii a fost rapidă și sigură.'
  },
  driverDraft: {
    departure: 'Metrou Nicolae Grigorescu, Titan',
    destination: 'Școala Gimnazială Nr. 195 (Poarta 1)',
    date: '19 oct. 2026',
    time: '07:45',
    days: ['L', 'Ma', 'Mi', 'J', 'V'],
    seats: 2,
    price: 8,
    confort: true,
    includeReturn: false
  }
};

// Screen Mapping Titles
const ScreenTitles = {
  'screen-01': '01 · Login Școlar (@parinti.scoala195.edu.ro)',
  'screen-02': '02 · Înregistrare Părinte & Copil (Profil Elev)',
  'screen-03': '03 · Verificare Identitate & Apartenență Școală',
  'screen-04': '04 · Siguranța la Școală (Fără Coduri / Încredere Instituțională)',
  'screen-05': '05 · Acasă Părinte și Elev',
  'screen-06': '06 · Căutare Cursă Spre Școala Nr. 195',
  'screen-07': '07 · Curse potrivite pentru colegi',
  'screen-08': '08 · Punct de Întâlnire & Mers pe jos',
  'screen-09': '09 · Selectare Loc în Mașină (Înălțător Matei)',
  'screen-10': '10 · Publică Cursă ca Părinte Șofer',
  'screen-11': '11 · În Drum Spre Școală (Hartă și întrebare)',
  'screen-12': '12 · Alertă Siguranță Deviere Traseu',
  'screen-13': '13 · Predare la Poarta Școlii (Confirmare Directă)',
  'screen-14': '14 · Mulțumiri, Rating & Puncte Erou Verde',
  'screen-15': '15 · Link Partajat cu Bunicul / Celălalt Părinte',
  'screen-16': '16 · Desktop Dashboard Comitet Părinți & Școală',
  'screen-17': '17 · Cursele Școlare (Programări & Colegi)',
  'screen-18': '18 · Calendar Commute Școală (Orar Luni-Vineri)',
  'screen-19': '19 · Profil Părinte & Editare Pasiuni/Interese Copil',
  'screen-20': '20 · Impactul Ecologic & Reducerea Traficului',
  'screen-21': '21 · Insigne Școlare & Recompense Matei'
};

const ScreenSequence = [
  'screen-01', 'screen-02', 'screen-03', 'screen-04', 'screen-05',
  'screen-06', 'screen-07', 'screen-08', 'screen-09', 'screen-10',
  'screen-11', 'screen-12', 'screen-13', 'screen-14', 'screen-15',
  'screen-16', 'screen-17', 'screen-18', 'screen-19', 'screen-20', 'screen-21'
];

/**
 * Main Navigation Function
 */
function navigateTo(screenId) {
  if (!document.getElementById(screenId)) {
    console.warn(`Screen ${screenId} not found`);
    return;
  }

  AppState.currentScreen = screenId;

  document.querySelectorAll('.app-screen').forEach(scr => scr.classList.remove('active'));
  const target = document.getElementById(screenId);
  target.classList.add('active');

  const viewport = document.getElementById('phoneViewport');
  if (viewport) viewport.scrollTop = 0;

  const select = document.getElementById('screenSelect');
  if (select) select.value = screenId;

  if (screenId === 'screen-16') {
    setDeviceMode('desktop');
  } else if (AppState.deviceMode === 'desktop') {
    setDeviceMode('phone');
  }

  updateBottomNav(screenId);

  if (screenId === 'screen-11') {
    animateCar();
  }
}

/**
 * Update Bottom Navigation Bar
 */
function updateBottomNav(screenId) {
  const bottomNav = document.getElementById('phoneBottomNav');
  if (!bottomNav) return;

  const hideNavOn = AppState.deviceMode === 'web'
    ? ['screen-15', 'screen-16']
    : ['screen-01', 'screen-02', 'screen-03', 'screen-04', 'screen-15', 'screen-16'];
  if (hideNavOn.includes(screenId)) {
    bottomNav.style.display = 'none';
  } else {
    bottomNav.style.display = 'flex';
  }

  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  if (['screen-01', 'screen-02', 'screen-03', 'screen-04'].includes(screenId)) {
    document.getElementById('navAccount')?.classList.add('active');
  } else if (['screen-05', 'screen-06', 'screen-07', 'screen-08', 'screen-09'].includes(screenId)) {
    document.getElementById('navSearch')?.classList.add('active');
  } else if (['screen-11', 'screen-12', 'screen-13', 'screen-14', 'screen-17'].includes(screenId)) {
    document.getElementById('navRides')?.classList.add('active');
  } else if (['screen-10'].includes(screenId)) {
    document.getElementById('navPublish')?.classList.add('active');
  } else if (['screen-18', 'screen-19', 'screen-20', 'screen-21'].includes(screenId)) {
    document.getElementById('navProfile')?.classList.add('active');
  }
}

/**
 * Set Device Preview Mode: 'web' | 'phone' | 'fluid' | 'desktop'
 */
function setDeviceMode(mode) {
  AppState.deviceMode = mode;
  const stage = document.getElementById('mainStage');
  if (!stage) return;

  stage.className = `main-stage mode-${mode}`;

  document.querySelectorAll('.dev-btn-mode').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  if (mode === 'desktop' && AppState.currentScreen !== 'screen-16') {
    navigateTo('screen-16');
  }
}

/**
 * Toast Notification Modal
 */
function showToast(message, icon = '✓') {
  const toast = document.getElementById('toastNotification');
  const toastText = document.getElementById('toastText');
  const toastIcon = document.getElementById('toastIcon');

  if (!toast) return;

  toastText.textContent = message;
  toastIcon.textContent = icon;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

/**
 * Interactive Seat Selector with Child Booster Seat Logic (Screen 09)
 */
function initSeatSelector() {
  const seatButtons = document.querySelectorAll('.seat-clickable');
  seatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const seatType = btn.dataset.seat;
      if (btn.classList.contains('disabled') || btn.classList.contains('blocked')) return;

      seatButtons.forEach(s => {
        if (s.dataset.seat !== 'alex' && !s.classList.contains('blocked') && !s.classList.contains('occupied')) {
          s.classList.remove('selected');
          s.classList.add('free');
          s.querySelector('.seat-status').textContent = 'Liber';
        }
      });

      btn.classList.remove('free');
      btn.classList.add('selected');
      btn.querySelector('.seat-status').textContent = 'Matei · selectat';
      AppState.activeBooking.selectedSeat = seatType;

      const seatLabel = seatType === 'back-left' ? 'Spate stânga (Înălțător Matei)' : 'Față dreapta';
      const labelEl = document.getElementById('selectedSeatDisplay');
      if (labelEl) labelEl.textContent = seatLabel;

      showToast(`Loc confirmat: ${seatLabel}`);
    });
  });
}

/**
 * Interactive Interest Chips Toggle (Screen 19 - Child Profile)
 */
function initInterestToggles() {
  const chips = document.querySelectorAll('.interest-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
      const interestName = chip.textContent.trim();

      const selected = [];
      document.querySelectorAll('.interest-chip.selected').forEach(c => {
        selected.push(c.textContent.trim());
      });
      AppState.user.child.interests = selected;

      showToast(`Interesele lui Matei au fost actualizate: ${selected.length} pasiuni selectate.`, '✨');
    });
  });
}

/**
 * Select recurring ride days (Screen 10)
 */
function initDriverDaySelector() {
  document.querySelectorAll('.driver-day-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('active');
      pill.setAttribute('aria-pressed', String(pill.classList.contains('active')));
      AppState.driverDraft.days = [...document.querySelectorAll('.driver-day-pill.active')]
        .map(activePill => activePill.dataset.day);
    });
  });
}

/**
 * Calendar Multi-Day Booking (Screen 18)
 */
function initCalendarBooking() {
  const dayPills = document.querySelectorAll('.calendar-day-pill');
  dayPills.forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('active');

      const selectedDays = [];
      document.querySelectorAll('.calendar-day-pill.active').forEach(p => {
        selectedDays.push(p.dataset.day);
      });
      AppState.activeBooking.selectedDays = selectedDays;

      updateCalendarBookingTotals();
    });
  });

  const returnToggle = document.getElementById('returnTripCheckbox');
  if (returnToggle) {
    returnToggle.addEventListener('change', (e) => {
      AppState.activeBooking.includeReturn = e.target.checked;
      updateCalendarBookingTotals();
    });
  }
}

function updateCalendarBookingTotals() {
  const daysCount = AppState.activeBooking.selectedDays.length;
  const includeReturn = AppState.activeBooking.includeReturn;
  const pricePerRide = 8; // Contribuție simbolică drum școală

  const multiplier = includeReturn ? 2 : 1;
  const total = daysCount * pricePerRide * multiplier;

  const countEl = document.getElementById('calendarDaysCount');
  const mathEl = document.getElementById('calendarCostMath');
  const returnDescEl = document.getElementById('calendarReturnDesc');
  const totalEl = document.getElementById('calendarTotalVal');
  const confirmBtn = document.getElementById('btnConfirmCalendar');

  if (countEl) countEl.textContent = `${daysCount} ${daysCount === 1 ? 'zi de școală selectată' : 'zile de școală selectate'} · 1 loc (Matei)`;
  if (mathEl) mathEl.textContent = `${daysCount} ${daysCount === 1 ? 'zi' : 'zile'} × 1 loc × ${pricePerRide} lei`;
  if (returnDescEl) returnDescEl.textContent = includeReturn ? `Inclusă (+${daysCount * 8} lei după ore)` : 'Doar dimineața (spre școală)';
  if (totalEl) totalEl.textContent = `${total} lei`;
  if (confirmBtn) confirmBtn.textContent = `Confirmă rezervarea săptămânală · ${total} lei`;
}

/**
 * Interactive 5-Star Rating (Screen 14)
 */
function initStarRating() {
  const starBtns = document.querySelectorAll('.star-btn');
  starBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = parseInt(btn.dataset.rating, 10);
      AppState.activeBooking.ratingGiven = rating;

      starBtns.forEach((s, idx) => {
        s.classList.toggle('active', idx < rating);
      });

      const label = document.getElementById('ratingLabel');
      if (label) {
        const texts = ['', 'Nesatisfăcător', 'Acceptabil', 'Bun', 'Foarte bun', 'Excelent! Copiii au călătorit în siguranță și s-au bucurat de drum.'];
        label.textContent = texts[rating] || '';
      }
    });
  });
}

/**
 * Animated Car Simulation on Screen 11 (În drum spre școală)
 */
function animateCar() {
  const carMarker = document.getElementById('animatedCarMarker');
  if (!carMarker) return;

  const duration = 8000;
  const start = performance.now();

  function step(time) {
    if (AppState.currentScreen !== 'screen-11') return;
    const elapsed = (time - start) % duration;
    const progress = elapsed / duration;

    // Titan (110, 180) -> Camil Ressu (130, 95) -> Scoala 195 (240, 40)
    let x, y;
    if (progress < 0.5) {
      const t = progress / 0.5;
      x = 110 + (130 - 110) * t;
      y = 180 + (95 - 180) * t;
    } else {
      const t = (progress - 0.5) / 0.5;
      x = 130 + (240 - 130) * t;
      y = 95 + (40 - 95) * t;
    }

    carMarker.setAttribute('transform', `translate(${x}, ${y})`);
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/**
 * Setup All Event Listeners
 */
function setupEventListeners() {
  const screenSelect = document.getElementById('screenSelect');
  if (screenSelect) {
    screenSelect.innerHTML = '';
    ScreenSequence.forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = ScreenTitles[id];
      screenSelect.appendChild(opt);
    });
    screenSelect.value = AppState.currentScreen;
    screenSelect.addEventListener('change', (e) => navigateTo(e.target.value));
  }

  document.querySelectorAll('.dev-btn-mode').forEach(btn => {
    btn.addEventListener('click', () => setDeviceMode(btn.dataset.mode));
  });

  document.getElementById('devBtnPrev')?.addEventListener('click', () => {
    const idx = ScreenSequence.indexOf(AppState.currentScreen);
    if (idx > 0) navigateTo(ScreenSequence[idx - 1]);
  });
  document.getElementById('devBtnNext')?.addEventListener('click', () => {
    const idx = ScreenSequence.indexOf(AppState.currentScreen);
    if (idx < ScreenSequence.length - 1) navigateTo(ScreenSequence[idx + 1]);
  });

  document.getElementById('devBtnReset')?.addEventListener('click', () => {
    AppState.activeBooking.driverConfirmed = true;
    AppState.activeBooking.parentConfirmed = false;
    AppState.user.points = 120;
    navigateTo('screen-05');
    showToast('Datele demo de carpool școlar au fost resetate.');
  });

  // Bottom Navigation
  document.getElementById('navSearch')?.addEventListener('click', () => navigateTo('screen-05'));
  document.getElementById('navRides')?.addEventListener('click', () => navigateTo('screen-17'));
  document.getElementById('navPublish')?.addEventListener('click', () => navigateTo('screen-10'));
  document.getElementById('navProfile')?.addEventListener('click', () => navigateTo('screen-19'));
  document.getElementById('navAccount')?.addEventListener('click', () => navigateTo('screen-01'));

  // Screen 01: Login
  document.getElementById('btnLogin')?.addEventListener('click', () => {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    if (!email || !password) {
      showToast('Introdu emailul școlar și parola.', '!');
      return;
    }
    showToast('Autentificare demonstrativă reușită.');
    navigateTo('screen-05');
  });
  document.getElementById('btnGoRegister')?.addEventListener('click', () => navigateTo('screen-02'));
  document.getElementById('btnForgotPassword')?.addEventListener('click', () => {
    showToast('Pentru resetarea parolei, contactează secretariatul școlii.', 'i');
  });

  // Screen 02: Register
  document.getElementById('btnRegisterNext')?.addEventListener('click', () => {
    const password = document.getElementById('registerPassword')?.value ?? '';
    const confirmPassword = document.getElementById('registerPasswordConfirm')?.value ?? '';
    if (password.length < 8) {
      showToast('Parola trebuie să aibă cel puțin 8 caractere.', '!');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Parolele nu se potrivesc.', '!');
      return;
    }
    navigateTo('screen-03');
  });
  document.getElementById('btnRegisterLogin')?.addEventListener('click', () => navigateTo('screen-01'));

  // Screen 03: KYC
  document.getElementById('btnKycNext')?.addEventListener('click', () => navigateTo('screen-04'));

  // Screen 04: Family Profile & Emergency Setup (No PINs)
  document.getElementById('btnSafetySave')?.addEventListener('click', () => {
    showToast('Profilul de familie și contactul de urgență au fost configurate!');
    navigateTo('screen-05');
  });

  // Screen 05: Home
  document.getElementById('btnHomeSearchRide')?.addEventListener('click', () => navigateTo('screen-06'));
  document.getElementById('btnHomeOfferRide')?.addEventListener('click', () => navigateTo('screen-10'));
  document.getElementById('btnHomeViewSafety')?.addEventListener('click', () => navigateTo('screen-04'));
  document.getElementById('btnHomeImpactDetails')?.addEventListener('click', () => navigateTo('screen-20'));

  // Screen 06: Search
  document.getElementById('btnSearchMatches')?.addEventListener('click', () => navigateTo('screen-07'));

  // Screen 07: Matches
  document.getElementById('btnMatchAlex')?.addEventListener('click', () => navigateTo('screen-08'));

  // Screen 08: Pickup
  document.getElementById('btnPickupSelectSeat')?.addEventListener('click', () => navigateTo('screen-09'));

  // Screen 09: Seat
  document.getElementById('btnConfirmSeat')?.addEventListener('click', () => {
    showToast('Locul lui Matei a fost rezervat cu înălțător auto omologat!');
    navigateTo('screen-18');
  });

  // Screen 10: Publish
  document.getElementById('btnPublishRide')?.addEventListener('click', () => {
    if (AppState.driverDraft.days.length === 0) {
      showToast('Selectează cel puțin o zi pentru cursă.', '!');
      return;
    }
    showToast(`Cursa a fost publicată pentru: ${AppState.driverDraft.days.join(', ')}.`);
    navigateTo('screen-17');
  });

  // Screen 11: Ride in progress
  document.getElementById('btnRideSOS')?.addEventListener('click', () => {
    alert('🚨 SIMULARE ALERTĂ SIGURANȚĂ ȘCOLARĂ\n\nContactul de urgență al copilului și dispeceratul școlii primesc locația în timp real a mașinii.');
  });
  document.getElementById('btnRideShareFriend')?.addEventListener('click', () => navigateTo('screen-15'));
  document.getElementById('btnSimulateDeviation')?.addEventListener('click', () => navigateTo('screen-12'));
  document.getElementById('btnRideArrived')?.addEventListener('click', () => navigateTo('screen-13'));

  // Screen 12: Route deviation
  document.getElementById('btnDeviationSOS')?.addEventListener('click', () => {
    alert('🚨 ALERTĂ SOS: Transmisă către părinți și secretariatul școlii.');
  });
  document.getElementById('btnDeviationBack')?.addEventListener('click', () => navigateTo('screen-11'));
  document.getElementById('btnDeviationArrived')?.addEventListener('click', () => navigateTo('screen-13'));

  // Screen 13: School Arrival
  document.getElementById('btnConfirmArrival')?.addEventListener('click', () => {
    AppState.activeBooking.parentConfirmed = true;
    AppState.user.points += 10;
    showToast('Copilul a fost predat în siguranță la poarta școlii! +10 Puncte Erou Verde.');
    navigateTo('screen-14');
  });

  // Screen 14: Review
  document.getElementById('btnSubmitReview')?.addEventListener('click', () => {
    showToast('Evaluarea cursei a fost salvată. Mulțumim!');
    navigateTo('screen-21');
  });
  document.getElementById('btnRatingGoHome')?.addEventListener('click', () => navigateTo('screen-05'));

  // Screen 15: Share
  document.getElementById('btnShareBackToRide')?.addEventListener('click', () => navigateTo('screen-11'));

  // Screen 17: My Rides
  document.getElementById('btnMyRidesViewAlex')?.addEventListener('click', () => navigateTo('screen-11'));
  document.getElementById('tabMyRidesUpcoming')?.addEventListener('click', () => {
    document.getElementById('tabMyRidesUpcoming').classList.add('active');
    document.getElementById('tabMyRidesHistory').classList.remove('active');
    document.getElementById('ridesUpcomingList').style.display = 'block';
    document.getElementById('ridesHistoryList').style.display = 'none';
  });
  document.getElementById('tabMyRidesHistory')?.addEventListener('click', () => {
    document.getElementById('tabMyRidesHistory').classList.add('active');
    document.getElementById('tabMyRidesUpcoming').classList.remove('active');
    document.getElementById('ridesUpcomingList').style.display = 'none';
    document.getElementById('ridesHistoryList').style.display = 'block';
  });

  // Screen 18: Calendar
  document.getElementById('btnConfirmCalendar')?.addEventListener('click', () => {
    showToast('Programarea săptămânală la școală a fost confirmată!');
    navigateTo('screen-11');
  });

  // Screen 19: Profile
  document.getElementById('btnProfileViewImpact')?.addEventListener('click', () => navigateTo('screen-20'));
  document.getElementById('btnProfileViewRewards')?.addEventListener('click', () => navigateTo('screen-21'));
  document.getElementById('btnSaveProfile')?.addEventListener('click', () => {
    const kidNameInput = document.getElementById('inputKidName');
    const kidGradeInput = document.getElementById('inputKidGrade');
    const kidBioInput = document.getElementById('inputKidBio');

    if (kidNameInput) AppState.user.child.name = kidNameInput.value;
    if (kidGradeInput) AppState.user.child.grade = kidGradeInput.value;
    if (kidBioInput) AppState.user.child.bio = kidBioInput.value;

    showToast('Profilul elevului și interesele AI au fost salvate cu succes! 🎒', '✓');
  });

  // Screen 20: Impact
  document.getElementById('btnImpactViewHistory')?.addEventListener('click', () => navigateTo('screen-17'));

  // Screen 21: Rewards
  document.getElementById('btnUnlockThemeGreen')?.addEventListener('click', (e) => {
    showToast('Insigna Erou Verde Școlar a fost activată!');
    e.target.textContent = 'Activată';
    e.target.style.background = '#2563EB';
  });
  document.getElementById('btnRewardsGotIt')?.addEventListener('click', () => navigateTo('screen-19'));

  // Desktop Dashboard Tabs
  document.querySelectorAll('.dash-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.dash-nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      showToast(`Panou activat: ${link.textContent}`);
    });
  });
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initDriverDaySelector();
  initSeatSelector();
  initInterestToggles();
  initCalendarBooking();
  initStarRating();

  navigateTo(AppState.currentScreen);
  console.log('Aplicația pentru naveta școlară a fost inițializată.');
});
