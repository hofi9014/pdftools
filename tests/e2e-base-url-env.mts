// Audit finding (Low, tooling area) — every e2e/*.mts script had 'http://localhost:3000'
// hardcoded directly into each page.goto() call, with no way to point them at a different
// environment (staging, a CI-assigned port, etc.) without editing source.
//
// Fixed by adding `const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';` to
// each of the 8 files and routing every navigation through it via template literals.
//
// Fixing this surfaced a second, unrelated bug while auditing every hardcoded URL for the
// replacement: e2e/mobile-menu.mts pointed at 'http://127.0.0.1:3013' — a stale port from some
// earlier dev setup, not the actual dev server's port 3000 used by every other e2e script and
// by npm run dev today. Running it against the real dev server would have silently connected to
// nothing (or a stray leftover process) instead of the app under test. Folded into the same
// BASE_URL default so it now matches every other script and can still be overridden.

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

console.log('=== e2e/*.mts: BASE_URL overridable via E2E_BASE_URL, no more stray hardcoded ports ===');

const here = dirname(fileURLToPath(import.meta.url));
const e2eDir = join(here, '..', 'e2e');

const files = [
  'language-detection.mts', 'mobile-menu.mts', 'offline-guard.mts', 'onedrive-stale-token.mts',
  'pwa-audit.mts', 'sharepoint-flow.mts', 'sw-cache.mts', 'sw-offline.mts',
];

for (const f of files) {
  const src = readFileSync(join(e2eDir, f), 'utf-8');
  check(src.includes("const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';"), `${f}: declares BASE_URL, defaulting to localhost:3000, overridable via E2E_BASE_URL`);
  const withoutDeclaration = src.replace("const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';", '');
  check(!/'http:\/\/localhost:3000/.test(withoutDeclaration), `${f}: no remaining hardcoded 'http://localhost:3000 string outside the BASE_URL declaration itself`);
  check(!/127\.0\.0\.1:3013/.test(src), `${f}: no leftover stale-port (127.0.0.1:3013) reference`);
  check(/page\.goto\(`\$\{BASE_URL\}/.test(src), `${f}: at least one page.goto() actually routes through \${BASE_URL}`);
}

console.log('\n--- behavior check: the override genuinely changes where a script navigates ---');
{
  const { execFileSync } = await import('node:child_process');
  const repoRoot = join(here, '..');
  let output = '';
  try {
    execFileSync('npx', ['tsx', 'e2e/language-detection.mts'], {
      cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], shell: true,
      env: { ...process.env, E2E_BASE_URL: 'http://127.0.0.1:1' },
      timeout: 15000,
    });
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string };
    output = (err.stdout ?? '') + (err.stderr ?? '');
  }
  check(output.includes('127.0.0.1:1'), `overriding E2E_BASE_URL actually redirects navigation to the overridden address (saw it attempt "127.0.0.1:1") — got: ${output.slice(0, 200)}`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
