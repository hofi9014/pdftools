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
import { PDFDocument, PDFName } from 'pdf-lib';

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

  const pdfBlob = await renderSpreadsheetIRToPdf(ir);
  const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
  const pdfFile = new File([pdfBytes], 'r.pdf', { type: 'application/pdf' });

  const { spreadsheet: rt, warnings } = await pdfToIRSpreadsheet(pdfFile);
  check('3 sheets recovered', rt.sheets.length === 3, `got ${rt.sheets.length}`);

  const expected = [
    { name: 'Arkusz1', rowspan3plus: 94, exactMatch: 81 },
    { name: 'Arkusz2', rowspan3plus: 94, exactMatch: 66 },
    { name: 'Arkusz3', rowspan3plus: 94, exactMatch: 66 },
  ];
  for (let i = 0; i < expected.length; i++) {
    const e = expected[i]!;
    const origSheet = ir.sheets[i]!;
    const rtSheet = rt.sheets.find((s) => s.name === e.name);
    check(`${e.name}: all 111 rows recovered (was collapsing to ~16-21 before this fix)`,
      rtSheet?.cells.length === 111, `got ${rtSheet?.cells.length}`);

    const origTall = origSheet.mergedRanges.filter((m) => m.rowspan >= 3);
    check(`${e.name}: ${e.rowspan3plus} rowspan>=3 merges in the source`, origTall.length === e.rowspan3plus,
      `got ${origTall.length}`);
    let exactMatch = 0;
    for (const m of origTall) {
      const found = rtSheet?.mergedRanges.find((mm) => mm.row === m.row && mm.col === m.col);
      if (found && found.rowspan === m.rowspan) exactMatch++;
    }
    check(`${e.name}: ${e.exactMatch} of those recovered with the exact original rowspan (confirmed continuations glued)`,
      exactMatch === e.exactMatch, `got ${exactMatch}`);
  }

  check('no false header-mismatch warnings (the H=0 catastrophic-loss bug)',
    !warnings.some((w) => w.kind === 'header-mismatch'), JSON.stringify(warnings.filter((w) => w.kind === 'header-mismatch')));
  const ambiguous = warnings.filter((w) => w.kind === 'merge-continuation-ambiguous');
  check('exactly 3 genuinely-ambiguous splits remain correctly un-glued (not silently merged)',
    ambiguous.length === 3, JSON.stringify(ambiguous));

  // ---------------------------------------------------------------------------
  // Part 3: strip the confirmation marker from the SAME real, rendered PDF and re-run the round
  // trip — proves the fallback safety net on real (not synthetic) geometry: without the marker,
  // every one of those previously-glued merges must fall back to the old conservative behaviour
  // (an ambiguous warning, never a silent glue), exactly as it would for a third-party PDF or one
  // this app rendered before the marker existed.
  // ---------------------------------------------------------------------------
  const strippedDoc = await PDFDocument.load(pdfBytes);
  let strippedMarkers = 0;
  for (const page of strippedDoc.getPages()) {
    if (page.node.get(PDFName.of('OptimaRowspanContinues'))) {
      page.node.delete(PDFName.of('OptimaRowspanContinues'));
      strippedMarkers++;
    }
  }
  check('marker-strip precondition: the real PDF actually carried markers to strip', strippedMarkers > 0, `${strippedMarkers} pages`);
  const strippedBytes = await strippedDoc.save();
  const strippedFile = new File([strippedBytes], 'stripped.pdf', { type: 'application/pdf' });
  const { spreadsheet: rtStripped, warnings: warningsStripped } = await pdfToIRSpreadsheet(strippedFile);

  // A plain "does this exact (row,col,rowspan) still match" per-cell check can't tell "genuinely
  // glued from two split pieces" apart from "always fit on one page, marker never involved" — most
  // of the exactMatch counts above are the latter. What the marker mechanism can actually be
  // blamed for is the DIFFERENCE: exactly how many matches disappear, and how many MORE ambiguous
  // warnings appear, once its only source of truth (the marker) is gone.
  const strippedExpected = [
    { name: 'Arkusz1', exactMatch: 78 },
    { name: 'Arkusz2', exactMatch: 63 },
    { name: 'Arkusz3', exactMatch: 63 },
  ];
  for (let i = 0; i < strippedExpected.length; i++) {
    const e = strippedExpected[i]!;
    const origSheet = ir.sheets[i]!;
    const strippedSheet = rtStripped.sheets.find((s) => s.name === e.name);
    let exactMatch = 0;
    for (const m of origSheet.mergedRanges) {
      if (m.rowspan < 3) continue;
      const found = strippedSheet?.mergedRanges.find((mm) => mm.row === m.row && mm.col === m.col);
      if (found && found.rowspan === m.rowspan) exactMatch++;
    }
    const withMarker = expected[i]!.exactMatch;
    check(`${e.name}: stripping the marker loses exactly 3 previously-confirmed glues (${withMarker} -> ${e.exactMatch})`,
      exactMatch === e.exactMatch, `got ${exactMatch}`);
  }
  const ambiguousStripped = warningsStripped.filter((w) => w.kind === 'merge-continuation-ambiguous');
  check('marker-strip: the 9 merges that lost their glue (3 sheets x 3) now correctly report ambiguous instead of a silent wrong merge',
    ambiguousStripped.length === ambiguous.length + 9, `expected ${ambiguous.length + 9}, got ${ambiguousStripped.length}`);

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
