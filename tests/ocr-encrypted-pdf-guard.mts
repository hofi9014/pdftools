// Audit finding (High, engine area) — ocrPdfClient() (lib/client-ocr.ts) was the one function
// missing the `if (pdf.isEncrypted) throw ...` guard that all 16 functions in lib/client-pdf.ts
// already got (see the "encrypted PDF" finding, 2026-09-22, tests/encrypted-pdf-guard.mts) — the
// scan that produced that fix was scoped to client-pdf.ts and never touched client-ocr.ts.
//
// The specific real-world scenario this matters for: a PDF encrypted with an OWNER password
// only (empty user password) — a common, legitimate case, e.g. a permission-restricted scan
// that still opens/renders with no password prompt. pdfjsLib.getDocument() (used a few lines
// above the fixed line, to drive the actual OCR render) opens and renders such a file with no
// password prompt at all, so execution reaches origPdf. newPdf.copyPages(origPdf, [pageIndex])
// then copies the original page's /Contents stream — still raw ciphertext, since pdf-lib never
// decrypts, it only skips the "encrypted, can't proceed" throw when ignoreEncryption is passed.
// The resulting saved PDF has no /Encrypt dict, so a normal viewer treats that ciphertext as
// literal (garbage) content-stream operators: the output PDF shows a blank/garbled page
// visually, but has a perfectly-positioned invisible, searchable OCR text layer floating over
// nothing — the opposite of what OCR is supposed to preserve (visible original + added
// searchability).
//
// Mounting the real ocrPdfClient() end-to-end needs pdfjs-dist + tesseract.js + a live
// canvas/worker — not practical to fully exercise in this test suite (same reasoning already
// documented in tests/ocr-worker-cleanup.mts for the same function). So this test proves the fix
// two ways: (1) a source-level check that the guard exists in the right place, right after
// origPdf is loaded and before newPdf is created; (2) a standalone reproduction of the EXACT
// corruption mechanism ocrPdfClient's page-copy step uses (PDFDocument.load with
// ignoreEncryption, then newPdf.copyPages(origPdf, [0])) — independent of OCR's own
// canvas/tesseract machinery, since the corruption comes entirely from copyPages() carrying
// forward still-encrypted content into an unencrypted document, not from anything OCR-specific
// — confirming the extracted text from the "OCR'd" page is NOT the original text, exactly the
// failure mode described above.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

console.log('=== source check: ocrPdfClient() guards against an encrypted origPdf ===');
{
  const src = readFileSync(join(ROOT, 'lib', 'client-ocr.ts'), 'utf-8');
  const loadIdx = src.indexOf('const origPdf = await PDFDocument.load(');
  check(loadIdx !== -1, 'found the origPdf load call in lib/client-ocr.ts');
  const newPdfIdx = src.indexOf('const newPdf = await PDFDocument.create();');
  check(newPdfIdx !== -1, 'found the newPdf.create() call in lib/client-ocr.ts');
  const between = loadIdx !== -1 && newPdfIdx !== -1 ? src.slice(loadIdx, newPdfIdx) : '';
  check(/if\s*\(\s*origPdf\.isEncrypted\s*\)\s*throw/.test(between), 'an `if (origPdf.isEncrypted) throw ...` guard sits between loading origPdf and creating newPdf');
}

console.log('\n=== standalone reproduction: the exact copyPages() corruption mechanism, on a real owner-password PDF ===');
{
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([400, 400]);
  const originalText = 'Original Secret Content';
  page.drawText(originalText, { x: 50, y: 200, size: 20, font, color: rgb(0, 0, 0) });
  const plainBytes = await pdf.save();

  // Owner-password-only: empty user password means the file opens with NO password prompt
  // (confirmed directly against pdf.js's own getDocument() in scratch verification before
  // writing this test), while pdf-lib still correctly reports isEncrypted=true.
  const encryptedBytes = await encryptPDF(new Uint8Array(plainBytes), '', { ownerPassword: 'owner123' });

  register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
  type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as PdfJsModule;
  const doc = await pdfjsLib.getDocument({ data: encryptedBytes.slice() }).promise;
  check(doc.numPages === 1, 'pdf.js opens the owner-password-only PDF with no password prompt (this is the real ocrPdfClient code path reaching origPdf)');

  // The exact corruption mechanism: load with ignoreEncryption, copyPages into a fresh,
  // unencrypted document — precisely what ocrPdfClient's page-copy loop does per page.
  const origPdf = await PDFDocument.load(encryptedBytes, { ignoreEncryption: true });
  check(origPdf.isEncrypted, 'pdf-lib correctly reports isEncrypted=true for this file');
  const newPdf = await PDFDocument.create();
  const [copiedPage] = await newPdf.copyPages(origPdf, [0]);
  newPdf.addPage(copiedPage!);
  const outputBytes = await newPdf.save();

  const reread = await PDFDocument.load(outputBytes);
  check(!reread.isEncrypted, 'the OLD, unguarded pattern\'s output PDF has NO /Encrypt dict — opens with no password prompt, looks normal');

  const outDoc = await pdfjsLib.getDocument({ data: outputBytes.slice() }).promise;
  const outPage = await outDoc.getPage(1);
  const content = await outPage.getTextContent();
  const extractedText = content.items.map((i) => ('str' in i ? i.str : '')).join('');
  check(extractedText !== originalText, `OLD, unguarded pattern corrupts the page: extracted text ("${extractedText}") is NOT the original ("${originalText}") — ciphertext was interpreted as PDF operators`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
