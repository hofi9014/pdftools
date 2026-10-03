// excel-to-pdf: a frozen header (rows) or frozen columns larger than the page lost content.
//
// Frozen rows/columns are repeated on every page. Measured on the previous renderer:
//  - a frozen header row taller than the page: 40 pages (ONE body row per page), 744 of 980
//    words never drawn, text below the bottom margin;
//  - frozen columns wider than the page: the body columns were drawn past the right edge —
//    60 of 120 values lost.
// A frozen block that needs more than half of the page is now laid out as ordinary rows/columns
// (drawn once, paginated like everything else); a normal header is still repeated.
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('/')) {
    const f = join(ROOT, 'public', url);
    if (existsSync(f)) return new Response(new Uint8Array(readFileSync(f)), { status: 200 });
  }
  return originalFetch(input, init);
}) as typeof fetch;
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
const { renderSpreadsheetIRToPdf, spreadsheetFrozenBlockRepeatable } = await import('../lib/client-pdf-docx.ts');
const pdfjs = await import('pdfjs-dist');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const cell = (display: string, extra: Record<string, unknown> = {}) =>
  ({ display, type: display ? 'string' : 'empty', raw: display || null, colspan: 1, rowspan: 1, ...extra });

interface Rendered { pages: number; missing: string[]; lowest: number; rightmost: number; pageWidth: number; perPage: string[] }
async function render(sheet: Record<string, unknown>, expect: string[]): Promise<Rendered> {
  const ir = { kind: 'spreadsheet' as const, defaultFontSize: 11, sheets: [{ kind: 'sheet', name: 'S', mergedRanges: [], ...sheet }] };
  const blob = await renderSpreadsheetIRToPdf(ir as never);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const perPage: string[] = [];
  let lowest = Infinity;
  let rightmost = 0;
  let pageWidth = 0;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    pageWidth = page.getViewport({ scale: 1 }).width;
    let text = '';
    for (const it of (await page.getTextContent()).items) {
      if (!('str' in it) || !it.str.trim()) continue;
      text += ' ' + it.str;
      lowest = Math.min(lowest, it.transform[5]);
      rightmost = Math.max(rightmost, it.transform[4] + it.width);
    }
    perPage.push(text);
  }
  const have = new Set(perPage.join(' ').split(/\s+/));
  return { pages: doc.numPages, missing: expect.filter((w) => !have.has(w)), lowest, rightmost, pageWidth, perPage };
}

const body = Array.from({ length: 40 }, (_, i) => [cell(`row${i}a`), cell(`row${i}b`)]);
const bodyWords = body.flatMap((r) => r.map((c) => c.display));

console.log('=== a frozen header taller than the page ===');
{
  const head = Array.from({ length: 900 }, (_, i) => `head${i}`);
  const r = await render({ frozenRows: 1, columnWidths: [30, 30], cells: [[cell(head.join(' '), { fmt: { wrap: true } }), cell('H2')], ...body] }, [...head, ...bodyWords]);
  check(r.missing.length === 0, `every header and body word is drawn (${r.missing.length} missing, e.g. ${r.missing.slice(0, 3).join(', ')})`);
  check(r.lowest >= 49, `nothing below the bottom margin (lowest baseline ${r.lowest.toFixed(0)})`);
  check(r.pages <= 8, `the body is not spread one row per page (${r.pages} pages for 40 rows)`);
}

console.log('\n=== a frozen header that takes most of the page ===');
{
  const head = Array.from({ length: 330 }, (_, i) => `head${i}`);
  const r = await render({ frozenRows: 1, columnWidths: [30, 30], cells: [[cell(head.join(' '), { fmt: { wrap: true } }), cell('H2')], ...body] }, [...head, ...bodyWords]);
  check(r.missing.length === 0 && r.lowest >= 49, `all words drawn inside the page (${r.missing.length} missing, lowest ${r.lowest.toFixed(0)})`);
  check(r.pages <= 4, `a few pages instead of one row per page (${r.pages})`);
}

console.log('\n=== frozen columns wider than the page ===');
{
  const wide = Array.from({ length: 30 }, (_, i) => [cell(`k${i}a`), cell(`k${i}b`), cell(`v${i}c`), cell(`v${i}d`)]);
  const r = await render({ frozenCols: 2, columnWidths: [70, 70, 20, 20], cells: wide }, wide.flatMap((row) => row.map((c) => c.display)));
  check(r.missing.length === 0, `every value is drawn, including the body columns (${r.missing.length} missing, e.g. ${r.missing.slice(0, 3).join(', ')})`);
  check(r.rightmost <= r.pageWidth - 40, `nothing past the right margin (rightmost ${r.rightmost.toFixed(0)} of ${r.pageWidth.toFixed(0)})`);
}

console.log('\n=== a normal header is still repeated on every page ===');
{
  const long = Array.from({ length: 150 }, (_, i) => [cell(`r${i}a`), cell(`r${i}b`)]);
  const r = await render({ frozenRows: 1, columnWidths: [20, 20], cells: [[cell('HeaderName'), cell('HeaderValue')], ...long] }, long.flatMap((row) => row.map((c) => c.display)));
  const withHeader = r.perPage.filter((t) => /HeaderName/.test(t) && /HeaderValue/.test(t)).length;
  check(r.pages >= 3 && withHeader === r.pages, `the one-line header is on all ${r.pages} pages (${withHeader})`);
  check(r.missing.length === 0, 'and no body value is lost');
}
{
  const cols = Array.from({ length: 12 }, (_, c) => c);
  const rows = Array.from({ length: 5 }, (_, i) => cols.map((c) => cell(c === 0 ? `key${i}` : `r${i}c${c}`)));
  const r = await render({ frozenCols: 1, columnWidths: cols.map(() => 18), cells: rows }, rows.flatMap((row) => row.map((c) => c.display)));
  const withKey = r.perPage.filter((t) => /key0/.test(t)).length;
  check(r.pages >= 2 && withKey === r.pages, `a narrow frozen column is on every column page (${withKey} of ${r.pages})`);
}

console.log('\n=== the rule ===');
check(spreadsheetFrozenBlockRepeatable(100, 700) && spreadsheetFrozenBlockRepeatable(350, 700), 'up to half of the page is repeated');
check(!spreadsheetFrozenBlockRepeatable(351, 700) && !spreadsheetFrozenBlockRepeatable(2000, 700), 'more than half is not');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
