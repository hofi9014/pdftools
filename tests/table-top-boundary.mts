// PDF → Word/ODT/Excel: text standing just ABOVE a table was taken into it (finding C5_1).
//
// test-real-pdfs/epz_pptx_table_fixture.pdf (a schedule exported by LibreOffice) prints, above its
// table, a signature line "Imię i nazwisko pracownika" as one segment per spreadsheet column, then
// the title and an introduction set in 4.5 pt. Measured before the change:
//   - the segmented line (3 rects) stayed in the table's grid — only lines of 1-2 rects were let
//     go — so the table got a first "row" reaching up to it, and that row took the name line, the
//     title and the introduction into ONE cell spanning the table;
//   - the last word of the introduction ("zdalnej." / "zapobieganiem,") stands with its baseline
//     0.5-1.3 pt below the table's top border (only its descenders reach in), and the 5 pt
//     tolerance of the text-to-cell match put it into the header cell "Data czynności";
//   - once outside the table, that word was read AFTER the whole 105-row table, because a block
//     of text is placed by its baseline.
// The old note in AGENTS.md ("the cluster is too narrow on pages 2-3: 144.6 pt instead of 262 pt")
// was wrong: pages 2-3 really print a narrower table (checked on the rendered page) — the
// detector got their width right.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;

const { buildTableClusters, assignTextRunsToCells, extractFormattedTextFromPDF } = await import('../lib/client-pdf.ts');
const { blocksInReadingOrder } = await import('../lib/pdf/docxLayout.ts');
type RawRect = Parameters<typeof buildTableClusters>[0][number];
type GridCell = Parameters<typeof assignTextRunsToCells>[1][number];
type IRBlock = Parameters<typeof blocksInReadingOrder>[0][number];

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const H = 842;
const line = (x: number, y: number, w: number, h: number): RawRect => ({ x, y, width: w, height: h, fill: false, stroke: true });
// A 3 x 2 grid (top-down coordinates, like the detector's): columns at 50/100/150/200, rows at 100/150/200.
const grid: RawRect[] = [
  ...[50, 100, 150, 200].map((x) => line(x, 100, 0, 100)),
  ...[100, 150, 200].map((y) => line(50, y, 150, 0)),
];

console.log('\n=== a line drawn in pieces above the table is not part of its grid ===');
{
  const ruleInPieces = [line(50, 70, 50, 0), line(100, 70, 50, 0), line(150, 70, 50, 0)];
  const [c] = buildTableClusters([...grid, ...ruleInPieces]);
  check(c !== undefined && c.yEdges.length === 3 && Math.abs(c.yEdges[0]! - 100) < 1,
    `a signature line printed as one segment per column (3 rects) adds no row above the table (rows at ${c?.yEdges.map((v) => v.toFixed(0)).join(', ')})`);
  const [g] = buildTableClusters(grid);
  check(g !== undefined && g.cols === 3 && g.rows === 2, 'the grid alone is 3 x 2');
  // A second row of the table that only touches the grid still belongs to it.
  const [t] = buildTableClusters([...grid, line(50, 250, 150, 0), ...[50, 100, 150, 200].map((x) => line(x, 200, 0, 50))]);
  check(t !== undefined && t.rows === 3, `rows drawn against the table stay in it (${t?.rows} rows)`);
  // The same for a vertical line in pieces beside the table (a margin rule per row).
  const [v] = buildTableClusters([...grid, line(20, 100, 0, 50), line(20, 150, 0, 50), line(20, 200, 0, 30)]);
  check(v !== undefined && v.cols === 3 && Math.abs(v.xEdges[0]! - 50) < 1, `a vertical line in pieces beside the table adds no column (columns at ${v?.xEdges.map((x) => x.toFixed(0)).join(', ')})`);
}

console.log('\n=== text whose middle is above the top border does not go into the table ===');
{
  const [c] = buildTableClusters(grid);
  const cells: GridCell[] = [];
  for (let r = 0; r < 2; r++) for (let col = 0; col < 3; col++) cells.push({ row: r, col, rowspan: 1, colspan: 1, rect: line(50 + col * 50, 100 + r * 50, 50, 50) });
  // position.y is the PDF baseline; the detector's y grows downwards.
  const run = (text: string, x: number, baselineFromTop: number, size: number) =>
    ({ text, position: { x, y: H - baselineFromTop }, width: 20, height: size, fontSize: size, rotation: 0, bold: false, italic: false, color: '#000000', fontName: 'F' });
  const runs = [
    run('zapobieganiem,', 52, 101.3, 4.5), // baseline 1.3 pt into the table, letters above it
    run('zdalnej.', 52, 100.5, 4.5),
    run('Data', 55, 113.7, 4.5), // inside the first row
    run('tail', 55, 201, 10), // middle well above the bottom border: inside
    run('below', 55, 207, 4.5), // middle below the bottom border: outside
  ];
  const got = assignTextRunsToCells(runs as never, cells, c!.xEdges, c!.yEdges, H, true);
  const assigned = new Set(got.map((a) => runs[a.runIndex]!.text));
  check(!assigned.has('zapobieganiem,') && !assigned.has('zdalnej.'), `a 4.5 pt word standing on the top border stays out of the header cell (assigned: ${[...assigned].join(', ')})`);
  check(assigned.has('Data') && assigned.has('tail'), 'text inside the table still goes to its cells');
  check(!assigned.has('below'), 'text whose middle is below the bottom border stays out too');
}

console.log('\n=== reading order: such a line comes before the table ===');
{
  const para = (text: string, baselineFromTop: number, size: number, extra: Record<string, unknown> = {}): IRBlock =>
    ({ kind: 'paragraph', bounds: { x: 50, y: H - baselineFromTop, width: 60, height: 0 }, runs: [{ text, fontSize: size, position: { x: 50, y: H - baselineFromTop } }], ...extra }) as unknown as IRBlock;
  const table = { kind: 'table', bounds: { x: 50, y: 100, width: 150, height: 100 }, cells: [], columnWidths: [] } as unknown as IRBlock;
  const name = (b: IRBlock): string => (b.kind === 'table' ? 'TABLE' : (b as unknown as { runs: { text: string }[] }).runs.map((r) => r.text).join(''));
  const order = blocksInReadingOrder([para('intro', 90, 4.5), table, para('zapobieganiem,', 101.3, 4.5), para('inside', 140, 4.5), para('after', 230, 10)], H).map(name);
  check(order.join(' > ') === 'intro > zapobieganiem, > TABLE > inside > after', `a word over the top border is read before the table (${order.join(' > ')})`);
  const deep = blocksInReadingOrder([table, para('a line 3 pt into the table', 103, 4.5)], H).map(name);
  check(deep[0] === 'TABLE', 'a line whose letters are mostly inside the table stays after it');
  const dot = blocksInReadingOrder([table, { ...para('', 100.5, 4.5) } as IRBlock], H).map(name);
  check(dot[0] === 'TABLE', 'a block without text (a drawn bullet) is not moved');
}

console.log('\n=== the schedule fixture (epz_pptx_table_fixture.pdf) ===');
const fileOf = (rel: string): File => Object.assign(new Blob([new Uint8Array(readFileSync(join(ROOT, rel)))]), { name: 'x.pdf' }) as unknown as File;
const text = (b: IRBlock): string => ('runs' in b ? (b as unknown as { runs: { text: string }[] }).runs.map((r) => r.text).join('') : '');
const cellText = (b: IRBlock): string[] => (b.kind === 'table' ? (b as unknown as { cells: { runs: { text: string }[] }[][] }).cells.flat().map((c) => c.runs.map((r) => r.text).join('')) : []);
{
  const pages = await extractFormattedTextFromPDF(fileOf('test-real-pdfs/epz_pptx_table_fixture.pdf'));
  pages.forEach((pg, i) => {
    const order = blocksInReadingOrder(pg.blocks, pg.height);
    const t = order.findIndex((b) => b.kind === 'table');
    const table = order[t]!;
    const first = (table as unknown as { cells: { runs: { text: string }[] }[][] }).cells[0]!.map((c) => c.runs.map((r) => r.text).join('').replace(/\s+/g, ' ').trim());
    check(first[0] === 'Data czynności', `page ${i + 1}: the table's first row is its header, "Data czynności" alone in its cell ("${first[0]}")`);
    const cells = cellText(table).join(' ');
    check(!/Imię i nazwisko|Regulaminu|szczególnych/.test(cells), `page ${i + 1}: the name line, the title and the introduction are not inside the table`);
    const before = order.slice(0, t).map(text).join(' ');
    check(/Imię i nazwisko/.test(before) && (i === 0 ? /zdalnej\./.test(before) : /zapobieganiem,/.test(before)),
      `page ${i + 1}: they are read before the table, the last word of the introduction too`);
  });
}

console.log('\n=== the same schedule from another program (epz-report-variant2.pdf) ===');
{
  const pages = await extractFormattedTextFromPDF(fileOf('test-real-pdfs/epz-report-variant2.pdf'));
  const order = blocksInReadingOrder(pages[0]!.blocks, pages[0]!.height);
  const t = order.findIndex((b) => b.kind === 'table');
  check(!cellText(order[t]!).join(' ').includes('Załącznik nr 3'), 'the heading "Załącznik nr 3 do Regulaminu pracy zdalnej" is not a cell of the table');
  check(order.slice(0, t).map(text).join(' ').includes('Załącznik nr 3 do Regulaminu pracy zdalnej'), 'it is a paragraph read before the table');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
