// Formular comun pentru datele unui copil (înregistrare, pasul 2, profil)

import { $, html, raw } from './ui.js';
import { check, gradeLabel } from './validate.js';

function dateYearsAgo(years) {
  const d = new Date();
  return new Date(d.getFullYear() - years, d.getMonth(), d.getDate()).toISOString().slice(0, 10);
}

export function childFieldsHtml(prefix, gradeLevels) {
  return html`
    <div class="form-group">
      <label class="form-label" for="${prefix}Name">Numele complet al copilului</label>
      <input class="form-input" id="${prefix}Name" maxlength="100" autocomplete="off">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="${prefix}BirthDate">Data nașterii</label>
        <input class="form-input" type="date" id="${prefix}BirthDate" min="${dateYearsAgo(20)}" max="${dateYearsAgo(5)}">
      </div>
      <div class="form-group">
        <label class="form-label" for="${prefix}GradeLevel">Clasa</label>
        <select class="form-input" id="${prefix}GradeLevel"><option value="">Alege</option>${gradeLevels.map((g) => raw(html`<option value="${g}">${gradeLabel(g)}</option>`))}</select>
      </div>
      <div class="form-group">
        <label class="form-label" for="${prefix}GradeLetter">Litera (opțional)</label>
        <input class="form-input" id="${prefix}GradeLetter" maxlength="1" autocapitalize="characters" placeholder="ex: B">
      </div>
    </div>`;
}

// Întoarce corpul cererii și regulile de validare pentru firstError()
export function readChildFields(prefix) {
  const body = {
    childName: $(`#${prefix}Name`).value.trim(),
    childBirthDate: $(`#${prefix}BirthDate`).value,
    childGradeLevel: $(`#${prefix}GradeLevel`).value,
    childGradeLetter: $(`#${prefix}GradeLetter`).value.trim(),
  };
  const rules = [
    [$(`#${prefix}Name`), check.fullName(body.childName)],
    [$(`#${prefix}BirthDate`), check.birthDate(body.childBirthDate)],
    [$(`#${prefix}GradeLevel`), body.childGradeLevel ? null : 'Alege clasa copilului.'],
    [$(`#${prefix}GradeLetter`), !body.childGradeLetter || /^[A-Za-z]$/.test(body.childGradeLetter) ? null : 'Litera clasei trebuie să fie o singură literă.'],
  ];
  return { body, rules };
}
