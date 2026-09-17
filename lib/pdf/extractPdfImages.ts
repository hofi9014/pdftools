/**
 * C1 — raw image extraction from embedded PDF XObject streams (pdf-lib based, additive).
 *
 * C1 scope: DCTDecode → JPEG pass-through (the raw stream bytes ARE a JPEG).
 * C1b: FlateDecode → PNG wrapper. IHDR/tag ogniwo pochodzą z rzeczywistego dictu obrazu
 *   (ColorSpace/BitsPerComponent/wymiary — NIGDY sztywne RGB). PNG color type: 0 (gray),
 *   2 (RGB), 6 (RGBA gdy SMask). Predictor/Predictor-parametry z DecodeParms (1 → raw,
 *   10–15 → PNG filtering przez unfilterPng). SMask → kanał alfa (interleave), niespełnienie
 *   warunków → jawne warn + opaque fallback.
 *
 * Every unsupported case is an explicit skip/warn with console.warn — NEVER a wrong image.
 * Full limitation list: AGENTS.md (C1-images, 2026-09-06).
 */

import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFRawStream,
  PDFRef,
} from 'pdf-lib';
import { parseFilters, buildPageScaffold, initPdfjs, pdfjsDocOptions } from '../client-pdf';

export interface PdfColorSpaceInfo {
  kind: 'deviceGray' | 'deviceRGB' | 'deviceCMYK' | 'iccbased' | 'indexed' | 'other';
  components: number;
}

export interface PdfDecodeParms {
  predictor: number;
  colors: number;
  columns: number | null;
  bitsPerComponent: number | null;
}

export interface PdfSmaskMeta {
  width: number;
  height: number;
  bitsPerComponent: number;
  filters: string[];
  decodeParms: PdfDecodeParms | null;
  rawBytes: Uint8Array;
}

export interface PdfImageStreamMeta {
  name: string;
  filters: string[];
  width: number;
  height: number;
  bitsPerComponent: number;
  colorSpace: PdfColorSpaceInfo;
  decodeParms: PdfDecodeParms | null;
  smask: PdfSmaskMeta | null;
  rawBytes: Uint8Array;
}

export interface DecodedPdfImage {
  mime: 'image/jpeg' | 'image/png';
  data: Uint8Array;
}

function resolve(pdf: PDFDocument, o: PDFObject | undefined): PDFObject | undefined {
  let cur = o;
  while (cur instanceof PDFRef) {
    const next = pdf.context.lookup(cur);
    if (next === undefined || next === cur) return next;
    cur = next;
  }
  return cur;
}

function numOr(v: PDFObject | undefined, fallback: number): number {
  return v instanceof PDFNumber ? v.asNumber() : fallback;
}

// pdf-lib PDFName.asString() INCLUDES the leading slash (e.g. "/Image").
function nameOf(o: PDFObject | undefined): string {
  return o instanceof PDFName ? o.asString() : '';
}

function colorSpaceOf(pdf: PDFDocument, raw: PDFObject | undefined): PdfColorSpaceInfo {
  const o = resolve(pdf, raw);
  if (o instanceof PDFName) {
    switch (o.asString()) {
      case '/DeviceGray':
      case '/CalGray':
      case '/G':
        return { kind: 'deviceGray', components: 1 };
      case '/DeviceRGB':
      case '/CalRGB':
      case '/RGB':
        return { kind: 'deviceRGB', components: 3 };
      case '/DeviceCMYK':
      case '/CMYK':
        return { kind: 'deviceCMYK', components: 4 };
      default:
        return { kind: 'other', components: 0 };
    }
  }
  if (o instanceof PDFArray) {
    const head = nameOf(o.get(0));
    if (head === '/ICCBased') {
      const stream = resolve(pdf, o.get(1));
      const n = stream instanceof PDFRawStream ? numOr(stream.dict.get(PDFName.of('N')), 0) : 0;
      return { kind: 'iccbased', components: n };
    }
    if (head === '/Indexed') return { kind: 'indexed', components: 1 };
    if (head === '/CalGray') return { kind: 'deviceGray', components: 1 };
    if (head === '/CalRGB') return { kind: 'deviceRGB', components: 3 };
    if (head === '/Lab') return { kind: 'other', components: 3 };
  }
  return { kind: 'other', components: 0 };
}

function decodeParmsOf(pdf: PDFDocument, raw: PDFObject | undefined): PdfDecodeParms | null {
  const o = resolve(pdf, raw);
  if (!(o instanceof PDFDict)) return null;
  return {
    predictor: numOr(o.get(PDFName.of('Predictor')), 1),
    colors: numOr(o.get(PDFName.of('Colors')), 1),
    columns: o.has(PDFName.of('Columns')) ? numOr(o.get(PDFName.of('Columns')), 0) : null,
    bitsPerComponent: o.has(PDFName.of('BitsPerComponent'))
      ? numOr(o.get(PDFName.of('BitsPerComponent')), 8)
      : null,
  };
}

function smaskMetaOf(pdf: PDFDocument, raw: PDFObject | undefined): PdfSmaskMeta | null {
  const o = resolve(pdf, raw);
  if (!(o instanceof PDFRawStream)) return null;
  return {
    width: numOr(o.dict.get(PDFName.of('Width')), 0),
    height: numOr(o.dict.get(PDFName.of('Height')), 0),
    bitsPerComponent: numOr(o.dict.get(PDFName.of('BitsPerComponent')), 8),
    filters: parseFilters(o.dict.get(PDFName.of('Filter'))),
    decodeParms: decodeParmsOf(pdf, o.dict.get(PDFName.of('DecodeParms'))),
    rawBytes: new Uint8Array(o.contents), // offset-0 copy (Buffer.slice() shares the pool buffer)
  };
}

export async function collectPageImageStreams(
  pdf: PDFDocument,
  pageIndex: number,
): Promise<PdfImageStreamMeta[]> {
  const resources = pdf.getPage(pageIndex).node.Resources();
  if (!resources) return [];
  const xo = resolve(pdf, resources.get(PDFName.of('XObject')));
  if (!(xo instanceof PDFDict)) return [];

  const out: PdfImageStreamMeta[] = [];
  for (const [key, val] of xo.entries()) {
    const stream = resolve(pdf, val);
    if (!(stream instanceof PDFRawStream)) continue;
    if (nameOf(stream.dict.get(PDFName.of('Subtype'))) !== '/Image') continue;

    const maskRaw = stream.dict.get(PDFName.of('ImageMask'));
    if (maskRaw !== undefined && String(maskRaw) === 'true') {
      console.warn(`[extractPdfImages] skip ${key.asString()}: ImageMask stencil (1-bit) — v1 limitation`);
      continue;
    }

    const width = numOr(stream.dict.get(PDFName.of('Width')), 0);
    const height = numOr(stream.dict.get(PDFName.of('Height')), 0);
    if (width <= 0 || height <= 0) {
      console.warn(`[extractPdfImages] skip ${key.asString()}: missing/invalid Width×Height`);
      continue;
    }

    out.push({
      name: key.asString().replace(/^\//, ''),
      filters: parseFilters(stream.dict.get(PDFName.of('Filter'))),
      width,
      height,
      bitsPerComponent: numOr(stream.dict.get(PDFName.of('BitsPerComponent')), 8),
      colorSpace: colorSpaceOf(pdf, stream.dict.get(PDFName.of('ColorSpace'))),
      decodeParms: decodeParmsOf(pdf, stream.dict.get(PDFName.of('DecodeParms'))),
      smask: smaskMetaOf(pdf, stream.dict.get(PDFName.of('SMask'))),
      rawBytes: new Uint8Array(stream.contents), // offset-0 copy (Buffer.slice() shares the pool buffer)
    });
  }
  return out;
}

// === FlateDecode → PNG wrapper (C1b) ===

// Port 1:1 z lib/pdf-engine.ts (martwy kod, l.174-202) — cofanie filtrowania PNG (Predictor 10-15).
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilterPng(data: Uint8Array, width: number, height: number, channels: number): Uint8Array {
  const stride = width * channels;
  const result = new Uint8Array(height * stride);
  let srcOff = 0;
  let dstOff = 0;
  for (let y = 0; y < height; y++) {
    const filterType = data[srcOff++];
    const row = data.subarray(srcOff, srcOff + stride);
    srcOff += stride;
    const prevOff = dstOff - stride;
    // Safe: x < stride === row.length by the loop bound; dstOff/prevOff + x(-channels) always
    // lands on an already-written earlier position in `result` (or is skipped via the x>=channels /
    // y>0 guards), never past what has been written so far.
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? result[dstOff + x - channels]! : 0;
      const b = y > 0 ? result[prevOff + x]! : 0;
      const c = y > 0 && x >= channels ? result[prevOff + x - channels]! : 0;
      let raw: number;
      switch (filterType) {
        case 0:
          raw = row[x]!;
          break;
        case 1:
          raw = (row[x]! + a) & 0xff;
          break;
        case 2:
          raw = (row[x]! + b) & 0xff;
          break;
        case 3:
          raw = (row[x]! + Math.floor((a + b) / 2)) & 0xff;
          break;
        case 4:
          raw = (row[x]! + paeth(a, b, c)) & 0xff;
          break;
        default:
          raw = row[x]!;
      }
      result[dstOff + x] = raw;
    }
    dstOff += stride;
  }
  return result;
}

type PakoLike = {
  inflate(data: Uint8Array): Uint8Array;
  deflate(data: Uint8Array, opts?: { level?: number }): Uint8Array;
};

async function loadPako(): Promise<PakoLike> {
  const mod = (await import('pako')) as unknown as { default: PakoLike };
  return mod.default;
}

// Dekoduj bajty pikseli FlateDecode (inflate + Predictor z DecodeParms). Weryfikacja rozmiaru
// jest surowa: pred=1 → w*h*components; pred=10..15 → h*(stride*colors+1) potem unfilter.
async function decodeFlatePixels(
  name: string,
  width: number,
  height: number,
  rawBytes: Uint8Array,
  dp: PdfDecodeParms | null,
  components: number,
  pako: PakoLike,
  warnPrefix: string,
): Promise<{ pixels: Uint8Array; channels: number } | null> {
  const predictor = dp?.predictor ?? 1;
  if (predictor === 2 || (predictor >= 3 && predictor <= 9)) {
    console.warn(`${warnPrefix} skip ${name}: Predictor=${predictor} — TIFF/legacy predictors are a v1 limitation (AGENTS.md)`);
    return null;
  }
  if (dp?.bitsPerComponent != null && dp.bitsPerComponent !== 8) {
    console.warn(`${warnPrefix} skip ${name}: DecodeParms BitsPerComponent=${dp.bitsPerComponent} != 8 — v1 limitation`);
    return null;
  }

  let infl: Uint8Array;
  try {
    infl = new Uint8Array(pako.inflate(rawBytes));
  } catch (e) {
    console.warn(`${warnPrefix} skip ${name}: FlateDecode inflate failed (${(e as Error).message})`);
    return null;
  }

  if (predictor === 1) {
    const channels = components;
    if (infl.length !== width * height * channels) {
      console.warn(
        `${warnPrefix} skip ${name}: inflated ${infl.length} B != ${width}x${height}x${channels} (Predictor=1 raw)`,
      );
      return null;
    }
    return { pixels: infl, channels };
  }

  const channels = dp?.colors ?? 1;
  const stride = dp?.columns ?? width;
  const rowBytes = stride * channels;
  if (stride !== width) {
    console.warn(`${warnPrefix} skip ${name}: DecodeParms Columns=${stride} != Width=${width} — unsupported`);
    return null;
  }
  if (infl.length !== height * (rowBytes + 1)) {
    console.warn(
      `${warnPrefix} skip ${name}: inflated ${infl.length} B != ${height}x(${rowBytes}+1) (Predictor=${predictor})`,
    );
    return null;
  }
  return { pixels: unfilterPng(infl, stride, height, channels), channels };
}

// SMask: obraz grayscale 1-kanałowy. Zwraca kanał alfa (w*h) albo null + warn (opaque fallback).
async function decodeSmaskAlpha(
  meta: PdfImageStreamMeta,
  pako: PakoLike,
): Promise<Uint8Array | null> {
  const s = meta.smask;
  if (!s) return null;
  if (s.bitsPerComponent !== 8) {
    console.warn(
      `[extractPdfImages] warn ${meta.name}: SMask BitsPerComponent=${s.bitsPerComponent} != 8 (stream dict) — alpha ignored (opaque fallback)`,
    );
    return null;
  }
  if (s.width !== meta.width || s.height !== meta.height) {
    console.warn(
      `[extractPdfImages] warn ${meta.name}: SMask ${s.width}x${s.height} != ${meta.width}x${meta.height} — alpha ignored (opaque fallback)`,
    );
    return null;
  }
  if (s.filters.length !== 1 || s.filters[0] !== '/FlateDecode') {
    console.warn(
      `[extractPdfImages] warn ${meta.name}: SMask filters [${s.filters.join('+')}] != FlateDecode — alpha ignored (opaque fallback)`,
    );
    return null;
  }
  const dec = await decodeFlatePixels(
    `${meta.name}.smask`,
    meta.width,
    meta.height,
    s.rawBytes,
    s.decodeParms,
    1,
    pako,
    '[extractPdfImages]',
  );
  if (!dec) {
    console.warn(`[extractPdfImages] warn ${meta.name}: SMask undecodable — alpha ignored (opaque fallback)`);
    return null;
  }
  return new Uint8Array(dec.pixels);
}

// === Minimalny writer PNG (czysto addytywny, bez zależności) ===
const PNG_SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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
  // Safe: i < buf.length by the loop bound; crcTable is a fixed 256-entry table indexed by
  // an 8-bit mask (& 0xff), always in range; crcTable itself is populated just above.
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const enc = new TextEncoder();
  const t = enc.encode(type);
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set(t, 4);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function buildPng(width: number, height: number, channelsOut: 1 | 3 | 4, pixels: Uint8Array, pako: PakoLike): Uint8Array {
  const bpp = width * channelsOut;
  const scan = new Uint8Array(height * (bpp + 1));
  for (let y = 0; y < height; y++) {
    scan[y * (bpp + 1)] = 0; // filter type: None
    scan.set(pixels.subarray(y * bpp, (y + 1) * bpp), y * (bpp + 1) + 1);
  }
  const idat = new Uint8Array(pako.deflate(scan, { level: 9 }));

  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = channelsOut === 4 ? 6 : channelsOut === 1 ? 0 : 2; // color type (RGBA/RGB/gray)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace

  const parts = [PNG_SIG, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

async function decodeFlateToPng(meta: PdfImageStreamMeta): Promise<DecodedPdfImage | null> {
  const { width: w, height: h } = meta;
  const cs = meta.colorSpace;

  if (cs.kind === 'indexed') {
    console.warn(`[extractPdfImages] skip ${meta.name}: indexed ColorSpace — v1 limitation (AGENTS.md)`);
    return null;
  }
  if (cs.kind === 'deviceCMYK') {
    console.warn(`[extractPdfImages] skip ${meta.name}: CMYK ColorSpace — v1 limitation (AGENTS.md)`);
    return null;
  }
  if (cs.components !== 1 && cs.components !== 3) {
    console.warn(`[extractPdfImages] skip ${meta.name}: ColorSpace kind=${cs.kind} components=${cs.components} — not gray/RGB (v1)`);
    return null;
  }
  if (meta.bitsPerComponent !== 8) {
    console.warn(`[extractPdfImages] skip ${meta.name}: BitsPerComponent=${meta.bitsPerComponent} != 8 — v1 limitation (AGENTS.md)`);
    return null;
  }

  const pako = await loadPako();
  const dec = await decodeFlatePixels(
    meta.name,
    w,
    h,
    meta.rawBytes,
    meta.decodeParms,
    cs.components,
    pako,
    '[extractPdfImages]',
  );
  if (!dec) return null;

  const alpha = await decodeSmaskAlpha(meta, pako);

  if (alpha) {
    const rgba = new Uint8Array(w * h * 4);
    // Safe: i < w*h by the loop bound; dec.pixels is exactly w*h*channels long (decoded above),
    // and alpha is exactly w*h long (decodeSmaskAlpha), so every index here is in range.
    for (let i = 0; i < w * h; i++) {
      if (dec.channels === 3) {
        rgba[i * 4] = dec.pixels[i * 3]!;
        rgba[i * 4 + 1] = dec.pixels[i * 3 + 1]!;
        rgba[i * 4 + 2] = dec.pixels[i * 3 + 2]!;
      } else {
        const v = dec.pixels[i]!;
        rgba[i * 4] = v;
        rgba[i * 4 + 1] = v;
        rgba[i * 4 + 2] = v;
      }
      rgba[i * 4 + 3] = alpha[i]!;
    }
    return { mime: 'image/png', data: buildPng(w, h, 4, rgba, pako) };
  }

  return { mime: 'image/png', data: buildPng(w, h, dec.channels === 1 ? 1 : 3, dec.pixels, pako) };
}

export async function decodePdfImage(meta: PdfImageStreamMeta): Promise<DecodedPdfImage | null> {
  if (meta.filters.length !== 1) {
    console.warn(
      `[extractPdfImages] skip ${meta.name}: multi-filter chain ${meta.filters.join('+')} — v1 limitation (AGENTS.md)`,
    );
    return null;
  }

  const [filter] = meta.filters;
  if (filter === '/DCTDecode') {
    const b = meta.rawBytes;
    if (b.length < 4 || !(b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)) {
      console.warn(`[extractPdfImages] skip ${meta.name}: DCTDecode stream has no JPEG SOI magic — not a native JPEG`);
      return null;
    }
    return { mime: 'image/jpeg', data: b };
  }

  if (filter === '/FlateDecode') return decodeFlateToPng(meta);

  console.warn(
    `[extractPdfImages] skip ${meta.name}: unsupported filter ${filter} — CCITT/JBIG2/JPX are v1 limitations (AGENTS.md)`,
  );
  return null;
}

// === C2 — painted-id → stream join + byte dedupe ===

export interface PdfImageJoinWarning {
  page: number;
  kind: 'ambiguous-dims' | 'unmatched-painted' | 'undecodable';
  detail: string;
}

export interface PdfJoinedImage {
  imageId: string;
  page: number;
  width: number;
  height: number;
  mime: 'image/jpeg' | 'image/png';
  data: Uint8Array;
  dedupeKey: string;
  sourceStream: string;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface PdfImageMap {
  images: Map<string, PdfJoinedImage>;
  uniqueCopies: number;
  warnings: PdfImageJoinWarning[];
}

// Deterministic 32-bit FNV-1a over bytes → hex string. Used only as a dedupe
// key for identical raw stream bytes; matching itself is dims-exact, never a hash.
function fnv1aHex(b: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) {
    h ^= b[i]!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * C2 — join painted images (pdf.js operator list, via buildPageScaffold) to the
 * underlying PDF stream (pdf-lib, via collectPageImageStreams) per page, keyed by
 * physical dims (natW×natH from pdf.js == Width×Height from the pdf-lib dict).
 *
 * Rules (never a wrong image):
 *  - unique dims pair on a page → the painted image embeds that stream;
 *  - two+ streams with the same dims on the page → AMBIGUOUS → skip + warn;
 *  - painted image with no candidate stream (e.g. image inside a Form XObject,
 *    only visible to pdf.js) → skip + warn;
 *  - stream undecodable under C1/C1b rules → skip + warn.
 *
 * Byte dedupe: identical raw stream bytes (e.g. the same logo on many pages)
 * share one dedupeKey and one decoded copy — writers embed the copy once and
 * reuse it, they never re-embed per painted reference.
 *
 * @param file  the source PDF
 * @param pages 1-based page numbers to join (empty → all pages)
 */
export async function buildPdfImageMap(file: File, pages: number[]): Promise<PdfImageMap> {
  await initPdfjs();
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  // pdf.js may transfer/detach the ArrayBuffer it is handed, so it gets its own copy.
  const pdfjsLib = await import('pdfjs-dist');
  const OPS = pdfjsLib.OPS;
  const doc = await pdfjsLib
    .getDocument(pdfjsDocOptions(new Uint8Array(buf.slice(0))))
    .promise;

  const wanted = pages && pages.length > 0 ? pages : Array.from({ length: doc.numPages }, (_, i) => i + 1);
  const knownPages = new Set(wanted.filter(p => p >= 1 && p <= doc.numPages));

  const images = new Map<string, PdfJoinedImage>();
  const warnings: PdfImageJoinWarning[] = [];

  // Byte-dedupe store: dedupeKey → { bytes, decoded copy }. Same key reuses the same copy.
  const dedupeCache = new Map<string, { bytes: Uint8Array; mime: 'image/jpeg' | 'image/png'; data: Uint8Array }>();

  for (const p of [...knownPages].sort((a, b) => a - b)) {
    const page = await doc.getPage(p);
    const opList = await page.getOperatorList();
    const scaffold = buildPageScaffold(
      { fnArray: opList.fnArray, argsArray: opList.argsArray },
      OPS,
    );
    const metas = await collectPageImageStreams(pdf, p - 1);

    // Group streams by dims; pages may hold multiple streams with the same dims.
    const byDims = new Map<string, PdfImageStreamMeta[]>();
    for (const m of metas) {
      const key = `${m.width}x${m.height}`;
      const arr = byDims.get(key);
      if (arr) arr.push(m);
      else byDims.set(key, [m]);
    }

    for (const painted of scaffold.images) {
      const dimKey = `${painted.natW}x${painted.natH}`;
      const candidates = byDims.get(dimKey);
      if (!candidates || candidates.length === 0) {
        warnings.push({
          page: p,
          kind: 'unmatched-painted',
          detail: `painted image ${painted.imageId} ${dimKey} has no stream on page ${p} — likely inside a Form XObject (v1)`,
        });
        continue;
      }
      if (candidates.length > 1) {
        warnings.push({
          page: p,
          kind: 'ambiguous-dims',
          detail: `painted image ${painted.imageId} ${dimKey} matches ${candidates.length} streams (${candidates.map(c => c.name).join(', ')}) — skipped, never a wrong image`,
        });
        continue;
      }
      // Safe: candidates.length === 0 and > 1 are already handled (continue) above.
      const stream = candidates[0]!;
      const dedupe = fnv1aHex(stream.rawBytes);
      let copy = dedupeCache.get(dedupe);
      if (copy && !bytesEqual(copy.bytes, stream.rawBytes)) copy = undefined; // astronomically unlikely FNV collision guard
      if (!copy) {
        const dec = await decodePdfImage(stream);
        if (!dec) {
          warnings.push({ page: p, kind: 'undecodable', detail: `stream ${stream.name} ${dimKey} under C1/C1b rules` });
          continue;
        }
        copy = { bytes: stream.rawBytes, mime: dec.mime, data: dec.data };
        dedupeCache.set(dedupe, copy);
      }
      images.set(painted.imageId, {
        imageId: painted.imageId,
        page: p,
        width: stream.width,
        height: stream.height,
        mime: copy.mime,
        data: copy.data,
        dedupeKey: dedupe,
        sourceStream: stream.name,
        bounds: { ...painted.bounds },
      });
    }
  }

  await doc.cleanup();
  return { images, uniqueCopies: dedupeCache.size, warnings };
}
