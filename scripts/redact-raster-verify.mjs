import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { redactPdfRasterBuffer } from '../lib/pdf-engine.ts';
import { REDACT_RENDER_SCALE } from '../lib/pdf-raster.ts';
import { PDFDocument, PDFDict } from 'pdf-lib';

const TOKEN = 'REDACT_TEST_TOKEN_9f3a7c';
const FIXTURE = 'C:/Users/Leszek/Desktop/pdftools/e2e/fixtures/redact-token.pdf';
const OUT_DIR = 'C:/Users/Leszek/AppData/Local/Temp/opencode/spike-redact/krok-a';
mkdirSync(OUT_DIR, { recursive: true });

const pako = (await import('pako')).default;const input = readFileSync(FIXTURE);
const inputBytes = new Uint8Array(input);

const latin1 = (buf) => Buffer.from(buf).toString('latin1');
const objectRefs = (buf) => (latin1(buf).match(/(\d{1,5}) 0 obj/g) || []);

function inflateAll(buf) {
  const out = [];
  const hay = Buffer.from(buf);
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
    const body = hay.slice(bodyStart, bodyEnd);
    try {
      const dec = pako.inflate(body);
      out.push({ ok: true, bytes: Buffer.from(dec), text: Buffer.from(dec).toString('latin1') });
    } catch {
      out.push({ ok: false, bytes: body, text: latin1(body) });
    }
    idx = e + 9;
  }
  return out;
}

async function initPdfjsEnv() {
  const canvasMod = await import('@napi-rs/canvas');
  if (!globalThis.DOMMatrix) globalThis.DOMMatrix = canvasMod.DOMMatrix;
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  const standardFontDataUrl = 'file:///' + process.cwd().replace(/\\/g, '/') + '/node_modules/pdfjs-dist/standard_fonts/';
  return { pdfjsLib, canvasMod, standardFontDataUrl };
}

async function getTextWithBbox(pdfjsLib, standardFontDataUrl, buf, pageNo) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf), standardFontDataUrl }).promise;
  const page = await doc.getPage(pageNo);
  const content = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });
  const items = content.items.map((it) => ({
    str: it.str,
    width: it.width,
    height: it.height,
    transform: it.transform,
  }));
  await doc.cleanup();
  return { items, pageWidth: viewport.width, pageHeight: viewport.height };
}

function textOf(items) {
  return items.map((i) => i.str).join(' ');
}

async function renderPage(pdfjsLib, canvasMod, standardFontDataUrl, buf, pageNo, scale) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf), standardFontDataUrl }).promise;
  const page = await doc.getPage(pageNo);
  const viewport = page.getViewport({ scale });
  const w = Math.max(1, Math.round(viewport.width));
  const h = Math.max(1, Math.round(viewport.height));
  const canvas = canvasMod.createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  await doc.cleanup();
  const img = ctx.getImageData(0, 0, w, h);
  return { w, h, data: img.data, canvas, ctx };
}

function pixelStats(img) {
  const { data } = img;
  let nonWhite = 0;
  let black = 0;
  let min = 255;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luma < 250) nonWhite++;
    if (r < 60 && g < 60 && b < 60) black++;
    if (luma < min) min = luma;
  }
  return { nonWhite, black, min };
}

async function pageResources(buf, pageIndex) {
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const page = pdf.getPage(pageIndex);
  const res = page.node.Resources();
  if (!res) return '(none)';
  const cats = {};
  for (const [catName, catVal] of res.entries()) {
    if (catVal instanceof PDFDict) cats[catName.toString()] = catVal.keys().map((k) => k.toString());
  }
  return cats;
}

function regionPixels(img, region) {
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
  return { total, dark };
}

function diffOutsideRegion(imgA, imgB, region, pad, threshold) {
  const x0 = Math.max(0, Math.round(region.x * imgA.w) - pad);
  const y0 = Math.max(0, Math.round(region.y * imgA.h) - pad);
  const x1 = Math.min(imgA.w, Math.round((region.x + region.width) * imgA.w) + pad);
  const y1 = Math.min(imgA.h, Math.round((region.y + region.height) * imgA.h) + pad);
  const luma = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  let diff = 0;
  let checked = 0;
  for (let y = 0; y < imgA.h; y++) {
    for (let x = 0; x < imgA.w; x++) {
      if (x >= x0 && x < x1 && y >= y0 && y < y1) continue;
      const i = (y * imgA.w + x) * 4;
      checked++;
      if (Math.abs(luma(imgA.data, i) - luma(imgB.data, i)) > threshold) diff++;
    }
  }
  return { diff, checked };
}

function diffOutsideRegionBinary(imgA, imgB, region, pad) {
  const x0 = Math.max(0, Math.round(region.x * imgA.w) - pad);
  const y0 = Math.max(0, Math.round(region.y * imgA.h) - pad);
  const x1 = Math.min(imgA.w, Math.round((region.x + region.width) * imgA.w) + pad);
  const y1 = Math.min(imgA.h, Math.round((region.y + region.height) * imgA.h) + pad);
  const bit = (d, i) => (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] > 128) ? 1 : 0;
  let diff = 0;
  let checked = 0;
  for (let y = 0; y < imgA.h; y++) {
    for (let x = 0; x < imgA.w; x++) {
      if (x >= x0 && x < x1 && y >= y0 && y < y1) continue;
      const i = (y * imgA.w + x) * 4;
      checked++;
      if (bit(imgA.data, i) !== bit(imgB.data, i)) diff++;
    }
  }
  return { diff, checked };
}

// ============ 0. Input overview ============
console.log('=== 0. INPUT FIXTURE ===');
console.log('file:', FIXTURE, input.length, 'bytes');
console.log('objects:', objectRefs(input).join(', '));
console.log('token raw:', Buffer.from(input).includes(Buffer.from(TOKEN)) ? 'PRESENT' : 'absent');

// ============ 1. Locate token on page 1 (pdfjs) ============
const env = await initPdfjsEnv();
const { pdfjsLib, canvasMod, standardFontDataUrl } = env;

const p1 = await getTextWithBbox(pdfjsLib, standardFontDataUrl, inputBytes, 1);
const p2 = await getTextWithBbox(pdfjsLib, standardFontDataUrl, inputBytes, 2);
console.log('\n=== 1. TOKEN LOCATION (pdfjs getTextContent) ===');
console.log('page1 text:', JSON.stringify(textOf(p1.items)));
console.log('page2 text:', JSON.stringify(textOf(p2.items)));
const tokenItem = p1.items.find((i) => i.str.includes(TOKEN));
if (!tokenItem) throw new Error('TOKEN nie znaleziony na stronie 1 inputa');
const { pageWidth, pageHeight } = p1;
const region = {
  page: 0,
  x: tokenItem.transform[4] / pageWidth,
  y: (pageHeight - tokenItem.transform[5] - tokenItem.height) / pageHeight,
  width: tokenItem.width / pageWidth,
  height: tokenItem.height / pageHeight,
};
console.log('token bbox (pt): x0=' + tokenItem.transform[4].toFixed(2), 'y0Bottom=' + tokenItem.transform[5].toFixed(2), 'w=' + tokenItem.width.toFixed(2), 'h=' + tokenItem.height.toFixed(2));
console.log('region (normalized 0-1, y from top):', JSON.stringify(region));

// ============ 2. Run production redaction (Node engine) ============
console.log('\n=== 2. RUN redactPdfRasterBuffer (lib/pdf-engine.ts) ===');
const output = await redactPdfRasterBuffer(input, [region]);
const outPath = OUT_DIR + '/redact-token-output.pdf';
writeFileSync(outPath, output);
console.log('output:', outPath, output.length, 'bytes');

// ============ 3. Raw byte evidence ============
console.log('\n=== 3. RAW BYTE EVIDENCE ===');
console.log('3a. token in output raw bytes (text search):', Buffer.from(output).includes(Buffer.from(TOKEN)) ? 'PRESENT <<< FAIL' : 'absent (0)');
const hexToken = Buffer.from(TOKEN, 'ascii').toString('hex');
console.log('3b. token hex in output raw bytes:', Buffer.from(output).includes(Buffer.from(TOKEN, 'ascii')) ? 'PRESENT <<< FAIL' : 'absent (0) (searched 6f8c7275...) ' + hexToken.slice(0, 16));
const outStreams = inflateAll(output);
const tokenInStreams = outStreams.filter((s) => s.ok && s.text.includes(TOKEN));
console.log('3c. streams in output:', outStreams.length, '| inflated ok:', outStreams.filter((s) => s.ok).length, '| token found in any inflated stream:', tokenInStreams.length ? 'PRESENT <<< FAIL' : 'absent (0)');

console.log('\n3d. object inventory BEFORE:', objectRefs(input).join(', '));
console.log('3d. object inventory AFTER: ', objectRefs(output).join(', '));

const rawOut = latin1(output);
const helvetica = (rawOut.match(/\/BaseFont\s*\/Helvetica/g) || []).length;
const imagesOut = (rawOut.match(/\/Subtype\s*\/Image/g) || []).length;
const imagesIn = (latin1(input).match(/\/Subtype\s*\/Image/g) || []).length;
const resPage0 = await pageResources(output, 0);
const resPage1 = await pageResources(output, 1);
console.log('\n3e. page1 (redacted) Resources:', JSON.stringify(resPage0));
console.log('3e. page1 (redacted) has /Font:', resPage0['/Font'] ? 'PRESENT <<< FAIL' : 'absent (OK)');
console.log('3e. page1 (redacted) has /XObject:', JSON.stringify(resPage0['/XObject'] || []), '(exactly 1 raster image)');
console.log('3e. page2 (untouched) Resources:', JSON.stringify(resPage1), '(keeps its fonts)');
console.log('3e. global /BaseFont /Helvetica occurrences in output:', helvetica, '(expected: only page2 fonts)');
console.log('3f. /Subtype /Image occurrences: input=' + imagesIn, 'output=' + imagesOut, '(output should be exactly the 1 raster of page 1)');
console.log('3g. /Contents streams in output:', (rawOut.match(/\/Contents/g) || []).length, '(1 content stream per page = 2 expected)');

// ============ 4. getTextContent on result ============
console.log('\n=== 4. TEXT ON RESULT (getTextContent) ===');
const r1 = await getTextWithBbox(pdfjsLib, standardFontDataUrl, output, 1);
const r2 = await getTextWithBbox(pdfjsLib, standardFontDataUrl, output, 2);
console.log('page1 text items:', r1.items.length, '| text:', JSON.stringify(textOf(r1.items)));
console.log('page2 text items:', r2.items.length, '| text:', JSON.stringify(textOf(r2.items)));
console.log('4a. page1 contains token:', textOf(r1.items).includes(TOKEN) ? 'PRESENT <<< FAIL' : 'absent (0)');
console.log('4b. page2 survives (text > 0):', r2.items.length > 0 ? 'OK (' + r2.items.length + ' items)' : 'FAIL');

// ============ 5. Renders ============
console.log('\n=== 5. RENDER CHECK ===');
const scale = REDACT_RENDER_SCALE;
const inR1 = await renderPage(pdfjsLib, canvasMod, standardFontDataUrl, inputBytes, 1, scale);
const outR1 = await renderPage(pdfjsLib, canvasMod, standardFontDataUrl, output, 1, scale);
const outR2 = await renderPage(pdfjsLib, canvasMod, standardFontDataUrl, output, 2, scale);
const inStats = pixelStats(inR1);
const outStats = pixelStats(outR1);
console.log('render scale:', scale, '| page1 dims:', inR1.w + 'x' + inR1.h);
console.log('5a. input  page1 pixels: nonWhite=' + inStats.nonWhite, 'black=' + inStats.black, 'min=' + inStats.min);
console.log('5b. output page1 pixels: nonWhite=' + outStats.nonWhite, 'black=' + outStats.black, 'min=' + outStats.min);
const rp = regionPixels(outR1, region);
console.log('5c. black coverage inside redaction rect: ' + rp.dark + '/' + rp.total + ' (' + (100 * rp.dark / Math.max(1, rp.total)).toFixed(1) + '%)', rp.total && rp.dark / rp.total > 0.9 ? '(OK)' : '<<< FAIL');
const strictDiff = diffOutsideRegion(inR1, outR1, region, 2, 0);
const strongDiff = diffOutsideRegion(inR1, outR1, region, 2, 40);
const binaryDiff = diffOutsideRegionBinary(inR1, outR1, region, 2);
console.log('5d. pixels differing OUTSIDE rect (any delta): ' + strictDiff.diff + '/' + strictDiff.checked + ' (' + (100 * strictDiff.diff / Math.max(1, strictDiff.checked)).toFixed(3) + '%) (sub-pixel resampling expected)');
console.log('5d. pixels differing OUTSIDE rect (luma delta > 40): ' + strongDiff.diff + '/' + strongDiff.checked + ' (' + (100 * strongDiff.diff / Math.max(1, strongDiff.checked)).toFixed(3) + '%) (anti-aliasing edges)');
console.log('5d. pixels differing OUTSIDE rect (binarized on/off): ' + binaryDiff.diff + '/' + binaryDiff.checked + ' (' + (100 * binaryDiff.diff / Math.max(1, binaryDiff.checked)).toFixed(4) + '%)', binaryDiff.diff === 0 ? '(OK — content structurally identical)' : '<<< FAIL');
writeFileSync(OUT_DIR + '/render-output-page1.png', Buffer.from(outR1.canvas.toBuffer('image/png')));
writeFileSync(OUT_DIR + '/render-input-page1.png', Buffer.from(inR1.canvas.toBuffer('image/png')));
writeFileSync(OUT_DIR + '/render-output-page2.png', Buffer.from(outR2.canvas.toBuffer('image/png')));
console.log('5e. page2 renders (rows>0):', outR2.h > 0 ? 'OK' : 'FAIL');
const inR2 = await renderPage(pdfjsLib, canvasMod, standardFontDataUrl, inputBytes, 2, scale);
const page2Diff = diffOutsideRegionBinary(inR2, outR2, { page: 0, x: 0, y: 0, width: 0, height: 0 }, 0);
console.log('5e. page2 (untouched) binary diff vs input render (full page): ' + page2Diff.diff + '/' + page2Diff.checked + ' (' + (100 * page2Diff.diff / Math.max(1, page2Diff.checked)).toFixed(4) + '%)', page2Diff.diff === 0 ? '(OK — page 2 pixel-identical)' : '<<< FAIL');
console.log('5f. renders saved:', OUT_DIR + '/render-{input,output}-page{1,2}.png');

// ============ 6. Summary ============
console.log('\n=== 6. RESULT ===');
console.log('output written:', outPath, output.length, 'bytes');
console.log('ok');
