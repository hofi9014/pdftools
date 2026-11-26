// PDF to grayscale (plan 2.6, 2026-11-24): lib/pdf/grayscale.ts. Every page of the original and
// of the converted file is rendered by pdf.js; the converted one must be gray in every pixel
// (R = G = B) and as light as the original in every pixel (its luminance), and keep its text.
// The original must have colour, or the check proves nothing.
//  - a PDF built to hold every kind of colour: rg/k/cs+sc with ICC, Lab, Indexed, Separation
//    (type 2 and type 4 tint functions), DeviceN; an axial gradient (type 2 function) and a radial
//    one (stitching function); a tiling pattern; an uncoloured pattern; a form that inherits the
//    colour space; a Flate RGB image with PNG predictors, a JPEG, an indexed image, an inline
//    image; an annotation (/C, appearance, /DA); and a page with a mesh gradient, which cannot be
//    converted and must get the overlay (still gray, same lightness);
//  - the real files of the repository: gray, same lightness, same text, no overlay.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import * as canvasMod from '@napi-rs/canvas';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFStream, PDFHexString, StandardFonts } from 'pdf-lib';
import { convertToGrayscale, type GrayscaleCodec } from '../lib/pdf/grayscale';
import { parseOps, latin1 } from '../lib/pdf/contentStream';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

/** The browser's work done by the same Skia engine in Node. */
const codec: GrayscaleCodec = {
  async decodeJpeg(bytes) {
    const img = await canvasMod.loadImage(Buffer.from(bytes));
    const c = canvasMod.createCanvas(img.width, img.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return { width: img.width, height: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data as unknown as Uint8ClampedArray };
  },
  async encodeJpeg(gray, w, h) {
    const c = canvasMod.createCanvas(w, h);
    const ctx = c.getContext('2d');
    const id = ctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = gray[i]!; id.data[i * 4 + 3] = 255; }
    ctx.putImageData(id, 0, 0);
    return { bytes: new Uint8Array(c.toBuffer('image/jpeg', 92)), components: 3 };
  },
};

async function render(bytes: Uint8Array, scale = 1) {
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
  const doc = await task.promise;
  const pages: { w: number; h: number; d: Uint8ClampedArray; text: string }[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pg = await doc.getPage(p);
    const vp = pg.getViewport({ scale });
    const c = canvasMod.createCanvas(Math.round(vp.width), Math.round(vp.height));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await pg.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport: vp, canvas: c as unknown as HTMLCanvasElement }).promise;
    const tc = await pg.getTextContent();
    pages.push({ w: c.width, h: c.height, d: ctx.getImageData(0, 0, c.width, c.height).data as unknown as Uint8ClampedArray, text: (tc.items as { str: string }[]).map((i) => i.str).join(' ') });
  }
  await task.destroy();
  return pages;
}

const lum = (d: Uint8ClampedArray, i: number) => 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;

/** Colourful pixels in the original; non-gray pixels and lightness differences in the result. */
function compare(a: { w: number; h: number; d: Uint8ClampedArray }, b: { w: number; h: number; d: Uint8ClampedArray }) {
  let colour = 0, notGray = 0, worst = 0;
  const diffs: number[] = [];
  for (let i = 0; i < a.d.length; i += 4) {
    if (Math.max(a.d[i]!, a.d[i + 1]!, a.d[i + 2]!) - Math.min(a.d[i]!, a.d[i + 1]!, a.d[i + 2]!) > 24) colour++;
    if (Math.max(b.d[i]!, b.d[i + 1]!, b.d[i + 2]!) - Math.min(b.d[i]!, b.d[i + 1]!, b.d[i + 2]!) > 3) notGray++;
    const dl = Math.abs(lum(a.d, i) - lum(b.d, i));
    diffs.push(dl);
    if (dl > worst) worst = dl;
  }
  diffs.sort((x, y) => x - y);
  const p99 = diffs[Math.floor(diffs.length * 0.99)]!;
  const mean = diffs.reduce((s, x) => s + x, 0) / diffs.length;
  return { colour, notGray, p99, mean, worst, pixels: a.d.length / 4 };
}

// ---------- the PDF with every kind of colour ----------
async function colourfulPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const ctx = doc.context;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([600, 800]);
  page.drawText('Kolorowy tekst', { x: 40, y: 760, size: 22, font });
  const fontName = page.node.Resources()!.lookup(PDFName.of('Font'), PDFDict).keys()[0]!.decodeText();

  // Colour spaces
  const icc = ctx.register(ctx.flateStream(new Uint8Array(16), { N: 3 })); // pdf.js uses /N (no profile needed)
  const sepT2 = ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: [0, 0, 0, 0], C1: [0, 0.2, 1, 0], N: 1 });
  const sepT4 = ctx.register(ctx.flateStream('{ dup 0.9 mul exch dup 0.1 mul exch 0.5 mul }', { FunctionType: 4, Domain: [0, 1], Range: [0, 1, 0, 1, 0, 1] }));
  const dnFn = ctx.register(ctx.flateStream('{ 0 }', { FunctionType: 4, Domain: [0, 1, 0, 1], Range: [0, 1, 0, 1, 0, 1, 0, 1] }));
  // DeviceN cyan+magenta → CMYK: c m 0 0 (a real program: { 0 0 })
  const dnFn2 = ctx.register(ctx.flateStream('{ 0 0 }', { FunctionType: 4, Domain: [0, 1, 0, 1], Range: [0, 1, 0, 1, 0, 1, 0, 1] }));
  void dnFn;
  const palette = PDFHexString.of('ff0000' + '00ff00' + '0000ff' + 'ffff00');
  const colorSpaces = ctx.obj({
    CSicc: ctx.obj([PDFName.of('ICCBased'), icc]),
    CSlab: ctx.obj([PDFName.of('Lab'), ctx.obj({ WhitePoint: [0.9505, 1, 1.089], Range: [-100, 100, -100, 100] })]),
    CSidx: ctx.obj([PDFName.of('Indexed'), PDFName.of('DeviceRGB'), 3, palette]),
    CSsep: ctx.obj([PDFName.of('Separation'), PDFName.of('Pomarancz'), PDFName.of('DeviceCMYK'), sepT2]),
    CSsep4: ctx.obj([PDFName.of('Separation'), PDFName.of('Zielen'), PDFName.of('DeviceRGB'), sepT4]),
    CSdn: ctx.obj([PDFName.of('DeviceN'), ctx.obj([PDFName.of('Cyan'), PDFName.of('Magenta')]), PDFName.of('DeviceCMYK'), dnFn2]),
    CSpat: ctx.obj([PDFName.of('Pattern'), PDFName.of('DeviceRGB')]),
  });

  // Shadings
  const axial = ctx.obj({ ShadingType: 2, ColorSpace: 'DeviceRGB', Coords: [40, 0, 560, 0], Function: ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: [1, 0, 0], C1: [0, 0, 1], N: 1 }), Extend: [true, true] });
  const radial = ctx.obj({
    ShadingType: 3, ColorSpace: 'DeviceCMYK', Coords: [450, 420, 0, 450, 420, 60],
    Function: ctx.obj({ FunctionType: 3, Domain: [0, 1], Bounds: [0.5], Encode: [0, 1, 0, 1], Functions: [
      ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: [0, 1, 1, 0], C1: [1, 0, 0, 0], N: 1 }),
      ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: [1, 0, 0, 0], C1: [0, 0, 1, 0], N: 1 }),
    ] }),
  });

  // Tiling patterns: coloured, and uncoloured (its colour comes with scn)
  const tile = ctx.register(ctx.flateStream('1 0.5 0 rg 0 0 10 10 re f 0 0.6 0.3 rg 10 10 10 10 re f', { Type: 'Pattern', PatternType: 1, PaintType: 1, TilingType: 1, BBox: [0, 0, 20, 20], XStep: 20, YStep: 20, Resources: ctx.obj({}) }));
  const tileU = ctx.register(ctx.flateStream('0 0 6 6 re f', { Type: 'Pattern', PatternType: 1, PaintType: 2, TilingType: 1, BBox: [0, 0, 12, 12], XStep: 12, YStep: 12, Resources: ctx.obj({}) }));

  // Images
  const w = 40, h = 30;
  const rows: number[] = [];
  for (let y = 0; y < h; y++) { rows.push(1); for (let x = 0; x < w; x++) rows.push(x * 6 % 256, y * 8 % 256, 200); } // PNG "Sub" filter rows
  const rgbImg = ctx.register(ctx.flateStream(new Uint8Array(rows), { Type: 'XObject', Subtype: 'Image', Width: w, Height: h, ColorSpace: ctx.obj([PDFName.of('ICCBased'), icc]), BitsPerComponent: 8, DecodeParms: { Predictor: 15, Colors: 3, Columns: w } }));
  const jc = canvasMod.createCanvas(64, 48); const jx = jc.getContext('2d');
  const grad = jx.createLinearGradient(0, 0, 64, 0); grad.addColorStop(0, '#e11'); grad.addColorStop(1, '#13e'); jx.fillStyle = grad; jx.fillRect(0, 0, 64, 48);
  jx.fillStyle = '#2c2'; jx.fillRect(16, 12, 32, 24);
  const jpeg = new Uint8Array(jc.toBuffer('image/jpeg', 95));
  const jpgImg = ctx.register(ctx.stream(jpeg, { Type: 'XObject', Subtype: 'Image', Width: 64, Height: 48, ColorSpace: 'DeviceRGB', BitsPerComponent: 8, Filter: 'DCTDecode' }));
  const idxImg = ctx.register(ctx.flateStream(new Uint8Array(Array.from({ length: 16 * 16 }, (_, i) => (i >> 2) % 4)), { Type: 'XObject', Subtype: 'Image', Width: 16, Height: 16, ColorSpace: colorSpaces.get(PDFName.of('CSidx'))!, BitsPerComponent: 8 }));
  // A form that sets no colour space: it draws in the caller's
  const form = ctx.register(ctx.flateStream('0.9 0.1 0.6 sc 0 0 80 40 re f', { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 80, 40], Resources: ctx.obj({}) }));

  const res = page.node.Resources()!;
  res.set(PDFName.of('ColorSpace'), colorSpaces);
  res.set(PDFName.of('Shading'), ctx.obj({ Sh1: axial, Sh2: radial }));
  res.set(PDFName.of('Pattern'), ctx.obj({ P1: tile, P2: tileU }));
  res.set(PDFName.of('XObject'), ctx.obj({ Im1: rgbImg, Im2: jpgImg, Im3: idxImg, Fm1: form }));

  const inline = Array.from({ length: 8 * 8 }, (_, i) => (i % 2 ? '1e90ff' : 'ffa500')).join('');
  const content = [
    `BT /${fontName} 18 Tf 0.8 0.1 0.1 rg 40 720 Td (Czerwony) Tj 0 0 0.8 rg 120 0 Td (Niebieski) Tj ET`,
    '0.1 0.7 0.2 RG 6 w 40 700 m 560 700 l S',
    '0 0.8 0.8 0 k 40 620 80 60 re f',
    '0.6 0 0 0 K 4 w 140 620 80 60 re S',
    '/CSicc cs 0.2 0.5 0.9 sc 240 620 80 60 re f',
    '/CSlab cs 60 40 -30 sc 340 620 80 60 re f',
    '/CSidx cs 1 sc 440 620 80 60 re f',
    '/CSsep cs 0.7 scn 40 540 80 60 re f',
    '/CSsep4 cs 1 scn 140 540 80 60 re f',
    '/CSdn cs 0.5 0.9 scn 240 540 80 60 re f',
    '/Pattern cs /P1 scn 340 540 80 60 re f',
    '/CSpat cs 0.9 0.3 0.1 /P2 scn 440 540 80 60 re f',
    'q 40 440 300 60 re W n /Sh1 sh Q',
    'q 390 360 120 120 re W n /Sh2 sh Q',
    'q 40 360 120 60 cm /Im1 Do Q',
    'q 180 360 120 60 cm /Im2 Do Q',
    'q 320 300 60 60 cm /Im3 Do Q',
    'q 0.3 0.6 0.9 rg 40 280 cm /Fm1 Do Q',
    '/DeviceRGB cs q 140 280 cm /Fm1 Do Q',
    `q 200 260 64 64 cm BI /W 8 /H 8 /CS /RGB /BPC 8 /F /AHx ID ${inline}> EI Q`,
  ].join('\n');
  page.node.set(PDFName.of('Contents'), ctx.register(ctx.flateStream(content)));

  // An annotation with colours and an appearance
  const ap = ctx.register(ctx.flateStream('1 0.85 0 rg 0 0 120 30 re f 0 0 1 RG 2 w 1 1 118 28 re S', { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 120, 30], Resources: ctx.obj({}) }));
  const annot = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Square', Rect: [400, 260, 520, 290], C: [0, 0, 1], IC: [1, 0.85, 0], DA: PDFHexString.fromText('/Helv 10 Tf 0.9 0 0 rg'), AP: { N: ap } }));
  page.node.set(PDFName.of('Annots'), ctx.obj([annot]));

  // Page 2: a mesh gradient (type 4) — cannot be converted, must get the overlay
  const p2 = doc.addPage([300, 300]);
  const v = (f: number, x: number, y: number, r: number, g: number, b: number) => [f, x >> 8, x & 255, y >> 8, y & 255, r, g, b];
  const mesh = ctx.register(ctx.flateStream(new Uint8Array([...v(0, 0, 0, 255, 0, 0), ...v(0, 65535, 0, 0, 255, 0), ...v(0, 32767, 65535, 0, 0, 255)]),
    { ShadingType: 4, ColorSpace: 'DeviceRGB', BitsPerCoordinate: 16, BitsPerComponent: 8, BitsPerFlag: 8, Decode: [0, 300, 0, 300, 0, 1, 0, 1, 0, 1] }));
  p2.node.set(PDFName.of('Resources'), ctx.obj({ Shading: { M1: mesh } }));
  p2.node.set(PDFName.of('Contents'), ctx.register(ctx.flateStream('q 0 0 300 300 re W n /M1 sh Q 0.9 0.2 0.2 rg 20 20 60 60 re f')));
  return doc.save();
}

console.log('=== a PDF with every kind of colour ===');
const src = await colourfulPdf();
const { bytes: out, report } = await convertToGrayscale(src, codec);
const before = await render(src, 1.5);
const after = await render(out, 1.5);
for (let p = 0; p < before.length; p++) {
  const r = compare(before[p]!, after[p]!);
  check(r.colour > 2000, `page ${p + 1}: the original has colour (${r.colour} colourful pixels)`);
  check(r.notGray === 0, `page ${p + 1}: every pixel of the result is gray (${r.notGray} of ${r.pixels} are not)`);
  check(r.p99 <= 6 && r.mean <= 1.5, `page ${p + 1}: as light as the original (mean difference ${r.mean.toFixed(2)}, 99th percentile ${r.p99.toFixed(1)}, worst ${r.worst.toFixed(0)} of 255)`);
  check(before[p]!.text === after[p]!.text, `page ${p + 1}: the same text (${JSON.stringify(after[p]!.text.slice(0, 40))})`);
}
check(JSON.stringify(report.overlayPages) === '[2]' && report.leftovers.gradient === 1, `only the mesh gradient was left, page 2 got the overlay (${JSON.stringify(report.leftovers)}, overlay on ${report.overlayPages.join(',')})`);
check(report.images === 4 && report.gradients === 2 && report.spotColours >= 3, `converted: ${report.images} images (Flate, JPEG, indexed, inline), ${report.gradients} gradients, ${report.spotColours} spot colours, ${report.colours} colours`);
{
  // What is in the file, not only how it looks: no colour operator or colour image left on page 1.
  const lib = await PDFDocument.load(out);
  const p1 = lib.getPage(0);
  const text = latin1((p1.node.Contents() as unknown as PDFStream).getContents ? (await import('pdf-lib')).decodePDFRawStream(p1.node.lookup(PDFName.of('Contents')) as never).decode() : new Uint8Array());
  const ops = parseOps(text).map((o) => o.op);
  check(!ops.some((o) => ['rg', 'RG', 'k', 'K'].includes(o)), `page 1 content has no RGB/CMYK operators left (${[...new Set(ops)].filter((o) => /^[a-zA-Z]+$/.test(o)).join(' ')})`);
  const xo = p1.node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
  const spaces = xo.keys().map((k) => { const s = xo.lookup(k) as PDFStream; const cs = s.dict.lookup(PDFName.of('ColorSpace')); return `${k.decodeText()}:${cs instanceof PDFArray ? `[${cs.asArray().slice(0, 2).join(' ')}]` : cs?.toString() ?? '-'}`; });
  check(spaces.every((x) => /DeviceGray|:-|DeviceRGB/.test(x)), `images are gray (${spaces.join(', ')})`);
  const annot = p1.node.Annots()!.lookup(0, PDFDict);
  check(annot.lookup(PDFName.of('C'), PDFArray).size() === 1 && annot.lookup(PDFName.of('IC'), PDFArray).size() === 1, 'annotation colours /C and /IC are one gray number each');
}

console.log('\n=== real files: gray, as light as before, same text, no overlay ===');
for (const f of ['allegro-raport.pdf', 'gpw-ebook.pdf', 'chrome-brochure.pdf', 'chrome-article.pdf', 'chrome-report.pdf', 'Raport - 12 rzeczy, które robią skuteczni handlarze w Internecie_na Allegro.pdf']) {
  const bytes = new Uint8Array(readFileSync(join(ROOT, 'test-real-pdfs', f)));
  const t0 = Date.now();
  const res = await convertToGrayscale(bytes, codec);
  const ms = Date.now() - t0;
  const a = await render(bytes, 0.75), b = await render(res.bytes, 0.75);
  let notGray = 0, colour = 0, worstMean = 0, worstP99 = 0, textSame = true;
  for (let p = 0; p < a.length; p++) {
    const r = compare(a[p]!, b[p]!);
    notGray += r.notGray; colour += r.colour;
    worstMean = Math.max(worstMean, r.mean); worstP99 = Math.max(worstP99, r.p99);
    if (a[p]!.text !== b[p]!.text) textSame = false;
  }
  check(colour > 1000 && notGray === 0 && worstMean <= 1.5 && worstP99 <= 8 && textSame && res.report.overlayPages.length === 0,
    `${f.slice(0, 40)}: ${a.length} pages, ${colour} colourful → ${notGray} not gray, lightness mean ≤ ${worstMean.toFixed(2)}, p99 ≤ ${worstP99.toFixed(1)}, text ${textSame ? 'same' : 'DIFFERENT'}, no overlay, ${(bytes.length / 1024).toFixed(0)} → ${(res.bytes.length / 1024).toFixed(0)} kB, ${ms} ms`);
}

console.log('\n=== refusals ===');
{
  const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
  const d = await PDFDocument.create(); d.addPage();
  let msg = '';
  try { await convertToGrayscale(await encryptPDF(await d.save(), 'x'), codec); } catch (e) { msg = (e as Error).message; }
  check(/zabezpieczony hasłem/.test(msg), 'an encrypted PDF is refused with the usual message');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
