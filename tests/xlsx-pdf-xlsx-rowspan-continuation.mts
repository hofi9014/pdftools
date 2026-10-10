// Cross-page rowspans in the pdf-to-excel round trip: catastrophic row loss (H=0), a writer
// content gap, and the confirmed-continuation glue, all covering the same underlying fix.
//
// Investigating the long-deferred "cross-page rowspans are never glued" item (see AGENTS FINDING
// "pdf-to-excel round-trip, cross-page rowspans NOT recovered") surfaced a much bigger, previously
// unknown, currently-live regression: `renderSpreadsheetIRToPdf`'s pagination loop only ever looks
// up a cell by its OWN anchor row within the CURRENT chunk's row range, so a rowspan cell whose
// anchor sits on an EARLIER page simply vanishes once its remaining rows fall past a page break —
// no border, no text, nothing drawn. And separately, `buildFragmentGrid`'s continuation-matching
// used `commonPrefixLen(anchor, page) === 0` as an automatic "unrelated table, discard everything"
// signal — correct back when the frozen-header fallback always repeated row 0 (so a REAL
// continuation always shared at least that much), but the 2026-09-24 fix that made
// `inferHeaderRowCount` correctly decline to repeat a plain title (H=0) means a genuine
// continuation page now legitimately shares NOTHING with the anchor's row 0 — so EVERY sheet
// without real frozen panes discarded every page after the first mismatch, from that fix onward.
// Both bugs were invisible to the existing `tests/pdf-excel-regression.mts` because it reads a
// STATIC, already-rendered fixture from disk that predates both the header-fallback fix and this
// one — regenerating it fresh (this test does exactly that, from the same source .xlsx) reproduces
// the failure directly. Fixed together: `renderSpreadsheetIRToPdf` now draws the carry-over
// remainder of a split cell (continuing its wrapped lines, not repeating them) and leaves a
// confirmation marker (a non-standard page-dict entry, ROWSPAN_CONTINUES_KEY) that ONLY this
// renderer writes; `buildFragmentGrid` only treats common===0 as an error once it has actually
// observed a repeating header on this fragment, and glues a split rowspan into one merge only when
// the marker confirms it — any PDF lacking the marker (every third-party PDF, and this app's own
// PDFs before the marker existed) keeps the old conservative "warn, never glue" behaviour exactly.
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';
import { PDFArray, PDFDocument, PDFName } from 'pdf-lib';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

// renderSpreadsheetIRToPdf fetches its embedded fonts via `fetch('/pdfjs-dist/...')`; serve them
// from disk under Node (same pattern as the other tests that render spreadsheets to PDF).
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('/')) {
    const filePath = join(ROOT, 'public', url);
    if (existsSync(filePath)) return new Response(new Uint8Array(readFileSync(filePath)), { status: 200 });
  }
  return originalFetch(input, init);
}) as typeof fetch;

register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;

import { xlsxToIR, renderSpreadsheetIRToPdf, type IRTextRun } from '../lib/client-pdf-docx.ts';
import { pdfToIRSpreadsheet, assembleSheets, type MergeBandPage } from '../lib/client-pdf.ts';
import type { GridCell, CellTextAssignment, PdfTableClusterResult, RawRect } from '../lib/client-pdf.ts';

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
function check(name: string, ok: boolean, detail?: string): void {
  checks.push({ name, ok, detail });
}

// ---------------------------------------------------------------------------
// Part 1: a minimal, hand-built two-page fragment — proves the glue mechanism
// in isolation (assembleSheets is documented as pure/synthetic-testable).
// ---------------------------------------------------------------------------
function gcell(row: number, col: number, rowspan = 1, colspan = 1): GridCell {
  return { row, col, rowspan, colspan, rect: { x: 0, y: 0, width: 10, height: 10 } as RawRect };
}
function irRun(text: string): IRTextRun {
  return { text, position: { x: 0, y: 0 }, fontSize: 10, bold: false, italic: false, fontName: '', color: '#000000' } as unknown as IRTextRun;
}
function makeCluster(rows: number, cols: number, xEdges: number[], entries: Array<{ cell: GridCell; text: string }>): PdfTableClusterResult {
  const textRuns = entries.map((e) => irRun(e.text));
  const assignments: CellTextAssignment[] = entries.map((e, i) => ({ cell: e.cell, runIndex: i }));
  return { xEdges, yEdges: [], cells: entries.map((e) => e.cell), assignments, textRuns, rows, cols };
}

{
  // Page 1: 4 rows x 2 cols. Row 0 is plain data (no repeating header — H=0 sheet). A cell
  // anchored at (row=1, col=0) has rowspan=3, reaching this page's own last row (1+3=4 >= 4) —
  // a genuine candidate for continuation.
  const page1Cluster = makeCluster(4, 2, [0, 50, 100], [
    { cell: gcell(0, 0), text: 'Header-ish' },
    { cell: gcell(0, 1), text: 'B' },
    { cell: gcell(1, 0, 3, 1), text: 'TOP' },
    { cell: gcell(1, 1), text: 'x1' },
    { cell: gcell(2, 1), text: 'x2' },
    { cell: gcell(3, 1), text: 'x3' },
  ]);
  // Page 2: 2 rows x 2 cols. Local row 0 continues the SAME cell (2 more rows), local col 0.
  const page2Cluster = makeCluster(2, 2, [0, 50, 100], [
    { cell: gcell(0, 0, 2, 1), text: 'BOTTOM' },
    { cell: gcell(0, 1), text: 'y1' },
    { cell: gcell(1, 1), text: 'y2' },
  ]);
  const bands: MergeBandPage[] = [
    { page: 1, pageHeight: 800, clusters: [page1Cluster] },
    { page: 2, pageHeight: 800, clusters: [page2Cluster] },
  ];

  const withoutMarker = assembleSheets(bands);
  const sheetNoMarker = withoutMarker.sheets[0]!;
  check(
    'synthetic, no marker: stays ambiguous (never glues)',
    withoutMarker.warnings.some((w) => w.kind === 'merge-continuation-ambiguous' && w.page === 2 && w.col === 0),
    JSON.stringify(withoutMarker.warnings),
  );
  check(
    'synthetic, no marker: two separate merges (3 + 2), not one glued merge',
    sheetNoMarker.mergedRanges.some((m) => m.row === 1 && m.col === 0 && m.rowspan === 3) &&
      sheetNoMarker.mergedRanges.some((m) => m.row === 4 && m.col === 0 && m.rowspan === 2),
    JSON.stringify(sheetNoMarker.mergedRanges),
  );

  const withMarker = assembleSheets(bands, new Map([[2, new Set([0])]]));
  const sheetGlued = withMarker.sheets[0]!;
  check(
    'synthetic, confirmed marker: no ambiguous warning',
    !withMarker.warnings.some((w) => w.kind === 'merge-continuation-ambiguous'),
    JSON.stringify(withMarker.warnings),
  );
  const glued = sheetGlued.mergedRanges.find((m) => m.row === 1 && m.col === 0);
  check('synthetic, confirmed marker: one glued merge with the TRUE total rowspan (3+2=5)',
    !!glued && glued.rowspan === 5, JSON.stringify(sheetGlued.mergedRanges));
  check('synthetic, confirmed marker: no leftover second merge for the continuation piece',
    !sheetGlued.mergedRanges.some((m) => m.row === 4 && m.col === 0), JSON.stringify(sheetGlued.mergedRanges));
  const gluedCell = sheetGlued.cells[1]?.[0];
  check('synthetic, confirmed marker: text reconstructed from both pieces',
    gluedCell?.display === 'TOP BOTTOM', JSON.stringify(gluedCell));
  check('synthetic, confirmed marker: the continuation page no longer has its own stray anchor at row 4',
    sheetGlued.cells[4]?.[0] === undefined, JSON.stringify(sheetGlued.cells[4]));
}

// ---------------------------------------------------------------------------
// Part 2: the real, full pipeline — xlsx -> IR -> PDF -> IR -> (xlsx round trip already covered
// by tests/pdf-excel-regression.mts). EPZ_SIERPIEN_2026.xlsx has no <pane state="frozen"> at all
// (frozenRows undefined), so inferHeaderRowCount correctly returns 0 for its title-only row 0 —
// exactly the shape that used to collapse every sheet to a handful of rows.
// ---------------------------------------------------------------------------
async function main(): Promise<number> {
  const xlsxBytes = readFileSync(join(ROOT, 'test-fixtures', 'EPZ_SIERPIEN_2026.xlsx'));
  const xlsxFile = new File([xlsxBytes], 'EPZ_SIERPIEN_2026.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const ir = await xlsxToIR(xlsxFile);
  check('fixture precondition: no real frozen panes (frozenRows undefined on every sheet)',
    ir.sheets.every((s) => s.frozenRows === undefined),
    ir.sheets.map((s) => s.frozenRows).join(','));

  // Tall merged cells that fit on a page are no longer split by a page break (the renderer keeps
  // them together — a split always cut a line of text), so the default A4 render has no
  // continuations at all; every page still declares its (empty) continuation list.
  const exactOf = (origSheet: (typeof ir.sheets)[number], rtSheet: (typeof ir.sheets)[number] | undefined): number => {
    let n = 0;
    for (const m of origSheet.mergedRanges) {
      if (m.rowspan < 3) continue;
      const found = rtSheet?.mergedRanges.find((mm) => mm.row === m.row && mm.col === m.col);
      if (found && found.rowspan === m.rowspan) n++;
    }
    return n;
  };
  const countMarkers = async (bytes: Uint8Array) => {
    const doc = await PDFDocument.load(bytes);
    let pages = 0, carries = 0;
    for (const page of doc.getPages()) {
      const v = page.node.get(PDFName.of('OptimaRowspanContinues'));
      if (v instanceof PDFArray) { pages++; carries += v.size(); }
    }
    return { pages, carries, total: doc.getPageCount() };
  };

  const pdfBytes = new Uint8Array(await (await renderSpreadsheetIRToPdf(ir)).arrayBuffer());
  const { spreadsheet: rt, warnings } = await pdfToIRSpreadsheet(new File([pdfBytes], 'r.pdf', { type: 'application/pdf' }));
  check('3 sheets recovered', rt.sheets.length === 3, `got ${rt.sheets.length}`);
  const expected = [
    { name: 'Arkusz1', rowspan3plus: 94, exactMatch: 94 }, // 93 until the page grid was declared (tests/xlsx-pdf-xlsx-exact.mts)
    { name: 'Arkusz2', rowspan3plus: 94, exactMatch: 94 },
    { name: 'Arkusz3', rowspan3plus: 94, exactMatch: 94 },
  ];
  for (let i = 0; i < expected.length; i++) {
    const e = expected[i]!;
    const origSheet = ir.sheets[i]!;
    const rtSheet = rt.sheets.find((s) => s.name === e.name);
    check(`${e.name}: all 111 rows recovered (was collapsing to ~16-21 before this fix)`,
      rtSheet?.cells.length === 111, `got ${rtSheet?.cells.length}`);
    check(`${e.name}: ${e.rowspan3plus} rowspan>=3 merges in the source`,
      origSheet.mergedRanges.filter((m) => m.rowspan >= 3).length === e.rowspan3plus);
    const exact = exactOf(origSheet, rtSheet);
    check(`${e.name}: ${e.exactMatch} of those recovered with the exact original rowspan (81/66/66 when merges were split)`,
      exact === e.exactMatch, `got ${exact}`);
  }
  check('no false header-mismatch warnings (the H=0 catastrophic-loss bug)',
    !warnings.some((w) => w.kind === 'header-mismatch'), JSON.stringify(warnings.filter((w) => w.kind === 'header-mismatch')));
  const a4 = await countMarkers(pdfBytes);
  check('every page declares its continuation list, and nothing continues on A4', a4.pages === a4.total && a4.carries === 0, JSON.stringify(a4));
  check('declared pages leave no "ambiguous" warnings (a merge starting a page is known not to continue)',
    !warnings.some((w) => w.kind === 'merge-continuation-ambiguous'), JSON.stringify(warnings.filter((w) => w.kind === 'merge-continuation-ambiguous')));

  // ---------------------------------------------------------------------------
  // Part 3: a real split. A merged block taller than a page cannot be kept together: the renderer
  // splits it, draws the rest on the next page and marks it; the reader glues it back. Stripping
  // the marker from the SAME rendered PDF proves the fallback on real geometry: the glue is lost
  // and reported as ambiguous instead (never a silent wrong merge), as for any third-party PDF.
  // ---------------------------------------------------------------------------
  const N = 90;
  const tallCells = Array.from({ length: N }, (_, r) => [
    r === 0 ? { display: 'Opis', type: 'string' as const, raw: 'Opis', colspan: 1, rowspan: 1 }
      : r === 1 ? { display: 'SPLIT TOP', type: 'string' as const, raw: 'SPLIT TOP', colspan: 1, rowspan: 70 }
        : r < 71 ? undefined : { display: `after ${r}`, type: 'string' as const, raw: `after ${r}`, colspan: 1, rowspan: 1 },
    r === 0 ? { display: 'Nr', type: 'string' as const, raw: 'Nr', colspan: 1, rowspan: 1 }
      : { display: `r${r}`, type: 'string' as const, raw: `r${r}`, colspan: 1, rowspan: 1 },
  ]);
  const tallIr = { kind: 'spreadsheet' as const, sheets: [{ kind: 'sheet' as const, name: 'Arkusz1', cells: tallCells, columnWidths: [20, 20], mergedRanges: [{ row: 1, col: 0, rowspan: 70, colspan: 1 }] }] };
  const tallBytes = new Uint8Array(await (await renderSpreadsheetIRToPdf(tallIr)).arrayBuffer());
  const tall = await countMarkers(tallBytes);
  check('a merge taller than a page is split and its continuation marked', tall.carries > 0, JSON.stringify(tall));
  const { spreadsheet: rtTall, warnings: wTall } = await pdfToIRSpreadsheet(new File([tallBytes], 't.pdf', { type: 'application/pdf' }));
  const tallMerge = (sh: (typeof rtTall.sheets)[number] | undefined) => sh?.mergedRanges.find((m) => m.row === 1 && m.col === 0);
  check('with the marker the split merge is glued back to its full 70 rows', tallMerge(rtTall.sheets[0])?.rowspan === 70 && rtTall.sheets[0]?.cells.length === N,
    `rowspan ${tallMerge(rtTall.sheets[0])?.rowspan}, rows ${rtTall.sheets[0]?.cells.length}`);
  check('with the marker: no ambiguous warning', !wTall.some((w) => w.kind === 'merge-continuation-ambiguous'));
  // A PDF this app printed in the days between the continuation list and the page description
  // (it has the first, not the second) must read as it did then.
  const olderDoc = await PDFDocument.load(tallBytes);
  for (const page of olderDoc.getPages()) page.node.delete(PDFName.of('OptimaSheetPage'));
  const { spreadsheet: rtOlder, warnings: wOlder } = await pdfToIRSpreadsheet(new File([await olderDoc.save()], 'o.pdf', { type: 'application/pdf' }));
  check('with only the continuation list (no page description) the merge is still glued to 70 rows', tallMerge(rtOlder.sheets[0])?.rowspan === 70 && rtOlder.sheets[0]?.cells.length === N && !wOlder.some((w) => w.kind === 'merge-continuation-ambiguous'),
    `rowspan ${tallMerge(rtOlder.sheets[0])?.rowspan}, rows ${rtOlder.sheets[0]?.cells.length}`);
  const strippedDoc = await PDFDocument.load(tallBytes);
  // Both declarations: the continuation list and the page description that now carries the
  // merges (and their "continues" flags) too.
  for (const page of strippedDoc.getPages()) {
    page.node.delete(PDFName.of('OptimaRowspanContinues'));
    page.node.delete(PDFName.of('OptimaSheetPage'));
  }
  const { spreadsheet: rtStripped, warnings: wStripped } = await pdfToIRSpreadsheet(new File([await strippedDoc.save()], 'x.pdf', { type: 'application/pdf' }));
  check('without the marker the split merge is NOT glued (two separate pieces)', (tallMerge(rtStripped.sheets[0])?.rowspan ?? 0) < 70,
    `rowspan ${tallMerge(rtStripped.sheets[0])?.rowspan}`);
  check('without the marker the split is reported ambiguous', wStripped.filter((w) => w.kind === 'merge-continuation-ambiguous').length >= tall.carries,
    `${wStripped.filter((w) => w.kind === 'merge-continuation-ambiguous').length} ambiguous for ${tall.carries} splits`);

  console.log('=== xlsx -> PDF -> xlsx: cross-page rowspan continuation ===');
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
