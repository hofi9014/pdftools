// C1 + C1b image extraction test.
// DCT pass-through (JPEG) + Flate→PNG wrapper (RGBA when SMask). No `any`, repo-relative paths.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFRef } from 'pdf-lib';
import { collectPageImageStreams, decodePdfImage } from '../lib/pdf/extractPdfImages';
import { parseFilters } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

const pakoMod = (await import('pako')) as unknown as {
  default: {
    inflate(u: Uint8Array): Uint8Array;
    deflate(u: Uint8Array, opts?: { level?: number }): Uint8Array;
  };
};
const inflateRaw = pakoMod.default.inflate;
const deflateRaw = pakoMod.default.deflate;

// === JPEG whole-stream integrity (C1) ===
// Walk every real marker, assert every segment length stays in bounds, handle entropy-coded
// scan data (stuffed FF00 / RSTD0-D7), require stream to end EXACTLY on EOI.
function jpegSegmentWalkOk(b: Uint8Array): boolean {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return false;
  let pos = 2;
  while (pos < b.length) {
    if (b[pos] !== 0xff) return false;
    while (pos < b.length && b[pos] === 0xff) pos++; // 0xFF fill
    if (pos >= b.length) return false;
    const code = b[pos];
    pos += 1;
    if (code === 0xd9) return pos === b.length;
    if (code === 0x01 || (code >= 0xd0 && code <= 0xd7)) continue; // TEM / RSTn: standalone
    if (pos + 2 > b.length) return false;
    const len = (b[pos] << 8) | b[pos + 1];
    if (len < 2 || pos + len > b.length) return false;
    const segEnd = pos + len;
    if (code === 0xda) {
      pos = segEnd; // skip entropy data until the next REAL marker
      let more = true;
      while (more && pos < b.length) {
        while (pos < b.length && b[pos] !== 0xff) pos++;
        if (pos + 1 >= b.length) return false;
        if (b[pos + 1] === 0x00) pos += 2; // stuffed byte FF00
        else if (b[pos + 1] >= 0xd0 && b[pos + 1] <= 0xd7) pos += 2; // RSTn inside scan
        else more = false;
      }
      continue;
    }
    pos = segEnd;
  }
  return false;
}

// === PNG whole-stream integrity (C1b) ===
const PNG_SIG_EXPECTED = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

let crcTable: Uint32Array | null = null;
function crc32(buf: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Minimal independent PNG builder (test-only; validates our CRC walk against a SECOND
// implementation of the format, the way Pillow does for the file overall).
function buildSimplePng(width: number, height: number, channels: 1 | 3 | 4, pixels: Uint8Array): Uint8Array {
  const bpp = width * channels;
  const scan = new Uint8Array(height * (bpp + 1));
  for (let y = 0; y < height; y++) {
    scan[y * (bpp + 1)] = 0;
    scan.set(pixels.subarray(y * bpp, (y + 1) * bpp), y * (bpp + 1) + 1);
  }
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : channels === 1 ? 0 : 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
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
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', deflateRaw(scan)), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

// Full-structure PNG check: signature + every chunk length/type/CRC + contiguous IDAT +
// stream ends EXACTLY on IEND. Returns error string or null when fully valid.
function pngStructureError(b: Uint8Array): string | null {
  if (b.length < 8) return 'too short for signature';
  for (let i = 0; i < 8; i++) if (b[i] !== PNG_SIG_EXPECTED[i]) return 'bad PNG signature';
  let pos = 8;
  let sawIdat = false;
  while (pos < b.length) {
    if (pos + 8 > b.length) return 'truncated chunk header';
    const len = new DataView(b.buffer, b.byteOffset + pos, 4).getUint32(0);
    const type = String.fromCharCode(b[pos + 4], b[pos + 5], b[pos + 6], b[pos + 7]);
    const dataStart = pos + 8;
    const dataEnd = dataStart + len;
    if (dataEnd + 4 > b.length) return `chunk ${type} overruns stream`;
    const storedCrc = new DataView(b.buffer, b.byteOffset + dataEnd, 4).getUint32(0);
    const calcCrc = crc32(b.subarray(pos + 4, dataEnd));
    if (storedCrc !== calcCrc) return `CRC mismatch in ${type}`;
    if (type === 'IDAT') sawIdat = true;
    if (type === 'IEND') return dataEnd + 4 === b.length ? null : 'trailing bytes after IEND';
    pos = dataEnd + 4;
  }
  return sawIdat ? 'no IEND' : 'no IDAT';
}

interface PngPixels {
  width: number;
  height: number;
  channels: number;
  pixels: Uint8Array;
}

// Independent pixel decoder: parse IHDR (bit depth 8, color 0/2/6, interlace 0), inflate the
// concatenated IDAT (zlib) and strip the per-row filter byte. Returns pixels or error string.
function pngDecodePixels(b: Uint8Array): PngPixels | string {
  if (b.length < 8 + 25) return 'too short';
  if (b[8 + 4] !== 'I'.charCodeAt(0)) return 'first chunk not IHDR';
  const ihdrLen = new DataView(b.buffer, b.byteOffset + 8, 4).getUint32(0);
  if (ihdrLen !== 13) return 'IHDR length != 13';
  const w = new DataView(b.buffer, b.byteOffset + 16, 4).getUint32(0);
  const h = new DataView(b.buffer, b.byteOffset + 20, 4).getUint32(0);
  const bitDepth = b[24];
  const colorType = b[25];
  if (b[28] !== 0) return 'interlace != 0';
  if (bitDepth !== 8) return `bit depth ${bitDepth} != 8`;
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 6 ? 4 : -1;
  if (channels <= 0) return `unsupported color type ${colorType}`;
  let pos = 8;
  const idat: Uint8Array[] = [];
  while (pos < b.length) {
    const len = new DataView(b.buffer, b.byteOffset + pos, 4).getUint32(0);
    const type = String.fromCharCode(b[pos + 4], b[pos + 5], b[pos + 6], b[pos + 7]);
    if (type === 'IDAT') idat.push(b.subarray(pos + 8, pos + 8 + len));
    if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (!idat.length) return 'no IDAT';
  const joined = new Uint8Array(idat.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of idat) {
    joined.set(c, o);
    o += c.length;
  }
  let raw: Uint8Array;
  try {
    raw = new Uint8Array(inflateRaw(joined));
  } catch (e) {
    return `IDAT inflate failed (${(e as Error).message})`;
  }
  const bpp = w * channels;
  if (raw.length !== h * (bpp + 1)) return `deflated ${raw.length} B != ${h}x(${bpp}+1)`;
  const out = new Uint8Array(h * bpp);
  for (let y = 0; y < h; y++) {
    if (raw[y * (bpp + 1)] !== 0) return `row ${y} filter byte != 0`;
    out.set(raw.subarray(y * (bpp + 1) + 1, (y + 1) * (bpp + 1)), y * bpp);
  }
  return { width: w, height: h, channels, pixels: out };
}

console.log('\n=== parseFilters reuse (single name + array) ===');
const tmp = await PDFDocument.create();
check(JSON.stringify(parseFilters(PDFName.of('DCTDecode'))) === '["/DCTDecode"]', 'single name -> [/DCTDecode]');
check(
  JSON.stringify(parseFilters(tmp.context.obj(['ASCII85Decode', 'DCTDecode']))) === '["/ASCII85Decode","/DCTDecode"]',
  'array -> both members',
);

console.log('\n=== allegro-raport.pdf: DCT pass-through (C1) ===');
const pdf = await PDFDocument.load(readFileSync(resolve('test-real-pdfs/allegro-raport.pdf')), {
  ignoreEncryption: true,
});
const expectedDct = new Map<number, { w: number; h: number }>([
  [1, { w: 2480, h: 3508 }],
  [4, { w: 2000, h: 1000 }],
  [6, { w: 2048, h: 1152 }],
]);
const outDir = resolve('test-output/pdf-images-c1');
mkdirSync(outDir, { recursive: true });
let dctSeen = 0;
let flateSeen = 0;

for (let pi = 0; pi < pdf.getPageCount(); pi++) {
  const metas = await collectPageImageStreams(pdf, pi);
  if (metas.length === 0) continue;
  console.log(`page ${pi + 1}: ${metas.length} image stream(s)`);
  for (const m of metas) {
    const dec = await decodePdfImage(m);
    if (m.filters.includes('/DCTDecode')) {
      dctSeen++;
      const e = expectedDct.get(pi + 1);
      console.log(
        `  ${m.name} ${m.filters.join('+')} ${m.width}x${m.height} ${m.bitsPerComponent}bpc ` +
          `cs=${m.colorSpace.kind}(n=${m.colorSpace.components}) raw=${m.rawBytes.length} B` +
          (m.smask ? ` smask=${m.smask.width}x${m.smask.height}` : ''),
      );
      check(dec !== null, `[dct p${pi + 1}] decoded as JPEG`);
      check(e !== undefined, `[dct p${pi + 1}] expected page`);
      check(m.width === e?.w && m.height === e?.h, `[dct p${pi + 1}] dict dims ${m.width}x${m.height}`);
      check(
        dec !== null && dec.data.length === m.rawBytes.length && dec.data.length > 1000,
        `[dct p${pi + 1}] passthrough keeps raw bytes (${dec?.data.length ?? 0})`,
      );
      if (dec) {
        const magic = dec.data[0] === 0xff && dec.data[1] === 0xd8 && dec.data[2] === 0xff;
        check(magic, `[dct p${pi + 1}] JPEG SOI magic FF D8 FF`);
        check(
          dec.data[dec.data.length - 2] === 0xff && dec.data[dec.data.length - 1] === 0xd9,
          `[dct p${pi + 1}] JPEG EOI FF D9 at end`,
        );
        check(jpegSegmentWalkOk(dec.data), `[dct p${pi + 1}] full JPEG segment walk: all markers in bounds, ends exactly on EOI`);
        writeFileSync(join(outDir, `img_p${pi + 1}.jpg`), Buffer.from(dec.data));
        const dtmp = await PDFDocument.create();
        try {
          const img = await dtmp.embedJpg(dec.data);
          check(img.width === m.width && img.height === m.height, `[dct p${pi + 1}] pdf-lib parses intrinsic dims ${img.width}x${img.height}`);
        } catch (err) {
          check(false, `[dct p${pi + 1}] pdf-lib rejects the JPEG (${(err as Error).message})`);
        }
      }
    } else if (m.filters.includes('/FlateDecode')) {
      flateSeen++;
      console.log(
        `  ${m.name} ${m.filters.join('+')} ${m.width}x${m.height} ${m.bitsPerComponent}bpc ` +
          `cs=${m.colorSpace.kind}(n=${m.colorSpace.components}) dp=${JSON.stringify(m.decodeParms)} ` +
          `raw=${m.rawBytes.length} B` + (m.smask ? ` smask=${m.smask.width}x${m.smask.height} ${JSON.stringify(m.smask.decodeParms)}` : ''),
      );
      check(pi + 1 === 27, `[flate p${pi + 1}] only page 27 expected`);
      check(dec !== null && dec.mime === 'image/png', `[flate p${pi + 1}] decoded to PNG (C1b)`);
      if (dec && dec.mime === 'image/png') {
        const pngErr = pngStructureError(dec.data);
        check(pngErr === null, `[flate p27] full PNG structure walk (signature + every chunk CRC + end on IEND): ${pngErr ?? 'OK'}`);
        const px = pngDecodePixels(dec.data);
        if (typeof px === 'string') {
          check(false, `[flate p27] independent pixel decode: ${px}`);
        } else {
          check(px.width === 543 && px.height === 228 && px.channels === 4, `[flate p27] IHDR = RGB(alpha) 543x228, color type 6 (${px.width}x${px.height} ch=${px.channels})`);
          const expectedRgb = new Uint8Array(inflateRaw(m.rawBytes));
          check(expectedRgb.length === 543 * 228 * 3, `[flate p27] inflated RGB = ${expectedRgb.length} == 543*228*3`);
          const alphaSrc = m.smask ? new Uint8Array(inflateRaw(m.smask.rawBytes)) : null;
          check(alphaSrc !== null && alphaSrc.length === 543 * 228, `[flate p27] inflated SMask = ${alphaSrc?.length ?? 0} == 543*228`);
          let diff = 0;
          let aMin = 255;
          let aMax = 0;
          if (alphaSrc) {
            for (let i = 0; i < 543 * 228; i++) {
              const a = px.pixels[i * 4 + 3];
              if (a < aMin) aMin = a;
              if (a > aMax) aMax = a;
              if (
                px.pixels[i * 4] !== expectedRgb[i * 3] ||
                px.pixels[i * 4 + 1] !== expectedRgb[i * 3 + 1] ||
                px.pixels[i * 4 + 2] !== expectedRgb[i * 3 + 2] ||
                px.pixels[i * 4 + 3] !== alphaSrc[i]
              ) {
                diff++;
              }
            }
          }
          check(diff === 0, `[flate p27] RGBA pixels == source RGB + SMask alpha byte-exact (diff=${diff})`);
          check(aMax > aMin && aMin < 255, `[flate p27] alpha channel is NOT uniform 255 (min=${aMin}, max=${aMax}) — mask contributes`);
        }
        writeFileSync(join(outDir, 'img_p27.png'), Buffer.from(dec.data));
      }
    } else {
      check(false, `[p${pi + 1}] unexpected filter ${m.filters.join(',')}`);
    }
  }
}
check(dctSeen === expectedDct.size, `exactly ${expectedDct.size} DCT streams saw (${dctSeen})`);
check(flateSeen === 1, `exactly 1 FlateDecode stream saw (${flateSeen})`);

console.log('\n=== SMask BitsPerComponent (dict, not DecodeParms) — guard proof (C1b) ===');
{
  const m27 = (await collectPageImageStreams(pdf, 26))[0];
  if (!m27 || !m27.smask) {
    check(false, 'p27 SMask meta missing for guard test');
  } else {
    check(m27.smask.bitsPerComponent === 8, 'p27 SMask dict BitsPerComponent read = 8 (field present)');
    const resources = pdf.getPage(26).node.Resources();
    const xoRaw = resources ? resources.get(PDFName.of('XObject')) : undefined;
    const xoObj = xoRaw instanceof PDFRef ? pdf.context.lookup(xoRaw) : xoRaw;
    const imgRaw = xoObj instanceof PDFDict ? xoObj.get(PDFName.of('Im0')) : undefined;
    const imgObj = imgRaw instanceof PDFRef ? pdf.context.lookup(imgRaw) : imgRaw;
    const smRaw = imgObj instanceof PDFRawStream ? imgObj.dict.get(PDFName.of('SMask')) : undefined;
    const smObj = smRaw instanceof PDFRef ? pdf.context.lookup(smRaw) : smRaw;
    if (!(smObj instanceof PDFRawStream)) {
      check(false, 'SMask stream dict not reachable for mutation');
    } else {
      smObj.dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(4));
      const metas4 = await collectPageImageStreams(pdf, 26);
      check(
        metas4[0]?.smask?.bitsPerComponent === 4,
        'after dict BitsPerComponent=4, meta re-reads 4 FROM THE DICT (DecodeParms still 8)',
      );
      const dec4 = await decodePdfImage(metas4[0]);
      check(dec4 !== null && dec4.mime === 'image/png', 'BPC=4 SMask still decodes (as opaque PNG, not skipped entirely)');
      if (dec4 && dec4.mime === 'image/png') {
        const px4 = pngDecodePixels(dec4.data);
        if (typeof px4 === 'string') {
          check(false, `BPC=4 SMask decode broken (${px4})`);
        } else {
          check(px4.channels === 3, `BPC=4 SMask → opaque fallback: PNG RGB color type 2 (got ch=${px4.channels}, expected 3, NOT 4-alpha) — warn path, no silent corruption`);
          const er = new Uint8Array(inflateRaw(m27.rawBytes));
          let diff4 = 0;
          for (let i = 0; i < 543 * 228; i++) {
            if (
              px4.pixels[i * 3] !== er[i * 3] ||
              px4.pixels[i * 3 + 1] !== er[i * 3 + 1] ||
              px4.pixels[i * 3 + 2] !== er[i * 3 + 2]
            ) {
              diff4++;
            }
          }
          check(diff4 === 0, `opaque fallback RGB still byte-exact vs source (diff=${diff4})`);
        }
      }
      smObj.dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
      const metas8 = await collectPageImageStreams(pdf, 26);
      check(metas8[0]?.smask?.bitsPerComponent === 8, 'restored dict BPC=8 → meta reads 8 again (RGBA path intact)');
    }
  }
}

console.log('\n=== JPEG whole-stream validator sanity (self-generated corruptions) ===');
const goodJpg = readFileSync(join(outDir, 'img_p1.jpg'));
const midCut = Uint8Array.from(goodJpg).subarray(0, goodJpg.length - 65536);
const noEoi = Uint8Array.from(goodJpg).subarray(0, goodJpg.length - 2);
check(!jpegSegmentWalkOk(midCut), 'walk REJECTS tail-truncated stream (SOI intact)');
check(!jpegSegmentWalkOk(noEoi), 'walk REJECTS missing-EOI stream');
const fakeDct = (rawBytes: Uint8Array) => ({
  name: 'sanity',
  filters: ['/DCTDecode'],
  width: 2480,
  height: 3508,
  bitsPerComponent: 8,
  colorSpace: { kind: 'iccbased' as const, components: 3 },
  decodeParms: null,
  smask: null,
  rawBytes,
});
check(
  (await decodePdfImage(fakeDct(midCut))) !== null,
  'SOI guard ALONE passes a tail-truncated stream (by design — which is why the walk exists)',
);

console.log('\n=== PNG whole-stream validator sanity (self-generated corruptions) ===');
const pngGood = readFileSync(join(outDir, 'img_p27.png'));
const idatHeaderPos = 8 + 12 + 13; // after signature + IHDR chunk
const idatLen = new DataView(pngGood.buffer, pngGood.byteOffset + idatHeaderPos, 4).getUint32(0);
const idatDataStart = idatHeaderPos + 8;
const idatDataEnd = idatDataStart + idatLen;

// (a) flip one byte in the IHDR CRC field
{
  const bad = Uint8Array.from(pngGood);
  bad[29] ^= 0xff;
  check(pngStructureError(bad) !== null, 'structure REJECTS flipped IHDR CRC');
}
// (b) flip one byte inside IDAT data, CRC left stale
{
  const bad = Uint8Array.from(pngGood);
  bad[idatDataStart + 5] ^= 0x01;
  check(pngStructureError(bad) !== null, 'structure REJECTS IDAT data flip with stale CRC');
}
// (c) flip one byte inside IDAT data AND recompute the CRC — "consistent corruption".
//     Structure + CRC walk passes, yet the content is no longer the source — exactly the
//     JPEG lesson (SOI guard passes, need deeper layer). Here the deeper layer is the
//     pixel-level source compare; a zlib decode error is also possible and counts.
{
  const bad = Uint8Array.from(pngGood);
  bad[idatDataStart + 5] ^= 0x01;
  new DataView(bad.buffer, bad.byteOffset + idatDataEnd, 4).setUint32(0, crc32(bad.subarray(idatHeaderPos + 4, idatDataEnd)));
  const err = pngStructureError(bad);
  check(err === null, `consistent corruption (flip + recomputed CRC) passes the WHOLE structure walk (${err ?? 'structure OK'}) — documented hole`);
  const px = pngDecodePixels(bad);
  const m = (await collectPageImageStreams(pdf, 26))[0];
  if (!m) {
    check(false, 'consistent corruption: page 27 stream re-read failed');
  } else {
    const expectedRgb = new Uint8Array(inflateRaw(m.rawBytes));
    const expectedAlpha = m.smask ? new Uint8Array(inflateRaw(m.smask.rawBytes)) : new Uint8Array(543 * 228);
    let contentBroken: string | null = null;
    if (typeof px === 'string') {
      contentBroken = `IDAT/zlib broken after flip (${px})`;
    } else {
      let diff = 0;
      for (let i = 0; i < 543 * 228; i++) {
        const a = px.pixels[i * 4 + 3];
        if (
          px.pixels[i * 4] !== expectedRgb[i * 3] ||
          px.pixels[i * 4 + 1] !== expectedRgb[i * 3 + 1] ||
          px.pixels[i * 4 + 2] !== expectedRgb[i * 3 + 2] ||
          a !== expectedAlpha[i]
        ) {
          diff++;
        }
      }
      if (diff === 0) contentBroken = `pixel bytes UNCHANGED after corruption (suspicious)`;
    }
    check(contentBroken !== null, `consistent corruption detected ONLY below the structural layer (${contentBroken ?? 'OK'})`);
  }
}
// (d) truncate IEND (stream ends before the last chunk)
{
  const bad = Uint8Array.from(pngGood).subarray(0, pngGood.length - 6);
  check(pngStructureError(bad) !== null, 'structure REJECTS truncated tail (IEND removed)');
}
// (f) zlib-VALID corruption: a real pixel edited and the PNG legitimately re-encoded. The
//     result is structurally pristine (all CRCs correct, deflate valid) — passes structure,
//     passes Pillow verify(), decodes in Pillow load(). ONLY a pixel-level source compare
//     catches it. This is the exact JPEG-analog hole, proven (not assumed).
{
  const mp = await collectPageImageStreams(pdf, 26);
  const srcRgb = new Uint8Array(inflateRaw(mp[0].rawBytes));
  const srcAlpha = mp[0].smask ? new Uint8Array(inflateRaw(mp[0].smask.rawBytes)) : new Uint8Array(543 * 228);
  const goodPx = pngDecodePixels(pngGood);
  const pix = typeof goodPx === 'string' ? null : Uint8Array.from(goodPx.pixels);
  if (!pix) {
    check(false, 'consistent-corruption rebuild: baseline pixel decode failed');
  } else {
    pix[4] ^= 0x7f; // one opaque-ish pixel byte flipped (content-level edit)
    const rebuilt = buildSimplePng(543, 228, 4, pix);
    const err = pngStructureError(rebuilt);
    const dec = pngDecodePixels(rebuilt);
    let diff = (typeof dec === 'string') ? -1 : 0;
    if (diff === 0 && dec) {
      for (let i = 0; i < 543 * 228; i++) {
        if (
          dec.pixels[i * 4] !== srcRgb[i * 3] ||
          dec.pixels[i * 4 + 1] !== srcRgb[i * 3 + 1] ||
          dec.pixels[i * 4 + 2] !== srcRgb[i * 3 + 2] ||
          dec.pixels[i * 4 + 3] !== srcAlpha[i]
        ) {
          diff++;
        }
      }
    }
    check(err === null && typeof dec !== 'string', 'zlib-valid corruption: structure + CRC + deflate all pass (structurally impeccable PNG)');
    check(diff === 0 ? false : diff > 0, `zlib-valid corruption: ONLY pixel-level compare vs source detects it (diff=${diff})`);
  }
}

console.log('\n=== no-image fixtures: 0 streams (byte-gate anchors) ===');
for (const f of ['epz_pptx_table_fixture.pdf', 'epz-report-variant2.pdf', 'Plik_D.pdf', 'test_d.pdf', 'test_e.pdf']) {
  const dd = await PDFDocument.load(readFileSync(resolve('test-real-pdfs', f)), { ignoreEncryption: true });
  let total = 0;
  for (let pi = 0; pi < dd.getPageCount(); pi++) total += (await collectPageImageStreams(dd, pi)).length;
  check(total === 0, `${f}: 0 image streams (${total})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
