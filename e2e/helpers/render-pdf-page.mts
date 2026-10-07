// Renders one page of a PDF to a PNG, to LOOK at what a converter or a word processor produced.
//
//   npx tsx e2e/helpers/render-pdf-page.mts <file.pdf> <page number> <out.png>
//
// Why it is kept: on 2026-10-07 the .odt text frames passed every position and word check while
// they had a blue fill, hid the text of links and painted white over the page picture — all
// three were found only by looking at the page OpenOffice exported.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;

const [file, pageNo, out] = process.argv.slice(2);
if (!file || !pageNo || !out) {
  console.error('usage: render-pdf-page.mts <file.pdf> <page number> <out.png>');
  process.exit(2);
}
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' }).promise;
const page = await doc.getPage(Number(pageNo));
const viewport = page.getViewport({ scale: 1.3 });
const canvas = canvasMod.createCanvas(viewport.width, viewport.height);
await page.render({ canvasContext: canvas.getContext('2d') as never, viewport, canvas: canvas as never }).promise;
writeFileSync(out, canvas.toBuffer('image/png'));
console.log(`page ${pageNo} of ${doc.numPages} -> ${out}`);
