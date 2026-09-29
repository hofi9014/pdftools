// pdf-to-openoffice (renderIRToOdt) and openoffice/word-to-pdf (odtToIR/docxToIR → renderIRToPdf):
// layout of the ODT writer and alignment/page backgrounds in the readers.
//
// Reported by a user comparing a real 27-page report (allegro-raport.pdf) against its PDF → ODT
// output: the ODT writer emitted every block as a bare <text:p> in extraction order — one
// endless page, everything flush-left, white-on-orange banner titles and whole orange section
// pages rendered as white text on white, callout frames gone, a table always at the top of its
// page, image frames written straight into <office:text> (only allowed inside a paragraph), PDF
// subset font names ("PSWIZS+Gotham-Black") as font names, and a list whose items all sit at the
// same level above 0 nested one step deeper per item (a staircase). The writer now applies the
// same layout recovery as the docx writer. Reading back: paragraph alignment (w:jc /
// fo:text-align) was ignored by both readers, headings lost their shading, and a master page's
// background colour was not read.
//
// No LibreOffice in this environment: the ODT is checked structurally (XML) and by reading it
// back through our own odtToIR → renderIRToPdf and pdf.js.
import { register } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
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
const { extractFormattedTextFromPDF } = await import('../lib/client-pdf');
const { buildPdfImageMap } = await import('../lib/pdf/extractPdfImages');
const { renderIRToOdt, odtToIR, docxToIR, renderIRToPdf, writerImageToDocxImage } = await import('../lib/client-pdf-docx');
const { inferParagraphLayout } = await import('../lib/pdf/docxLayout');
import type { DocxImage, IRPageIR, IRTextRun, IRListItemBlock } from '../lib/client-pdf-docx';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
function toFile(buf: Uint8Array | Buffer, name: string): File {
  return Object.assign(new Blob([buf as BlobPart]), { name }) as unknown as File;
}
const ODF_TEXT = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0';
const ODF_OFFICE = 'urn:oasis:names:tc:opendocument:xmlns:office:1.0';
const ODF_DRAW = 'urn:oasis:names:tc:opendocument:xmlns:drawing:1.0';

async function pdfPages(blob: Blob): Promise<{ n: number; lines: (p: number) => Promise<{ str: string; x: number; w: number }[]> }> {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts: false }).promise;
  return {
    n: doc.numPages,
    lines: async (p) => (await (await doc.getPage(p)).getTextContent()).items
      .map((it) => it as { str?: string; transform?: number[]; width?: number })
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({ str: it.str!, x: it.transform![4]!, w: it.width! })),
  };
}

// ---------------------------------------------------------------------------------------------
console.log('=== 1. PDF → ODT writer on the real report (allegro-raport.pdf, 27 pages) ===');
const pdfFile = toFile(readFileSync(join(ROOT, 'test-real-pdfs/allegro-raport.pdf')), 'allegro-raport.pdf');
const pages = await extractFormattedTextFromPDF(pdfFile);
const imageMap = await buildPdfImageMap(pdfFile, []);
const odtImages = new Map<string, DocxImage>();
for (const [id, img] of imageMap.images) odtImages.set(id, writerImageToDocxImage(img));
const odtBytes = new Uint8Array(await (await renderIRToOdt(pages, odtImages)).arrayBuffer());
const odtZip = await JSZip.loadAsync(odtBytes);
const content = await odtZip.file('content.xml')!.async('string');
const stylesXml = await odtZip.file('styles.xml')!.async('string');
const cdoc = new DOMParser().parseFromString(content, 'application/xml');

// Paragraph style name -> its XML definition.
const styleDefs = new Map<string, string>();
for (const m of content.matchAll(/<style:style style:name="(P\d+)" style:family="paragraph"([\s\S]*?)<\/style:style>/g)) styleDefs.set(m[1]!, m[2]!);
const styleOf = (el: Element): string => styleDefs.get(el.getAttributeNS(ODF_TEXT, 'style-name') ?? '') ?? '';
const paras = [...Array.from(cdoc.getElementsByTagNameNS(ODF_TEXT, 'p')), ...Array.from(cdoc.getElementsByTagNameNS(ODF_TEXT, 'h'))] as unknown as Element[];
const textOf = (el: Element): string => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const findPara = (needle: string): Element | undefined => paras.find((p) => textOf(p).includes(needle));

const pageStarts = paras.filter((p) => /style:master-page-name=/.test(styleOf(p))).length;
check(pageStarts === 26, `one page start per source page after the first (got ${pageStarts}, expected 26)`);

const bgMaster = /<style:master-page style:name="(Bg_E94F1E)" style:page-layout-name="(pmBg\d+)"/.exec(stylesXml);
check(!!bgMaster && new RegExp(`style:name="${bgMaster[2]}"><style:page-layout-properties[^>]*fo:background-color="#E94F1E"`).test(stylesXml),
  'styles.xml declares an orange (#E94F1E) master page for the section title pages');
const orangePages = paras.filter((p) => styleOf(p).includes('style:master-page-name="Bg_E94F1E"')).length;
check(orangePages >= 10, `section title pages use the orange master page (got ${orangePages})`);
check(/fo:page-width="595.28pt" fo:page-height="841.89pt"/.test(stylesXml), 'page size of the source (A4 595.28×841.89 pt) in the page layout');

const section1 = findPara('Testują');
check(!!section1 && /fo:text-align="center"/.test(styleOf(section1)), 'section title "Testują" is centred');
const wzrost = findPara('WZROST');
check(!!wzrost && /fo:text-align="center"/.test(styleOf(wzrost)), '"WZROST" (in the narrow centred stack of the section page) is centred');
const lustro = findPara('lustrzane odbicie');
check(!!lustro && /fo:text-align="center"/.test(styleOf(lustro)), '"- lustrzane odbicie zdjęcia" (wider than the stack, centred on the page) is centred');
const banner = findPara('Czy zastanawiałeś');
check(!!banner && /fo:background-color="#E94F1E"/.test(styleOf(banner)), 'banner "Czy zastanawiałeś się kiedyś…" keeps its orange band');
check(!!section1 && !/fo:background-color/.test(styleOf(section1)), 'text on a section page is not given a per-line band (the page itself is orange)');
const boxed = paras.filter((p) => /fo:border="[^"]*#E94F1E"/.test(styleOf(p))).length;
check(boxed >= 5, `callout frames become paragraph borders (got ${boxed} bordered paragraphs)`);
const body = findPara('Prosta sprawa. Kiedy pobierasz');
check(!!body && !/fo:text-align|fo:background-color|fo:border/.test(styleOf(body)), 'an ordinary body paragraph stays left-aligned with no band/border');

const officeText = cdoc.getElementsByTagNameNS(ODF_OFFICE, 'text').item(0) as unknown as Element;
const frames = Array.from(cdoc.getElementsByTagNameNS(ODF_DRAW, 'frame')) as unknown as Element[];
check(frames.length === 4 && frames.every((f) => (f.parentNode as Element).localName === 'p'), `every image frame sits inside a paragraph (${frames.length} frames)`);
check(frames.every((f) => f.parentNode !== officeText), 'no frame is a direct child of <office:text>');
const cover = frames.find((f) => f.getAttributeNS(ODF_DRAW, 'style-name') === 'frBg');
check(!!cover && /style:name="frBg"[^>]*>[^<]*<style:graphic-properties[^>]*style:run-through="background"[^>]*style:horizontal-rel="page"/.test(content),
  'the full-page cover image is placed on the page behind the text, not inline');

check(!/style:font-name="[^"]*\+/.test(content) && !/Gotham-/.test(content), 'no PDF subset/style font names (e.g. "PSWIZS+Gotham-Black")');
const usedFonts = [...new Set([...content.matchAll(/style:font-name="([^"]+)"/g)].map((m) => m[1]!))];
check(usedFonts.length > 0 && usedFonts.every((f) => content.includes(`<style:font-face style:name="${f}"`)), `every font used is declared in office:font-face-decls (${usedFonts.join(', ')})`);

const listNesting = (el: Element): number => {
  let d = 0;
  for (let n: Node | null = el.parentNode; n; n = n.parentNode) if ((n as Element).localName === 'list') d++;
  return d;
};
const item2 = findPara('nigdy nie wiesz co konkretnie');
const item6 = findPara('kiedy już okaże się');
check(!!item2 && !!item6 && listNesting(item2) === 1 && listNesting(item6) === 1, 'items of one list level are siblings, not a staircase (nesting depth 1)');
check(/<text:list text:style-name="L1">/.test(content) && /<text:list-style style:name="L1">/.test(content), 'lists use a declared bullet list style');

console.log('\n=== 2. ODT written by us → openoffice-to-pdf: pages, backgrounds, alignment ===');
const { pages: rtPages, images: rtImages } = await odtToIR(toFile(odtBytes, 'raport.odt'));
const shapes = rtPages[0]!.blocks.filter((b) => b.kind === 'page-shape');
check(shapes.length >= 10 && shapes.every((s) => s.kind === 'page-shape' && s.color.toUpperCase() === 'E94F1E' && s.bounds.width > 590 && s.bounds.height > 840),
  `each orange master page reads back as a full-page background (${shapes.length})`);
const rt = await pdfPages(await renderIRToPdf(rtPages, rtImages));
check(rt.n === 27, `round trip keeps 27 pages (got ${rt.n})`);
const p3 = await rt.lines(3);
const t = p3.find((l) => l.str.includes('Testują'));
check(!!t && Math.abs(t.x + t.w / 2 - 595.28 / 2) < 6, `"Testują" is drawn centred on page 3 (centre ${t ? (t.x + t.w / 2).toFixed(1) : '-'})`);
const p4 = (await rt.lines(4)).map((l) => l.str).join(' ');
check(/aż o\s*10,7%/.test(p4.replace(/\s+/g, ' ')), '"aż o 10,7%" stays one sentence on page 4');

console.log('\n=== 3. Readers: fo:text-align / w:jc alignment, heading shading, master page background ===');
const odtXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="${ODF_OFFICE}" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="${ODF_TEXT}" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0">
  <office:automatic-styles>
    <style:style style:name="C" style:family="paragraph"><style:paragraph-properties fo:text-align="center"/></style:style>
    <style:style style:name="R" style:family="paragraph"><style:paragraph-properties fo:text-align="end"/></style:style>
    <style:style style:name="H" style:family="paragraph" style:master-page-name="Blue"><style:paragraph-properties fo:background-color="#223344" fo:text-align="center"/></style:style>
  </office:automatic-styles>
  <office:body><office:text>
    <text:p text:style-name="C">CENTRED LINE</text:p>
    <text:p text:style-name="R">RIGHT LINE</text:p>
    <text:p>LEFT LINE</text:p>
    <text:h text:style-name="H" text:outline-level="1">SHADED HEADING</text:h>
  </office:text></office:body>
</office:document-content>`;
const odtStyles = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="${ODF_OFFICE}" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0">
  <office:automatic-styles>
    <style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="595pt" fo:page-height="842pt"/></style:page-layout>
    <style:page-layout style:name="pm2"><style:page-layout-properties fo:page-width="595pt" fo:page-height="842pt" fo:background-color="#00AA55"/></style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="pm1"/>
    <style:master-page style:name="Blue" style:page-layout-name="pm2"/>
  </office:master-styles>
</office:document-styles>`;
const z = new JSZip();
z.file('mimetype', 'application/vnd.oasis.opendocument.text');
z.file('content.xml', odtXml);
z.file('styles.xml', odtStyles);
z.file('META-INF/manifest.xml', `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
</manifest:manifest>`);
const synth = await odtToIR(toFile(await z.generateAsync({ type: 'uint8array' }), 'align.odt'));
const sb = synth.pages[0]!.blocks;
const byText = (s: string) => sb.find((b) => 'runs' in b && (b.runs as IRTextRun[]).some((r) => r.text.includes(s)));
check((byText('CENTRED') as { align?: string } | undefined)?.align === 'center', 'fo:text-align="center" → align center');
check((byText('RIGHT') as { align?: string } | undefined)?.align === 'right', 'fo:text-align="end" → align right');
check((byText('LEFT') as { align?: string } | undefined)?.align === undefined, 'no fo:text-align → left (no align)');
const heading = byText('SHADED') as { kind: string; fill?: string } | undefined;
check(heading?.kind === 'heading' && heading.fill?.toLowerCase() === '223344', `a heading keeps its shading (fill ${heading?.fill})`);
check(sb.some((b) => b.kind === 'page-shape' && b.color.toLowerCase() === '00aa55'), 'a master page with fo:background-color yields a full-page background');
const sp = await pdfPages(await renderIRToPdf(synth.pages, synth.images));
const l1 = await sp.lines(1);
const c = l1.find((l) => l.str.includes('CENTRED'))!;
const r = l1.find((l) => l.str.includes('RIGHT'))!;
const lf = l1.find((l) => l.str.includes('LEFT'))!;
check(Math.abs(c.x + c.w / 2 - 595 / 2) < 2, `centred line drawn centred (centre ${(c.x + c.w / 2).toFixed(1)})`);
check(Math.abs(r.x + r.w - (595 - 50)) < 2, `right line ends at the right margin (${(r.x + r.w).toFixed(1)})`);
check(Math.abs(lf.x - 50) < 1, `left line starts at the left margin (${lf.x.toFixed(1)})`);

const dz = new JSZip();
dz.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
  <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>DOCX CENTRED</w:t></w:r></w:p>
  <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>DOCX RIGHT</w:t></w:r></w:p>
</w:body></w:document>`);
dz.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);
const dIR = await docxToIR(toFile(await dz.generateAsync({ type: 'uint8array' }), 'align.docx'));
const dp = await pdfPages(await renderIRToPdf(dIR.pages, dIR.images));
const dl = await dp.lines(1);
const dc = dl.find((l) => l.str.includes('DOCX CENTRED'))!;
const dr = dl.find((l) => l.str.includes('DOCX RIGHT'))!;
check(Math.abs(dc.x + dc.w / 2 - dIR.pages[0]!.width / 2) < 2, `w:jc="center" drawn centred (centre ${(dc.x + dc.w / 2).toFixed(1)})`);
check(Math.abs(dr.x + dr.w - (dIR.pages[0]!.width - 50)) < 2, `w:jc="right" ends at the right margin (${(dr.x + dr.w).toFixed(1)})`);

console.log('\n=== 4. Pure: list levels and page-centred alignment ===');
const run = (text: string): IRTextRun => ({ text, fontName: '', fontSize: 11, color: '000000', position: { x: 0, y: 0 }, width: 10, height: 11, bold: false, italic: false, rotation: 0 });
const li = (text: string, level: number, y: number): IRListItemBlock => ({ kind: 'list-item', marker: '•', level, runs: [{ ...run(text), position: { x: 100, y } }], bounds: { x: 100, y, width: 200, height: 11 } });
const listPage: IRPageIR = { width: 595, height: 842, blocks: [li('A', 2, 700), li('B', 2, 680), li('C', 3, 660), li('D', 2, 640), li('E', 0, 620)] };
const lc = await (await JSZip.loadAsync(await (await renderIRToOdt([listPage], new Map())).arrayBuffer())).file('content.xml')!.async('string');
const ldoc = new DOMParser().parseFromString(lc, 'application/xml');
const lparas = Array.from(ldoc.getElementsByTagNameNS(ODF_TEXT, 'p')) as unknown as Element[];
const depth = (s: string) => { const p = lparas.find((e) => textOf(e) === s); return p ? listNesting(p) : -1; };
check(depth('A') === 1 && depth('B') === 1 && depth('D') === 1, `same-level items are siblings (A ${depth('A')}, B ${depth('B')}, D ${depth('D')})`);
check(depth('C') === 2, `a deeper item nests exactly one level (C ${depth('C')})`);
check(depth('E') === 1, `a shallower item returns to the top list (E ${depth('E')})`);

const margins = { left: 100, right: 100, top: 50, bottom: 50 };
const blk = (x: number, w: number) => ({ kind: 'paragraph' as const, runs: [], bounds: { x, y: 400, width: w, height: 20 } });
const narrowCentredCol = { left: 207, right: 390 };
check(inferParagraphLayout(blk(83.6, 429.1), undefined, narrowCentredCol, margins, 595.28).alignment === 'center', 'wide line left of a centred stack, centred on the page → center');
check(inferParagraphLayout(blk(209.4, 177.7), undefined, narrowCentredCol, margins, 595.28).alignment === 'center', 'line in a narrow centred stack → center');
const bodyCol = { left: 100, right: 495 };
check(inferParagraphLayout(blk(100, 395), undefined, bodyCol, margins, 595.28).alignment === 'left', 'full-width body line (also symmetric on the page) stays left');
check(inferParagraphLayout(blk(100, 200), undefined, bodyCol, margins, 595.28).alignment === 'left', 'short body line at the column edge stays left');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
