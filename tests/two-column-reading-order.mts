// PDF → Word/ODT on a page set in TWO COLUMNS.
//
// The extraction grouped runs into lines by height alone, so the left column's line and the
// right column's line at the same height became one line, and the columns came out interleaved.
// Measured on test-real-pdfs/chrome-two-columns.pdf (a real two-column article printed by Chrome,
// made by e2e/fixtures/make-two-column-pdf.mts: a full-width title over 22 justified paragraphs
// marked ALFA1…7, BETA1…7, GAMMA1…8, each ending "<marker>koniec."):
//   before: 86 paragraphs, glued lines ("…kiedy kupić,którym spotyka się…"),
//           marker order ALFA7koniec ALFA1 BETA1 ALFA1koniec ALFA2 BETA1koniec …
//   after : 29 paragraphs in reading order, every paragraph whole.
//
// lib/pdf/textColumns.ts decides — strictly — whether a page is two columns of running text;
// everything else must stay exactly as it was (test:paragraph-grouping-equivalence proves that
// for the real single-column fixtures; the unit cases below cover the look-alikes).
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { DOMParser } from '@xmldom/xmldom';
(globalThis as Record<string, unknown>).DOMParser = DOMParser;

const { detectTextColumns, mergeColumnLines } = await import('../lib/pdf/textColumns.ts');
const { blocksInReadingOrder, columnLayoutFrame, inferPageColumn } = await import('../lib/pdf/docxLayout.ts');
const { pdfToWordIR, extractFormattedTextFromPDF } = await import('../lib/client-pdf.ts');
const { renderIRToOdt } = await import('../lib/client-pdf-docx.ts');
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

type Run = { text: string; position: { x: number; y: number }; width: number; height: number; fontSize: number; rotation: number };
const run = (text: string, x: number, y: number, width: number): Run => ({ text, position: { x, y }, width, height: 10, fontSize: 10, rotation: 0 });
/** `n` lines of running text in a column starting at x, each `width` wide, 14 pt apart from yTop down. */
const column = (tag: string, x: number, width: number, yTop: number, n: number): Run[] =>
  Array.from({ length: n }, (_, i) => run(`${tag} line ${i} of ordinary running text in this column`, x, yTop - i * 14, width));

console.log('=== detection: two columns of running text ===');
{
  const title = run('A title across both columns of the page', 60, 760, 470);
  const runs = [title, ...column('L', 60, 220, 720, 20), ...column('R', 310, 220, 720, 20), run('7', 295, 60, 6)];
  const split = detectTextColumns(runs);
  check(!!split, 'a title, two dense columns and a centred page number → two columns');
  if (split) {
    check(split.bands[0].length === 1 && split.bands[0][0] === title, 'the title that crosses the gutter is above the columns');
    check(split.bands[1].length === 20 && split.bands[1].every((r) => r.text.startsWith('L')), 'the left column holds exactly its 20 lines');
    check(split.bands[2].length === 20 && split.bands[2].every((r) => r.text.startsWith('R')), 'the right column holds exactly its 20 lines');
    check(split.bands[3].length === 1 && split.bands[3][0]!.text === '7', 'the page number under the gutter is below the columns');
    check(Math.abs(split.columns[0].x - 60) < 1 && Math.abs(split.columns[1].x - 310) < 1 && Math.abs(split.columns[1].width - 220) < 1, 'the column boxes are measured');
    check(split.bands.flat().length === runs.length, 'every run is in exactly one band');
  }
  // Justified text: one run per word, the same geometry.
  const words = (tag: string, x: number, y: number): Run[] => Array.from({ length: 6 }, (_, k) => run(`${tag}word${k} `, x + k * 37, y, 34));
  const justified = Array.from({ length: 12 }, (_, i) => [...words('l', 60, 700 - i * 14), ...words('r', 310, 700 - i * 14)]).flat();
  check(!!detectTextColumns(justified), 'columns made of one run per word (justified text) are detected too');
}

console.log('\n=== detection: look-alikes are left alone ===');
{
  check(detectTextColumns(column('S', 60, 470, 720, 30)) === null, 'a single column');
  const keyValue = Array.from({ length: 20 }, (_, i) => [run(`Label ${i}:`, 60, 720 - i * 14, 50), run(`a value of ordinary length for row ${i}`, 310, 720 - i * 14, 200)]).flat();
  check(detectTextColumns(keyValue) === null, 'a key/value list (short labels left, values right) keeps reading row by row');
  const toc = Array.from({ length: 20 }, (_, i) => [run(`Chapter ${i} with a fairly long title text here`, 60, 720 - i * 14, 230), run(String(i + 3), 500, 720 - i * 14, 10)]).flat();
  check(detectTextColumns(toc) === null, 'a table of contents (titles left, page numbers right)');
  const crossed = [...column('L', 60, 220, 720, 20), ...column('R', 310, 220, 720, 20), run('a full-width line in the middle of the columns area', 60, 720 - 8 * 14 + 5, 470)];
  check(detectTextColumns(crossed) === null, 'a line crossing the gutter in the middle of the column area');
  check(detectTextColumns([...column('L', 60, 220, 720, 20), ...column('R', 310, 220, 720, 3)]) === null, 'too few lines on one side');
  check(detectTextColumns([...column('L', 60, 220, 720, 12), ...column('R', 310, 220, 400, 12)]) === null, 'two blocks that are not side by side (one above, one below)');
  const three = [...column('A', 60, 140, 720, 20), ...column('B', 225, 140, 720, 20), ...column('C', 390, 140, 720, 20)];
  check(detectTextColumns(three) === null, 'three columns are not treated as two');
  check(detectTextColumns([]) === null && detectTextColumns(column('S', 60, 470, 720, 3)) === null, 'empty and tiny pages');
}

console.log('\n=== lines of a column become paragraphs ===');
{
  const line = (text: string, x: number, y: number, w: number) => ({ kind: 'paragraph', runs: [run(text, x, y, w)], bounds: { x, y, width: w, height: 10 } });
  const blocks = [
    line('First paragraph, line one', 60, 700, 220), line('line two', 60, 686, 220), line('short last line.', 60, 672, 90),
    line('Second paragraph starts here', 60, 650, 220), line('and ends.', 60, 636, 60),
    { kind: 'heading', runs: [run('A heading', 60, 610, 80)], bounds: { x: 60, y: 610, width: 80, height: 12 } },
    line('Third, after the heading', 60, 590, 220), line('continues', 60, 576, 215),
    line('Indented first line of a new one', 75, 562, 205), line('and its second line', 60, 548, 150),
  ];
  const merged = mergeColumnLines(blocks, { x: 60, width: 220 });
  const texts = merged.map((b) => b.runs.map((r) => r.text).join(' | '));
  check(merged.length === 5, `3 + 2 lines → 2 paragraphs, heading, 2 + 2 lines → 2 paragraphs (${merged.length}: ${texts.join(' // ')})`);
  check(texts[0] === 'First paragraph, line one | line two | short last line.', 'a paragraph ends at its short last line / larger gap');
  check(merged[2]!.kind === 'heading' && texts[3] === 'Third, after the heading | continues', 'a heading is never joined');
  check(texts[4]!.startsWith('Indented first line'), 'an indented first line starts a new paragraph');
  check(merged[0]!.bounds.y === 672 && merged[0]!.bounds.height === 38, 'the paragraph bounds cover all its lines');
}

console.log('\n=== writers read band by band ===');
{
  const b = (flow: number | undefined, y: number, x = 60) => ({ kind: 'paragraph', runs: [], bounds: { x, y, width: 100, height: 10 }, ...(flow === undefined ? {} : { flow }) });
  const page = [b(2, 700, 310), b(1, 650), b(0, 760), b(1, 700), b(3, 40), b(2, 650, 310)];
  const order = blocksInReadingOrder(page as never, 842).map((x) => `${(x as { flow?: number }).flow}@${x.bounds.y}`);
  check(order.join(' ') === '0@760 1@700 1@650 2@700 2@650 3@40', `above, left column top-down, right column top-down, below (${order.join(' ')})`);
  const plain = [b(undefined, 100), b(undefined, 700), b(undefined, 400)];
  check(blocksInReadingOrder(plain as never, 842).map((x) => x.bounds.y).join() === '700,400,100', 'a page without bands is still simply top to bottom');
  const irPage = { width: 595, height: 842, blocks: [], columns: [{ x: 60, width: 220 }, { x: 310, width: 220 }] };
  const margins = { left: 60, right: 65, top: 60, bottom: 60 };
  const frame = columnLayoutFrame(b(2, 700, 310) as never, irPage as never, inferPageColumn(irPage as never), margins);
  check(frame.column?.left === 310 && frame.margins.left === 310, 'a right-column block is measured against its own column (no half-page indent)');
  const outside = columnLayoutFrame(b(0, 760) as never, irPage as never, inferPageColumn(irPage as never), margins);
  check(outside.column?.left === 60 && outside.column?.right === 530 && outside.pageWidth === 595, 'a block above the columns keeps the page frame, spanning both columns');
}

console.log('\n=== real pipeline: chrome-two-columns.pdf → Word and ODT ===');
{
  const bytes = readFileSync(join(ROOT, 'test-real-pdfs', 'chrome-two-columns.pdf'));
  const file = () => Object.assign(new Blob([bytes]), { name: 'chrome-two-columns.pdf' }) as unknown as File;
  const expected = [
    ...Array.from({ length: 7 }, (_, i) => `ALFA${i + 1}`), ...Array.from({ length: 7 }, (_, i) => `BETA${i + 1}`), ...Array.from({ length: 8 }, (_, i) => `GAMMA${i + 1}`),
  ].flatMap((m) => [m, `${m}koniec`]);
  const markers = (s: string) => s.match(/(ALFA|BETA|GAMMA)\d+(?:koniec)?/g) ?? [];

  const xml = await (await JSZip.loadAsync(await (await pdfToWordIR(file())).arrayBuffer())).file('word/document.xml')!.async('string');
  const paras = (xml.match(/<w:p[ >](?:(?!<\/w:p>)[\s\S])*<\/w:p>/g) ?? [])
    .map((p) => (p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join(''))
    .filter((t) => t.trim() !== '');
  check(markers(paras.join('\n')).join(' ') === expected.join(' '), `Word: every marker in reading order (${markers(paras.join('\n')).slice(0, 6).join(' ')} …)`);
  check(!/kupić,którym|inwestorówstosujących/.test(paras.join('\n')), 'Word: no line of one column is glued to a line of the other');
  check(paras.length >= 26 && paras.length <= 34, `Word: paragraphs, not one per line (${paras.length}; was 86)`);
  const whole = paras.filter((p) => /^ALFA3 .*ALFA3koniec\.$/.test(p));
  check(whole.length === 1 && whole[0]!.includes('w którym spotyka się liczne grono inwestorów stosujących rozmaite techniki'), 'Word: a paragraph is one paragraph, with spaces where its lines met');
  check(paras[0] === 'Tytuł artykułu na całą szerokość strony', `Word: the full-width title comes first (${paras[0]})`);
  check(!/<w:ind [^>]*w:left="[2-9]\d{3}"/.test(xml), 'Word: right-column paragraphs are not indented by half a page');

  // Nothing lost: the same words as pdf.js reads from the source.
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
  let source = '';
  for (let p = 1; p <= doc.numPages; p++) source += (await (await doc.getPage(p)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ') + ' ';
  const bag = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3).sort().join(' ');
  check(bag(paras.join(' ')) === bag(source), 'Word: exactly the words of the source, none lost or doubled');

  const pages = await extractFormattedTextFromPDF(file());
  check(pages.every((p) => !!p.columns) && pages.length === 2, 'both pages are recognised as two-column');
  const odt = await renderIRToOdt(pages, new Map());
  const content = await (await JSZip.loadAsync(await odt.arrayBuffer())).file('content.xml')!.async('string');
  check(markers(content.replace(/<[^>]+>/g, ' ')).join(' ') === expected.join(' '), 'ODT: every marker in reading order');
}

console.log('\n=== real pipeline: a two-column SECTION inside a one-column page (chrome-article.pdf) ===');
{
  // Page 1: one-column text, then a "Wyniki" section set in two columns, then a picture, a code
  // listing, the "Wnioski" heading and one-column text again.
  const f = 'chrome-article.pdf';
  const file = Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', f))]), { name: f }) as unknown as File;
  const xml = await (await JSZip.loadAsync(await (await pdfToWordIR(file)).arrayBuffer())).file('word/document.xml')!.async('string');
  const text = (xml.match(/<w:p[ >](?:(?!<\/w:p>)[\s\S])*<\/w:p>/g) ?? [])
    .map((p) => (p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join('')).join('\n');
  check(!/ullamcolaboris/.test(text), 'no word of the left column is glued to a word of the right column ("ullamcolaboris")');
  const at = (needle: string) => text.indexOf(needle);
  const wyniki = at('Wyniki');
  const select = at('SELECT region');
  const wnioski = at('Wnioski');
  check(wyniki > 0 && select > wyniki && wnioski > select, 'the section heading, the code listing and the next heading keep their order');
  const columnsText = text.slice(wyniki, select);
  check((columnsText.match(/Lorem ipsum dolor sit amet/g) ?? []).length >= 2, 'BOTH columns of the section are read before the listing below them');
  check(at('Drugi element numerowany') < wyniki && at('Analiza rynku energii') < at('Drugi element numerowany'), 'the one-column part above stays above');
}

console.log('\n=== real pipeline: single-column documents are not touched ===');
for (const f of ['chrome-report.pdf', 'gpw-ebook.pdf', 'allegro-raport.pdf', 'test_e.pdf', 'Plik_D.pdf']) {
  const file = Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', f))]), { name: f }) as unknown as File;
  const pages = await extractFormattedTextFromPDF(file);
  const flagged = pages.filter((p) => p.columns).length;
  check(flagged === 0, `${f}: no page is treated as two columns (${flagged} of ${pages.length})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
