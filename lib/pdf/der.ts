// A small DER/BER reader for the signature verifier (plan 2.9, 2026-11-28). Unlike node-forge's
// asn1 module it keeps the byte offsets of every element, so a signature can be checked over the
// exact bytes that were signed (the signed attributes, a certificate's "to be signed" part), not
// over a re-encoding of them. Indefinite lengths (BER, used by some signing programs) are read.

export interface Tlv {
  /** First identifier byte (class, constructed bit and the low tag number). */
  tag: number;
  /** Tag number (for high tag numbers the full number). */
  tagNo: number;
  /** 0 universal, 1 application, 2 context-specific, 3 private. */
  cls: number;
  constructed: boolean;
  start: number;
  contentStart: number;
  /** End of the content (for indefinite lengths, before the end-of-contents marker). */
  contentEnd: number;
  /** End of the whole element. */
  end: number;
  children: Tlv[];
}

export class DerError extends Error {}

function readOne(buf: Uint8Array, pos: number, limit: number, depth: number): Tlv {
  if (depth > 64) throw new DerError('nested too deep');
  const start = pos;
  if (pos >= limit) throw new DerError('unexpected end');
  const tag = buf[pos++]!;
  const cls = tag >> 6;
  const constructed = (tag & 0x20) !== 0;
  let tagNo = tag & 0x1f;
  if (tagNo === 0x1f) {
    tagNo = 0;
    for (;;) {
      if (pos >= limit) throw new DerError('unexpected end in tag');
      const b = buf[pos++]!;
      tagNo = tagNo * 128 + (b & 0x7f);
      if (!(b & 0x80)) break;
      if (tagNo > 0xffffff) throw new DerError('tag too large');
    }
  }
  if (pos >= limit) throw new DerError('unexpected end in length');
  const first = buf[pos++]!;
  const children: Tlv[] = [];
  if (first === 0x80) {
    if (!constructed) throw new DerError('indefinite length on a primitive');
    const contentStart = pos;
    for (;;) {
      if (pos + 1 >= limit) throw new DerError('missing end-of-contents');
      if (buf[pos] === 0 && buf[pos + 1] === 0) {
        return { tag, tagNo, cls, constructed, start, contentStart, contentEnd: pos, end: pos + 2, children };
      }
      const child = readOne(buf, pos, limit, depth + 1);
      children.push(child);
      pos = child.end;
    }
  }
  let len = first;
  if (first & 0x80) {
    const n = first & 0x7f;
    if (n > 4) throw new DerError('length too large');
    len = 0;
    for (let i = 0; i < n; i++) {
      if (pos >= limit) throw new DerError('unexpected end in length');
      len = len * 256 + buf[pos++]!;
    }
  }
  const contentStart = pos;
  const contentEnd = pos + len;
  if (contentEnd > limit) throw new DerError('length past the end');
  if (constructed) {
    let p = contentStart;
    while (p < contentEnd) {
      const child = readOne(buf, p, contentEnd, depth + 1);
      children.push(child);
      p = child.end;
    }
  }
  return { tag, tagNo, cls, constructed, start, contentStart, contentEnd, end: contentEnd, children };
}

/** Reads one element starting at `pos` (trailing bytes, e.g. the zero padding of /Contents, are ignored). */
export function parseDer(buf: Uint8Array, pos = 0): Tlv {
  return readOne(buf, pos, buf.length, 0);
}

/** The element's bytes, header included. */
export const raw = (buf: Uint8Array, t: Tlv) => buf.subarray(t.start, t.end);
/** The content bytes (for a constructed OCTET/BIT STRING, the joined pieces). */
export function content(buf: Uint8Array, t: Tlv): Uint8Array {
  if (!t.constructed) return buf.subarray(t.contentStart, t.contentEnd);
  const parts = t.children.map((c) => content(buf, c));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export const isSeq = (t: Tlv | undefined): t is Tlv => !!t && t.cls === 0 && t.tagNo === 16;
export const isCtx = (t: Tlv | undefined, n: number): t is Tlv => !!t && t.cls === 2 && t.tagNo === n;

export function oid(buf: Uint8Array, t: Tlv | undefined): string {
  if (!t || t.cls !== 0 || t.tagNo !== 6) throw new DerError('not an OID');
  const b = buf.subarray(t.contentStart, t.contentEnd);
  if (!b.length) throw new DerError('empty OID');
  const parts: number[] = [];
  let v = 0;
  for (const x of b) {
    v = v * 128 + (x & 0x7f);
    if (!(x & 0x80)) { parts.push(v); v = 0; }
  }
  const head = parts.shift()!;
  const a = head < 40 ? 0 : head < 80 ? 1 : 2;
  return [a, head - a * 40, ...parts].join('.');
}

/** An INTEGER's bytes without leading zero bytes (for comparing serial numbers). */
export function intBytes(buf: Uint8Array, t: Tlv): Uint8Array {
  let b = buf.subarray(t.contentStart, t.contentEnd);
  while (b.length > 1 && b[0] === 0) b = b.subarray(1);
  return b;
}

export function intValue(buf: Uint8Array, t: Tlv): number {
  let v = 0;
  for (const x of buf.subarray(t.contentStart, t.contentEnd)) v = v * 256 + x;
  return v;
}

/** UTCTime or GeneralizedTime as a Date (null when it is not a time). */
export function time(buf: Uint8Array, t: Tlv | undefined): Date | null {
  if (!t || t.cls !== 0 || (t.tagNo !== 23 && t.tagNo !== 24)) return null;
  const s = new TextDecoder('latin1').decode(buf.subarray(t.contentStart, t.contentEnd));
  const m = t.tagNo === 23
    ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?(Z|[+-]\d{4})$/.exec(s)
    : /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})?(\d{2})?(?:[.,](\d+))?(Z|[+-]\d{4})?$/.exec(s);
  if (!m) return null;
  let year = Number(m[1]);
  if (t.tagNo === 23) year += year < 50 ? 2000 : 1900;
  const frac = t.tagNo === 24 && m[7] ? Number(`0.${m[7]}`) * 1000 : 0;
  const zone = t.tagNo === 23 ? m[7] : m[8];
  let ms = Date.UTC(year, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5] ?? 0), Number(m[6] ?? 0)) + Math.round(frac);
  if (zone && zone !== 'Z') ms -= (zone[0] === '-' ? -1 : 1) * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3, 5))) * 60_000;
  return new Date(ms);
}

/** A directory string (UTF8String, PrintableString, IA5String, T61String, BMPString, UniversalString). */
export function text(buf: Uint8Array, t: Tlv): string {
  const b = content(buf, t);
  switch (t.tagNo) {
    case 30: { // BMPString: UTF-16BE
      let s = '';
      for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i]! << 8) | b[i + 1]!);
      return s;
    }
    case 28: { // UniversalString: UTF-32BE
      let s = '';
      for (let i = 0; i + 3 < b.length; i += 4) s += String.fromCodePoint(((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0);
      return s;
    }
    case 20: return new TextDecoder('latin1').decode(b); // T61String: treated as Latin-1
    default: return new TextDecoder('utf-8').decode(b);
  }
}

export const bytesEqual = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);
