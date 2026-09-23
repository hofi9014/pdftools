// Audit finding (High, engine area) — groupIntoLines()'s sort comparator (lib/pdf/
// extractTextBlocks.ts) sorted lines by `b.y - a.y` (descending) for any pair whose Y values
// weren't within the 3pt same-line tolerance. That direction is only correct for PDF-native
// (bottom-up) coordinates, where a higher-up line has a LARGER y. But by the time items reach
// this comparator, they've already been run through pdf.js's viewport.convertToViewportPoint()
// (see extractTextBlocks() in the same file) — CANVAS/SCREEN space, y=0 at the top, increasing
// downward. Confirmed directly against pdf.js's own PageViewport.transform (rotation=0:
// [scale,0,0,-scale,e,f], so viewportY = f - scale*pdfY): a HIGHER-up PDF line (larger PDF y)
// maps to a SMALLER viewport y. Top-to-bottom reading order in viewport space therefore means
// ASCENDING y — but the comparator sorted descending, the wrong direction for the space it
// actually receives, so lines came out in reversed (bottom-to-top) order.
//
// This only became visible in pdfToEpub's OUTPUT for documents pdfToEpub classifies as
// "structured" (any bold run, any detected heading, or more than one paragraph break) — plain,
// unstyled body text instead takes a separate fallback that joins raw pdf.js getTextContent()
// items in their original stream order without going through groupIntoLines/classifyBlocks at
// all, which is why this bug didn't affect every PDF uniformly. The existing
// tests/pdf-to-epub-bold-italic.mts test happens to use this EXACT same 3-line layout (y=400
// "regular", y=380 "bold", y=360 "italic") to prove bold/italic detection, but never asserted
// anything about line ORDER — so it passed both before and after this fix despite reproducing
// the buggy input shape exactly, which is why this separate, dedicated regression test exists.
//
// Fixing just the sort direction wasn't sufficient on its own: classifyBlocks() (lib/
// client-pdf.ts) computes inter-line gaps as `prev.y - cur.y`/`prev.y - b.y`, which assumed the
// OLD descending-y block order (so a preceding block always had a LARGER y). Left unfixed after
// only flipping the sort, every gap would come out negative for correctly-ordered blocks,
// `lineGaps` would stay empty, medGap would silently fall back to a hardcoded default, and
// paragraph-break detection would break instead of the text order — so both gap computations
// were flipped to match (`cur.y - prev.y` / `b.y - prev.y`).
//
// Proven end-to-end: builds a real PDF with pdf-lib (the exact reported repro: 3 lines at
// y=400/380/360, one of them bold so pdfToEpub's hasStructure gate routes through the buggy
// classifyBlocks/blocksToXhtmlBody path), runs it through the real pdfToEpub(), unzips the
// actual generated .epub, and confirms the words appear in true top-to-bottom (regular, bold,
// italic) order in the extracted paragraph text — not just that each word is present somewhere.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));

import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { pdfToEpub } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(bytes: Uint8Array, name: string): File {
  const blob = new Blob([bytes as BlobPart]);
  return Object.assign(blob, { name }) as unknown as File;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

console.log('=== pdfToEpub: vertically-stacked lines are emitted in true top-to-bottom reading order ===');
{
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const page = pdf.addPage([400, 500]);
  // The exact reported repro: three lines, 20pt apart, at the same x. One bold word is enough
  // to make pdfToEpub's hasStructure gate route this page through classifyBlocks/
  // blocksToXhtmlBody (the buggy path) instead of the raw-text fallback.
  page.drawText('This is regular text.', { x: 40, y: 400, size: 14, font: regular });
  page.drawText('This word is bold.', { x: 40, y: 380, size: 14, font: bold });
  page.drawText('This word is italic.', { x: 40, y: 360, size: 14, font: italic });

  const bytes = await pdf.save();
  const file = toFile(bytes, 'line-order-test.pdf');

  const epubBlob = await pdfToEpub(file);
  check(epubBlob.size > 0, `pdfToEpub produced a non-empty file (${epubBlob.size} bytes)`);

  const zip = await JSZip.loadAsync(await epubBlob.arrayBuffer());
  const pageFile = zip.file('OEBPS/page-1.xhtml');
  check(pageFile !== null, 'OEBPS/page-1.xhtml exists in the generated epub');

  if (pageFile) {
    const xhtml = await pageFile.async('string');
    const plainText = stripTags(xhtml);
    console.log(`    (extracted plain text: ${JSON.stringify(plainText)})`);

    const idxRegular = plainText.indexOf('regular text');
    const idxBold = plainText.indexOf('is bold');
    const idxItalic = plainText.indexOf('is italic');

    check(idxRegular !== -1 && idxBold !== -1 && idxItalic !== -1, `all three lines' text is present in the output (regular@${idxRegular}, bold@${idxBold}, italic@${idxItalic})`);
    check(idxRegular < idxBold, `"regular text" appears BEFORE "is bold" — top line stays before the line 20pt below it (regular@${idxRegular} < bold@${idxBold})`);
    check(idxBold < idxItalic, `"is bold" appears BEFORE "is italic" — middle line stays before the bottom line (bold@${idxBold} < italic@${idxItalic})`);
    check(idxRegular < idxItalic, `"regular text" appears BEFORE "is italic" — top line stays before the bottom line, not just adjacent-pair correct (regular@${idxRegular} < italic@${idxItalic})`);
  }
}

console.log('\n=== pdfToEpub: a 4th, far-apart line still sorts correctly alongside the close-together ones ===');
{
  // Guards against a fix that only handles the near-tie case (e.g. swapping just the tie-break
  // branch) rather than the actual general sort direction — a line 300pt away must still land
  // in the mathematically correct position relative to ALL other lines, not just its immediate
  // neighbor.
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([400, 500]);
  page.drawText('Topmost line, far away.', { x: 40, y: 470, size: 14, font: bold });
  page.drawText('This is regular text.', { x: 40, y: 400, size: 14, font: regular });
  page.drawText('This word is bold.', { x: 40, y: 380, size: 14, font: bold });
  page.drawText('This word is italic.', { x: 40, y: 360, size: 14, font: regular });
  page.drawText('Bottommost line, far away.', { x: 40, y: 40, size: 14, font: bold });

  const bytes = await pdf.save();
  const file = toFile(bytes, 'line-order-far-test.pdf');
  const epubBlob = await pdfToEpub(file);
  const zip = await JSZip.loadAsync(await epubBlob.arrayBuffer());
  const pageFile = zip.file('OEBPS/page-1.xhtml');

  if (pageFile) {
    const xhtml = await pageFile.async('string');
    const plainText = stripTags(xhtml);
    const idxTop = plainText.indexOf('Topmost');
    const idxRegular = plainText.indexOf('regular text');
    const idxBold = plainText.indexOf('is bold');
    const idxItalic = plainText.indexOf('is italic');
    const idxBottom = plainText.indexOf('Bottommost');

    const allFound = [idxTop, idxRegular, idxBold, idxItalic, idxBottom].every((i) => i !== -1);
    check(allFound, `all 5 lines present (top@${idxTop}, regular@${idxRegular}, bold@${idxBold}, italic@${idxItalic}, bottom@${idxBottom})`);
    check(allFound && idxTop < idxRegular && idxRegular < idxBold && idxBold < idxItalic && idxItalic < idxBottom,
      `full 5-line order is correct top-to-bottom: top < regular < bold < italic < bottom (got indices ${JSON.stringify([idxTop, idxRegular, idxBold, idxItalic, idxBottom])})`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
