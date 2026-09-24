// Merged table cells in PDF→Word/ODT. Rows list only the cells that START in them (that is what the
// .docx reader and the PDF renderer already assume), but the PDF extraction also emitted an empty
// placeholder for every grid position covered by a colspan/rowspan — so every merged row had more
// cells than the table has columns (variant2: 231 of 335 rows, e.g. 13 cells in a 7-column table),
// and an EMPTY merged cell lost its span. Checked on the real pipeline: every docx row must add up
// to the grid width, every ODT row must be full width once covered cells are counted, and the
// ODT writer's covered-cell logic is unit tested on a hand-built table.
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
import { pdfToWordIR, extractFormattedTextFromPDF } from '../lib/client-pdf.ts';
import { renderIRToOdt, type IRPageIR, type IRTableBlock, type IRTextRun } from '../lib/client-pdf-docx.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const pdfFile = (name: string) => Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', name))]), { name }) as unknown as File;
const FIXTURES = ['epz-report-variant2.pdf', 'epz_pptx_table_fixture.pdf', 'gpw-ebook.pdf', 'chrome-report.pdf'];

console.log('=== ODT writer: covered cells (hand-built table, 3 columns) ===');
{
  const run = (t: string): IRTextRun => ({ text: t, fontName: 'F', fontSize: 10, width: 10, height: 10, position: { x: 0, y: 0 }, color: '#000000', bold: false, italic: false, rotation: 0 });
  const cell = (t: string, colspan = 1, rowspan = 1) => ({ runs: t ? [run(t)] : [], colspan, rowspan });
  const table: IRTableBlock = {
    kind: 'table',
    cells: [
      [cell('A', 2, 2), cell('B')], // A covers cols 0-1 of rows 0-1
      [cell('C')], // row 1: cols 0-1 covered by A
      [cell('D'), cell('E'), cell('F')],
    ],
    bounds: { x: 0, y: 0, width: 300, height: 90 },
    columnWidths: [100, 100, 100],
  };
  const page: IRPageIR = { width: 595, height: 842, blocks: [table] };
  const xml = await (await JSZip.loadAsync(await (await renderIRToOdt([page], new Map())).arrayBuffer())).file('content.xml')!.async('string');
  const rows = xml.match(/<table:table-row>[\s\S]*?<\/table:table-row>/g) ?? [];
  const shape = (r: string) => (r.match(/<table:(covered-table-cell\/|table-cell[ >])/g) ?? []).map((m) => (m.startsWith('<table:covered') ? 'x' : 'c')).join('');
  check(rows.length === 3, 'three rows');
  check(shape(rows[0] ?? '') === 'cxc', `row 0: cell, covered (colspan), cell (got ${shape(rows[0] ?? '')})`);
  check(shape(rows[1] ?? '') === 'xxc', `row 1: two covered by the rowspan, then C (got ${shape(rows[1] ?? '')})`);
  check(shape(rows[2] ?? '') === 'ccc', `row 2: three plain cells (got ${shape(rows[2] ?? '')})`);
  check(/table:number-columns-spanned="2" table:number-rows-spanned="2"/.test(xml), 'the anchor keeps both spans');
}

console.log('\n=== real pipeline: every row adds up to the grid ===');
for (const f of FIXTURES) {
  const docx = await (await JSZip.loadAsync(await (await pdfToWordIR(pdfFile(f))).arrayBuffer())).file('word/document.xml')!.async('string');
  let rows = 0, bad = 0;
  for (const t of docx.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) ?? []) {
    const grid = (t.match(/<w:gridCol /g) ?? []).length;
    for (const tr of t.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? []) {
      rows++;
      let sum = 0;
      for (const tc of tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []) sum += Number(/<w:gridSpan w:val="(\d+)"/.exec(tc)?.[1] ?? 1);
      if (sum !== grid) bad++;
    }
  }
  check(rows > 0 && bad === 0, `${f} docx: ${rows} rows, ${bad} not equal to the grid width`);

  const pages = await extractFormattedTextFromPDF(pdfFile(f));
  const odt = await (await JSZip.loadAsync(await (await renderIRToOdt(pages, new Map())).arrayBuffer())).file('content.xml')!.async('string');
  let oRows = 0, oBad = 0;
  for (const t of odt.match(/<table:table>[\s\S]*?<\/table:table>/g) ?? []) {
    const grid = (t.match(/<table:table-column /g) ?? []).length;
    for (const tr of t.match(/<table:table-row>[\s\S]*?<\/table:table-row>/g) ?? []) {
      oRows++;
      if ((tr.match(/<table:(covered-table-cell\/|table-cell[ >])/g) ?? []).length !== grid) oBad++;
    }
  }
  check(oRows > 0 && oBad === 0, `${f} odt: ${oRows} rows, ${oBad} not full width`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
