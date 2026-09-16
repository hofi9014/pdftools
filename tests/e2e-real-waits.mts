// Audit finding (Medium, tooling area) — e2e/*.mts had 40+ uses of page.waitForTimeout(...) or
// a local sleep() helper instead of waiting on a real selector or network response, a classic
// flaky-test pattern (fixed durations either waste time when the UI is fast, or flake when it's
// slow).
//
// Fixing this surfaced a genuine, separate bug in sharepoint-flow.mts: many of its checks called
// `locator.isVisible({ timeout: N })`, but Playwright's own type definitions mark that option
// deprecated and explicitly document it as a no-op — "does not wait for the element to become
// visible and returns immediately." Every one of those checks only ever appeared to work because
// of a waitForTimeout(...) blindly placed right before it. Simply deleting those timeouts (the
// naive reading of this task) would have broken the tests by making the checks fire before the
// UI updates. The real fix pairs each one with a genuinely-waiting replacement
// (locator.waitFor({ state: 'visible', timeout }), used via a small isVisibleWithin() helper).
//
// Per this task's own guidance, a few waits with no observable DOM/network signal (app-internal
// setInterval polling loops with nothing to select on, and SW-cache-population timing) were kept
// deliberately rather than forced onto an artificial selector — but even those were upgraded
// from "blindly wait the full duration" to "poll the real condition, bounded by the same ceiling
// as before" wherever the condition could be checked from Node (localStorage state, cache
// contents), which resolves early instead of always waiting the maximum.
//
// Every file was run live against a real dev server before and after these changes, comparing
// full output (not just exit codes) to confirm identical behavior — see the commit message for
// each file's specific before/after evidence. This test checks the resulting source statically:
// what's gone, what replaced it, and that the deliberately-kept waits are documented as such.

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

console.log('=== e2e/*.mts: real waits instead of blind fixed-duration sleeps ===');

const here = dirname(fileURLToPath(import.meta.url));
const e2eDir = join(here, '..', 'e2e');

function src(file: string): string {
  return readFileSync(join(e2eDir, file), 'utf-8');
}

console.log('--- language-detection.mts: the one redundant wait (waitForFunction already polls) is gone ---');
check(!/waitForTimeout/.test(src('language-detection.mts')), 'no waitForTimeout remains');

console.log('\n--- mobile-menu.mts: every sleep replaced with a real condition wait ---');
{
  const s = src('mobile-menu.mts');
  check(!/\bsleep\(/.test(s) && !/function sleep/.test(s), 'the sleep() helper and every call to it are gone');
  check(s.includes('waitForPanelState'), 'accordion expand/collapse now polls the actual panel DOM state instead of guessing a delay');
  check(s.includes("hamburger.waitFor({ state: 'visible'"), 'the hamburger button check now really waits for visibility');
}

console.log('\n--- offline-guard.mts: waits replaced, AND a genuine pre-existing bug fixed ---');
{
  const s = src('offline-guard.mts');
  check(!/\bsleep\(/.test(s) && !/function sleep/.test(s), 'the sleep() helper and every call to it are gone');
  check(s.includes('context.setOffline(false)'), 'the script now restores online state before its final navigation — previously that goto() always failed with ERR_INTERNET_DISCONNECTED because the context was left offline from step 2 onward and never restored');
  check(s.includes("waitFor({ state: 'hidden'"), 'dropdown close/reopen is now confirmed via real visibility-state waits, not guessed delays');
}

console.log('\n--- onedrive-stale-token.mts: polling helper replaces blind waits for an internal interval ---');
{
  const s = src('onedrive-stale-token.mts');
  check(!/waitForTimeout/.test(s), 'no waitForTimeout remains');
  check(s.includes('async function waitForCondition'), 'a polling helper is defined for waits with no DOM signal (an app-internal setInterval)');
  check((s.match(/await waitForCondition\(/g) || []).length === 3, 'all 3 interval-tick waits (cleanup, fresh key, late key) now poll the real localStorage condition instead of blindly waiting the full duration');
}

console.log('\n--- sw-cache.mts: waits replaced, one kept deliberately and documented ---');
{
  const s = src('sw-cache.mts');
  check(!/\bsleep\(/.test(s) && !/function sleep\(/.test(s), 'the sleep() helper and its trivial call sites are gone');
  check(s.includes('async function waitForCondition'), 'a polling helper replaces the blind wait for the OneDrive-token interval to consume an injected key');
  check(/genuine settling wait, kept deliberately/i.test(s), 'the one wait kept without a DOM signal (waiting for the OAuth interval to start, nothing observable until it finds a key) is explicitly documented as such, not just silently left');
}

console.log('\n--- sw-offline.mts: reachable-in-dev waits fixed and proven behavior-identical; unreachable branch left untouched ---');
{
  const s = src('sw-offline.mts');
  check(!/function sleep\(/.test(s), 'the sleep() helper definition is gone');
  check(s.includes('async function waitForCondition'), 'cache-population waits (steps 1-3, which DO run against a dev server) now poll the real cache state');
  check(/not verified live in this session for that reason/.test(s), 'the step-4 offline branch (unreachable in `next dev` — this script self-aborts before reaching it, confirmed live) is explicitly documented as unverified rather than silently changed');
}

console.log('\n--- sharepoint-flow.mts: the isVisible({timeout}) no-op bug fixed everywhere it appeared ---');
{
  const s = src('sharepoint-flow.mts');
  // Strip line comments before the two "gone" checks below — the file's own top-of-file doc
  // comment deliberately names both patterns as an explanation of the bug being fixed.
  const codeOnly = s.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
  check(s.includes('function isVisibleWithin'), 'a real, actually-waiting replacement for isVisible({timeout}) is defined');
  check(!/isVisible\(\{\s*timeout/.test(codeOnly), 'no remaining isVisible({ timeout }) no-op calls anywhere in the file (outside the explanatory comment)');
  check(!/waitForTimeout/.test(codeOnly), 'no waitForTimeout remains outside the explanatory comment — every one was either redundant next to an already-auto-waiting .click()/.fill()/.waitForSelector(), or replaced by isVisibleWithin/waitFor');
  check((s.match(/isVisibleWithin\(/g) || []).length >= 10, 'isVisibleWithin is actually used at every site that used to have the broken pattern');
  check(s.includes('/pl/merge'), 'navigates to the explicit /pl/merge route instead of relying on ambiguous locale auto-detection for the bare /merge path — this script asserts on Polish button text, and a fresh context\'s auto-detected redirect target was not reliable in this dev environment');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
