// excel-to-pdf (xlsxToIR → renderSpreadsheetIRToPdf): text was lost or ran over its cell.
//   * A merged cell split by a page break lost at least one line of text (each piece has its
//     own top and bottom padding): 25 of 93 activity descriptions in EPZ_SIERPIEN_2026.xlsx ended
//     without "…nadzór nad przebiegiem tras". Page breaks now fall before such a cell when it
//     fits on a page by itself.
//   * A cell merged across two column fragments was sized for its full width but drawn in the
//     narrower visible part: rows now fit the narrowest visible part.
//   * Horizontal alignment and "wrap text" from styles.xml were not read: every cell was
//     left/right by type and every text wrapped. Now centred headers are centred, and text
//     without "wrap text" spills into empty cells to the right, like Excel.
//   * A line break typed in a cell (Alt+Enter) did not break the line, bold text was measured
//     as regular (and ran over the cell), and a word wider than its column ran over the next
//     cells; Excel breaks it between characters.
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';

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
const { xlsxToIR, renderSpreadsheetIRToPdf } = await import('../lib/client-pdf-docx.ts');
const pdfjs = await import('pdfjs-dist');
const {
  keepMergeTogether, spreadsheetMergeSpans, spreadsheetSpillCols, spreadsheetCoveredSlots, spreadsheetWrapText,
  spreadsheetRowHeightsPt, spreadsheetRowChunks, spreadsheetCellAlign, spreadsheetSplitTallRows,
} = await import('../lib/client-pdf-docx.ts');
type Sheet = Parameters<typeof spreadsheetMergeSpans>[0];
type Cell = NonNullable<Sheet['cells'][number][number]>;

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const cell = (display: string, extra: Partial<Cell> = {}): Cell => ({ display, type: display ? 'string' : 'empty', raw: display || null, colspan: 1, rowspan: 1, ...extra });
const sheetOf = (cells: (Cell | undefined)[][]): Sheet => ({ kind: 'sheet', name: 'S', cells, columnWidths: [], mergedRanges: [] });
const avg = (t: string, fs: number) => t.length * fs * 0.5;

console.log('=== page breaks keep merged cells together ===');
{
  // rows 0..9 of 20 pt, a 3-row merge at rows 4..6; a page of 110 pt would break before row 5.
  const cells: (Cell | undefined)[][] = Array.from({ length: 10 }, () => [cell('x')]);
  cells[4]![0] = cell('merged', { rowspan: 3 });
  cells[5]![0] = undefined; cells[6]![0] = undefined;
  const sh = sheetOf(cells);
  const chunks = spreadsheetRowChunks(sh, new Array(10).fill(20), 110, 0);
  check(chunks[0]!.end === 4, `the page ends before the merge instead of inside it (first page rows 0..${chunks[0]!.end - 1})`);
  check(keepMergeTogether([[4, 6]], 5, 0, new Array(10).fill(20), 110) === 4, 'keepMergeTogether moves the break to the merge start');
  check(keepMergeTogether([[4, 9]], 5, 0, new Array(10).fill(40), 110) === 5, 'a merge taller than a page is still split');
  check(keepMergeTogether([[0, 6]], 5, 0, new Array(10).fill(10), 110) === 5, 'a merge starting at the page start is not moved');
}

console.log('\n=== text spills into empty cells, like Excel ===');
{
  const sh = sheetOf([
    [cell('A long title without wrap text'), undefined, cell(''), cell('stop')],
    [cell('Wrapped', { fmt: { wrap: true } }), undefined, undefined, undefined],
    [cell('Centred', { fmt: { hAlign: 'center' } }), undefined, undefined, undefined],
    [cell('Merged', { colspan: 2 }), undefined, undefined, undefined],
    [cell('Before filled'), cell('', { fmt: { fillHex: 'FFFF00' } }), undefined, undefined],
  ]);
  const cov = spreadsheetCoveredSlots(sh);
  check(spreadsheetSpillCols(sh, cov, 0, 0, 4) === 2, 'a text cell runs over the two empty cells up to the next value');
  check(spreadsheetSpillCols(sh, cov, 0, 0, 2) === 1, 'it stops at the page edge');
  check(spreadsheetSpillCols(sh, cov, 1, 0, 4) === 0, '"wrap text" cells do not spill');
  check(spreadsheetSpillCols(sh, cov, 2, 0, 4) === 0, 'centred cells do not spill');
  check(spreadsheetSpillCols(sh, cov, 3, 0, 4) === 0, 'merged cells do not spill');
  check(spreadsheetSpillCols(sh, cov, 4, 0, 4) === 0, 'text does not run under a filled cell');
  const h = spreadsheetRowHeightsPt(sh, [40, 60, 60, 60], { fontSize: 10, lineH: 11, pad: 3, measure: avg });
  check(h[0] === 17, `the spilling row stays one line tall (${h[0]} pt)`);
  check(h[1]! > 17, 'a "wrap text" cell of the same width still wraps');
  check(spreadsheetCellAlign(sh.cells[2]![0]!) === 'center', 'the file alignment wins over the type default');
}

console.log('\n=== wrapping ===');
check(spreadsheetWrapText('Ewidencja\nza miesiąc LIPIEC', 500, 10, avg).length === 2, 'Alt+Enter starts a new line');
const long = spreadsheetWrapText('rozpoczęcia', 30, 10, avg);
check(long.length > 1 && long.join('') === 'rozpoczęcia', `a word wider than the cell is broken between characters (${long.join('|')})`);
check(spreadsheetWrapText('Bold words here', 60, 10, (t, fs, b) => t.length * fs * (b ? 0.7 : 0.4), true).length
  > spreadsheetWrapText('Bold words here', 60, 10, (t, fs, b) => t.length * fs * (b ? 0.7 : 0.4), false).length, 'bold text is measured as bold');

console.log('\n=== real file: EPZ_SIERPIEN_2026.xlsx ===');
const ir = await xlsxToIR(Object.assign(new Blob([readFileSync(join(ROOT, 'test-fixtures/EPZ_SIERPIEN_2026.xlsx'))]), { name: 'EPZ.xlsx' }) as unknown as File);
const hdr = ir.sheets[0]!.cells[6]![1]!;
check(hdr.fmt?.wrap === true && hdr.fmt?.hAlign === 'center', `styles.xml alignment is read (wrap ${hdr.fmt?.wrap}, align ${hdr.fmt?.hAlign})`);
const doc = await pdfjs.getDocument({ data: new Uint8Array(await (await renderSpreadsheetIRToPdf(ir)).arrayBuffer()) }).promise;
let text = '';
for (let p = 1; p <= doc.numPages; p++) text += (await (await doc.getPage(p)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join('');
const chars = (s: string) => { const m = new Map<string, number>(); for (const ch of s.replace(/\s+/g, '')) m.set(ch, (m.get(ch) ?? 0) + 1); return m; };
const want = chars(ir.sheets.flatMap((sh) => sh.cells.flatMap((row) => row.map((c) => c?.display ?? ''))).join(''));
const got = chars(text);
let lost = 0;
for (const [ch, n] of want) lost += Math.max(0, n - (got.get(ch) ?? 0));
check(lost === 0, `every character of every cell is in the PDF (${lost} missing)`);
const tras = (text.match(/tras/g) ?? []).length;
check(tras >= 93, `all 93 activity descriptions end with "…przebiegiem tras" (${tras})`);

console.log('\n=== font sizes and row heights from the file; rows taller than a page ===');
check(ir.defaultFontSize === 11, `the workbook default font size is read (${ir.defaultFontSize})`);
const sizes = new Set(ir.sheets.flatMap((sh) => sh.cells.flatMap((row) => row.map((c) => c?.fmt?.fontSize).filter((v) => v !== undefined))));
check(sizes.has(12) && sizes.has(9) && !sizes.has(11), `cell font sizes other than the default are read (${[...sizes].join(', ')})`);
check(ir.sheets[0]!.rowHeights?.[5] === 49.5, `a row height set in the file is read (row 6: ${ir.sheets[0]!.rowHeights?.[5]})`);
{
  const sh = { ...sheetOf([[cell('x')], [cell('y')], [cell('z')]]), rowHeights: [undefined, 80, 5] };
  const h = spreadsheetRowHeightsPt(sh, [60], { fontSize: 10, lineH: 11, pad: 3, measure: avg });
  check(h[1] === 80 && h[0] === 17 && h[2] === 17, `the file height is kept as a minimum, never cutting a row (${h.join(', ')})`);
  const split = spreadsheetSplitTallRows(sheetOf([[cell('a')], [cell('long', { rowspan: 1 })], [cell('b')]]), [17, 2006, 17], 500, 0, () => 11, 3);
  check(split.rowHt.length > 3 && split.rowHt.every((v) => v <= 500), `a row taller than the page becomes rows no taller than a page (${split.rowHt.map((v) => Math.round(v)).join(', ')})`);
  check(split.sheet.cells[1]![0]!.rowspan === split.rowHt.length - 2, 'its cell spans all of them');
}
const words = Array.from({ length: 1500 }, (_, i) => `word${i}`).join(' ');
const tallIr = { kind: 'spreadsheet' as const, defaultFontSize: 11, sheets: [{ ...sheetOf([
  [cell('Big title', { fmt: { fontSize: 22 } }), cell('Normal')],
  [cell(words, { fmt: { wrap: true } }), cell('next to the long text')],
  [cell('after'), cell('the end')],
]), columnWidths: [30, 30] }] };
const tallDoc = await pdfjs.getDocument({ data: new Uint8Array(await (await renderSpreadsheetIRToPdf(tallIr)).arrayBuffer()) }).promise;
let tallText = '';
let lowest = Infinity;
let bigSize = 0;
let normalSize = 0;
for (let p = 1; p <= tallDoc.numPages; p++) {
  for (const it of (await (await tallDoc.getPage(p)).getTextContent()).items) {
    if (!('str' in it) || !it.str.trim()) continue;
    tallText += ' ' + it.str;
    lowest = Math.min(lowest, it.transform[5]);
    if (it.str === 'Big title') bigSize = Math.abs(it.transform[3]);
    if (it.str === 'Normal') normalSize = Math.abs(it.transform[3]);
  }
}
check(Math.abs(bigSize - 20) < 0.5 && Math.abs(normalSize - 10) < 0.5, `a 22 pt cell is drawn at twice the default size (${bigSize.toFixed(1)} / ${normalSize.toFixed(1)} pt)`);
const missing = Array.from({ length: 1500 }, (_, i) => `word${i}`).filter((w) => !new RegExp(`\\b${w}\\b`).test(tallText));
check(tallDoc.numPages > 2 && missing.length === 0, `every word of a row taller than a page is drawn, over ${tallDoc.numPages} pages (${missing.length} missing)`);
check(lowest >= 49, `no text is drawn below the bottom margin (lowest baseline ${lowest.toFixed(1)})`);
check(/after/.test(tallText) && /the end/.test(tallText), 'the rows after it follow');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
