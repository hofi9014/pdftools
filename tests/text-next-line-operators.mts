// The text operators that start a new line — T* (next line by the leading), TD (move and set the
// leading), ' and " (next line, then show) — were ignored by the extraction engine outside its
// "precise" mode. Every further line written with them landed on the FIRST line's baseline, at
// the first line's x: a three-line paragraph came out as three runs lying on one another.
//
// Who writes text this way: pdf-lib for every drawText with more than one line (so every PDF
// this site makes from wrapped text), ReportLab (its text objects use T* for every line), and
// many report generators — invoices, statements, letters. The flow engine (PDF -> Word / ODT /
// PowerPoint / Excel) saw their paragraphs as one overprinted line.
//
// Checked here on PDFs built with the raw operators, in both extraction paths (a block with a
// text matrix, a block with only Td moves), and on a real pdf-lib multi-line drawText:
// positions of the runs, and what the Word writer makes of them.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';
import {
  PDFDocument, PDFNumber, PDFOperator, PDFOperatorNames, StandardFonts, beginText, endText, moveText, nextLine,
  popGraphicsState, pushGraphicsState, setFontAndSize, setLineHeight, setTextMatrix, showText,
} from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import { extractFormattedTextFromPDF, pdfToWordIR } from '../lib/client-pdf.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

type Run = { text: string; position: { x: number; y: number } };
const asFile = (bytes: Uint8Array, name = 't.pdf'): File => new File([bytes as BlobPart], name, { type: 'application/pdf' });
async function runsOf(bytes: Uint8Array): Promise<Run[]> {
  const pages = await extractFormattedTextFromPDF(asFile(bytes));
  return pages.flatMap((p) => p.blocks.flatMap((b) => (b as { runs?: Run[] }).runs ?? []));
}
/** y of the run with this text (PDF space, origin bottom-left), or NaN. */
const yOf = (runs: Run[], text: string): number => runs.find((r) => r.text.trim() === text)?.position.y ?? NaN;
const xOf = (runs: Run[], text: string): number => runs.find((r) => r.text.trim() === text)?.position.x ?? NaN;
const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.6;

const moveTextSetLeading = (x: number, y: number): PDFOperator => PDFOperator.of(PDFOperatorNames.MoveTextSetLeading, [PDFNumber.of(x), PDFNumber.of(y)]);

async function page(build: (key: string, enc: (s: string) => ReturnType<typeof showText> extends PDFOperator ? Parameters<typeof showText>[0] : never) => PDFOperator[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const p = pdf.addPage([500, 400]);
  p.setFont(font);
  const key = (p as unknown as { fontKey: string }).fontKey;
  p.pushOperators(pushGraphicsState(), ...build(key, (s) => font.encodeText(s)), popGraphicsState());
  return pdf.save();
}

console.log('=== T* in a block with a text matrix ===');
{
  const runs = await runsOf(await page((key, enc) => [
    beginText(), setFontAndSize(key, 12), setLineHeight(30), setTextMatrix(1, 0, 0, 1, 100, 300),
    showText(enc('ALFA')), nextLine(), showText(enc('BETA')), nextLine(), showText(enc('GAMMA')), endText(),
  ]));
  check(near(yOf(runs, 'ALFA'), 300) && near(yOf(runs, 'BETA'), 270) && near(yOf(runs, 'GAMMA'), 240), `three lines 30 pt apart (y = ${['ALFA', 'BETA', 'GAMMA'].map((t) => yOf(runs, t).toFixed(0)).join(', ')}; all 300 when T* is ignored)`);
  check(['ALFA', 'BETA', 'GAMMA'].every((t) => near(xOf(runs, t), 100)), 'each starting at the line origin x = 100');
}

console.log('\n=== T* in a block without a text matrix (Td only) ===');
{
  const runs = await runsOf(await page((key, enc) => [
    beginText(), setFontAndSize(key, 12), setLineHeight(24), moveText(80, 320),
    showText(enc('ALFA')), nextLine(), showText(enc('BETA')), nextLine(), showText(enc('GAMMA')), endText(),
  ]));
  check(near(yOf(runs, 'ALFA'), 320) && near(yOf(runs, 'BETA'), 296) && near(yOf(runs, 'GAMMA'), 272), `three lines 24 pt apart (y = ${['ALFA', 'BETA', 'GAMMA'].map((t) => yOf(runs, t).toFixed(0)).join(', ')})`);
  check(['ALFA', 'BETA', 'GAMMA'].every((t) => near(xOf(runs, t), 80)), 'each at x = 80');
}

console.log('\n=== TD: moves like Td and sets the leading for the T* that follow ===');
{
  const runs = await runsOf(await page((key, enc) => [
    beginText(), setFontAndSize(key, 12), setTextMatrix(1, 0, 0, 1, 100, 300),
    showText(enc('ALFA')), moveTextSetLeading(20, -40), showText(enc('BETA')), nextLine(), showText(enc('GAMMA')), endText(),
  ]));
  check(near(yOf(runs, 'BETA'), 260) && near(xOf(runs, 'BETA'), 120), `TD moved by (20, -40): BETA at ${xOf(runs, 'BETA').toFixed(0)}, ${yOf(runs, 'BETA').toFixed(0)}`);
  check(near(yOf(runs, 'GAMMA'), 220) && near(xOf(runs, 'GAMMA'), 120), `and the next T* steps by the leading TD set (40): GAMMA at ${xOf(runs, 'GAMMA').toFixed(0)}, ${yOf(runs, 'GAMMA').toFixed(0)}`);
}

console.log("\n=== ' : next line, then show ===");
{
  const runs = await runsOf(await page((key, enc) => [
    beginText(), setFontAndSize(key, 12), setLineHeight(18), setTextMatrix(1, 0, 0, 1, 100, 300),
    showText(enc('ALFA')), PDFOperator.of(PDFOperatorNames.ShowTextLine, [enc('BETA')]), PDFOperator.of(PDFOperatorNames.ShowTextLine, [enc('GAMMA')]), endText(),
  ]));
  check(near(yOf(runs, 'BETA'), 282) && near(yOf(runs, 'GAMMA'), 264), `lines 18 pt apart (y = ${yOf(runs, 'BETA').toFixed(0)}, ${yOf(runs, 'GAMMA').toFixed(0)})`);
}

console.log('\n=== the leading is text state: set before the text object, kept across objects, restored by Q ===');
{
  const runs = await runsOf(await page((key, enc) => [
    setLineHeight(50),
    pushGraphicsState(), setLineHeight(15), popGraphicsState(),
    beginText(), setFontAndSize(key, 12), setTextMatrix(1, 0, 0, 1, 100, 300), showText(enc('ALFA')), nextLine(), showText(enc('BETA')), endText(),
    beginText(), setFontAndSize(key, 12), setTextMatrix(1, 0, 0, 1, 300, 300), showText(enc('GAMMA')), nextLine(), showText(enc('DELTA')), endText(),
  ]));
  check(near(yOf(runs, 'BETA'), 250), `the leading set outside applies; the one set inside q…Q is gone (BETA at y = ${yOf(runs, 'BETA').toFixed(0)})`);
  check(near(yOf(runs, 'DELTA'), 250) && near(xOf(runs, 'DELTA'), 300), `and it still applies in the next text object (DELTA at ${xOf(runs, 'DELTA').toFixed(0)}, ${yOf(runs, 'DELTA').toFixed(0)})`);
}

console.log('\n=== a T* after the last line changes nothing (pdf-lib ends every line with one) ===');
{
  const runs = await runsOf(await page((key, enc) => [
    beginText(), setFontAndSize(key, 12), setLineHeight(30), setTextMatrix(1, 0, 0, 1, 100, 300), showText(enc('ALFA')), nextLine(), endText(),
    beginText(), setFontAndSize(key, 12), setTextMatrix(1, 0, 0, 1, 100, 200), showText(enc('BETA')), nextLine(), endText(),
  ]));
  check(near(yOf(runs, 'ALFA'), 300) && near(yOf(runs, 'BETA'), 200), 'single lines stay where their text matrix puts them');
}

console.log('\n=== pdf-lib drawText with several lines (what this site writes for wrapped text) ===');
{
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const p = pdf.addPage([500, 400]);
  p.drawText('Pierwsza linia akapitu\nDruga linia akapitu\nTrzecia linia akapitu', { x: 60, y: 330, size: 12, font, lineHeight: 16 });
  p.drawText('Dlugi tekst ktory pdf-lib sam zawija na kilka linii bo ma podana szerokosc maksymalna i nie miesci sie w jednej', { x: 60, y: 220, size: 12, font, lineHeight: 15, maxWidth: 200 });
  const bytes = await pdf.save();
  const runs = await runsOf(bytes);
  const ys = ['Pierwsza linia akapitu', 'Druga linia akapitu', 'Trzecia linia akapitu'].map((t) => yOf(runs, t));
  check(near(ys[0]!, 330) && near(ys[1]!, 314) && near(ys[2]!, 298), `explicit line breaks: baselines ${ys.map((v) => v.toFixed(0)).join(', ')} (all 330 when T* is ignored)`);
  const wrapped = runs.filter((r) => r.position.y < 230 && r.position.y > 100);
  const distinct = [...new Set(wrapped.map((r) => Math.round(r.position.y)))].sort((a, b) => b - a);
  check(distinct.length >= 3 && distinct.every((y, i) => i === 0 || near(distinct[i - 1]! - y, 15)), `text wrapped by maxWidth: ${distinct.length} baselines 15 pt apart (${distinct.join(', ')})`);

  // What the Word writer makes of it: the lines in reading order, none lying on another.
  const docx = await pdfToWordIR(asFile(bytes, 'multi.pdf'));
  const xml = await (await JSZip.loadAsync(await docx.arrayBuffer())).file('word/document.xml')!.async('string');
  const text = xml.replace(/<w:br\/>|<\/w:p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  const order = ['Pierwsza linia akapitu', 'Druga linia akapitu', 'Trzecia linia akapitu'].map((t) => text.indexOf(t));
  check(order.every((i) => i >= 0) && order[0]! < order[1]! && order[1]! < order[2]!, 'the .docx has the three lines, in their order');
  check(text.includes('Dlugi tekst ktory') && /nie\s+miesci\s+sie\s+w\s+jednej/.test(text) && text.indexOf('Dlugi tekst') < text.indexOf('jednej'), 'and the wrapped paragraph as running text, start to end');
}

console.log(fails === 0 ? '\nALL PASS' : `\nFAILURES PRESENT: ${fails}`);
process.exit(fails === 0 ? 0 : 1);
