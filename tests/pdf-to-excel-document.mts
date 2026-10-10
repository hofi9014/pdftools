// PDF → Excel read every PDF as if this app's own Excel → PDF had printed it: only border LINES
// counted as cell borders, only the first table of a page was read, and whatever stood outside a
// table was dropped. Measured before this change, on PDFs from other programs:
//   - an invoice printed from a browser: "Worksheet name Faktura VAT nr FV/2026/10/0173 cannot
//     include any of the following characters" — no file at all;
//   - a schedule from LibreOffice: "Cannot merge already merged cells" (two sheets both named
//     "Arkusz" were written into one worksheet) — no file; its dates, centred in merged cells,
//     were assigned to no cell;
//   - the same schedule re-exported by another tool (cells drawn as filled rectangles): the whole
//     page in ONE cell of 8075 characters;
//   - a one-page report with a 4x4 table: 79 of 95 words missing from the workbook; a 12-page
//     e-book with one small table: 2 rows.
// Such PDFs are now written as one sheet in reading order (lib/pdf/pdfToSheet.ts).
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
import { pdfToIRSpreadsheet, pdfjsDocOptions, buildTableClusters, extractFormattedTextFromPDF, irCellFromText, type RawRect } from '../lib/client-pdf.ts';
import { renderIRSpreadsheetToXlsx, xlsxSheetName, type IRPageIR, type IRSheet, type IRSpreadsheet, type IRTextRun, type IRTableBlock } from '../lib/client-pdf-docx.ts';
import { pagesToSheet, lineSegments, runsToLines, columnAt } from '../lib/pdf/pdfToSheet.ts';
import { invoiceItems, invoiceTotals, fmtMoney } from '../e2e/fixtures/make-invoice-pdf.mts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const pdfFile = (rel: string): File => Object.assign(new Blob([new Uint8Array(readFileSync(join(ROOT, rel)))]), { name: 'x.pdf' }) as unknown as File;
const unesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

interface ReadSheet { name: string; cells: Map<string, string>; merges: string[]; rows: number; dimension: string }
/** The workbook as its XML says, without the library that wrote it. */
async function readWorkbook(blob: Blob): Promise<ReadSheet[]> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const ss = ((await zip.file('xl/sharedStrings.xml')?.async('string')) ?? '').match(/<si>[\s\S]*?<\/si>/g) ?? [];
  const strings = ss.map((si) => unesc(si.replace(/<[^>]+>/g, '')));
  const names = [...((await zip.file('xl/workbook.xml')!.async('string')).matchAll(/<sheet [^>]*name="([^"]*)"/g))].map((m) => unesc(m[1]!));
  const out: ReadSheet[] = [];
  const files = Object.keys(zip.files).filter((n) => /worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => Number(/(\d+)\.xml/.exec(a)![1]) - Number(/(\d+)\.xml/.exec(b)![1]));
  for (const [i, f] of files.entries()) {
    const xml = await zip.file(f)!.async('string');
    const cells = new Map<string, string>();
    for (const m of xml.matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const v = /<v>([\s\S]*?)<\/v>/.exec(m[3] ?? '')?.[1];
      if (v !== undefined) cells.set(m[1]!, /t="s"/.test(m[2] ?? '') ? strings[Number(v)] ?? '' : unesc(v));
    }
    out.push({
      name: names[i] ?? '', cells,
      merges: [...xml.matchAll(/<mergeCell ref="([^"]+)"/g)].map((m) => m[1]!),
      rows: (xml.match(/<row /g) ?? []).length,
      dimension: /<dimension ref="([^"]+)"/.exec(xml)?.[1] ?? '',
    });
  }
  return out;
}
const tokens = (t: string): string[] => t.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
function missingWords(source: string, have: string): string[] {
  const bag = new Map<string, number>();
  for (const w of tokens(have)) bag.set(w, (bag.get(w) ?? 0) + 1);
  const out: string[] = [];
  for (const w of tokens(source)) { const n = bag.get(w) ?? 0; if (n > 0) bag.set(w, n - 1); else out.push(w); }
  return out;
}
async function pdfText(rel: string): Promise<string> {
  const pdfjs = (await import('pdfjs-dist')) as typeof import('pdfjs-dist');
  const doc = await pdfjs.getDocument(pdfjsDocOptions(new Uint8Array(readFileSync(join(ROOT, rel))))).promise;
  let text = '';
  for (let p = 1; p <= doc.numPages; p++) text += ' ' + (await (await doc.getPage(p)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
  return text;
}
async function convert(rel: string): Promise<{ source: string; sheets: ReadSheet[]; blob: Blob }> {
  const res = await pdfToIRSpreadsheet(pdfFile(rel));
  const blob = await renderIRSpreadsheetToXlsx(res.spreadsheet);
  return { source: res.source, sheets: await readWorkbook(blob), blob };
}
const allText = (s: ReadSheet): string => [...s.cells.values()].join(' \n');

console.log('=== worksheet names ===');
{
  const used = new Set<string>();
  check(xlsxSheetName('Faktura VAT nr FV/2026/10/0173', used) === 'Faktura VAT nr FV 2026 10 0173', 'characters Excel forbids in a sheet name are replaced');
  check(xlsxSheetName('a'.repeat(50), used).length === 31, 'cut to the 31 characters Excel allows');
  check(xlsxSheetName('Arkusz', used) === 'Arkusz' && xlsxSheetName('arkusz', used) === 'arkusz (2)' && xlsxSheetName('Arkusz', used) === 'Arkusz (3)', 'a name already taken (in any case) gets a number');
  check(xlsxSheetName(" ['*?:] ", used) === 'Arkusz (4)', 'a name with nothing left falls back to "Arkusz"');
  const cell = (text: string) => ({ type: 'string', raw: text, display: text, colspan: 1, rowspan: 1 });
  const sheet = (name: string, text: string): IRSheet => ({ kind: 'sheet', name, cells: [[cell(text), undefined], [undefined, undefined]], columnWidths: [10, 10], mergedRanges: [{ row: 0, col: 0, rowspan: 2, colspan: 2 }] }) as unknown as IRSheet;
  let sheets: ReadSheet[] = [];
  let error = '';
  try { sheets = await readWorkbook(await renderIRSpreadsheetToXlsx({ kind: 'spreadsheet', sheets: [sheet('Arkusz', 'pierwszy'), sheet('Arkusz', 'drugi'), sheet('Cennik 10/2026: *nowy*', 'trzeci')] } as IRSpreadsheet)); } catch (e) { error = (e as Error).message; }
  check(error === '', `three sheets, two with the same name and one with forbidden characters, are written (${error || 'no error'}; "Cannot merge already merged cells" / "cannot include any of the following characters" before)`);
  check(sheets.length === 3 && sheets[0]?.cells.get('A1') === 'pierwszy' && sheets[1]?.cells.get('A1') === 'drugi' && sheets[2]?.cells.get('A1') === 'trzeci', `each keeps its own content (${sheets.map((s) => `${s.name}=${s.cells.get('A1')}`).join(', ')})`);
  check(new Set(sheets.map((s) => s.name.toLowerCase())).size === 3 && sheets.every((s) => !/[*?:\\/[\]]/.test(s.name)), 'the names are distinct and valid');
}

console.log('\n=== the table grid: what is not painted, and rules beside a table ===');
{
  const fill = (x: number, y: number, w: number, h: number): RawRect => ({ x, y, width: w, height: h, fill: true, stroke: false, fillColor: '#dddddd' });
  const clip = (x: number, y: number, w: number, h: number): RawRect => ({ x, y, width: w, height: h, fill: false, stroke: false });
  const table: RawRect[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) table.push(fill(50 + c * 100, 100 + r * 20, 100, 20));
  const dims = (rects: RawRect[]) => buildTableClusters(rects).map((c) => `${c.rows}x${c.cols}`).join(' ');
  check(dims(table) === '3x2', `six painted cells are a 3x2 table (${dims(table)})`);
  check(dims([clip(44, 100, 212, 600), ...table]) === '3x2', `a clipping rectangle around the page content adds no rows or columns (${dims([clip(44, 100, 212, 600), ...table])}; 4x4 before)`);
  check(dims([...table, fill(150, 175, 100, 0.7)]) === '3x2', `a rule under the table that shares its right edge is not part of the grid (${dims([...table, fill(150, 175, 100, 0.7)])}; 4x2 before)`);
  const holed = table.slice(0, 5);
  check(dims([...holed, clip(150, 140, 100, 20)]) === '3x2' && buildTableClusters([...holed, clip(150, 140, 100, 20)])[0]!.coverage === 1, 'a clip around a single cell without a border still counts as that cell');
}

console.log('\n=== lines, parts and columns (hand-built) ===');
{
  const run = (text: string, x: number, y: number, width: number, extra: Partial<IRTextRun> = {}): IRTextRun => ({ text, fontName: 'Arial', fontSize: 10, width, height: 10, position: { x, y }, color: '#000000', bold: false, italic: false, rotation: 0, ...extra });
  const seg = (runs: IRTextRun[]) => lineSegments(runs).map((s) => s.text);
  check(JSON.stringify(seg([run('Razem', 300, 50, 28), run(' ', 328, 50, 3), run('netto:', 331, 50, 28), run('1 234,00 zł', 480, 50, 55)])) === '["Razem netto:","1 234,00 zł"]', 'parts of a line standing far apart are separate cells');
  check(JSON.stringify(seg([run('P', 50, 50, 6), run('O', 56, 50, 7), run('Z', 63, 50, 6)])) === '["POZ"]', 'glyphs drawn one by one stay one word');
  check(JSON.stringify(seg([run('Termin', 50, 50, 30), run('płatności', 84, 50, 40)])) === '["Termin płatności"]', 'a word space the PDF did not draw is put back');
  check(JSON.stringify(seg([run('Cell A', 54, 50, 21), run('Merged', 54, 47, 29)])) === '["Cell A Merged"]', 'a text set over another one is a new word ("Cell AMerged" before)');
  check(runsToLines([run('a', 50, 100, 5), run('b', 60, 100, 5), run('c', 50, 88, 5)]).map((l) => l.length).join(',') === '2,1', 'runs are grouped into lines by their baseline');
  check([40, 50, 148, 149, 251, 400].map((x) => columnAt(x, [50, 150, 250])).join(',') === '0,0,1,1,2,2', 'a position maps to the column it stands in; right of the table = the next column');

  const cellOf = (text: string, x: number, y: number, span: Partial<{ colspan: number; rowspan: number; fill: string }> = {}) => ({ runs: text === '' ? [] : [run(text, x, y, text.length * 5)], colspan: 1, rowspan: 1, ...span });
  const table: IRTableBlock = {
    kind: 'table', bounds: { x: 50, y: 100, width: 300, height: 60 }, columnWidths: [100, 100, 100],
    cells: [
      [cellOf('Nazwa', 52, 730, { fill: 'DDE3EA' }), cellOf('Grupa', 152, 730), cellOf('Cena', 252, 730)],
      [cellOf('Papier', 52, 710), cellOf('Biuro', 152, 700, { rowspan: 2 }), cellOf('10,75', 320, 710)],
      [cellOf('Toner', 52, 690), cellOf('40,15', 320, 690)],
    ],
  };
  const page: IRPageIR = {
    width: 400, height: 842,
    blocks: [
      { kind: 'heading', level: 1, bounds: { x: 50, y: 780, width: 100, height: 14 }, runs: [run('Cennik', 50, 780, 40, { bold: true })] },
      table,
      { kind: 'paragraph', bounds: { x: 152, y: 650, width: 190, height: 10 }, runs: [run('Razem:', 152, 650, 32), run('50,90', 320, 650, 26)] },
      { kind: 'list-item', marker: '•', level: 0, bounds: { x: 60, y: 620, width: 60, height: 10 }, runs: [run('uwaga', 60, 620, 28)] },
    ],
  } as unknown as IRPageIR;
  const sheet = pagesToSheet([page], irCellFromText);
  const at = (r: number, c: number) => sheet.cells[r]?.[c]?.display;
  check(sheet.tables === 1 && sheet.cells.length === 6 && sheet.cells.every((r) => r.length === 3), `heading, three table rows, two text rows on a 3-column grid (${sheet.cells.length} rows)`);
  check(at(0, 0) === 'Cennik' && sheet.cells[0]![0]!.fmt?.bold === true, 'the heading is a bold cell in column A');
  check(at(2, 0) === 'Papier' && at(2, 1) === 'Biuro' && at(2, 2) === '10,75' && at(3, 0) === 'Toner' && at(3, 1) === undefined && at(3, 2) === '40,15', 'a row under a merged cell keeps its cells in their own columns');
  check(JSON.stringify(sheet.mergedRanges) === JSON.stringify([{ row: 2, col: 1, rowspan: 2, colspan: 1 }]), 'the merge is recorded at its place in the sheet');
  check(sheet.cells[1]![0]!.fmt?.fillHex === 'DDE3EA' && sheet.cells[2]![2]!.fmt?.hAlign === 'right' && sheet.cells[2]![1]!.fmt?.vAlign === 'middle', 'background, right-aligned amounts and the middle of a merged cell are kept');
  check(at(4, 1) === 'Razem:' && at(4, 2) === '50,90', 'a totals line under the table lands in the table\'s columns');
  check(at(5, 0) === '• uwaga', 'a list item keeps its marker');
}

console.log('\n=== an invoice printed from a browser (chrome-invoice.pdf) ===');
{
  const { source, sheets } = await convert('test-real-pdfs/chrome-invoice.pdf');
  const s = sheets[0]!;
  check(source === 'document' && sheets.length === 1, `read as a document, one sheet (${source}, ${sheets.length})`);
  check(s.dimension === 'A1:H48', `8 columns, 48 rows (${s.dimension})`);
  const missing = missingWords(await pdfText('test-real-pdfs/chrome-invoice.pdf'), allText(s));
  check(missing.length === 0, `every word of the PDF is in a cell (missing ${missing.length}: ${missing.slice(0, 8).join(' ')})`);
  const rowOf = (pred: (ref: string, v: string) => boolean): number => { for (const [ref, v] of s.cells) if (pred(ref, v)) return Number(/\d+/.exec(ref)![0]); return -1; };
  const cell = (col: string, row: number) => s.cells.get(col + row);
  let wrong = 0;
  const bad: string[] = [];
  for (const it of invoiceItems) {
    const r = rowOf((ref, v) => ref.startsWith('B') && v.startsWith(it.marker + ' '));
    const got = ['A', 'B', 'D', 'E', 'F', 'G', 'H'].map((c) => cell(c, r)).join('|');
    const want = [String(it.lp), `${it.marker} ${it.name}`, String(it.qty), 'szt.', fmtMoney(it.price), '23%', fmtMoney(it.gross)].join('|');
    if (got !== want) { wrong++; if (bad.length < 2) bad.push(`${got} ≠ ${want}`); }
  }
  check(wrong === 0, `all 34 items: number, the whole wrapped name in one cell, quantity, unit, price, VAT, value — each in its column (${wrong} wrong ${bad.join(' ; ')})`);
  const catRows = invoiceItems.filter((it) => it.category).map((it) => ({ it, r: rowOf((ref, v) => ref.startsWith('B') && v.startsWith(it.marker + ' ')) }));
  check(catRows.length === 4 && catRows.every(({ it, r }) => cell('C', r) === it.category && s.merges.includes(`C${r}:C${r + 2}`)), `a category merged over three rows, its text centred between them, is one merged cell with its text (${catRows.map(({ r }) => `C${r}:C${r + 2}`).join(' ')})`);
  const rabat = rowOf((_, v) => v.startsWith('RABAT'));
  check(s.merges.includes(`B${rabat}:F${rabat}`) && cell('H', rabat) === '-150,00' && cell('G', rabat) === '23%', 'the row merged across five columns keeps its merge and its amount');
  check(s.merges.length === 5, `no merges besides those five (${s.merges.join(' ')})`);
  const headers = [...s.cells].filter(([ref, v]) => ref.startsWith('A') && v === 'Lp.').length;
  check(headers === 2, `the header the browser repeats on page 2 is there twice, nothing else is (${headers})`);
  const net = rowOf((_, v) => v === 'Razem netto:');
  check(net > 0 && cell('H', net) === `${fmtMoney(invoiceTotals.net)} zł`, `the totals under the table: label and amount in one row, the amount under "Wartość brutto" (${cell('C', net)} | ${cell('H', net)})`);
  const seller = rowOf((_, v) => v === 'Sprzedawca');
  check(cell('A', seller) === 'Sprzedawca' && cell('C', seller) === 'Nabywca' && cell('A', seller + 1) === 'Hurtownia Biurowa Żółw sp. z o.o.' && cell('C', seller + 1) === 'Pracownia Projektowa Źródło', 'two address blocks side by side are two cells per line ("SprzedawcaNabywca" joined otherwise)');
  const pay = rowOf((_, v) => v.startsWith('Termin płatności'));
  check(cell('A', pay) === 'Termin płatności: 14 dni' && [...'BCDEFGH'].some((c) => cell(c, pay) === 'Sposób płatności: przelew'), 'two fields far apart on one line are two cells');
  check(cell('A', 1) === 'Faktura VAT nr FV/2026/10/0173' && s.name === 'Arkusz1', 'the title is the first row; the sheet has a valid name');

  // formatting, read back with the spreadsheet library
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await (await convert('test-real-pdfs/chrome-invoice.pdf')).blob.arrayBuffer());
  const ws = wb.worksheets[0]!;
  const fillOf = (ref: string): string | undefined => { const f = ws.getCell(ref).fill; return f && f.type === 'pattern' ? f.fgColor?.argb : undefined; };
  const head2 = [...s.cells].filter(([ref, v]) => ref.startsWith('A') && v === 'Lp.').map(([ref]) => Number(ref.slice(1)))[1]!;
  check(fillOf('A6') === 'FFDDE3EA' && fillOf(`A${head2}`) === 'FFDDE3EA', 'header cells carry their background');
  check(fillOf(`A${head2 + 1}`) === undefined && fillOf(`C${head2 + 1}`) === undefined, 'the row under the repeated header does not (it was shaded with the header\'s colour)');
  check(ws.getCell('B7').alignment?.wrapText === true && ws.getCell('H7').alignment?.horizontal === 'right' && ws.getCell('C7').alignment?.vertical === 'middle', 'wrapped names wrap, amounts stand right, the merged category sits in the middle');
  check((ws.getColumn(2).width ?? 0) > 3 * (ws.getColumn(1).width ?? 0), `column widths follow the table (${[1, 2, 3].map((c) => ws.getColumn(c).width?.toFixed(1)).join(', ')})`);

  const pages = await extractFormattedTextFromPDF(pdfFile('test-real-pdfs/chrome-invoice.pdf'));
  const t2 = pages[1]!.blocks.find((b) => b.kind === 'table') as IRTableBlock;
  check(t2.cells.length === 14 && t2.columnWidths.length === 8, `page 2: the table is 14 rows of 8 columns (${t2.cells.length}x${t2.columnWidths.length}; 16x11 with the page clip and the totals rule)`);
}

console.log('\n=== other programs\' PDFs ===');
{
  const lo = await convert('test-real-pdfs/epz_pptx_table_fixture.pdf');
  const dates = [...lo.sheets[0]!.cells.values()].filter((v) => /^\d{1,2}\/\d{1,2}\/2026$/.test(v)).length;
  check(lo.source === 'document' && lo.sheets.length === 1, 'a LibreOffice schedule converts ("Cannot merge already merged cells" before)');
  check(dates >= 30, `its dates, centred in cells merged over three or four rows, are in the sheet (${dates}; none of those before)`);
  check(missingWords(await pdfText('test-real-pdfs/epz_pptx_table_fixture.pdf'), allText(lo.sheets[0]!)).length === 0, 'and every word of it');

  const v2 = await convert('test-real-pdfs/epz-report-variant2.pdf');
  const lens = [...v2.sheets[0]!.cells.values()].map((v) => v.length);
  check(lens.length > 900 && Math.max(...lens) < 700, `a table drawn with filled rectangles is cells again: ${lens.length} cells, the longest ${Math.max(...lens)} characters (one cell of 8075 characters before)`);

  const rep = await convert('test-real-pdfs/chrome-report.pdf');
  const rs = rep.sheets[0]!;
  const row = [...rs.cells].find(([, v]) => v === 'Północ')![0].slice(1);
  check(missingWords(await pdfText('test-real-pdfs/chrome-report.pdf'), allText(rs)).length === 0, 'a report with one table: every word is in the sheet (79 of 95 missing before)');
  check(['A', 'B', 'C', 'D'].map((c) => rs.cells.get(c + row)).join('|') === 'Północ|120|135|150', 'its table row is four cells');

  const book = await convert('test-real-pdfs/gpw-ebook.pdf');
  check(book.sheets[0]!.rows > 200, `a 12-page e-book with one small table keeps its text (${book.sheets[0]!.rows} rows; 2 before)`);

  const lib = await convert('test-real-pdfs/test_e.pdf');
  check(lib.source === 'document' && [...lib.sheets[0]!.cells.values()].includes('Charlie'), 'a PDF made with pdf-lib that is not a printed sheet is read as a document');
}

console.log('\n=== sheets printed by this app are still reassembled ===');
{
  const own = await pdfToIRSpreadsheet(pdfFile('test-fixtures/xlsx_EPZ_SIERPIEN_2026.pdf'));
  check(own.source === 'sheet' && own.spreadsheet.sheets.length === 3 && own.spreadsheet.sheets.every((s) => s.cells.length === 111), `the printed workbook (rendered before the page marker existed) comes back as its three sheets of 111 rows (${own.source}, ${own.spreadsheet.sheets.map((s) => s.cells.length).join('/')})`);
  let message = '';
  try { await convert('test-real-pdfs/chrome-article.pdf'); } catch (e) { message = (e as Error).message; }
  check(/Nie wykryto żadnej tabeli/.test(message), 'a document without any table is still refused with a clear message');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
