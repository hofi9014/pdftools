// Audit finding (High, engine area) — addPageNumbers() and addWatermark() (lib/client-pdf.ts)
// computed their x/y drawing coordinates directly from page.getSize(), which returns the RAW,
// unrotated MediaBox dimensions, and drew unrotated text — completely ignoring the page's own
// /Rotate entry. /Rotate is common on real-world scanned documents (a landscape page is often
// stored with a portrait MediaBox plus /Rotate 90, rather than a genuinely landscape MediaBox).
//
// Confirmed empirically (not assumed) by rendering a probe PDF exactly as a real viewer would —
// via pdf.js honoring page.rotate, the same way every PDF reader does: a page number requested
// at "bottom center" on a 90°-rotated page landed at the VISUAL LEFT-CENTER edge instead —
// nowhere near the bottom, and not horizontally centered — because "bottom" (y near 0) and
// "center" (x = rawWidth/2) only mean what their names say when the page isn't rotated for
// display.
//
// Fixed with two small helpers (visualPageSize/visualToRawPoint in lib/client-pdf.ts) whose
// coordinate-transform formulas were derived and verified point-by-point against pdf.js's own
// viewport transform for every one of the four possible /Rotate values (0/90/180/270), plus an
// added `rotate: pageRotation` (or `pageRotation + watermarkAngle`) on the drawText() call so
// the glyphs stay visually upright after the viewer applies the page's own rotation — the sign
// of that correction was verified empirically too (composing the drawn text's transform with
// pdf.js's viewport transform and confirming it matches the unrotated reference matrix), not
// assumed from the PDF spec's "clockwise" wording alone.
//
// This test proves BOTH properties — visual POSITION and visual UPRIGHT ORIENTATION — for all
// four rotation values, by rendering through the exact same pdf.js viewport pipeline a real PDF
// viewer uses (page.getViewport({ rotation: page.rotate }), then composing each text item's own
// transform with the viewport's transform).

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as PdfJsModule;
pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

import { readFileSync, existsSync } from 'node:fs';
import { degrees } from 'pdf-lib';
import { addPageNumbers, addWatermark } from '../lib/client-pdf';

// addWatermark embeds a font via embedLiberationSans(), which fetch()es a browser-relative path
// — same mock as tests/office-to-pdf-entities.mts.
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('/')) {
    const filePath = join(ROOT, 'public', url);
    if (existsSync(filePath)) {
      return new Response(new Uint8Array(readFileSync(filePath)), { status: 200 });
    }
  }
  return originalFetch(input, init);
}) as typeof fetch;

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

// Builds a single-page PDF with a given /Rotate, WITHOUT going through addPageNumbers/
// addWatermark yet (they take a File and re-load internally).
async function buildRotatedPdf(rawWidth: number, rawHeight: number, rotationDeg: number): Promise<File> {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([rawWidth, rawHeight]);
  page.setRotation(degrees(rotationDeg));
  const bytes = await pdf.save();
  return toFile(bytes, 'rotated.pdf');
}

// Renders exactly as a real PDF viewer would (honors page.rotate) and returns, for each
// non-whitespace text item, its VISUAL position (top-left-origin, y-down — i.e. what you'd see
// on screen/paper) and whether its glyph orientation is upright (matches the unrotated
// reference transform pattern a=+, d=-, b=c=0).
async function renderAndInspect(bytes: Uint8Array): Promise<{ str: string; vx: number; vy: number; upright: boolean; tiltDeg: number }[]> {
  const doc = await pdfjsLib.getDocument({ data: bytes, useSystemFonts: false, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1, rotation: page.rotate });
  const content = await page.getTextContent();
  const results: { str: string; vx: number; vy: number; upright: boolean; tiltDeg: number }[] = [];
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue;
    const t = item as unknown as { str: string; transform: number[] };
    const [vx, vy] = viewport.convertToViewportPoint(t.transform[4]!, t.transform[5]!);
    // Compose item transform with viewport transform (PDF row-vector convention: v' = v * M).
    const [a1, b1, c1, d1] = t.transform;
    const [a2, b2, c2, d2] = viewport.transform;
    const a = a1! * a2! + b1! * c2!;
    const b = a1! * b2! + b1! * d2!;
    const c = c1! * a2! + d1! * c2!;
    const d = c1! * b2! + d1! * d2!;
    // Reference upright pattern (rotation=0, textRotate=0): a>0, d<0, b≈0, c≈0.
    const upright = a > 0 && d < 0 && Math.abs(b) < 1e-6 && Math.abs(c) < 1e-6;
    // Tilt magnitude on screen, independent of the y-flip's sign convention: the composed
    // matrix's rotation angle relative to the reference upright pattern.
    const tiltDeg = Math.abs((Math.atan2(b, a) * 180) / Math.PI);
    results.push({ str: t.str, vx, vy, upright, tiltDeg });
  }
  return results;
}

console.log('=== addPageNumbers: correct visual position AND upright orientation on rotated pages ===');
for (const rotationDeg of [0, 90, 180, 270]) {
  const rawWidth = 600, rawHeight = 800;
  const file = await buildRotatedPdf(rawWidth, rawHeight, rotationDeg);
  const outBytes = await addPageNumbers(file, { verticalPosition: 'bottom', horizontalPosition: 'center' });
  const items = await renderAndInspect(outBytes);
  const num = items.find((i) => i.str.trim() === '1');
  check(!!num, `rotation=${rotationDeg}: page number text found in output`);
  if (num) {
    const visualWidth = rotationDeg === 90 || rotationDeg === 270 ? rawHeight : rawWidth;
    const visualHeight = rotationDeg === 90 || rotationDeg === 270 ? rawWidth : rawHeight;
    // "bottom center" as SEEN on screen: near the visual bottom edge (large vy, y-down), near
    // horizontal center (vx ≈ visualWidth/2).
    const nearBottom = num.vy > visualHeight - 60;
    const nearHCenter = Math.abs(num.vx - visualWidth / 2) < 20;
    check(nearBottom, `rotation=${rotationDeg}: page number lands near the VISUAL bottom edge (vy=${num.vy.toFixed(1)}, visualHeight=${visualHeight})`);
    check(nearHCenter, `rotation=${rotationDeg}: page number is horizontally centered as SEEN on screen (vx=${num.vx.toFixed(1)}, expected ≈${visualWidth / 2})`);
    check(num.upright, `rotation=${rotationDeg}: page number glyph is upright as rendered, not sideways/upside-down`);
  }
}

console.log('\n=== addWatermark: correct visual position AND upright-relative-to-its-own-angle orientation ===');
{
  const rawWidth = 600, rawHeight = 800;
  // addWatermark's non-diagonal centering approximates the glyph bbox center from baseline
  // metrics (width/2 - textWidth/2, height/2 - fontSize/2), which carries its own small,
  // constant offset from the true geometric visual center — unrelated to page rotation. Rather
  // than assert an arbitrary absolute tolerance, use the rotation=0 case (page /Rotate absent,
  // so this is exactly today's existing, already-shipped behavior) as the reference offset, and
  // assert the OTHER three rotations reproduce that exact same offset from their own visual
  // center — which is precisely what "the rotation transform is correct" means, and immune to
  // whatever the baseline-vs-bbox-center approximation's constant happens to be.
  let referenceOffsetX = 0, referenceOffsetY = 0;
  for (const rotationDeg of [0, 90, 180, 270]) {
    const file = await buildRotatedPdf(rawWidth, rawHeight, rotationDeg);
    const outBytes = await addWatermark(file, 'WM', { rotation: 0, position: 'center' });
    const items = await renderAndInspect(outBytes);
    const wm = items.find((i) => i.str.includes('WM'));
    check(!!wm, `rotation=${rotationDeg}: watermark text found in output`);
    if (wm) {
      const visualWidth = rotationDeg === 90 || rotationDeg === 270 ? rawHeight : rawWidth;
      const visualHeight = rotationDeg === 90 || rotationDeg === 270 ? rawWidth : rawHeight;
      const offsetX = wm.vx - visualWidth / 2;
      const offsetY = wm.vy - visualHeight / 2;
      if (rotationDeg === 0) {
        referenceOffsetX = offsetX;
        referenceOffsetY = offsetY;
        check(Math.abs(offsetX) < 50 && Math.abs(offsetY) < 50, `rotation=0 reference offset from visual center is small (offsetX=${offsetX.toFixed(1)}, offsetY=${offsetY.toFixed(1)})`);
      } else {
        check(
          Math.abs(offsetX - referenceOffsetX) < 1 && Math.abs(offsetY - referenceOffsetY) < 1,
          `rotation=${rotationDeg}: offset from its own VISUAL center matches the rotation=0 reference offset (got offsetX=${offsetX.toFixed(2)} vs ref ${referenceOffsetX.toFixed(2)}, offsetY=${offsetY.toFixed(2)} vs ref ${referenceOffsetY.toFixed(2)}) — proves the rotation transform is correct, not just coincidentally close`,
        );
      }
      check(wm.upright, `rotation=${rotationDeg}: watermark glyph is upright as rendered (rotation:0 requested)`);
    }
  }
}

console.log('\n=== addWatermark: diagonal angle composes correctly with page rotation ===');
{
  const rawWidth = 600, rawHeight = 800;
  for (const rotationDeg of [0, 90, 180, 270]) {
    const file = await buildRotatedPdf(rawWidth, rawHeight, rotationDeg);
    const outBytes = await addWatermark(file, 'WM', { rotation: 30, position: 'center' });
    const items = await renderAndInspect(outBytes);
    const wm = items.find((i) => i.str.includes('WM'));
    check(!!wm, `rotation=${rotationDeg}: diagonal watermark text found in output`);
    if (wm) {
      // A 30° diagonal watermark should appear tilted by exactly 30° on screen, REGARDLESS of
      // the page's own /Rotate — proving pageRotation + watermarkAngle composes additively and
      // consistently (cancelling the page's own rotation while preserving the requested tilt),
      // not by accident for only some rotation values.
      check(!wm.upright, `rotation=${rotationDeg}: a 30° diagonal watermark is NOT flagged as upright (it should be visibly tilted)`);
      check(Math.abs(wm.tiltDeg - 30) < 0.01, `rotation=${rotationDeg}: watermark tilt on screen is exactly 30° regardless of page rotation (got ${wm.tiltDeg.toFixed(2)}°)`);
    }
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
