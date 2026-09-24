// Standard security handler V=4 / R=4 decryption (PDF 1.6, Acrobat 7+ "128-bit AES" — the most
// common encryption on real-world PDFs). @pdfsmaller/pdf-decrypt covers RC4 (V1-2) and AES-256
// (V5) but throws "Unsupported encryption: V=4" for this one, so unlockPdfClient falls back here.
//
// Algorithms per ISO 32000-1 §7.6: Algorithm 2 (file key), 5 (user password check), 7 (owner
// password → user password), 1 (per-object key; AES appends "sAlT"). Crypt filters: /StmF and
// /StrF may each name /StdCF with /CFM /AESV2 (AES-128-CBC, 16-byte IV prefix, PKCS#7) or /V2
// (RC4) or /Identity (left alone). md5/RC4 come from the already-bundled decrypt library.
import { md5, RC4 } from '@pdfsmaller/pdf-decrypt';
import {
  PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFHexString, PDFRawStream, PDFRef, PDFNumber,
  type PDFObject,
} from 'pdf-lib';

export type PdfUnlockErrorCode = 'wrong-password' | 'not-encrypted' | 'unsupported' | 'failed';

export class PdfUnlockError extends Error {
  constructor(public readonly code: PdfUnlockErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'PdfUnlockError';
  }
}

const PADDING = new Uint8Array([
  0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41, 0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
  0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80, 0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A,
]);

type Cipher = 'aes' | 'rc4' | 'identity';

interface V4Params {
  o: Uint8Array;
  u: Uint8Array;
  p: number;
  id0: Uint8Array;
  encryptMetadata: boolean;
  keyLen: number;
  stm: Cipher;
  str: Cipher;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, a) => n + a.length, 0));
  let off = 0;
  for (const a of parts) { out.set(a, off); off += a.length; }
  return out;
}

function padPassword(pw: string): Uint8Array {
  // PDFDocEncoding for ASCII/Latin-1 passwords; anything above U+00FF cannot be represented and
  // is truncated to its low byte exactly like most writers do.
  const bytes = Uint8Array.from(Array.from(pw, (c) => c.charCodeAt(0) & 0xff));
  const out = new Uint8Array(32);
  out.set(bytes.subarray(0, 32));
  if (bytes.length < 32) out.set(PADDING.subarray(0, 32 - bytes.length), bytes.length);
  return out;
}

function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function xorKey(key: Uint8Array, i: number): Uint8Array {
  return key.map((b) => b ^ i);
}

function fileKey(pw: Uint8Array, prm: V4Params): Uint8Array {
  const p = prm.p >>> 0;
  const parts = [pw, prm.o, Uint8Array.of(p & 255, (p >> 8) & 255, (p >> 16) & 255, (p >>> 24) & 255), prm.id0];
  if (!prm.encryptMetadata) parts.push(Uint8Array.of(255, 255, 255, 255));
  let h = md5(concat(...parts));
  for (let i = 0; i < 50; i++) h = md5(h.subarray(0, prm.keyLen));
  return h.slice(0, prm.keyLen);
}

function userKeyMatches(key: Uint8Array, prm: V4Params): boolean {
  let r = new RC4(key).process(md5(concat(PADDING, prm.id0)));
  for (let i = 1; i <= 19; i++) r = new RC4(xorKey(key, i)).process(r);
  return equal(r.subarray(0, 16), prm.u.subarray(0, 16));
}

/** Returns the file key if `password` is the user password OR the owner password. */
export function deriveFileKey(password: string, prm: V4Params): Uint8Array | null {
  const asUser = fileKey(padPassword(password), prm);
  if (userKeyMatches(asUser, prm)) return asUser;
  // Algorithm 7: recover the user password from /O using the owner password.
  let h = md5(padPassword(password));
  for (let i = 0; i < 50; i++) h = md5(h);
  const ownerKey = h.slice(0, prm.keyLen);
  let userPw: Uint8Array = prm.o.slice(0, 32);
  for (let i = 19; i >= 0; i--) userPw = new RC4(xorKey(ownerKey, i)).process(userPw);
  const viaOwner = fileKey(userPw, prm);
  return userKeyMatches(viaOwner, prm) ? viaOwner : null;
}

function objectKey(key: Uint8Array, num: number, gen: number, cipher: Cipher): Uint8Array {
  const tail = [num & 255, (num >> 8) & 255, (num >> 16) & 255, gen & 255, (gen >> 8) & 255];
  const salt = cipher === 'aes' ? [0x73, 0x41, 0x6c, 0x54] : [];
  return md5(concat(key, Uint8Array.from([...tail, ...salt]))).slice(0, Math.min(key.length + 5, 16));
}

async function decryptBlob(data: Uint8Array, key: Uint8Array, num: number, gen: number, cipher: Cipher): Promise<Uint8Array> {
  if (cipher === 'identity') return data;
  const k = objectKey(key, num, gen, cipher);
  if (cipher === 'rc4') return new RC4(k).process(data);
  // With a verified password a blob that is not IV + whole AES blocks was never encrypted (e.g. an
  // unreferenced leftover object) — keep it as-is rather than failing the whole document.
  if (data.length < 32 || (data.length - 16) % 16 !== 0) return data;
  try {
    const ck = await crypto.subtle.importKey('raw', k as BufferSource, 'AES-CBC', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: data.slice(0, 16) as BufferSource }, ck, data.slice(16) as BufferSource);
    return new Uint8Array(plain);
  } catch {
    return data;
  }
}

function filterCipher(dict: PDFDict, name: string | undefined): Cipher {
  if (!name || name === 'Identity') return 'identity';
  const cf = dict.lookup(PDFName.of('CF'));
  const entry = cf instanceof PDFDict ? cf.lookup(PDFName.of(name)) : undefined;
  const cfm = entry instanceof PDFDict ? entry.lookup(PDFName.of('CFM')) : undefined;
  const v = cfm ? cfm.toString() : '';
  if (v === '/AESV2') return 'aes';
  if (v === '/V2') return 'rc4';
  if (v === '/None') return 'identity';
  throw new PdfUnlockError('unsupported', `crypt filter ${v || name}`);
}

function bytesOf(o: PDFObject | undefined): Uint8Array | null {
  return o instanceof PDFString || o instanceof PDFHexString ? o.asBytes() : null;
}

function nameOf(o: PDFObject | undefined): string | undefined {
  return o instanceof PDFName ? o.decodeText() : undefined;
}

function readParams(pdf: PDFDocument): { prm: V4Params; encryptRef: PDFRef | null } | null {
  const trailer = pdf.context.trailerInfo;
  const encRaw = trailer.Encrypt;
  if (!encRaw) return null;
  const enc = pdf.context.lookup(encRaw) as PDFObject | undefined;
  if (!(enc instanceof PDFDict)) return null;
  const num = (n: string): number => {
    const v = enc.lookup(PDFName.of(n));
    return v instanceof PDFNumber ? v.asNumber() : 0;
  };
  const V = num('V');
  const R = num('R');
  if (V !== 4 || R !== 4) throw new PdfUnlockError('unsupported', `V=${V} R=${R}`);
  const o = bytesOf(enc.lookup(PDFName.of('O')));
  const u = bytesOf(enc.lookup(PDFName.of('U')));
  if (!o || !u) throw new PdfUnlockError('failed', 'missing /O or /U');
  const idArr = trailer.ID;
  const id0 = idArr instanceof PDFArray ? bytesOf(idArr.lookup(0)) ?? new Uint8Array(0) : new Uint8Array(0);
  const em = enc.lookup(PDFName.of('EncryptMetadata'));
  const cfLen = (() => {
    const cf = enc.lookup(PDFName.of('CF'));
    const std = cf instanceof PDFDict ? cf.lookup(PDFName.of('StdCF')) : undefined;
    const l = std instanceof PDFDict ? std.lookup(PDFName.of('Length')) : undefined;
    return l instanceof PDFNumber ? l.asNumber() : 16; // CF /Length is in bytes here, 16 = AES-128
  })();
  return {
    prm: {
      o, u, p: num('P'), id0,
      encryptMetadata: !(em && em.toString() === 'false'),
      keyLen: cfLen === 16 || cfLen === 128 ? 16 : Math.min(16, Math.max(5, cfLen)),
      stm: filterCipher(enc, nameOf(enc.lookup(PDFName.of('StmF')))),
      str: filterCipher(enc, nameOf(enc.lookup(PDFName.of('StrF')))),
    },
    encryptRef: encRaw instanceof PDFRef ? encRaw : null,
  };
}

async function decryptStrings(obj: PDFObject | undefined, key: Uint8Array, num: number, gen: number, cipher: Cipher): Promise<void> {
  if (cipher === 'identity') return;
  const fix = async (child: PDFObject | undefined): Promise<PDFObject | undefined> => {
    const b = bytesOf(child);
    if (b) return PDFHexString.of(Array.from(await decryptBlob(b, key, num, gen, cipher), (x) => x.toString(16).padStart(2, '0')).join(''));
    await decryptStrings(child, key, num, gen, cipher);
    return undefined;
  };
  if (obj instanceof PDFDict) {
    for (const [k, v] of obj.entries()) {
      const name = k.decodeText();
      if (name === 'Length' || name === 'Filter' || name === 'DecodeParms') continue;
      const rep = await fix(v);
      if (rep) obj.set(k, rep);
    }
  } else if (obj instanceof PDFArray) {
    for (let i = 0; i < obj.size(); i++) {
      const rep = await fix(obj.get(i));
      if (rep) obj.set(i, rep);
    }
  }
}

export function isV4Encrypted(pdf: PDFDocument): boolean {
  const enc = pdf.context.trailerInfo.Encrypt;
  const d = enc ? (pdf.context.lookup(enc) as PDFObject | undefined) : undefined;
  return d instanceof PDFDict && d.lookup(PDFName.of('V')) instanceof PDFNumber && (d.lookup(PDFName.of('V')) as PDFNumber).asNumber() === 4;
}

export async function decryptV4Pdf(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch (e) {
    throw new PdfUnlockError('failed', e instanceof Error ? e.message : String(e));
  }
  const parsed = readParams(pdf);
  if (!parsed) throw new PdfUnlockError('not-encrypted');
  const { prm, encryptRef } = parsed;
  const key = deriveFileKey(password, prm);
  if (!key) throw new PdfUnlockError('wrong-password');

  for (const [ref, obj] of pdf.context.enumerateIndirectObjects()) {
    if (encryptRef && ref.objectNumber === encryptRef.objectNumber) continue;
    const num = ref.objectNumber;
    const gen = ref.generationNumber || 0;
    const dict = obj instanceof PDFRawStream ? obj.dict : obj instanceof PDFDict ? obj : null;
    const type = dict ? dict.lookup(PDFName.of('Type'))?.toString() : undefined;
    if (type === '/Sig' || type === '/XRef') continue;
    if (obj instanceof PDFRawStream) {
      let stmCipher = prm.stm;
      if (type === '/Metadata' && !prm.encryptMetadata) stmCipher = 'identity';
      const filt = obj.dict.lookup(PDFName.of('Filter'));
      const hasCrypt = (filt instanceof PDFArray ? filt.asArray() : [filt]).some((f) => f instanceof PDFName && f.decodeText() === 'Crypt');
      if (hasCrypt) stmCipher = 'identity';
      if (stmCipher !== 'identity') {
        (obj as unknown as { contents: Uint8Array }).contents = await decryptBlob(obj.contents, key, num, gen, stmCipher);
      }
      await decryptStrings(obj.dict, key, num, gen, prm.str);
    } else {
      await decryptStrings(obj, key, num, gen, prm.str);
    }
  }

  delete (pdf.context.trailerInfo as { Encrypt?: unknown }).Encrypt;
  if (encryptRef) pdf.context.delete(encryptRef);
  return pdf.save({ useObjectStreams: false });
}
