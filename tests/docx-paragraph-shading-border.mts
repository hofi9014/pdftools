// word-to-pdf (docxToIR → renderIRToPdf): a paragraph's shading (w:shd, a solid background
// color band — used for colored banners/headers) and border (w:pBdr, a stroked frame around the
// whole paragraph — used for callout boxes) were never read at all. The WRITER direction
// (pdfToWordIR → renderIRToDocx) has produced both since the "ramki wokół treści (callout)" fix
// (2026-09-24) — verified directly: converting a real user PDF with pdf-to-word produces a .docx
// containing 76 <w:shd> and 12 <w:pBdr> elements, and an independent Word renderer (docx-preview)
// displays both correctly. But round-tripping that SAME .docx back through word-to-pdf silently
// dropped both — the banner's colored background and the callout box's border vanished entirely,
// while the text itself (color, bold, etc.) rendered correctly, since text formatting was never
// the missing piece. Reported directly by a user comparing an original PDF against the PDF they
// got back after PDF → Word → PDF, with two real screenshots showing the exact banner and box
// present in one and missing in the other.
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
import { docxToIR, renderIRToPdf } from '../lib/client-pdf-docx';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

function toFile(buf: Buffer, name: string): File {
  const blob = new Blob([buf]);
  return Object.assign(blob, { name }) as unknown as File;
}

console.log('=== word-to-pdf: paragraph shading (w:shd) and border (w:pBdr) survive the round trip ===');

const zip = new JSZip();
zip.file(
  'word/document.xml',
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:shd w:fill="E94F1E" w:color="auto" w:val="clear"/></w:pPr><w:r><w:rPr><w:color w:val="FFFFFF"/></w:rPr><w:t>Banner text on colored background</w:t></w:r></w:p>
    <w:p><w:pPr><w:pBdr><w:top w:val="single" w:color="00AA00" w:sz="8" w:space="4"/><w:bottom w:val="single" w:color="00AA00" w:sz="8" w:space="4"/><w:left w:val="single" w:color="00AA00" w:sz="8" w:space="21"/><w:right w:val="single" w:color="00AA00" w:sz="8" w:space="8"/></w:pBdr></w:pPr><w:r><w:t>Callout box text</w:t></w:r></w:p>
    <w:p><w:r><w:t>Plain paragraph, no shading or border</w:t></w:r></w:p>
  </w:body>
</w:document>`,
);
zip.file(
  'word/_rels/document.xml.rels',
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
);
const buf = await zip.generateAsync({ type: 'nodebuffer' });
const file = toFile(buf, 'shading-border.docx');

const { pages, images } = await docxToIR(file);
const blocks = pages[0]!.blocks as Array<{ kind: string; fill?: string; border?: string; runs?: { text: string }[] }>;
const banner = blocks.find((b) => b.runs?.some((r) => r.text.includes('Banner text')));
const callout = blocks.find((b) => b.runs?.some((r) => r.text.includes('Callout box')));
const plain = blocks.find((b) => b.runs?.some((r) => r.text.includes('Plain paragraph')));

check(banner?.fill === 'e94f1e', `docxToIR reads w:shd fill onto the paragraph block (got ${banner?.fill})`);
check(callout?.border === '00aa00', `docxToIR reads w:pBdr color onto the paragraph block (got ${callout?.border})`);
check(!plain?.fill && !plain?.border, 'a plain paragraph gets neither fill nor border (no false positive)');

const blob = await renderIRToPdf(pages, images);
const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts: false }).promise;
const opList = await (await doc.getPage(1)).getOperatorList();
const fillColors = new Set<string>();
const strokeColors = new Set<string>();
opList.fnArray.forEach((fn, i) => {
  if (fn === pdfjsLib.OPS.setFillRGBColor) fillColors.add(String(opList.argsArray[i]).toUpperCase());
  if (fn === pdfjsLib.OPS.setStrokeRGBColor) strokeColors.add(String(opList.argsArray[i]).toUpperCase());
});
check(fillColors.has('#E94F1E'), `rendered PDF actually draws the banner's fill color (seen: ${[...fillColors].join(' ')})`);
check(strokeColors.has('#00AA00'), `rendered PDF actually draws the callout box's border color (seen: ${[...strokeColors].join(' ')})`);

const text1 = await (await doc.getPage(1)).getTextContent();
const pageText = text1.items.map((it) => (it as { str?: string }).str ?? '').join(' ');
check(pageText.includes('Banner text on colored background'), 'banner text itself is still present and correct');
check(pageText.includes('Callout box text'), 'callout box text itself is still present and correct');
check(pageText.includes('Plain paragraph'), 'plain paragraph text is still present and correct');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
