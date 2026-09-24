// Test-only AES-128 (V=4/R=4) PDF writer built straight from ISO 32000-1 §7.6 (Algorithms 1, 2,
// 3, 5). Shared by tests/unlock-aes128.mts and e2e/unlock-aes128-ui.mts. Its output is validated
// by pdf.js (an independent implementation) in the unit test before anything relies on it.
import { md5, RC4 } from '@pdfsmaller/pdf-decrypt';
import { PDFDocument, PDFHexString, PDFRawStream, PDFDict, StandardFonts, type PDFRef } from 'pdf-lib';

const PAD = new Uint8Array([
  0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41, 0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
  0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80, 0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A,
]);
const cat = (...a: Uint8Array[]): Uint8Array => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };
const pad32 = (s: string): Uint8Array => { const b = new TextEncoder().encode(s).slice(0, 32); return cat(b, PAD.slice(0, 32 - b.length)); };
const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

export const TEXT = 'Secret AES128 content';
export const TITLE = 'Tytul dokumentu';

export async function buildEncrypted(userPw: string, ownerPw: string, opts: { encryptMetadata?: boolean } = {}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([300, 200]).drawText(TEXT, { x: 30, y: 100, size: 14, font });
  const ctx = pdf.context;

  const id0 = crypto.getRandomValues(new Uint8Array(16));
  const P = -44; // print + copy allowed, standard value
  const encMeta = opts.encryptMetadata !== false;
  const keyLen = 16;

  // Algorithm 3 — /O
  let oh = md5(pad32(ownerPw || userPw));
  for (let i = 0; i < 50; i++) oh = md5(oh);
  const okey = oh.slice(0, keyLen);
  let O = new RC4(okey).process(pad32(userPw));
  for (let i = 1; i <= 19; i++) O = new RC4(okey.map((b) => b ^ i)).process(O);

  // Algorithm 2 — file key
  const pBytes = Uint8Array.of(P & 255, (P >> 8) & 255, (P >> 16) & 255, (P >> 24) & 255);
  let fk = md5(cat(pad32(userPw), O, pBytes, id0, encMeta ? new Uint8Array(0) : Uint8Array.of(255, 255, 255, 255)));
  for (let i = 0; i < 50; i++) fk = md5(fk.slice(0, keyLen));
  const key = fk.slice(0, keyLen);

  // Algorithm 5 — /U
  let U = new RC4(key).process(md5(cat(PAD, id0)));
  for (let i = 1; i <= 19; i++) U = new RC4(key.map((b) => b ^ i)).process(U);
  U = cat(U, new Uint8Array(16));

  const enc = async (data: Uint8Array, ref: PDFRef): Promise<Uint8Array> => {
    const n = ref.objectNumber, g = ref.generationNumber;
    const ok = md5(cat(key, Uint8Array.of(n & 255, (n >> 8) & 255, (n >> 16) & 255, g & 255, (g >> 8) & 255, 0x73, 0x41, 0x6c, 0x54))).slice(0, 16);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const ck = await crypto.subtle.importKey('raw', ok as BufferSource, 'AES-CBC', false, ['encrypt']);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: iv as BufferSource }, ck, data as BufferSource));
    return cat(iv, ct);
  };

  // Title lives in an Info dictionary string — exercises the string path.
  if (ctx.trailerInfo.Info) ctx.delete(ctx.trailerInfo.Info as PDFRef); // pdf-lib's own Info dict (plaintext strings)
  ctx.trailerInfo.Info = undefined;
  const infoRef = ctx.nextRef();
  ctx.assign(infoRef, ctx.obj({ Title: PDFHexString.of(hex(await enc(new TextEncoder().encode(TITLE), infoRef))) }));
  ctx.trailerInfo.Info = infoRef;

  for (const [ref, obj] of Array.from(ctx.enumerateIndirectObjects())) {
    const stream = obj as unknown as { dict?: PDFDict; getContents?: () => Uint8Array };
    if (typeof stream.getContents !== 'function' || !stream.dict) continue;
    const raw = PDFRawStream.of(stream.dict, await enc(stream.getContents(), ref));
    ctx.assign(ref, raw);
  }

  const encRef = ctx.register(ctx.obj({
    Filter: 'Standard', V: 4, R: 4, Length: 128, P,
    O: PDFHexString.of(hex(O)), U: PDFHexString.of(hex(U)),
    CF: { StdCF: { CFM: 'AESV2', AuthEvent: 'DocOpen', Length: 16 } },
    StmF: 'StdCF', StrF: 'StdCF',
    ...(encMeta ? {} : { EncryptMetadata: false }),
  }));
  ctx.trailerInfo.Encrypt = encRef;
  ctx.trailerInfo.ID = ctx.obj([PDFHexString.of(hex(id0)), PDFHexString.of(hex(id0))]);
  return pdf.save({ useObjectStreams: false });
}

