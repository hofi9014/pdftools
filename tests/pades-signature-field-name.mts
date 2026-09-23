// Audit finding (step 31, lib/pdf/padesSign.ts) — buildPlaceholderPdf() previously defaulted
// EVERY signature's AcroForm field name to the literal 'Signature1' with no collision check
// (components/sign-pdf/PadesSignForm.tsx never passes a custom fieldName, so every real signing
// through this tool's UI hits this default). Re-signing a PDF that was already signed once by
// this same tool — a realistic multi-signer flow, or simply running the tool twice on the same
// output — unconditionally pushed a SECOND top-level field also named 'Signature1' into
// AcroForm/Fields, producing two sibling fields with an identical fully-qualified name (violates
// ISO 32000's field-name-uniqueness expectation, makes by-name field lookup ambiguous for any
// consuming validator).
//
// Fixed with uniqueSignatureFieldName(catalog, baseName): walks the CURRENT AcroForm/Fields
// (present after a first real signing pass, since buildPlaceholderPdf already registered its
// widget there before this check runs on a second pass), collects existing /T names, and returns
// baseName unchanged or the first non-colliding "${baseName}2", "${baseName}3", ... suffix.
//
// This test signs a real PDF TWICE in sequence with signPdfWithCertificate() (the actual public
// entry point — not a copy of the algorithm) and inspects the resulting AcroForm's /Fields via a
// fresh PDFDocument.load() of the final bytes, exactly how any consuming tool would.

import { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFHexString, StandardFonts, rgb } from 'pdf-lib';
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

function generateTestP12(): { p12Bytes: Uint8Array; password: string } {
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
  return { p12Bytes, password };
}

async function buildTestPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 150]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('OptimaPDF PAdES field-name regression test', { x: 20, y: 100, size: 10, font, color: rgb(0, 0, 0) });
  return doc.save();
}

/** Reads all /T names off AcroForm/Fields from raw PDF bytes via a fresh pdf-lib load. */
async function readAcroFormFieldNames(pdfBytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(pdfBytes, { updateMetadata: false });
  const catalog = doc.catalog;
  const acroForm = catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
  const fields = acroForm?.lookupMaybe(PDFName.of('Fields'), PDFArray);
  const names: string[] = [];
  if (fields) {
    for (let i = 0; i < fields.size(); i++) {
      const fieldDict = catalog.context.lookupMaybe(fields.get(i), PDFDict);
      const t = fieldDict?.lookupMaybe(PDFName.of('T'), PDFString) ?? fieldDict?.lookupMaybe(PDFName.of('T'), PDFHexString);
      if (t) names.push(t.decodeText());
    }
  }
  return names;
}

async function main() {
  console.log('=== PAdES re-signing: second pass on an already-signed PDF must not duplicate the field name ===');
  const { p12Bytes, password } = generateTestP12();
  const original = await buildTestPdf();

  const signedOnce = await signPdfWithCertificate(original, p12Bytes, password, { reason: 'First signature' });
  const namesAfterFirst = await readAcroFormFieldNames(signedOnce);
  check(namesAfterFirst.length === 1, `after 1st signature, AcroForm has exactly 1 field (got ${namesAfterFirst.length}: ${JSON.stringify(namesAfterFirst)})`);
  check(namesAfterFirst[0] === 'Signature1', `1st signature's field is named "Signature1" (got ${JSON.stringify(namesAfterFirst[0])})`);

  const signedTwice = await signPdfWithCertificate(signedOnce, p12Bytes, password, { reason: 'Second signature' });
  const namesAfterSecond = await readAcroFormFieldNames(signedTwice);
  check(namesAfterSecond.length === 2, `after 2nd signature, AcroForm has exactly 2 fields (got ${namesAfterSecond.length}: ${JSON.stringify(namesAfterSecond)})`);

  const uniqueNames = new Set(namesAfterSecond);
  check(uniqueNames.size === namesAfterSecond.length, `all field names are distinct — no duplicate /T (got ${JSON.stringify(namesAfterSecond)})`);
  check(namesAfterSecond.includes('Signature1'), 'the original field "Signature1" is still present, untouched');
  check(namesAfterSecond.includes('Signature2'), `the second signature's field was renamed to "Signature2" to avoid collision (got ${JSON.stringify(namesAfterSecond)})`);

  console.log('\n=== a third signing pass continues the sequence (Signature3) ===');
  const signedThrice = await signPdfWithCertificate(signedTwice, p12Bytes, password, { reason: 'Third signature' });
  const namesAfterThird = await readAcroFormFieldNames(signedThrice);
  check(namesAfterThird.length === 3, `after 3rd signature, AcroForm has exactly 3 fields (got ${namesAfterThird.length}: ${JSON.stringify(namesAfterThird)})`);
  const uniqueNames3 = new Set(namesAfterThird);
  check(uniqueNames3.size === 3, `all 3 field names are distinct (got ${JSON.stringify(namesAfterThird)})`);
  check(namesAfterThird.includes('Signature3'), `the third signature's field was named "Signature3" (got ${JSON.stringify(namesAfterThird)})`);

  console.log('\n=== an explicit custom fieldName that collides is also disambiguated ===');
  const customBase = await buildTestPdf();
  const customSignedOnce = await signPdfWithCertificate(customBase, p12Bytes, password, { fieldName: 'MojPodpis' });
  const customSignedTwice = await signPdfWithCertificate(customSignedOnce, p12Bytes, password, { fieldName: 'MojPodpis' });
  const customNames = await readAcroFormFieldNames(customSignedTwice);
  check(customNames.length === 2 && new Set(customNames).size === 2, `custom fieldName "MojPodpis" used twice still yields 2 distinct names (got ${JSON.stringify(customNames)})`);
  check(customNames.includes('MojPodpis') && customNames.includes('MojPodpis2'), `disambiguation applies to custom names too (got ${JSON.stringify(customNames)})`);

  console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
