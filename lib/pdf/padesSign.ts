// Client-side PAdES-B-B (CAdES-detached) digital signing for PDF documents, using a
// certificate the user supplies themselves (a .p12/.pfx file + its password). Everything here
// runs in the browser: parsing the certificate, hashing the document and building/signing the
// CMS (PKCS#7) SignedData structure never sends the document, the certificate, or the password
// anywhere. This is a genuine cryptographic signature (verifiable, tamper-evident) — NOT the
// same thing as the drawn/typed image signature in signPdfClient, and NOT a legally "qualified"
// signature under eIDAS (that requires a certificate issued by a licensed Qualified Trust
// Service Provider on a Qualified Signature Creation Device — this tool cannot issue one, it can
// only apply whatever certificate the user already has).
import {
  PDFDocument, PDFName, PDFString, PDFHexString, PDFDict, PDFArray,
} from 'pdf-lib';
import forge from 'node-forge';

// Reserved space for the DER-encoded CMS SignedData blob, in bytes (hex-encoded, so this many
// bytes becomes 2x that many hex characters in /Contents). A SHA-256/RSA-2048 signature with a
// 2-3 certificate chain (leaf + intermediate + root) typically runs 4-8 KB; 16 KB leaves generous
// headroom without bloating the file unreasonably. If the real signature doesn't fit, signing
// fails loudly (see the length check below) rather than silently truncating/corrupting it.
const CONTENTS_RESERVED_BYTES = 16384;
// Fixed decimal-digit width for each of the 4 numbers in /ByteRange. Reserving this many digits
// up front (as a placeholder value that already has this width) lets every later substitution
// keep the exact same byte length — critical, since ByteRange positions must describe the file
// exactly as saved, and any width change would shift bytes out from under the ranges it names.
const BYTE_RANGE_DIGIT_WIDTH = 10; // supports files up to 9,999,999,999 bytes (~9.3 GB)
const BYTE_RANGE_PLACEHOLDER_NUM = '9'.repeat(BYTE_RANGE_DIGIT_WIDTH);

export interface PadesCertBundle {
  privateKey: forge.pki.rsa.PrivateKey;
  leafCertificate: forge.pki.Certificate;
  certificateChain: forge.pki.Certificate[]; // leaf first, then any intermediates/root present in the .p12
}

export interface PadesSignOptions {
  reason?: string;
  location?: string;
  contactInfo?: string;
  fieldName?: string;
}

function uint8ArrayToBinaryString(bytes: Uint8Array): string {
  // Avoid String.fromCharCode(...bytes) — spreading a large typed array blows the call stack.
  const CHUNK = 0x8000;
  let out = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return out;
}

function binaryStringToUint8Array(bin: string): Uint8Array {
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 0xff;
  return bytes;
}

/** Parses a .p12/.pfx into its private key and certificate chain. Throws with a message safe to show the user (never echoes the password). */
export function parsePkcs12(p12Bytes: Uint8Array, password: string): PadesCertBundle {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const der = forge.util.createBuffer(uint8ArrayToBinaryString(p12Bytes));
    const asn1 = forge.asn1.fromDer(der);
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  } catch {
    throw new Error('Nie udało się odczytać pliku .p12/.pfx — sprawdź hasło lub czy plik nie jest uszkodzony.');
  }

  // Safe: forge.pki.oids is typed as a pure index signature ({[key: string]: string}), so
  // noUncheckedIndexedAccess widens dot-access on it to `string | undefined` — but these are
  // well-known constant OID names forge's own oids table always defines.
  const pkcs8ShroudedKeyBagOid = forge.pki.oids.pkcs8ShroudedKeyBag!;
  const keyBagOid = forge.pki.oids.keyBag!;
  const certBagOid = forge.pki.oids.certBag!;

  // forge's own pkcs12.js _decodeSafeContents never lets an unrecognized private-key algorithm
  // (e.g. EC/ECDSA — forge's pki.privateKeyFromAsn1 only understands RSAPrivateKey) escape as a
  // thrown error: it catches that internally and stores `bag.key = null; bag.asn1 = <raw ASN.1>`
  // instead, so a bag for a real, present-but-unsupported key looks identical to "no bag at all"
  // by `.key` alone — `.asn1` is the only signal that distinguishes the two. Checked for both here
  // so a user who supplies a non-RSA certificate gets told WHY, instead of the misleading "no
  // private key found" (a private key WAS found, just not one this tool can use).
  const keyBags = p12.getBags({ bagType: pkcs8ShroudedKeyBagOid });
  const plainKeyBagsForCheck = p12.getBags({ bagType: keyBagOid });
  let key = keyBags[pkcs8ShroudedKeyBagOid]?.[0]?.key;
  if (!key) {
    key = plainKeyBagsForCheck[keyBagOid]?.[0]?.key;
  }
  if (!key) {
    const sawUnsupportedKeyType =
      (keyBags[pkcs8ShroudedKeyBagOid] ?? []).some(b => !b.key && b.asn1) ||
      (plainKeyBagsForCheck[keyBagOid] ?? []).some(b => !b.key && b.asn1);
    if (sawUnsupportedKeyType) {
      throw new Error('Ten plik .p12/.pfx zawiera klucz prywatny w nieobsługiwanym formacie (np. EC/ECDSA) — obsługiwane są wyłącznie certyfikaty z kluczem RSA.');
    }
    throw new Error('Nie znaleziono klucza prywatnego w pliku .p12/.pfx.');
  }

  const certBags = p12.getBags({ bagType: certBagOid });
  const certs = (certBags[certBagOid] || [])
    .map(b => b.cert)
    .filter((c): c is forge.pki.Certificate => !!c);
  if (certs.length === 0) throw new Error('Nie znaleziono certyfikatu w pliku .p12/.pfx.');

  // The leaf certificate is the one whose public key matches the private key (RSA modulus
  // comparison) — a .p12 may also bundle intermediate/root CA certs with no matching key.
  const keyN = (key as forge.pki.rsa.PrivateKey).n.toString(16);
  const leafCertificate = certs.find(c => {
    const pub = c.publicKey as forge.pki.rsa.PublicKey;
    return pub && pub.n && pub.n.toString(16) === keyN;
  }) ?? certs[0]!; // safe: certs.length === 0 already threw above

  // Order the rest of the chain after the leaf, in whatever order they appeared.
  const rest = certs.filter(c => c !== leafCertificate);
  return { privateKey: key as forge.pki.rsa.PrivateKey, leafCertificate, certificateChain: [leafCertificate, ...rest] };
}

function formatPdfDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const offH = pad(Math.floor(Math.abs(offsetMin) / 60));
  const offM = pad(Math.abs(offsetMin) % 60);
  return `D:${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${sign}${offH}'${offM}'`;
}

interface PreparedPdf {
  bytes: Uint8Array;
  byteRangeNumbersOffset: number; // offset of the first placeholder ByteRange number's first digit
  contentsHexStart: number; // offset of the first hex digit inside /Contents<...>
  contentsHexEnd: number; // offset right after the last hex digit (position of '>')
}

// Returns `baseName` unchanged if no existing AcroForm field already carries it, otherwise a
// disambiguated variant that isn't taken — so re-signing a PDF that already has a field named
// "Signature1" (from a previous pass through this same tool, or from any other source) gets
// "Signature2" instead of a second, ambiguous sibling field with the identical name. If
// `baseName` itself already ends in digits (as the tool's own default "Signature1" does), that
// trailing number is treated as the starting counter and incremented ("Signature1" ->
// "Signature2" -> "Signature3", ...) rather than blindly appended ("Signature1" + "2" would read
// as "Signature12", which is confusing and not what a human disambiguating "Signature1" means).
// Otherwise a fresh "2", "3", ... suffix is appended to the whole name.
function uniqueSignatureFieldName(catalog: PDFDict, baseName: string): string {
  const existingNames = new Set<string>();
  const acroForm = catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
  const fields = acroForm?.lookupMaybe(PDFName.of('Fields'), PDFArray);
  if (fields) {
    for (let i = 0; i < fields.size(); i++) {
      const fieldDict = catalog.context.lookupMaybe(fields.get(i), PDFDict);
      const t = fieldDict?.lookupMaybe(PDFName.of('T'), PDFString) ?? fieldDict?.lookupMaybe(PDFName.of('T'), PDFHexString);
      if (t) existingNames.add(t.decodeText());
    }
  }
  if (!existingNames.has(baseName)) return baseName;
  const trailingDigits = baseName.match(/^(.*?)(\d+)$/);
  const prefix = trailingDigits ? trailingDigits[1]! : baseName;
  let n = trailingDigits ? Number(trailingDigits[2]) + 1 : 2;
  while (existingNames.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

async function buildPlaceholderPdf(pdfBytes: Uint8Array, opts: PadesSignOptions, signingDate: Date): Promise<PreparedPdf> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
  if (pdfDoc.isEncrypted) throw new Error('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.');
  const context = pdfDoc.context;

  const byteRangePlaceholder = context.obj([
    0,
    Number(BYTE_RANGE_PLACEHOLDER_NUM),
    Number(BYTE_RANGE_PLACEHOLDER_NUM),
    Number(BYTE_RANGE_PLACEHOLDER_NUM),
  ]);
  const contentsPlaceholder = PDFHexString.of('0'.repeat(CONTENTS_RESERVED_BYTES * 2));

  const sigDict = context.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'ETSI.CAdES.detached',
    ByteRange: byteRangePlaceholder,
    Contents: contentsPlaceholder,
    M: PDFString.of(formatPdfDate(signingDate)),
  });
  if (opts.reason) sigDict.set(PDFName.of('Reason'), PDFString.of(opts.reason));
  if (opts.location) sigDict.set(PDFName.of('Location'), PDFString.of(opts.location));
  if (opts.contactInfo) sigDict.set(PDFName.of('ContactInfo'), PDFString.of(opts.contactInfo));
  const sigRef = context.register(sigDict);

  // FINDING (2026-09-23) — every signature created by this tool's UI (PadesSignForm.tsx never
  // passes fieldName) used the literal default 'Signature1' unconditionally, with NO check for
  // an existing field of the same name. Re-signing a PDF that was already signed once by this
  // same tool — a realistic multi-signer scenario, or simply running this tool twice on the
  // same output — unconditionally pushed a SECOND top-level field also named 'Signature1' into
  // AcroForm/Fields, producing an AcroForm with two sibling fields sharing an identical fully
  // qualified name, which violates the field-name-uniqueness expectation in ISO 32000 and makes
  // by-name field lookup in the resulting PDF ambiguous for any consuming tool/validator.
  const fieldName = uniqueSignatureFieldName(pdfDoc.catalog, opts.fieldName || 'Signature1');
  const firstPage = pdfDoc.getPage(0);
  const widgetDict = context.obj({
    FT: 'Sig',
    Type: 'Annot',
    Subtype: 'Widget',
    Rect: [0, 0, 0, 0], // invisible — no visual appearance stream for this baseline (B-B) signature
    F: 4, // Print flag; keeps PDF viewers from rendering an odd empty box in interactive view
    T: PDFString.of(fieldName),
    V: sigRef,
    P: firstPage.ref,
  });
  const widgetRef = context.register(widgetDict);

  const existingAnnots = firstPage.node.Annots();
  if (existingAnnots) {
    existingAnnots.push(widgetRef);
  } else {
    firstPage.node.set(PDFName.of('Annots'), context.obj([widgetRef]));
  }

  const catalog = pdfDoc.catalog;
  const existingAcroForm = catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
  if (existingAcroForm) {
    const fields = existingAcroForm.lookupMaybe(PDFName.of('Fields'), PDFArray);
    if (fields) fields.push(widgetRef);
    else existingAcroForm.set(PDFName.of('Fields'), context.obj([widgetRef]));
    existingAcroForm.set(PDFName.of('SigFlags'), context.obj(3));
  } else {
    catalog.set(PDFName.of('AcroForm'), context.obj({
      Fields: [widgetRef],
      SigFlags: 3,
    }));
  }

  const saved = await pdfDoc.save({ useObjectStreams: false });
  const bytes = saved instanceof Uint8Array ? saved : new Uint8Array(saved);

  // Locate the placeholders we just wrote by their distinctive, fixed-width text. useObjectStreams:
  // false keeps every object as a plain, searchable indirect object (no compressed object streams).
  const text = uint8ArrayToBinaryString(bytes);
  // pdf-lib's array writer pads a space just inside each bracket: "[ 0 N N N ]", not "[0 N N N]".
  const byteRangeMarker = `[ 0 ${BYTE_RANGE_PLACEHOLDER_NUM} ${BYTE_RANGE_PLACEHOLDER_NUM} ${BYTE_RANGE_PLACEHOLDER_NUM} ]`;
  const byteRangeMarkerPos = text.indexOf(byteRangeMarker);
  if (byteRangeMarkerPos === -1) throw new Error('Nie udało się zlokalizować pola ByteRange w zapisanym dokumencie.');
  const byteRangeNumbersOffset = byteRangeMarkerPos + 4; // skip "[ 0 "

  const contentsHexRun = '0'.repeat(CONTENTS_RESERVED_BYTES * 2);
  const contentsHexStart = text.indexOf(contentsHexRun);
  if (contentsHexStart === -1) throw new Error('Nie udało się zlokalizować pola Contents w zapisanym dokumencie.');
  const contentsHexEnd = contentsHexStart + contentsHexRun.length;
  // Sanity check: the run of zeros found must actually be delimited by '<' and '>' immediately
  // around it — otherwise something unrelated (e.g. a coincidentally long run of zero bytes
  // inside binary stream content) was matched instead of our own placeholder.
  if (text[contentsHexStart - 1] !== '<' || text[contentsHexEnd] !== '>') {
    throw new Error('Nieoczekiwana zawartość wokół pola Contents — przerwano dla bezpieczeństwa.');
  }

  return { bytes, byteRangeNumbersOffset, contentsHexStart, contentsHexEnd };
}

function patchByteRangeAndDigestSpans(prepared: PreparedPdf): { patchedBytes: Uint8Array; digestSpans: Uint8Array } {
  const { bytes, byteRangeNumbersOffset, contentsHexStart, contentsHexEnd } = prepared;

  // ByteRange = [0, A, B, C] where [0,A) + [B,B+C) are hashed/signed, and [A,B) is the EXCLUDED
  // gap. Standard convention (matched here after an initial off-by-one found via independent
  // verification, see tests/pades-sign.mts): the gap covers the '<...>' delimited Contents value
  // INCLUDING both enclosing angle brackets, not just the hex digits between them — i.e. A is the
  // position of '<' itself, and B is one past '>'. A validator that computes the expected signed
  // length as (hexCharCount + 2 for the brackets) and compares it against the file size — as
  // pyhanko's evaluate_signature_coverage() does — only recognizes the signature as covering the
  // entire file under this exact convention.
  const a = contentsHexStart - 1; // position of '<'
  const b = contentsHexEnd + 1; // position right after '>'
  const c = bytes.length - b;

  const patched = bytes.slice();
  const fmt = (n: number) => String(n).padEnd(BYTE_RANGE_DIGIT_WIDTH, ' ');
  const patchText = `${fmt(a)} ${fmt(b)} ${fmt(c)}`;
  // patchText covers exactly the 3 placeholder numbers (each padded to BYTE_RANGE_DIGIT_WIDTH)
  // joined by single spaces, matching "9999999999 9999999999 9999999999" byte-for-byte in length.
  for (let i = 0; i < patchText.length; i++) {
    patched[byteRangeNumbersOffset + i] = patchText.charCodeAt(i);
  }

  const span1 = patched.subarray(0, a);
  const span2 = patched.subarray(b);
  const digestSpans = new Uint8Array(span1.length + span2.length);
  digestSpans.set(span1, 0);
  digestSpans.set(span2, span1.length);

  return { patchedBytes: patched, digestSpans };
}

// @types/node-forge declares authenticatedAttributes[].value as `string | undefined`, but
// forge's own runtime (lib/pkcs7.js _attributeToAsn1) requires a real Date object for the
// signingTime attribute (it calls Date comparison/formatting methods on it directly) — the
// community type declaration is simply wrong here, not a real API constraint.
interface ForgeAuthenticatedAttribute {
  type: string;
  value?: string | Date;
}

function buildDetachedCms(bundle: PadesCertBundle, digestSpans: Uint8Array, signingDate: Date): Uint8Array {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(uint8ArrayToBinaryString(digestSpans));
  for (const cert of bundle.certificateChain) p7.addCertificate(cert);
  // Safe: forge.pki.oids dot-access is widened to `string | undefined` by noUncheckedIndexedAccess
  // (see parsePkcs12 above) — these are well-known constant OID names forge always defines.
  const attributes: ForgeAuthenticatedAttribute[] = [
    { type: forge.pki.oids.contentType!, value: forge.pki.oids.data! },
    { type: forge.pki.oids.messageDigest! }, // value filled in by forge from p7.content's digest
    { type: forge.pki.oids.signingTime!, value: signingDate },
  ];
  p7.addSigner({
    key: bundle.privateKey,
    certificate: bundle.leafCertificate,
    digestAlgorithm: forge.pki.oids.sha256!,
    authenticatedAttributes: attributes as unknown as Array<{ type: string; value?: string }>,
  });
  p7.sign({ detached: true });
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return binaryStringToUint8Array(der);
}

/**
 * Signs a PDF with a PAdES-B-B (CAdES-detached) digital signature using the given .p12/.pfx
 * certificate. Entirely local — the PDF, the certificate and the password never leave the
 * browser. This produces a real, verifiable cryptographic signature, but not a legally
 * "qualified" one under eIDAS unless the certificate itself was issued as such by a Qualified
 * Trust Service Provider (this function has no way to know or change that — it just uses
 * whatever certificate it's given).
 */
export async function signPdfWithCertificate(
  pdfBytes: Uint8Array,
  p12Bytes: Uint8Array,
  password: string,
  opts: PadesSignOptions = {},
): Promise<Uint8Array> {
  const bundle = parsePkcs12(p12Bytes, password);
  const signingDate = new Date();

  const prepared = await buildPlaceholderPdf(pdfBytes, opts, signingDate);
  const { patchedBytes, digestSpans } = patchByteRangeAndDigestSpans(prepared);
  const cmsDer = buildDetachedCms(bundle, digestSpans, signingDate);

  const hex = Array.from(cmsDer).map(b => b.toString(16).padStart(2, '0')).join('');
  if (hex.length > CONTENTS_RESERVED_BYTES * 2) {
    throw new Error(`Podpis (${cmsDer.length} B) jest większy niż zarezerwowane miejsce (${CONTENTS_RESERVED_BYTES} B) — certyfikat ma zbyt długi łańcuch. Skontaktuj się z pomocą techniczną.`);
  }
  const hexPadded = hex + '0'.repeat(CONTENTS_RESERVED_BYTES * 2 - hex.length);

  const final = patchedBytes.slice();
  for (let i = 0; i < hexPadded.length; i++) {
    final[prepared.contentsHexStart + i] = hexPadded.charCodeAt(i);
  }
  return final;
}
