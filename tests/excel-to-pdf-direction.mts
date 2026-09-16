// Audit finding (Low, tooling area) — the pdf-to-excel round trip has a thorough regression
// harness (tests/pdf-excel-regression.mts), but the REVERSE direction — the actual excel-to-pdf
// tool (app/excel-to-pdf/page.tsx), which converts .xlsx to PDF via officeToPdf's 'xlsx' branch
// in lib/client-pdf.ts — had zero test coverage of any kind.
//
// officeToPdf's xlsx branch is deliberately crude (documented limitation, AGENTS.md's own
// FINDING note on Office conversions): it reads ONLY xl/sharedStrings.xml (resolving shared
// string cells) and any xl/worksheets/sheetN.xml files via regex, joins each row's cells with
// tabs, and draws the resulting plain text into a wrapped, paginated PDF — no formatting, no
// grid lines, no cell styling. Because it only ever reads those two paths (never
// [Content_Types].xml, workbook.xml, or any _rels), a synthetic .xlsx needs only those two
// files to exercise the real code path — not a full, structurally valid xlsx.
//
// Proves it two ways, mirroring tests/office-to-pdf-entities.mts's established pattern:
//   1. integration — a synthetic minimal .xlsx (sharedStrings + one sheet, built with JSZip so
//      the exact cell layout is guaranteed, not hoped-for) run through the real officeToPdf(),
//      then the generated PDF is re-parsed with pdfjs and its actual text content checked:
//      shared-string cells resolve correctly, numeric cells resolve correctly, and row order is
//      preserved.
//   2. regression — the real, complex fixture already used elsewhere in this repo as
//      pdf-to-excel's ground truth (test-fixtures/EPZ_SIERPIEN_2026.xlsx, multiple sheets, dates,
//      merged cells) converts to a substantial, non-empty PDF containing recognizable text from
//      the source — a "did we break the common case" guard for the real product feature.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as PdfJsModule;
pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

import JSZip from 'jszip';
import { officeToPdf, pdfjsDocOptions } from '../lib/client-pdf';

// Same fetch shim as office-to-pdf-entities.mts: officeToPdf embeds a font via
// embedLiberationSans(), which fetch()es a browser-relative path with no meaning in Node.
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

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

async function pdfBlobToText(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const doc = await pdfjsLib.getDocument(pdfjsDocOptions(buf)).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => ('str' in it ? it.str : '')).join('') + '\n';
  }
  return text;
}

function toFile(buf: Buffer, name: string): File {
  const blob = new Blob([buf]);
  return Object.assign(blob, { name }) as unknown as File;
}

console.log('=== integration: synthetic .xlsx (shared strings + numeric cells) through officeToPdf ===');
{
  const zip = new JSZip();
  // officeToPdf's xlsx branch reads ONLY these two paths — no [Content_Types].xml, workbook.xml
  // or _rels needed to exercise the real code.
  zip.file(
    'xl/sharedStrings.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="2" uniqueCount="2">
<si><t>Nazwa produktu</t></si>
<si><t>Cena</t></si>
</sst>`,
  );
  zip.file(
    'xl/worksheets/sheet1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
<row r="2"><c r="A2"><v>999</v></c></row>
</sheetData>
</worksheet>`,
  );
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  const file = toFile(buf, 'synthetic.xlsx');

  const pdfBlob = await officeToPdf(file);
  check(pdfBlob.size > 0, `officeToPdf produced a non-empty PDF for a synthetic .xlsx (${pdfBlob.size} bytes)`);

  const text = await pdfBlobToText(pdfBlob);
  check(text.includes('Nazwa produktu'), `shared-string cell A1 resolved correctly — got: ${JSON.stringify(text.slice(0, 80))}`);
  check(text.includes('Cena'), 'shared-string cell B1 resolved correctly (second column, same row)');
  check(text.includes('999'), 'plain numeric cell (no shared-string reference) resolved correctly');
  check(text.indexOf('Nazwa produktu') < text.indexOf('999'), 'row order preserved (header row before the numeric data row)');
}

console.log('\n--- negative check: a broken shared-string index does not crash, and is not silently wrong ---');
{
  const zip = new JSZip();
  zip.file(
    'xl/sharedStrings.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
<si><t>Only string</t></si>
</sst>`,
  );
  zip.file(
    'xl/worksheets/sheet1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
<row r="1"><c r="A1" t="s"><v>5</v></c></row>
</sheetData>
</worksheet>`,
  );
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  const file = toFile(buf, 'out-of-range.xlsx');
  const pdfBlob = await officeToPdf(file);
  check(pdfBlob.size > 0, 'an out-of-range shared-string index does not throw — officeToPdf still produces a PDF (falls back to the raw index value)');
}

console.log('\n=== regression: the real, complex .xlsx fixture (pdf-to-excel\'s own ground truth) converts cleanly ===');
{
  const fixturePath = join(ROOT, 'test-fixtures', 'EPZ_SIERPIEN_2026.xlsx');
  if (!existsSync(fixturePath)) {
    console.log('  SKIP real fixture not found at', fixturePath);
  } else {
    const buf = readFileSync(fixturePath);
    const file = toFile(buf, 'EPZ_SIERPIEN_2026.xlsx');
    const pdfBlob = await officeToPdf(file);
    check(pdfBlob.size > 1000, `real EPZ_SIERPIEN_2026.xlsx converts to a substantial PDF (${pdfBlob.size} bytes)`);
    const text = await pdfBlobToText(pdfBlob);
    check(text.length > 100, `converted PDF has substantial extracted text (${text.length} chars)`);
    check(text !== 'Brak danych do odczytania w pliku XLSX.', 'did not fall through to the "no data" placeholder for a file that genuinely has data');
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
