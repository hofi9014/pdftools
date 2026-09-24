// XLSX conditional formatting: rules stored raw by xlsxToIR are now evaluated and their dxf
// (fill / font colour / bold) is applied at PDF render time. Builds a real minimal .xlsx zip
// (styles.xml <dxfs> + sheet <conditionalFormatting>), runs xlsxToIR → applyConditionalFormatting
// and the real renderSpreadsheetIRToPdf, then reads the drawn fill colours back out of the PDF
// operator list with pdf.js (a compile-only check would pass even if the logic were dead).
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
import JSZip from 'jszip';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;
(globalThis as Record<string, unknown>).DOMParser = DOMParser;

import { xlsxToIR, renderSpreadsheetIRToPdf } from '../lib/client-pdf-docx.ts';
import { applyConditionalFormatting } from '../lib/xlsx-conditional-formatting.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const rowsXml = [
  ['Name', 'Score'], ['alpha', 5], ['beta', 50], ['gamma', 500], ['alpha', 50],
].map((r, i) => `<row r="${i + 1}">${r.map((v, j) => {
  const ref = String.fromCharCode(65 + j) + (i + 1);
  return typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${v}</t></is></c>`;
}).join('')}</row>`).join('');

const sheetXml = `<?xml version="1.0"?><worksheet xmlns="${NS}"><sheetData>${rowsXml}</sheetData>
<conditionalFormatting sqref="B2:B5"><cfRule type="cellIs" dxfId="0" priority="1" operator="greaterThan"><formula>100</formula></cfRule></conditionalFormatting>
<conditionalFormatting sqref="B2:B5"><cfRule type="cellIs" dxfId="1" priority="2" operator="between"><formula>10</formula><formula>100</formula></cfRule></conditionalFormatting>
<conditionalFormatting sqref="A2:A5"><cfRule type="duplicateValues" dxfId="2" priority="3"/></conditionalFormatting>
<conditionalFormatting sqref="A2:B5"><cfRule type="expression" dxfId="3" priority="4"><formula>$B2=5</formula></cfRule></conditionalFormatting>
</worksheet>`;
const stylesXml = `<?xml version="1.0"?><styleSheet xmlns="${NS}">
<fonts count="1"><font><sz val="11"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border/></borders><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0"/></cellXfs>
<dxfs count="4">
<dxf><font><b/><color rgb="FF9C0006"/></font><fill><patternFill><bgColor rgb="FFFFC7CE"/></patternFill></fill></dxf>
<dxf><fill><patternFill><bgColor rgb="FFC6EFCE"/></patternFill></fill></dxf>
<dxf><font><i/></font><fill><patternFill><bgColor rgb="FFFFEB9C"/></patternFill></fill></dxf>
<dxf><fill><patternFill><bgColor rgb="FFB4C6E7"/></patternFill></fill></dxf>
</dxfs></styleSheet>`;

const zip = new JSZip();
zip.file('[Content_Types].xml', `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>`);
zip.file('_rels/.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
zip.file('xl/workbook.xml', `<?xml version="1.0"?><workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S1" sheetId="1" r:id="rId1"/></sheets></workbook>`);
zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
zip.file('xl/worksheets/sheet1.xml', sheetXml);
zip.file('xl/styles.xml', stylesXml);
const xlsx = new File([await zip.generateAsync({ type: 'uint8array' })], 't.xlsx');

const ir = await xlsxToIR(xlsx);
const sheet = ir.sheets[0]!;
check((sheet.conditionalFormattingRules?.length ?? 0) === 4, `4 rules parsed (got ${sheet.conditionalFormattingRules?.length})`);
check(sheet.conditionalFormattingRules?.every((r) => !!r.dxf) === true, 'every rule resolved its dxf from styles.xml');

const out = applyConditionalFormatting(sheet);
const fill = (r: number, c: number) => out.cells[r]?.[c]?.fmt?.fillHex;
check(fill(1, 1) === 'B4C6E7', 'B2=5 gets expression-rule fill B4C6E7');
check(fill(2, 1) === 'C6EFCE', `B3=50 between 10..100 → C6EFCE (got ${fill(2, 1)})`);
check(fill(3, 1) === 'FFC7CE' && out.cells[3]![1]!.fmt?.bold === true && out.cells[3]![1]!.fmt?.colorHex === '9C0006',
  `B4=500 >100 → FFC7CE + bold + 9C0006 (got ${fill(3, 1)})`);
check(fill(1, 0) === 'FFEB9C' && out.cells[1]![0]!.fmt?.italic === true, `A2 "alpha" duplicate → FFEB9C italic (got ${fill(1, 0)})`);
check(fill(4, 0) === 'FFEB9C', `A5 "alpha" duplicate → FFEB9C (got ${fill(4, 0)})`);
check(fill(2, 0) === undefined, `A3 "beta" unique → no fill (got ${fill(2, 0)})`);
check(sheet.cells[3]![1]!.fmt?.fillHex === undefined, 'source IR is NOT mutated (display-only)');

// End to end: fills really land in the rendered PDF.
const pdf = await renderSpreadsheetIRToPdf(ir, {}, async (n) => new Uint8Array(readFileSync(join(ROOT, 'public', 'pdfjs-dist', 'standard_fonts', n))));
const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await pdf.arrayBuffer()), useSystemFonts: false }).promise;
const opList = await (await doc.getPage(1)).getOperatorList();
const drawn = new Set<string>();
opList.fnArray.forEach((fn, i) => {
  if (fn === pdfjsLib.OPS.setFillRGBColor) drawn.add(String(opList.argsArray[i]).toUpperCase());
});
const seen = [...drawn].join(' ');
for (const hex of ['#FFC7CE', '#C6EFCE', '#FFEB9C', '#B4C6E7']) {
  check(drawn.has(hex), `PDF contains fill ${hex} (fills seen: ${seen})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
