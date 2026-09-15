// Audit findings T1 + T16 — scripts/redact-raster-verify.mjs (a real, thorough diagnostic
// spike: raw-byte token search, inflated-stream search, PDF resource-dict inspection,
// pixel-level render comparison) imported the deleted lib/pdf-engine.ts and would crash
// on run. Rather than just delete it (T1), this ports its verification logic into a real,
// CI-ready automated test (T16) against rasterizePage() in lib/pdf-raster.ts — the actual
// per-page core of the CURRENT client-side redactPdfRaster() in lib/client-pdf.ts, called
// directly with a Node canvas factory (@napi-rs/canvas) instead of through
// redactPdfRaster()'s browser-only Worker/document.createElement wrapper, which is
// environment plumbing around this same core, not the redaction logic itself.
//
// Fixture: e2e/fixtures/redact-token.pdf (already in the repo) — 2 pages, a known token
// string REDACT_TEST_TOKEN_9f3a7c on page 1, ordinary text on page 2 that must survive.
//
// This is the redaction feature: getting it wrong means the "blacked-out" text is still
// recoverable from the PDF (a privacy leak), so this test checks structure, not just that
// something ran without throwing.

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

import { rasterizePage, REDACT_RENDER_SCALE, type RasterCanvasFactory, type RasterCanvas, type RasterContext, type RedactRegion, type PdfjsLibLike } from '../lib/pdf-raster';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

const TOKEN = 'REDACT_TEST_TOKEN_9f3a7c';
// PDF content streams may encode Tj string operands as a hex string (<...>) instead of a
// literal (...) string — this fixture's generator does exactly that (confirmed by inspecting
// the decompressed content stream directly), so any text-presence check must look for both
// forms or it silently never finds real, human-readable text.
const TOKEN_HEX = Buffer.from(TOKEN, 'ascii').toString('hex').toUpperCase();
function containsToken(text: string): boolean {
  return text.includes(TOKEN) || text.toUpperCase().includes(TOKEN_HEX);
}
const FIXTURE = join(ROOT, 'e2e', 'fixtures', 'redact-token.pdf');
const standardFontDataUrl = pathToFileURL(join(ROOT, 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/').href;

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

async function getText(buf: Uint8Array, pageNo: number) {
  // pdf.js transfers/detaches the input ArrayBuffer once handed to getDocument — slice() a
  // fresh copy each call so the caller's buffer stays usable across repeated calls.
  const doc = await pdfjsLib.getDocument({ data: buf.slice(), standardFontDataUrl }).promise;
  const page = await doc.getPage(pageNo);
  const content = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });
  await doc.cleanup();
  return { items: content.items as { str: string; width: number; height: number; transform: number[] }[], pageWidth: viewport.width, pageHeight: viewport.height };
}

async function renderPng(buf: Uint8Array, pageNo: number, scale: number) {
  const doc = await pdfjsLib.getDocument({ data: buf.slice(), standardFontDataUrl }).promise;
  const page = await doc.getPage(pageNo);
  const viewport = page.getViewport({ scale });
  const w = Math.max(1, Math.round(viewport.width));
  const h = Math.max(1, Math.round(viewport.height));
  const canvas = canvasMod.createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;
  await doc.cleanup();
  const img = ctx.getImageData(0, 0, w, h);
  return { w, h, data: img.data as Uint8ClampedArray };
}

function pixelBinaryDiffOutside(a: { w: number; h: number; data: Uint8ClampedArray }, b: { w: number; h: number; data: Uint8ClampedArray }, region: RedactRegion, pad: number) {
  const x0 = Math.max(0, Math.round(region.x * a.w) - pad);
  const y0 = Math.max(0, Math.round(region.y * a.h) - pad);
  const x1 = Math.min(a.w, Math.round((region.x + region.width) * a.w) + pad);
  const y1 = Math.min(a.h, Math.round((region.y + region.height) * a.h) + pad);
  const bit = (d: Uint8ClampedArray, i: number) => (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] > 128 ? 1 : 0);
  let diff = 0;
  let checked = 0;
  for (let y = 0; y < a.h; y++) {
    for (let x = 0; x < a.w; x++) {
      if (x >= x0 && x < x1 && y >= y0 && y < y1) continue;
      const i = (y * a.w + x) * 4;
      checked++;
      if (bit(a.data, i) !== bit(b.data, i)) diff++;
    }
  }
  return { diff, checked };
}

function regionBlackCoverage(img: { w: number; h: number; data: Uint8ClampedArray }, region: RedactRegion) {
  const x0 = Math.round(region.x * img.w);
  const y0 = Math.round(region.y * img.h);
  const x1 = Math.round((region.x + region.width) * img.w);
  const y1 = Math.round((region.y + region.height) * img.h);
  let total = 0;
  let dark = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (y < 0 || y >= img.h || x < 0 || x >= img.w) continue;
      const i = (y * img.w + x) * 4;
      total++;
      if (img.data[i] < 60 && img.data[i + 1] < 60 && img.data[i + 2] < 60) dark++;
    }
  }
  return total ? dark / total : 0;
}

async function inflateAllStreams(buf: Uint8Array): Promise<string[]> {
  // JPEG-compressed image XObjects don't inflate as zlib — that's expected and fine,
  // we only care whether any that DO inflate contain the token.
  const pako = (await import('pako')).default as { inflate(u: Uint8Array): Uint8Array };
  const hay = Buffer.from(buf);
  const out: string[] = [];
  let idx = 0;
  while (true) {
    const s = hay.indexOf('stream', idx);
    if (s === -1) break;
    let bodyStart = s + 6;
    if (hay[bodyStart] === 0x0d && hay[bodyStart + 1] === 0x0a) bodyStart += 2;
    else if (hay[bodyStart] === 0x0a) bodyStart += 1;
    const e = hay.indexOf('endstream', bodyStart);
    if (e === -1) break;
    let bodyEnd = e;
    while (bodyEnd > bodyStart && (hay[bodyEnd - 1] === 0x0a || hay[bodyEnd - 1] === 0x0d)) bodyEnd--;
    const body = hay.subarray(bodyStart, bodyEnd);
    try {
      out.push(Buffer.from(pako.inflate(body)).toString('latin1'));
    } catch { /* not zlib (e.g. a JPEG image stream) — skip */ }
    idx = e + 9;
  }
  return out;
}

console.log('=== redactPdfRaster (via rasterizePage core) — token is not recoverable after redaction ===');

const inputBytes = new Uint8Array(readFileSync(FIXTURE));
const inputStreams = await inflateAllStreams(inputBytes);
check(inputStreams.some(containsToken), 'sanity: the fixture actually contains the token before redaction (in its decompressed content stream)');

const p1 = await getText(inputBytes, 1);
const tokenItem = p1.items.find((i) => i.str.includes(TOKEN));
if (!tokenItem) throw new Error('Token not found on page 1 of the fixture — fixture changed?');
const region: RedactRegion = {
  page: 0,
  x: tokenItem.transform[4] / p1.pageWidth,
  y: (p1.pageHeight - tokenItem.transform[5] - tokenItem.height) / p1.pageHeight,
  width: tokenItem.width / p1.pageWidth,
  height: tokenItem.height / p1.pageHeight,
};

const documentOptions = { standardFontDataUrl };
const output = await rasterizePage(pdfjsLib as unknown as PdfjsLibLike, canvasFactory, inputBytes, 0, REDACT_RENDER_SCALE, [region], documentOptions);
check(output.length > 0, `rasterizePage produced output (${output.length} bytes)`);

// --- raw byte / stream evidence: the token must not be recoverable by any text search ---
check(!containsToken(Buffer.from(output).toString('latin1')), 'token absent from raw output bytes (no plain-text or hex-string leak)');
const streams = await inflateAllStreams(output);
check(!streams.some(containsToken), `token absent from all ${streams.length} inflatable content streams (checked as plain text and as a hex string)`);

// --- structural evidence: the redacted page must have no font/text resources left ---
const pdfDoc = await PDFDocument.load(output, { ignoreEncryption: true });
const page0 = pdfDoc.getPage(0);
const res0 = page0.node.Resources();
const cats0: Record<string, string[]> = {};
if (res0) {
  for (const [catName, catVal] of res0.entries()) {
    if (catVal instanceof PDFDict) cats0[catName.toString()] = catVal.keys().map((k) => k.toString());
  }
}
check(!cats0['/Font'], `redacted page has NO /Font resource left (got: ${JSON.stringify(cats0['/Font'] ?? null)}) — text is gone, not just visually covered`);
check(!!cats0['/XObject'] && cats0['/XObject'].length === 1, `redacted page has exactly one /XObject (the raster image) (got: ${JSON.stringify(cats0['/XObject'] ?? null)})`);

// --- getTextContent on the result must not recover the token ---
const r1 = await getText(output, 1);
const r1Text = r1.items.map((i) => i.str).join(' ');
check(!r1Text.includes(TOKEN), `pdfjs getTextContent on the redacted page finds no token (got ${r1.items.length} text items)`);

const r2 = await getText(output, 2);
const p2 = await getText(inputBytes, 2);
const r2Text = r2.items.map((i) => i.str).join(' ');
const p2Text = p2.items.map((i) => i.str).join(' ');
check(r2Text.length > 0 && r2Text === p2Text, `page 2 (not redacted) keeps its original text content intact (${r2.items.length} items)`);

// --- pixel evidence: black inside the region, structurally unchanged outside it ---
const inR1 = await renderPng(inputBytes, 1, REDACT_RENDER_SCALE);
const outR1 = await renderPng(output, 1, REDACT_RENDER_SCALE);
const coverage = regionBlackCoverage(outR1, region);
check(coverage > 0.9, `redaction rectangle is solidly black in the render (${(coverage * 100).toFixed(1)}% dark pixels)`);
const outsideDiff = pixelBinaryDiffOutside(inR1, outR1, region, 2);
check(outsideDiff.diff === 0, `page 1 content OUTSIDE the redacted region is pixel-identical (binarized) to the original (${outsideDiff.diff}/${outsideDiff.checked} differing)`);

const inR2 = await renderPng(inputBytes, 2, REDACT_RENDER_SCALE);
const outR2 = await renderPng(output, 2, REDACT_RENDER_SCALE);
const page2Diff = pixelBinaryDiffOutside(inR2, outR2, { page: 0, x: 0, y: 0, width: 0, height: 0 }, 0);
check(page2Diff.diff === 0, `page 2 (untouched) renders pixel-identical to the input (${page2Diff.diff}/${page2Diff.checked} differing)`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
