// Audit finding (Low, tooling area) — e2e/screenshot-rules.ts and verify-search-endpoint.ts are
// diagnostic tools, not automated tests: neither had a real pass/fail signal a CI system (or a
// human glancing only at the exit code) could rely on, and both lived alongside the genuine
// e2e/*.mts test scripts where they're easy to mistake for CI-gating tests.
//
// verify-search-endpoint.ts specifically computed the exact condition it cared about
// (postCalled > 0 && getCalled === 0) and printed "VERIFIED"/"ISSUE" — but never acted on it:
// the script always exited 0 on the happy path regardless of which message printed, so a broken
// endpoint would silently report success to anything checking only the exit code.
//
// Fixed by: (1) moving both files into a new e2e/manual/ directory, visually and structurally
// separating "read the output yourself" diagnostics from real CI-gating tests; (2) making
// verify-search-endpoint.ts call process.exit(1) when its own computed condition is false.
// screenshot-rules.ts has no pass/fail condition to gate on (it's a pure visual/table report for
// human review) — nothing to fix there beyond relocating it.
//
// While moving both files, also found and fixed the same stale-port bug already caught in
// e2e/mobile-menu.mts during the sibling BASE_URL fix: screenshot-rules.ts hardcoded
// `OLD_PORT = 3013` (the variable's own name admits it's stale) instead of the real dev server
// port 3000; verify-search-endpoint.ts also lacked the E2E_BASE_URL override every other e2e
// script now has. Both folded into the same BASE_URL pattern for consistency.

import { readFileSync, existsSync } from 'node:fs';
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

console.log('=== e2e manual diagnostic tools: relocated, real exit code, no stale port ===');

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

console.log('--- relocated out of e2e/ (where they read as CI-gating tests) into e2e/manual/ ---');
check(!existsSync(join(repoRoot, 'e2e', 'screenshot-rules.ts')), 'screenshot-rules.ts is gone from e2e/');
check(!existsSync(join(repoRoot, 'e2e', 'verify-search-endpoint.ts')), 'verify-search-endpoint.ts is gone from e2e/');
check(existsSync(join(repoRoot, 'e2e', 'manual', 'screenshot-rules.ts')), 'screenshot-rules.ts now lives in e2e/manual/');
check(existsSync(join(repoRoot, 'e2e', 'manual', 'verify-search-endpoint.ts')), 'verify-search-endpoint.ts now lives in e2e/manual/');

const verifySrc = readFileSync(join(repoRoot, 'e2e', 'manual', 'verify-search-endpoint.ts'), 'utf-8');
const screenshotSrc = readFileSync(join(repoRoot, 'e2e', 'manual', 'screenshot-rules.ts'), 'utf-8');

console.log('\n--- verify-search-endpoint.ts now actually exits non-zero when its own check fails ---');
check(/const ok = postCalled > 0 && getCalled === 0;/.test(verifySrc), 'the pass/fail condition is captured in a named variable');
check(/if \(!ok\) process\.exit\(1\);/.test(verifySrc), 'a failing check now calls process.exit(1) — the exact bug: computing the condition but never acting on it');

console.log('\n--- both files fixed to use the correct dev server port via the shared BASE_URL pattern ---');
check(!screenshotSrc.includes('OLD_PORT') && !screenshotSrc.includes('3013'), 'screenshot-rules.ts no longer hardcodes the stale port 3013');
check(screenshotSrc.includes("const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';"), 'screenshot-rules.ts now uses the same overridable BASE_URL pattern as every other e2e script');
check(verifySrc.includes("const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';"), 'verify-search-endpoint.ts now also uses BASE_URL (was previously hardcoded with no override)');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
