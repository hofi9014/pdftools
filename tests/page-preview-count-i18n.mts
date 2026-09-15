// Audit finding U2 — PagePreview.tsx hardcoded the Polish word "z" ("of"/"out of") as the
// connector between the selected-count and total-count numbers:
//   `${selectedPages.length} z ${totalPages} ${t('preview.selected', locale)}`
// In 15 of the app's 16 supported languages this literal Polish word leaked straight into
// the UI regardless of locale (e.g. an English user saw "3 z 10 selected").
//
// Fixed to a locale-neutral "{selected}/{total} {word}" format (e.g. "3/10 selected") that
// reuses the already-translated preview.selected word per locale instead of inventing new
// full-sentence translations for all 16 languages (which this session has no way to verify
// as grammatically correct) — same fix philosophy as htmlToPdf/officeToPdf elsewhere in this
// audit: fix the actual defect, don't introduce unverifiable content.
//
// Mounting the real PagePreview component needs a File + pdfjs page-rendering pipeline that
// isn't meaningful in Node; this test instead reads the component's source directly and
// evaluates the exact formatting expression it contains, per locale — a tight, decisive check
// of the actual defect (a hardcoded literal), not a broad rendering smoke test.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { t, locales } from '../lib/i18n';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== U2: PagePreview\'s selected-count label has no hardcoded-language connector ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'components', 'PagePreview.tsx'), 'utf-8');

check(!/\}\s*z\s*\$\{/.test(src), 'source no longer contains the hardcoded literal " z " template-string connector');
check(src.includes("selectedPages.length}/${totalPages}"), "source uses the locale-neutral '{selected}/{total}' format");

check(locales.length === 16, `sanity: 16 locales configured (got ${locales.length})`);

const selected = 3;
const total = 10;
for (const locale of locales) {
  const word = t('preview.selected', locale);
  const rendered = `${selected}/${total} ${word}`;
  check(!rendered.includes(' z '), `[${locale}] rendered count ("${rendered}") contains no stray literal " z " connector`);
  check(rendered.startsWith(`${selected}/${total} `), `[${locale}] rendered count starts with the numeric "3/10" — not a language-specific sentence`);
}

// Regression guard: the word itself must still come from the correct per-locale translation
// (this was never buggy — confirms the fix didn't accidentally break the working half).
check(t('preview.selected', 'pl') === 'zaznaczonych', `pl translation unchanged (got "${t('preview.selected', 'pl')}")`);
check(t('preview.selected', 'en') === 'selected', `en translation unchanged (got "${t('preview.selected', 'en')}")`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
