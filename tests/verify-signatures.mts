// "Verify PDF signature" (plan 2.9) and the incremental re-signing fix in lib/pdf/padesSign.ts.
//
// The fixtures in test-fixtures/signatures/ were signed by pyhanko — an independent PAdES
// implementation — with test keys (scripts/build-signature-fixtures.py). pyhanko validated every
// one of them as intact and valid (its verdicts are printed by that script); this test expects
// lib/pdf/verifySignatures.ts to reach the same verdicts, and then breaks the files on purpose:
// a changed byte in the signed part, a changed signature value, a broken /ByteRange, an
// unsupported format. Signatures made by this site's own signer are checked too, including the
// one the fix is about: signing a PDF that already has a signature must keep the first one valid
// (before the fix the file was rewritten and the first signature broke — pyhanko: intact=False).
// Run: npm run test:verify-signatures
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import forge from 'node-forge';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const { verifyPdfSignatures } = await import('../lib/pdf/verifySignatures.ts');
const { signPdfWithCertificate } = await import('../lib/pdf/padesSign.ts');
const { parseDer, isSeq } = await import('../lib/pdf/der.ts');
const { pdfPageTexts } = await import('../lib/pdf/pdfPageTexts.ts');

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const fixture = (n: string) => new Uint8Array(readFileSync(join(ROOT, 'test-fixtures/signatures', n)));
const latin1 = (b: Uint8Array) => new TextDecoder('latin1').decode(b);
const TSA_TIME = '2026-11-28T10:00:00.000Z';

console.log('=== signatures made by pyhanko: the same verdicts ===');
const expected: [string, string, string][] = [
  ['rsa-chain-timestamp.pdf', 'RSA SHA-256', 'Jan Testowy (rsa)'],
  ['ecdsa-p256.pdf', 'ECDSA P-256 SHA-256', 'Jan Testowy (p256)'],
  ['ecdsa-p384-sha384.pdf', 'ECDSA P-384 SHA-384', 'Jan Testowy (p384)'],
  ['rsa-pss.pdf', 'RSA-PSS SHA-256', 'Jan Testowy (rsa)'],
  ['ed25519.pdf', 'Ed25519', 'Jan Testowy (ed25519)'],
];
for (const [file, alg, who] of expected) {
  const [s] = (await verifyPdfSignatures(fixture(file))).signatures;
  check(s?.status === 'valid' && s.signatureAlgorithm === alg && s.signer?.subject === who && s.coversWholeFile,
    `${file}: valid, ${alg}, signed by "${who}", covers the whole file (${s?.status} ${s?.signatureAlgorithm} ${s?.problem ?? ''})`);
  check(s?.chain.length === 3 && s.chain.every((l) => l.issuedByNext === true) && s.chain[2]!.cert.selfSigned && s.chain[2]!.cert.subject === 'OptimaPDF Test Root CA',
    `${file}: chain signer → intermediate → root, every link checked (${s?.chain.map((l) => `${l.cert.subject}:${l.issuedByNext}`).join(' > ')})`);
}
{
  const [s] = (await verifyPdfSignatures(fixture('rsa-chain-timestamp.pdf'))).signatures;
  check(s!.field === 'Podpis1' && s!.reason === 'Akceptuję treść umowy' && s!.location === 'Warszawa', `field name, reason and location are read (${s!.field}, ${s!.reason}, ${s!.location})`);
  check(s!.timestamp?.ok === true && s!.timestamp.time?.toISOString() === TSA_TIME && s!.timestamp.authority === 'OptimaPDF Test TSA', `the timestamp is checked: ${s!.timestamp?.time?.toISOString()} by ${s!.timestamp?.authority}`);
  check(s!.certValidAtSigning === true && s!.signer?.organization === 'Firma Testowa Sp. z o.o.' && s!.signer.issuer === 'OptimaPDF Test Intermediate CA', 'the certificate: organisation, issuer, valid at the timestamp');
  const [n] = (await verifyPdfSignatures(fixture('ecdsa-p256.pdf'))).signatures;
  check(n!.timestamp === undefined && n!.claimedTime instanceof Date, 'a signature without a timestamp has only the claimed time');
}
{
  const r = (await verifyPdfSignatures(fixture('two-signatures.pdf'))).signatures;
  check(r.length === 2 && r[0]!.field === 'Podpis1' && r[1]!.field === 'Podpis2' && r.every((s) => s.status === 'valid'), 'two signatures, in signing order, both valid');
  check(!r[0]!.coversWholeFile && r[1]!.coversWholeFile && r[0]!.signedLength < r[1]!.signedLength, 'the first covers its own version, the second the whole file');
  const c = (await verifyPdfSignatures(fixture('changed-after-signing.pdf'))).signatures[0]!;
  const file = fixture('changed-after-signing.pdf');
  check(c.status === 'valid' && !c.coversWholeFile && c.signedLength < file.length, 'changed after signing: the signature is valid for its version, which does not cover the whole file');
  check(/%%EOF\s*$/.test(latin1(file.subarray(0, c.signedLength))), 'the signed version ends at its own %%EOF (it can be cut out and opened)');
  const signedVersion = (await verifyPdfSignatures(file.slice(0, c.signedLength))).signatures[0]!;
  check(signedVersion.status === 'valid' && signedVersion.coversWholeFile, 'the cut-out signed version is itself a valid PDF covered whole by the signature');
  const cert = (await verifyPdfSignatures(fixture('certified.pdf'))).signatures[0]!;
  check(cert.kind === 'certification' && cert.permission === 1 && cert.status === 'valid', `a certification signature with "no changes allowed" (${cert.kind}, P=${cert.permission})`);
  const ts = (await verifyPdfSignatures(fixture('doc-timestamp.pdf'))).signatures[0]!;
  check(ts.kind === 'timestamp' && ts.status === 'valid' && ts.timestamp?.time?.toISOString() === TSA_TIME && ts.signer?.subject === 'OptimaPDF Test TSA', 'a document timestamp: valid, its time and authority');
  const ex = (await verifyPdfSignatures(fixture('expired-cert.pdf'))).signatures[0]!;
  check(ex.status === 'valid' && ex.certValidAtSigning === false, 'an expired certificate: the signature is intact, but the certificate was not valid when it was made');
}

console.log('\n=== broken on purpose ===');
const flip = (b: Uint8Array, at: number) => { const c = b.slice(); c[at] = c[at]! ^ 0x01; return c; };
{
  const src = fixture('rsa-chain-timestamp.pdf');
  const text = latin1(src);
  const at = text.indexOf('Umowa testowa nr 17');
  const t1 = (await verifyPdfSignatures(flip(src, at + 3))).signatures[0]!;
  check(t1.status === 'invalid' && t1.problem === 'digest', `one changed letter in the page text → invalid, "digest" (${t1.status} ${t1.problem})`);

  // The signer's signature value: the last OCTET STRING of the SignerInfo, inside the hex /Contents.
  const br = /\/ByteRange\s*\[\s*0\s+(\d+)\s+(\d+)/.exec(text)!;
  const hexStart = Number(br[1]) + 1;
  const der = Uint8Array.from(text.slice(hexStart, Number(br[2]) - 1).match(/../g)!.map((h) => parseInt(h, 16)));
  const ci = parseDer(der);
  const si = ci.children[1]!.children[0]!.children.at(-1)!.children[0]!;
  const sigVal = si.children.find((c, i) => i > 3 && c.tagNo === 4 && !c.constructed && c.cls === 0)!;
  const mutated = src.slice();
  const byteAt = sigVal.contentEnd - 5;
  const hexPos = hexStart + byteAt * 2;
  const v = parseInt(text.slice(hexPos, hexPos + 2), 16) ^ 0x10;
  mutated.set(new TextEncoder().encode(v.toString(16).padStart(2, '0')), hexPos);
  const t2 = (await verifyPdfSignatures(mutated)).signatures[0]!;
  check(t2.status === 'invalid' && t2.problem === 'signature', `one changed byte of the signature value → invalid, "signature" (${t2.status} ${t2.problem})`);

  // /ByteRange pointing one byte off the hex string.
  const m = /\/ByteRange\s*\[\s*0\s+(\d+)\s+(\d+)/.exec(text)!;
  const numAt = m.index + m[0].length - m[2]!.length;
  const off = src.slice();
  const shifted = String(Number(m[2]) + 1);
  if (shifted.length === m[2]!.length) off.set(new TextEncoder().encode(shifted), numAt);
  const t3 = (await verifyPdfSignatures(off)).signatures[0]!;
  check(t3.status === 'invalid' && t3.problem === 'byterange', `a /ByteRange that does not frame the signature → invalid, "byterange" (${t3.status} ${t3.problem})`);

  // A format this tool cannot check is never reported as valid.
  const sf = text.indexOf('/ETSI.CAdES.detached');
  const unsup = src.slice();
  unsup.set(new TextEncoder().encode('/adbe.x509.rsa_sha1 '), sf);
  const t4 = (await verifyPdfSignatures(unsup)).signatures[0]!;
  check(t4.status === 'unknown' && t4.problem === 'unsupported' && t4.detail === 'adbe.x509.rsa_sha1', `an unsupported format → "cannot be checked", not valid (${t4.status} ${t4.detail})`);
}

console.log('\n=== signatures made by this site ===');
function testP12() {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey; cert.serialNumber = '01';
  cert.validity.notBefore = new Date(Date.now() - 86_400_000); cert.validity.notAfter = new Date(Date.now() + 365 * 86_400_000);
  const attrs = [{ name: 'commonName', value: 'Zażółć Testowy', valueTagClass: forge.asn1.Type.UTF8 as unknown as number }];
  cert.setSubject(attrs); cert.setIssuer(attrs); cert.sign(keys.privateKey, forge.md.sha256.create());
  const der = forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], 'pw', { algorithm: 'aes256' })).getBytes();
  return { p12: Uint8Array.from(der, (c) => c.charCodeAt(0)), key: keys.privateKey, cert };
}
const { p12, key, cert } = testP12();
const doc = await PDFDocument.create();
doc.addPage([595, 842]).drawText('Umowa', { x: 50, y: 760, size: 20, font: await doc.embedFont(StandardFonts.Helvetica) });
const plain = await doc.save();
{
  const once = await signPdfWithCertificate(plain, p12, 'pw');
  const [s] = (await verifyPdfSignatures(once)).signatures;
  check(s?.status === 'valid' && s.coversWholeFile && s.signer?.subject === 'Zażółć Testowy' && s.signer.selfSigned, `our own signature: valid, whole file, self-signed certificate (${s?.status})`);
  const twice = await signPdfWithCertificate(once, p12, 'pw');
  const r = (await verifyPdfSignatures(twice)).signatures;
  check(r.length === 2 && r.every((x) => x.status === 'valid'), `signed again: BOTH signatures stay valid (${r.map((x) => `${x.field}:${x.status}${x.problem ? '/' + x.problem : ''}`).join(', ')})`);
  check(Buffer.compare(Buffer.from(twice.subarray(0, once.length)), Buffer.from(once)) === 0, 'the second signature only appends to the file — the first version is unchanged byte for byte');
  check(r[0]!.field === 'Signature1' && r[1]!.field === 'Signature2', 'the second field gets its own name');
  const third = await signPdfWithCertificate(fixture('two-signatures.pdf'), p12, 'pw');
  const r3 = (await verifyPdfSignatures(third)).signatures;
  check(r3.length === 3 && r3.every((x) => x.status === 'valid'), `a file with two pyhanko signatures signed by us: all three valid (${r3.map((x) => x.status).join(', ')})`);
  let msg = '';
  try { await signPdfWithCertificate(fixture('certified.pdf'), p12, 'pw'); } catch (e) { msg = (e as Error).message; }
  check(/certyfikowany bez zgody na zmiany/.test(msg), `a document certified with "no changes" is refused (${msg.slice(0, 50)})`);
}
{
  // A certificate issued by a CA whose name has Polish letters (UTF8String). forge used to write
  // the signer's identifier with that name UTF-8-encoded twice, so no validator found the
  // signer's certificate (pyhanko: "signer certificate not included in signature").
  const utf = (name: string, value: string) => ({ name, value, valueTagClass: forge.asn1.Type.UTF8 as unknown as number });
  const caKeys = forge.pki.rsa.generateKeyPair(2048);
  const ca = forge.pki.createCertificate();
  ca.publicKey = caKeys.publicKey; ca.serialNumber = '0a';
  ca.validity.notBefore = new Date(Date.now() - 86_400_000); ca.validity.notAfter = new Date(Date.now() + 365 * 86_400_000);
  const caName = [utf('organizationName', 'Urząd Certyfikacji Łódź'), utf('commonName', 'Test CA Ęą')];
  ca.setSubject(caName); ca.setIssuer(caName);
  ca.setExtensions([{ name: 'basicConstraints', cA: true }]);
  ca.sign(caKeys.privateKey, forge.md.sha256.create());
  const lk = forge.pki.rsa.generateKeyPair(2048);
  const leaf = forge.pki.createCertificate();
  leaf.publicKey = lk.publicKey; leaf.serialNumber = '00c3a1f0';
  leaf.validity.notBefore = ca.validity.notBefore; leaf.validity.notAfter = ca.validity.notAfter;
  leaf.setSubject([utf('commonName', 'Gęślą Jaźń')]); leaf.setIssuer(caName);
  leaf.setExtensions([{ name: 'keyUsage', digitalSignature: true, nonRepudiation: true }]);
  leaf.sign(caKeys.privateKey, forge.md.sha256.create());
  const der = forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(lk.privateKey, [leaf, ca], 'pw', { algorithm: 'aes256' })).getBytes();
  const signed = await signPdfWithCertificate(plain, Uint8Array.from(der, (ch) => ch.charCodeAt(0)), 'pw');
  const [s] = (await verifyPdfSignatures(signed)).signatures;
  check(s?.status === 'valid' && s.signer?.subject === 'Gęślą Jaźń' && s.signer.issuer === 'Test CA Ęą',
    `a certificate from a CA named with Polish letters: the signer is found, valid (${s?.status} ${s?.problem ?? ''} ${s?.signer?.issuer ?? ''})`);
  check(s?.chain.length === 2 && s.chain[0]!.issuedByNext === true, 'its chain: the CA really signed the certificate');
}
{
  // A real 27-page report (classic cross-reference table) and a file with a cross-reference stream.
  for (const f of ['allegro-raport.pdf', 'test_e.pdf']) {
    const src = new Uint8Array(readFileSync(join(ROOT, 'test-real-pdfs', f)));
    const two = await signPdfWithCertificate(await signPdfWithCertificate(src, p12, 'pw'), p12, 'pw');
    const r = (await verifyPdfSignatures(two)).signatures;
    const [a, b] = [await pdfPageTexts(src.slice()), await pdfPageTexts(two.slice())];
    check(r.length === 2 && r.every((x) => x.status === 'valid') && a.pages.length === b.pages.length && a.pages.every((t, i) => t === b.pages[i]),
      `${f} signed twice: both valid, ${b.pages.length} pages, the same text`);
  }
}
{
  // adbe.pkcs7.sha1: the signed content is the SHA-1 of the file, encapsulated in the signature.
  const once = await signPdfWithCertificate(plain, p12, 'pw');
  const text = latin1(once);
  const sf = text.indexOf('/ETSI.CAdES.detached');
  const doc2 = once.slice();
  doc2.set(new TextEncoder().encode('/adbe.pkcs7.sha1    '), sf);
  const [, a, b, c] = /\/ByteRange\s*\[\s*0\s+(\d+)\s+(\d+)\s+(\d+)/.exec(text)!.map(Number);
  const signedBytes = new Uint8Array(a! + c!);
  signedBytes.set(doc2.subarray(0, a!), 0); signedBytes.set(doc2.subarray(b!, b! + c!), a!);
  const make = (contentBytes: string) => {
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(contentBytes);
    p7.addCertificate(cert);
    p7.addSigner({ key, certificate: cert, digestAlgorithm: forge.pki.oids.sha256!, authenticatedAttributes: [{ type: forge.pki.oids.contentType!, value: forge.pki.oids.data! }, { type: forge.pki.oids.messageDigest! }] });
    p7.sign();
    const hex = forge.util.bytesToHex(forge.asn1.toDer(p7.toAsn1()).getBytes());
    const out = doc2.slice();
    out.set(new TextEncoder().encode(hex.padEnd(b! - a! - 2, '0')), a! + 1);
    return out;
  };
  const sha1 = forge.md.sha1.create(); sha1.update(forge.util.binary.raw.encode(signedBytes)); const good = sha1.digest().getBytes();
  const ok = (await verifyPdfSignatures(make(good))).signatures[0]!;
  check(ok.status === 'valid' && ok.subFilter === 'adbe.pkcs7.sha1', `adbe.pkcs7.sha1 with the right SHA-1 of the file: valid (${ok.status} ${ok.problem ?? ''})`);
  const bad = (await verifyPdfSignatures(make('x'.repeat(20)))).signatures[0]!;
  check(bad.status === 'invalid' && bad.problem === 'digest', `adbe.pkcs7.sha1 with another SHA-1: invalid, "digest" (${bad.status} ${bad.problem})`);
}

console.log('\n=== files without signatures ===');
{
  check((await verifyPdfSignatures(plain)).signatures.length === 0, 'an unsigned PDF has no signatures');
  const img = await PDFDocument.create();
  const pg = img.addPage([595, 842]);
  pg.drawText('Podpis:', { x: 50, y: 100, size: 12, font: await img.embedFont(StandardFonts.Helvetica) });
  pg.drawLine({ start: { x: 110, y: 100 }, end: { x: 220, y: 110 }, thickness: 2 });
  check((await verifyPdfSignatures(await img.save())).signatures.length === 0, 'a drawn signature is not a digital signature (none found)');
  const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
  const enc = await encryptPDF(new Uint8Array(plain), 'tajne');
  check((await verifyPdfSignatures(enc)).signatures.length === 0, 'an encrypted unsigned PDF is read without an error');
  check(isSeq(parseDer(Uint8Array.from([0x30, 0x80, 0x02, 0x01, 0x05, 0x00, 0x00])) ) , 'the DER reader handles indefinite lengths (BER)');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
