// Fill colour / font are graphics state: q saves, Q restores. buildPageScaffold tracked them as
// "last write wins", so any text drawn after a coloured shape that was painted inside q…Q took the
// SHAPE's colour (white or grey cell backgrounds → invisible text in the converted document; on
// epz-report-variant2.pdf 2981 runs). A synthetic PDF with a white rectangle inside q…Q followed by
// default-colour text reproduces it exactly; pdf.js reads the result back through the real
// extraction pipeline.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  PDFDocument, StandardFonts, rgb, pushGraphicsState, popGraphicsState, setFillingRgbColor, rectangle, fill,
  setFontAndSize, moveText, showText, beginText, endText,
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

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const page = pdf.addPage([400, 300]);
page.setFont(font);
const fontKey = (page as unknown as { fontKey: string }).fontKey;
// Raw operators so NO colour operator precedes the text (pdf-lib's drawText would add its own):
// a coloured rectangle inside q…Q, then default-colour text in the outer graphics state.
const rectThenText = (grey: number, y: number, label: string) => {
  page.pushOperators(
    pushGraphicsState(), setFillingRgbColor(grey, grey, grey), rectangle(20, y - 10, 300, 40), fill(), popGraphicsState(),
    beginText(), setFontAndSize(fontKey, 14), moveText(30, y), showText(font.encodeText(label)), endText(),
  );
};
rectThenText(1, 200, 'after-white-rect');
rectThenText(0.85, 120, 'after-grey-rect');
page.drawText('explicit-red', { x: 30, y: 60, size: 14, font, color: rgb(1, 0, 0) });
page.pushOperators(beginText(), setFontAndSize(fontKey, 14), moveText(30, 30), showText(font.encodeText('after-red-text')), endText());

const bytes = await pdf.save();
const file = Object.assign(new Blob([bytes as BlobPart]), { name: 't.pdf' }) as unknown as File;
const pages = await extractFormattedTextFromPDF(file);
const runs = pages[0]!.blocks.flatMap((b) => (b as { runs?: Array<{ text: string; color: string }> }).runs ?? []);
const colorOf = (t: string) => runs.find((r) => r.text.includes(t))?.color;
check(colorOf('after-white-rect') === '#000000', `text after a white rect is black (got ${colorOf('after-white-rect')})`);
check(colorOf('after-grey-rect') === '#000000', `text after a grey rect is black (got ${colorOf('after-grey-rect')})`);
check(colorOf('explicit-red') === '#ff0000', `explicitly red text stays red (got ${colorOf('explicit-red')})`);
check(colorOf('after-red-text') === '#000000', `text after red text (own q…Q) is black again (got ${colorOf('after-red-text')})`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
