// Add QR code to PDF (plan 2.5, 2026-11-24). Every code is read back by an independent decoder
// (jsQR), never by the library that made it:
//  - lib/qr.ts: the module grid holds the text as UTF-8 (the library's own conversion kept only
//    the low byte of each character: "ż" became "|"), the longest text fits and one byte more is
//    refused, the SVG file reads;
//  - lib/pdf/addQrCode.ts: the code drawn on a page reads from the page as a viewer renders it
//    (pdf.js), in the chosen corner of the page AS DISPLAYED, for /Rotate 0/90/180/270 and a crop
//    box not at (0,0); first/last/all pages; a web address is also a link over the code; an
//    encrypted file is refused.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import jsQR from 'jsqr';
import * as canvasMod from '@napi-rs/canvas';
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFString, degrees } from 'pdf-lib';
import { QR_MAX_BYTES, QUIET_ZONE, qrMatrix, qrSvg, isWebLink, qrByteLength } from '../lib/qr';
import { addQrCodeToPdf, type QrPosition } from '../lib/pdf/addQrCode';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const utf8 = (s: string) => Array.from(new TextEncoder().encode(s));

/** The grid as an image (4 px per module, quiet zone included) for the decoder. */
function gridImage(m: boolean[][]) {
  const s = 4, n = m.length + QUIET_ZONE * 2, w = n * s;
  const d = new Uint8ClampedArray(w * w * 4).fill(255);
  m.forEach((row, r) => row.forEach((dark, c) => {
    if (!dark) return;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const i = (((r + QUIET_ZONE) * s + y) * w + (c + QUIET_ZONE) * s + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 0;
    }
  }));
  return { d, w };
}

async function renderPage(bytes: Uint8Array, pageNo: number, scale = 2) {
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
  const pg = await (await task.promise).getPage(pageNo);
  const vp = pg.getViewport({ scale });
  const c = canvasMod.createCanvas(Math.round(vp.width), Math.round(vp.height));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await pg.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport: vp, canvas: c as unknown as HTMLCanvasElement }).promise;
  const out = { w: c.width, h: c.height, d: ctx.getImageData(0, 0, c.width, c.height).data as unknown as Uint8ClampedArray };
  await task.destroy();
  return out;
}

console.log('=== control: the library\'s own text conversion breaks Polish letters ===');
{
  // Before lib/qr.ts sets its UTF-8 conversion (the first qrMatrix call below does).
  const { default: qrcode } = await import('qrcode-generator');
  const qr = qrcode(0, 'M');
  qr.addData('Zażółć', 'Byte');
  qr.make();
  const m = Array.from({ length: qr.getModuleCount() }, (_, r) => Array.from({ length: qr.getModuleCount() }, (_, c) => qr.isDark(r, c)));
  const { d, w } = gridImage(m);
  const r = jsQR(d, w, w);
  check(!!r && JSON.stringify(r.binaryData) !== JSON.stringify(utf8('Zażółć')), `without lib/qr.ts "Zażółć" is encoded as ${r ? JSON.stringify(r.binaryData) : '?'} (low bytes only), not UTF-8`);
}

console.log('\n=== the code holds the text as UTF-8 ===');
for (const text of ['https://optimapdf.com/pl', 'Zażółć gęślą jaźń — ŁÓDŹ', 'Привет, мир', '日本語のテキスト 😀', 'A']) {
  const { d, w } = gridImage(qrMatrix(text));
  const r = jsQR(d, w, w);
  check(!!r && JSON.stringify(r.binaryData) === JSON.stringify(utf8(text)), `"${text}": decoded bytes are its UTF-8 (${r ? `${r.binaryData.length} B, version ${r.version}` : 'not read'})`);
}
{
  const longest = 'x'.repeat(QR_MAX_BYTES);
  const { d, w } = gridImage(qrMatrix(longest));
  const r = jsQR(d, w, w);
  check(!!r && r.data === longest && r.version === 40, `${QR_MAX_BYTES} bytes fit (version ${r?.version}, the largest)`);
  let refused = false;
  try { qrMatrix('x'.repeat(QR_MAX_BYTES + 1)); } catch { refused = true; }
  check(refused, 'one byte more is refused with an error, not a broken code');
  check(qrByteLength('ż') === 2, 'the limit counts UTF-8 bytes ("ż" is 2)');
}
{
  const svg = qrSvg('Faktura nr 12/2026 — zapłać', 600);
  const img = await canvasMod.loadImage(Buffer.from(svg));
  const c = canvasMod.createCanvas(600, 600);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, 600, 600);
  const r = jsQR(ctx.getImageData(0, 0, 600, 600).data as unknown as Uint8ClampedArray, 600, 600);
  check(r?.data === 'Faktura nr 12/2026 — zapłać', `the SVG file reads ("${r?.data}")`);
  check(/^<\?xml[\s\S]*<rect width="\d+" height="\d+" fill="#fff"\/><path d="M[\d ]+h/.test(svg) && (svg.match(/<path/g) ?? []).length === 1, 'the SVG is a white square and one path of modules');
}
check(isWebLink('https://a.pl/x?y=1') && isWebLink(' http://a.pl ') && !isWebLink('a.pl') && !isWebLink('javascript:alert(1)') && !isWebLink('https://a.pl/ x') && !isWebLink('mailto:a@b.pl'),
  'only http(s) addresses become links');

console.log('\n=== on a page: in the chosen corner of the page as displayed, readable, for every /Rotate ===');
async function pagePdf(rot: number, offset = false): Promise<Uint8Array> {
  const d = await PDFDocument.create();
  const p = d.addPage([400, 600]); // portrait as stored
  if (offset) { p.setMediaBox(50, 80, 400, 600); p.setCropBox(50, 80, 400, 600); }
  if (rot) p.setRotation(degrees(rot));
  return d.save();
}
const corners: QrPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center'];
for (const [rot, offset] of [[0, false], [90, false], [180, false], [270, false], [90, true], [0, true]] as [number, boolean][]) {
  const src = await pagePdf(rot, offset);
  for (const pos of rot === 0 && !offset ? corners : ['top-left', 'bottom-right'] as QrPosition[]) {
    const out = await addQrCodeToPdf(src, { text: `pos ${pos} rot ${rot}`, sizeMm: 30, position: pos, pages: 'all' });
    const img = await renderPage(out, 1);
    const r = jsQR(img.d, img.w, img.h);
    const cx = r ? (r.location.topLeftCorner.x + r.location.bottomRightCorner.x) / 2 / img.w : -1;
    const cy = r ? (r.location.topLeftCorner.y + r.location.bottomRightCorner.y) / 2 / img.h : -1;
    const [v, h] = pos.split('-');
    const inPlace = (h === 'left' ? cx < 0.3 : h === 'right' ? cx > 0.7 : Math.abs(cx - 0.5) < 0.05) && (v === 'top' ? cy < 0.3 : cy > 0.7);
    // Upright: the finder pattern that is top-left in the code is top-left on the screen.
    const upright = !!r && r.location.topLeftFinderPattern.x < r.location.topRightFinderPattern.x && r.location.topLeftFinderPattern.y < r.location.bottomLeftFinderPattern.y;
    check(r?.data === `pos ${pos} rot ${rot}` && inPlace && upright,
      `/Rotate ${rot}${offset ? ', crop box at (50,80)' : ''}, ${pos}: reads, ${(cx * 100).toFixed(0)}%/${(cy * 100).toFixed(0)}% of the page as displayed, upright`);
    if (pos === 'top-left' && rot === 0 && !offset) {
      // 30 mm = 85 pt; at scale 2 the code with its margin is 170 px wide, 10 mm from the edge.
      const wPx = r ? (r.location.topRightCorner.x - r.location.topLeftCorner.x) : 0;
      const n = qrMatrix('pos top-left rot 0').length;
      const expected = (30 / 25.4) * 72 * 2 * n / (n + 2 * QUIET_ZONE);
      check(Math.abs(wPx - expected) < 4, `the code (without its white margin) is ${wPx.toFixed(1)} px, expected ${expected.toFixed(1)} (30 mm with the 4-module quiet zone)`);
    }
  }
}

console.log('\n=== which pages; links; refusals ===');
{
  const d = await PDFDocument.create();
  for (let i = 0; i < 3; i++) d.addPage([400, 600]);
  const src = await d.save();
  for (const [pages, expect] of [['first', [true, false, false]], ['last', [false, false, true]], ['all', [true, true, true]]] as const) {
    const out = await addQrCodeToPdf(src, { text: 'https://optimapdf.com/ż?a=1 2', sizeMm: 25, position: 'bottom-right', pages });
    const got: boolean[] = [];
    for (let p = 1; p <= 3; p++) { const img = await renderPage(out, p, 1.5); got.push(!!jsQR(img.d, img.w, img.h)); }
    check(JSON.stringify(got) === JSON.stringify(expect), `${pages}: code on pages ${got.map((g, i) => (g ? i + 1 : '')).filter(Boolean).join(',')}`);
  }
  const out = await addQrCodeToPdf(src, { text: 'https://optimapdf.com/pl/łącz', sizeMm: 25, position: 'top-left', pages: 'first' });
  const lib = await PDFDocument.load(out);
  const annots = lib.getPage(0).node.lookup(PDFName.of('Annots'), PDFArray);
  const a = annots.lookup(0, PDFDict);
  const uri = (a.lookup(PDFName.of('A'), PDFDict).lookup(PDFName.of('URI')) as PDFString).decodeText();
  const rect = (a.lookup(PDFName.of('Rect'), PDFArray).asArray() as unknown as { asNumber(): number }[]).map((n) => n.asNumber());
  const s = 25 / 25.4 * 72, m = 10 / 25.4 * 72;
  check(uri === 'https://optimapdf.com/pl/%C5%82%C4%85cz', `a web address becomes a link with an ASCII address (${uri})`);
  check(Math.abs(rect[0]! - m) < 0.01 && Math.abs(rect[3]! - (600 - m)) < 0.01 && Math.abs(rect[2]! - rect[0]! - s) < 0.01, `the link covers the code (${rect.map((x) => x.toFixed(1)).join(', ')})`);
  const plain = await PDFDocument.load(await addQrCodeToPdf(src, { text: 'Tylko tekst', sizeMm: 25, position: 'top-left', pages: 'first' }));
  check((plain.getPage(0).node.Annots()?.size() ?? 0) === 0, 'plain text adds no link');

  const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
  const enc = await encryptPDF(new Uint8Array(src), 'secret');
  let msg = '';
  try { await addQrCodeToPdf(enc, { text: 'x', sizeMm: 25, position: 'top-left', pages: 'all' }); } catch (e) { msg = (e as Error).message; }
  check(/zabezpieczony hasłem/.test(msg), 'an encrypted PDF is refused with the usual message');
  const tiny = await PDFDocument.create(); tiny.addPage([60, 60]);
  const tinyOut = await addQrCodeToPdf(await tiny.save(), { text: 'mały', sizeMm: 50, position: 'top-left', pages: 'all' });
  const timg = await renderPage(tinyOut, 1, 6);
  check(jsQR(timg.d, timg.w, timg.h)?.data === 'mały', 'on a page smaller than the code, the code shrinks to fit and still reads');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
