// scripts/_pdfjs_remap.mjs — the loader that lets `import('pdfjs-dist')` work under Node — is
// referenced by about 70 test and e2e scripts, yet it was never committed: the old blanket
// `*.mjs` rule in .gitignore hid it, and after that rule was narrowed it simply stayed
// untracked. On this machine everything passed; on a fresh clone (or in CI) every pdf.js test
// would die at its first line with "Cannot find module".
//
// This test fails whenever a tracked test refers to a helper under scripts/ or tests/helpers/
// that git does not track.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const tracked = new Set(execSync('git ls-files', { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean));
const testFiles = [...tracked].filter((f) => /^(tests|e2e)\/[^/]+\.mts$/.test(f));
check(testFiles.length > 100, `sanity: found the tracked test scripts (${testFiles.length})`);

const needed = new Map<string, string[]>();
const need = (helper: string, by: string) => needed.set(helper, [...(needed.get(helper) ?? []), by]);
for (const f of testFiles) {
  if (f === 'tests/test-helpers-tracked.mts' || f === 'tests/gitignore-mjs-scope.mts') continue;
  const src = readFileSync(join(ROOT, f), 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  // register('./_pdfjs_remap.mjs', <the scripts directory>)
  for (const m of src.matchAll(/register\(\s*'\.\/([\w.-]+)'/g)) need(`scripts/${m[1]}`, f);
  // join(ROOT, 'scripts/_pdfjs_remap.mjs') and similar literals
  for (const m of src.matchAll(/['"`](?:\.\.\/)?(scripts\/[\w.-]+\.(?:mjs|mts|ts|js))['"`]/g)) need(m[1]!, f);
  // import … from './helpers/x.mts'
  for (const m of src.matchAll(/from\s+'\.\/(helpers\/[\w.-]+)'/g)) need(`${dirname(f)}/${m[1]}`, f);
}

check(needed.size > 0 && (needed.get('scripts/_pdfjs_remap.mjs')?.length ?? 0) > 50,
  `sanity: the scan sees the shared pdf.js loader (${needed.get('scripts/_pdfjs_remap.mjs')?.length ?? 0} users)`);
const untracked = [...needed].filter(([helper]) => !tracked.has(helper));
check(untracked.length === 0,
  `every helper the tests load is in the repository (${untracked.map(([h, by]) => `${h} — used by ${by.length} file(s), e.g. ${by[0]}`).join('; ')})`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
