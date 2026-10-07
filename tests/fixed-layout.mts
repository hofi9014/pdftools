// The fixed ("faithful") page layout for PDF -> Word / OpenDocument (lib/pdf/fixedLayout*.ts).
//
// Why it exists: a designed page (an offer, a brochure, a slide) went through the flow engine and
// came out as a page-sized false table with every picture missing — reported with a real travel
// offer made by react-pdf. The fixed layout keeps the page's graphics as one picture behind the
// text and puts the text back on top of it, editable, where it was.
//
// This file proves the geometry without a word processor:
//   1. the layout rules on hand-made runs (rows, tab segments, columns for baselines that do not
//      line up, superscripts, running text, page bottom, width fitting, font mapping),
//   2. the exact text geometry of the run extractor (TJ gaps, Tc/Tw/Tz, T*),
//   3. the whole pipeline on test-real-pdfs/chrome-brochure.pdf (a designed two-page offer from
//      Chrome, see e2e/fixtures/make-brochure-pdf.mts), checked against pdf.js getTextContent —
//      an independent reading of the same file: every word is placed, every line sits where the
//      PDF has it, and the numbers written into the .docx / .odt put it there,
//   4. the choice between the two engines.
// The real-renderer proof (the file opened by OpenOffice and compared with the PDF) is
// e2e/pdf-to-word-fixed-layout.mts.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
(globalThis as Record<string, unknown>).document = { createElement: (t: string) => (t === 'canvas' ? canvasMod.createCanvas(1, 1) : {}) };
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.startsWith('/')) return new Response(new Uint8Array(readFileSync(join(ROOT, 'public', url))));
  return realFetch(input, init);
}) as typeof fetch;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

const {
  buildFixedPageLayout, buildFixedLines, fitSegmentWidth, fixedFontFamily, classifyFont, fixedLayoutText, isPlaceableText,
  FIXED_PAGE_HEAD_PT, FIXED_AFTER_TABLE_PT, FIXED_PAGE_TAIL_PT,
} = await import('../lib/pdf/fixedLayout.ts');
type FixedBlock = import('../lib/pdf/fixedLayout.ts').FixedBlock;
type FixedSegment = import('../lib/pdf/fixedLayout.ts').FixedSegment;
type FixedPageLayout = import('../lib/pdf/fixedLayout.ts').FixedPageLayout;
type IRTextRun = import('../lib/client-pdf-docx.ts').IRTextRun;
const { pdfToFixedPages, detectPdfLayoutMode, chooseLayoutMode, isDesignedPage, isTablePage, isScannedPage, fixedBackgroundScale } = await import('../lib/pdf/fixedLayoutPdf.ts');
const { renderFixedPagesToDocx } = await import('../lib/pdf/fixedLayoutDocx.ts');
const { renderFixedPagesToOdt } = await import('../lib/pdf/fixedLayoutOdt.ts');
const { splitShownText, buildPageScaffold, buildFontNameMap, initPdfjs, pdfjsDocOptions } = await import('../lib/client-pdf.ts');
const { isAooUnsafeSingleChar } = await import('../lib/pdf/docxRunSafety.ts');
const pdfjsLib = await import('pdfjs-dist');
await initPdfjs();

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const PAGE_W = 600;
const PAGE_H = 800;
const DESCENT = 0.22;

/** A run given by its left edge and its baseline measured from the TOP of the page. */
function run(text: string, x: number, baseline: number, fontSize: number, extra: Partial<IRTextRun> = {}): IRTextRun {
  return {
    text, fontName: 'ABCDEF+SourceSans3-Regular', fontSize, width: text.length * fontSize * 0.5, height: fontSize,
    position: { x, y: PAGE_H - baseline }, color: '#000000', bold: false, italic: false, rotation: 0, ...extra,
  };
}

interface PlacedLine { text: string; x: number; baseline: number; fontSize: number; depth: number }

/**
 * Where a layout puts every line: the cursor starts under the page head, each paragraph adds its
 * space before and its line heights, a line's baseline is its bottom minus the descent share.
 * Columns start at their block's top and the block is followed by the 1 pt separator.
 */
function placedLines(layout: FixedPageLayout): PlacedLine[] {
  const out: PlacedLine[] = [];
  const walk = (blocks: FixedBlock[], start: number, depth: number): void => {
    let y = start;
    for (const b of blocks) {
      if (b.kind === 'text') {
        y += b.before;
        for (const line of b.lines) {
          y += b.lineHeight;
          for (const seg of line.segments) {
            out.push({ text: seg.runs.map((r) => r.text).join(''), x: seg.x, baseline: y - DESCENT * line.fontSize, fontSize: line.fontSize, depth });
          }
        }
      } else {
        for (const c of b.columns) walk(c.blocks, b.top, depth + 1);
        y = b.top + b.height + FIXED_AFTER_TABLE_PT;
      }
    }
  };
  walk(layout.blocks, FIXED_PAGE_HEAD_PT, 0);
  return out;
}

const find = (lines: PlacedLine[], needle: string): PlacedLine | undefined => lines.find((l) => l.text.includes(needle));

// ============================================================ 1. layout rules
console.log('=== lines stack as paragraphs with exact heights ===');
{
  const layout = buildFixedPageLayout([run('Tytul', 50, 60, 20), run('Pierwsza', 50, 100, 10), run('Druga osobna', 50, 140, 10)], PAGE_W, PAGE_H);
  const lines = placedLines(layout);
  check(layout.blocks.length === 3 && layout.blocks.every((b) => b.kind === 'text'), `three separate paragraphs (${layout.blocks.length})`);
  check(Math.abs(find(lines, 'Tytul')!.baseline - 60) < 0.01 && Math.abs(find(lines, 'Pierwsza')!.baseline - 100) < 0.01 && Math.abs(find(lines, 'Druga')!.baseline - 140) < 0.01, 'every baseline is reproduced exactly');
  const first = layout.blocks[0]!;
  check(first.kind === 'text' && Math.abs(first.lineHeight - 24) < 0.01, `a line with room gets the natural 1.2 x font height (${first.kind === 'text' ? first.lineHeight : '-'})`);
  check(layout.unplaced.length === 0, 'nothing is left unplaced');
}

console.log('\n=== text far apart on one baseline: one paragraph, one tab stop each ===');
{
  const { lines } = buildFixedLines([run('Wyzywienie:', 25, 100, 9), run('Sniadania', 300, 100, 9)], PAGE_H);
  check(lines.length === 1 && lines[0]!.segments.length === 2, `one line with two segments (${lines.length}/${lines[0]?.segments.length})`);
  check(lines[0]!.segments[0]!.x === 25 && lines[0]!.segments[1]!.x === 300, 'each segment keeps its own x');
}

console.log('\n=== glyph-by-glyph text becomes words again ===');
{
  // Chrome draws "Dlu" "gosc" as separate operators; a run of spaces is the gap between words.
  const runs = [run('Dlu', 50, 100, 10), run('gosc', 65, 100, 10), run(' ', 85, 100, 10), run('trzy', 90, 100, 10), run('dni', 114, 100, 10)];
  runs[3]!.width = 20; runs[4]!.width = 15;
  const { lines } = buildFixedLines(runs, PAGE_H);
  const seg = lines[0]!.segments[0]!;
  check(lines[0]!.segments.length === 1 && seg.runs.length === 1, `same-format glyph runs are one run (${seg.runs.length})`);
  check(seg.runs[0]!.text === 'Dlugosc trzy dni', `the space run and the visible gap become single spaces ("${seg.runs[0]!.text}")`);
  const bold = buildFixedLines([run('Cena: ', 50, 100, 10), run('1446', 80, 100, 10, { bold: true })], PAGE_H).lines[0]!.segments[0]!;
  check(bold.runs.length === 2 && bold.runs[1]!.bold === true, 'a change of format still starts a new run');
}

console.log('\n=== baselines that do not line up side by side: a column block ===');
{
  // A label centred against a two-line value, and a big price beside both (the reported page).
  const runs = [
    run('Podroz tam:', 25, 106, 8.5),
    run('Bydgoszcz do Wyc. objazdowa dnia 01.04.2027 godz. 06:00', 150, 100, 8.5),
    run('- 00:00', 372, 112, 8.5),
    run('1446', 452, 107, 30),
    run('Nastepny wiersz', 25, 160, 8.5),
  ];
  runs[1]!.width = 245; runs[3]!.width = 60;
  const layout = buildFixedPageLayout(runs, PAGE_W, PAGE_H);
  const cols = layout.blocks.find((b) => b.kind === 'columns');
  check(!!cols && cols.kind === 'columns' && cols.columns.length === 3, `the three blocks become three columns (${cols && cols.kind === 'columns' ? cols.columns.length : 'no column block'})`);
  const lines = placedLines(layout);
  const ok = (needle: string, base: number): boolean => Math.abs((find(lines, needle)?.baseline ?? -99) - base) < 0.01;
  check(ok('Podroz', 106) && ok('Bydgoszcz', 100) && ok('- 00:00', 112) && ok('1446', 107), 'label, both value lines and the price keep their own baselines');
  check(ok('Nastepny', 160), 'the line after the column block is where it was');
  if (cols && cols.kind === 'columns') {
    const [a, b, c] = cols.columns;
    check(a!.x === 0 && Math.abs(b!.x - 149) < 0.01 && Math.abs(c!.x - 451) < 0.01, `cells start just left of their text (${a!.x}, ${b!.x}, ${c!.x})`);
    check(Math.abs(a!.width + b!.width + c!.width - PAGE_W) < 0.01, 'the cells span the page width');
  }
  check(layout.unplaced.length === 0, 'nothing is left unplaced');
}

console.log('\n=== a superscript hangs on its line ===');
{
  const sup = run('2', 58.6, 96, 6);
  sup.width = 3;
  const base = run('100 m', 50, 100, 10);
  base.width = 8;
  const layout = buildFixedPageLayout([base, sup], PAGE_W, PAGE_H);
  const text = layout.blocks.filter((b) => b.kind === 'text');
  const runs = text.flatMap((b) => (b.kind === 'text' ? b.lines.flatMap((l) => l.segments.flatMap((s) => s.runs)) : []));
  const raised = runs.find((r) => r.text === '2');
  check(text.length === 1 && layout.blocks.length === 1, 'one paragraph, no table for a superscript');
  check(!!raised && Math.abs(raised.raise - 4) < 0.01, `the superscript is raised by its 4 pt (${raised?.raise})`);
  check(layout.unplaced.length === 0, 'it stays editable text');
}

console.log('\n=== lines of running text are one paragraph with line breaks ===');
{
  const runs = [0, 1, 2, 3].map((i) => run(`Linia ${i + 1} akapitu`, 50, 100 + i * 12, 10));
  const layout = buildFixedPageLayout([...runs, run('Inny blok', 50, 200, 10)], PAGE_W, PAGE_H);
  const first = layout.blocks[0]!;
  check(layout.blocks.length === 2 && first.kind === 'text' && first.lines.length === 4, `four lines, one paragraph (${first.kind === 'text' ? first.lines.length : '-'} lines in ${layout.blocks.length} blocks)`);
  check(first.kind === 'text' && Math.abs(first.lineHeight - 12) < 0.01, 'its line height is the original step');
  const lines = placedLines(layout);
  check([0, 1, 2, 3].every((i) => Math.abs(find(lines, `Linia ${i + 1}`)!.baseline - (100 + i * 12)) < 0.01), 'every line of the paragraph keeps its baseline');
}

console.log('\n=== rotated text is left to the page picture ===');
{
  const layout = buildFixedPageLayout([run('Poziomo', 50, 100, 10), run('Pionowo', 20, 300, 10, { rotation: 90 })], PAGE_W, PAGE_H);
  check(layout.unplaced.length === 1 && layout.unplaced[0]!.text === 'Pionowo', 'the rotated run is reported as unplaced');
  check(fixedLayoutText(layout) === 'Poziomo', 'and is not written as text');
}

console.log('\n=== right-to-left script and icon glyphs stay in the page picture too ===');
{
  // A PDF holds Arabic/Hebrew in drawing order: written as text, a word processor would apply
  // the bidirectional algorithm again and mirror it. Private-use characters are icon-font glyphs.
  const arabic = run('مرحبا بالعالم', 300, 100, 12);
  const hebrew = run('שלום', 300, 130, 12);
  const icon = run(String.fromCharCode(0xf015), 50, 160, 14);
  const layout = buildFixedPageLayout([run('Zażółć gęślą jaźń', 50, 100, 12), run('Привет, мир', 50, 130, 12), run('日本語のテキスト', 50, 190, 12), arabic, hebrew, icon], PAGE_W, PAGE_H);
  check(layout.unplaced.length === 3 && [arabic, hebrew, icon].every((r) => layout.unplaced.includes(r)), `Arabic, Hebrew and the icon glyph are left to the picture (${layout.unplaced.length})`);
  const text = fixedLayoutText(layout);
  check(isPlaceableText('Zażółć') && text.includes('Zażółć gęślą jaźń') && text.includes('Привет, мир') && text.includes('日本語のテキスト'), 'Polish, Cyrillic and Japanese are written as text');
}

console.log('\n=== text printed over text: one copy is text, the other stays in the picture ===');
{
  // allegro-raport.pdf draws its footer twice, "… @ 2020" over "… @ 2019", 2 pt apart on the
  // same baseline. Interleaved by x the line read "SekretyHandlSekretyHandluu.pl.pl @ @ 20202019".
  const copy = (year: string, dx: number): IRTextRun[] => {
    const a = run('SekretyHandl', 200 + dx, 700, 14);
    const b = run('u', 284 + dx, 700, 14);
    const c = run(`.pl @ ${year}`, 291 + dx, 700, 14);
    a.width = 84; b.width = 7; c.width = 70;
    return [a, b, c];
  };
  const first = copy('2020', 0);
  const second = copy('2019', 2.2);
  const layout = buildFixedPageLayout([...first, ...second], PAGE_W, PAGE_H);
  check(fixedLayoutText(layout) === 'SekretyHandlu.pl @ 2020', `the line is one clean copy ("${fixedLayoutText(layout)}")`);
  check(layout.unplaced.length === 3 && second.every((r) => layout.unplaced.includes(r)), 'the copy printed over it is left to the page picture');
  const kerned = [run('AV', 50, 100, 10), run('AT', 62.5, 100, 10)];
  kerned[0]!.width = 13.3;
  check(buildFixedPageLayout(kerned, PAGE_W, PAGE_H).unplaced.length === 0, 'a kerning overlap of a fraction of a point is not an overprint');
}

console.log('\n=== a line at the very bottom never spills onto a new page ===');
{
  const layout = buildFixedPageLayout([run('Stopka przy samej krawedzi', 50, PAGE_H - 1, 10)], PAGE_W, PAGE_H);
  const b = layout.blocks[0]!;
  const end = b.kind === 'text' ? FIXED_PAGE_HEAD_PT + b.before + b.lineHeight : Infinity;
  check(end <= PAGE_H - 0.5 + 0.001, `the content ends inside the page (${end.toFixed(2)} of ${PAGE_H})`);

  // Two texts side by side at the very bottom whose baselines do not line up: a column block,
  // and the 1 pt paragraph after it (plus the one that may close the section) still fits.
  const two = buildFixedPageLayout([
    run('Lewa stopka', 50, PAGE_H - 2, 10), run('druga linia lewej', 50, PAGE_H - 14, 10),
    run('Prawa stopka', 400, PAGE_H - 8, 10),
  ], PAGE_W, PAGE_H);
  const cols = two.blocks.find((x) => x.kind === 'columns');
  const tableEnd = cols && cols.kind === 'columns' ? cols.top + cols.height + FIXED_AFTER_TABLE_PT + FIXED_PAGE_TAIL_PT : Infinity;
  check(!!cols && tableEnd <= PAGE_H + 0.001, `a column block at the bottom, its separator and the section end fit on the page (${tableEnd.toFixed(2)} of ${PAGE_H})`);
}

console.log('\n=== width fitting: never wider than the original, short by less than a point ===');
{
  const measure = (text: string, _f: string, bold: boolean, _i: boolean, size: number): number => text.length * size * (bold ? 0.62 : 0.56);
  const fitted = (target: number, text = 'Zakwaterowanie w pokoju 2-3 osobowym'): { seg: FixedSegment; width: number } => {
    const seg: FixedSegment = { x: 0, width: target, runs: [{ text, font: 'Arial', fontSize: 9, bold: false, italic: false, color: '000000', scale: 100, spacingTw: 0, raise: 0 }] };
    fitSegmentWidth(seg, measure);
    const chars = seg.runs.reduce((n, r) => n + r.text.length, 0);
    let w = 0;
    let seen = 0;
    for (const r of seg.runs) {
      w += measure(r.text, r.font, r.bold, r.italic, r.fontSize) * r.scale / 100;
      // spacing follows every character except the last of the segment
      w += (r.spacingTw / 20) * (seen + r.text.length === chars ? r.text.length - 1 : r.text.length);
      seen += r.text.length;
    }
    return { seg, width: w };
  };
  for (const [label, target] of [['narrower font (scale down)', 150], ['about the same', 182], ['wider font (scale up)', 230]] as const) {
    const { seg, width } = fitted(target);
    // 0.3 pt of safety, plus at most one word of twentieths (runs are only split between words).
    check(width <= target + 0.001 && width >= target - 1, `${label}: ${width.toFixed(2)} pt for a ${target} pt original (scale ${seg.runs[0]!.scale}%)`);
    check(seg.runs.every((_r, i) => i === 0 || seg.runs[i - 1]!.text.endsWith(' ')), `${label}: runs are split between words only (${seg.runs.map((r) => JSON.stringify(r.text)).join(' ')})`);
  }
  check(fitted(150).seg.runs[0]!.scale < 97, 'a large difference is taken by character scaling');
  check(fitted(182).seg.runs.every((r) => r.scale === 100), 'a small one by spacing alone');
  const trimmed = fitted(60, 'Etykieta: ').seg;
  check(trimmed.runs.map((r) => r.text).join('') === 'Etykieta:', 'a trailing space is dropped before fitting');
}

console.log('\n=== fonts: only families every reader has ===');
{
  const cases: Array<[string, string]> = [
    ['WLXZUJ+SourceSans3-Regular', 'Arial'], ['TSXDVA+SourceSans3-Bold', 'Arial'], ['Gotham-Black', 'Arial'], ['NotoSans-Regular', 'Arial'],
    ['Georgia-Bold', 'Georgia'], ['TimesNewRomanPSMT', 'Times New Roman'], ['Merriweather-Regular', 'Times New Roman'],
    ['CourierNewPS-BoldMT', 'Courier New'], ['JetBrainsMono-Regular', 'Courier New'], ['ArialMT', 'Arial'], ['Verdana', 'Verdana'], ['Calibri-Light', 'Calibri'],
  ];
  const wrong = cases.filter(([raw, want]) => fixedFontFamily(raw) !== want).map(([raw, want]) => `${raw}→${fixedFontFamily(raw)} (want ${want})`);
  check(wrong.length === 0, `known and unknown font names map as expected ${wrong.join('; ')}`);
  check(fixedFontFamily('Xyzzy-Regular', 'serif') === 'Times New Roman' && fixedFontFamily('Xyzzy-Regular', 'mono') === 'Courier New' && fixedFontFamily('Xyzzy-Regular') === 'Arial', 'an unknown name follows the PDF\'s own serif / monospace flag');
  check(classifyFont('OpenSans-SemiBold', 'serif') === 'sans', 'the name wins over a wrong flag');
}

// ============================================================ 2. exact text geometry
console.log('\n=== showText pieces: kerning counts, a wide gap splits ===');
{
  const g = (unicode: string, width = 500, isSpace = false) => ({ unicode, width, isSpace });
  const kern = splitShownText([g('A'), -40, g('V'), g('A')], 10, 0, 0, 1);
  check(kern.pieces.length === 1 && kern.pieces[0]!.text === 'AVA', 'small adjustments stay inside one piece');
  check(Math.abs(kern.pieces[0]!.width - 15.4) < 1e-9 && Math.abs(kern.advance - 15.4) < 1e-9, `and move the following glyphs (width ${kern.pieces[0]!.width})`);
  const toc = splitShownText([g('W'), g('s'), g('t'), -13000, g('5')], 10, 0, 0, 1);
  check(toc.pieces.length === 2 && toc.pieces[0]!.text === 'Wst' && toc.pieces[1]!.text === '5', 'a 13 em jump (title … page number) makes two pieces');
  check(Math.abs(toc.pieces[1]!.start - 145) < 1e-9, `the second piece starts after the gap (${toc.pieces[1]!.start})`);
  const spaced = splitShownText([g('a'), g(' ', 250, true), g('b')], 10, 0.5, 2, 1);
  check(Math.abs(spaced.advance - (5 + 0.5 + 2.5 + 0.5 + 2 + 5 + 0.5)) < 1e-9, `character and word spacing are added (${spaced.advance})`);
  check(Math.abs(splitShownText([g('a'), g('b')], 10, 0, 0, 0.8).advance - 8) < 1e-9, 'horizontal scaling shrinks the advance');
  check(splitShownText([g(String.fromCharCode(0xfb01)), g('rma')], 10, 0, 0, 1).pieces[0]!.text === 'firma', 'ligatures are still normalised');
}

console.log('\n=== T* (next line): wrapped text is on its own lines ===');
{
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  // pdf-lib writes multi-line text as TL + T* inside one BT block.
  page.drawText('pierwsza linia\ndruga linia\ntrzecia linia', { x: 40, y: 250, size: 12, lineHeight: 20, font: await doc.embedFont(StandardFonts.Helvetica) });
  const pdf = await pdfjsLib.getDocument(pdfjsDocOptions(await doc.save())).promise;
  const pg = await pdf.getPage(1);
  const opList = await pg.getOperatorList();
  const names = buildFontNameMap(pg.commonObjs as never, opList, pdfjsLib.OPS as never);
  const ys = (precise: boolean): number[] => buildPageScaffold(opList, pdfjsLib.OPS as never, names, { preciseText: precise }).textRuns.map((r) => Math.round(r.position.y));
  check(JSON.stringify(ys(true)) === '[250,230,210]', `precise mode puts the three lines 20 pt apart (${ys(true).join(',')})`);
  check(new Set(ys(false)).size === 1, 'the plain mode (flow engine) is unchanged: all on one baseline');
}

// ============================================================ 3. the pipeline on a designed PDF
const brochure = readFileSync(join(ROOT, 'test-real-pdfs', 'chrome-brochure.pdf'));
const result = await pdfToFixedPages(new File([brochure], 'chrome-brochure.pdf'));

/** pdf.js getTextContent as lines: the independent reading of the same page. */
async function truthLines(bytes: Uint8Array, pageNo: number): Promise<{ lines: Array<{ text: string; x: number; right: number; baseline: number }>; words: string[]; height: number }> {
  const pdf = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(bytes))).promise;
  const page = await pdf.getPage(pageNo);
  const height = page.getViewport({ scale: 1 }).height;
  const tc = await page.getTextContent();
  const items = tc.items.filter((i): i is typeof i & { str: string; transform: number[]; width: number } => 'str' in i && i.str.trim().length > 0);
  const rows: Array<{ baseline: number; items: typeof items }> = [];
  for (const it of items) {
    const b = height - it.transform[5]!;
    const row = rows.find((r) => Math.abs(r.baseline - b) < 0.6);
    if (row) row.items.push(it);
    else rows.push({ baseline: b, items: [it] });
  }
  const lines = rows.map((r) => {
    const sorted = r.items.sort((a, b) => a.transform[4]! - b.transform[4]!);
    return { text: sorted.map((i) => i.str).join(' ').replace(/\s+/g, ' '), x: sorted[0]!.transform[4]!, right: Math.max(...sorted.map((i) => i.transform[4]! + i.width)), baseline: r.baseline };
  });
  return { lines, words: items.flatMap((i) => i.str.split(/\s+/)).filter(Boolean), height };
}
const multiset = (words: string[]): string => [...words].sort().join(' ');

console.log('\n=== chrome-brochure.pdf: everything is placed, nothing is lost ===');
{
  check(result.pages.length === 2, `two pages (${result.pages.length})`);
  check(result.unplacedChars === 0 && result.placedChars > 4000, `all ${result.placedChars} characters are editable text (${result.unplacedChars} left in the picture)`);
  check(result.pages.every((p) => p.background && p.background.data.length > 5000 && p.background.data[0] === 0xff && p.background.data[1] === 0xd8), 'every page has its picture (JPEG)');
  for (let p = 0; p < 2; p++) {
    const truth = await truthLines(brochure, p + 1);
    const mine = fixedLayoutText(result.pages[p]!.layout).split(/\s+/).filter(Boolean);
    check(multiset(mine) === multiset(truth.words), `page ${p + 1}: the words are exactly those pdf.js reads (${mine.length} / ${truth.words.length})`);
  }
}

console.log('\n=== chrome-brochure.pdf: every line sits where the PDF has it ===');
const truth1 = await truthLines(brochure, 1);
{
  const mine = placedLines(result.pages[0]!.layout);
  let worst = 0;
  let missing = 0;
  for (const l of mine) {
    const key = l.text.trim().slice(0, 14);
    const t = truth1.lines.filter((x) => x.text.includes(key)).sort((a, b) => Math.abs(a.baseline - l.baseline) - Math.abs(b.baseline - l.baseline))[0];
    if (!t) { missing++; continue; }
    worst = Math.max(worst, Math.abs(t.baseline - l.baseline));
  }
  check(missing === 0, `every laid-out segment is found in pdf.js's text (${missing} missing of ${mine.length})`);
  check(worst < 0.75, `baselines agree with pdf.js to ${worst.toFixed(2)} pt`);
  const row3 = find(mine, 'ROW3');
  const value = find(mine, 'Bydgoszcz (BZG) do miejsca');
  check(!!row3 && !!value && row3.depth > 0 && value.depth > 0 && Math.abs(row3.baseline - value.baseline) > 3, 'the label centred against two lines is in a column block, on its own baseline');
  const price = find(mine, '1446 PLN');
  check(!!price && price.fontSize > 20 && price.depth > 0, 'the price badge text is a column of its own');
  const cols = result.pages[0]!.layout.blocks.filter((b) => b.kind === 'columns').length;
  check(cols >= 4, `column blocks: the key/value area and the three cards (${cols})`);
  const fonts = new Set(result.pages.flatMap((p) => { const out: string[] = []; const walk = (bs: FixedBlock[]): void => { for (const b of bs) { if (b.kind === 'text') for (const l of b.lines) for (const s of l.segments) for (const r of s.runs) out.push(r.font); else for (const c of b.columns) walk(c.blocks); } }; walk(p.layout.blocks); return out; }));
  check(fonts.size === 1 && fonts.has('Arial'), `Segoe UI (not on every machine) is written as Arial (${[...fonts].join(', ')})`);
}

// ---- the .docx: the numbers in the XML, read back independently
const docxBlob = await renderFixedPagesToDocx(result.pages);
const docxZip = await JSZip.loadAsync(await docxBlob.arrayBuffer());
const docXml = await docxZip.file('word/document.xml')!.async('string');

console.log('\n=== .docx: structure ===');
{
  const dom = new DOMParser().parseFromString(docXml, 'text/xml');
  check(dom.getElementsByTagName('parsererror').length === 0 && dom.documentElement.nodeName === 'w:document', 'document.xml is well-formed');
  check((docXml.match(/<w:drawing>/g) ?? []).length === 2 && (docXml.match(/behindDoc="1"/g) ?? []).length === 2, 'two page pictures, both behind the text');
  check((docXml.match(/relativeFrom="page"/g) ?? []).length === 4, 'anchored to the page, horizontally and vertically');
  check((docXml.match(/<w:pageBreakBefore\/>/g) ?? []).length === 1, 'one page break for two pages');
  check(/<w:pgMar [^>]*w:top="0"[^>]*w:left="0"/.test(docXml) || /<w:pgMar [^>]*w:left="0"[^>]*w:top="0"/.test(docXml), 'page margins are zero (positions count from the page edges)');
  check(!/<w:position w:val="[^"]*pt"/.test(docXml), 'no "…pt" baseline shift (OpenOffice misreads that form)');
  const singles = [...docXml.matchAll(/<w:t xml:space="preserve">([^<]*)<\/w:t>/g)].map((m) => m[1]!).filter(isAooUnsafeSingleChar);
  check(singles.length === 0, `no run is a lone "ć"/"č" (OpenOffice drops such a run): ${singles.length}`);
  const fonts = new Set([...docXml.matchAll(/w:rFonts w:ascii="([^"]+)"/g)].map((m) => m[1]));
  check(fonts.size === 1 && fonts.has('Arial'), `only Arial is named (${[...fonts].join(', ')})`);
  check((docXml.match(/<w:tbl>/g) ?? []).length >= 4 && !/w:val="single"/.test(docXml), 'layout tables are present and borderless');
  check((docXml.match(/w:lineRule="exact"/g) ?? []).length === (docXml.match(/<w:p>/g) ?? []).length, 'every paragraph has an exact line height');
  const media = Object.keys(docxZip.files).filter((n) => n.startsWith('word/media/') && !n.endsWith('/'));
  check(media.length === 2, `two picture files (${media.length})`);
}

console.log('\n=== .docx: the written numbers put the text where the PDF has it ===');
{
  // Top-level children of the first page: paragraphs (space before + lines x exact height) and
  // tables (their row height, followed by the 1 pt paragraph). Pure arithmetic on the XML.
  const body = docXml.slice(docXml.indexOf('<w:body>') + 8, docXml.lastIndexOf('<w:sectPr'));
  const top: Array<{ kind: 'p' | 'tbl'; xml: string }> = [];
  for (let i = 0; i < body.length;) {
    if (body.startsWith('<w:tbl>', i)) {
      // tables may nest: find the matching close
      let depth = 0;
      let j = i;
      for (;;) {
        const open = body.indexOf('<w:tbl>', j + 1);
        const close = body.indexOf('</w:tbl>', j + 1);
        if (open !== -1 && open < close) { depth++; j = open; }
        else if (depth > 0) { depth--; j = close; }
        else { j = close + 8; break; }
      }
      top.push({ kind: 'tbl', xml: body.slice(i, j) });
      i = j;
    } else if (body.startsWith('<w:p>', i)) {
      const j = body.indexOf('</w:p>', i) + 6;
      top.push({ kind: 'p', xml: body.slice(i, j) });
      i = j;
    } else {
      i++;
    }
  }
  const tw = (xml: string, attr: string): number => Number(new RegExp(`${attr}="(-?\\d+)"`).exec(xml)?.[1] ?? 0);
  let y = 0; // twips from the top of page 1
  let pageNo = 1;
  const seen: Array<{ text: string; baseline: number; x: number }> = [];
  let overflow = 0;
  for (const el of top) {
    if (el.kind === 'p') {
      if (el.xml.includes('<w:pageBreakBefore/>')) { overflow = Math.max(overflow, y); y = 0; pageNo++; }
      const spacing = /<w:spacing [^>]*w:line=[^>]*>/.exec(el.xml)?.[0] ?? '';
      const lines = 1 + (el.xml.match(/<w:br\/>/g) ?? []).length;
      const line = tw(spacing, 'w:line');
      y += tw(spacing, 'w:before');
      const text = [...el.xml.matchAll(/<w:t xml:space="preserve">([^<]*)<\/w:t>/g)].map((m) => m[1]).join('');
      const size = Math.max(0, ...[...el.xml.matchAll(/<w:sz w:val="(\d+)"/g)].map((m) => Number(m[1]) / 2));
      const firstTab = Number(/<w:tab w:val="left" w:pos="(\d+)"/.exec(el.xml)?.[1] ?? NaN);
      const indent = tw(/<w:ind [^>]*>/.exec(el.xml)?.[0] ?? '', 'w:left');
      if (pageNo === 1 && text) seen.push({ text, baseline: (y + line) / 20 - DESCENT * size, x: (Number.isNaN(firstTab) ? indent : firstTab) / 20 });
      y += line * lines;
    } else {
      y += tw(/<w:trHeight [^>]*>/.exec(el.xml)?.[0] ?? '', 'w:val');
    }
  }
  overflow = Math.max(overflow, y);
  check(overflow <= Math.round(truth1.height * 20), `the content of a page is never taller than the page (${(overflow / 20).toFixed(1)} of ${truth1.height.toFixed(1)} pt)`);
  let worstY = 0;
  let worstX = 0;
  let compared = 0;
  for (const marker of ['INFORMACJE O', 'Oferta 1', 'Szwajcarski express', 'ROW1', 'ROW2', 'ROW5', 'STOPKA1']) {
    const mine = seen.find((s) => s.text.includes(marker));
    const t = truth1.lines.find((l) => l.text.includes(marker));
    if (!mine || !t) { check(false, `"${marker}" is a top-level paragraph of page 1`); continue; }
    compared++;
    worstY = Math.max(worstY, Math.abs(mine.baseline - t.baseline));
    worstX = Math.max(worstX, Math.abs(mine.x - t.x));
  }
  check(compared === 7 && worstY < 1 && worstX < 0.6, `seven marker lines: baseline within ${worstY.toFixed(2)} pt, left edge within ${worstX.toFixed(2)} pt of pdf.js`);
  // The right-aligned value of ROW1 starts at its own tab stop.
  const row1 = top.find((e) => e.kind === 'p' && e.xml.replace(/<[^>]+>/g, '').includes('ROW1'))!.xml;
  const tabs = [...row1.matchAll(/<w:tab w:val="left" w:pos="(\d+)"/g)].map((m) => Number(m[1]) / 20);
  const valueX = truth1.lines.find((l) => l.text.includes('ROW1'))!.right - 0; // right edge of the whole row
  check(tabs.length === 2 && tabs[1]! > 250 && tabs[1]! < valueX, `the label and its right-aligned value are two tab stops (${tabs.map((t) => t.toFixed(1)).join(', ')})`);
}

// ---- the .odt
console.log('\n=== .odt ===');
{
  // The body-paragraph variant; text boxes (the default) are tested in tests/fixed-frames.mts.
  const blob = await renderFixedPagesToOdt(result.pages, { textBoxes: false });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const zip = await JSZip.loadAsync(bytes);
  check(new TextDecoder().decode(bytes.subarray(30, 38)) === 'mimetype' && bytes[8] === 0 && bytes[9] === 0, 'mimetype is the first entry, stored uncompressed');
  const content = await zip.file('content.xml')!.async('string');
  const styles = await zip.file('styles.xml')!.async('string');
  for (const [name, xml] of [['content.xml', content], ['styles.xml', styles], ['META-INF/manifest.xml', await zip.file('META-INF/manifest.xml')!.async('string')]] as const) {
    check(new DOMParser().parseFromString(xml, 'text/xml').getElementsByTagName('parsererror').length === 0, `${name} is well-formed`);
  }
  const text = content.replace(/<text:line-break\/>|<text:tab\/>|<\/text:p>/g, ' ').replace(/<text:s[^>]*\/>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  const truthAll = [...(await truthLines(brochure, 1)).words, ...(await truthLines(brochure, 2)).words];
  check(multiset(text.split(/\s+/).filter(Boolean)) === multiset(truthAll), 'the words are exactly those of the PDF');
  check((content.match(/<draw:frame /g) ?? []).length === 2 && content.includes('style:run-through="background"'), 'two page pictures, in the background');
  check(Object.keys(zip.files).filter((n) => n.startsWith('Pictures/') && !n.endsWith('/')).length === 2, 'two picture files, listed in the manifest');
  check((content.match(/<table:table /g) ?? []).length >= 4, 'layout tables are present');
  check(/fo:page-width="59[56][^"]*pt"/.test(styles) && /fo:margin-left="0pt"/.test(styles), 'page size from the PDF, zero margins');
  check(!/style:font-name="(?!Arial")/.test(content), 'only Arial is named');
}

// ============================================================ 4. which engine?
console.log('\n=== fixed layout or flow? ===');
{
  const sig = (o: Partial<Parameters<typeof isDesignedPage>[0]>) => ({ coverage: 0, columnBlocks: 0, visibleChars: 1500, invisibleChars: 0, lightChars: 0, tableChars: 0, ...o });
  check(!isDesignedPage(sig({ coverage: 0.01 })), 'plain text with a thin rule is not designed');
  check(isDesignedPage(sig({ coverage: 0.3 })), 'a page a third covered by graphics is');
  check(isDesignedPage(sig({ columnBlocks: 3 })), 'so is text in side-by-side blocks');
  check(isDesignedPage(sig({ lightChars: 40 })), 'and white text (it needs its background)');
  check(isTablePage(sig({ coverage: 0.2, tableChars: 1400 })) && !isDesignedPage(sig({ coverage: 0.2, tableChars: 1400 })), 'a page that is one real table goes to the flow engine (a real Word table)');
  check(isScannedPage(sig({ visibleChars: 0, invisibleChars: 900, coverage: 0.98 })), 'a scan with an OCR layer is recognised');
  check(chooseLayoutMode([sig({ coverage: 0.5 }), sig({}), sig({}), sig({})]) === 'fixed', 'one designed page in four is enough for the fixed layout');
  check(chooseLayoutMode([sig({ coverage: 0.5 }), ...Array.from({ length: 9 }, () => sig({}))]) === 'flow', 'one in ten is not');
  check(chooseLayoutMode(Array.from({ length: 3 }, () => sig({ visibleChars: 0, invisibleChars: 900, coverage: 0.98 }))) === 'flow', 'scans keep going through the flow engine');
  check(chooseLayoutMode([]) === 'flow', 'an empty document does not crash the choice');
  check(fixedBackgroundScale(595, 842) === 2.2 && fixedBackgroundScale(2384, 3370) < 1, 'the page picture is 2.2 px/pt, less for a huge page');

  const detect = async (name: string) => (await detectPdfLayoutMode(new File([readFileSync(join(ROOT, 'test-real-pdfs', name))], name))).mode;
  check(await detect('chrome-brochure.pdf') === 'fixed', 'chrome-brochure.pdf (designed offer) → fixed');
  check(await detect('allegro-raport.pdf') === 'fixed', 'allegro-raport.pdf (slides with colour bands and photos) → fixed');
  check(await detect('Plik_D.pdf') === 'flow', 'Plik_D.pdf (plain text) → flow');
  check(await detect('epz_pptx_table_fixture.pdf') === 'flow', 'epz_pptx_table_fixture.pdf (one big ruled table) → flow');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
