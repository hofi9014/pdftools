// Audit finding (Low, ui area) — the ToolSlug union type (types/guide.ts) and the runtime
// toolSlugs Set used by guide validation (lib/guides-validate.ts) were two independently
// maintained lists of the same 41 string literals. A drift between them would either falsely
// reject a valid guide CTA (Set missing an entry the type has) or falsely accept an invalid one
// (Set having an entry the type doesn't) — and nothing would catch it except manual review.
//
// Fixed by exporting one `as const` array (TOOL_SLUGS) from types/guide.ts, deriving the
// ToolSlug type from it (`typeof TOOL_SLUGS[number]`), and having guides-validate.ts build its
// Set from that same array instead of retyping the list by hand.

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

console.log('=== ToolSlug: single source of truth instead of two hand-synced lists ===');

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

const { TOOL_SLUGS } = await import('../types/guide');

console.log('--- TOOL_SLUGS exported and used as the actual runtime source ---');
check(Array.isArray(TOOL_SLUGS), 'types/guide.ts exports a real TOOL_SLUGS array');
check(TOOL_SLUGS.length === 41, `TOOL_SLUGS has the expected 41 entries — got ${TOOL_SLUGS.length}`);

const validateSrc = readFileSync(join(repoRoot, 'lib', 'guides-validate.ts'), 'utf-8');
check(validateSrc.includes("import { TOOL_SLUGS } from '@/types/guide'"), 'guides-validate.ts imports TOOL_SLUGS instead of retyping the list');
check(validateSrc.includes('new Set<ToolSlug>(TOOL_SLUGS)'), "the runtime Set is built directly from TOOL_SLUGS, not a separate literal array");
check(!/new Set<ToolSlug>\(\[\s*'merge'/.test(validateSrc), 'the old duplicated inline array literal is gone from guides-validate.ts');

console.log('\n--- both consumers genuinely see the same values (not just the same length) ---');
const guideSrc = readFileSync(join(repoRoot, 'types', 'guide.ts'), 'utf-8');
const typeDerivation = guideSrc.includes('export type ToolSlug = typeof TOOL_SLUGS[number]');
check(typeDerivation, 'ToolSlug type is derived from TOOL_SLUGS via typeof [number], not a separately written union');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
