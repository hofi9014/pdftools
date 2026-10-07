// Photos of a page as pictures of their own in the faithful layout (cutOutPictures in
// lib/pdf/fixedLayoutPdf.ts, the writers, and the reader for the way back to PDF).
//
// Why it exists: every photo used to be baked into the one page picture behind the text — it
// could not be moved, replaced or deleted. Each image the PDF paints is now cut out of the page
// and anchored on its own, above the page picture and behind the text.
//
// The claim that makes this safe is "page picture + cut-out pictures = the page as it was", and
// that is what is measured here, on a PDF built for the purpose (a plain photo, a photo clipped
// to a smaller shape, two images lying on one another, a photo with a vector shape painted over
// it, a small icon, an image that is clipped away entirely) and compared pixel by pixel with
// pdf.js's rendering of the same page:
//   1. which images become pictures, and where (the icon and the invisible one do not);
//   2. the composite equals the page; the page picture no longer contains the photos;
//   3. a page tiled with more than twelve images is left alone;
//   4. .docx and .odt carry the pictures at their positions, above the page picture;
//   5. the readers give them back and the PDF made from the document equals the page again.
// The same through the real pages and a real word processor: e2e/pdf-to-word-fixed-layout.mts.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { PDFDocument, StandardFonts, rgb, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
(globalThis as Record<string, unknown>).document = { createElement: (t: string) => (t === 'canvas' ? canvasMod.createCanvas(1, 1) : {}) };
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.startsWith('/')) return new Response(new Uint8Array(readFileSync(join(ROOT, 'public', url))));
  return realFetch(input, init);
}) as typeof fetch;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

const { pdfToFixedPages, imageCandidates, fixedBackgroundScale } = await import('../lib/pdf/fixedLayoutPdf.ts');
const { renderFixedPagesToDocx } = await import('../lib/pdf/fixedLayoutDocx.ts');
const { renderFixedPagesToOdt } = await import('../lib/pdf/fixedLayoutOdt.ts');
const { readFixedDocx, readFixedOdt } = await import('../lib/pdf/fixedLayoutRead.ts');
const { renderPlacedPagesToPdf } = await import('../lib/pdf/fixedLayoutToPdf.ts');
const { initPdfjs, pdfjsDocOptions } = await import('../lib/client-pdf.ts');
type FixedPage = import('../lib/pdf/fixedLayoutDocx.ts').FixedPage;
const pdfjsLib = await import('pdfjs-dist');
await initPdfjs();

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const W = 400;
const H = 500;

/** A "photo": smooth colour gradients in one hue, so that a JPEG keeps it almost exactly. */
function photo(hue: number, w = 300, h = 200, type: 'image/jpeg' | 'image/png' = 'image/jpeg'): Uint8Array {
  const c = canvasMod.createCanvas(w, h);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, `hsl(${hue}, 70%, 35%)`);
  grad.addColorStop(1, `hsl(${hue + 40}, 70%, 60%)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.fillStyle = `hsl(${hue + 180}, 60%, 50%)`;
  g.beginPath();
  g.arc(w * 0.3, h * 0.4, h * 0.25, 0, Math.PI * 2);
  g.fill();
  return new Uint8Array(type === 'image/png' ? c.toBuffer('image/png') : c.toBuffer('image/jpeg', 92));
}

// Boxes are given from the TOP of the page, as the layout uses them.
const A = { x: 40, y: 60, w: 150, h: 100 };
const B = { x: 220, y: 60, w: 150, h: 100 };
const C1 = { x: 40, y: 200, w: 120, h: 80 };
const C2 = { x: 60, y: 215, w: 120, h: 80 };
const E = { x: 220, y: 200, w: 150, h: 100 };
const ICON = { x: 40, y: 330, w: 16, h: 16 };
const HIDDEN = { x: 220, y: 330, w: 100, h: 60 };

async function buildPdf(withText: boolean): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([W, H]);
  const at = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x, y: H - b.y - b.h, width: b.w, height: b.h });
  page.drawRectangle({ x: 20, y: H - 310, width: 360, height: 270, color: rgb(0.93, 0.96, 0.97) });
  page.drawImage(await doc.embedJpg(photo(200)), at(A));
  // B: clipped to a smaller box, as a rounded photo is.
  page.pushOperators(pushGraphicsState(), rectangle(B.x + 12, H - B.y - B.h + 10, B.w - 24, B.h - 20), clip(), endPath());
  page.drawImage(await doc.embedPng(photo(20, 300, 200, 'image/png')), at(B));
  page.pushOperators(popGraphicsState());
  page.drawImage(await doc.embedJpg(photo(100)), at(C1));
  page.drawImage(await doc.embedJpg(photo(300)), at(C2));
  page.drawImage(await doc.embedJpg(photo(60)), at(E));
  // A vector badge painted over E after it.
  page.drawRectangle({ x: E.x + 100, y: H - E.y - 30, width: 70, height: 22, color: rgb(0.9, 0.2, 0.1) });
  page.drawImage(await doc.embedPng(photo(280, 32, 32, 'image/png')), at(ICON));
  // Clipped away entirely: the clip lies elsewhere.
  page.pushOperators(pushGraphicsState(), rectangle(10, 10, 5, 5), clip(), endPath());
  page.drawImage(await doc.embedJpg(photo(340)), at(HIDDEN));
  page.pushOperators(popGraphicsState());
  if (withText) {
    page.drawText('Podpis na zdjeciu', { x: A.x + 8, y: H - A.y - 20, size: 11, font, color: rgb(1, 1, 1) });
    page.drawText('Tekst pod zdjeciami, zwykly akapit.', { x: 40, y: H - 420, size: 12, font, color: rgb(0, 0, 0) });
  }
  return doc.save();
}

type Pixels = { data: Uint8ClampedArray; width: number; height: number };
async function renderPdf(bytes: Uint8Array, scale: number): Promise<Pixels> {
  const pdf = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(bytes))).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });
  const canvas = canvasMod.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx as never, canvas: canvas as never, viewport }).promise;
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { data: d.data, width: canvas.width, height: canvas.height };
}

/** The page as a document shows it: its page picture with its photos on top. */
async function composite(page: { width: number; height: number; background?: { data: Uint8Array }; pictures?: Array<{ x: number; y: number; width: number; height: number; data: Uint8Array }> }, scale: number, withPictures = true): Promise<Pixels> {
  const canvas = canvasMod.createCanvas(Math.ceil(page.width * scale), Math.ceil(page.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (page.background) ctx.drawImage(await canvasMod.loadImage(Buffer.from(page.background.data)), 0, 0, canvas.width, canvas.height);
  if (withPictures) {
    for (const p of page.pictures ?? []) ctx.drawImage(await canvasMod.loadImage(Buffer.from(p.data)), p.x * scale, p.y * scale, p.width * scale, p.height * scale);
  }
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { data: d.data, width: canvas.width, height: canvas.height };
}

/** Mean absolute difference per channel, 0…255, over the whole picture or one box (points). */
function difference(a: Pixels, b: Pixels, scale: number, box?: { x: number; y: number; w: number; h: number }): number {
  if (a.width !== b.width || a.height !== b.height) return 255;
  const x0 = box ? Math.floor(box.x * scale) : 0, x1 = box ? Math.ceil((box.x + box.w) * scale) : a.width;
  const y0 = box ? Math.floor(box.y * scale) : 0, y1 = box ? Math.ceil((box.y + box.h) * scale) : a.height;
  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * a.width + x) * 4;
      sum += Math.abs(a.data[i]! - b.data[i]!) + Math.abs(a.data[i + 1]! - b.data[i + 1]!) + Math.abs(a.data[i + 2]! - b.data[i + 2]!);
      n += 3;
    }
  }
  return sum / Math.max(1, n);
}
const pixelAt = (p: Pixels, scale: number, x: number, y: number): [number, number, number] => {
  const i = (Math.round(y * scale) * p.width + Math.round(x * scale)) * 4;
  return [p.data[i]!, p.data[i + 1]!, p.data[i + 2]!];
};

const withText = await buildPdf(true);
const noText = await buildPdf(false);
const result = await pdfToFixedPages(new File([withText], 'photos.pdf'));
const page: FixedPage = result.pages[0]!;
const scale = fixedBackgroundScale(W, H);
const reference = await renderPdf(noText, scale);
const flat = { width: W, height: H, ...(page.background ? { background: page.background } : {}), ...(page.pictures ? { pictures: page.pictures } : {}) };

console.log('=== which images become pictures ===');
{
  const pics = page.pictures ?? [];
  const near = (p: { x: number; y: number; width: number; height: number } | undefined, b: { x: number; y: number; w: number; h: number }): boolean =>
    !!p && Math.abs(p.x - b.x) < 0.6 && Math.abs(p.y - b.y) < 0.6 && Math.abs(p.width - b.w) < 0.6 && Math.abs(p.height - b.h) < 0.6;
  check(pics.length === 4, `four pictures (${pics.length}): the two plain photos, the pair lying on one another as one, the photo with a badge`);
  check(near(pics[0], A) && near(pics[1], B), 'the photos, at their boxes, in painting order');
  check(near(pics[2], { x: C1.x, y: C1.y, w: C2.x + C2.w - C1.x, h: C2.y + C2.h - C1.y }), `two overlapping images are ONE picture over their common box (${pics[2]?.width.toFixed(0)}x${pics[2]?.height.toFixed(0)} pt)`);
  check(near(pics[3], E), 'the photo with a vector shape painted over it');
  check(pics.every((p) => p.mime === 'image/jpeg' && p.data[0] === 0xff && p.data[1] === 0xd8 && p.data.length > 1500), 'each is a JPEG of its own');
  check(!pics.some((p) => near(p, ICON)) && !pics.some((p) => near(p, HIDDEN)), 'not the 16 pt icon, not the image that is clipped away');
  check(result.unplacedChars === 0 && result.placedChars > 30, 'the text is still text (also the caption on a photo)');
}

console.log('\n=== page picture + pictures = the page ===');
{
  const all = await composite(flat, scale);
  const only = await composite(flat, scale, false);
  const whole = difference(all, reference, scale);
  check(whole < 2, `the composite is the page pdf.js draws: mean difference ${whole.toFixed(2)} of 255`);
  for (const [name, box] of [['plain photo', A], ['clipped photo', B], ['overlapping pair', { x: C1.x, y: C1.y, w: 140, h: 95 }], ['photo with badge', E]] as const) {
    const d = difference(all, reference, scale, box);
    check(d < 3, `${name}: ${d.toFixed(2)} of 255 inside its box`);
  }
  const bare = difference(only, reference, scale, A);
  check(bare > 30, `the page picture alone no longer shows the photo (difference ${bare.toFixed(0)} in its box)`);
  const [r, g, b] = pixelAt(only, scale, A.x + A.w / 2, A.y + A.h / 2);
  check(Math.abs(r - 237) < 6 && Math.abs(g - 245) < 6 && Math.abs(b - 247) < 6, `where the photo was, the page picture has the card colour behind it (rgb ${r},${g},${b})`);
  const icon = difference(only, reference, scale, ICON);
  check(icon < 12, `the icon is still part of the page picture (difference ${icon.toFixed(1)} in its box)`);
  const [br, bg] = pixelAt(all, scale, E.x + 135, E.y + 19);
  check(br > 200 && bg < 90, `the badge painted over the photo is still on top of it (rgb ${br},${bg},…)`);
  const corner = pixelAt(all, scale, B.x + 4, B.y + 4);
  check(Math.abs(corner[0] - 237) < 6 && Math.abs(corner[1] - 245) < 6, `the clipped-off edge of a photo shows the page behind it (rgb ${corner.join(',')})`);
}

console.log('\n=== imageCandidates: the rules ===');
{
  const OPS = { save: 1, restore: 2, transform: 3, paintImageXObject: 4, paintFormXObjectBegin: 5, paintFormXObjectEnd: 6 };
  // pdf.js user space has y up; a page 200 x 300, viewport point = (x, 300 - y).
  const toViewport = (x: number, y: number): number[] => [x, 300 - y];
  const image = (x: number, yTop: number, w: number, h: number): Array<[number, unknown[]]> => [[1, []], [3, [w, 0, 0, h, x, 300 - yTop - h]], [4, ['img', 100, 100]], [2, []]];
  const run = (ops: Array<[number, unknown[]]>) => imageCandidates(ops.map((o) => o[0]), ops.map((o) => o[1]), OPS, toViewport, 200, 300);
  const one = run(image(20, 40, 100, 60));
  check(one.length === 1 && one[0]!.x === 20 && one[0]!.y === 40 && one[0]!.width === 100 && one[0]!.height === 60 && one[0]!.pxPerPt === 1, 'the unit square under the transformation, from the top-left');
  check(run(image(20, 40, 20, 60)).length === 0, 'narrower than 24 pt: not a candidate');
  const chain = run([...image(10, 10, 60, 40), ...image(120, 200, 60, 40), ...image(50, 30, 60, 40), ...image(100, 50, 60, 40)]);
  check(chain.length === 2 && chain[0]!.ops.length === 3 && chain[0]!.width === 150 && chain[0]!.height === 80 && chain[1]!.ops.length === 1, `a chain of overlapping images is one candidate (${chain.map((c) => c.ops.length).join('+')} operators)`);
  const tiles = run(Array.from({ length: 13 }, (_, i) => image(10 + (i % 5) * 36, 10 + Math.floor(i / 5) * 36, 30, 30)).flat());
  check(tiles.length === 0, 'thirteen images on a page: a tiled picture, none is cut out');
  const form = run([[5, [[1, 0, 0, 1, 50, -20], null]], ...image(20, 40, 100, 60), [6, []], ...image(20, 200, 30, 30)]);
  check(form.length === 2 && form[0]!.x === 70 && form[0]!.y === 60 && form[1]!.x === 20, 'a form\'s own matrix moves its images, and ends with the form');
  const off = run(image(150, 250, 100, 100));
  check(off.length === 1 && off[0]!.width === 50 && off[0]!.height === 50, 'an image running off the page is cut at the page edge');
}

console.log('\n=== a page tiled with images is left alone ===');
{
  const doc = await PDFDocument.create();
  const p = doc.addPage([W, H]);
  const img = await doc.embedJpg(photo(150, 60, 60));
  for (let i = 0; i < 15; i++) p.drawImage(img, { x: 20 + (i % 5) * 72, y: H - 100 - Math.floor(i / 5) * 72, width: 60, height: 60 });
  const tiled = (await pdfToFixedPages(new File([await doc.save()], 'tiles.pdf'))).pages[0]!;
  check(!tiled.pictures && !!tiled.background, 'no pictures; the tiles stay in the page picture');
}

console.log('\n=== the documents ===');
const docx = await renderFixedPagesToDocx(result.pages);
const odt = await renderFixedPagesToOdt(result.pages);
{
  const zip = await JSZip.loadAsync(await docx.arrayBuffer());
  const xml = await zip.file('word/document.xml')!.async('string');
  const anchors = [...xml.matchAll(/<wp:anchor [^>]*>/g)].map((m) => m[0]);
  check(anchors.length === 5 && anchors.every((a) => a.includes('behindDoc="1"')), `.docx: five anchored pictures, all behind the text (${anchors.length})`);
  const heights = anchors.map((a) => Number(/relativeHeight="(\d+)"/.exec(a)?.[1]));
  check(heights.every((h, i) => i === 0 || h > heights[i - 1]!), `stacked in painting order above the page picture (${heights.join(' < ')})`);
  const offsets = [...xml.matchAll(/<wp:posOffset>(-?\d+)<\/wp:posOffset>/g)].map((m) => Number(m[1]) / 12700);
  check(Math.abs(offsets[2]! - A.x) < 0.1 && Math.abs(offsets[3]! - A.y) < 0.1, `positions from the page's corner (first photo at ${offsets[2]!.toFixed(1)}, ${offsets[3]!.toFixed(1)} pt)`);
  check(Object.keys(zip.files).filter((n) => n.startsWith('word/media/') && !n.endsWith('/')).length === 5, 'five picture files');

  const ozip = await JSZip.loadAsync(await odt.arrayBuffer());
  const content = await ozip.file('content.xml')!.async('string');
  const frames = [...content.matchAll(/<draw:frame [^>]*>/g)].map((m) => m[0]);
  check(frames.length === 5 && frames[1]!.includes(`svg:x="${A.x}pt"`) && frames[1]!.includes(`svg:y="${A.y}pt"`) && frames[1]!.includes('draw:z-index="1"'), `.odt: five frames, the first photo at ${A.x}, ${A.y} pt above the page picture`);
  const manifest = await ozip.file('META-INF/manifest.xml')!.async('string');
  check((manifest.match(/Pictures\//g) ?? []).length === 5, 'all five listed in the manifest');
}

console.log('\n=== read back and turned into a PDF again ===');
for (const [name, read] of [['.docx', () => readFixedDocx(docx)], ['.odt', () => readFixedOdt(odt)]] as const) {
  const pages = await read();
  const p = pages?.[0];
  check(!!p && !!p.background && p.pictures?.length === 4, `${name}: a page picture and four photos (${p?.pictures?.length})`);
  if (!p) continue;
  const same = (p.pictures ?? []).every((pic, i) => {
    const want = page.pictures![i]!;
    return Math.abs(pic.x - want.x) < 0.06 && Math.abs(pic.y - want.y) < 0.06 && Math.abs(pic.width - want.width) < 0.06 && Math.abs(pic.height - want.height) < 0.06 && pic.data.length === want.data.length;
  });
  check(same, `${name}: the same boxes, order and bytes`);
  const blob = await renderPlacedPagesToPdf(pages!);
  const out = await renderPdf(new Uint8Array(await blob!.arrayBuffer()), scale);
  // Compared where no text is drawn (the result has its text, the reference has none).
  const boxes: Array<[string, { x: number; y: number; w: number; h: number }]> = [
    ['plain photo below its caption', { x: A.x, y: A.y + 30, w: A.w, h: A.h - 30 }], ['clipped photo', B], ['overlapping pair', { x: C1.x, y: C1.y, w: 140, h: 95 }], ['photo with badge', E],
  ];
  const diffs = boxes.map(([label, box]) => `${label} ${difference(out, reference, scale, box).toFixed(2)}`);
  const worst = Math.max(...boxes.map(([, box]) => difference(out, reference, scale, box)));
  check(worst < 3, `${name} -> PDF: every photo where the page has it (${diffs.join(', ')} of 255)`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
