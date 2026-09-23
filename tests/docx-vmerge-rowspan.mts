// Audit finding (Medium, engine area) — processTable() (docx reader, lib/client-pdf-docx.ts)
// previously hardcoded `rowspan: 1` unconditionally and never read <w:vMerge> at all, while the
// sibling ODT reader (odfProcessTable) already correctly recovers row spans from ODF's
// table:number-rows-spanned. Word represents a vertical merge as <w:vMerge w:val="restart"/> on
// the TOP cell (which carries the real content) followed by a plain <w:vMerge/> (no val, or
// val="continue") on each subsequent row at the SAME grid column — with no rowspan count
// anywhere; it must be recovered by counting consecutive continuation cells. Every real Word
// document with a vertically-merged table cell, converted via word-to-pdf
// (docxToIR -> renderIRToPdf), silently lost the merge — rendering as ordinary stacked separate
// rows instead of one spanning cell — even though renderTable() already has full, correct
// rowspan-aware grid-occupancy handling (confirmed by reading it) and was simply never being fed
// a rowspan > 1 to act on.
//
// Fixed by tracking, per grid column, the currently-open merge's anchor cell so a later
// continuation row can bump its rowspan, and omitting continuation <w:tc> elements from the IR
// grid entirely (matching how odfProcessTable already handles ODF's covered-table-cell).
//
// Proven two ways: (1) the IR itself has the correct shape (row 0's first cell has rowspan 3,
// rows 1 and 2 have only their second column, not a phantom first-column cell); (2) the actual
// rendered PDF (via the real renderIRToPdf(), reusing renderTable()'s already-correct
// occupancy-aware drawing) draws exactly one rectangle spanning the full 3-row height for that
// column, not three separate stacked rectangles.

import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('/')) {
    const filePath = join(ROOT, 'public', url);
    if (existsSync(filePath)) {
      return new Response(new Uint8Array(readFileSync(filePath)), { status: 200 });
    }
  }
  return originalFetch(input, init);
}) as typeof fetch;

register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as PdfJsModule;
pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

import JSZip from 'jszip';
import { docxToIR, renderIRToPdf, type IRTableBlock } from '../lib/client-pdf-docx';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(buf: Buffer, name: string): File {
  return Object.assign(new Blob([buf]), { name }) as unknown as File;
}

console.log('=== docxToIR: a 3-row vertical merge recovers rowspan=3, continuation rows omitted ===');
{
  const zip = new JSZip();
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/></w:tblGrid>
      <w:tr><w:tc><w:tcPr><w:vMerge w:val="restart"/></w:tcPr><w:p><w:r><w:t>Merged</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Row0B</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:tcPr><w:vMerge/></w:tcPr><w:p/></w:tc><w:tc><w:p><w:r><w:t>Row1B</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:tcPr><w:vMerge/></w:tcPr><w:p/></w:tc><w:tc><w:p><w:r><w:t>Row2B</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
  </w:body>
</w:document>`,
  );
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
  );
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  const file = toFile(buf, 'vmerge.docx');

  const { pages } = await docxToIR(file);
  const table = pages[0]?.blocks.find((b) => b.kind === 'table') as IRTableBlock | undefined;
  check(!!table, 'a table block was extracted');

  if (table) {
    check(table.cells.length === 3, `table has 3 rows (got ${table.cells.length})`);
    check(table.cells[0]?.length === 2, `row 0 has 2 cells: the merge anchor + column B (got ${table.cells[0]?.length})`);
    check(table.cells[0]?.[0]?.rowspan === 3, `row 0's first cell has rowspan 3, recovered from 2 continuation rows (got ${table.cells[0]?.[0]?.rowspan})`);
    check(table.cells[0]?.[0]?.runs.map((r) => r.text).join('') === 'Merged', 'the anchor cell carries the real "Merged" text');
    check(table.cells[1]?.length === 1, `row 1 has only 1 cell (column B) — the vMerge continuation is NOT a phantom grid entry (got ${table.cells[1]?.length})`);
    check(table.cells[2]?.length === 1, `row 2 has only 1 cell (column B) likewise (got ${table.cells[2]?.length})`);
    check(table.cells[1]?.[0]?.runs.map((r) => r.text).join('') === 'Row1B', 'row 1\'s remaining cell is column B\'s real text, not accidentally column A\'s');
  }

  console.log('\n=== renderIRToPdf: the merged cell draws as ONE rectangle spanning all 3 rows, not 3 stacked ones ===');
  const { pages: pages2, images } = await docxToIR(file);
  const pdfBlob = await renderIRToPdf(pages2, images);
  const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data: pdfBytes, useSystemFonts: false, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts') + '/' }).promise;
  const page = await doc.getPage(1);
  const opList = await page.getOperatorList();

  // Collect every drawn rectangle's (x, height) via constructPath ops. pdf-lib's drawRectangle
  // emits a CHAIN of `cm` (transform) operators between the nearest preceding `save` and the
  // path (position, then intermediate identity resets — confirmed empirically, same pattern as
  // tests/sign-pdf-image-offset.mts) — composing only the single transform closest to the path
  // can grab an identity no-op instead of the real position. Per the PDF spec, each `cm`
  // PREPENDS to the CTM, so composing in REVERSE document order (nearest-to-path first) gives
  // the true position.
  const rectHeights: number[] = [];
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] !== pdfjsLib.OPS.constructPath) continue;
    let saveIdx = i - 1;
    while (saveIdx >= 0 && opList.fnArray[saveIdx] !== pdfjsLib.OPS.save) saveIdx--;
    let a = 1, b = 0, c = 0, d = 1, e = 0, f = 0;
    for (let j = i - 1; j > saveIdx; j--) {
      if (opList.fnArray[j] !== pdfjsLib.OPS.transform) continue;
      const [a2, b2, c2, d2, e2, f2] = opList.argsArray[j] as number[];
      const na = a * a2! + b * c2!, nb = a * b2! + b * d2!;
      const nc = c * a2! + d * c2!, nd = c * b2! + d * d2!;
      const ne = e * a2! + f * c2! + e2!, nf = e * b2! + f * d2! + f2!;
      a = na; b = nb; c = nc; d = nd; e = ne; f = nf;
    }
    const tx = e;
    const args = opList.argsArray[i] as unknown as [number[], number[][], number[]];
    const bbox = args[2]; // [minX, minY, maxX, maxY] in local (already-scaled) path space
    if (!bbox) continue;
    const height = Math.abs(bbox[3]! - bbox[1]!);
    // Table left margin is 50 (MARGIN constant in renderIRToPdf) — leftmost column starts there.
    if (Math.abs(tx - 50) < 1) rectHeights.push(Math.round(height));
  }

  check(rectHeights.length === 1, `exactly ONE rectangle drawn for the leftmost (merged) column, not one per row (got ${rectHeights.length}: ${JSON.stringify(rectHeights)})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
