// Word→PDF ignored every page break: docxToIR reads the whole body as ONE flowing page and had no
// notion of w:pageBreakBefore, a manual break (Ctrl+Enter: <w:br w:type="page"/>) or a next-page
// section break, so a document whose chapters start on new pages came out packed together (a
// 27-page PDF → Word → PDF gave 13 pages). Now the reader flags the block that starts a page and
// the renderer starts a new page there (and does nothing when already at the top of one).
// Proven on the IR flags, on the page count of the rendered PDF, and on a PDF→Word→PDF round trip.
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('/')) {
    const filePath = join(ROOT, 'public', url);
    if (existsSync(filePath)) return new Response(new Uint8Array(readFileSync(filePath)), { status: 200 });
  }
  return originalFetch(input, init);
}) as typeof fetch;

register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

import JSZip from 'jszip';
import { docxToIR, renderIRToPdf, paragraphPageBreaks, type IRBlock } from '../lib/client-pdf-docx';
import { pdfToWordIR } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
async function docx(body: string): Promise<File> {
  const zip = new JSZip();
  zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`);
  return Object.assign(new Blob([await zip.generateAsync({ type: 'uint8array' }) as BlobPart]), { name: 't.docx' }) as unknown as File;
}
const p = (text: string, pPr = '') => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}<w:r><w:t>${text}</w:t></w:r></w:p>`;
const brOnly = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
const textOf = (b: IRBlock) => ('runs' in b ? b.runs.map((r) => r.text).join('') : '');
const flagged = (blocks: IRBlock[]) => blocks.filter((b) => (b as { pageBreakBefore?: boolean }).pageBreakBefore).map(textOf);
async function pagesOf(file: File): Promise<string[]> {
  const { pages, images } = await docxToIR(file);
  const pdf = new Uint8Array(await (await renderIRToPdf(pages, images)).arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data: pdf, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) out.push((await (await doc.getPage(i)).getTextContent()).items.map((it) => ('str' in it ? it.str : '')).join(' '));
  return out;
}

console.log('=== the flags in the IR ===');
{
  const { pages } = await docxToIR(await docx(p('Alfa') + p('Beta', '<w:pageBreakBefore/>') + p('Gamma') + brOnly + p('Delta') + p('Epsilon', '<w:sectPr><w:type w:val="continuous"/></w:sectPr>') + p('Zeta') + p('Eta', '<w:sectPr/>') + p('Theta')));
  const blocks = pages[0]!.blocks;
  check(JSON.stringify(flagged(blocks)) === JSON.stringify(['Beta', 'Delta', 'Theta']), `pageBreakBefore, a break-only paragraph and a next-page section break flag the block that follows (got ${JSON.stringify(flagged(blocks))})`);
  check(!flagged(blocks).includes('Zeta'), 'a "continuous" section break does not');
  check(blocks.length === 9 - 1, 'the break-only paragraph produces no block of its own');
}

console.log('\n=== paragraphPageBreaks (pure) ===');
{
  const el = (xml: string) => new DOMParser().parseFromString(`<w:root ${W}>${xml}</w:root>`, 'text/xml').documentElement!.firstChild as unknown as Element;
  check(paragraphPageBreaks(el(p('x', '<w:pageBreakBefore w:val="false"/>'))).before === false, 'pageBreakBefore with val=false is off');
  check(paragraphPageBreaks(el('<w:p><w:r><w:br w:type="page"/><w:t>Nowa strona</w:t></w:r></w:p>')).before === true, 'a manual break ahead of the text: this paragraph starts the page');
  const after = paragraphPageBreaks(el('<w:p><w:r><w:t>Koniec</w:t></w:r><w:r><w:br w:type="page"/></w:r></w:p>'));
  check(after.after === true && after.before === false, 'a manual break after the text: the next content starts the page');
  check(paragraphPageBreaks(el('<w:p><w:r><w:br/><w:t>zwykłe złamanie</w:t></w:r></w:p>')).before === false, 'a plain line break is not a page break');
}

console.log('\n=== rendered PDF: page count and content per page ===');
{
  const long = Array.from({ length: 3 }, (_, i) => p('Akapit ' + i)).join('');
  const pages = await pagesOf(await docx(p('Rozdzial 1') + long + p('Rozdzial 2', '<w:pageBreakBefore/>') + long + brOnly + p('Rozdzial 3') + long));
  check(pages.length === 3, `three chapters on three pages (got ${pages.length})`);
  check(/Rozdzial 1/.test(pages[0] ?? '') && !/Rozdzial 2/.test(pages[0] ?? ''), 'chapter 1 alone on page 1');
  check(/Rozdzial 2/.test(pages[1] ?? '') && !/Rozdzial 3/.test(pages[1] ?? ''), 'chapter 2 alone on page 2');
  check(/Rozdzial 3/.test(pages[2] ?? ''), 'chapter 3 on page 3');
  const top = await pagesOf(await docx(p('Pierwszy', '<w:pageBreakBefore/>') + p('Drugi')));
  check(top.length === 1, 'a page break before the very first block does not add an empty page');
  const dbl = await pagesOf(await docx(p('A') + brOnly + brOnly + p('B')));
  check(dbl.length === 2, 'two breaks in a row do not produce an empty page in between');
}

console.log('\n=== PDF → Word → PDF: allegro-raport.pdf ===');
{
  const src = Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', 'allegro-raport.pdf'))]), { name: 'a.pdf' }) as unknown as File;
  const word = Object.assign(await pdfToWordIR(src), { name: 'a.docx' }) as unknown as File;
  const back = await pagesOf(word);
  check(back.length >= 27 && back.length <= 34, `the round trip keeps the page structure: ${back.length} pages (source 27, was 13)`);
  check(/Czy zastanawiałeś się kiedyś/.test(back[1] ?? ''), 'the second source page starts the second page');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
