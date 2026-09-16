// Audit finding (Medium, engine area) — redactPdfRaster()'s per-page loop (both the main-
// thread fallback in lib/client-pdf.ts and the Web Worker path in lib/redact-worker.ts)
// called rasterizePage() once per redacted page, and EACH call did its own full
// PDFDocument.load() + PDFDocument.save() of the (growing) PDF bytes. A document redacted on
// N pages did N full parse+save cycles instead of one.
//
// Fixed with a new rasterizePages() in lib/pdf-raster.ts that loads once, mutates every
// affected page in one pass, and saves once — rasterizePage() (singular) is left completely
// untouched for compatibility with tests/redact-pdf-raster.mts, which exercises it directly.
//
// This test proves two things about rasterizePages(): (1) it does exactly ONE
// PDFDocument.load and ONE .save no matter how many pages are redacted (the actual
// performance fix, measured directly — not inferred from output alone), and (2) redacting
// two different pages in one batched call produces the identical result to the old
// call-rasterizePage-in-a-loop approach (the refactor didn't change behavior).

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PDFDocument, PDFDict } from 'pdf-lib';

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

import { rasterizePage, rasterizePages, REDACT_RENDER_SCALE, type RasterCanvasFactory, type RasterCanvas, type RasterContext, type RedactRegion, type PdfjsLibLike } from '../lib/pdf-raster';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

const FIXTURE = join(ROOT, 'e2e', 'fixtures', 'redact-token.pdf');
const standardFontDataUrl = pathToFileURL(join(ROOT, 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/').href;
const documentOptions = { standardFontDataUrl };

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

async function getPageItems(buf: Uint8Array, pageNo: number) {
  const doc = await pdfjsLib.getDocument({ data: buf.slice(), standardFontDataUrl }).promise;
  const page = await doc.getPage(pageNo);
  const content = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });
  await doc.cleanup();
  return { items: content.items as { str: string; width: number; height: number; transform: number[] }[], pageWidth: viewport.width, pageHeight: viewport.height };
}

function regionFor(item: { transform: number[]; width: number; height: number }, pageWidth: number, pageHeight: number): Omit<RedactRegion, 'page'> {
  return {
    x: item.transform[4] / pageWidth,
    y: (pageHeight - item.transform[5] - item.height) / pageHeight,
    width: item.width / pageWidth,
    height: item.height / pageHeight,
  };
}

console.log('=== rasterizePages: one load+save for N pages, same result as looping rasterizePage ===');

const inputBytes = new Uint8Array(readFileSync(FIXTURE));
const p1 = await getPageItems(inputBytes, 1);
const p2 = await getPageItems(inputBytes, 2);
const tokenItem = p1.items.find((i) => i.str.includes('REDACT_TEST_TOKEN'));
if (!tokenItem) throw new Error('Token not found on page 1 — fixture changed?');
const p2Item = p2.items[0];
check(!!p2Item, 'sanity: page 2 has at least one text item to redact');

const region1: RedactRegion = { page: 0, ...regionFor(tokenItem, p1.pageWidth, p1.pageHeight) };
const region2: RedactRegion = { page: 1, ...regionFor(p2Item, p2.pageWidth, p2.pageHeight) };

// --- (1) call-count proof: exactly one load, one save, regardless of page count ---
const origLoad = PDFDocument.load;
const origSave = PDFDocument.prototype.save;
let loadCount = 0;
let saveCount = 0;
(PDFDocument as unknown as { load: typeof PDFDocument.load }).load = (async (...args: Parameters<typeof PDFDocument.load>) => {
  loadCount++;
  return origLoad.apply(PDFDocument, args);
}) as typeof PDFDocument.load;
PDFDocument.prototype.save = async function (this: PDFDocument, ...args: Parameters<typeof origSave>) {
  saveCount++;
  return origSave.apply(this, args);
} as typeof origSave;

let batchedOutput: Uint8Array;
try {
  batchedOutput = await rasterizePages(pdfjsLib as unknown as PdfjsLibLike, canvasFactory, inputBytes, [region1, region2], REDACT_RENDER_SCALE, documentOptions);
} finally {
  (PDFDocument as unknown as { load: typeof PDFDocument.load }).load = origLoad;
  PDFDocument.prototype.save = origSave;
}

check(loadCount === 1, `rasterizePages did exactly 1 PDFDocument.load for 2 redacted pages (got ${loadCount})`);
check(saveCount === 1, `rasterizePages did exactly 1 PDFDocument.save for 2 redacted pages (got ${saveCount})`);

// --- (2) equivalence proof: batched result matches the old sequential-loop approach ---
let loopBytes = new Uint8Array(inputBytes);
loopBytes = await rasterizePage(pdfjsLib as unknown as PdfjsLibLike, canvasFactory, loopBytes, 0, REDACT_RENDER_SCALE, [region1], documentOptions);
loopBytes = await rasterizePage(pdfjsLib as unknown as PdfjsLibLike, canvasFactory, loopBytes, 1, REDACT_RENDER_SCALE, [region2], documentOptions);

async function pageTextContains(buf: Uint8Array, pageNo: number, needle: string): Promise<boolean> {
  const { items } = await getPageItems(buf, pageNo);
  return items.some((i) => i.str.includes(needle));
}

check(!(await pageTextContains(batchedOutput, 1, 'REDACT_TEST_TOKEN')), 'batched: page 1 token gone');
check(!(await pageTextContains(batchedOutput, 2, p2Item.str)), 'batched: page 2 redacted text gone');
check(!(await pageTextContains(loopBytes, 1, 'REDACT_TEST_TOKEN')), 'sanity (old loop): page 1 token gone');
check(!(await pageTextContains(loopBytes, 2, p2Item.str)), 'sanity (old loop): page 2 redacted text gone');

async function resourceCategories(buf: Uint8Array, pageIndex: number): Promise<Record<string, string[]>> {
  const doc = await PDFDocument.load(buf.slice(), { ignoreEncryption: true });
  const page = doc.getPage(pageIndex);
  const res = page.node.Resources();
  const cats: Record<string, string[]> = {};
  if (res) {
    for (const [catName, catVal] of res.entries()) {
      if (catVal instanceof PDFDict) cats[catName.toString()] = catVal.keys().map((k) => k.toString());
    }
  }
  return cats;
}

const batchedP1Cats = await resourceCategories(batchedOutput, 0);
const batchedP2Cats = await resourceCategories(batchedOutput, 1);
const loopP1Cats = await resourceCategories(loopBytes, 0);
const loopP2Cats = await resourceCategories(loopBytes, 1);
check(!batchedP1Cats['/Font'] && !loopP1Cats['/Font'], 'both approaches strip /Font from page 1');
check(!batchedP2Cats['/Font'] && !loopP2Cats['/Font'], 'both approaches strip /Font from page 2');
check(JSON.stringify(Object.keys(batchedP1Cats).sort()) === JSON.stringify(Object.keys(loopP1Cats).sort()), 'batched and looped approaches leave the same resource categories on page 1');
check(JSON.stringify(Object.keys(batchedP2Cats).sort()) === JSON.stringify(Object.keys(loopP2Cats).sort()), 'batched and looped approaches leave the same resource categories on page 2');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
