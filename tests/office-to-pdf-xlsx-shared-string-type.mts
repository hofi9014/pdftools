// excel-to-pdf (officeToPdf's 'xlsx' branch, lib/client-pdf.ts): a <v> value was treated as a
// shared-string INDEX whenever parseInt(value, 10) landed inside the shared-strings table, with no
// check of the cell's own t="s" type attribute. Excel stores times and percentages as plain 0..1
// fractions with no t attribute — parseInt() truncates '0.33333333333333331' (08:00 as a day
// fraction) to 0, '0.66666666666666663' (16:00) also to 0, and any value starting with '1.' to 1.
// On a real timesheet .xlsx (two time columns filled on almost every row) index 0 is nearly always
// a valid shared-string index, so EVERY time cell silently resolved to sharedStrings[0] — usually
// the document's own title — instead of its real value, flooding the output PDF with the title
// text repeated dozens of times per page and making the sheet's actual data unreadable. Reported
// directly by a user: "excel do pdf też nie działa, uzyty plik epz sierpien 2026" — confirmed on
// their exact file (test-fixtures/EPZ_SIERPIEN_2026.xlsx, byte-identical to the file they uploaded):
// cell B8 = 0.33333333333333331 (no t="s") resolved to sharedStrings[0], "Załącznik nr 3 do
// Regulaminu pracy zdalnej " (the document's title cell), repeated across nearly every row.
import { officeToPdf, pdfjsDocOptions } from '../lib/client-pdf.ts';
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';
import JSZip from 'jszip';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
const fontBytes = readFileSync(join(ROOT, 'public', 'pdfjs-dist', 'standard_fonts', 'LiberationSans-Regular.ttf'));
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.includes('/pdfjs-dist/standard_fonts/')) return new Response(new Uint8Array(fontBytes), { status: 200 });
  return realFetch(input, init);
}) as typeof fetch;

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

async function pdfText(blob: Blob): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  const doc = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(await blob.arrayBuffer()))).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    text += tc.items.map((it) => (it as { str?: string }).str ?? '').join(' ') + '\n';
  }
  return text;
}

console.log('=== officeToPdf (.xlsx): numeric cells are never mistaken for shared-string indices ===');

// 1. Minimal synthetic repro: a t="s" cell (index 0) alongside a plain fractional-number cell
// whose truncated integer part (0) collides with that same, valid shared-string index.
{
  const zip = new JSZip();
  zip.file(
    'xl/sharedStrings.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
<si><t>TITLE TEXT</t></si>
</sst>`,
  );
  zip.file(
    'xl/worksheets/sheet1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
<row r="1"><c r="F1" t="s"><v>0</v></c></row>
<row r="2"><c r="A2"><v>0.33333333333333331</v></c><c r="B2"><v>0.66666666666666663</v></c></row>
</sheetData>
</worksheet>`,
  );
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  const file = new File([buf as unknown as BlobPart], 'repro.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const blob = await officeToPdf(file);
  const text = await pdfText(blob);
  const titleCount = (text.match(/TITLE TEXT/g) ?? []).length;
  check(titleCount === 1, `"TITLE TEXT" appears exactly once (its own real cell), not once per colliding numeric cell (got ${titleCount})`);
  check(text.includes('0.33333333333333331'), 'the fractional time value is shown as its real number, not swapped for the title');
  check(text.includes('0.66666666666666663'), 'the second fractional time value is also preserved correctly');
}

// 2. Full real-file regression: the exact file the user uploaded no longer floods the output with
// its own title cell's text.
{
  const bytes = readFileSync(join(ROOT, 'test-fixtures', 'EPZ_SIERPIEN_2026.xlsx'));
  const file = new File([bytes as unknown as BlobPart], 'EPZ_SIERPIEN_2026.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const blob = await officeToPdf(file);
  const text = await pdfText(blob);
  const titleCount = (text.match(/Załącznik nr 3 do Regulaminu pracy zdalnej/g) ?? []).length;
  check(titleCount === 3, `the document's own title text appears exactly once per sheet (its real F1 cell on each of the 3 sheets), not flooding every row (got ${titleCount} occurrences)`);
  check(text.includes('Wprowadzanie zleceń'), 'real cell content (activity description) is present');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exitCode = fails === 0 ? 0 : 1;
