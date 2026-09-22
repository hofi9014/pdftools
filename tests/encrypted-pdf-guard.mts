// Audit finding (High, engine area) — every function in lib/client-pdf.ts that loads a PDF via
// `PDFDocument.load(buf, { ignoreEncryption: true })` — EXCEPT signPdfClient, which already had
// this exact guard — proceeded to manipulate and re-save the document with NO check that it was
// actually encrypted. Confirmed directly against pdf-lib's own source
// (node_modules/pdf-lib/cjs/api/PDFDocument.js): `ignoreEncryption: true` does nothing but
// suppress the "encrypted, can't proceed" throw — `isEncrypted = !!context.lookup(Encrypt)` is
// still computed and exposed, but pdf-lib has NO decryption logic anywhere. Every stream/string
// in a loaded encrypted PDF is still raw ciphertext bytes, indistinguishable to pdf-lib from
// ordinary content.
//
// Concrete, empirically-proven failure modes on real code paths:
//   - extractPages/reorderPages/mergePDFs/splitPDF/splitByRanges/splitBySelection all build a
//     BRAND NEW PDFDocument via copyPages() — the new document carries NO /Encrypt entry at all
//     (copyPages doesn't copy the trailer), but the copied page content streams are still the
//     original ciphertext. Result: the output PDF opens with NO PASSWORD PROMPT (looks totally
//     normal) but every page is garbled/blank, since ciphertext bytes get interpreted as PDF
//     drawing operators. Proven below by literally building an encrypted PDF, running it through
//     extractPages(), and confirming the resulting page's extracted text is NOT the original text.
//   - rotatePDF/cropPages/addPageNumbers/addWatermark/flattenPDF/addBlankPage/editMetadata/
//     compressPDFClient/convertToPdfA mutate the SAME document in place, so the original
//     /Encrypt trailer entry survives into the output — but any NEW content these functions draw
//     (page-number/watermark text, XMP metadata) is written by pdf-lib as plain, unencrypted PDF
//     operators. A compliant reader that decrypts the file with the correct password will still
//     try to decrypt EVERY stream per the document's /Encrypt dictionary, including this newly
//     added, never-actually-encrypted content — corrupting exactly the new content the tool
//     exists to add, while leaving the user with zero indication anything went wrong (the tool
//     reports success).
//
// Fixed by adding a single, consistent `if (pdf.isEncrypted) throw new Error('PDF jest
// zabezpieczony hasłem. Najpierw odblokuj dokument.')` guard — reusing the exact message
// signPdfClient already used — right after every one of these load calls, so the user gets a
// clear, actionable error instead of a silently corrupted "successful" download. getPageCount()
// is deliberately NOT guarded (it never touches stream content or writes anything out — a page
// count is safe to report even for an encrypted file). unlockPdfClient is deliberately NOT
// guarded — decrypting an encrypted PDF is that function's entire purpose.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  mergePDFs, splitPDF, rotatePDF, addPageNumbers, addWatermark, deletePages, extractPages,
  splitBySelection, reorderPages, cropPages, addBlankPage, editMetadata, flattenPDF,
  splitByRanges, compressPDFClient, convertToPdfA, getPageCount,
} from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(bytes: Uint8Array | Blob, name: string): File {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart]);
  return Object.assign(blob, { name }) as unknown as File;
}

async function buildEncryptedPdf(): Promise<{ file: File; originalText: string }> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([400, 400]);
  const originalText = 'Original Secret Content';
  page.drawText(originalText, { x: 50, y: 200, size: 20, font, color: rgb(0, 0, 0) });
  const plainBytes = await pdf.save();

  const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
  const encryptedBytes = await encryptPDF(new Uint8Array(plainBytes), 'test1234');
  return { file: toFile(encryptedBytes as Uint8Array, 'encrypted.pdf'), originalText };
}

async function expectRejected(label: string, fn: () => Promise<unknown>): Promise<void> {
  let threw = false;
  let message = '';
  try {
    await fn();
  } catch (e) {
    threw = true;
    message = (e as Error).message;
  }
  check(threw && message.includes('zabezpieczony hasłem'), `${label} rejects an encrypted PDF with a clear error (threw=${threw}, message=${JSON.stringify(message)})`);
}

console.log('=== Every manipulation function rejects an already-encrypted PDF with a clear error ===');
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('mergePDFs', () => mergePDFs([file]));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('splitPDF', () => splitPDF(file));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('rotatePDF', () => rotatePDF(file, 90));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('addPageNumbers', () => addPageNumbers(file));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('addWatermark', () => addWatermark(file, 'WM'));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('deletePages', () => deletePages(file, [0]));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('extractPages', () => extractPages(file, [0]));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('splitBySelection', () => splitBySelection(file, [0]));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('reorderPages', () => reorderPages(file, [0]));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('cropPages', () => cropPages(file, { top: 1, right: 1, bottom: 1, left: 1 }));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('addBlankPage', () => addBlankPage(file));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('editMetadata', () => editMetadata(file, { title: 'x' }));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('flattenPDF', () => flattenPDF(file));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('splitByRanges', () => splitByRanges(file, '1'));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('compressPDFClient', () => compressPDFClient(file, 'low'));
}
{
  const { file } = await buildEncryptedPdf();
  await expectRejected('convertToPdfA', () => convertToPdfA(file));
}

console.log('\n=== Permanent proof of WHY the guard matters: bypassing it reproduces silent corruption ===');
{
  // This reproduces, standalone and permanently (independent of any future change to
  // extractPages itself), exactly what the OLD unguarded code path did: load an encrypted PDF
  // with ignoreEncryption, then copyPages() into a fresh document with no /Encrypt entry — the
  // same pattern extractPages/reorderPages/mergePDFs/splitPDF/splitByRanges/splitBySelection all
  // used. Proves the claim in the header comment with an actual before/after text comparison,
  // not just "it throws now."
  const { file, originalText } = await buildEncryptedPdf();
  const buf = await file.arrayBuffer();
  const encryptedPdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  check(encryptedPdf.isEncrypted, 'sanity: the built fixture really is encrypted (isEncrypted === true)');

  const newPdf = await PDFDocument.create();
  const [copiedPage] = await newPdf.copyPages(encryptedPdf, [0]);
  newPdf.addPage(copiedPage);
  const corruptedBytes = await newPdf.save();

  const { register } = await import('node:module');
  const { pathToFileURL, fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  register('./_pdfjs_remap.mjs', pathToFileURL(join(here, '..', 'scripts') + '/'));
  const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

  let extractedText = '';
  let renderThrew = false;
  try {
    const doc = await pdfjsLib.getDocument({ data: corruptedBytes, useSystemFonts: false, standardFontDataUrl: join(here, '..', 'node_modules/pdfjs-dist/standard_fonts/') + '/' }).promise;
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    extractedText = content.items.map((it) => ('str' in it ? it.str : '')).join('');
  } catch {
    renderThrew = true;
  }

  check(
    renderThrew || !extractedText.includes(originalText),
    `bypassing the guard (the OLD code's exact pattern) produces a page that does NOT contain the real text "${originalText}" — either it fails to parse at all (renderThrew=${renderThrew}) or extracts garbage (got: ${JSON.stringify(extractedText.slice(0, 60))}) — this is the silent corruption the guard prevents`,
  );
}

console.log('\n=== Deliberately NOT guarded: getPageCount still works on an encrypted PDF ===');
{
  const { file } = await buildEncryptedPdf();
  const count = await getPageCount(file);
  check(count === 1, `getPageCount() does not reject an encrypted PDF — it never touches stream content (got ${count})`);
}

console.log('\n=== Regression guard: an ordinary, unencrypted PDF is completely unaffected ===');
{
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 400]);
  page.drawRectangle({ x: 10, y: 10, width: 50, height: 50 });
  const bytes = await pdf.save();
  const file = toFile(bytes, 'plain.pdf');

  const rotated = await rotatePDF(file, 90);
  check(rotated.length > 0, 'rotatePDF still works normally on a plain, unencrypted PDF');

  const numbered = await addPageNumbers(toFile(bytes, 'plain2.pdf'));
  check(numbered.length > 0, 'addPageNumbers still works normally on a plain, unencrypted PDF');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
