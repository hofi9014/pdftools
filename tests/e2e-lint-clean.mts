// Audit finding (Medium, tooling area) — e2e/*.spec.ts had 3 no-explicit-any errors and 4
// unused-variable warnings, inside eslint's own configured scope (so they show up in a plain
// `npm run lint`, not some opt-in extra check).
//
// Fixed by removing 3 genuinely dead variables (assigned, never read: pwa-audit.spec.ts's
// manifestValid, sharepoint-flow.spec.ts's MOCK_TOKEN, sw-cache.spec.ts's swActivated, plus
// verify-search-endpoint.ts's unused `orig` capture of window.open) and replacing 3 `any`s with
// real types (pwa-audit.spec.ts's icon map callback -> `{ sizes: string }`, sw-offline.spec.ts's
// `page: any` -> Playwright's own `Page` type, verify-search-endpoint.ts's `as any` window stub
// -> `as unknown as Window`).
//
// This test shells out to the real `eslint` CLI against the real, current e2e/ directory —
// exactly what `npm run lint` runs — rather than re-implementing any linting logic.

import { execFileSync } from 'node:child_process';
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

console.log('=== e2e/*.spec.ts: eslint scope is clean ===');

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

function runEslintOnE2e(): { exitCode: number; output: string } {
  try {
    const output = execFileSync('npx', ['eslint', 'e2e/'], { cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], shell: true });
    return { exitCode: 0, output };
  } catch (e: unknown) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { exitCode: err.status ?? 1, output: (err.stdout ?? '') + (err.stderr ?? '') };
  }
}

const result = runEslintOnE2e();
check(result.exitCode === 0, `eslint e2e/ exits 0 (same as npm run lint would report for this directory) — exit ${result.exitCode}`);
check(!/error/i.test(result.output), 'no error-level eslint problems remain in e2e/');
check(!/warning/i.test(result.output), 'no warning-level eslint problems remain in e2e/ either');
check(!result.output.includes('no-explicit-any'), 'no-explicit-any is fully resolved');
check(!result.output.includes('no-unused-vars'), 'no-unused-vars is fully resolved');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
