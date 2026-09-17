// Regression test for lib/pdf/padesSign.ts — client-side PAdES-B-B (CAdES-detached) digital
// signing. This does NOT trust the signing code's own internal state: it re-derives everything
// needed to verify the signature straight from the OUTPUT bytes (re-parses /ByteRange and
// /Contents from the raw file, recomputes the SHA-256 digest independently, and manually walks
// the CMS/PKCS#7 ASN.1 structure to pull out the signed attributes and signature bytes, then
// verifies with the certificate's public key) — none of it reuses padesSign.ts's internals.
//
// Note on forge's own pkcs7 module: it can only fully PARSE the `certificates` out of an
// existing SignedData — signerInfo parsing (`_signerFromAsn1`) references an ASN.1 validator
// (`signerInfoValidator`) that isn't actually defined in this version of the library, and
// `p7.verify()` is literally unimplemented ("PKCS#7 signature verification not yet
// implemented"). So this walks the raw ASN.1 tree from forge.asn1.fromDer() positionally
// instead, mirroring the exact, fixed-shape structure forge's OWN signing code
// (_signerToAsn1 in node_modules/node-forge/lib/pkcs7.js) writes: SignerInfo is a 6-element
// SEQUENCE [version, issuerAndSerialNumber, digestAlgorithm, authenticatedAttributes ([0]
// IMPLICIT), digestEncryptionAlgorithm, signature] whenever there are no unauthenticatedAttributes
// (which this code never adds).
//
// This was additionally verified once, ad hoc during development, against pyhanko (a completely
// independent Python implementation of PAdES/CAdES validation) — confirmed
// intact=True/valid=True/coverage=ENTIRE_FILE/bottom_line=True on a signed PDF, and
// intact=False/bottom_line=False on single-byte-tampered copies. That cross-implementation
// check isn't repeated here (no Python dependency in this test suite), but its result is why the
// ByteRange convention in padesSign.ts (the gap spans the '<...>' delimiters INCLUDING the angle
// brackets, not just the hex digits between them) is what it is — an earlier off-by-one there
// passed THIS test's own from-scratch verification too, since both sides used the same (wrong)
// convention; only cross-checking against pyhanko caught it.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import forge from 'node-forge';
import { signPdfWithCertificate } from '../lib/pdf/padesSign';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function generateTestP12(): { p12Bytes: Uint8Array; password: string; cert: forge.pki.Certificate } {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const attrs = [{ name: 'commonName', value: 'OptimaPDF Test Signer' }, { name: 'organizationName', value: 'OptimaPDF Test' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const password = 'test-password-123';
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, { algorithm: 'aes256' });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  const p12Bytes = new Uint8Array(p12Der.length);
  for (let i = 0; i < p12Der.length; i++) p12Bytes[i] = p12Der.charCodeAt(i) & 0xff;
  return { p12Bytes, password, cert };
}

async function buildTestPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 150]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('OptimaPDF PAdES regression test', { x: 20, y: 100, size: 12, font, color: rgb(0, 0, 0) });
  return doc.save();
}

interface VerifyResult {
  coversEntireFile: boolean;
  digestMatches: boolean;
  signatureValid: boolean;
}

/** Independently parses /ByteRange + /Contents from raw signed PDF bytes and verifies the CMS signature — a from-scratch re-derivation, not a reuse of padesSign.ts's internals. */
function independentlyVerify(signedPdf: Uint8Array, expectedCert: forge.pki.Certificate): VerifyResult {
  let text = '';
  for (let i = 0; i < signedPdf.length; i++) text += String.fromCharCode(signedPdf[i]!);

  const byteRangeMatch = text.match(/\/ByteRange\s*\[\s*0\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
  if (!byteRangeMatch) throw new Error('Verification failed: no /ByteRange found');
  const len1 = Number(byteRangeMatch[1]);
  const start2 = Number(byteRangeMatch[2]);
  const len2 = Number(byteRangeMatch[3]);

  const coversEntireFile = len1 + len2 + (start2 - len1) === signedPdf.length;

  const contentsMatch = text.slice(len1).match(/^<([0-9a-fA-F\s]*)>/);
  if (!contentsMatch) throw new Error('Verification failed: /Contents hex string not found at expected ByteRange gap start');
  const hex = contentsMatch[1]!.replace(/\s/g, '');
  let hexBin = '';
  for (let i = 0; i < hex.length; i += 2) hexBin += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));

  // The independently-recomputed content digest: SHA-256 over exactly the two ByteRange spans.
  const digestSpanBytes = new Uint8Array(len1 + len2);
  digestSpanBytes.set(signedPdf.subarray(0, len1), 0);
  digestSpanBytes.set(signedPdf.subarray(start2, start2 + len2), len1);
  let digestSpanBin = '';
  for (let i = 0; i < digestSpanBytes.length; i++) digestSpanBin += String.fromCharCode(digestSpanBytes[i]!);
  const actualDigest = forge.md.sha256.create().update(digestSpanBin).digest().toHex();

  // parseAllBytes: false — hexBin is the FULL reserved placeholder (real DER signature plus
  // trailing zero padding out to the reserved size), and forge.asn1.fromDer() otherwise
  // requires consuming every input byte. The DER object itself is self-delimiting by its own
  // length prefix, so anything after it (the padding) is simply ignored — exactly how a real
  // PDF viewer or validator (Adobe, pyhanko) also reads this field.
  const contentInfo = forge.asn1.fromDer(hexBin, { strict: true, parseAllBytes: false, decodeBitStrings: true });
  const signedDataSeq = contentInfo.value[1] as forge.asn1.Asn1; // [0] EXPLICIT content wrapper
  const signedData = (signedDataSeq.value as forge.asn1.Asn1[])[0]!; // the SignedData SEQUENCE itself
  const signedDataFields = signedData.value as forge.asn1.Asn1[];
  const signerInfos = signedDataFields[signedDataFields.length - 1]!; // always last, per forge's own writer
  const signerInfo = (signerInfos.value as forge.asn1.Asn1[])[0]!;
  const signerFields = signerInfo.value as forge.asn1.Asn1[];
  if (signerFields.length !== 6) {
    throw new Error(`Verification failed: expected a 6-element SignerInfo (with authenticatedAttributes, no unauthenticatedAttributes), got ${signerFields.length}`);
  }
  const authenticatedAttributesImplicit = signerFields[3]!;
  const signatureNode = signerFields[5]!;
  const signatureBytes = signatureNode.value as string;

  // Find the messageDigest attribute: each Attribute is SEQUENCE [OID, SET [value]].
  const attrNodes = authenticatedAttributesImplicit.value as forge.asn1.Asn1[];
  let claimedDigestHex: string | undefined;
  for (const attr of attrNodes) {
    const [oidNode, valueSet] = attr.value as forge.asn1.Asn1[];
    const oid = forge.asn1.derToOid((oidNode as forge.asn1.Asn1).value as string);
    if (oid === forge.pki.oids.messageDigest) {
      const valueNode = ((valueSet as forge.asn1.Asn1).value as forge.asn1.Asn1[])[0]!;
      claimedDigestHex = forge.util.bytesToHex(valueNode.value as string);
    }
  }
  if (!claimedDigestHex) throw new Error('Verification failed: no messageDigest attribute found');
  const digestMatches = claimedDigestHex === actualDigest;

  // Per RFC 5652 §5.4, the bytes that were actually signed are the DER encoding of the
  // attributes as a real UNIVERSAL SET (tag 0x31) — NOT the [0] IMPLICIT (tag 0xA0) form used
  // when embedding them in the SignerInfo. Re-tag a copy (same nested content) before hashing.
  const attrsAsUniversalSet: forge.asn1.Asn1 = {
    ...authenticatedAttributesImplicit,
    tagClass: forge.asn1.Class.UNIVERSAL,
    type: forge.asn1.Type.SET,
  };
  const attrsDer = forge.asn1.toDer(attrsAsUniversalSet).getBytes();
  const attrsHash = forge.md.sha256.create().update(attrsDer).digest().bytes();

  const publicKey = expectedCert.publicKey as forge.pki.rsa.PublicKey;
  let signatureValid: boolean;
  try {
    signatureValid = publicKey.verify(attrsHash, signatureBytes, 'RSASSA-PKCS1-V1_5');
  } catch {
    signatureValid = false;
  }

  return { coversEntireFile, digestMatches, signatureValid };
}

async function main() {
  console.log('=== PAdES signing: sign a real PDF with a freshly generated self-signed .p12 ===');
  const { p12Bytes, password, cert } = generateTestP12();
  const pdfBytes = await buildTestPdf();

  const signed = await signPdfWithCertificate(pdfBytes, p12Bytes, password, {
    reason: 'Test podpisu regresyjnego',
    location: 'Warszawa',
  });
  check(signed.length > pdfBytes.length, `signed PDF is larger than the original (${signed.length} vs ${pdfBytes.length} bytes)`);

  console.log('\n=== independent, from-scratch verification of the signed output ===');
  const result = independentlyVerify(signed, cert);
  check(result.coversEntireFile, 'ByteRange covers the entire file (no unexplained gaps)');
  check(result.digestMatches, 'independently recomputed SHA-256 digest matches the messageDigest attribute in the CMS');
  check(result.signatureValid, "RSA signature over the signed attributes verifies against the certificate's public key");

  console.log('\n=== negative control: tampering after signing must break verification ===');
  for (const offset of [50, 200, 400]) {
    const tampered = signed.slice();
    tampered[offset] = (tampered[offset]! ^ 0xff) & 0xff;
    const tamperedResult = independentlyVerify(tampered, cert);
    check(!tamperedResult.digestMatches, `flipping byte ${offset} is detected as a broken digest (digestMatches=false)`);
  }

  console.log('\n=== wrong password must fail cleanly, not silently produce a broken signature ===');
  try {
    await signPdfWithCertificate(pdfBytes, p12Bytes, 'wrong-password', {});
    check(false, 'signing with the wrong password throws');
  } catch (e) {
    check(e instanceof Error && e.message.length > 0, `signing with the wrong password throws a clear error (got: ${(e as Error).message})`);
  }

  console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
