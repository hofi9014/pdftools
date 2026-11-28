// "Verify PDF signature" (plan 2.9, 2026-11-28): checks the digital signatures in a PDF entirely
// in the browser (or in Node — only Web Crypto and pdf-lib are used).
//
// For every signature it answers the questions that can be answered from the file alone:
//   * Integrity — is the signed part of the file unchanged? The bytes named by /ByteRange are
//     hashed and compared with the digest inside the signature (the messageDigest attribute).
//   * The signature value — does it match the public key of the certificate in the signature?
//   * Coverage — does the signature cover the whole file, or were later versions appended
//     (another signature, a filled form, an edit)? The signed version can be cut out
//     (signedLength) and opened on its own.
//   * Who and when — the certificate's subject and issuer, its validity, the time the signer's
//     computer claimed, and a timestamp from a timestamp authority (its token is checked too).
//   * The chain of certificates included in the file — each link's signature is checked.
// What it does NOT do, and says so on the page: decide whether the issuer is trusted (that needs a
// trust list — the EU trusted lists or Adobe's), check revocation (CRL/OCSP need the network), or
// analyse what exactly changed in later versions of the file.
//
// Formats: ETSI.CAdES.detached, adbe.pkcs7.detached, adbe.pkcs7.sha1, ETSI.RFC3161 (document
// timestamps). Algorithms: RSA PKCS#1 v1.5, RSA-PSS, ECDSA P-256/384/521, Ed25519; SHA-1/256/384/512.
// Anything else is reported as "cannot be checked here", never as valid.
import { PDFArray, PDFDict, PDFHexString, PDFName, PDFNumber, PDFString, PDFDocument, PDFRef } from 'pdf-lib';
import { DerError, bytesEqual, content, intBytes, intValue, isCtx, isSeq, oid, parseDer, raw, text, time, type Tlv } from './der';

export type SignatureStatus = 'valid' | 'invalid' | 'unknown';
export type ProblemCode =
  | 'byterange'      // /ByteRange is malformed or does not frame the signature
  | 'digest'         // the signed bytes were changed
  | 'signature'      // the signature value does not match the certificate's key
  | 'no-cert'        // the signer's certificate is not in the signature
  | 'cert-binding'   // the signing-certificate attribute names another certificate
  | 'format'         // the signature data cannot be read
  | 'unsupported';   // an algorithm or format this tool cannot check

export interface CertInfo {
  subject: string;
  organization?: string;
  issuer: string;
  serial: string;
  notBefore: Date | null;
  notAfter: Date | null;
  selfSigned: boolean;
}

export interface ChainLink {
  cert: CertInfo;
  /** Whether the next certificate in the chain really signed this one (null: issuer not in the file). */
  issuedByNext: boolean | null;
}

export interface TimestampInfo {
  time: Date | null;
  authority?: string;
  /** The token is intact and its signature matches the authority's certificate. */
  ok: boolean;
}

export interface PdfSignatureReport {
  field: string;
  kind: 'signature' | 'certification' | 'timestamp';
  subFilter: string;
  status: SignatureStatus;
  problem?: ProblemCode;
  /** Algorithm or format name for 'unsupported'. */
  detail?: string;
  signer?: CertInfo;
  chain: ChainLink[];
  /** Time claimed by the signer (signingTime attribute, else /M). Not proof. */
  claimedTime: Date | null;
  timestamp?: TimestampInfo;
  /** The certificate was valid at the timestamp, else at the claimed time (null: no time). */
  certValidAtSigning: boolean | null;
  reason?: string;
  location?: string;
  name?: string;
  /** DocMDP permission of a certification signature (1 no changes, 2 forms and signing, 3 also comments). */
  permission?: 1 | 2 | 3;
  digestAlgorithm?: string;
  signatureAlgorithm?: string;
  /** Length of the file version the signature covers (bytes [0, signedLength)). */
  signedLength: number;
  coversWholeFile: boolean;
}

export interface VerifyResult {
  signatures: PdfSignatureReport[];
  fileLength: number;
}

// ---------- OIDs ----------
const DIGESTS: Record<string, string> = {
  '1.3.14.3.2.26': 'SHA-1', '2.16.840.1.101.3.4.2.1': 'SHA-256', '2.16.840.1.101.3.4.2.2': 'SHA-384', '2.16.840.1.101.3.4.2.3': 'SHA-512',
};
const DIGEST_NAMES: Record<string, string> = { '1.2.840.113549.2.5': 'MD5', '2.16.840.1.101.3.4.2.4': 'SHA-224', '1.2.643.7.1.1.2.2': 'GOST R 34.11-2012' };
const RSA_WITH: Record<string, string> = {
  '1.2.840.113549.1.1.5': 'SHA-1', '1.2.840.113549.1.1.11': 'SHA-256', '1.2.840.113549.1.1.12': 'SHA-384', '1.2.840.113549.1.1.13': 'SHA-512',
};
const ECDSA_WITH: Record<string, string> = {
  '1.2.840.10045.4.1': 'SHA-1', '1.2.840.10045.4.3.2': 'SHA-256', '1.2.840.10045.4.3.3': 'SHA-384', '1.2.840.10045.4.3.4': 'SHA-512',
};
const CURVES: Record<string, { name: string; size: number }> = {
  '1.2.840.10045.3.1.7': { name: 'P-256', size: 32 }, '1.3.132.0.34': { name: 'P-384', size: 48 }, '1.3.132.0.35': { name: 'P-521', size: 66 },
};
const RSA_KEY = '1.2.840.113549.1.1.1';
const RSA_PSS = '1.2.840.113549.1.1.10';
const EC_KEY = '1.2.840.10045.2.1';
const ED25519 = '1.3.101.112';
const SIGNED_DATA = '1.2.840.113549.1.7.2';
const ATTR_CONTENT_TYPE = '1.2.840.113549.1.9.3';
const ATTR_MESSAGE_DIGEST = '1.2.840.113549.1.9.4';
const ATTR_SIGNING_TIME = '1.2.840.113549.1.9.5';
const ATTR_SIGNING_CERT = '1.2.840.113549.1.9.16.2.12';
const ATTR_SIGNING_CERT_V2 = '1.2.840.113549.1.9.16.2.47';
const ATTR_TIMESTAMP = '1.2.840.113549.1.9.16.2.14';
const NAME_ATTRS: Record<string, string> = {
  '2.5.4.3': 'CN', '2.5.4.10': 'O', '2.5.4.11': 'OU', '2.5.4.6': 'C', '2.5.4.5': 'serialNumber', '2.5.4.7': 'L',
  '2.5.4.42': 'GN', '2.5.4.4': 'SN', '2.5.4.97': 'organizationIdentifier', '1.2.840.113549.1.9.1': 'E',
};

class Unsupported extends Error {}
class Problem extends Error { constructor(public code: ProblemCode, public detail?: string) { super(code); } }

const subtle = () => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Unsupported('Web Crypto');
  return s;
};
const buf = (b: Uint8Array) => b.slice().buffer as ArrayBuffer;
async function digest(alg: string, data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await subtle().digest(alg, buf(data)));
}

// ---------- certificates ----------
interface Cert {
  der: Uint8Array;
  info: CertInfo;
  tbs: Uint8Array;
  issuerRaw: Uint8Array;
  subjectRaw: Uint8Array;
  serial: Uint8Array;
  spki: Uint8Array;
  keyAlg: string;
  keyParam?: string;
  ski?: Uint8Array;
  sigAlg: Tlv;
  sigValue: Uint8Array;
  b: Uint8Array;
}

function nameAttrs(b: Uint8Array, name: Tlv): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rdn of name.children) {
    for (const atv of rdn.children) {
      const key = NAME_ATTRS[oid(b, atv.children[0])];
      const val = atv.children[1];
      if (key && val && !out[key]) out[key] = text(b, val);
    }
  }
  return out;
}
const displayName = (a: Record<string, string>) => a.CN || [a.GN, a.SN].filter(Boolean).join(' ') || a.O || a.OU || a.E || '';

function parseCert(b: Uint8Array, t: Tlv): Cert {
  const [tbsT, sigAlg, sigBits] = t.children;
  if (!isSeq(tbsT) || !isSeq(sigAlg) || !sigBits) throw new DerError('certificate');
  const f = tbsT.children;
  let i = isCtx(f[0], 0) ? 1 : 0;
  const serialT = f[i++]!; i++; // serial, signature algorithm
  const issuer = f[i++]!; const validity = f[i++]!; const subject = f[i++]!; const spkiT = f[i++]!;
  if (!isSeq(issuer) || !isSeq(validity) || !isSeq(subject) || !isSeq(spkiT)) throw new DerError('certificate fields');
  const keyAlgT = spkiT.children[0]!;
  let ski: Uint8Array | undefined;
  const ext = f.find((x) => isCtx(x, 3));
  for (const e of ext?.children[0]?.children ?? []) {
    if (oid(b, e.children[0]) === '2.5.29.14') {
      const inner = parseDer(content(b, e.children[e.children.length - 1]!));
      ski = content(content(b, e.children[e.children.length - 1]!), inner);
    }
  }
  const s = nameAttrs(b, subject);
  const iss = nameAttrs(b, issuer);
  const serial = intBytes(b, serialT);
  const issuerRaw = raw(b, issuer);
  const subjectRaw = raw(b, subject);
  const sv = content(b, sigBits);
  return {
    der: raw(b, t), tbs: raw(b, tbsT), issuerRaw, subjectRaw, serial, spki: raw(b, spkiT),
    keyAlg: oid(b, keyAlgT.children[0]),
    keyParam: keyAlgT.children[1]?.tagNo === 6 ? oid(b, keyAlgT.children[1]) : undefined,
    ski, sigAlg, sigValue: sv.subarray(1), b,
    info: {
      subject: displayName(s) || '?',
      organization: s.O && s.O !== displayName(s) ? s.O : undefined,
      issuer: displayName(iss) || '?',
      serial: Array.from(serial, (x) => x.toString(16).padStart(2, '0')).join(':'),
      notBefore: time(b, validity.children[0]),
      notAfter: time(b, validity.children[1]),
      selfSigned: bytesEqual(issuerRaw, subjectRaw),
    },
  };
}

// ---------- signature algorithms ----------
interface SigSpec { importAlg: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams; verifyAlg: AlgorithmIdentifier | RsaPssParams | EcdsaParams; ecSize?: number; name: string }

function sigSpec(b: Uint8Array, alg: Tlv, digestName: string | undefined, cert: Cert): SigSpec {
  const a = oid(b, alg.children[0]);
  const needDigest = () => { if (!digestName) throw new Unsupported('digest'); return digestName; };
  if (a === RSA_KEY || RSA_WITH[a]) {
    if (cert.keyAlg !== RSA_KEY) throw new Unsupported(`${a} / ${cert.keyAlg}`);
    const hash = RSA_WITH[a] ?? needDigest();
    return { importAlg: { name: 'RSASSA-PKCS1-v1_5', hash }, verifyAlg: { name: 'RSASSA-PKCS1-v1_5' }, name: `RSA ${hash}` };
  }
  if (a === RSA_PSS) {
    if (cert.keyAlg !== RSA_KEY) throw new Unsupported('RSA-PSS key');
    const p = alg.children[1];
    let hash = 'SHA-1'; let salt = 20; let mgfHash = 'SHA-1';
    for (const c of p?.children ?? []) {
      if (isCtx(c, 0)) hash = DIGESTS[oid(b, c.children[0]?.children[0])] ?? '';
      if (isCtx(c, 1)) mgfHash = DIGESTS[oid(b, c.children[0]?.children[1]?.children[0])] ?? '';
      if (isCtx(c, 2)) salt = intValue(b, c.children[0]!);
    }
    if (!hash || hash !== mgfHash) throw new Unsupported('RSA-PSS parameters');
    return { importAlg: { name: 'RSA-PSS', hash }, verifyAlg: { name: 'RSA-PSS', saltLength: salt }, name: `RSA-PSS ${hash}` };
  }
  if (ECDSA_WITH[a] || a === EC_KEY) {
    const curve = cert.keyAlg === EC_KEY && cert.keyParam ? CURVES[cert.keyParam] : undefined;
    if (!curve) throw new Unsupported(`EC ${cert.keyParam ?? cert.keyAlg}`);
    const hash = ECDSA_WITH[a] ?? needDigest();
    return { importAlg: { name: 'ECDSA', namedCurve: curve.name }, verifyAlg: { name: 'ECDSA', hash }, ecSize: curve.size, name: `ECDSA ${curve.name} ${hash}` };
  }
  if (a === ED25519) {
    if (cert.keyAlg !== ED25519) throw new Unsupported('Ed25519 key');
    return { importAlg: { name: 'Ed25519' }, verifyAlg: { name: 'Ed25519' }, name: 'Ed25519' };
  }
  throw new Unsupported(a);
}

/** ECDSA signatures are DER SEQUENCE { r, s }; Web Crypto wants r || s of the curve size. */
function ecdsaRaw(sig: Uint8Array, size: number): Uint8Array {
  const t = parseDer(sig);
  const out = new Uint8Array(size * 2);
  t.children.slice(0, 2).forEach((c, i) => {
    const v = intBytes(sig, c);
    if (v.length > size) throw new DerError('ECDSA value too long');
    out.set(v, i * size + size - v.length);
  });
  return out;
}

async function verifyWith(cert: Cert, spec: SigSpec, signature: Uint8Array, data: Uint8Array): Promise<boolean> {
  let key: CryptoKey;
  try {
    key = await subtle().importKey('spki', buf(cert.spki), spec.importAlg, false, ['verify']);
  } catch {
    throw new Unsupported(spec.name);
  }
  let sig = signature;
  if (spec.ecSize) {
    try { sig = ecdsaRaw(signature, spec.ecSize); } catch { return false; }
  }
  return subtle().verify(spec.verifyAlg, key, buf(sig), buf(data));
}

/** Whether `issuer` signed `cert` (false: it did not; throws Unsupported when it cannot be told). */
async function issuedBy(cert: Cert, issuer: Cert): Promise<boolean> {
  const a = oid(cert.b, cert.sigAlg.children[0]);
  const digestName = RSA_WITH[a] ?? ECDSA_WITH[a];
  return verifyWith(issuer, sigSpec(cert.b, cert.sigAlg, digestName, issuer), cert.sigValue, cert.tbs);
}

// ---------- CMS ----------
interface CmsResult {
  signer: Cert;
  certs: Cert[];
  signingTime: Date | null;
  eContent: Uint8Array | null;
  digestAlgorithm: string;
  signatureAlgorithm: string;
  signatureValue: Uint8Array;
  timestamp?: TimestampInfo;
}

function attr(b: Uint8Array, attrs: Tlv | undefined, id: string): Tlv | undefined {
  return attrs?.children.find((a) => oid(b, a.children[0]) === id)?.children[1]?.children[0];
}

/**
 * Checks a CMS SignedData: the content's digest against the messageDigest attribute and the
 * signature against the signer's certificate. Throws Problem or Unsupported; returns on success.
 */
async function verifyCms(b: Uint8Array, detached: Uint8Array | null, nested = false): Promise<CmsResult> {
  let ci: Tlv;
  try { ci = parseDer(b); } catch { throw new Problem('format'); }
  if (!isSeq(ci) || oid(b, ci.children[0]) !== SIGNED_DATA) throw new Problem('format');
  const sd = ci.children[1]?.children[0];
  if (!isSeq(sd)) throw new Problem('format');
  const parts = sd.children;
  const encap = parts[2];
  const certsT = parts.find((x) => isCtx(x, 0));
  const signerInfos = parts[parts.length - 1];
  if (!isSeq(encap) || !signerInfos?.children.length) throw new Problem('format');
  const eContentType = oid(b, encap.children[0]);
  const eContentT = encap.children[1]?.children[0];
  const eContent = eContentT ? content(b, eContentT) : null;
  const signed = eContent ?? detached;
  if (!signed) throw new Problem('format');

  const certs: Cert[] = [];
  for (const c of certsT?.children ?? []) {
    if (isSeq(c)) { try { certs.push(parseCert(b, c)); } catch { /* attribute certificates and the like */ } }
  }
  const si = signerInfos.children[0]!;
  const f = si.children;
  const sid = f[1]!;
  const digestOid = oid(b, f[2]!.children[0]);
  const digestName = DIGESTS[digestOid];
  let i = 3;
  const signedAttrs = isCtx(f[i], 0) ? f[i++] : undefined;
  const sigAlg = f[i++]!;
  const signatureValue = content(b, f[i++]!);
  const unsignedAttrs = isCtx(f[i], 1) ? f[i] : undefined;

  let signer: Cert | undefined;
  if (isSeq(sid)) {
    const issuer = raw(b, sid.children[0]!);
    const serial = intBytes(b, sid.children[1]!);
    signer = certs.find((c) => bytesEqual(c.issuerRaw, issuer) && bytesEqual(c.serial, serial));
  } else if (isCtx(sid, 0)) {
    const ski = content(b, sid);
    signer = certs.find((c) => c.ski && bytesEqual(c.ski, ski));
  }
  if (!signer) throw new Problem('no-cert');
  if (!digestName) throw new Unsupported(DIGEST_NAMES[digestOid] ?? digestOid);

  const spec = sigSpec(b, sigAlg, digestName, signer);
  let toVerify = signed;
  let signingTime: Date | null = null;
  if (signedAttrs) {
    const md = attr(b, signedAttrs, ATTR_MESSAGE_DIGEST);
    if (!md || !bytesEqual(content(b, md), await digest(digestName, signed))) throw new Problem('digest');
    const ct = attr(b, signedAttrs, ATTR_CONTENT_TYPE);
    if (ct && oid(b, ct) !== eContentType) throw new Problem('format');
    signingTime = time(b, attr(b, signedAttrs, ATTR_SIGNING_TIME));
    // ESS signing-certificate(-v2): the hash of the certificate the signer meant.
    for (const [id, alg] of [[ATTR_SIGNING_CERT_V2, 'SHA-256'], [ATTR_SIGNING_CERT, 'SHA-1']] as const) {
      const v = attr(b, signedAttrs, id);
      const certId = v?.children[0]?.children[0];
      if (!certId) continue;
      let hashAlg: string = alg;
      let hashT = certId.children[0];
      if (id === ATTR_SIGNING_CERT_V2 && isSeq(certId.children[0])) {
        hashAlg = DIGESTS[oid(b, certId.children[0]!.children[0])] ?? '';
        hashT = certId.children[1];
      }
      if (!hashAlg || !hashT) continue;
      if (!bytesEqual(content(b, hashT), await digest(hashAlg, signer.der))) throw new Problem('cert-binding');
    }
    toVerify = new Uint8Array(raw(b, signedAttrs));
    toVerify[0] = 0x31; // signed over the DER of SET OF, not the [0] IMPLICIT tag
  }
  if (!(await verifyWith(signer, spec, signatureValue, toVerify))) throw new Problem('signature');

  let timestamp: TimestampInfo | undefined;
  const tsT = nested ? undefined : attr(b, unsignedAttrs, ATTR_TIMESTAMP);
  if (tsT) timestamp = await checkTimestamp(raw(b, tsT), signatureValue);
  return { signer, certs, signingTime, eContent, digestAlgorithm: digestName, signatureAlgorithm: spec.name, signatureValue, timestamp };
}

/** A timestamp token (CMS over TSTInfo) whose message imprint must be the hash of `imprinted`. */
async function checkTimestamp(token: Uint8Array, imprinted: Uint8Array): Promise<TimestampInfo> {
  try {
    const r = await verifyCms(token, null, true);
    if (!r.eContent) return { time: null, ok: false };
    const tst = parseDer(r.eContent);
    const mi = tst.children[2]!;
    const alg = DIGESTS[oid(r.eContent, mi.children[0]!.children[0])];
    const time_ = time(r.eContent, tst.children[4]);
    const ok = !!alg && bytesEqual(content(r.eContent, mi.children[1]!), await digest(alg, imprinted));
    return { time: time_, authority: r.signer.info.subject, ok };
  } catch {
    return { time: null, ok: false };
  }
}

/** Certificates from the signer up through the ones in the file, each link's signature checked. */
async function buildChain(signer: Cert, certs: Cert[]): Promise<ChainLink[]> {
  const chain: ChainLink[] = [];
  let cur: Cert | undefined = signer;
  const seen = new Set<Cert>();
  while (cur && !seen.has(cur) && chain.length < 10) {
    seen.add(cur);
    if (cur.info.selfSigned) {
      let ok: boolean | null = null;
      try { ok = await issuedBy(cur, cur); } catch { ok = null; }
      chain.push({ cert: cur.info, issuedByNext: ok });
      break;
    }
    const c: Cert = cur;
    const next = certs.find((x) => x !== c && bytesEqual(x.subjectRaw, c.issuerRaw));
    let ok: boolean | null = null;
    if (next) { try { ok = await issuedBy(c, next); } catch { ok = null; } }
    chain.push({ cert: c.info, issuedByNext: ok });
    cur = next;
  }
  return chain;
}

// ---------- PDF ----------
const hexToBytes = (h: string) => {
  const s = h.replace(/[^0-9a-fA-F]/g, '');
  const out = new Uint8Array(s.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
  return out;
};

function pdfText(d: PDFDict, key: string): string | undefined {
  const v = d.lookup(PDFName.of(key));
  if (v instanceof PDFString || v instanceof PDFHexString) {
    const s = v.decodeText().trim();
    return s || undefined;
  }
  return undefined;
}

/** D:YYYYMMDDHHmmSSOHH'mm' */
function pdfDate(s: string | undefined): Date | null {
  const m = s && /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([Zz+-])?(\d{2})?'?(\d{2})?/.exec(s);
  if (!m) return null;
  let ms = Date.UTC(Number(m[1]), Number(m[2] ?? 1) - 1, Number(m[3] ?? 1), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0));
  if (m[7] === '+' || m[7] === '-') ms -= (m[7] === '-' ? -1 : 1) * (Number(m[8] ?? 0) * 60 + Number(m[9] ?? 0)) * 60_000;
  return new Date(ms);
}

interface Found { dict: PDFDict; field: string }

/** dict[key] if it is of the given type (pdf-lib's own typed lookup throws on another type). */
const getDict = (d: PDFDict | undefined, k: string) => { const v = d?.lookup(PDFName.of(k)); return v instanceof PDFDict ? v : undefined; };
const getArray = (d: PDFDict | undefined, k: string) => { const v = d?.lookup(PDFName.of(k)); return v instanceof PDFArray ? v : undefined; };
const getName = (d: PDFDict | undefined, k: string) => { const v = d?.lookup(PDFName.of(k)); return v instanceof PDFName ? v : undefined; };
const getNumber = (d: PDFDict | undefined, k: string) => { const v = d?.lookup(PDFName.of(k)); return v instanceof PDFNumber ? v : undefined; };

function findSignatureDicts(doc: PDFDocument, encrypted: boolean): Found[] {
  const found: Found[] = [];
  const seen = new Set<PDFDict>();
  const ctx = doc.context;
  const visit = (ref: unknown, parentName: string, parentFt: string | undefined, depth: number) => {
    if (depth > 20) return;
    const field = ctx.lookup(ref as PDFRef);
    if (!(field instanceof PDFDict)) return;
    const t = encrypted ? undefined : pdfText(field, 'T');
    const name = t ? (parentName ? `${parentName}.${t}` : t) : parentName;
    const ftName = getName(field, 'FT')?.asString() ?? parentFt;
    const v = getDict(field, 'V');
    if (ftName === '/Sig' && v && v.has(PDFName.of('ByteRange')) && !seen.has(v)) { seen.add(v); found.push({ dict: v, field: name }); }
    const kids = getArray(field, 'Kids');
    for (let i = 0; kids && i < kids.size(); i++) visit(kids.get(i), name, ftName, depth + 1);
  };
  const fields = getArray(getDict(doc.catalog, 'AcroForm'), 'Fields');
  for (let i = 0; fields && i < fields.size(); i++) visit(fields.get(i), '', undefined, 0);
  // Signature dictionaries outside the form (seen in the wild) are found by their shape.
  for (const [, obj] of ctx.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict && !seen.has(obj) && obj.has(PDFName.of('ByteRange')) && obj.has(PDFName.of('Contents'))) {
      seen.add(obj);
      found.push({ dict: obj, field: '' });
    }
  }
  return found;
}

async function checkOne(file: Uint8Array, sig: PDFDict, field: string): Promise<PdfSignatureReport> {
  const subFilter = getName(sig, 'SubFilter')?.decodeText() ?? '';
  const type = getName(sig, 'Type')?.decodeText();
  let permission: 1 | 2 | 3 | undefined;
  const refs = getArray(sig, 'Reference');
  for (let i = 0; refs && i < refs.size(); i++) {
    const r = refs.lookup(i);
    if (r instanceof PDFDict && getName(r, 'TransformMethod')?.decodeText() === 'DocMDP') {
      const p = getNumber(getDict(r, 'TransformParams'), 'P')?.asNumber() ?? 2;
      permission = (p === 1 || p === 3 ? p : 2) as 1 | 2 | 3;
    }
  }
  const report: PdfSignatureReport = {
    field,
    kind: type === 'DocTimeStamp' || subFilter === 'ETSI.RFC3161' ? 'timestamp' : permission ? 'certification' : 'signature',
    subFilter,
    status: 'unknown',
    chain: [],
    claimedTime: pdfDate(pdfText(sig, 'M')),
    certValidAtSigning: null,
    reason: pdfText(sig, 'Reason'),
    location: pdfText(sig, 'Location'),
    name: pdfText(sig, 'Name'),
    permission,
    signedLength: 0,
    coversWholeFile: false,
  };
  try {
    // /ByteRange [0 a b c]: the file without the gap [a, b), which holds the hex /Contents.
    const br = getArray(sig, 'ByteRange');
    const n = br ? Array.from({ length: br.size() }, (_, i) => { const v = br.lookup(i); return v instanceof PDFNumber ? v.asNumber() : -1; }) : [];
    const [z, a, b, c] = n;
    if (n.length !== 4 || z !== 0 || a! <= 0 || b! <= a! || c! < 0 || b! + c! > file.length
      || file[a!] !== 0x3c || file[b! - 1] !== 0x3e) throw new Problem('byterange');
    report.signedLength = b! + c!;
    report.coversWholeFile = report.signedLength === file.length;
    // The signature is read from the gap itself, so it is the one the ranges were built around.
    const cms = hexToBytes(new TextDecoder('latin1').decode(file.subarray(a! + 1, b! - 1)));
    const signedBytes = new Uint8Array(a! + c!);
    signedBytes.set(file.subarray(0, a!), 0);
    signedBytes.set(file.subarray(b!, b! + c!), a!);
    const pdfContents = sig.lookup(PDFName.of('Contents'));
    if (pdfContents instanceof PDFHexString) {
      const fromDict = hexToBytes(pdfContents.asString());
      if (!bytesEqual(fromDict.subarray(0, cms.length), cms.subarray(0, fromDict.length))) throw new Problem('byterange');
    }

    if (report.kind === 'timestamp') {
      const ts = await checkTimestamp(cms, signedBytes);
      const r = await verifyCms(cms, null, true);
      report.signer = r.signer.info;
      report.chain = await buildChain(r.signer, r.certs);
      report.timestamp = ts;
      report.digestAlgorithm = r.digestAlgorithm;
      report.signatureAlgorithm = r.signatureAlgorithm;
      if (!ts.ok) throw new Problem('digest');
      report.certValidAtSigning = validAt(r.signer.info, ts.time);
      report.status = 'valid';
      return report;
    }
    if (subFilter === 'adbe.x509.rsa_sha1') throw new Unsupported('adbe.x509.rsa_sha1');
    const r = await verifyCms(cms, subFilter === 'adbe.pkcs7.sha1' ? null : signedBytes);
    if (subFilter === 'adbe.pkcs7.sha1' && (!r.eContent || !bytesEqual(r.eContent, await digest('SHA-1', signedBytes)))) throw new Problem('digest');
    report.signer = r.signer.info;
    report.chain = await buildChain(r.signer, r.certs);
    report.claimedTime = r.signingTime ?? report.claimedTime;
    report.timestamp = r.timestamp;
    report.digestAlgorithm = r.digestAlgorithm;
    report.signatureAlgorithm = r.signatureAlgorithm;
    const when = r.timestamp?.ok && r.timestamp.time ? r.timestamp.time : report.claimedTime;
    report.certValidAtSigning = validAt(r.signer.info, when);
    report.status = 'valid';
  } catch (e) {
    if (e instanceof Problem) { report.status = 'invalid'; report.problem = e.code; }
    else if (e instanceof Unsupported) { report.status = 'unknown'; report.problem = 'unsupported'; report.detail = e.message; }
    else { report.status = 'unknown'; report.problem = 'format'; }
  }
  return report;
}

function validAt(c: CertInfo, when: Date | null): boolean | null {
  if (!when || !c.notBefore || !c.notAfter) return null;
  return when >= c.notBefore && when <= c.notAfter;
}

/** Every digital signature in the PDF, in signing order. */
export async function verifyPdfSignatures(file: Uint8Array): Promise<VerifyResult> {
  const doc = await PDFDocument.load(file, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
  // In an encrypted file the signature values are not encrypted (ISO 32000-1 §7.6.2), but text
  // such as the field name and reason is — it is not shown then.
  const encrypted = doc.isEncrypted;
  const found = findSignatureDicts(doc, encrypted);
  const signatures: PdfSignatureReport[] = [];
  for (const f of found) {
    const r = await checkOne(file, f.dict, f.field);
    if (encrypted) { r.reason = undefined; r.location = undefined; r.name = undefined; }
    signatures.push(r);
  }
  signatures.sort((x, y) => x.signedLength - y.signedLength);
  return { signatures, fileLength: file.length };
}
