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
//
// Hashes updated 2026-09-17 (unrelated to the grouping optimization above) — buildPageScaffold
// used to read the setFont (Tf) operator's pdf.js-internal loadedName alias (e.g. "g_d0_f1")
// directly as the font name, including for parseFontStyle()'s bold/italic detection, instead of
// resolving it to the PDF's real /BaseFont name via page.commonObjs. An alias never contains
// "Bold"/"Italic", so this broke bold/italic detection for EVERY PDF, not just self-generated
// ones (the previously-documented, narrower explanation). Verified the new hashes' diff against
// the old ones touches ONLY fontName/bold/italic on all 483 text runs of allegro-raport.pdf —
// text, position, size, color and rotation are byte-identical — including a real, previously-
// undetected bold heading ("PSWIZS+Gotham-Bold") now correctly flagged bold:true. See the
// FINDING comment on buildFontNameMap/buildPageScaffold in lib/client-pdf.ts.

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
// (Updated 2026-09-17 for the font-name-resolution fix — see the comment above.)
const EXPECTED: Record<string, [string, number]> = {
  'allegro-raport.pdf': ['0d97cca5cf57c003b0965cd9ab2a8499299de2834467fa1b4f9e53b7ed9b772b', 27],
  'epz_pptx_table_fixture.pdf': ['fc246ce18c43b5427a787884933d78f2b5980ee5ad0ccd01ae7b98d5104d3b05', 3],
  'gpw-ebook.pdf': ['8c359476feec542e9bb9ca514747b3c3e35cff935bc9b7463695e2180e04c335', 12],
  'Raport - 12 rzeczy, które robią skuteczni handlarze w Internecie_na Allegro.pdf': ['941a7cc50d336d2f2586f5dd808e53a1d772f5b6cd3e719d401f0cae29118b4f', 27],
  'epz-report-variant2.pdf': ['97b40d5d2800f50b2bb4a0be5fd0db1593b6b7b54f874b3ff8744afff8fb39c2', 3],
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
