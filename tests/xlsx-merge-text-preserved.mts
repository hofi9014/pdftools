// PDF→Excel dropped the continuation lines of tall merged cells. A PDF splits the text of a merged
// cell over the rows it spans, so the schedule PDF's "Wprowadzanie" (row 7) and "czasu pracy,
// awizacje zał/rozł, bookowanie parkingów, uzupełnianie systemów, …" (row 9) are ONE merged cell in
// the source; the IR keeps both, but the writer wrote only the anchor because exceljs discards the
// value of every covered cell. Found by comparing the words of the download with pdf.js: 19 of 74
// distinct words (the whole activity description) were missing from the workbook.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import { pdfToIRSpreadsheet, pdfjsDocOptions } from '../lib/client-pdf.ts';
import { renderIRSpreadsheetToXlsx, type IRSheet, type IRSpreadsheet } from '../lib/client-pdf-docx.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const sharedStrings = async (blob: Blob): Promise<string[]> => {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file('xl/sharedStrings.xml')!.async('string');
  return (xml.match(/<si>[\s\S]*?<\/si>/g) ?? []).map((si) => si.replace(/<[^>]+>/g, ''));
};
const cell = (text: string) => ({ type: 'string', raw: text, display: text, inferred: false });

console.log('=== writer (hand-built sheet) ===');
{
  const sheet = {
    name: 'S',
    cells: [
      [cell('Wprowadzanie'), cell('A')],
      [undefined, cell('B')],
      [cell('czasu pracy,\n  awizacje'), cell('C')], // continuation line, covered by the merge
      [cell('inny'), cell('D')], // not covered
    ],
    columnWidths: [12, 8],
    mergedRanges: [{ row: 0, col: 0, rowspan: 3, colspan: 1 }],
  } as unknown as IRSheet;
  const strings = await sharedStrings(await renderIRSpreadsheetToXlsx({ sheets: [sheet] } as unknown as IRSpreadsheet));
  check(strings.includes('Wprowadzanie czasu pracy, awizacje'), `anchor + continuation in one cell, whitespace collapsed (${JSON.stringify(strings.filter((s) => /Wprow/.test(s)))})`);
  check(strings.includes('inny') && strings.includes('B') && strings.includes('C'), 'cells outside the merge are untouched');
  check(!strings.includes('czasu pracy, awizacje') && !strings.includes('Wprowadzanie'), 'no stray copy of the parts');
}

console.log('\n=== real pipeline: schedule PDF ===');
{
  const buf = readFileSync(join(ROOT, 'test-fixtures', 'xlsx_EPZ_SIERPIEN_2026.pdf'));
  const pdfjs = (await import('pdfjs-dist')) as typeof import('pdfjs-dist');
  const doc = await pdfjs.getDocument(pdfjsDocOptions(new Uint8Array(buf))).promise;
  let src = '';
  for (let p = 1; p <= doc.numPages; p++) src += ' ' + (await (await doc.getPage(p)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
  const words = (t: string) => t.toLowerCase().normalize('NFC').match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  const file = Object.assign(new Blob([buf]), { name: 's.pdf' }) as unknown as File;
  const res = await pdfToIRSpreadsheet(file);
  const ir = ((res as unknown as { spreadsheet?: IRSpreadsheet }).spreadsheet ?? res) as IRSpreadsheet;
  const strings = await sharedStrings(await renderIRSpreadsheetToXlsx(ir));
  const have = new Set(words(strings.join(' ')));
  const missing = [...new Set(words(src))].filter((w) => !have.has(w) && !/^arkusz\d$/.test(w)); // sheet names live in workbook.xml
  check(missing.length === 0, `every distinct word of the PDF is in a cell (missing: ${JSON.stringify(missing)})`);
  // The original Excel cell (EPZ_SIERPIEN_2026.xlsx). This assertion used to expect "Wprowadzanie
  // czasu pracy, …": the lines of the merge that fell into covered rows without a grid cell of
  // their own ("zleceń, obliczanie") were silently dropped, and the test encoded that lossy text.
  const GT = 'Wprowadzanie zleceń, obliczanie czasu pracy, awizacje zał/rozł, bookowanie parkingów, uzupełnianie systemów, uzupełnianie kontroli, raporty, nadzór nad przebiegiem tras';
  check(strings.includes(GT), 'the merged activity cell reads as the full original text');
  const zip = await JSZip.loadAsync(await (await renderIRSpreadsheetToXlsx(ir)).arrayBuffer());
  let full = 0, garbled = 0;
  for (const f of Object.keys(zip.files).filter((n) => /worksheets\/sheet\d+\.xml$/.test(n))) {
    const xml = await zip.file(f)!.async('string');
    for (const m of xml.matchAll(/<c [^>]*t="s"[^>]*><v>(\d+)<\/v>/g)) {
      const s = strings[Number(m[1])] ?? '';
      if (!s.startsWith('Wprow')) continue;
      if (s === GT) full++;
      else if (!GT.startsWith(s)) garbled++; // a prefix is a cell cut at a page break (no glue marker in this old fixture)
    }
  }
  check(full >= 60 && garbled === 0, `activity cells: ${full} complete, ${garbled} with lines missing from the middle (was 0 complete, 77 garbled)`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
