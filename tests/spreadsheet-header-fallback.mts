// renderSpreadsheetIRToPdf, no <pane state="frozen"> fallback: previously ALWAYS repeated row 0 on
// continuation pages, so a sheet opening with a title row ("Załącznik nr 3 do...") repeated that
// title on every page instead of column names. Now row 0 is repeated only when it looks like a
// header row (>=2 non-empty, non-numeric cells covering >= half the columns). Reads the actual
// rendered pages back through pdf.js — page 2's topmost text line is what a reader would see.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

import * as docx from '../lib/client-pdf-docx.ts';
const { renderSpreadsheetIRToPdf } = docx;
const inferHeaderRowCount = (docx as { inferHeaderRowCount?: (s: IRSheet) => number }).inferHeaderRowCount ?? (() => -1);
import type { IRSheet, IRSpreadsheetCell, IRSpreadsheet } from '../lib/client-pdf-docx.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const s = (d: string): IRSpreadsheetCell => ({ display: d, type: 'string', raw: d, colspan: 1, rowspan: 1 });
const n = (v: number): IRSpreadsheetCell => ({ display: String(v), type: 'number', raw: v, colspan: 1, rowspan: 1 });
const empty = (): IRSpreadsheetCell => ({ display: '', type: 'empty', raw: null, colspan: 1, rowspan: 1 });

function sheetOf(firstRow: IRSpreadsheetCell[], extraTop: IRSpreadsheetCell[][] = []): IRSheet {
  const body: IRSpreadsheetCell[][] = [];
  for (let i = 0; i < 120; i++) body.push([s(`row${i}`), s(`val${i}`), s(`x${i}`)]);
  return { kind: 'sheet', name: 'S', cells: [firstRow, ...extraTop, ...body], columnWidths: [20, 20, 20], mergedRanges: [] };
}

const loadFont = async (name: string) => new Uint8Array(readFileSync(join(ROOT, 'public', 'pdfjs-dist', 'standard_fonts', name)));

async function pageTexts(sheet: IRSheet): Promise<string[][]> {
  const ir: IRSpreadsheet = { kind: 'spreadsheet', sheets: [sheet] };
  const blob = await renderSpreadsheetIRToPdf(ir, {}, loadFont);
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts: false }).promise;
  const pages: string[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    pages.push((tc.items as Array<{ str: string }>).map((i) => i.str).filter((t) => t.trim() !== ''));
  }
  return pages;
}

console.log('=== inferHeaderRowCount ===');
check(inferHeaderRowCount(sheetOf([s('Załącznik nr 3'), empty(), empty()])) === 0, 'lone title cell → 0');
check(inferHeaderRowCount(sheetOf([s('Name'), s('Qty'), s('Note')])) === 1, 'real column header → 1');
check(inferHeaderRowCount(sheetOf([s('Name'), n(5), s('Note')])) === 0, 'row with a number is data, not header → 0');
check(inferHeaderRowCount(sheetOf([s('Name'), empty(), empty()])) === 0, 'mostly empty row → 0');

console.log('\n=== rendered pages ===');
{
  const pages = await pageTexts(sheetOf([s('Załącznik nr 3'), empty(), empty()], [[s('ID'), s('Value'), s('Extra')]]));
  check(pages.length >= 2, `title-first sheet paginates (${pages.length} pages)`);
  check(pages[0]!.join(' ').includes('Załącznik'), 'page 1 shows the title once');
  check(pages.slice(1).every((p) => !p.join(' ').includes('Załącznik')), 'title row is NOT repeated on continuation pages');
}
{
  const pages = await pageTexts(sheetOf([s('Name'), s('Qty'), s('Note')]));
  check(pages.length >= 2 && pages.slice(1).every((p) => p.includes('Name') && p.includes('Qty')), 'genuine header row IS still repeated on every continuation page');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
