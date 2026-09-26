// Overprinted text objects. (1) Fake bold: some producers draw the same text twice, at the same
// place or a hair to the right, so the run extraction produced two runs and every output read
// "WstępWstęp" (gpw-ebook.pdf headings) or "Name|Name" in a table header (test_e.pdf) — the second
// strike is dropped and the survivor marked bold. (2) A shadow copy with DIFFERENT text (allegro-raport
// drew its footer twice, "… @ 2020" over "… @ 2019", 2.2 pt apart) was interleaved with the first one
// ("SekretyHandl SekretyHandl u u …"): overlapping runs of one line now stay in separate blocks.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
import JSZip from 'jszip';
import { extractFormattedTextFromPDF, joinLineRuns, pdfToIRDeck } from '../lib/client-pdf.ts';
import { renderIRToPptx } from '../lib/client-pptx.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

type Run = { text: string; bold: boolean; position: { x: number; y: number } };
type Block = { kind: string; runs?: Run[]; cells?: Array<Array<{ runs: Run[] }>> };
const runsOf = (blocks: Block[]) => blocks.flatMap((b) => b.runs ?? b.cells?.flat().flatMap((c) => c.runs) ?? []);

async function build(draw: (page: import('pdf-lib').PDFPage, font: import('pdf-lib').PDFFont) => void): Promise<File> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  draw(pdf.addPage([595, 842]), font);
  return Object.assign(new Blob([(await pdf.save()) as BlobPart]), { name: 't.pdf' }) as unknown as File;
}

console.log('=== fake bold (same text drawn twice) ===');
{
  const file = await build((page, font) => {
    page.drawText('Naglowek', { x: 72, y: 700, size: 20, font });
    page.drawText('Naglowek', { x: 72.6, y: 700, size: 20, font }); // second strike, 0.6 pt to the right
    page.drawText('Zwykly tekst', { x: 72, y: 650, size: 12, font });
  });
  const runs = runsOf((await extractFormattedTextFromPDF(file))[0]!.blocks as Block[]);
  const heads = runs.filter((r) => r.text === 'Naglowek');
  check(heads.length === 1, `one "Naglowek" run instead of two (got ${heads.length})`);
  check(heads[0]?.bold === true, 'the surviving run is marked bold');
  check(runs.find((r) => r.text === 'Zwykly tekst')?.bold === false, 'ordinary text stays regular');
}

console.log('\n=== the same text in two PLACES is not a duplicate ===');
{
  const file = await build((page, font) => {
    page.drawText('Powtorzone', { x: 72, y: 700, size: 12, font });
    page.drawText('Powtorzone', { x: 300, y: 700, size: 12, font }); // same line, far right
    page.drawText('Powtorzone', { x: 72, y: 680, size: 12, font }); // next line
  });
  const runs = runsOf((await extractFormattedTextFromPDF(file))[0]!.blocks as Block[]);
  check(runs.filter((r) => r.text === 'Powtorzone').length === 3, 'all three legitimate repetitions are kept');
}

console.log('\n=== shadow copy with different text ===');
{
  const file = await build((page, font) => {
    page.drawText('Stopka firma', { x: 200, y: 30, size: 12, font });
    page.drawText('Stopka rok', { x: 202.2, y: 30, size: 12, font });
  });
  const blocks = (await extractFormattedTextFromPDF(file))[0]!.blocks as Block[];
  const joined = blocks.map((b) => (b.runs ?? []).map((r) => r.text).join('|'));
  check(joined.includes('Stopka firma') && joined.includes('Stopka rok'), `each copy is a block of its own (${JSON.stringify(joined)})`);
}

console.log('\n=== real files ===');
{
  const read = (name: string) => Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', name))]), { name }) as unknown as File;
  const gpw = await extractFormattedTextFromPDF(read('gpw-ebook.pdf'));
  const wstep = gpw[4]!.blocks.filter((b) => b.kind === 'heading' && (b as Block).runs?.some((r) => r.text === 'Wstęp')) as Block[];
  check(wstep.length === 1 && wstep[0]!.runs!.filter((r) => r.text === 'Wstęp').length === 1, 'gpw-ebook page 5 heading reads "Wstęp" once');
  const te = await extractFormattedTextFromPDF(read('test_e.pdf'));
  const table = te[0]!.blocks.find((b) => b.kind === 'table') as Block;
  const names = runsOf([table]).filter((r) => r.text === 'Name');
  check(names.length === 1 && names[0]!.bold, 'test_e table header "Name" appears once, bold');
  const al = await extractFormattedTextFromPDF(read('allegro-raport.pdf'));
  const footerBlocks = al[6]!.blocks.filter((b) => (b as Block).runs?.some((r) => r.position.y < 30)) as Block[];
  const texts = footerBlocks.map((b) => b.runs!.map((r) => r.text).join(''));
  check(footerBlocks.length === 2 && texts.some((t) => t === 'SekretyHandlu.pl @ 2020') && texts.some((t) => t === 'SekretyHandlu.pl @ 2019'), `allegro page 7: two clean footers (${JSON.stringify(texts)})`);
}

console.log('\n=== slide text: line join and overprinted footers (PowerPoint) ===');
{
  const r = (text: string, x: number, width: number) => ({ text, fontName: 'F', fontSize: 12, width, height: 12, position: { x, y: 100 }, color: '#000000', bold: false, italic: false, rotation: 0 }) as unknown as Parameters<typeof joinLineRuns>[0][number];
  check(joinLineRuns([r('SekretyHandl', 100, 60), r('u', 160, 6), r('.pl', 166, 12)]) === 'SekretyHandlu.pl', 'touching runs are joined without invented spaces');
  check(joinLineRuns([r('Jan', 100, 20), r('Kowalski', 125, 40)]) === 'Jan Kowalski', 'a real gap between runs is a space');
  check(joinLineRuns([r('koniec ', 100, 40), r('zdania', 142, 30)]) === 'koniec zdania', 'a run that already ends with a space gets no second one');
  const file = Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', 'allegro-raport.pdf'))]), { name: 'a.pdf' }) as unknown as File;
  const { deck } = await pdfToIRDeck(file);
  const zip = await JSZip.loadAsync(await (await renderIRToPptx(deck)).arrayBuffer());
  const slide = async (n: number) => (await zip.file('ppt/slides/slide' + n + '.xml')!.async('string')).replace(/<\/a:p>/g, '\n').replace(/<[^>]+>/g, '');
  const s2 = await slide(2), s7 = await slide(7);
  check(/SekretyHandlu\.pl @ 2020/.test(s2) && !/SekretyHandl u/.test(s2), 'slide 2 footer reads "SekretyHandlu.pl @ 2020"');
  check(/SekretyHandlu\.pl @ 2020/.test(s7) && /SekretyHandlu\.pl @ 2019/.test(s7), 'slide 7 keeps both overprinted footers, each readable');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
