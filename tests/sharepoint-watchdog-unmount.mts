// Audit findings (Medium, backend area) — SharePointPickerDialog.tsx was missing two things
// its Google/Dropbox/OneDrive sibling OAuth flows already had:
//
//  1. A 120s watchdog (the SEC-013 pattern): a stuck popup that never closes and never posts
//     a token left the dialog showing "Signing in..." forever, with no forced timeout.
//  2. True unmount cleanup: the popup/interval/message-listener were only torn down when the
//     `open` prop transitioned to false (via closePopup() in that effect) — if the parent
//     removed the dialog from the tree directly, without first flipping `open`, the listener
//     (a closure over component state setters) stayed attached to `window` forever, and any
//     in-flight popup/interval kept running.
//
// Fixed by consolidating teardown into one closePopup() (closes the popup, clears the
// interval, clears a new watchdog timeout, and removes the message listener via a ref so it
// can be found from outside startOAuth()), called from: the open-driven effect (unchanged
// behavior), a genuine unmount effect (new), and every exit path inside startOAuth itself
// (success/cancelled/timeout) instead of each hand-rolling its own partial cleanup.
//
// This component drives a real browser OAuth popup + window.postMessage — not practically
// mountable/unmountable in a Node test without new browser-simulation infrastructure this
// project doesn't otherwise use. Verified at the source level instead: the watchdog exists
// with the same 120000ms as the sibling flows, and every one of startOAuth's exit paths plus
// a real unmount effect call the single closePopup() that clears all four resources.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== SharePointPickerDialog: 120s watchdog + real unmount cleanup, matching the other providers ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'components', 'SharePointPickerDialog.tsx'), 'utf-8');

function extractBalanced(text: string, openIndex: number): string {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(openIndex, i + 1);
    }
  }
  throw new Error('unbalanced braces');
}

// --- closePopup is the one place that tears down everything ---
const closePopupStart = src.indexOf('const closePopup = useCallback(() => {');
check(closePopupStart !== -1, 'sanity: found closePopup()');
const closePopupBody = extractBalanced(src, src.indexOf('{', closePopupStart));
check(closePopupBody.includes('popupRef.current.close()'), 'closePopup() closes the popup window');
check(closePopupBody.includes('clearInterval(intervalRef.current)'), 'closePopup() clears the polling interval');
check(closePopupBody.includes('clearTimeout(watchdogRef.current)'), 'closePopup() clears the new watchdog timeout');
check(closePopupBody.includes("window.removeEventListener('message', handlerRef.current)"), 'closePopup() removes the message listener via a ref (reachable from outside startOAuth)');

// --- a real unmount effect calls it ---
const mountedEffectMatch = src.match(/useEffect\(\(\) => \{\s*mountedRef\.current = true;/);
check(!!mountedEffectMatch, 'sanity: found the mount/unmount effect');
const mountedEffectStart = mountedEffectMatch ? mountedEffectMatch.index! : -1;
const mountedEffectBody = extractBalanced(src, src.indexOf('{', mountedEffectStart));
check(mountedEffectBody.includes('closePopup()'), 'the unmount cleanup function calls closePopup() — real teardown on unmount, not just when `open` goes false');

// --- startOAuth: the watchdog exists with the same 120000ms used by Google/Dropbox/OneDrive ---
const startOAuthStart = src.indexOf('const startOAuth = useCallback(() => {');
check(startOAuthStart !== -1, 'sanity: found startOAuth()');
const startOAuthFnBody = extractBalanced(src, src.indexOf('{', src.indexOf('=>', startOAuthStart)));
check(/watchdogRef\.current = setTimeout\(/.test(startOAuthFnBody), 'startOAuth() sets a watchdog timeout');
check(/,\s*120000\s*\)/.test(startOAuthFnBody), "the watchdog uses 120000ms, matching Google/Dropbox/OneDrive's own 120s pattern");

// --- every exit path in startOAuth uses the single closePopup(), not ad-hoc partial cleanup ---
const successHandlerMatch = startOAuthFnBody.match(/const handler = \(e: MessageEvent\) => \{[\s\S]*?\n {4}\};/);
check(!!successHandlerMatch && successHandlerMatch[0].includes('closePopup()'), 'the success (message received) path calls closePopup()');

const intervalMatch = startOAuthFnBody.match(/intervalRef\.current = setInterval\(\(\) => \{[\s\S]*?\n {4}\}, 500\);/);
check(!!intervalMatch && intervalMatch[0].includes('closePopup()'), 'the "popup was closed by the user" path calls closePopup()');

const watchdogMatch = startOAuthFnBody.match(/watchdogRef\.current = setTimeout\(\(\) => \{[\s\S]*?\n {4}\}, 120000\);/);
check(!!watchdogMatch && watchdogMatch[0].includes('closePopup()'), 'the watchdog timeout path itself calls closePopup()');
check(!!watchdogMatch && /setError\(['"]Login timeout['"]\)/.test(watchdogMatch[0]), 'the watchdog surfaces a clear "Login timeout" error to the user, not a silent hang');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
