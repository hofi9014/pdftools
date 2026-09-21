// FINDING (engine, imagesToPdf pixel-vs-point unit mismatch, 2026-09-21) — pdf-lib's
// embedJpg/embedPng only ever expose an image's raw PIXEL dimensions (no DPI is parsed or
// exposed anywhere in pdf-lib), but imagesToPdf (jpg-to-pdf tool) passed those pixel values
// straight into addPage()/drawImage(), which are PDF POINTS (1/72in) — the same unit-mismatch
// class as the OCR and edit-pdf bugs fixed earlier this session. A 4032x3024px phone photo
// became a 4032x3024-POINT (56x42 INCH) page instead of a normal-sized one. Fixed by converting
// pixels to points at a 96 DPI assumption (the same fallback browsers use for DPI-less raster
// images), since neither pdf-lib nor the browser File API expose real image DPI without a
// dedicated JPEG/PNG metadata parser.
//
// This test builds a real PNG at a KNOWN pixel size via pdf-lib itself (draw a filled rect to
// an in-memory canvas-free PNG is awkward — instead uses @napi-rs/canvas, already a dev
// dependency of this repo's test suite, to produce real, valid PNG bytes) and verifies the
// resulting PDF page size against the exact expected point conversion — not just "smaller than
// before".

import { PDFDocument } from 'pdf-lib';

const canvasMod = await import('@napi-rs/canvas');

const { imagesToPdf } = await import('../lib/client-pdf');

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== imagesToPdf: pixel dimensions converted to PDF points (96 DPI), not used directly ===');

const PX_W = 400, PX_H = 300;
const canvas = canvasMod.createCanvas(PX_W, PX_H);
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'rgb(200,50,50)';
ctx.fillRect(0, 0, PX_W, PX_H);
const pngBytes = canvas.toBuffer('image/png');

const file = Object.assign(new Blob([pngBytes]), { name: 'photo.png' }) as unknown as File;

const margin = 20;
const blob = await imagesToPdf([file], margin);
const arrBuf = await (blob as Blob).arrayBuffer();
const doc = await PDFDocument.load(new Uint8Array(arrBuf));
check(doc.getPageCount() === 1, `exactly 1 page (got ${doc.getPageCount()})`);
const page = doc.getPage(0);
const { width, height } = page.getSize();

const PX_TO_PT = 72 / 96;
const expectedW = PX_W * PX_TO_PT + margin * 2;
const expectedH = PX_H * PX_TO_PT + margin * 2;
const oldBuggyW = PX_W + margin * 2; // what the pre-fix code would have produced (pixels used as points)

check(Math.abs(width - expectedW) < 0.01, `page width ≈ ${expectedW}pt at 96 DPI (got ${width})`);
check(Math.abs(height - expectedH) < 0.01, `page height ≈ ${expectedH}pt at 96 DPI (got ${height})`);
check(Math.abs(width - oldBuggyW) > 50, `page width is NOT the old buggy pixel-as-points value (${oldBuggyW}pt) — got ${width}`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
