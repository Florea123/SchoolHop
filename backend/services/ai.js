const { ageOn } = require('./seats');

const WEIGHTS = {
  sameClass: 0.30,      // aceeași clasă (ex: „Clasa a VI-a B”)
  sameGradeLevel: 0.15, // același an de studiu, altă literă
  interests: 0.40,      // similaritate Jaccard a intereselor
  sameArea: 0.10,
  closeAge: 0.05,
};

// „Clasa a VI-a B” -> { level: 'VI', letter: 'B' }
function parseGrade(grade) {
  const m = /a\s+([IVX]+)-a\s*([A-Z])?/i.exec(grade || '');
  return m ? { level: m[1].toUpperCase(), letter: (m[2] || '').toUpperCase() } : { level: grade, letter: '' };
}

function firstName(fullName) {
  return String(fullName || '').trim().split(/\s+/)[0];
}

function scoreChildren(a, b, interestLabels = {}) {
  if (a.child_id === b.child_id || a.school_id !== b.school_id) return null;

  const ia = new Set(a.interests || []);
  const ib = new Set(b.interests || []);
  const common = [...ia].filter((x) => ib.has(x));
  const union = new Set([...ia, ...ib]);
  const jaccard = union.size ? common.length / union.size : 0;

  const ga = parseGrade(a.grade);
  const gb = parseGrade(b.grade);
  const sameClass = a.grade === b.grade;
  const sameLevel = !sameClass && ga.level === gb.level;
  const sameArea = a.home_village_or_area && a.home_village_or_area === b.home_village_or_area;
  const ageDiff = Math.abs(ageOn(a.birth_date) - ageOn(b.birth_date));

  let score = WEIGHTS.interests * jaccard;
  if (sameClass) score += WEIGHTS.sameClass;
  if (sameLevel) score += WEIGHTS.sameGradeLevel;
  if (sameArea) score += WEIGHTS.sameArea;
  if (ageDiff <= 1) score += WEIGHTS.closeAge;
  score = Math.round(Math.min(1, score) * 100) / 100;

  const reasons = [];
  if (sameClass) reasons.push(`colegi în ${a.grade}`);
  else if (sameLevel) reasons.push(`același an de studiu (clasa a ${ga.level}-a)`);
  if (common.length) reasons.push(`pasiuni comune: ${common.map((s) => interestLabels[s] || s).join(', ')}`);
  if (sameArea) reasons.push(`locuiesc amândoi în ${a.home_village_or_area}`);

  return { score, commonInterests: common, reasons, sameClass };
}

function templateRecommendation(a, b, match) {
  const names = `${firstName(a.full_name)} și ${firstName(b.full_name)}`;
  if (match.commonInterests.length) return `${names} au ce povesti pe drum: drumul împreună spre școală îi poate apropia.`;
  if (match.sameClass) return `${names} sunt colegi de clasă: pot merge împreună în fiecare dimineață.`;
  return `${names} merg la aceeași școală și pot deveni colegi de drum.`;
}

// Punct de integrare pentru un model AI extern (de implementat de echipă).
// Trebuie să întoarcă textul generat sau null; la null se folosește textul generat local.
// eslint-disable-next-line no-unused-vars
async function generateText(instructions, input) {
  return null;
}

async function recommendationText(a, b, match, interestLabels) {
  const llm = await generateText(
    'Ești asistentul unei aplicații românești de carpooling școlar pentru copii. Scrii o singură frază caldă, '
    + 'de maximum 30 de cuvinte, pentru părinți, despre de ce doi copii s-ar înțelege bine pe drumul spre școală. '
    + 'Nu inventa fapte în afara celor primite. Răspunde doar cu fraza.',
    JSON.stringify({
      copil1: { prenume: firstName(a.full_name), clasa: a.grade },
      copil2: { prenume: firstName(b.full_name), clasa: b.grade },
      motive: match.reasons,
      interese_comune: match.commonInterests.map((s) => interestLabels[s] || s),
    })
  );
  return llm || templateRecommendation(a, b, match);
}

// Bancă de întrebări per interes (folosită fără cheie API)
const QUESTION_BANK = {
  robotica: 'Dacă ați construi azi un robot care să vă ajute la școală, ce ar ști să facă?',
  lego: 'Ce clădire uriașă din Iași ați reconstrui din piese Lego și cum ați începe?',
  fotbal: 'Dacă ați fi antrenorii echipei școlii, ce tactică nouă ați încerca la următorul meci?',
  sah: 'Care piesă de șah vă seamănă cel mai mult și de ce?',
  pian: 'Ce melodie v-ar plăcea să puteți cânta la pian până în vacanță?',
  desen: 'Dacă ați picta drumul de azi spre școală, ce culori ați folosi?',
  inot: 'Dacă ați putea înota cu orice animal marin, pe care l-ați alege?',
  dans: 'Ce dans ați inventa pentru serbarea clasei și cum s-ar numi?',
  matematica: 'Câte mașini credeți că trec pe lângă noi până la școală? Faceți o estimare!',
  lectura: 'Ce personaj dintr-o carte ați vrea să vină cu voi azi la ore?',
  stiinta: 'Ce experiment ați face dacă ați avea laboratorul școlii doar pentru voi o zi?',
  muzica: 'Ce cântec ar fi imnul perfect al drumului vostru spre școală?',
  astronomie: 'Dacă ați putea vizita o singură planetă, care ar fi și ce ați lua cu voi?',
  dinozauri: 'Ce dinozaur ar fi cel mai bun coleg de bancă și de ce?',
  baschet: 'Cine din mașină ar câștiga un concurs de aruncări libere? Argumentați!',
  _default: 'Care este lucrul pe care îl așteptați cel mai mult azi la școală?',
};

function dayIndex(date) {
  return Math.floor(new Date(date).getTime() / 86400000);
}

// children: copiii din mașină; interestLabels: slug -> etichetă
async function dailyQuestion(children, interestLabels, date) {
  const counts = new Map();
  children.forEach((c) => (c.interests || []).forEach((i) => counts.set(i, (counts.get(i) || 0) + 1)));
  const ranked = [...counts.entries()].sort((x, y) => y[1] - x[1]).map(([slug]) => slug);
  const shared = ranked.filter((s) => counts.get(s) > 1);
  const pool = (shared.length ? shared : ranked).filter((s) => QUESTION_BANK[s]);

  const llm = await generateText(
    'Ești asistentul unei aplicații românești de carpooling școlar. Propui o singură întrebare amuzantă și '
    + 'potrivită vârstei, pe care copiii din mașină și-o pot discuta pe drum spre școală. Fără date personale. '
    + 'Răspunde doar cu întrebarea, în limba română, maximum 25 de cuvinte.',
    JSON.stringify({
      copii: children.map((c) => ({ prenume: firstName(c.full_name), varsta: ageOn(c.birth_date) })),
      interese_comune: (shared.length ? shared : ranked).slice(0, 4).map((s) => interestLabels[s] || s),
    })
  );
  if (llm) return llm;
  if (!pool.length) return QUESTION_BANK._default;
  return QUESTION_BANK[pool[dayIndex(date) % pool.length]];
}

module.exports = { scoreChildren, recommendationText, templateRecommendation, dailyQuestion, firstName, isLlmEnabled: () => false };
