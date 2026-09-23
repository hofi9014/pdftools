// Audit finding (Medium, UI area) — app/add-page/page.tsx's handleSubmit computed
// `pos = parseInt(customIndex, 10) - 1` for the "custom position" option with no validation.
// The <input type="number" min="1"> is only a soft HTML hint — a user can still clear the field
// entirely or type "0"/a negative number. parseInt('', 10) - 1 = NaN, and
// parseInt('0', 10) - 1 = -1 — both fail addBlankPage()'s `position >= 0` check
// (lib/client-pdf.ts) and silently fall through to its `else { pdf.addPage(); }` branch,
// appending the blank page at the very end of the document — a materially different,
// unrequested result — while the tool still reported "✅ Sukces" with zero indication the typed
// value was invalid or ignored.
//
// Fixed by validating customIndex parses to a genuine positive integer (>= 1) BEFORE calling
// addBlankPage, surfacing a clear error instead of silently falling through to the wrong
// result.
//
// Testing note: handleSubmit is a closure inside a React component, not an exported function,
// so this proves the fix two ways — (1) a source-level check that the real component code has
// the validation guard in the right place (before the addBlankPage call, inside the 'custom'
// branch); (2) a standalone evaluation of the EXACT SAME validation expression
// (`!Number.isInteger(parsed) || parsed < 1`, copied verbatim from the source) against a set of
// representative inputs, proving the predicate itself correctly separates valid from invalid
// input.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== source-level: handleSubmit validates the custom position before calling addBlankPage ===');
{
  const src = readFileSync(join(ROOT, 'app', 'add-page', 'page.tsx'), 'utf-8');
  const startIdx = src.indexOf("position === 'custom'");
  const endIdx = src.indexOf('const result = await addBlankPage');
  const branchSrc = src.slice(startIdx, endIdx);
  check(startIdx !== -1 && endIdx !== -1 && startIdx < endIdx, "the 'custom' branch is found and precedes the addBlankPage call");
  check(/Number\.isInteger\(parsed\)/.test(branchSrc), 'the custom branch validates with Number.isInteger (rejects NaN from an empty/non-numeric field)');
  check(/parsed < 1/.test(branchSrc), 'the custom branch rejects values below 1 (0, negative)');
  check(/setError\(/.test(branchSrc) && /return;/.test(branchSrc), 'an invalid value sets an error AND returns early, instead of falling through to addBlankPage with a bad value');
}

console.log('\n=== algorithmic: the exact validation predicate correctly separates valid from invalid input ===');
{
  // Copied verbatim from app/add-page/page.tsx's real validation branch.
  function isValidCustomPosition(customIndex: string): boolean {
    const parsed = parseInt(customIndex, 10);
    return !(!Number.isInteger(parsed) || parsed < 1);
  }

  check(!isValidCustomPosition(''), 'an empty field (NaN) is rejected');
  check(!isValidCustomPosition('0'), '"0" is rejected (not a valid 1-based page position)');
  check(!isValidCustomPosition('-5'), 'a negative number is rejected');
  check(!isValidCustomPosition('abc'), 'non-numeric text is rejected');
  check(isValidCustomPosition('1'), '"1" (insert at the very start) is accepted');
  check(isValidCustomPosition('42'), 'an ordinary positive integer is accepted');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
