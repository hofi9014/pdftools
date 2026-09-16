// Audit finding (Medium, ui area) — the show/hide-password button in both protect-pdf and
// unlock-pdf was a plain emoji-only <button> with no aria-label/aria-pressed, duplicated
// identically in both files. A screen reader user got no indication of what the button does
// or its current state.
//
// Fixed by adding new shared i18n keys (password.show / password.hide, all 16 locales) and
// aria-label (switching text with state) + aria-pressed + type="button" to both buttons —
// applied directly to both files rather than extracting a shared PasswordInput component,
// since each page's surrounding markup (strength meter in protect-pdf, an optional-password
// note in unlock-pdf) differs enough that extraction would be a larger, riskier change than
// this accessibility fix calls for.

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

console.log('=== protect-pdf / unlock-pdf: password toggle button has a real accessible name and state ===');

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

for (const page of ['protect-pdf', 'unlock-pdf']) {
  const src = readFileSync(join(root, 'app', page, 'page.tsx'), 'utf-8');
  const buttonMatch = src.match(/<button[\s\S]*?onClick=\{\(\) => setShowPassword\(!showPassword\)\}[\s\S]*?<\/button>/);
  check(!!buttonMatch, `[${page}] sanity: found the password-toggle button`);
  if (buttonMatch) {
    const btn = buttonMatch[0];
    check(btn.includes('type="button"'), `[${page}] the button is explicitly type="button" (won't submit a form on click)`);
    check(/aria-label=\{t\(showPassword \? 'password\.hide' : 'password\.show', locale\)\}/.test(btn), `[${page}] aria-label switches between the translated show/hide labels based on state`);
    check(/aria-pressed=\{showPassword\}/.test(btn), `[${page}] aria-pressed reflects the current toggle state`);
  }
}

console.log('\n--- i18n: password.show / password.hide exist and are distinct in all 16 locales ---');
check(locales.length === 16, `sanity: 16 locales configured (got ${locales.length})`);
for (const locale of locales) {
  const show = t('password.show', locale);
  const hide = t('password.hide', locale);
  check(show !== 'password.show', `[${locale}] password.show has a real translation, not a fallback to the raw key (got "${show}")`);
  check(hide !== 'password.hide', `[${locale}] password.hide has a real translation, not a fallback to the raw key (got "${hide}")`);
  check(show !== hide, `[${locale}] show and hide labels are actually different strings, not duplicated (show="${show}", hide="${hide}")`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
