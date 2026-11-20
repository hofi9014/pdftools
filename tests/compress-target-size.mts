// "Compress to a target size" (plan 1.3, 2026-11-20) and the JPEG-quality fix in compressPDFClient.
// The real engine runs unmodified; the browser's canvas and createImageBitmap are replaced by
// @napi-rs/canvas (a dev dependency already used by other tests), and every quality value the
// engine hands to canvas.toBlob is recorded.
// Run: npm run test:compress-target-size
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { PDFDocument, PDFName, PDFRawStream, StandardFonts } from 'pdf-lib';

const qualities: number[] = [];
(globalThis as unknown as { document: unknown }).document = {
  createElement: (tag: string) => {
    if (tag !== 'canvas') throw new Error(`unexpected createElement(${tag})`);
    const c = createCanvas(1, 1) as unknown as { toBlob: (cb: (b: Blob | null) => void, type: string, q: number) => void; toBuffer: (t: 'image/jpeg', q: number) => Buffer };
    c.toBlob = (cb, _type, q) => {
      qualities.push(q);
      // napi takes 0-100; a value outside 0-1 is what a browser ignores, so mimic its default.
      const pct = q > 0 && q <= 1 ? Math.round(q * 100) : 92;
      cb(new Blob([c.toBuffer('image/jpeg', pct) as BlobPart], { type: 'image/jpeg' }));
    };
    return c;
  },
};
(globalThis as unknown as { createImageBitmap: unknown }).createImageBitmap = async (blob: Blob) => {
  const img = await loadImage(Buffer.from(await blob.arrayBuffer()));
  return Object.assign(img, { close() {} });
};

const { compressPDFClient, compressPDFToTarget, TARGET_LADDER, TARGET_HEAVY_STEP } = await import('../lib/client-pdf');
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const toFile = (buf: Uint8Array, name = 'test.pdf') => Object.assign(new Blob([buf as BlobPart]), { name }) as unknown as File;

// A noisy picture compresses badly, like a photo or a scan.
function noisy(w: number, h: number, alpha = false): ReturnType<typeof createCanvas> {
  const c = createCanvas(w, h);
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  let seed = 7;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const x = (i / 4) % w;
    img.data[i] = (x * 255) / w + (seed % 60);
    img.data[i + 1] = ((i / 4 / w) * 255) / h + ((seed >> 8) % 60);
    img.data[i + 2] = 128 + ((seed >> 16) % 80);
    img.data[i + 3] = alpha ? 128 + ((seed >> 4) % 127) : 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

const doc = await PDFDocument.create();
const page = doc.addPage([595, 842]);
const font = await doc.embedFont(StandardFonts.Helvetica);
page.drawText('Hello target size', { x: 50, y: 790, size: 20, font });
const photo = await doc.embedJpg(noisy(2000, 1500).toBuffer('image/jpeg', 95));
page.drawImage(photo, { x: 50, y: 420, width: 495, height: 360 });
const screenshot = await doc.embedPng(noisy(900, 600).toBuffer('image/png'));
page.drawImage(screenshot, { x: 50, y: 230, width: 300, height: 180 });
const withAlpha = await doc.embedPng(noisy(400, 300, true).toBuffer('image/png'));
page.drawImage(withAlpha, { x: 380, y: 230, width: 160, height: 120 });
const original = await doc.save();
console.log(`original: ${(original.length / 1024).toFixed(0)} KB`);

async function images(bytes: Uint8Array) {
  const d = await PDFDocument.load(bytes);
  const out: { w: number; filter: string; smask: boolean }[] = [];
  for (const [, o] of d.context.enumerateIndirectObjects()) {
    if (!(o instanceof PDFRawStream) || String(o.dict.get(PDFName.of('Subtype'))) !== '/Image') continue;
    out.push({ w: Number(String(o.dict.get(PDFName.of('Width')))), filter: String(o.dict.get(PDFName.of('Filter'))), smask: !!o.dict.get(PDFName.of('SMask')) });
  }
  return out;
}
async function text(bytes: Uint8Array) {
  const d = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: false }).promise;
  const p = await d.getPage(1);
  const tc = await p.getTextContent();
  return { pages: d.numPages, text: tc.items.map((i) => ('str' in i ? i.str : '')).join(' ') };
}

console.log('\n=== JPEG quality is passed as 0-1 (the browser ignored 95/90) ===');
qualities.length = 0;
await compressPDFClient(toFile(original), 'recommended');
check(qualities.length > 0 && qualities.every((q) => q > 0 && q <= 1), `quality values ${[...new Set(qualities)].join(', ')}`);

console.log('\n=== target well below the file: reached, content kept ===');
const target = Math.round(original.length * 0.35);
const r = await compressPDFToTarget(toFile(original), target);
const t1 = await text(r.bytes);
check(r.reached && r.bytes.length <= target, `${(r.bytes.length / 1024).toFixed(0)} KB <= ${(target / 1024).toFixed(0)} KB`);
check(t1.pages === 1 && t1.text.includes('Hello target size'), 'one page, text still there');
const imgs = await images(r.bytes);
const alpha = imgs.find((i) => i.smask);
check(!!alpha && alpha.w === 400 && alpha.filter === '/FlateDecode', 'the picture with transparency is left as it was');
// Widths other than 400 (the picture with transparency and its mask): the photo, then the screenshot.
const [photoOut, shotOut] = imgs.filter((i) => i.w !== 400).sort((a, b) => b.w - a.w);
check(photoOut?.filter === '/DCTDecode' && shotOut?.filter === '/DCTDecode' && shotOut.w < 900, `the lossless picture without transparency is re-encoded too (${shotOut?.filter}, ${shotOut?.w} px)`);

console.log('\n=== target above the file: nothing in the images is touched ===');
const big = await compressPDFToTarget(toFile(original), original.length + 1_000_000);
const bigImgs = await images(big.bytes);
check(big.reached && big.lossless && !big.heavy, 'reached without touching images');
check(bigImgs.some((i) => i.w === 2000) && bigImgs.some((i) => i.w === 900), 'pictures keep their pixel size');

console.log('\n=== target just below the untouched size: the gentlest step is used ===');
const plainSize = big.bytes.length;
const gentle = await compressPDFToTarget(toFile(original), plainSize - 1000);
const gentleImgs = await images(gentle.bytes);
check(gentle.reached && !gentle.lossless && !gentle.heavy, 'reached with a gentle step');
check(gentleImgs.some((i) => i.w === Math.round(2000 * TARGET_LADDER[0]!.scale)), `photo kept at ${Math.round(2000 * TARGET_LADDER[0]!.scale)} px (step 0)`);

console.log('\n=== impossible target: smallest result, honestly not reached ===');
const tiny = await compressPDFToTarget(toFile(original), 5_000);
const t2 = await text(tiny.bytes);
check(!tiny.reached && tiny.heavy && tiny.bytes.length < original.length, `not reached, smallest ${(tiny.bytes.length / 1024).toFixed(0)} KB, heavy`);
check(t2.text.includes('Hello target size'), 'text still there in the smallest result');
check(TARGET_HEAVY_STEP > 0 && TARGET_HEAVY_STEP < TARGET_LADDER.length, 'heavy step inside the ladder');
check(TARGET_LADDER.every((s, i) => i === 0 || (s.scale <= TARGET_LADDER[i - 1]!.scale && (s.quality ?? 1) <= (TARGET_LADDER[i - 1]!.quality ?? 1))), 'ladder gets stronger step by step');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
