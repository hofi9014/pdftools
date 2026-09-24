// pdf→excel: bold/italic recovery. renderSpreadsheetIRToPdf embeds real LiberationSans
// Regular/Bold/Italic/BoldItalic, so the weight IS present in the PDF; this proves whether
// pdfToIRSpreadsheet surfaces it as cell.fmt after the round trip (AGENTS.md carried a stale
// 2026-09-03 FINDING claiming 0 bold / 0 italic).
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DOMParser } from '@xmldom/xmldom';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;
(globalThis as Record<string, unknown>).DOMParser = DOMParser;

import { pdfToIRSpreadsheet } from '../lib/client-pdf.ts';
import { renderSpreadsheetIRToPdf } from '../lib/client-pdf-docx.ts';
import type { IRSpreadsheet, IRSpreadsheetCell } from '../lib/client-pdf-docx.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const cell = (display: string, fmt?: { bold?: boolean; italic?: boolean }): IRSpreadsheetCell => ({
  display, type: 'string', raw: display, colspan: 1, rowspan: 1, fmt,
});

const ir: IRSpreadsheet = {
  kind: 'spreadsheet',
  sheets: [{
    kind: 'sheet', name: 'S1',
    cells: [
      [cell('Plain header'), cell('Bold header', { bold: true }), cell('Italic header', { italic: true })],
      [cell('alpha'), cell('beta'), cell('gamma')],
      [cell('BoldItalic cell', { bold: true, italic: true }), cell('delta'), cell('epsilon')],
    ],
    columnWidths: [20, 20, 20], mergedRanges: [],
  }],
};

const pdfBlob = await renderSpreadsheetIRToPdf(ir, {}, async (n) => new Uint8Array(readFileSync(join(ROOT, 'public', 'pdfjs-dist', 'standard_fonts', n))));
const file = new File([await pdfBlob.arrayBuffer()], 'bold.pdf', { type: 'application/pdf' });
const { spreadsheet } = await pdfToIRSpreadsheet(file);
const cells = spreadsheet.sheets[0]!.cells;
const find = (text: string) => cells.flat().find((c) => c?.display === text);

for (const [text, bold, italic] of [
  ['Plain header', false, false], ['Bold header', true, false], ['Italic header', false, true],
  ['BoldItalic cell', true, true], ['alpha', false, false],
] as const) {
  const c = find(text);
  check(!!c, `cell "${text}" recovered`);
  check((c?.fmt?.bold ?? false) === bold && (c?.fmt?.italic ?? false) === italic,
    `"${text}": bold=${c?.fmt?.bold ?? false} italic=${c?.fmt?.italic ?? false} (expected ${bold}/${italic})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
