// openoffice-to-pdf / word-to-pdf (odtToIR / docxToIR → renderIRToPdf):
//   1. A line break inside a paragraph (ODF <text:line-break/>, Word <w:br/> and <w:cr/> —
//      Shift+Enter) was read as a space, so "Ten sam produkt - kategoria nr 1…" and "…nr 2…",
//      two lines of one callout in a real PDF→ODT file, ran together into one line.
//   2. Several paragraphs in one bordered box (paragraphs of one ODF text frame, or Word
//      paragraphs with the same w:pBdr, which Word draws as a single box) were drawn as a stack
//      of separate boxes, one per paragraph.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('/')) {
    const filePath = join(ROOT, 'public', url);
    if (existsSync(filePath)) return new Response(new Uint8Array(readFileSync(filePath)), { status: 200 });
  }
  return originalFetch(input, init);
}) as typeof fetch;

import JSZip from 'jszip';
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;
import { odtToIR, docxToIR, renderIRToPdf, type IRPageIR, type DocxImage } from '../lib/client-pdf-docx';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const asFile = (buf: Buffer, name: string) => Object.assign(new Blob([buf]), { name }) as unknown as File;

interface Rendered { lines: Map<string, number>; strokes: string[] }
/** Text item → y position, and the stroke colours of every rectangle border drawn. */
async function render(pages: IRPageIR[], images: Map<string, DocxImage>): Promise<Rendered> {
  const bytes = new Uint8Array(await (await renderIRToPdf(pages, images)).arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data: bytes, useSystemFonts: false }).promise;
  const lines = new Map<string, number>();
  const strokes: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    for (const it of tc.items) if ('str' in it && it.str.trim()) lines.set(it.str.trim(), (p - 1) * 10000 - it.transform[5]);
    const ops = await page.getOperatorList();
    ops.fnArray.forEach((fn, i) => {
      if (fn === pdfjsLib.OPS.setStrokeRGBColor) strokes.push(String(ops.argsArray[i]));
    });
  }
  return { lines, strokes };
}
const yOf = (r: Rendered, start: string) => [...r.lines].find(([s]) => s.startsWith(start))?.[1];

// ── ODT ──
const NS = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"`;
const odtContent = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content ${NS}>
  <office:automatic-styles>
    <style:style style:name="FRS" style:family="graphic"><style:graphic-properties draw:stroke="solid" svg:stroke-color="#e94f1e" draw:fill="none"/></style:style>
    <style:style style:name="P1" style:family="paragraph"/>
  </office:automatic-styles>
  <office:body><office:text>
    <text:p text:style-name="P1">Intro paragraph before the box.</text:p>
    <text:p text:style-name="P1"><draw:frame svg:x="2cm" svg:y="1cm" svg:width="15cm" svg:height="4cm" draw:style-name="FRS" text:anchor-type="char"><draw:text-box>
      <text:p text:style-name="P1">Product one - category 1<text:line-break/>Product one - category 2</text:p>
      <text:p text:style-name="P1">Second paragraph in the same frame.</text:p>
      <text:p text:style-name="P1">Third paragraph in the same frame.</text:p>
    </draw:text-box></draw:frame></text:p>
    <text:p text:style-name="P1">Outro paragraph after the box.</text:p>
  </office:text></office:body>
</office:document-content>`;
const odt = new JSZip();
odt.file('mimetype', 'application/vnd.oasis.opendocument.text');
odt.file('content.xml', odtContent);
odt.file('META-INF/manifest.xml', `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/></manifest:manifest>`);

console.log('=== ODT: text:line-break and a multi-paragraph text frame ===');
const o = await odtToIR(asFile(await odt.generateAsync({ type: 'nodebuffer' }), 'frame.odt'));
const oText = o.pages.flatMap((p) => p.blocks).map((b) => ('runs' in b ? b.runs.map((r) => r.text).join('') : '')).join('|');
check(oText.includes('category 1\ncategory 2') || oText.includes('category 1\nProduct one - category 2'), 'text:line-break is read as a line break, not a space');
const oR = await render(o.pages, o.images);
const y1 = yOf(oR, 'Product one - category 1');
const y2 = yOf(oR, 'Product one - category 2');
check(y1 !== undefined && y2 !== undefined && y2 > y1 + 5, `the two lines of the paragraph are on separate lines (y ${y1} / ${y2})`);
const orange = oR.strokes.filter((s) => s.toLowerCase() === '#e94f1e');
check(orange.length === 1, `the three paragraphs of the frame share ONE orange box (got ${orange.length})`);
check((yOf(oR, 'Outro') ?? 0) > (yOf(oR, 'Third paragraph') ?? Infinity), 'text after the box follows it');

// ── DOCX ──
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const bdr = (c: string) => `<w:pPr><w:pBdr><w:top w:val="single" w:color="${c}" w:sz="8"/><w:bottom w:val="single" w:color="${c}" w:sz="8"/><w:left w:val="single" w:color="${c}" w:sz="8"/><w:right w:val="single" w:color="${c}" w:sz="8"/></w:pBdr></w:pPr>`;
const docx = new JSZip();
docx.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W}><w:body>
  <w:p><w:r><w:t>First line</w:t><w:br/><w:t>Second line</w:t><w:cr/><w:t>Third line</w:t></w:r></w:p>
  <w:p>${bdr('00AA00')}<w:r><w:t>Boxed paragraph one.</w:t></w:r></w:p>
  <w:p>${bdr('00AA00')}<w:r><w:t>Boxed paragraph two.</w:t></w:r></w:p>
  <w:p><w:r><w:t>Unboxed paragraph between.</w:t></w:r></w:p>
  <w:p>${bdr('00AA00')}<w:r><w:t>Another box.</w:t></w:r></w:p>
  <w:p><w:r><w:t>Before page break</w:t><w:br w:type="page"/></w:r></w:p>
  <w:p><w:r><w:t>After page break</w:t></w:r></w:p>
</w:body></w:document>`);

docx.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);

console.log('\n=== DOCX: <w:br/> / <w:cr/> and paragraphs sharing a w:pBdr ===');
const d = await docxToIR(asFile(await docx.generateAsync({ type: 'nodebuffer' }), 'breaks.docx'));
const dR = await render(d.pages, d.images);
const [a, b, c] = [yOf(dR, 'First line'), yOf(dR, 'Second line'), yOf(dR, 'Third line')];
check(a !== undefined && b !== undefined && c !== undefined && b > a + 5 && c > b + 5, `<w:br/> and <w:cr/> start new lines (y ${a} / ${b} / ${c})`);
const green = dR.strokes.filter((s) => s.toLowerCase() === '#00aa00');
check(green.length === 2, `two adjacent paragraphs with the same border share one box; the separate one keeps its own (got ${green.length}, expected 2)`);
check(!([...dR.lines.keys()].some((s) => s.includes('Before page break') && s.includes('After'))), 'a page break is still not a line break');
const pb = [yOf(dR, 'Before page break'), yOf(dR, 'After page break')];
check(pb[0] !== undefined && pb[1] !== undefined && pb[1] - pb[0] > 5000, 'the page break still starts a new page');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
