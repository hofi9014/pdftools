// Component C2 — painted-id → stream join + byte dedupe test.
// buildPdfImageMap on allegro-raport.pdf (4 images: p1/p4/p6 DCT + p27 Flate-decodable,
// all matched, no ambiguity), then synthetic PDFs proving dedupe (same image on 2 pages →
// 1 unique copy shared) and never-wrong-image (two same-dims streams on one page → skip+warn).
// Repo-relative paths, no `any`.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

import { PDFDocument } from 'pdf-lib';
import { buildPdfImageMap } from '../lib/pdf/extractPdfImages';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(buf: Buffer, name: string): File {
  const blob = new Blob([buf]);
  return Object.assign(blob, { name }) as unknown as File;
}

// Minimal independent PNG builder (same shape as the C1 test helper) for the synthetic PDFs.
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const pakoMod = (await import('pako')) as unknown as {
  default: { deflate(u: Uint8Array, opts?: { level?: number }): Uint8Array };
};
function buildPngRgb(width: number, height: number, fill: number[]): Uint8Array {
  const bpp = width * 3;
  const scan = new Uint8Array(height * (bpp + 1));
  for (let y = 0; y < height; y++) {
    scan[y * (bpp + 1)] = 0;
    for (let x = 0; x < width; x++) {
      scan[y * (bpp + 1) + 1 + x * 3] = fill[0];
      scan[y * (bpp + 1) + 1 + x * 3 + 1] = fill[1];
      scan[y * (bpp + 1) + 1 + x * 3 + 2] = fill[2];
    }
  }
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const chunk = (type: string, data: Uint8Array): Uint8Array => {
    const enc = new TextEncoder();
    const t = enc.encode(type);
    const out = new Uint8Array(12 + data.length);
    const v = new DataView(out.buffer);
    v.setUint32(0, data.length);
    out.set(t, 4);
    out.set(data, 8);
    v.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const parts = [
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', pakoMod.default.deflate(scan, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const OUT = resolve('test-output/pdf-images-c2');
mkdirSync(OUT, { recursive: true });

console.log('\n=== C2: buildPdfImageMap on allegro-raport.pdf (4 images, pages 1/4/6/27) ===');
const allegro = toFile(readFileSync(resolve('test-real-pdfs/allegro-raport.pdf')), 'allegro-raport.pdf');
const map = await buildPdfImageMap(allegro, [1, 4, 6, 27]);

check(map.images.size === 4, `all 4 painted images joined (${map.images.size})`);
const jpgs = [...map.images.values()].filter(i => i.mime === 'image/jpeg');
const pngs = [...map.images.values()].filter(i => i.mime === 'image/png');
check(jpgs.length === 3, `3 of them are JPEG pass-through (${jpgs.length})`);
check(pngs.length === 1, `the Flate one is a PNG wrapper (${pngs.length})`);

console.log('  join result:');
for (const [id, img] of map.images) {
  console.log(
    `    ${id}  page=${img.page}  ${img.width}x${img.height}  ${img.mime}  stream=${img.sourceStream}  ` +
      `dedupe=${img.dedupeKey}  bytes=${img.data.length}`,
  );
}

const byPage = new Map<number, { w: number; h: number }[]>();
for (const img of map.images.values()) {
  const arr = byPage.get(img.page) || [];
  arr.push({ w: img.width, h: img.height });
  byPage.set(img.page, arr);
}
const expectedDims = new Map<number, string>([
  [1, '2480x3508'],
  [4, '2000x1000'],
  [6, '2048x1152'],
  [27, '543x228'],
]);
check(byPage.size === 4, `joined images spread over the 4 image pages (${byPage.size})`);
for (const [page, dims] of byPage) {
  check(dims.length === 1, `page ${page} joined exactly 1 image (${dims.length})`);
  check(dims[0].w + 'x' + dims[0].h === expectedDims.get(page), `page ${page} dims ${dims[0].w}x${dims[0].h} match dict Width×Height`);
}
check(jpgs.every(j => j.data[0] === 0xff && j.data[1] === 0xd8 && j.data[2] === 0xff), 'JPEG entries start with SOI magic (FF D8 FF)');
const p27 = pngs[0];
check(p27 !== undefined && p27.data[0] === 0x89 && p27.data[1] === 0x50 && p27.data[2] === 0x4e && p27.data[3] === 0x47, 'PNG entry starts with PNG signature');
check(p27 !== undefined && p27.page === 27, 'the PNG entry sits on page 27');
check(p27 !== undefined && p27.sourceStream === 'Im0', `the PNG stream name is Im0 (${p27?.sourceStream})`);

const warnAmb = map.warnings.filter(w => w.kind === 'ambiguous-dims');
const warnUnm = map.warnings.filter(w => w.kind === 'unmatched-painted');
const warnUnd = map.warnings.filter(w => w.kind === 'undecodable');
check(warnAmb.length === 0, `zero ambiguities to report on the real fixture (${warnAmb.length})`);
check(warnUnm.length === 0, `zero unmatched-painted warnings (${warnUnm.length})`);
check(warnUnd.length === 0, `zero undecodable warnings (${warnUnd.length})`);
check(map.warnings.length === 0, `total warnings == 0 (${map.warnings.length})`);
check(map.uniqueCopies === 4, `all 4 images are byte-distinct → uniqueCopies == 4 (${map.uniqueCopies})`);

// Persist join artifacts as evidence.
for (const img of map.images.values()) {
  const ext = img.mime === 'image/jpeg' ? 'jpg' : 'png';
  writeFileSync(join(OUT, `join_p${img.page}_${img.imageId.replace(/[^a-z0-9]/gi, '_')}.${ext}`), Buffer.from(img.data));
}

console.log('\n=== C2: all-pages call = same 4 joins, no phantom pages ===');
const mapAll = await buildPdfImageMap(allegro, []);
check(mapAll.images.size === 4, `all-pages scan joins exactly the same 4 (${mapAll.images.size})`);
check(mapAll.warnings.length === 0, `all-pages scan → still 0 warnings (${mapAll.warnings.length})`);
check(
  [...mapAll.images.values()].every(i => i.page === 1 || i.page === 4 || i.page === 6 || i.page === 27),
  'no phantom joins outside pages 1/4/6/27',
);

console.log('\n=== C2: byte dedupe — the SAME image drawn on 2 pages → 1 unique copy, reused ===');
{
  const doc = await PDFDocument.create();
  const red = buildPngRgb(8, 2, [220, 40, 40]);
  const img = await doc.embedPng(red);
  const p1 = doc.addPage([100, 100]);
  const p2 = doc.addPage([100, 100]);
  p1.drawImage(img, { x: 10, y: 10, width: 16, height: 4 });
  p2.drawImage(img, { x: 20, y: 20, width: 16, height: 4 });
  const bytes = await doc.save();
  const dd = await buildPdfImageMap(toFile(Buffer.from(bytes), 'dedupe.pdf'), [1, 2]);
  check(dd.images.size === 2, `2 painted references joined (${dd.images.size})`);
  check(dd.uniqueCopies === 1, `but exactly 1 unique byte copy (${dd.uniqueCopies}) — dedupe works`);
  const all = [...dd.images.values()];
  check(all.length === 2 && all[0].dedupeKey === all[1].dedupeKey, 'both entries share the same dedupeKey');
  check(all.length === 2 && all[0].data === all[1].data, 'both entries share the SAME decoded Uint8Array reference (no copy re-embedded)');
  check(dd.warnings.length === 0, `no warnings on the dedupe fixture (${dd.warnings.length})`);
}

console.log('\n=== C2: never-wrong-image — two same-dims streams on one page → ambiguous skip + warn ===');
{
  const doc = await PDFDocument.create();
  const red = buildPngRgb(8, 2, [220, 40, 40]);
  const blue = buildPngRgb(8, 2, [40, 40, 220]);
  const imgRed = await doc.embedPng(red);
  const imgBlue = await doc.embedPng(blue);
  const p1 = doc.addPage([100, 100]);
  p1.drawImage(imgRed, { x: 10, y: 10, width: 16, height: 4 });
  p1.drawImage(imgBlue, { x: 40, y: 40, width: 16, height: 4 });
  const bytes = await doc.save();
  const dd = await buildPdfImageMap(toFile(Buffer.from(bytes), 'ambiguous.pdf'), [1]);
  check(dd.images.size === 0, `0 images embedded (${dd.images.size}) — nothing guessed`);
  const amb = dd.warnings.filter(w => w.kind === 'ambiguous-dims');
  check(amb.length === 2, `2 painted references both reported as ambiguous-dims (${amb.length})`);
  check(amb.every(w => w.page === 1), 'all ambiguity warnings point at page 1');
  for (const w of dd.warnings) console.log(`    warn page=${w.page} kind=${w.kind} ${w.detail}`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);