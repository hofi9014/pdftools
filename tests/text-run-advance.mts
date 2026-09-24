// Two showText operators in one BT…ET block with no moveText between them (a colour/bold change in
// the middle of a line) were both placed at the line origin: the text cursor was never advanced by
// the width of the text just shown, on the comment's wrong assumption that "the next moveText sets
// the position". On allegro-raport.pdf page 2 the runs "ŻADNA" and " z osób, które…" both sat at
// x=100 and the second one was split off into a stray block that Word put at the end of the page.
// The cursor now advances by the glyph widths; Td is relative to the LINE start, so a moveText
// resets that advance. Continuation lines of a paragraph also pull in the runs that directly
// continue the line (not runs of another column).
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  PDFDocument, StandardFonts, pushGraphicsState, popGraphicsState, setFontAndSize, moveText, showText,
  beginText, endText, setTextMatrix, setFillingRgbColor,
} from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import { extractFormattedTextFromPDF } from '../lib/client-pdf.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

type Run = { text: string; position: { x: number; y: number } };
async function runsOf(file: File): Promise<Run[]> {
  const pages = await extractFormattedTextFromPDF(file);
  return pages[0]!.blocks.flatMap((b) => (b as { runs?: Run[] }).runs ?? []);
}

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const first = 'ZADNA';
const second = ' z osob, ktore';
const widthOfFirst = font.widthOfTextAtSize(first, 20);

// Variant A: moveText-only block (no Tm): "ZADNA" red, then " z osob…" black on the same line, then a
// new line via Td (relative to the LINE START).
const pageA = pdf.addPage([500, 300]);
pageA.setFont(font);
const key = (pageA as unknown as { fontKey: string }).fontKey;
pageA.pushOperators(
  pushGraphicsState(), beginText(), setFontAndSize(key, 20), moveText(100, 200),
  setFillingRgbColor(1, 0, 0), showText(font.encodeText(first)),
  setFillingRgbColor(0, 0, 0), showText(font.encodeText(second)),
  moveText(0, -30), showText(font.encodeText('next')),
  endText(), popGraphicsState(),
);
// Variant B: same with a Tm anchor.
const pageB = pdf.addPage([500, 300]);
pageB.setFont(font);
const keyB = (pageB as unknown as { fontKey: string }).fontKey;
pageB.pushOperators(
  pushGraphicsState(), beginText(), setFontAndSize(keyB, 20), setTextMatrix(1, 0, 0, 1, 100, 200),
  showText(font.encodeText(first)), showText(font.encodeText(second)),
  endText(), popGraphicsState(),
);
const bytes = (await pdf.save()) as BlobPart;

async function extractPage(index: number): Promise<Run[]> {
  const single = await PDFDocument.load(bytes as Uint8Array);
  single.removePage(index === 0 ? 1 : 0);
  return runsOf(Object.assign(new Blob([(await single.save()) as BlobPart]), { name: 't.pdf' }) as unknown as File);
}

console.log('=== moveText-only block ===');
{
  const runs = await extractPage(0);
  const a = runs.find((r) => r.text === first);
  const b = runs.find((r) => r.text.includes('z osob'));
  const c = runs.find((r) => r.text === 'next');
  check(!!a && Math.abs(a.position.x - 100) < 0.6, `first run at the line origin x=100 (got ${a?.position.x.toFixed(1)})`);
  check(!!b && Math.abs(b.position.x - (100 + widthOfFirst)) < 1, `second run starts where the first ended: 100+${widthOfFirst.toFixed(1)} (got ${b?.position.x.toFixed(1)})`);
  check(!!c && Math.abs(c.position.x - 100) < 0.6, `a Td line starts at the line origin again, not after the advance (got ${c?.position.x.toFixed(1)})`);
  check(!!c && !!a && Math.abs(c.position.y - (a.position.y - 30)) < 0.6, 'and 30pt lower');
}

console.log('\n=== Tm-anchored block ===');
{
  const runs = await extractPage(1);
  const b = runs.find((r) => r.text.includes('z osob'));
  check(!!b && Math.abs(b.position.x - (100 + widthOfFirst)) < 1, `second showText continues after the first (got ${b?.position.x.toFixed(1)})`);
}

console.log('\n=== real pipeline: allegro-raport.pdf page 2 ===');
{
  const f = 'allegro-raport.pdf';
  const file = Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', f))]), { name: f }) as unknown as File;
  const pages = await extractFormattedTextFromPDF(file);
  const blocks = pages[1]!.blocks.filter((b) => 'runs' in b) as Array<{ runs: Run[] }>;
  const joined = (b: { runs: Run[] }) => b.runs.map((r) => r.text).join('');
  const withZadna = blocks.find((b) => joined(b).includes('ŻADNA'));
  check(!!withZadna && joined(withZadna).includes('z osób, które odniosła sukces'), '"ŻADNA" and " z osób, które odniosła sukces…" are in the same block');
  check(!blocks.some((b) => joined(b).trim().startsWith('z osób') ), 'no stray block starts with " z osób…"');
  const zadna = blocks.flatMap((b) => b.runs).find((r) => r.text === 'ŻADNA');
  const rest = blocks.flatMap((b) => b.runs).find((r) => r.text.includes('z osób, które'));
  check(!!zadna && !!rest && rest.position.x > zadna.position.x + 40, `the second run sits to the right of "ŻADNA" (${zadna?.position.x.toFixed(0)} → ${rest?.position.x.toFixed(0)})`);
}

console.log('\n=== another column is not pulled into the paragraph ===');
{
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  page.drawText('First line of the left column text', { x: 72, y: 700, size: 12, font: f });
  page.drawText('Second line of the left column text', { x: 72, y: 686, size: 12, font: f });
  page.drawText('RIGHTCOLUMN', { x: 400, y: 686, size: 12, font: f });
  page.drawText('Third line of the left column text', { x: 72, y: 672, size: 12, font: f });
  const file = Object.assign(new Blob([(await doc.save()) as BlobPart]), { name: 'c.pdf' }) as unknown as File;
  const blocks = (await extractFormattedTextFromPDF(file))[0]!.blocks.filter((b) => 'runs' in b) as Array<{ runs: Run[] }>;
  const has = (b: { runs: Run[] }, t: string) => b.runs.some((r) => r.text.includes(t));
  check(!blocks.some((b) => has(b, 'Second line') && has(b, 'RIGHTCOLUMN')), 'the far-right run does not join the left column paragraph');
  check(blocks.some((b) => has(b, 'First line') && has(b, 'Second line') && has(b, 'Third line')), 'the left column lines still form one paragraph');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
