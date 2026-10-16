// Runs every `test:*` script from package.json except the browser ones (`test:e2e-*`, which need a
// running server) and `test:all` itself, one after another, and exits 1 if any of them fails.
// Used by CI (.github/workflows/ci.yml) and locally: `npm run test:all`.
//
// Each script gets its own process and a time limit; a failure prints the last lines of that
// script's output so the CI log shows why without scrolling through the passing ones.
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// lib/client-pdf.ts points pdf.js at its worker with
// `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`. A bundler resolves that to
// node_modules; plain Node (every test script here) resolves it relative to lib/, so the tests need
// a copy at lib/pdfjs-dist/build/. The copy is gitignored and never deployed — a fresh clone or CI
// gets it here, from the installed package, so its version always matches.
const workerDir = join(root, 'lib', 'pdfjs-dist', 'build');
mkdirSync(workerDir, { recursive: true });
copyFileSync(
  join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
  join(workerDir, 'pdf.worker.min.mjs'),
);
const scripts = Object.keys(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts)
  .filter((name) => name.startsWith('test:') && !name.startsWith('test:e2e') && name !== 'test:all');

const LIMIT_MS = 10 * 60 * 1000;
const failed = [];
const started = Date.now();
for (const [i, name] of scripts.entries()) {
  const t0 = Date.now();
  const run = spawnSync('npm', ['run', '-s', name], {
    cwd: root, encoding: 'utf8', shell: true, timeout: LIMIT_MS, maxBuffer: 64 * 1024 * 1024,
  });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const ok = run.status === 0;
  console.log(`[${String(i + 1).padStart(3)}/${scripts.length}] ${ok ? 'PASS' : 'FAIL'} ${name} (${secs}s)`);
  if (!ok) {
    failed.push(name);
    const out = `${run.stdout ?? ''}${run.stderr ?? ''}${run.error ? `\n${run.error.message}` : ''}`;
    console.log(out.split('\n').slice(-30).map((l) => `      ${l}`).join('\n'));
  }
}
const mins = ((Date.now() - started) / 60000).toFixed(1);
console.log(`\n${scripts.length - failed.length}/${scripts.length} passed in ${mins} min${failed.length ? `; failed: ${failed.join(', ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
