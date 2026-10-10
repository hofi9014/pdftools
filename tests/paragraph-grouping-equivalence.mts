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
//
// Hashes updated again 2026-09-17 (same day, second unrelated fix) — buildGridAndDetectMerged's
// "most specific owner" merge heuristic wrongly treated a column-divider border line (which
// naturally spans a table's full height) as owning every cell in its column whenever no more
// specific shape existed to out-rank it — exactly the case on epz_pptx_table_fixture.pdf,
// gpw-ebook.pdf and epz-report-variant2.pdf, all real, densely-packed ~105-row tables with pure
// border-line cells. Confirmed via a before/after IR diff: e.g. epz_pptx_table_fixture.pdf page
// 2 went from 1 table + 110 STRAY PARAGRAPHS (real content that fell out of the table because
// the false merges' insane spans like "94x1"/"85x1" left assignTextRunsToCells nowhere valid to
// route it) to 1 table + 1 paragraph, with sane spans like "3x1"/"4x1"/"1x7". allegro-raport.pdf
// and the other Allegro report fixture have no tables reaching this code path and are
// unaffected (same hash as the font-name fix above). See the FINDING comment on
// buildGridAndDetectMerged in lib/client-pdf.ts.
//
// Hashes updated a third time 2026-09-17 (same day, unrelated feature addition, gpw-ebook.pdf
// only) — added hyperlink extraction: PDF Link annotations (/Annots, entirely separate from the
// text content stream) are now matched by position onto the IRTextRun(s) they cover and tagged
// with run.link, so Word/ODT output gets a real clickable hyperlink instead of silently losing
// it. gpw-ebook.pdf is a real e-book with 6 genuine embedded links (publisher site, terms page,
// two promotional links including literal "kliknij tutaj"/"click here" anchor text) — verified
// each one individually: correct anchor text, correct destination URL, nothing spurious. The
// other 4 fixtures have no Link annotations reaching this code and are unaffected (unchanged
// hashes). See applyLinkAnnotations in lib/client-pdf.ts.
//
// Hashes updated a fourth time 2026-09-17 (same day, unrelated feature addition, gpw-ebook.pdf
// only) — added underline detection: a genuine PDF underline has no dedicated construct, it is
// just an ordinary thin rect drawn under the text by the producing software, indistinguishable
// at the operator level from a table border or a decorative rule. Matched by requiring the
// rect's width to closely track the specific run's own width (ratio ~0.9-1.1), not just
// overlap it — a table/row border spans a whole column/row width regardless of the text near
// it (ratio 3-6x wider), so this discriminator cleanly separates the two; verified this drops
// a naive "any thin rect below the text" match from 909 false positives on
// epz_pptx_table_fixture.pdf's dense schedule table to exactly 0, while keeping all 68 genuine
// underlines on gpw-ebook.pdf. Confirmed visually by rendering pages 2-6: every matched run
// (the whole hyperlinked/underlined table of contents, the "kliknij tutaj" link, publisher
// contact info) is in fact underlined in the source. Field-by-field diff against the pre-fix
// output confirms exactly 68 new `underline: true` fields and zero other changes (text,
// position, size, color, bold, italic, rotation, link all byte-identical). The other 4
// fixtures have no qualifying rects and are unaffected (unchanged hashes). See
// applyUnderlineFromRects in lib/client-pdf.ts.

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
// (2026-09-26 overprint: fake-bold duplicates (same text, +-1.5pt) are dropped and the survivor marked bold (gpw "Wstep"/"Swiece japonskie" headings, 20 chars); overlapping runs of one line stay in separate blocks (allegro/Raport doubled footers); measured: the non-whitespace character multiset is unchanged everywhere except those exact duplicates, epz_pptx_table_fixture unchanged, epz-report-variant2 regrouped its stray un-tabled cell fragments (same characters, 15->11 blocks; both states are jumbled, C5_1). 2026-09-26 ligatures: U+FB00..FB06 are normalised to plain letters; only allegro-raport contains any (11) — with the ligatures replaced in the OLD output the hash is byte-identical to the new one, all other fixtures unchanged. 2026-09-24 final: the text cursor now advances after showText and paragraph continuation lines take their directly-adjacent runs: allegro-raport, gpw-ebook and Raport hashes changed; measured before/after: the non-whitespace character multiset of every fixture is identical, blocks 200->192, 243->241, 197->195 (stray fragments merged back into their lines, e.g. gpw "WWW:" + its link), run x vs pdf.js getTextContent never worse (allegro 87->78 runs off by >1.5pt). 2026-09-24 latest: pages gained an optional `boxes` (stroked frames) — page-level metadata like `fills`, excluded from the hash; all hashes unchanged by it. 2026-09-24 later: table rows now list only cells that START in them (positions covered by a colspan/rowspan are dropped; an empty merged cell keeps its span): the ordered non-empty cell texts of epz_pptx_table_fixture, gpw-ebook and epz-report-variant2 are identical to before (1026/997/2 cells), only 711/675/4 empty placeholder cells disappeared. 2026-09-24 table cells gained an optional `fill` (cell background): with `fill` stripped, the epz_pptx_table_fixture, gpw-ebook and epz-report-variant2 hashes are byte-identical to the previous ones. Updated 2026-09-17 three times, for three unrelated fixes/features — see the comments above. Updated again 2026-09-24 for allegro-raport.pdf and the Raport fixture ONLY: parseFontStyle now treats Black/Heavy/Demi weights as bold; verified by a before/after diff to be exactly 43 bold false->true flips on Gotham-Black runs and zero other differences. Updated a third time 2026-09-24 for epz-report-variant2.pdf ONLY: fill colour/font are now tracked with a q/Q stack; diff = 2981 run colours changed from a cell-background colour (white 2048, grey 719, ...) back to black, zero other differences. Updated a fourth time 2026-09-24 for the Raport fixture and epz-report-variant2.pdf: text positions/sizes/rotation now go through the CTM (tests/text-ctm-geometry.mts); e.g. Raport body lines moved from raw x=1,y=829 to the real x=100,y=721. The three CTM-free fixtures are byte-identical. Updated a fifth time 2026-09-24 for table detection (rect corners through flipping CTMs; over-merged edge-sharing groups split into touching components; bullet-sized rects excluded): gpw-ebook.pdf page 2 grey banner 3x3 -> 2x3 (matches the original, 2 rows), epz-report-variant2.pdf table geometry shifted with the corrected rect positions; the CTM-free excel/pptx fixtures are unchanged. Sixth update 2026-09-24 (allegro-raport.pdf + Raport fixture): list-marker detection no longer applies to heading-sized text and numbered markers need a following space and no digit — the 9 decorative 60pt section numerals "1.".."9." (previously empty list items that the Word writer dropped) and the 32pt "-" heading are now ordinary heading/paragraph blocks.)
// (2026-10-10, PDF -> Excel for documents: two shared rules changed. (1) A cell's background is
// the filled rect lying OVER most of the cell, not one merely as big as the cell: 128 of 795 cell
// fills of epz_pptx_table_fixture were a neighbour's colour (a fill overlapping the next row by a
// fraction of a point); every fill of all 3467 table cells of five fixtures now equals the colour
// painted at the cell's centre. With `fill` stripped, that fixture's output is identical to the
// previous one. (2) A rectangle that is neither filled nor stroked and encloses drawn content is a
// clipping path, not a cell: epz-report-variant2 (text clipped to its cells by such paths) lost
// its three phantom rows and a table 1656 pt tall on an 842 pt page (113/111/111 rows -> 110 on
// every page); the non-whitespace characters of the output are the same multiset (23287).)
const EXPECTED: Record<string, [string, number]> = {
  'allegro-raport.pdf': ['b052ed7d14c4052160b2049b259ee334efe3f18b7e519c475a12112b2f91d2d8', 27],
  'epz_pptx_table_fixture.pdf': ['a0978f5d352596bc850a0f0c76da3d98b126d04b55a52c20ff7bd174a46ad180', 3],
  'gpw-ebook.pdf': ['bcb90f3d74140eaf5b4a5a59b51324f1ad8c9b43618e9a01065cd16aecd7b133', 12],
  'Raport - 12 rzeczy, które robią skuteczni handlarze w Internecie_na Allegro.pdf': ['d9a4b486cd76135ccb45dc62707d6adcca069e2a1691d2e2b7d44253f34faa71', 27],
  'epz-report-variant2.pdf': ['fa156dba785d75e29a5d57efacecc0c0fb227e7ab4832d72521b9818812e052d', 3],
};

for (const [fname, [expectedHash, expectedPages]] of Object.entries(EXPECTED)) {
  const file = toFile(readFileSync(join(ROOT, 'test-real-pdfs', fname)), fname);
  const pages = await extractFormattedTextFromPDF(file);
  check(pages.length === expectedPages, `[${fname}] page count unchanged (expected ${expectedPages}, got ${pages.length})`);
  // `fills` (painted background rectangles, used only by the Word writer to shade paragraphs) is additive presentation metadata covered by tests/docx-layout.mts; it is excluded so this test keeps proving the text/structure output is unchanged.
  const hash = createHash('sha256').update(JSON.stringify(pages.map(({ fills: _fills, boxes: _boxes, fontClasses: _fontClasses, ...rest }) => rest))).digest('hex');
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
