// Text is drawn under the current transformation matrix. buildPageScaffold ignored it for text
// (rectangles honoured it, images too), so any PDF that wraps content in `cm` — Excel/Word/Skia
// exports scaled to fit a page, PPTX-style exports — got runs at raw text-space coordinates and
// raw font sizes: on "Raport - 12 rzeczy..." every body line sat at x=1,y=829 instead of
// x=100,y=721; on epz-report-variant2.pdf the table grid (CTM applied) and its text (not applied)
// never met. Both extraction paths are covered: the Tm path (pdf-lib drawText) and the
// moveText-only fallback (raw BT/Td/Tj operators).
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  PDFDocument, StandardFonts, PDFOperator, PDFOperatorNames, pushGraphicsState, popGraphicsState,
  concatTransformationMatrix, setFontAndSize, moveText, showText, beginText, endText, setTextMatrix,
} from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { extractFormattedTextFromPDF } from '../lib/client-pdf.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const near = (a: number | undefined, b: number, tol = 0.6): boolean => a !== undefined && Math.abs(a - b) <= tol;

async function extract(build: (page: import('pdf-lib').PDFPage, font: import('pdf-lib').PDFFont) => void) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([400, 400]);
  build(page, font);
  const bytes = await pdf.save();
  const file = Object.assign(new Blob([bytes as BlobPart]), { name: 't.pdf' }) as unknown as File;
  const pages = await extractFormattedTextFromPDF(file);
  return pages[0]!.blocks.flatMap((b) => (b as { runs?: Array<{ text: string; fontSize: number; position: { x: number; y: number } }> }).runs ?? []);
}

console.log('=== Tm path: drawText under cm 0.5 scale + translate (30,60) ===');
{
  const runs = await extract((page, font) => {
    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(0.5, 0, 0, 0.5, 30, 60));
    page.drawText('scaled-text', { x: 100, y: 200, size: 20, font });
    page.pushOperators(popGraphicsState());
  });
  const r = runs.find((x) => x.text.includes('scaled-text'));
  check(near(r?.position.x, 80) && near(r?.position.y, 160), `position = (0.5*100+30, 0.5*200+60) = (80,160) (got ${r?.position.x.toFixed(1)},${r?.position.y.toFixed(1)})`);
  check(near(r?.fontSize, 10), `font size 20 under scale 0.5 = 10 (got ${r?.fontSize.toFixed(1)})`);
}

console.log('\n=== moveText-only fallback under the same cm ===');
{
  const runs = await extract((page, font) => {
    page.setFont(font);
    const key = (page as unknown as { fontKey: string }).fontKey;
    page.pushOperators(
      pushGraphicsState(), concatTransformationMatrix(0.5, 0, 0, 0.5, 30, 60),
      beginText(), setFontAndSize(key, 20), moveText(100, 200), showText(font.encodeText('fallback-text')), endText(),
      popGraphicsState(),
    );
  });
  const r = runs.find((x) => x.text.includes('fallback-text'));
  check(!!r, 'fallback-path run extracted');
  check(near(r?.position.x, 80) && near(r?.position.y, 160), `position (80,160) (got ${r?.position.x.toFixed(1)},${r?.position.y.toFixed(1)})`);
  check(near(r?.fontSize, 10), `font size 10 (got ${r?.fontSize.toFixed(1)})`);
}

console.log('\n=== Skia/Chrome style: page-wide y-flip cm plus a flipped Tm ===');
{
  const runs = await extract((page, font) => {
    page.setFont(font);
    const key = (page as unknown as { fontKey: string }).fontKey;
    page.pushOperators(
      pushGraphicsState(), concatTransformationMatrix(1, 0, 0, -1, 0, 400),
      beginText(), setFontAndSize(key, 20), setTextMatrix(1, 0, 0, -1, 60, 150), showText(font.encodeText('flipped-text')), endText(),
      popGraphicsState(),
    );
  });
  const r = runs.find((x) => x.text.includes('flipped-text'));
  check(!!r, 'run extracted');
  check(near(r?.position.x, 60) && near(r?.position.y, 250), `position = (60, 400-150) = (60,250) (got ${r?.position.x.toFixed(1)},${r?.position.y.toFixed(1)})`);
  check(near(r?.fontSize, 20), `font size stays 20 (got ${r?.fontSize.toFixed(1)})`);
}

void PDFOperator; void PDFOperatorNames;
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
