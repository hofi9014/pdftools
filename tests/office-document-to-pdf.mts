// The tabs of Word to PDF used weaker engines than the dedicated pages (found 2026-10-27 while
// writing the Word to PDF guide): an .xlsx in the Excel tab went through officeToPdf's plain dump
// (dates as 46235, times as 0.333…, no grid) instead of the spreadsheet renderer that Excel to
// PDF uses, and an .odt in the OpenOffice tab without a positioned layout skipped the full ODT
// reader (page breaks, tables, styles) that OpenOffice to PDF uses. All three pages now convert
// through lib/office-document-to-pdf.ts.
//
// Run: npx tsx tests/office-document-to-pdf.mts
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';
import JSZip from 'jszip';

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
const { officeDocumentToPdf, spreadsheetToPdf, textDocumentToPdf } = await import('../lib/office-document-to-pdf.ts');
const { officeToPdf } = await import('../lib/client-pdf.ts');
const pdfjs = await import('pdfjs-dist');

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
async function pdfText(blob: Blob): Promise<{ pages: number; text: string }> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  let text = '';
  for (let p = 1; p <= doc.numPages; p++) text += ' ' + (await (await doc.getPage(p)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
  return { pages: doc.numPages, text };
}
const asFile = (buf: Uint8Array, name: string) => Object.assign(new Blob([buf]), { name }) as unknown as File;

console.log('=== the three pages convert through the shared module ===');
const src = (p: string) => readFileSync(join(ROOT, 'app', '(unprefixed)', p, 'page.tsx'), 'utf8');
const word = src('word-to-pdf'), excel = src('excel-to-pdf'), oo = src('openoffice-to-pdf');
check(/await officeDocumentToPdf\(file\)/.test(word), 'Word to PDF (every tab) uses officeDocumentToPdf');
check(/await spreadsheetToPdf\(file\)/.test(excel), 'Excel to PDF uses spreadsheetToPdf');
check(/await textDocumentToPdf\(file\)/.test(oo), 'OpenOffice to PDF uses textDocumentToPdf');
for (const [name, s] of [['word-to-pdf', word], ['excel-to-pdf', excel], ['openoffice-to-pdf', oo]] as const) {
  check(!/officeToPdf\(|xlsxToIR\(|docxToIR\(|odtToIR\(/.test(s), `${name}: no converter of its own left in the page`);
}

console.log('\n=== .xlsx in the Word to PDF Excel tab = the real sheet ===');
const xlsx = asFile(readFileSync(join(ROOT, 'test-fixtures/EPZ_SIERPIEN_2026.xlsx')), 'EPZ.xlsx');
const viaTab = await officeDocumentToPdf(xlsx);
const tab = await pdfText(viaTab.blob);
check(!viaTab.fallbackUsed, 'no fallback for a normal spreadsheet');
check(/08-01-26/.test(tab.text) && /\b08:00\b/.test(tab.text), 'dates and times in their cell format');
check(!/\b46235\b/.test(tab.text) && !/0\.3333/.test(tab.text), 'no raw date serials or day fractions');
const dedicated = await pdfText((await spreadsheetToPdf(xlsx)).blob);
check(dedicated.pages === tab.pages && dedicated.text === tab.text, `same result as Excel to PDF (${tab.pages} pages)`);
const old = await pdfText(await officeToPdf(xlsx));
check(/\b46235\b/.test(old.text) || /0\.3333/.test(old.text), 'control: the old tab path (officeToPdf) printed raw serials');

console.log('\n=== .odt without a positioned layout = the full ODT reader ===');
const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <office:automatic-styles>
    <style:style style:name="P1" style:family="paragraph"/>
    <style:style style:name="P2" style:family="paragraph" style:master-page-name="Next"/>
  </office:automatic-styles>
  <office:body><office:text>
    <text:p text:style-name="P1">FIRST PAGE text</text:p>
    <text:p text:style-name="P2">SECOND PAGE text</text:p>
  </office:text></office:body>
</office:document-content>`;
const zip = new JSZip();
zip.file('mimetype', 'application/vnd.oasis.opendocument.text');
zip.file('content.xml', content);
zip.file('META-INF/manifest.xml', '<?xml version="1.0"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/></manifest:manifest>');
const odt = asFile(await zip.generateAsync({ type: 'uint8array' }), 'breaks.odt');
const odtTab = await officeDocumentToPdf(odt);
const odtPdf = await pdfText(odtTab.blob);
check(!odtTab.fallbackUsed && odtPdf.pages === 2, `page break kept: 2 pages (got ${odtPdf.pages})`);
check(/FIRST PAGE/.test(odtPdf.text) && /SECOND PAGE/.test(odtPdf.text), 'both paragraphs present');
const odtDedicated = await pdfText((await textDocumentToPdf(odt)).blob);
check(odtDedicated.pages === odtPdf.pages && odtDedicated.text === odtPdf.text, 'same result as OpenOffice to PDF');
const odtOld = await pdfText(await officeToPdf(odt));
check(odtOld.pages === 1, `control: the old tab path (officeToPdf) lost the page break (${odtOld.pages} page)`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
