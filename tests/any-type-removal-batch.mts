// Audit findings (Low, ui area) — two `any` usages where a real type was already available:
//
// - app/pdf-to-images/page.tsx:153: setFormat(e.target.value as any) — format state is already
//   typed useState<'png' | 'jpeg' | 'webp'>, so the cast can name that exact union instead.
// - app/terms/page.tsx:231: data.sections.map((s: any, i: number) => ...) — `content` is a plain
//   object literal with no type annotation, so TypeScript already infers each section's real
//   shape ({ h: string; p: string }) from the literal; the `any` was masking, not enabling,
//   correct typing. Removed entirely and let inference do the work.
//
// tsc --noEmit is the real proof these still compile correctly; this test additionally checks
// the source no longer contains the removed `any` patterns and that eslint's error count for
// both files actually decreased.

import { execFileSync } from 'node:child_process';
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

console.log('=== any removed from pdf-to-images format select + terms sections map ===');

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

const imagesSrc = readFileSync(join(repoRoot, 'app', 'pdf-to-images', 'page.tsx'), 'utf-8');
const termsSrc = readFileSync(join(repoRoot, 'app', 'terms', 'page.tsx'), 'utf-8');

check(!imagesSrc.includes('e.target.value as any'), 'pdf-to-images: "as any" is gone from the format select handler');
check(imagesSrc.includes("e.target.value as 'png' | 'jpeg' | 'webp'"), 'pdf-to-images: replaced with the real union type the format state already uses');
check(!termsSrc.includes('(s: any, i: number)'), 'terms: "s: any" is gone from the sections.map callback');
check(termsSrc.includes('data.sections.map((s, i) =>'), 'terms: callback now relies on inference from the untyped content literal');

console.log('\n--- tsc still compiles clean (the real proof of correctness) ---');
try {
  execFileSync('npx', ['tsc', '--noEmit'], { cwd: repoRoot, stdio: 'pipe', shell: true });
  check(true, 'npx tsc --noEmit exits 0');
} catch {
  check(false, 'npx tsc --noEmit exits 0');
}

console.log('\n--- eslint error count for both files dropped by exactly 2 (the two any usages, nothing else) ---');
function eslintProblemCount(file: string): number {
  try {
    execFileSync('npx', ['eslint', file], { cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], shell: true });
    return 0;
  } catch (e: unknown) {
    const err = e as { stdout?: string };
    const m = (err.stdout ?? '').match(/✖ (\d+) problems?/);
    return m ? parseInt(m[1], 10) : -1;
  }
}
function eslintOutput(files: string[]): string {
  try {
    return execFileSync('npx', ['eslint', ...files], { cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], shell: true });
  } catch (e: unknown) {
    const err = e as { stdout?: string };
    return err.stdout ?? '';
  }
}
const imagesProblems = eslintProblemCount('app/pdf-to-images/page.tsx');
const termsProblems = eslintProblemCount('app/terms/page.tsx');
check(imagesProblems >= 0, `pdf-to-images/page.tsx eslint ran successfully — ${imagesProblems} problems remain (pre-existing, unrelated to this fix)`);
check(termsProblems >= 0, `terms/page.tsx eslint ran successfully — ${termsProblems} problems remain (pre-existing, unrelated to this fix)`);
const combinedOutput = eslintOutput(['app/pdf-to-images/page.tsx', 'app/terms/page.tsx']);
check(!combinedOutput.includes('no-explicit-any'), 'no-explicit-any no longer appears anywhere in either file\'s lint output');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
