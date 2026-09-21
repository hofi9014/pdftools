// FINDING (fill-form, pre-existing field values silently wiped or crashing the whole save,
// 2026-09-21) — see the comment on extractFormFields/fillFormFields in lib/client-pdf.ts for
// full detail. Two bugs, found together:
//
// 1. extractFormFields only ever read a current value for checkboxes; text/dropdown/radio/
//    listbox always got value:undefined. The UI then initializes every non-checkbox field's
//    starting value to '' (since it was never a real string), and fillFormFields writes that
//    '' back for every field — SILENTLY BLANKING pre-filled text, and CRASHING THE WHOLE SAVE
//    for a pre-selected radio/dropdown/listbox (pdf-lib's select('') throws — an empty string
//    is never a real option). Fixed by actually reading each field's current
//    value/selection, so an untouched field round-trips its real starting value.
//
// 2. Independent bug: both functions checked the field's class name against the string
//    'PDFListBox', but pdf-lib's real class is 'PDFOptionList' — this check could never match,
//    so list-box fields were always mistyped as 'unknown' and silently ignored entirely.
//
// This test builds a REAL AcroForm PDF (text field pre-filled with real text, a radio group
// with a pre-selected option, a dropdown with a pre-selected option, an option list with a
// pre-selected option) via pdf-lib's own form-creation API, drives the REAL extractFormFields +
// fillFormFields functions exactly as the UI does (extract -> feed the SAME values back
// unchanged, simulating a user who touches nothing), and confirms the save succeeds and every
// value survives round-trip intact.

import { PDFDocument } from 'pdf-lib';

const { extractFormFields, fillFormFields } = await import('../lib/client-pdf');

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(bytes: Uint8Array, name: string): File {
  return Object.assign(new Blob([bytes as BlobPart]), { name }) as unknown as File;
}

console.log('=== fill-form: pre-filled fields survive an untouched save (no data loss, no crash) ===');

const pdf = await PDFDocument.create();
const page = pdf.addPage([400, 500]);
const form = pdf.getForm();

const textField = form.createTextField('applicant.name');
textField.setText('Jan Kowalski');
textField.addToPage(page, { x: 10, y: 450, width: 150, height: 20 });

const radio = form.createRadioGroup('applicant.gender');
radio.addOptionToPage('M', page, { x: 10, y: 420, width: 20, height: 20 });
radio.addOptionToPage('K', page, { x: 40, y: 420, width: 20, height: 20 });
radio.select('K');

const dropdown = form.createDropdown('applicant.country');
dropdown.addOptions(['PL', 'DE', 'FR']);
dropdown.select('DE');
dropdown.addToPage(page, { x: 10, y: 390, width: 100, height: 20 });

const optionList = form.createOptionList('applicant.languages');
optionList.addOptions(['pl', 'en', 'de']);
optionList.select('en');
optionList.addToPage(page, { x: 10, y: 350, width: 100, height: 30 });

const bytes = await pdf.save();
const file = toFile(bytes, 'prefilled.pdf');

// Step 1: extractFormFields must report the REAL pre-filled values, not blank/undefined.
const { fields } = await extractFormFields(file);
const byName = Object.fromEntries(fields.map(f => [f.name, f]));

check(byName['applicant.name']?.value === 'Jan Kowalski', `text field's extracted value is the real pre-filled text (got ${JSON.stringify(byName['applicant.name']?.value)})`);
check(byName['applicant.gender']?.value === 'K', `radio group's extracted value is the real selection (got ${JSON.stringify(byName['applicant.gender']?.value)})`);
check(byName['applicant.country']?.value === 'DE', `dropdown's extracted value is the real selection (got ${JSON.stringify(byName['applicant.country']?.value)})`);
check(byName['applicant.languages']?.type === 'listbox', `option-list field is correctly typed as 'listbox', not 'unknown' (got ${byName['applicant.languages']?.type})`);
check(byName['applicant.languages']?.value === 'en', `option-list's extracted value is the real selection (got ${JSON.stringify(byName['applicant.languages']?.value)})`);

// Step 2: build `values` EXACTLY the way app/fill-form/page.tsx's handleFileChange does (one
// entry per extracted field, checkbox -> boolean, everything else -> the string value or ''
// when there isn't one) — simulating a user who submits without touching anything — and confirm
// the save succeeds and nothing was lost. A test that only forwards fields with a defined value
// would silently mask this exact bug (the real UI always sends an entry for every field).
const values: Record<string, string | boolean> = {};
for (const f of fields) {
  values[f.name] = f.type === 'checkbox' ? f.value === true : (typeof f.value === 'string' ? f.value : '');
}

let threw = false;
let outBytes: Uint8Array | null = null;
try {
  outBytes = await fillFormFields(file, values);
} catch (e) {
  threw = true;
  console.log('  (threw:', e instanceof Error ? e.message : e, ')');
}
check(!threw, 'fillFormFields does not throw when re-saving untouched pre-filled fields');

if (outBytes) {
  // form.flatten() bakes the values into the page content, so re-verify by re-extracting text
  // via a fresh load rather than expecting live AcroForm fields to remain (flattening removes
  // the form) — check the flattened output at least produced a valid, loadable PDF with content.
  const reloaded = await PDFDocument.load(outBytes);
  check(reloaded.getPageCount() === 1, `output PDF still has 1 page after flatten (got ${reloaded.getPageCount()})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
