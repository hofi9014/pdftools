// FINDING (engine, edit-pdf text-position/size, 2026-09-18) — TextBlock/TextEdit's x/y/
// width/height/fontSize are produced by lib/pdf/extractTextBlocks.ts via pdf.js's
// viewport.convertToViewportPoint() and a `* renderScale` multiply, i.e. CANVAS PIXEL space at
// the fixed render scale (1.5) used throughout components/edit-pdf/ — never PDF point space.
// TextEditPopup.tsx forwards block.x/y/width/height unchanged into the TextEdit it saves, and
// lib/pdf/exportEditedPdf.ts's applyTextEdits() drew directly onto the PDF page via pdf-lib
// (which only understands points) as if those numbers were already points. Every saved text
// edit — both the redrawn replacement text and its white-out background box — landed at
// renderScale× the correct offset and size, on every real document, on every use of edit-pdf's
// core "click text, retype, save" feature; the existing tests/export-edited-pdf-scale.mts test
// (a prior, narrower fix to the same function's background-color sampler) was itself validated
// against synthetic point-space TextEdit values that don't match what the real UI ever sends,
// so it never caught this.
//
// Fixed by adding a `renderScale` parameter to applyTextEdits/exportEditedPdf (default 1, so
// the existing point-space-input test is unaffected) that divides x/y/width/height/fontSize
// back to points before any PDF-drawing math runs; components/edit-pdf/PdfEditor.tsx's real
// call site now passes its actual renderScale (1.5).
//
// This test drives the REAL pipeline end-to-end: builds a real PDF with pdf-lib containing one
// word at a KNOWN point-space position, runs it through the actual extractTextBlocks() (pdf.js
// + the same renderScale used by the UI) to get a pixel-space TextBlock — confirming it really
// is ≈1.5x the true position, not an assumption — builds a TextEdit from it exactly as
// TextEditPopup.tsx does, then reads the actual drawn erasure-rectangle position back out of
// the saved PDF via pdf.js's operator list (composing the transform/cm stack, since pdf-lib
// emits the rectangle's own path in a locally-transformed space). Without renderScale, the
// rectangle lands 50pt away from the true position; with it, it lands at EXACTLY the expected
// point (96.00 == trueX(100) - margin(4), zero deviation).
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

const canvasMod = await import('@napi-rs/canvas');
if (!(globalThis as Record<string, unknown>).DOMMatrix) {
  (globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
}
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
const { extractTextBlocks } = await import('../lib/pdf/extractTextBlocks');
const { applyTextEdits } = await import('../lib/pdf/exportEditedPdf');

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== edit-pdf: TextBlock pixel-space coords must be converted back to PDF points before drawing ===');

// Real PDF, Letter size, one word "Hello" drawn at a KNOWN PDF-point position.
const PDF_W = 612, PDF_H = 792;
const trueX = 100, trueY = 700, trueSize = 12;

const origPdf = await PDFDocument.create();
const page = origPdf.addPage([PDF_W, PDF_H]);
const font = await origPdf.embedFont(StandardFonts.Helvetica);
page.drawText('Hello', { x: trueX, y: trueY, size: trueSize, font });
const origBytes = await origPdf.save();

// Extract via the real UI pipeline: pdf.js text content + extractTextBlocks at the same
// renderScale=1.5 used throughout components/edit-pdf/.
const RENDER_SCALE = 1.5;
const doc = await pdfjsLib.getDocument({ data: origBytes.slice(0) }).promise;
const pjsPage = await doc.getPage(1);
const viewport = pjsPage.getViewport({ scale: RENDER_SCALE, rotation: 0 });
const blocks = await extractTextBlocks(pjsPage, 1, viewport.height, RENDER_SCALE, 0);
check(blocks.length === 1, `exactly one text block extracted (got ${blocks.length})`);
const block = blocks[0]!;

// Sanity: confirm the block's x is genuinely pixel-space (≈1.5x the true point-space x),
// not already point-space — this is the root cause, not an assumption.
check(Math.abs(block.x - trueX * RENDER_SCALE) < 2, `block.x is pixel-space (≈${(trueX * RENDER_SCALE).toFixed(1)}), got ${block.x.toFixed(1)}`);

// Build a TextEdit exactly as TextEditPopup.tsx does: block.x/y/width/height carried through
// unchanged (real UI never converts them).
const edit = {
  id: block.id, page: 1, x: block.x, y: block.y, width: block.width, height: block.height,
  originalText: block.text, newText: 'Bye', fontSize: block.fontSize, fontFamily: 'Noto Sans',
  color: '#000000', bold: false, italic: false,
};

async function drawnRectXAt(bytes: Uint8Array): Promise<number | null> {
  const d = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  const p = await d.getPage(1);
  const opList = await p.getOperatorList();
  const OPS = (pdfjsLib as unknown as { OPS: Record<string, number> }).OPS;
  const OPS_MAP: Record<number, string> = {};
  for (const [name, id] of Object.entries(OPS)) OPS_MAP[id as number] = name;
  // pdf-lib's drawRectangle emits its own local-space path preceded by one or more `cm`
  // (transform) operators — possibly several in a row, cumulative/multiplicative like any PDF
  // transform stack — carrying the actual absolute translation; compose them, don't just take
  // the last one's own raw args.
  let m: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
  for (let i = 0; i < opList.fnArray.length; i++) {
    const name = OPS_MAP[opList.fnArray[i]!];
    if (name === 'transform') {
      const t = opList.argsArray[i] as [number, number, number, number, number, number];
      m = [
        t[0] * m[0] + t[1] * m[2],
        t[0] * m[1] + t[1] * m[3],
        t[2] * m[0] + t[3] * m[2],
        t[2] * m[1] + t[3] * m[3],
        t[4] * m[0] + t[5] * m[2] + m[4],
        t[4] * m[1] + t[5] * m[3] + m[5],
      ];
    }
    if (name === 'save') continue;
    if (name === 'constructPath') return m[4];
  }
  return null;
}

// WITHOUT the renderScale fix (old call signature — defaults to 1, no conversion): the
// erasure rectangle lands at the WRONG, pixel-space-as-if-points position.
{
  const pdf = await PDFDocument.load(origBytes, { ignoreEncryption: true });
  await applyTextEdits(pdf, [edit]); // no renderScale passed -> defaults to 1 (old behavior)
  const bytes = await pdf.save();
  const rectX = await drawnRectXAt(bytes);
  check(rectX !== null, 'old behavior: a rectangle was drawn');
  if (rectX !== null) {
    const distFromTrue = Math.abs(rectX - (trueX - 4));
    check(distFromTrue > 10, `old (unfixed) call: rectangle x is NOT near the true point-space position (dist ${distFromTrue.toFixed(1)}) — proves the bug exists without the fix`);
  }
}

// WITH the renderScale fix: the erasure rectangle lands at the correct point-space position.
{
  const pdf = await PDFDocument.load(origBytes, { ignoreEncryption: true });
  await applyTextEdits(pdf, [edit], undefined, RENDER_SCALE);
  const bytes = await pdf.save();
  const rectX = await drawnRectXAt(bytes);
  check(rectX !== null, 'fixed behavior: a rectangle was drawn');
  if (rectX !== null) {
    const expectedX = trueX - 4; // margin=4 subtracted in applyTextEdits
    check(Math.abs(rectX - expectedX) < 1, `fixed call: rectangle x ≈ ${expectedX} (got ${rectX.toFixed(2)})`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
