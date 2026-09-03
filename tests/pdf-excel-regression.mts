// Component 3.5 — formal pdf→excel round-trip regression harness.
//
// Durable, CI-runnable (no hand-verification). Runs the full pipeline on a
// committed fixture and hard-asserts the known-correct output. Exits non-zero
// with a readable diagnostic on any failed assertion, so it can be wired into
// CI (e.g. `ci`: `tsx tests/pdf-excel-regression.mts`).
//
// Pipeline: pdfToIRSpreadsheet → renderIRSpreadsheetToXlsx → .xlsx → xlsxToIR
//   and independent structural checks on both the recovered IR and the written
//   blob re-parsed by xlsxToIR.
//
// Hard-coded expected values below are the GROUND TRUTH established across
// Component 3.1–3.5 for test-fixtures/xlsx_EPZ_SIERPIEN_2026.pdf (36 pages).
//   - 3 sheets: Arkusz1/A2/F111=101 merges, Arkusz2/A3/G111=110, Arkusz3/A4/I111=110
//   - Arkusz3 I3 (SUM result) must survive the merge-collapse as 0 (regression
//     guard for the blank-anchor false-merge fix in renderIRSpreadsheetToXlsx).
//   - exactly ONE inferred number cell in the whole workbook (Arkusz3 I3 = 0);
//     a future heuristic that starts tagging more cells as numbers triggers a
//     failure here on purpose.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DOMParser } from '@xmldom/xmldom';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as PdfJsModule;
pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;
(globalThis as Record<string, unknown>).DOMParser = DOMParser;

import { pdfToIRSpreadsheet } from '../lib/client-pdf.ts';
import { renderIRSpreadsheetToXlsx, xlsxToIR } from '../lib/client-pdf-docx.ts';
import type { IRSheet, IRSpreadsheet } from '../lib/client-pdf-docx.ts';

const FIXTURE_PDF = join(ROOT, 'test-fixtures', 'xlsx_EPZ_SIERPIEN_2026.pdf');

// ---------------------------------------------------------------------------
// Tiny assertion harness: accumulate results, print PASS/FAIL per check, exit
// non-zero (1) if any check failed. Cross-platform exit via process.exitCode.
// ---------------------------------------------------------------------------
type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
function check(name: string, ok: boolean, detail?: string): void {
  checks.push({ name, ok, detail });
}

function sheetByName(ir: IRSpreadsheet, name: string): IRSheet {
  const s = ir.sheets.find((x) => x.name === name);
  if (!s) throw new Error(`sheet not found: ${name}`);
  return s;
}

async function main(): Promise<number> {
  const pdfBuf = readFileSync(FIXTURE_PDF);
  const pdfFile = new File([pdfBuf], 'x.pdf', { type: 'application/pdf' });

  // 1) pdfToIRSpreadsheet
  const { spreadsheet: ir } = await pdfToIRSpreadsheet(pdfFile);

  check('detect 3 sheets', ir.sheets.length === 3,
    `got ${ir.sheets.length}: ${ir.sheets.map((s) => s.name).join(', ')}`);

  // 2) renderIRSpreadsheetToXlsx → bytes
  const blob = await renderIRSpreadsheetToXlsx(ir);
  const bytes = Buffer.from(await blob.arrayBuffer());
  check('xlsx blob non-empty', bytes.length > 0, `${bytes.length} bytes`);

  // 3) re-open with xlsxToIR to (a) assert structure/dims, (b) assert the
  //    merge-collapse semantics — a false blank-anchor merge must not eat data.
  const xFile = new File([bytes], 'rt.xlsx',
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const rt = await xlsxToIR(xFile);

  const expectDims: { name: string; rows: number; cols: number; merges: number }[] = [
    { name: 'Arkusz1', rows: 111, cols: 6, merges: 101 },
    { name: 'Arkusz2', rows: 111, cols: 7, merges: 110 },
    { name: 'Arkusz3', rows: 111, cols: 9, merges: 110 },
  ];
  for (const e of expectDims) {
    const s = sheetByName(rt, e.name);
    const nRows = s.cells.length;
    const nCols = s.cells[0]?.length ?? 0;
    check(`${e.name}: rows`, nRows === e.rows, `expected ${e.rows}, got ${nRows}`);
    check(`${e.name}: cols`, nCols === e.cols, `expected ${e.cols}, got ${nCols}`);
    check(`${e.name}: mergedCells`, s.mergedRanges.length === e.merges,
      `expected ${e.merges}, got ${s.mergedRanges.length}`);
  }

  // 4) Arkusz3 I3 = the SUM result "0" must NOT be lost to merge-collapse.
  const a3 = sheetByName(rt, 'Arkusz3');
  const i3 = a3.cells[2]?.[8];
  check('Arkusz3 I3 = 0 (not None/lost)',
    i3 !== undefined && i3 !== null && String(i3.display) === '0' && i3.type === 'number',
    i3 ? JSON.stringify(i3) : 'undefined (cell missing)');

  // 5) No inferred-'number' cells anywhere except Arkusz3 I3. This guards the
  //    type heuristics: EPZ has dates/times/strings but only the SUM is a
  //    genuine number cell, so any future heuristic change that adds numbers
  //    fails here.
  const numberCells: string[] = [];
  for (const sheet of rt.sheets) {
    for (let r = 0; r < sheet.cells.length; r++) {
      const row = sheet.cells[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (cell && cell.type === 'number') {
          if (sheet.name === 'Arkusz3' && r === 2 && c === 8) continue; // I3 allowed
          numberCells.push(`${sheet.name} r${r}c${c}=${cell.display}`);
        }
      }
    }
  }
  check('exactly zero number cells beyond Arkusz3 I3', numberCells.length === 0,
    numberCells.length ? numberCells.join(', ') : 'none — OK');

  // Report
  console.log('=== pdf→excel round-trip regression: test-fixtures/xlsx_EPZ_SIERPIEN_2026.pdf ===');
  let allOk = true;
  for (const ck of checks) {
    const tag = ck.ok ? 'PASS' : 'FAIL';
    if (!ck.ok) allOk = false;
    console.log(`  [${tag}] ${ck.name}${ck.detail ? ` — ${ck.detail}` : ''}`);
  }
  console.log(`\n${allOk ? 'ALL PASS' : 'FAILURES PRESENT'}  (${checks.filter((c) => c.ok).length}/${checks.length} passed)`);
  return allOk ? 0 : 1;
}

process.exitCode = await main();

