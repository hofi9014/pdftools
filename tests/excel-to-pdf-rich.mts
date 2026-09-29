// excel-to-pdf: dates and times came out as raw numbers. The page converted through
// officeToPdf's xlsx branch, which dumps each row's raw cell values as tab-separated text — a
// date cell printed as its serial number (46235) and a time as a day fraction
// (0.33333333333333331) — with no grid, no merged cells and no column widths. The repo already
// had a real spreadsheet renderer (xlsxToIR → renderSpreadsheetIRToPdf: grid, merges, widths,
// number formats, conditional formatting, repeated header row) used only by the round-trip
// tests. The page now uses it, with officeToPdf kept as the fallback.
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
const { xlsxToIR, renderSpreadsheetIRToPdf } = await import('../lib/client-pdf-docx.ts');
const { officeToPdf } = await import('../lib/client-pdf.ts');
const pdfjs = await import('pdfjs-dist');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
async function pdfText(blob: Blob): Promise<{ pages: number; text: string }> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  let text = '';
  for (let p = 1; p <= doc.numPages; p++) text += ' ' + (await (await doc.getPage(p)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
  return { pages: doc.numPages, text };
}
const xlsx = () => Object.assign(new Blob([readFileSync(join(ROOT, 'test-fixtures/EPZ_SIERPIEN_2026.xlsx'))]), { name: 'EPZ.xlsx' }) as unknown as File;

console.log('=== the page uses the spreadsheet renderer, officeToPdf only as fallback ===');
const page = readFileSync(join(ROOT, 'app/excel-to-pdf/page.tsx'), 'utf8');
check(/await xlsxToIR\(file\)/.test(page) && /renderSpreadsheetIRToPdf\(ir\)/.test(page), 'converts through xlsxToIR → renderSpreadsheetIRToPdf');
check(/catch \(irErr\)[\s\S]{0,200}officeToPdf\(file\)/.test(page), 'falls back to officeToPdf if the spreadsheet reader fails');
check(/detectUnsupportedScript\(cellText\)/.test(page), 'falls back for text in a script the embedded font cannot draw');

console.log('\n=== the real schedule (EPZ_SIERPIEN_2026.xlsx) ===');
const rich = await pdfText(await renderSpreadsheetIRToPdf(await xlsxToIR(xlsx())));
check(/08-01-26/.test(rich.text) && /\b08:00\b/.test(rich.text) && /\b16:00\b/.test(rich.text), 'dates and times are shown in their cell format (08-01-26, 08:00, 16:00)');
check(!/\b46235\b/.test(rich.text) && !/0\.3333/.test(rich.text), 'no raw date serials (46235) or day fractions (0.3333…)');
check(/Wprowadzanie zleceń, obliczanie/.test(rich.text.replace(/\s+/g, ' ')), 'merged-cell text is drawn');
check(/Arkusz1/.test(rich.text) && /Arkusz2/.test(rich.text) && /Arkusz3/.test(rich.text), 'every sheet gets its own section');
const plain = await pdfText(await officeToPdf(xlsx()));
check(/\b46235\b/.test(plain.text) || /0\.3333/.test(plain.text), 'control: the old text dump does print raw serials — the difference is real');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
