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
  PDFDocument, PDFName, PDFString, PDFHexString, PDFDict, PDFArray, PDFRef, PDFNumber,
  type PDFContext, type PDFObject,
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

interface FileTail {
  /** Offset of the last cross-reference section (the value after the last "startxref"). */
  prev: number;
  /** The last section is a cross-reference stream (PDF 1.5+), not a classic table. */
  stream: boolean;
  /** /Size of the last trailer (one more than the highest object number ever used). */
  size: number;
}

function readTail(text: string): FileTail {
  const at = text.lastIndexOf('startxref');
  const m = at >= 0 ? /^startxref\s+(\d+)/.exec(text.slice(at, at + 40)) : null;
  if (!m) throw new Error('Nie udało się odczytać struktury pliku PDF (brak startxref).');
  const prev = Number(m[1]);
  const stream = !/^\s*xref/.test(text.slice(prev, prev + 20));
  const end = stream ? text.indexOf('stream', prev) : text.indexOf('trailer', prev);
  const dict = end < 0 ? '' : stream ? text.slice(prev, end) : text.slice(end, end + 4096);
  const size = Number(/\/Size\s+(\d+)/.exec(dict)?.[1] ?? 0);
  return { prev, stream, size };
}

function objectBytes(o: PDFObject): Uint8Array {
  const b = new Uint8Array(o.sizeInBytes());
  o.copyBytesInto(b, 0);
  return b;
}

const latin1 = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);

function consecutiveRuns(nums: number[]): number[][] {
  const out: number[][] = [];
  for (const n of nums) {
    const cur = out[out.length - 1];
    if (cur && cur[cur.length - 1] === n - 1) cur.push(n); else out.push([n]);
  }
  return out;
}

/**
 * Appends the changed objects to the original file as an incremental update (ISO 32000-1
 * §7.5.6) and returns the whole new file. Nothing before `original.length` changes, so the
 * signatures already in the file keep covering exactly the bytes they signed.
 */
function appendIncrementalUpdate(original: Uint8Array, context: PDFContext, changed: PDFRef[], tail: FileTail): Uint8Array {
  const chunks: Uint8Array[] = [original];
  let pos = original.length;
  const push = (b: Uint8Array) => { chunks.push(b); pos += b.length; };
  const last = original[original.length - 1];
  if (last !== 0x0a && last !== 0x0d) push(latin1('\n'));

  const offsets = new Map<number, { offset: number; gen: number }>();
  for (const ref of [...changed].sort((x, y) => x.objectNumber - y.objectNumber)) {
    offsets.set(ref.objectNumber, { offset: pos, gen: ref.generationNumber });
    push(latin1(`${ref.objectNumber} ${ref.generationNumber} obj\n`));
    push(objectBytes(context.lookup(ref)!));
    push(latin1('\nendobj\n'));
  }

  const trailer = context.obj({}) as PDFDict;
  const info = context.trailerInfo;
  if (info.Root) trailer.set(PDFName.of('Root'), info.Root);
  if (info.Info) trailer.set(PDFName.of('Info'), info.Info);
  if (info.ID) trailer.set(PDFName.of('ID'), info.ID);
  trailer.set(PDFName.of('Prev'), PDFNumber.of(tail.prev));

  const xrefOffset = pos;
  if (!tail.stream) {
    let xref = 'xref\n';
    for (const run of consecutiveRuns([...offsets.keys()])) {
      xref += `${run[0]} ${run.length}\n`;
      for (const n of run) {
        const e = offsets.get(n)!;
        xref += `${String(e.offset).padStart(10, '0')} ${String(e.gen).padStart(5, '0')} n \n`;
      }
    }
    trailer.set(PDFName.of('Size'), PDFNumber.of(Math.max(tail.size, context.largestObjectNumber + 1)));
    push(latin1(`${xref}trailer\n`));
    push(objectBytes(trailer));
    push(latin1(`\nstartxref\n${xrefOffset}\n%%EOF\n`));
  } else {
    // The file uses a cross-reference stream, so the update does too (an uncompressed one).
    const xrefNum = Math.max(tail.size, context.largestObjectNumber + 1);
    offsets.set(xrefNum, { offset: xrefOffset, gen: 0 });
    const nums = [...offsets.keys()].sort((x, y) => x - y);
    const data = new Uint8Array(nums.length * 7);
    nums.forEach((n, i) => {
      const { offset, gen } = offsets.get(n)!;
      data.set([1, (offset >>> 24) & 0xff, (offset >>> 16) & 0xff, (offset >>> 8) & 0xff, offset & 0xff, (gen >> 8) & 0xff, gen & 0xff], i * 7);
    });
    trailer.set(PDFName.of('Type'), PDFName.of('XRef'));
    trailer.set(PDFName.of('Size'), PDFNumber.of(xrefNum + 1));
    trailer.set(PDFName.of('Index'), context.obj(consecutiveRuns(nums).flatMap((run) => [run[0]!, run.length])));
    trailer.set(PDFName.of('W'), context.obj([1, 4, 2]));
    trailer.set(PDFName.of('Length'), PDFNumber.of(data.length));
    push(latin1(`${xrefNum} 0 obj\n`));
    push(objectBytes(trailer));
    push(latin1('\nstream\n'));
    push(data);
    push(latin1(`\nendstream\nendobj\nstartxref\n${xrefOffset}\n%%EOF\n`));
  }
  const out = new Uint8Array(pos);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

async function buildPlaceholderPdf(pdfBytes: Uint8Array, opts: PadesSignOptions, signingDate: Date): Promise<PreparedPdf> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
  if (pdfDoc.isEncrypted) throw new Error('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.');
  const context = pdfDoc.context;
  const catalogRef = context.trailerInfo.Root;
  if (!(catalogRef instanceof PDFRef)) throw new Error('Nie udało się odczytać struktury pliku PDF (brak katalogu).');

  // A certifying signature that allows no changes (DocMDP P=1): any further signature would
  // invalidate it, so the file is refused instead (ISO 32000-1 §12.8.2.2).
  const perms = pdfDoc.catalog.lookup(PDFName.of('Perms'));
  const docMdp = perms instanceof PDFDict ? perms.lookup(PDFName.of('DocMDP')) : undefined;
  const mdpRefs = docMdp instanceof PDFDict ? docMdp.lookup(PDFName.of('Reference')) : undefined;
  for (let i = 0; mdpRefs instanceof PDFArray && i < mdpRefs.size(); i++) {
    const r = mdpRefs.lookup(i);
    const params = r instanceof PDFDict ? r.lookup(PDFName.of('TransformParams')) : undefined;
    const p = params instanceof PDFDict ? params.lookup(PDFName.of('P')) : undefined;
    if (p instanceof PDFNumber && p.asNumber() === 1) {
      throw new Error('Dokument jest certyfikowany bez zgody na zmiany — kolejny podpis unieważniłby certyfikację.');
    }
  }

  // New objects get numbers above every number the file has ever used.
  const tail = readTail(uint8ArrayToBinaryString(pdfBytes));
  context.largestObjectNumber = Math.max(context.largestObjectNumber, tail.size - 1);

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

  // FINDING (2026-11-28) — the file used to be saved anew by pdf-lib, which renumbers and moves
  // every object: signing a PDF that already had a signature (a second signer, or this tool run
  // twice) silently broke the FIRST signature (pyhanko: intact=False), because the bytes it
  // covered were gone. The new objects, and only the existing objects that change, are now
  // appended as an incremental update, as every PDF signing program does. Which existing objects
  // change depends on whether /Annots, /AcroForm and /Fields are direct or indirect objects.
  const catalog = pdfDoc.catalog;
  const changed = new Set<PDFRef>([sigRef, widgetRef]);
  const annots = firstPage.node.get(PDFName.of('Annots'));
  const annotsArray = annots instanceof PDFRef ? context.lookup(annots) : annots;
  if (annotsArray instanceof PDFArray) {
    annotsArray.push(widgetRef);
    changed.add(annots instanceof PDFRef ? annots : firstPage.ref);
  } else {
    firstPage.node.set(PDFName.of('Annots'), context.obj([widgetRef]));
    changed.add(firstPage.ref);
  }
  const acroEntry = catalog.get(PDFName.of('AcroForm'));
  const acro = acroEntry instanceof PDFRef ? context.lookup(acroEntry) : acroEntry;
  if (acro instanceof PDFDict) {
    const fieldsEntry = acro.get(PDFName.of('Fields'));
    const fields = fieldsEntry instanceof PDFRef ? context.lookup(fieldsEntry) : fieldsEntry;
    if (fields instanceof PDFArray) {
      fields.push(widgetRef);
      if (fieldsEntry instanceof PDFRef) changed.add(fieldsEntry);
    } else {
      acro.set(PDFName.of('Fields'), context.obj([widgetRef]));
    }
    acro.set(PDFName.of('SigFlags'), context.obj(3));
    changed.add(acroEntry instanceof PDFRef ? acroEntry : catalogRef);
  } else {
    catalog.set(PDFName.of('AcroForm'), context.obj({ Fields: [widgetRef], SigFlags: 3 }));
    changed.add(catalogRef);
  }

  const bytes = appendIncrementalUpdate(pdfBytes, context, [...changed], tail);

  // Locate the placeholders we just wrote by their distinctive, fixed-width text — only in the
  // appended update, never in the original file.
  const text = uint8ArrayToBinaryString(bytes);
  // pdf-lib's array writer pads a space just inside each bracket: "[ 0 N N N ]", not "[0 N N N]".
  const byteRangeMarker = `[ 0 ${BYTE_RANGE_PLACEHOLDER_NUM} ${BYTE_RANGE_PLACEHOLDER_NUM} ${BYTE_RANGE_PLACEHOLDER_NUM} ]`;
  const byteRangeMarkerPos = text.indexOf(byteRangeMarker, pdfBytes.length);
  if (byteRangeMarkerPos === -1) throw new Error('Nie udało się zlokalizować pola ByteRange w zapisanym dokumencie.');
  const byteRangeNumbersOffset = byteRangeMarkerPos + 4; // skip "[ 0 "

  const contentsHexRun = '0'.repeat(CONTENTS_RESERVED_BYTES * 2);
  const contentsHexStart = text.indexOf(contentsHexRun, pdfBytes.length);
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
  const asn1 = p7.toAsn1();
  setOriginalIssuer(asn1, bundle.leafCertificate);
  const der = forge.asn1.toDer(asn1).getBytes();
  return binaryStringToUint8Array(der);
}

// FINDING (2026-11-28) — forge writes the signer's identifier (SignerInfo issuerAndSerialNumber)
// by re-encoding the issuer name from its parsed fields, and it UTF-8-encodes text that is
// already UTF-8: an issuer like "Urząd Testowy" came out as "Urzc384c285d…" bytes, so the
// identifier matched no certificate and every validator (pyhanko: "signer certificate not
// included in signature"; this site's verifier: 'no-cert') rejected the signature. Any
// certificate whose issuer name has a non-ASCII character was affected. The issuer is now copied
// from the certificate's own "to be signed" bytes, which forge keeps unchanged.
function setOriginalIssuer(contentInfo: forge.asn1.Asn1, cert: forge.pki.Certificate): void {
  const tbs = (cert as unknown as { tbsCertificate?: forge.asn1.Asn1 }).tbsCertificate;
  const fields = tbs && Array.isArray(tbs.value) ? (tbs.value as forge.asn1.Asn1[]) : null;
  if (!fields) return;
  const hasVersion = fields[0]?.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC;
  const issuer = fields[hasVersion ? 3 : 2];
  const signedData = ((contentInfo.value as forge.asn1.Asn1[])[1]?.value as forge.asn1.Asn1[] | undefined)?.[0];
  const parts = signedData?.value as forge.asn1.Asn1[] | undefined;
  const signerInfos = parts?.[parts.length - 1]?.value as forge.asn1.Asn1[] | undefined;
  for (const si of signerInfos ?? []) {
    const sid = (si.value as forge.asn1.Asn1[])[1];
    if (issuer && sid && Array.isArray(sid.value)) (sid.value as forge.asn1.Asn1[])[0] = issuer;
  }
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
