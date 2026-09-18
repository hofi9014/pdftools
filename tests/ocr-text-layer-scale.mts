// FINDING (engine, OCR invisible text-layer scale, 2026-09-18) — createOcrPage() converted
// Tesseract's word.bbox (pixel space of the canvas actually OCR'd — the PDF page's point size
// x the fixed render scale of 2.0 used in ocrPdfClient) into PDF point space by dividing by a
// hardcoded 2000x2800, not the real canvas dimensions. That divisor is only correct for a
// hypothetical ~1000x1400pt page — no standard page size (Letter 612x792, A4 595x842, Legal
// 612x1008...) matches it, so on every real scanned document the invisible searchable-text
// layer was placed and sized using the wrong scale (~1.6-1.7x too small for Letter/A4),
// compressing it into roughly the bottom-left 60% of the page instead of aligning with the
// visible scanned glyphs. Universal, silent misalignment on real documents — the same class of
// bug as the font-name-alias fix earlier in this engine-improvements series, not a rare edge
// case. Fixed by deriving the scale from the actual canvas width/height passed in from
// ocrPdfClient (exact for any page size or future render-scale change), instead of guessing.
// This test drives createOcrPage() directly (it needs only pdf-lib, no canvas/DOM/Tesseract),
// building a real PDF page at a known size, feeding a word with a known pixel bbox for a known
// canvas size, and reading the actual drawn text position/size back out of the saved PDF via
// pdf.js's operator list — verifying the exact expected math, not just "didn't crash". Confirmed
// via git stash that the pre-fix code fails all 6 position/size assertions here (e.g. fontSize
// comes out 11.31pt instead of 20pt on a Letter page — 52% too small).
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

const canvasMod = await import('@napi-rs/canvas');
if (!(globalThis as Record<string, unknown>).DOMMatrix) {
  (globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
}
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

const { createOcrPage } = await import('../lib/client-ocr');

const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
const fontBytes = readFileSync(join(ROOT, 'public/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf'));

async function buildTestPdf(widthPt: number, heightPt: number): Promise<PDFDocument> {
  const pdf = await PDFDocument.create();
  pdf.addPage([widthPt, heightPt]);
  return pdf;
}

// embedLiberationSans (lib/client-pdf.ts) fetches its font from a browser-relative URL — not
// usable from a Node test, so this loads the same on-disk font file directly for test purposes.
async function embedTestFont(pdf: PDFDocument) {
  pdf.registerFontkit(fontkit);
  return pdf.embedFont(fontBytes, { subset: true });
}

async function extractDrawnTextPositions(pdfBytes: Uint8Array): Promise<{ x: number; y: number; fontSize: number }[]> {
  const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const page = await doc.getPage(1);
  const opList = await page.getOperatorList();
  const OPS = (pdfjsLib as unknown as { OPS: Record<string, number> }).OPS;
  const OPS_MAP: Record<number, string> = {};
  for (const [name, id] of Object.entries(OPS)) OPS_MAP[id as number] = name;

  const results: { x: number; y: number; fontSize: number }[] = [];
  let currentSize = 0;
  for (let i = 0; i < opList.fnArray.length; i++) {
    const name = OPS_MAP[opList.fnArray[i]!];
    const args = opList.argsArray[i] as unknown[];
    if (name === 'setFont') currentSize = args[1] as number;
    if (name === 'setTextMatrix') {
      const m = (args as unknown[])[0] as Float32Array;
      results.push({ x: m[4]!, y: m[5]!, fontSize: currentSize });
    }
  }
  return results;
}

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== createOcrPage: pixel->point scale derived from actual canvas size, not hardcoded 2000x2800 ===');

// Letter (612x792pt), OCR'd at the fixed render scale of 2.0 used by ocrPdfClient
// -> canvas is exactly 1224x1584px. A word at pixel bbox (100,100)-(300,150) should land at
// PDF point (100*0.5, 792-150*0.5) = (50, 717) with fontSize (150-100)*0.5*0.8 = 20.
{
  const origPdf = await buildTestPdf(612, 792);
  const newPdf = await PDFDocument.create();
  const font = await embedTestFont(newPdf);
  const words = [{ text: 'Test', bbox: { x0: 100, y0: 100, x1: 300, y1: 150 } }];
  const { dropped } = await createOcrPage(newPdf, origPdf, 0, words, font, 1224, 1584);
  check(dropped === 0, 'Letter: word not dropped (glyph coverage ok)');
  const bytes = await newPdf.save();
  const positions = await extractDrawnTextPositions(bytes);
  check(positions.length === 1, `Letter: exactly one drawn text run (got ${positions.length})`);
  const p = positions[0]!;
  check(Math.abs(p.x - 50) < 0.5, `Letter: x ≈ 50 (got ${p.x.toFixed(2)})`);
  check(Math.abs(p.y - 717) < 0.5, `Letter: y ≈ 717 (got ${p.y.toFixed(2)})`);
  check(Math.abs(p.fontSize - 20) < 0.5, `Letter: fontSize ≈ 20 (got ${p.fontSize.toFixed(2)})`);
}

// A4 (595.28x841.89pt) -> canvas 1190.56x1683.78px (viewport.width/height are fractional;
// canvas.width/height truncate to integers per the HTML Canvas spec, exactly as the real
// ocrPdfClient call site does) -> the derived scale must still land the word correctly,
// proving this isn't a Letter-specific coincidence.
{
  const widthPt = 595.28, heightPt = 841.89;
  const canvasWidth = Math.trunc(widthPt * 2);
  const canvasHeight = Math.trunc(heightPt * 2);
  const origPdf = await buildTestPdf(widthPt, heightPt);
  const newPdf = await PDFDocument.create();
  const font = await embedTestFont(newPdf);
  const words = [{ text: 'Test', bbox: { x0: 200, y0: 300, x1: 400, y1: 340 } }];
  await createOcrPage(newPdf, origPdf, 0, words, font, canvasWidth, canvasHeight);
  const bytes = await newPdf.save();
  const positions = await extractDrawnTextPositions(bytes);
  const p = positions[0]!;
  const expectedScaleX = widthPt / canvasWidth;
  const expectedScaleY = heightPt / canvasHeight;
  const expectedX = 200 * expectedScaleX;
  const expectedY = heightPt - 340 * expectedScaleY;
  check(Math.abs(p.x - expectedX) < 0.5, `A4: x ≈ ${expectedX.toFixed(2)} (got ${p.x.toFixed(2)})`);
  check(Math.abs(p.y - expectedY) < 0.5, `A4: y ≈ ${expectedY.toFixed(2)} (got ${p.y.toFixed(2)})`);
  // Regression guard: the OLD hardcoded 2000x2800 divisor would have placed this word at a
  // materially different, WRONG position — prove the new position is NOT that wrong one.
  const oldWrongX = 200 * (widthPt / 2000);
  check(Math.abs(p.x - oldWrongX) > 5, `A4: fixed position is NOT the old hardcoded-scale position (old would be ${oldWrongX.toFixed(2)}, got ${p.x.toFixed(2)})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
