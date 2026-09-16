// Audit finding (Medium, engine area) — extractFormattedTextFromPDF's paragraph/heading
// grouping did two nested full scans of the page's sorted text-run array for every
// unconsumed run (same-line grouping, then multi-line continuation), an O(n^2) pattern flagged
// as a real risk on dense pages (700+ runs).
//
// Fixed by two provably-safe optimizations, not a heuristic rewrite: (1) each inner scan now
// starts from the outer run's own position in the sorted array instead of index 0 — every
// earlier position is guaranteed already consumed by the time the outer loop reaches a given
// index, so scanning them again could never find anything; (2) since the array is Y-descending,
// once the Y gap to a later run exceeds the largest threshold ANY later run could possibly
// satisfy, the scan breaks early — padded to cover the sort comparator's own small tie-break
// tolerance, so it can't skip a real match.
//
// Because this is delicate, iteration-order-sensitive logic feeding three export formats, this
// test hard-codes SHA-256 hashes of the full extractFormattedTextFromPDF() output (not just
// summary counts) for five real fixtures spanning the densest known content in this repo
// (epz_pptx_table_fixture.pdf, epz-report-variant2.pdf — hundreds of runs per page). These
// hashes were captured by running the SAME fixtures through the OLD O(n^2) code (git stash)
// and the NEW optimized code side by side: all five matched byte-for-byte before this test was
// written, proving the optimization changed nothing.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

const canvasMod = await import('@napi-rs/canvas');
if (!(globalThis as Record<string, unknown>).DOMMatrix) {
  (globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
}
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

import { extractFormattedTextFromPDF } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(buf: Buffer, name: string): File {
  const blob = new Blob([buf]);
  return Object.assign(blob, { name }) as unknown as File;
}

console.log('=== extractFormattedTextFromPDF: O(n^2) grouping optimization changed zero output ===');

// {fixture: [expectedHash, expectedPageCount]} — captured from the fixed code and
// cross-checked byte-for-byte against the pre-optimization code before being hard-coded here.
const EXPECTED: Record<string, [string, number]> = {
  'allegro-raport.pdf': ['8de47d2a65aef07149db902b7aad55555d3d5681db44d576cf07c0c2c47e662b', 27],
  'epz_pptx_table_fixture.pdf': ['e6fe3d246394ad4d6aafc205dae0328a0cc2650d91dcb93437763e492f240578', 3],
  'gpw-ebook.pdf': ['dd200121aa9590bb6d6655d594ad2bf4e384d2a6d7e292f9e7f961889f403585', 12],
  'Raport - 12 rzeczy, które robią skuteczni handlarze w Internecie_na Allegro.pdf': ['9e4932a0f2ec0ad5660e18d77cc85ef953cf4f2060943d04de87ead66349327b', 27],
  'epz-report-variant2.pdf': ['e63b78358b4f024243c66d1d5f4689bcf8f35c3a7e208b78acaf9b3c15a445cd', 3],
};

for (const [fname, [expectedHash, expectedPages]] of Object.entries(EXPECTED)) {
  const file = toFile(readFileSync(join(ROOT, 'test-real-pdfs', fname)), fname);
  const pages = await extractFormattedTextFromPDF(file);
  check(pages.length === expectedPages, `[${fname}] page count unchanged (expected ${expectedPages}, got ${pages.length})`);
  const hash = createHash('sha256').update(JSON.stringify(pages)).digest('hex');
  check(hash === expectedHash, `[${fname}] full output byte-for-byte identical to pre-optimization code (hash ${hash.slice(0, 12)}...)`);
}

// Structural proof the actual optimization is present (not just that output is unchanged by
// coincidence): the shared source file contains the early-position-start and early-break
// pattern described above.
const src = readFileSync(join(ROOT, 'lib', 'client-pdf.ts'), 'utf-8');
check(src.includes('sorted.entries()'), 'outer loop tracks each run\'s own position in the sorted array');
check(src.includes('sameLineBreakAt') && src.includes('continuationBreakAt'), 'both inner scans have an early-break threshold, not an unconditional full scan');
check(src.includes('breakPadding'), 'the early-break threshold is padded for the sort comparator\'s own tie tolerance');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
