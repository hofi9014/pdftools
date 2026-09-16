// Audit finding (Low, engine area) — lib/client-pdf.ts had two independently maintained page
// range parsers with genuinely different edge-case behavior: exported parsePageRanges (0-based
// output, silently drops a reversed range like "5-2" since its loop never runs when
// end < start) and internal parsePageRangeClient (1-based output, swaps a reversed range via
// Math.min/max so "5-2" correctly yields pages 2-5). The audit's own suggested fix was to
// consolidate both into one parameterized parser — but parsePageRanges turned out to have ZERO
// callers anywhere in the repo (confirmed by grep before touching anything): it was dead code,
// not actually duplicated-and-diverging logic in active use. Consolidating a real function with
// a dead one would have meant inventing behavior for a function nothing calls; deleting the dead
// one instead resolves the audit's actual concern (drift between two implementations) by leaving
// exactly one to drift.
//
// This test proves parsePageRanges is gone and that the one real parser
// (parsePageRangeClient, used by signPdfClient's 'custom' page mode) is untouched.

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

console.log('=== dead parsePageRanges removed, the one real parser untouched ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'lib', 'client-pdf.ts'), 'utf-8');

check(!src.includes('export function parsePageRanges'), 'the dead, unused parsePageRanges export is gone from the source');
check(!/\bparsePageRanges\(/.test(src), 'no call site or reference to parsePageRanges remains anywhere in the file');
check(src.includes('function parsePageRangeClient'), 'the one real, actually-used parser (parsePageRangeClient) is untouched');
check(src.includes("case 'custom': targetPages = parsePageRangeClient(opts.customPages"), "its real call site in signPdfClient's page-mode switch is untouched");

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
