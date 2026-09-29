// openoffice-to-pdf / odt-to-pdf (odtToIR → renderIRToPdf): odtToIR never looked for
// style:master-page-name, the ODF mechanism (ODF 1.2 §19.502: its presence on a paragraph/
// heading/table style means "insert a page break before this element") a producer uses to mark
// page boundaries — the direct equivalent of Word's fo:break-before="page"/pageBreakBefore,
// already handled on the docx side (docx-page-break fix, 2026-09-26). Word's own mechanism has
// no ODF counterpart in the pdf-to-openoffice writer's own output (confirmed directly: 0
// occurrences of fo:break-before="page", 53 of style:master-page-name), so every real .docx —
// including our own tool's ODT output — silently lost ALL page breaks when read back by
// odt-to-pdf. Reported directly by a user comparing an original 27-page PDF against the PDF
// they got back after PDF → OpenOffice (ODT) → PDF: a real document collapsed from 27 pages to
// just 9 badly overcrowded ones. Confirmed on that exact real file, then reproduced here with a
// minimal synthetic fixture covering the three concrete shapes found in the real file:
// (1) a plain paragraph directly carrying master-page-name, (2) an EMPTY page-break-only
// paragraph immediately followed by real content (the break must carry forward, not vanish
// along with the empty carrier), and (3) a heading nested inside a <text:list> (list-item
// wrapping must not silently drop the break either).
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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
import { odtToIR, renderIRToPdf } from '../lib/client-pdf-docx';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

function toFile(buf: Buffer, name: string): File {
  const blob = new Blob([buf]);
  return Object.assign(blob, { name }) as unknown as File;
}

console.log('=== odt-to-pdf: style:master-page-name is recognized as a page break ===');

const contentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <office:automatic-styles>
    <style:style style:name="P1" style:family="paragraph"/>
    <style:style style:name="P2" style:family="paragraph" style:master-page-name="Second"/>
    <style:style style:name="P3" style:family="paragraph" style:master-page-name="Third"/>
    <style:style style:name="H1" style:family="paragraph" style:master-page-name="Fourth"/>
  </office:automatic-styles>
  <office:body>
    <office:text>
      <text:p text:style-name="P1">PAGE ONE paragraph A</text:p>
      <text:p text:style-name="P1">PAGE ONE paragraph B</text:p>
      <text:p text:style-name="P2">PAGE TWO starts here</text:p>
      <text:p text:style-name="P3"/>
      <text:p text:style-name="P1">PAGE THREE real content after empty carrier</text:p>
      <text:list>
        <text:list-item>
          <text:h text:style-name="H1" text:outline-level="1">PAGE FOUR heading inside a list</text:h>
        </text:list-item>
      </text:list>
    </office:text>
  </office:body>
</office:document-content>`;

const zip = new JSZip();
zip.file('content.xml', contentXml);
zip.file('mimetype', 'application/vnd.oasis.opendocument.text');
zip.file(
  'META-INF/manifest.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`,
);
const buf = await zip.generateAsync({ type: 'nodebuffer' });
const file = toFile(buf, 'page-breaks.odt');

const { pages, images } = await odtToIR(file);
const blocks = pages[0]!.blocks as Array<{ kind: string; pageBreakBefore?: boolean; runs?: { text: string }[] }>;

const pageTwo = blocks.find((b) => b.runs?.some((r) => r.text.includes('PAGE TWO')));
check(pageTwo?.pageBreakBefore === true, `direct master-page-name on a paragraph sets pageBreakBefore (got ${pageTwo?.pageBreakBefore})`);

const pageThree = blocks.find((b) => b.runs?.some((r) => r.text.includes('PAGE THREE')));
check(pageThree?.pageBreakBefore === true, `an empty page-break-only paragraph's break carries forward to the next real content (got ${pageThree?.pageBreakBefore})`);

const pageFour = blocks.find((b) => b.runs?.some((r) => r.text.includes('PAGE FOUR')));
check(pageFour?.kind === 'list-item', 'the heading nested in a list is represented as a list-item block (structural expectation)');
check(pageFour?.pageBreakBefore === true, `a heading's master-page-name survives being wrapped as a list-item (got ${pageFour?.pageBreakBefore})`);

const pageOneA = blocks.find((b) => b.runs?.some((r) => r.text.includes('PAGE ONE paragraph A')));
check(!pageOneA?.pageBreakBefore, 'a paragraph with no master-page-name style gets no page break (no false positive)');

const blob = await renderIRToPdf(pages, images);
const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts: false }).promise;
check(doc.numPages === 4, `rendered PDF has exactly 4 pages (one per page break) — got ${doc.numPages}`);

async function pageText(n: number): Promise<string> {
  const tc = await (await doc.getPage(n)).getTextContent();
  return tc.items.map((it) => (it as { str?: string }).str ?? '').join(' ');
}
const [t1, t2, t3, t4] = await Promise.all([pageText(1), pageText(2), pageText(3), pageText(4)]);
check(t1.includes('PAGE ONE paragraph A') && t1.includes('PAGE ONE paragraph B') && !t1.includes('PAGE TWO'), `page 1 has both page-one paragraphs and nothing from page two (got: ${JSON.stringify(t1)})`);
check(t2.includes('PAGE TWO') && !t2.includes('PAGE ONE') && !t2.includes('PAGE THREE'), `page 2 has exactly the page-two content (got: ${JSON.stringify(t2)})`);
check(t3.includes('PAGE THREE') && !t3.includes('PAGE TWO') && !t3.includes('PAGE FOUR'), `page 3 has exactly the page-three content (got: ${JSON.stringify(t3)})`);
check(t4.includes('PAGE FOUR') && !t4.includes('PAGE THREE'), `page 4 has exactly the page-four content (got: ${JSON.stringify(t4)})`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
