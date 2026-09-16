// Audit finding (Medium, tooling area) — .gitignore's `*.mjs` rule matches .mjs files at ANY
// depth, not just the repo root. That collides with real, legitimate .mjs scripts already
// tracked under scripts/ (copy-tesseract-assets.mjs, copy-pdfjs-assets.mjs — both referenced
// directly from package.json's build/postinstall steps). Already-tracked files aren't affected
// by .gitignore (git never un-tracks a file just because a rule starts matching it later), so
// this was harmless TODAY — but any NEW legitimate .mjs script added anywhere outside the repo
// root (most plausibly under scripts/, alongside the two that already exist there) would be
// silently invisible to `git add`/`git status`, with no warning.
//
// Fixed by narrowing the rule from `*.mjs` (any depth) to `/*.mjs` (repo root only) — a
// git-ignore rule with a leading slash and no further slashes anchors to the repo root and does
// not recurse into subdirectories. Root-level scratch .mjs scripts (the actual junk this rule
// exists to catch — e.g. the test-api.mjs dead script removed in the same commit as this fix)
// stay ignored exactly as before; a new script anywhere under scripts/ (or any other
// subdirectory) is no longer silently swallowed.
//
// Side effect (expected, not a bug): several pre-existing, untracked, one-off scratch .mjs
// scripts already sitting under scripts/ (e.g. scripts/add-metadata.mjs,
// scripts/gen-test-irs.mjs) were previously invisible to `git status` under the old blanket
// rule and now show up as untracked. This is the fix working as intended — those files were
// always there, just silently hidden; making them visible is a documented, separate cleanup
// opportunity (flagged, not resolved, by this fix), not a regression.
//
// One side effect that WAS worth preventing: lib/pdfjs-dist/build/pdf.worker.min.mjs (a local,
// untracked, unused stray copy of the pdf.js worker — AGENTS.md already documents it as
// environment noise that inflates full `npm run lint` output; the app actually imports the
// worker from node_modules/pdfjs-dist, not this path) was ALSO only hidden by the old blanket
// `*.mjs` rule. Narrowing that rule to the repo root would have newly exposed it as untracked
// clutter too. Added a dedicated `/lib/pdfjs-dist/` rule to keep it exactly as invisible as it
// always was, instead of accepting that as collateral damage.
//
// This test drives the real `git check-ignore` against the real, current .gitignore (no
// simulation), which is exactly what `git add`/`git status` consult.

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

console.log('=== .gitignore: *.mjs scoped to repo root only, not every subdirectory ===');

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

function isIgnored(relPath: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '-q', relPath], { cwd: repoRoot });
    return true; // exit 0 = ignored
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err.status === 1) return false; // exit 1 = not ignored
    throw e; // exit 128 etc = real git error, don't swallow
  }
}

console.log('--- git check-ignore against the live .gitignore ---');
check(isIgnored('scratch-test.mjs'), 'a root-level scratch .mjs path is still ignored (the actual junk this rule targets)');
check(!isIgnored('scripts/new-legit-script.mjs'), 'a NEW .mjs script under scripts/ is no longer silently ignored — the actual bug this fix closes');
check(!isIgnored('lib/some-new-helper.mjs'), 'a NEW .mjs file anywhere else under the tree is no longer silently ignored either');
check(!isIgnored('scripts/copy-tesseract-assets.mjs'), 'the already-tracked, real build script is not matched by the ignore rule (git add would work on it from scratch)');
check(isIgnored('lib/pdfjs-dist/build/pdf.worker.min.mjs'), 'the pre-existing local stray pdf.js worker copy stays ignored via its own dedicated rule, not collateral damage from narrowing *.mjs');

console.log('\n--- source check: the rule itself is anchored to root ---');
const gitignore = readFileSync(join(repoRoot, '.gitignore'), 'utf-8');
check(/^\/\*\.mjs$/m.test(gitignore), 'gitignore contains the anchored /*.mjs rule');
check(!/^\*\.mjs$/m.test(gitignore), 'the old unanchored *.mjs rule (matches every depth) is gone');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
