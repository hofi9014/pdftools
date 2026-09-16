// Audit finding (Medium, engine area) — the SAME scale bug already fixed in editPdfClient
// (E2, commit 96c6229) also existed in lib/pdf/exportEditedPdf.ts's applyTextEdits(): the
// background-color sampler that picks a fill color to paint over replaced text read only the
// page's HEIGHT and reused it for BOTH scaleX and scaleY (`canvas.width / height`), instead
// of scaling X from the page's WIDTH. On a non-square page this samples the wrong pixel
// entirely, painting the "erased" text region with whatever color happens to be at the wrong
// spot on the source canvas.
//
// Deliberately non-square page (400x900pt) + differently-scaled canvas (200x600px ->
// scaleX=0.5, scaleY=0.6667, chosen so they differ) with two distinctly-colored single pixels:
// RED at the CORRECT sample point, BLUE at the OLD BUGGY sample point (same Y, since scaleY
// was never buggy) — whichever color applyTextEdits actually draws the background rectangle
// with tells us directly which formula ran.

import { PDFDocument, PDFPage } from 'pdf-lib';
import { applyTextEdits, type TextEdit } from '../lib/pdf/exportEditedPdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== exportEditedPdf: background-color sampler scales X from page WIDTH, not height ===');

const PDF_W = 400;
const PDF_H = 900;
const CANVAS_W = 200;
const CANVAS_H = 600;
// scaleX correct = 200/400 = 0.5, scaleY = 600/900 = 0.6667 (deliberately different)
// scaleX buggy (old code) = 200/900 = 0.2222

const edit: TextEdit = {
  id: 'e1', page: 1, x: 50, y: 100, width: 20, height: 10,
  originalText: 'old', newText: '', fontSize: 12, fontFamily: 'Noto Sans',
  color: '#000000', bold: false, italic: false,
};

const correctX = Math.round(edit.x * (CANVAS_W / PDF_W) + (edit.width * (CANVAS_W / PDF_W)) / 2); // 30
const correctY = Math.round(edit.y * (CANVAS_H / PDF_H) + (edit.height * (CANVAS_H / PDF_H)) / 2); // 70
const buggyX = Math.round(edit.x * (CANVAS_W / PDF_H) + (edit.width * (CANVAS_W / PDF_H)) / 2); // old formula's answer, using height for scaleX
check(Math.abs(correctX - buggyX) > 5, `sanity: correct sample x (${correctX}) and buggy sample x (${buggyX}) are far enough apart to be unambiguous`);

const canvasMod = await import('@napi-rs/canvas');
const canvas = canvasMod.createCanvas(CANVAS_W, CANVAS_H);
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'rgb(255,255,255)';
ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
ctx.fillStyle = 'rgb(255,0,0)'; // RED at the CORRECT sample point
ctx.fillRect(correctX, correctY, 1, 1);
ctx.fillStyle = 'rgb(0,0,255)'; // BLUE at the OLD BUGGY sample point
ctx.fillRect(buggyX, correctY, 1, 1);

const doc = await PDFDocument.create();
doc.addPage([PDF_W, PDF_H]);

const canvasByPage = new Map([[1, canvas as unknown as HTMLCanvasElement]]);

const original = PDFPage.prototype.drawRectangle;
let captured: { red: number; green: number; blue: number } | null = null;
PDFPage.prototype.drawRectangle = function (opts: { color?: { red: number; green: number; blue: number } }) {
  if (opts.color) captured = { red: opts.color.red, green: opts.color.green, blue: opts.color.blue };
  return original.call(this, opts);
} as typeof original;

try {
  await applyTextEdits(doc, [edit], canvasByPage);
} finally {
  PDFPage.prototype.drawRectangle = original;
}

check(captured !== null, 'drawRectangle was actually called with a color');
if (captured) {
  const c = captured as { red: number; green: number; blue: number };
  check(c.red > 0.9 && c.green < 0.1 && c.blue < 0.1, `background color sampled at the CORRECT (width-scaled) point — expected red, got rgb(${c.red.toFixed(2)}, ${c.green.toFixed(2)}, ${c.blue.toFixed(2)})`);
  check(!(c.blue > 0.9 && c.red < 0.1), `background color is NOT the old buggy (height-scaled) sample point's blue — got rgb(${c.red.toFixed(2)}, ${c.green.toFixed(2)}, ${c.blue.toFixed(2)})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
