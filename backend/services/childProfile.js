// Crearea profilului unui copil (date introduse de părinte)

const validate = require('../utils/validate');
const { badRequest } = require('../utils/http');
const { ageOn } = require('./seats');

// Clasele din învățământul preuniversitar românesc
const GRADE_LEVELS = ['pregătitoare', 'I', 'a II-a', 'a III-a', 'a IV-a', 'a V-a', 'a VI-a', 'a VII-a',
  'a VIII-a', 'a IX-a', 'a X-a', 'a XI-a', 'a XII-a'];

function childInput(body) {
  const fullName = validate.fullName(body.childName);
  const birthDate = String(body.childBirthDate || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(birthDate))) {
    throw badRequest('Data nașterii copilului nu este validă');
  }
  const age = ageOn(birthDate);
  if (age < 5 || age > 20) throw badRequest('Copilul trebuie să aibă între 5 și 20 de ani');
  if (!GRADE_LEVELS.includes(body.childGradeLevel)) throw badRequest('Alege clasa copilului');
  const letter = String(body.childGradeLetter || '').trim().toUpperCase();
  if (letter && !/^[A-Z]$/.test(letter)) throw badRequest('Litera clasei trebuie să fie o singură literă (A-Z)');
  const grade = `Clasa ${body.childGradeLevel}${letter ? ` ${letter}` : ''}`;
  return { fullName, birthDate, grade };
}

async function createChild(client, parentId, schoolId, body) {
  const { fullName, birthDate, grade } = childInput(body);
  const { rows: [school] } = await client.query('SELECT 1 FROM schools WHERE school_id = $1', [schoolId]);
  if (!school) throw badRequest('Școala selectată nu există');
  const { rows: [dup] } = await client.query(
    'SELECT 1 FROM children WHERE parent_id = $1 AND lower(full_name) = lower($2)', [parentId, fullName]
  );
  if (dup) throw badRequest('Ai adăugat deja un copil cu acest nume');
  const { rows: [child] } = await client.query(
    `INSERT INTO children (parent_id, school_id, full_name, birth_date, grade)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [parentId, schoolId, fullName, birthDate, grade]
  );
  return child;
}

module.exports = { createChild, GRADE_LEVELS };
