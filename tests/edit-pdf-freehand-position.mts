// FINDING (engine, editPdfClient freehand position/size, 2026-09-21) — freehand elements
// always carry el.x=el.y=0 (position is encoded entirely in el.points, in the same
// canvas-pixel space as every other tool's x/y — see EditLayer.tsx's clientToImg). Every OTHER
// element type (rect/line/circle/text/image) scales its real x/y/width/height by scaleX/scaleY
// to land at the correct PDF point-space position, but the freehand branch instead rasterized
// the stroke onto an arbitrary FIXED 2000x2000 canvas and placed it at a FIXED (sx, sy-500)
// position with a FIXED 500x500 (scaled) size — completely ignoring where the user actually
// drew and how big the drawing was. Every freehand annotation landed squished into the same
// fixed spot in the page's top-left area, regardless of the real drawing.
//
// Fixed by computing the stroke's own bounding box in pixel space, sizing the raster canvas to
// exactly that box (plus stroke-width padding), and placing the result at the box's real,
// scaled PDF position/size — the same scaleX/scaleY conversion already used correctly for
// every other element type in this function.
//
// This test polyfills document.createElement('canvas') with @napi-rs/canvas (already a dev
// dependency of this repo's test suite) so the real editPdfClient code path — including its
// canvas rasterization — runs unmodified, then spies on PDFPage.drawImage to capture the exact
// placement editPdfClient actually used.

import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument, PDFPage } from 'pdf-lib';

(globalThis as unknown as { document: unknown }).document = {
  createElement: (tag: string) => {
    if (tag !== 'canvas') throw new Error(`unexpected createElement(${tag})`);
    return createCanvas(1, 1);
  },
};

const { editPdfClient } = await import('../lib/client-pdf');
type PdfEditElement = Parameters<typeof editPdfClient>[2][number];

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(buf: Uint8Array, name: string): File {
  return Object.assign(new Blob([buf as BlobPart]), { name }) as unknown as File;
}

console.log('=== editPdfClient: freehand strokes land at their real drawn position/size, not a fixed spot ===');

const PDF_W = 600, PDF_H = 900;
const PREVIEW_W = 300, PREVIEW_H = 450; // scaleX = scaleY = 2, on purpose simple for this check

const doc = await PDFDocument.create();
doc.addPage([PDF_W, PDF_H]);
const bytes = await doc.save();
const file = toFile(bytes, 'synthetic.pdf');

// A short stroke drawn well away from the origin, in preview-pixel space: from (100,150) to
// (140,170) — NOT near (0,0), so a bug that always places freehand at the origin is unambiguous.
const points = [{ x: 100, y: 150 }, { x: 120, y: 155 }, { x: 140, y: 170 }];
const freehandEl: PdfEditElement = { type: 'freehand', x: 0, y: 0, points, size: 3, color: '#000000' };

// Since 2026-11-23 a freehand stroke is drawn as a vector path (it was a PNG raster, twice as
// thick as on screen): capture the path pdf-lib is asked to draw.
const original = PDFPage.prototype.drawSvgPath;
const captured: { path: string; borderWidth?: number }[] = [];
PDFPage.prototype.drawSvgPath = function (path: string, opts?: { borderWidth?: number }) {
  captured.push({ path, borderWidth: opts?.borderWidth });
  return original.call(this, path, opts as never);
} as typeof original;

try {
  await editPdfClient(file, 0, [freehandEl], PREVIEW_W, PREVIEW_H);
} finally {
  PDFPage.prototype.drawSvgPath = original;
}

check(captured.length === 1, `one path drawn for the freehand stroke (got ${captured.length})`);
if (captured.length === 1) {
  const c = captured[0]!;
  // Path points are page points with y negated (drawSvgPath flips y around its 0,0 anchor).
  const pts = [...c.path.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: -Number(m[2]) }));
  const expected = points.map((p) => ({ x: p.x * (PDF_W / PREVIEW_W), y: PDF_H - p.y * (PDF_H / PREVIEW_H) }));
  check(pts.length === 3 && pts.every((p, k) => Math.abs(p.x - expected[k]!.x) < 0.01 && Math.abs(p.y - expected[k]!.y) < 0.01),
    `every point where it was drawn, scaled (${pts.map((p) => `${p.x},${p.y}`).join(' ')} vs ${expected.map((p) => `${p.x},${p.y}`).join(' ')})`);
  check(Math.abs((c.borderWidth ?? 0) - 3 * (PDF_W / PREVIEW_W)) < 0.01, `as thick as on screen: 3 px × 2 = 6 pt (got ${c.borderWidth})`);
  const oldBuggyX = 0, oldBuggyY = PDF_H - 500;
  check(Math.abs(pts[0]!.x - oldBuggyX) > 50 || Math.abs(pts[0]!.y - oldBuggyY) > 50, 'not the old fixed top-left spot');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
