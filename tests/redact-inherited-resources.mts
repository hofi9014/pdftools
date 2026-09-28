// redact-pdf: redacting one page could corrupt EVERY page in the document.
//
// Reported directly by a user on a real 12-page file: after redacting content on just the first
// couple of pages, ALL 12 pages came back with garbled text (Acrobat: "Wystąpił błąd podczas
// przetwarzania strony", pdf.js: "Font ... is not available -- attempting to fallback"). The
// redacted pages themselves were fine (genuinely flattened to an image); every OTHER page still
// had its ORIGINAL vector text, but with its font resources silently stripped away.
//
// Root cause: rasterizePage(s) used to mutate whatever `libPage.node.Resources()` returned
// in place (delete every entry except the new image XObject), then garbage-collect any resource
// ref that no longer looked reachable from anywhere in the document. PDF allows /Resources to be
// declared ONCE on an ancestor /Pages node and inherited by every leaf page that doesn't have its
// own — and pdf-lib's own PDFPageLeaf.normalize() resolves that inheritance by pointing the page
// at the SAME (not cloned) shared dict object, a limitation pdf-lib's own source marks with
// "// TODO: Clone `Resources` if it is inherited". Mutating "the page's Resources" in that shape
// mutates the ONE dict every other page in the document also reads from — corrupting every
// sibling page, not just the one being redacted.
//
// Fixed by never mutating or deleting anything: a redacted page now gets pointed at a BRAND-NEW,
// private /Resources dict containing only its own new image, so the operation can only ever touch
// the one page dict being redacted.
import { PDFDocument, PDFName, PDFDict, StandardFonts } from 'pdf-lib';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rasterizePages, type RasterCanvasFactory, type RasterContext } from '../lib/pdf-raster.ts';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

/** Builds a 3-page PDF whose /Resources lives ONLY on the shared /Pages root (the PDF-spec-legal
 * "inherited resources" shape, matching at least one real-world producer) rather than duplicated
 * per page — every pdf-lib-authored fixture elsewhere in this suite has per-page Resources
 * (pdf-lib's own addPage() always writes it that way), so this needs building by hand. */
async function buildInheritedResourcesPdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = [pdf.addPage([300, 300]), pdf.addPage([300, 300]), pdf.addPage([300, 300])];
  for (let i = 0; i < pages.length; i++) pages[i]!.drawText(`Page ${i}`, { x: 50, y: 150, size: 24, font });

  const pagesRootRef = pdf.catalog.get(PDFName.of('Pages'));
  const pagesRoot = pdf.context.lookup(pagesRootRef, PDFDict);
  const sharedResources = pages[0]!.node.get(PDFName.of('Resources'));
  pagesRoot.set(PDFName.of('Resources'), sharedResources!);
  for (const p of pages) p.node.delete(PDFName.of('Resources'));
  return pdf.save();
}

const canvasFactory: RasterCanvasFactory = {
  create(w: number, h: number) {
    const canvas = canvasMod.createCanvas(w, h);
    return {
      canvas: canvas as unknown as { width: number; height: number; toBuffer(fmt: 'image/png'): Uint8Array },
      context: canvas.getContext('2d') as unknown as RasterContext,
    };
  },
};

console.log('=== redact-pdf: redacting one page must not touch sibling pages\' resources ===');
const src = await buildInheritedResourcesPdf();

// Redact only page 0 (index 0); pages 1 and 2 must come back completely untouched.
const out = await rasterizePages(
  pdfjsLib as unknown as Parameters<typeof rasterizePages>[0],
  canvasFactory,
  src,
  [{ page: 0, x: 0.1, y: 0.1, width: 0.2, height: 0.1 }],
  2,
  { standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' },
);

const result = await PDFDocument.load(out);
check(result.getPageCount() === 3, `3 pages survive (got ${result.getPageCount()})`);

const fontKeysOf = (pageIdx: number): string[] => {
  const res = result.getPage(pageIdx).node.Resources();
  const fontDict = res?.get(PDFName.of('Font'));
  return fontDict instanceof PDFDict ? fontDict.keys().map((k) => k.toString()) : [];
};
check(fontKeysOf(0).length === 0, `redacted page 0 has no leftover font resources (got ${JSON.stringify(fontKeysOf(0))})`);
check(fontKeysOf(1).length === 1, `untouched page 1 KEEPS its font resource (got ${JSON.stringify(fontKeysOf(1))})`);
check(fontKeysOf(2).length === 1, `untouched page 2 KEEPS its font resource (got ${JSON.stringify(fontKeysOf(2))})`);

// Redaction exists to make text UNRECOVERABLE — the old "Page 0" content stream must be actually
// deleted from the saved bytes, not just made unreachable from the page tree (a naive "never
// delete anything" fix would satisfy every check above while leaving the redacted text sitting
// in the file for anyone who inflates every stream, not just the ones a normal viewer reaches).
const raw = Buffer.from(out);
check(!raw.includes('Page 0'), 'the redacted page\'s own old literal text does not appear raw in the saved bytes');

const doc = await pdfjsLib.getDocument({ data: out, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' }).promise;
const textOf = async (p: number) => {
  const page = await doc.getPage(p);
  const tc = await page.getTextContent();
  return tc.items.map((it) => ('str' in it ? it.str : '')).join('');
};
check((await textOf(2)) === 'Page 1', `untouched page 2 (1-indexed) still reads its real text via pdf.js, got ${JSON.stringify(await textOf(2))}`);
check((await textOf(3)) === 'Page 2', `untouched page 3 (1-indexed) still reads its real text via pdf.js, got ${JSON.stringify(await textOf(3))}`);

const page1 = await doc.getPage(1);
const opList1 = await page1.getOperatorList();
const OPS = pdfjsLib.OPS;
const hasImage = opList1.fnArray.includes(OPS.paintImageXObject);
check(hasImage, 'redacted page 1 (1-indexed) is genuinely a flattened image');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exitCode = fails === 0 ? 0 : 1;
