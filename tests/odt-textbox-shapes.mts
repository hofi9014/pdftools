// openoffice-to-pdf (odtToIR → renderIRToPdf) on ODT files written by third-party PDF→ODT
// converters. Reported by a user: an ODT of a real 27-page report, produced by an Aspose-based
// converter, came back from openoffice-to-pdf as 9 overcrowded pages with the cover gone, every
// banner title and footer missing and the orange section pages white. Such converters place every
// absolutely positioned element in drawing objects anchored to the PAGE:
//   * the cover is a page-anchored <draw:frame><draw:image> — extractOdtImages skipped all
//     page-anchored images;
//   * a banner is a <draw:g> holding a filled <draw:custom-shape> with a transparent
//     <draw:frame><draw:text-box> laid over it — text-box text was dropped entirely and the
//     shape's colour never read;
//   * a running footer is the same construction at the bottom of the page — in document order it
//     sits right under the page title;
//   * a coloured section page is a full-page filled shape in a page-anchored group;
//   * a 60 pt section number ("1.") was drawn with the heading's nominal line step, and the next
//     line went straight through it.
// This fixture reproduces those shapes exactly as found in the real file (same elements, styles
// and units), without the user's document.
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
import { odtToIR, renderIRToPdf, type IRBlock, type IRTextRun } from '../lib/client-pdf-docx';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const NS = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"`;
const shapeStyle = (name: string, color: string, rel: 'page' | 'paragraph') =>
  `<style:style style:name="${name}" style:family="graphic"><style:graphic-properties draw:stroke="solid" draw:fill-color="${color}" fo:background-color="${color}" style:horizontal-rel="${rel}" style:vertical-rel="${rel}" style:run-through="foreground"/></style:style>`;
const shape = (y: string, h: string, style: string) =>
  `<draw:custom-shape svg:x="-0.02cm" svg:y="${y}" svg:width="21.04cm" svg:height="${h}" draw:style-name="${style}"><draw:enhanced-geometry draw:type="non-primitive" svg:viewBox="0 0 1000000 1000000" draw:enhanced-path="M 999953 0 L 0 0 0 999953 999953 999953 Z N"/></draw:custom-shape>`;
const textFrame = (y: string, h: string, pStyle: string, tStyle: string, text: string) =>
  `<draw:frame svg:x="-0.02cm" svg:y="${y}" svg:width="21.04cm" svg:height="${h}" draw:style-name="FRT" text:anchor-type="char"><draw:text-box><text:p text:style-name="${pStyle}"><text:span text:style-name="${tStyle}">${text}</text:span></text:p></draw:text-box></draw:frame>`;

const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content ${NS}>
  <office:automatic-styles>
    <style:style style:name="FR1" style:family="graphic"><style:graphic-properties style:horizontal-rel="page" style:vertical-rel="page" style:run-through="background"/></style:style>
    <style:style style:name="FRG" style:family="graphic"><style:graphic-properties style:horizontal-rel="page" style:vertical-rel="page" style:wrap="run-through" style:run-through="background"/></style:style>
    ${shapeStyle('FRO', '#e94f1e', 'paragraph')}
    ${shapeStyle('FRD', '#1d1d1b', 'paragraph')}
    <style:style style:name="FRT" style:family="graphic"><style:graphic-properties draw:fill="none" draw:stroke="none"/></style:style>
    <style:style style:name="P1" style:family="paragraph"/>
    <style:style style:name="P2" style:family="paragraph" style:master-page-name="Standard"/>
    <style:style style:name="P3" style:family="paragraph" style:master-page-name="Standard"/>
    <style:style style:name="PC" style:family="paragraph"><style:paragraph-properties fo:text-align="center"/></style:style>
    <style:style style:name="TW" style:family="text"><style:text-properties fo:color="#ffffff" fo:font-size="24pt" fo:font-weight="bold"/></style:style>
    <style:style style:name="TF" style:family="text"><style:text-properties fo:color="#ffffff" fo:font-size="12pt"/></style:style>
    <style:style style:name="TB" style:family="text"><style:text-properties fo:color="#1d1d1b" fo:font-size="11pt"/></style:style>
    <style:style style:name="TH" style:family="text"><style:text-properties fo:color="#ffffff" fo:font-size="60pt"/></style:style>
    <style:style style:name="TS" style:family="text"><style:text-properties fo:color="#ffffff" fo:font-size="32pt"/></style:style>
  </office:automatic-styles>
  <office:body><office:text>
    <text:section text:name="S1"><text:p text:style-name="P1"><draw:frame svg:x="0cm" svg:y="0cm" svg:width="20.997cm" svg:height="29.7cm" draw:style-name="FR1" text:anchor-type="page"><draw:image xlink:href="Pictures/image1.png" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p></text:section>
    <text:section text:name="S2"><text:p text:style-name="P2"><draw:g draw:style-name="FRG" text:anchor-type="page">${shape('-0.026cm', '2.822cm', 'FRO')}${textFrame('-0.026cm', '2.822cm', 'PC', 'TW', 'BANNER TITLE')}</draw:g><draw:g draw:style-name="FRG" text:anchor-type="page">${shape('27.775cm', '1.953cm', 'FRD')}${textFrame('27.775cm', '1.953cm', 'PC', 'TF', 'FOOTER TEXT')}</draw:g></text:p>
      <text:p text:style-name="P1"><text:span text:style-name="TB">BODY PARAGRAPH one of page two.</text:span></text:p>
      <text:p text:style-name="P1"><text:span text:style-name="TB">BODY PARAGRAPH two of page two.</text:span></text:p>
    </text:section>
    <text:section text:name="S3"><text:h text:style-name="P3" text:outline-level="1"><draw:g draw:style-name="FRG" text:anchor-type="page">${shape('-0.026cm', '27.855cm', 'FRO')}${shape('27.775cm', '1.953cm', 'FRD')}</draw:g><text:span text:style-name="TH">1.</text:span></text:h>
      <text:p text:style-name="PC"><text:span text:style-name="TS">SECTION TITLE</text:span></text:p>
    </text:section>
  </office:text></office:body>
</office:document-content>`;
const styles = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles ${NS}>
  <office:automatic-styles><style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm"/></style:page-layout></office:automatic-styles>
  <office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles>
</office:document-styles>`;
// 2x2 opaque PNG.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAwMDAwMDAAAAPfgEBVIFvWgAAAABJRU5ErkJggg==', 'base64');

const zip = new JSZip();
zip.file('mimetype', 'application/vnd.oasis.opendocument.text');
zip.file('content.xml', content);
zip.file('styles.xml', styles);
zip.file('Pictures/image1.png', png);
zip.file('META-INF/manifest.xml', `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="Pictures/image1.png" manifest:media-type="image/png"/>
</manifest:manifest>`);
const buf = await zip.generateAsync({ type: 'nodebuffer' });
const file = Object.assign(new Blob([buf]), { name: 'aspose-like.odt' }) as unknown as File;

console.log('=== odtToIR: page-anchored drawings of a PDF→ODT converter ===');
const { pages, images } = await odtToIR(file);
const blocks = pages[0]!.blocks;
const textOf = (b: IRBlock) => ('runs' in b ? (b.runs as IRTextRun[]).map((r) => r.text).join('') : '');
const find = (s: string) => blocks.findIndex((b) => textOf(b).includes(s));

check(blocks[0]?.kind === 'image' && images.size === 1, `the page-anchored cover image is kept (first block ${blocks[0]?.kind}, ${images.size} image)`);
const banner = blocks[find('BANNER TITLE')] as { fill?: string; align?: string } | undefined;
check(!!banner, 'banner text inside <draw:text-box> is read');
check(banner?.fill?.toLowerCase() === 'e94f1e', `banner paragraph takes the colour of the shape under its frame (fill ${banner?.fill})`);
const footerIdx = find('FOOTER TEXT');
const footer = blocks[footerIdx] as { fill?: string; role?: string } | undefined;
check(footer?.role === 'footer' && footer.fill?.toLowerCase() === '1d1d1b', `bottom text box is a running footer on its dark bar (role ${footer?.role}, fill ${footer?.fill})`);
check(footerIdx > find('BODY PARAGRAPH two'), 'the footer is moved after the page body (it sits under the page title in document order)');
const sectionStart = blocks.findIndex((b) => (b as { pageBreakBefore?: boolean }).pageBreakBefore && blocks.indexOf(b) > footerIdx);
const sectionShapes = blocks.slice(sectionStart).filter((b) => b.kind === 'page-shape');
check(blocks[sectionStart]?.kind === 'page-shape', 'the section page starts with its background shapes (drawn before its text)');
check(sectionShapes.length === 2 && sectionShapes.some((s) => s.kind === 'page-shape' && s.color.toLowerCase() === 'e94f1e' && s.bounds.height > 780),
  `full-page orange shape and bottom bar become page backgrounds (${sectionShapes.length})`);
check(!blocks.slice(0, sectionStart).some((b) => b.kind === 'page-shape'), 'shapes that carry a text frame (banner, footer bar) are not page backgrounds');

console.log('\n=== renderIRToPdf ===');
const pdfBytes = new Uint8Array(await (await renderIRToPdf(pages, images)).arrayBuffer());
const doc = await pdfjsLib.getDocument({ data: pdfBytes, useSystemFonts: false }).promise;
check(doc.numPages === 3, `3 pages: cover, content, section page (got ${doc.numPages})`);
const ops1 = await (await doc.getPage(1)).getOperatorList();
check(ops1.fnArray.includes(pdfjsLib.OPS.paintImageXObject), 'page 1 paints the cover image');
const items = async (n: number) => (await (await doc.getPage(n)).getTextContent()).items
  .map((it) => it as { str: string; transform: number[] }).filter((it) => it.str.trim());
const p2 = await items(2);
const ft = p2.find((i) => i.str.includes('FOOTER'));
check(!!ft && ft.transform[5]! < 0.15 * 842, `the footer is drawn at the bottom of page 2 (baseline y ${ft?.transform[5]?.toFixed(1)})`);
const p3 = await items(3);
const one = p3.find((i) => i.str.includes('1.'));
const title = p3.find((i) => i.str.includes('SECTION TITLE'));
check(!!one && !!title && one.transform[5]! - title.transform[5]! >= 32, `the 60 pt "1." and the next line do not overlap (baseline gap ${one && title ? (one.transform[5]! - title.transform[5]!).toFixed(1) : '-'})`);
const ops3 = await (await doc.getPage(3)).getOperatorList();
const fills3 = ops3.fnArray.filter((f) => f === pdfjsLib.OPS.constructPath).length;
check(fills3 >= 2, `page 3 draws its background shapes (${fills3} paths)`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
