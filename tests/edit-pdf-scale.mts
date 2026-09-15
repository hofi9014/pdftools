// Audit finding E2 — editPdfClient only ever read the PDF page's HEIGHT
// (page.getSize().height) and reused it for BOTH axes: scaleX was computed as
// pdfHeight / pageHeight (should be pdfWidth / pageWidth), and one code path even
// multiplied by pdfHeight where it should have multiplied by pdfWidth. Since a real
// page is virtually never square (A4 is 595.28 x 841.89pt), every annotation
// (rect/highlight/line/arrow/circle/image/text/freehand) added through the edit-pdf
// tool landed at the wrong X position and width on every non-square page.
//
// This test uses a synthetic page whose width and height scale differently from the
// preview canvas on purpose (400x900pt page, 200x600px preview -> scaleX=2, scaleY=1.5,
// deliberately NOT equal) so the old bug's wrong answer and the fixed correct answer are
// far apart and unambiguous, rather than coincidentally close.

import { PDFDocument, PDFPage } from 'pdf-lib';
import { editPdfClient } from '../lib/client-pdf';
import type { PdfEditElement } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(buf: Uint8Array, name: string): File {
  const blob = new Blob([buf]);
  return Object.assign(blob, { name }) as unknown as File;
}

console.log('=== E2: editPdfClient scales X from page width, not height ===');
{
  // Deliberately non-square, non-proportional-to-preview page.
  const PDF_W = 400;
  const PDF_H = 900;
  const PREVIEW_W = 200;
  const PREVIEW_H = 600;
  // scaleX should be 400/200 = 2, scaleY should be 900/600 = 1.5 — different on purpose.

  const doc = await PDFDocument.create();
  doc.addPage([PDF_W, PDF_H]);
  const bytes = await doc.save();
  const file = toFile(bytes, 'synthetic.pdf');

  const rectEl: PdfEditElement = { type: 'rect', x: 100, y: 50, width: 60, height: 30, color: '#ff0000' };

  // Spy on PDFPage.drawRectangle to capture the exact coordinates editPdfClient
  // actually draws with, without needing to re-parse the output PDF's content stream.
  const original = PDFPage.prototype.drawRectangle;
  let captured: { x: number; y: number; width: number; height: number } | null = null;
  PDFPage.prototype.drawRectangle = function (opts: { x: number; y: number; width: number; height: number }) {
    captured = { x: opts.x, y: opts.y, width: opts.width, height: opts.height };
    return original.call(this, opts);
  } as typeof original;

  try {
    await editPdfClient(file, 0, [rectEl], PREVIEW_W, PREVIEW_H);
  } finally {
    PDFPage.prototype.drawRectangle = original;
  }

  check(captured !== null, 'drawRectangle was actually called');
  if (captured) {
    const c = captured as { x: number; y: number; width: number; height: number };
    const expectedX = rectEl.x * (PDF_W / PREVIEW_W); // 100 * 2 = 200
    const buggyX = rectEl.x * (PDF_H / PREVIEW_H); // the old bug's answer: 100 * 1.5 = 150 (via scaleX) or 450 (via the ternary branch) — either way, wrong
    check(Math.abs(c.x - expectedX) < 0.01, `x uses the page WIDTH-based scale: expected ${expectedX}, got ${c.x}`);
    check(Math.abs(c.x - buggyX) > 1, `x is NOT the old height-based miscalculation (${buggyX}) — got ${c.x}`);

    const expectedWidth = (rectEl.width ?? 0) * (PDF_W / PREVIEW_W); // 60 * 2 = 120
    check(Math.abs(c.width - expectedWidth) < 0.01, `rectangle width uses the same correct scaleX: expected ${expectedWidth}, got ${c.width}`);

    // Y axis was never buggy — regression guard that the fix didn't disturb it.
    const scaleY = PDF_H / PREVIEW_H; // 1.5
    const expectedY = PDF_H - (rectEl.y * scaleY) - (rectEl.height ?? 0) * scaleY; // top-left y -> pdf-lib bottom-left y, minus height
    check(Math.abs(c.y - expectedY) < 0.01, `y (unaffected by this fix) still correct: expected ${expectedY}, got ${c.y}`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
