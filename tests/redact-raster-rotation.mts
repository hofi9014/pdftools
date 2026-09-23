// Audit finding (fresh scanning round, lib/pdf-raster.ts) — rasterizePage()/rasterizePages()
// placed the redacted-page PNG using the RAW (unrotated) MediaBox size and a plain
// translate(0,0)+scale, completely ignoring the page's own /Rotate entry. But the PNG itself was
// rendered via pdf.js's page.getViewport({scale}), which defaults its own `rotation` parameter to
// `this.rotate` — so for a page with /Rotate 90/270 the PNG's pixel dimensions are already SWAPPED
// (landscape) and its content is already oriented the way a viewer displays it. Scaling that
// already-rotated bitmap into the raw (unrotated, still-portrait) MediaBox rectangle distorted the
// aspect ratio, and leaving /Rotate untouched then made a normal viewer apply that same rotation a
// SECOND time on top — redacting any rotated scanned page (routine for scanner output storing a
// landscape page as a portrait MediaBox + /Rotate 90/270) came back squished and/or
// sideways/upside-down instead of matching the original layout.
//
// Fixed with the same visualPageSize()/visualToRawPoint() pattern already verified empirically
// for addPageNumbers/addWatermark (Krok 17) — duplicated into pdf-raster.ts rather than imported
// from client-pdf.ts, which lib/redact-worker.ts's Web Worker bundle must not depend on.
//
// This test builds a REAL PDF with a distinctly-colored square in each of its 4 raw corners, for
// all four /Rotate values (0/90/180/270), and renders BOTH the original page and the
// rasterizePages() output through the REAL pdf.js pipeline (honoring /Rotate exactly as a real
// viewer would) at the same scale. If the fix is correct, sampling pixel color at each of the 4
// on-screen corners must give the SAME colors before and after redaction — proving no squish, no
// extra/missing rotation, and no mislocation. A redaction region of zero size is used so the page
// still gets flattened to an image (exercising the exact code path under test) without any pixel
// actually being blacked out, keeping the corner colors meaningful to compare.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

const canvasMod = await import('@napi-rs/canvas');
if (!(globalThis as Record<string, unknown>).DOMMatrix) {
  (globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
}
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as PdfJsModule;
pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

import { rasterizePages, type RasterCanvasFactory, type RasterCanvas, type RasterContext, type RedactRegion, type PdfjsLibLike } from '../lib/pdf-raster';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

const canvasFactory: RasterCanvasFactory = {
  create(w: number, h: number) {
    const canvas = canvasMod.createCanvas(w, h);
    const context = canvas.getContext('2d');
    return { canvas: canvas as unknown as RasterCanvas, context: context as unknown as RasterContext };
  },
  reset(ctx: unknown, w: number, h: number) {
    const c = (ctx as RasterContext).canvas as unknown as { width: number; height: number };
    c.width = w;
    c.height = h;
  },
  destroy(ctx: unknown) {
    const c = (ctx as RasterContext).canvas as unknown as { width: number; height: number };
    c.width = 0;
    c.height = 0;
  },
};

const RAW_W = 200;
const RAW_H = 300;
const MARK = 24; // colored corner square size, in pt
const INSET = 4; // inset from the raw edge, to avoid antialiasing at the exact boundary

interface RGB { r: number; g: number; b: number }
const RED: RGB = { r: 220, g: 20, b: 20 };
const GREEN: RGB = { r: 20, g: 180, b: 20 };
const BLUE: RGB = { r: 20, g: 20, b: 220 };
const YELLOW: RGB = { r: 220, g: 200, b: 20 };

async function buildSourcePdf(rotationDeg: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([RAW_W, RAW_H]);
  page.setRotation(degrees(rotationDeg));
  // Corners in RAW (unrotated) content space, unambiguous regardless of /Rotate.
  page.drawRectangle({ x: INSET, y: INSET, width: MARK, height: MARK, color: rgb(RED.r / 255, RED.g / 255, RED.b / 255) }); // raw bottom-left
  page.drawRectangle({ x: RAW_W - INSET - MARK, y: INSET, width: MARK, height: MARK, color: rgb(GREEN.r / 255, GREEN.g / 255, GREEN.b / 255) }); // raw bottom-right
  page.drawRectangle({ x: INSET, y: RAW_H - INSET - MARK, width: MARK, height: MARK, color: rgb(BLUE.r / 255, BLUE.g / 255, BLUE.b / 255) }); // raw top-left
  page.drawRectangle({ x: RAW_W - INSET - MARK, y: RAW_H - INSET - MARK, width: MARK, height: MARK, color: rgb(YELLOW.r / 255, YELLOW.g / 255, YELLOW.b / 255) }); // raw top-right
  return pdf.save();
}

async function renderViaPdfjs(pdfBytes: Uint8Array, scale: number): Promise<{ data: Buffer; width: number; height: number }> {
  const doc = await pdfjsLib.getDocument({ data: pdfBytes.slice(), standardFontDataUrl: pathToFileURL(join(ROOT, 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/').href }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale }); // rotation defaults to page.rotate — exactly what a real viewer does
  const canvas = canvasMod.createCanvas(Math.round(viewport.width), Math.round(viewport.height));
  const context = canvas.getContext('2d');
  await page.render({ canvasContext: context as unknown as CanvasRenderingContext2D, viewport }).promise;
  await doc.cleanup();
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return { data: Buffer.from(imageData.data), width: canvas.width, height: canvas.height };
}

function pixelAt(imgData: Buffer, canvasWidth: number, px: number, py: number): RGB {
  const idx = (py * canvasWidth + px) * 4;
  return { r: imgData[idx]!, g: imgData[idx + 1]!, b: imgData[idx + 2]! };
}

function closeEnough(a: RGB, b: RGB, tolerance = 40): boolean {
  return Math.abs(a.r - b.r) <= tolerance && Math.abs(a.g - b.g) <= tolerance && Math.abs(a.b - b.b) <= tolerance;
}

function colorName(c: RGB): string {
  for (const [name, ref] of [['RED', RED], ['GREEN', GREEN], ['BLUE', BLUE], ['YELLOW', YELLOW]] as [string, RGB][]) {
    if (closeEnough(c, ref, 40)) return name;
  }
  return `unknown(${c.r},${c.g},${c.b})`;
}

for (const rot of [0, 90, 180, 270]) {
  console.log(`\n=== /Rotate ${rot}: redacted (flattened) output visually matches the original ===`);
  const sourceBytes = await buildSourcePdf(rot);

  const region: RedactRegion = { page: 0, x: 0, y: 0, width: 0, height: 0 }; // zero-size — flattens the page, blacks out nothing
  const redactedBytes = await rasterizePages(pdfjsLib as unknown as PdfjsLibLike, canvasFactory, sourceBytes, [region], 2, {
    standardFontDataUrl: pathToFileURL(join(ROOT, 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/').href,
  });

  const scale = 1;
  const orig = await renderViaPdfjs(sourceBytes, scale);
  const after = await renderViaPdfjs(redactedBytes, scale);

  check(orig.width === after.width && orig.height === after.height, `rendered dimensions unchanged (no squish): original ${orig.width}x${orig.height}, after ${after.width}x${after.height}`);

  if (orig.width === after.width && orig.height === after.height) {
    // Sample near each of the 4 SCREEN corners (small inset to stay inside the colored square
    // after scale-2 render then scale-1 final compare — margin generous enough for rounding).
    const m = 6;
    const corners: [string, number, number][] = [
      ['top-left', m, m],
      ['top-right', orig.width - 1 - m, m],
      ['bottom-left', m, orig.height - 1 - m],
      ['bottom-right', orig.width - 1 - m, orig.height - 1 - m],
    ];
    for (const [label, px, py] of corners) {
      const origColor = pixelAt(orig.data, orig.width, px, py);
      const afterColor = pixelAt(after.data, after.width, px, py);
      check(closeEnough(origColor, afterColor), `screen corner "${label}" (${px},${py}): original=${colorName(origColor)} after=${colorName(afterColor)} — match`);
    }
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
