// pdf-to-excel: a PDF with no detectable table (pdfToIRSpreadsheet correctly returns sheets: []) was
// silently handed to renderIRSpreadsheetToXlsx, which wrote a workbook with ZERO <sheet> entries in
// xl/workbook.xml (no <sheets> element at all, no xl/worksheets/ directory) — not a valid OOXML
// spreadsheet (the spec requires at least one worksheet). exceljs and openpyxl both write/read it
// without complaint, but real Excel refuses to open it ("content causes a problem" / "file is
// damaged, attempt to repair?"). Reported directly by a user: "pdf do excel nie działa, Spis
// treści.pdf ... został użyty" — Spis treści.pdf is a children's-book table of contents with no
// genuine tabular structure, confirmed to produce sheets: [] and a resulting .xlsx that Excel
// rejects with exactly those two dialogs.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import { pdfToIRSpreadsheet } from '../lib/client-pdf.ts';
import { renderIRSpreadsheetToXlsx, type IRSpreadsheet } from '../lib/client-pdf-docx.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

console.log('=== pdf-to-excel: zero-sheet workbook is rejected, not silently written ===');

// 1. Direct unit case: the writer itself must refuse an empty sheet list.
{
  const empty: IRSpreadsheet = { kind: 'spreadsheet', sheets: [] };
  let threw = false;
  let message = '';
  try {
    await renderIRSpreadsheetToXlsx(empty);
  } catch (e) {
    threw = true;
    message = e instanceof Error ? e.message : String(e);
  }
  check(threw, 'renderIRSpreadsheetToXlsx({sheets: []}) throws instead of writing a file');
  check(message.includes('Nie wykryto żadnej tabeli'), `error message is the clear Polish notice (got: ${JSON.stringify(message)})`);
}

// 2. Real end-to-end path on an actual no-table PDF, exactly as the /pdf-to-excel page runs it.
{
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([400, 600]);
  page.drawText('Just a paragraph of prose.', { x: 40, y: 550, size: 12, font });
  page.drawText('No table anywhere on this page.', { x: 40, y: 530, size: 12, font });
  const bytes = await pdf.save();
  const file = new File([bytes as unknown as BlobPart], 'no-table.pdf', { type: 'application/pdf' });

  const { spreadsheet } = await pdfToIRSpreadsheet(file);
  check(spreadsheet.sheets.length === 0, `no-table PDF: pdfToIRSpreadsheet correctly finds zero sheets (got ${spreadsheet.sheets.length})`);

  let threw = false;
  try {
    await renderIRSpreadsheetToXlsx(spreadsheet);
  } catch {
    threw = true;
  }
  check(threw, 'full pdfToIRSpreadsheet -> renderIRSpreadsheetToXlsx path on a real no-table PDF throws, not downloads a broken file');
}

// 3. Regression guard: a real PDF WITH tables (the repo's own known-good round-trip fixture) still
// produces a genuinely valid, openable workbook — the guard must never reject a real table.
{
  const bytes = readFileSync(join(ROOT, 'test-fixtures/xlsx_EPZ_SIERPIEN_2026.pdf'));
  const file = new File([bytes as unknown as BlobPart], 'with-table.pdf', { type: 'application/pdf' });

  const { spreadsheet } = await pdfToIRSpreadsheet(file);
  check(spreadsheet.sheets.length > 0, `real-table PDF: pdfToIRSpreadsheet finds at least 1 sheet (got ${spreadsheet.sheets.length})`);

  const blob = await renderIRSpreadsheetToXlsx(spreadsheet);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const wbXml = (await zip.file('xl/workbook.xml')?.async('string')) ?? '';
  check(/<sheets>.*<sheet [^>]*\/>.*<\/sheets>/s.test(wbXml) || /<sheet [^>]*\/>/.test(wbXml),
    'real-table PDF: generated workbook.xml actually contains a <sheet> entry (still valid, unaffected by the guard)');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exitCode = fails === 0 ? 0 : 1;
