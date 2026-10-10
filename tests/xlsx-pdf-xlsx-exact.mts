// Excel → PDF → Excel: the workbook that comes back, compared with the one that went in, cell by
// cell and merge by merge. Measured before this change:
//   - EPZ_SIERPIEN_2026.xlsx (3 sheets): 137 of 1013 cells wrong — every word the PDF had to cut
//     at the end of a line came back in two pieces ("rozpoczęci a pracy", "obliczan ie"), and the
//     last column of Arkusz1, alone on its column pages, was dropped (7 columns → 6);
//   - a sheet of 14 columns (two column pages): 10 columns came back, 219 of 837 cells wrong,
//     37 merges → 22 — every column page starts at the left margin, so the reader took the second
//     for more rows of the first.
// The renderer now describes each page (which rows and columns of the sheet it shows, the grid,
// the merged cells) in the page itself — structure only, no cell content — and the reader uses
// that instead of what it can guess from the lines.
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFNumber } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('/')) {
    const f = join(ROOT, 'public', url);
    if (existsSync(f)) return new Response(new Uint8Array(readFileSync(f)), { status: 200 });
  }
  return originalFetch(input, init);
}) as typeof fetch;
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
const { xlsxToIR, renderSpreadsheetIRToPdf, renderIRSpreadsheetToXlsx, spreadsheetWrapText } = await import('../lib/client-pdf-docx.ts');
const { pdfToIRSpreadsheet } = await import('../lib/client-pdf.ts');
type IRSpreadsheet = import('../lib/client-pdf-docx.ts').IRSpreadsheet;
type IRSheet = import('../lib/client-pdf-docx.ts').IRSheet;
type Cell = import('../lib/client-pdf-docx.ts').IRSpreadsheetCell;

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const norm = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const mergeKey = (m: { row: number; col: number; rowspan: number; colspan: number }) => `r${m.row}c${m.col} ${m.rowspan}x${m.colspan}`;

interface Diff { cells: number; wrong: string[]; mergesOnlySource: string[]; mergesOnlyResult: string[]; dims: string }
function compare(src: IRSheet, back: IRSheet | undefined): Diff {
  const wrong: string[] = [];
  let cells = 0;
  const rows = Math.max(src.cells.length, back?.cells.length ?? 0);
  for (let r = 0; r < rows; r++) {
    const cols = Math.max(src.cells[r]?.length ?? 0, back?.cells[r]?.length ?? 0);
    for (let c = 0; c < cols; c++) {
      const want = norm(src.cells[r]?.[c]?.display), got = norm(back?.cells[r]?.[c]?.display);
      if (want === '' && got === '') continue;
      cells++;
      if (want !== got) wrong.push(`r${r}c${c} "${want.slice(0, 30)}" → "${got.slice(0, 30)}"`);
    }
  }
  const a = new Set(src.mergedRanges.map(mergeKey)), z = new Set((back?.mergedRanges ?? []).map(mergeKey));
  return {
    cells, wrong,
    mergesOnlySource: [...a].filter((k) => !z.has(k)), mergesOnlyResult: [...z].filter((k) => !a.has(k)),
    dims: `${back?.cells.length}x${back?.cells[0]?.length}`,
  };
}
/** xlsx (as IR) → PDF → the page's reader → an .xlsx file → read again, as a user would open it. */
async function roundTrip(ir: IRSpreadsheet): Promise<{ pdf: Uint8Array; back: IRSpreadsheet; source: string; warnings: string[] }> {
  const pdf = new Uint8Array(await (await renderSpreadsheetIRToPdf(ir)).arrayBuffer());
  const res = await pdfToIRSpreadsheet(Object.assign(new Blob([pdf.slice()]), { name: 'x.pdf' }) as unknown as File);
  const back = await xlsxToIR(Object.assign(await renderIRSpreadsheetToXlsx(res.spreadsheet), { name: 'b.xlsx' }) as unknown as File);
  return { pdf, back, source: res.source, warnings: res.warnings.map((w) => w.kind) };
}

console.log('=== lines of a cell: where a word ends and where it is cut ===');
{
  const measure = (t: string) => t.length * 5;
  const lines = spreadsheetWrapText('Godzina rozpoczęcia\npracy', 40, 10, measure);
  check(JSON.stringify(lines) === JSON.stringify(['Godzina ', 'rozpoczę', 'cia ', 'pracy']), `a line that ends a word ends with white space, a line cut inside a word does not (${JSON.stringify(lines)})`);
  check(JSON.stringify(spreadsheetWrapText('jedno', 100, 10, measure)) === '["jedno"]', 'a text that fits is unchanged');
}

console.log('\n=== a real workbook (EPZ_SIERPIEN_2026.xlsx) ===');
{
  const ir = await xlsxToIR(Object.assign(new Blob([readFileSync(join(ROOT, 'test-fixtures', 'EPZ_SIERPIEN_2026.xlsx'))]), { name: 'e.xlsx' }) as unknown as File);
  const rt = await roundTrip(ir);
  check(rt.source === 'sheet' && rt.back.sheets.length === 3 && rt.warnings.length === 0, `read as printed sheets: 3 sheets, no warnings (${rt.source}, ${rt.back.sheets.length}, ${JSON.stringify(rt.warnings)})`);
  let total = 0;
  ir.sheets.forEach((s, i) => {
    const d = compare(s, rt.back.sheets[i]);
    total += d.cells;
    check(d.wrong.length === 0, `${s.name}: all ${d.cells} cells come back as they were (${d.wrong.length} wrong ${d.wrong.slice(0, 2).join(' ; ')})`);
    check(d.mergesOnlySource.length === 0 && d.mergesOnlyResult.length === 0 && d.dims === `${s.cells.length}x${s.cells[0]!.length}`, `${s.name}: the same ${s.mergedRanges.length} merged cells on the same ${d.dims} grid (missing ${d.mergesOnlySource.slice(0, 3).join(', ') || 'none'}; extra ${d.mergesOnlyResult.slice(0, 3).join(', ') || 'none'})`);
  });
  check(total === 1013, `1013 cells compared (${total}; 137 of them were wrong before)`);
  check(norm(rt.back.sheets[0]!.cells[6]?.[6]?.display) === 'Dodatkowe informacje', 'the last column of Arkusz1, alone on its column pages, is there (it was dropped: 6 columns)');
  check(norm(rt.back.sheets[1]!.cells[6]?.[1]?.display) === 'Godzina rozpoczęcia pracy', 'a word cut at a line end is whole again ("Godzina rozpoczę cia pracy" before)');
}

console.log('\n=== a wide sheet: two column pages, merges across page boundaries ===');
for (const frozen of [false, true]) {
  const ROWS = 70, COLS = 14;
  const cells: (Cell | undefined)[][] = Array.from({ length: ROWS }, () => new Array<Cell | undefined>(COLS).fill(undefined));
  const merges: IRSheet['mergedRanges'] = [];
  const put = (r: number, c: number, text: string, cs = 1, rs = 1): void => {
    cells[r]![c] = { display: text, type: 'string', raw: text, colspan: cs, rowspan: rs, fmt: { wrap: true } };
    if (cs > 1 || rs > 1) merges.push({ row: r, col: c, rowspan: rs, colspan: cs });
  };
  for (let c = 0; c < COLS; c++) put(0, c, c === 0 ? 'Nr' : `Kolumna ${c} nieprzewidywalnie`); // a word wider than the column
  put(1, 0, '1');
  put(1, 1, 'Tytuł scalony przez wszystkie strony kolumn tego arkusza', COLS - 1, 1);
  for (let r = 2; r < ROWS; r++) {
    put(r, 0, String(r));
    for (let c = 1; c < COLS; c++) {
      if (c === 5 && r >= 4 && r < 64) { if ((r - 4) % 3 === 0) put(r, c, `grupa ${r} konstantynopolitańczykowianeczka`, 1, 3); continue; }
      // the last column, merged in blocks of four rows
      if (c === 13 && r >= 4 && r < 64) { if ((r - 4) % 4 === 0) put(r, c, `blok ${r}`, 1, 4); continue; }
      if (r === 10 && c === 7) { put(r, c, 'przez granicę stron kolumn', 4, 2); continue; }
      if ((r === 10 || r === 11) && c >= 7 && c <= 10) continue;
      if (r === 20 && c === 2) { put(r, c, 'pierwsza linia\ndruga linia'); continue; } // a typed line break
      if (c === 11 && r > 30) continue; // empty cells without borders
      put(r, c, c === 3 ? `wartość ${r}/${c}` : `${r}.${c}`);
    }
  }
  const sheet = { kind: 'sheet', name: 'Szeroki', cells, columnWidths: new Array(COLS).fill(8.43), mergedRanges: merges, ...(frozen ? { frozenRows: 1, frozenCols: 1 } : {}) } as IRSheet;
  const rt = await roundTrip({ kind: 'spreadsheet', sheets: [sheet] } as IRSpreadsheet);
  const d = compare(sheet, rt.back.sheets[0]);
  const label = frozen ? 'with a frozen row and column' : 'plain';
  check(rt.back.sheets.length === 1 && d.dims === `${ROWS}x${COLS}` && rt.warnings.length === 0, `${label}: one sheet of ${ROWS}x${COLS} comes back (${d.dims}; 70x10 with a "header-mismatch" warning before)`);
  check(d.wrong.length === 0, `${label}: all ${d.cells} cells are right (${d.wrong.length} wrong ${d.wrong.slice(0, 2).join(' ; ')}; 219 wrong before)`);
  check(d.mergesOnlySource.length === 0 && d.mergesOnlyResult.length === 0, `${label}: all ${merges.length} merges, including the title merged across both column pages and the block across their boundary (missing ${d.mergesOnlySource.slice(0, 3).join(', ') || 'none'}; extra ${d.mergesOnlyResult.slice(0, 3).join(', ') || 'none'}; 22 of 37 before)`);
  check(norm(rt.back.sheets[0]!.cells[20]?.[2]?.display) === 'pierwsza linia druga linia', 'a typed line break is still a break between two words');

  if (!frozen) {
    // What the pages say about themselves.
    const doc = await PDFDocument.load(rt.pdf);
    const infos = doc.getPages().map((p) => p.node.lookup(PDFName.of('OptimaSheetPage')));
    check(infos.every((i) => i instanceof PDFDict), `every page of the sheet carries its description (${infos.length} pages)`);
    const nums = (d0: PDFDict, key: string): number[] => { const a = d0.lookup(PDFName.of(key)); return a instanceof PDFArray ? a.asArray().map((v) => (v as PDFNumber).asNumber()) : []; };
    const firstCols = infos.map((i) => (i as PDFDict).lookup(PDFName.of('FirstColumn'), PDFNumber).asNumber());
    check([...new Set(firstCols)].join(',') === '0,10', `the two column pages are told apart by the sheet column they start at (${[...new Set(firstCols)].join(', ')}) — both start at the left margin`);
    const last = infos[infos.length - 1] as PDFDict;
    const pieces = nums(last, 'Merges');
    let fromLeft = 0;
    for (let i = 0; i < pieces.length; i += 5) if ((pieces[i + 4]! & 2) !== 0) fromLeft++;
    const anyLeft = infos.some((i) => { const m = nums(i as PDFDict, 'Merges'); for (let k = 4; k < m.length; k += 5) if ((m[k]! & 2) !== 0) return true; return false; });
    check(anyLeft, `the part of a merged cell on a later column page is drawn and declared as continuing from the left (it was not drawn at all: a hole in the grid; ${fromLeft} on the last page)`);
    const onlyNumbers = infos.every((i) => (i as PDFDict).entries().every(([, v]) => v instanceof PDFNumber || (v instanceof PDFArray && v.asArray().every((x) => x instanceof PDFNumber))));
    check(onlyNumbers, 'the description holds numbers only — no cell content');
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
