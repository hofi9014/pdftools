// Batch of Low-severity audit findings, all small/mechanical, fixed together:
//
// - components/LanguageToggle.tsx: dead component (Header uses LanguageSelector.tsx instead,
//   zero imports anywhere) — deleted outright.
// - add-edit-i18n.mjs: one-off i18n migration script — its target file edit-keys.json DOES
//   still exist (the audit's stated reason, "reads a nonexistent file", was actually wrong),
//   but independently verified here that all 71 keys it would migrate already exist in
//   lib/i18n.ts for all 16 locales — the migration is genuinely complete, so the script (never
//   wired to any npm script or referenced anywhere) is dead regardless — deleted.
// - app/page.tsx's hero stats + app/layout.tsx's SEO description metadata: hardcoded "40" tool
//   count (stale — the tools array actually has 41 entries) replaced with tools.length in both
//   places.
// - lib/tools.ts: dead `redirectTo` field (set once, on the 'jpg' entry, never read anywhere —
//   the actual pdf-to-jpg -> pdf-to-images redirect is hardcoded independently in the two
//   page.tsx files that implement it) — field removed from the ToolDef interface and its one
//   usage.
// - components/MobileMenu.tsx: magic `i === 7` boundary between the "more" category's real
//   tools and its appended info links (nasze-zasady/wsparcie) — replaced with a
//   `separatorIndex` computed from `toolsByCategory('more').length`, so adding/removing a
//   "more" tool can't silently desync the separator's position.
// - .gitignore: added a /screenshots/ rule (e2e/screenshot-rules.ts writes PNGs there) to stop
//   future runs from creating untracked-then-accidentally-committed clutter. Note: the
//   directory already holds 16 tracked PNGs from a past run — gitignore never untracks an
//   already-tracked file, so those are unaffected; this only prevents NEW screenshot files.

import { tools, toolsByCategory } from '../lib/tools';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

console.log('=== dead code removed ===');
check(!existsSync(join(repoRoot, 'components', 'LanguageToggle.tsx')), 'components/LanguageToggle.tsx no longer exists');
check(!existsSync(join(repoRoot, 'add-edit-i18n.mjs')), 'add-edit-i18n.mjs no longer exists');

console.log('\n--- verify the i18n migration add-edit-i18n.mjs would have performed is genuinely already complete ---');
{
  const editKeys = JSON.parse(readFileSync(join(repoRoot, 'edit-keys.json'), 'utf-8'));
  const i18nSrc = readFileSync(join(repoRoot, 'lib', 'i18n.ts'), 'utf-8');
  const enKeys = Object.keys(editKeys.en);
  const incomplete = enKeys.filter(k => (i18nSrc.split(`'${k}':`).length - 1) < 16);
  check(enKeys.length === 71, `edit-keys.json still lists the expected 71 keys — got ${enKeys.length}`);
  check(incomplete.length === 0, `every key from edit-keys.json already has all 16 locale translations in lib/i18n.ts — ${incomplete.length} incomplete`);
}

console.log('\n=== tools.length used instead of a hardcoded count ===');
{
  const pageSrc = readFileSync(join(repoRoot, 'app', 'page.tsx'), 'utf-8');
  const layoutSrc = readFileSync(join(repoRoot, 'app', 'layout.tsx'), 'utf-8');
  check(!pageSrc.includes('gradient-text">40<'), 'app/page.tsx no longer hardcodes "40" in the hero stats');
  check(pageSrc.includes('{tools.length}'), 'app/page.tsx renders {tools.length} instead');
  check(!layoutSrc.includes('40 PDF tools'), 'app/layout.tsx no longer hardcodes "40 PDF tools" in any metadata description');
  check((layoutSrc.match(/\$\{tools\.length\} PDF tools/g) || []).length === 3, 'all 3 metadata description strings now interpolate ${tools.length}');
  check(tools.length === 40, `tools.length is 40 after removing the duplicate 'jpg' (PDF do JPG) entry — got ${tools.length}`);
}

console.log('\n=== dead redirectTo field removed from lib/tools.ts ===');
{
  const toolsSrc = readFileSync(join(repoRoot, 'lib', 'tools.ts'), 'utf-8');
  check(!toolsSrc.includes('redirectTo'), 'redirectTo is gone from both the ToolDef interface and the jpg entry');
  // The actual redirect behavior lives in the two page.tsx files and must be untouched by this cleanup.
  const legacyRedirect = readFileSync(join(repoRoot, 'app', 'pdf-to-jpg', 'page.tsx'), 'utf-8');
  const localeRedirect = readFileSync(join(repoRoot, 'app', '[locale]', 'pdf-to-jpg', 'page.tsx'), 'utf-8');
  check(legacyRedirect.includes("redirect('/pdf-to-images')"), 'the actual pdf-to-jpg -> pdf-to-images redirect (root route) is untouched');
  check(localeRedirect.includes('/pdf-to-images'), 'the actual pdf-to-jpg -> pdf-to-images redirect (locale-prefixed route) is untouched');
}

console.log('\n=== MobileMenu "more" category separator derived dynamically, not hardcoded ===');
{
  const menuSrc = readFileSync(join(repoRoot, 'components', 'MobileMenu.tsx'), 'utf-8');
  check(!/i === 7/.test(menuSrc), 'the magic literal "i === 7" is gone from the source');
  check(menuSrc.includes('separatorIndex: toolsByCategory'), "separatorIndex is computed from toolsByCategory('more').length");
  check(menuSrc.includes('i === cat.separatorIndex'), 'the separator condition now compares against the computed separatorIndex');

  const moreCount = toolsByCategory('more').length;
  check(moreCount === 7, `toolsByCategory('more').length is currently 7, exactly matching the old hardcoded literal — the fix is behavior-preserving TODAY (got ${moreCount})`);
}

console.log('\n=== .gitignore: /screenshots/ ignores future output without affecting already-tracked files ===');
{
  function isIgnored(relPath: string): boolean {
    try {
      execFileSync('git', ['check-ignore', '-q', relPath], { cwd: repoRoot });
      return true;
    } catch (e: unknown) {
      const err = e as { status?: number };
      if (err.status === 1) return false;
      throw e;
    }
  }
  check(isIgnored('screenshots/rules-new-test-locale.png'), 'a NEW, not-yet-tracked screenshot path is ignored');
  const gitignoreSrc = readFileSync(join(repoRoot, '.gitignore'), 'utf-8');
  check(/^\/screenshots\/$/m.test(gitignoreSrc), 'the /screenshots/ rule is present in .gitignore');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
