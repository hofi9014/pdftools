// Text frames in the faithful layout's .odt (lib/pdf/fixedFrames.ts, the writer in
// lib/pdf/fixedLayoutOdt.ts, the reader in lib/pdf/fixedLayoutRead.ts).
//
// Why it exists: the faithful layout used to write every line of an .odt as a body paragraph
// positioned by spacing, tab stops and layout tables — exact, but one rigid sheet: nothing could
// be moved on its own, and text typed into a paragraph pushed the rest of the page. Every block
// of text is now a frame of its own, anchored at its place; running text is a real paragraph
// that wraps inside its frame.
//
// Two things about the frame's XML were found only by LOOKING at what Apache OpenOffice draws
// (line positions were right all along) and are pinned here:
//   - without the parent style "Frame" the element is a drawing shape: light-blue fill, black
//     outline, and the text of every hyperlink is lost;
//   - a Writer frame with "no fill" paints the page's ground over the pictures under it (white
//     boxes over the price badge and the footer); a colour with 100 % transparency is see-through;
//   - without the common paragraph styles in styles.xml, OpenOffice's own "Save" strips the
//     format of every paragraph inside a frame.
//
// What is checked here, without a word processor:
//   1. the model OpenOffice was measured to follow (a line of fixed height has its baseline four
//      fifths below its top) and the frames built from a layout: one per piece of a single line,
//      one per block of running text;
//   2. "soft" paragraphs only where wrapping provably reproduces the PDF's lines, "hard" lines
//      everywhere else (hyphenated ends, words breakable inside, raised runs, a break the wrap
//      would not make, unknown widths);
//   3. the whole pipeline on test-real-pdfs/chrome-brochure.pdf and on a page with a hyperlink:
//      the .odt carries real Writer frames, see-through, with the same words as the PDF, and the
//      site's own reader puts every line back where the PDF has it — also for a frame the user
//      moved, one edited into two paragraphs, and text typed into a frame.
// The same through the real pages and Apache OpenOffice, compared as pictures:
// e2e/pdf-to-word-fixed-layout.mts.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { PDFDocument, PDFName, PDFString, StandardFonts } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
(globalThis as Record<string, unknown>).document = { createElement: (t: string) => (t === 'canvas' ? canvasMod.createCanvas(1, 1) : {}) };
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.startsWith('/')) return new Response(new Uint8Array(readFileSync(join(ROOT, 'public', url))));
  return realFetch(input, init);
}) as typeof fetch;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));

type FixedRun = import('../lib/pdf/fixedLayout.ts').FixedRun;
type FixedLine = import('../lib/pdf/fixedLayout.ts').FixedLine;
type FixedBlock = import('../lib/pdf/fixedLayout.ts').FixedBlock;
type FixedPageLayout = import('../lib/pdf/fixedLayout.ts').FixedPageLayout;
type MeasureText = import('../lib/pdf/fixedLayout.ts').MeasureText;
type PlacedPage = import('../lib/pdf/fixedLayoutRead.ts').PlacedPage;
const { frameLineHeight, frameAscent, frameBaselines, buildPageFrames, wrapRuns, runsWidth, softParagraphRuns } = await import('../lib/pdf/fixedFrames.ts');
const { pdfToFixedPages } = await import('../lib/pdf/fixedLayoutPdf.ts');
const { renderFixedPagesToOdt } = await import('../lib/pdf/fixedLayoutOdt.ts');
const { readFixedOdt, layoutPlacedBoxes, placedLinesOf } = await import('../lib/pdf/fixedLayoutRead.ts');
const { positionedOdtToPdf } = await import('../lib/pdf/fixedLayoutToPdf.ts');
const { initPdfjs, pdfjsDocOptions } = await import('../lib/client-pdf.ts');
const pdfjsLib = await import('pdfjs-dist');
await initPdfjs();

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol;
const squash = (s: string): string => s.replace(/\s+/g, '');
const textOf = (runs: FixedRun[]): string => runs.map((r) => r.text).join('');

/** Every character half its font size wide: widths are easy to say in advance. */
const half: MeasureText = (text, _font, _bold, _italic, size) => [...text].length * size * 0.5;

const run = (text: string, over: Partial<FixedRun> = {}): FixedRun =>
  ({ text, font: 'Arial', fontSize: 10, bold: false, italic: false, color: '000000', scale: 100, spacingTw: 0, raise: 0, ...over });
const line = (baseline: number, x: number, width: number, runs: FixedRun[]): FixedLine =>
  ({ baseline, fontSize: Math.max(...runs.map((r) => r.fontSize)), segments: [{ x, width, runs }] });
const block = (lines: FixedLine[]): FixedBlock => ({ kind: 'text', before: 0, lineHeight: 12, lines });
const pageOf = (blocks: FixedBlock[]): FixedPageLayout => ({ width: 400, height: 600, blocks, unplaced: [] });

// ------------------------------------------------------------ 1. the model and the frames
console.log('=== where a frame puts its lines ===');
{
  check(frameLineHeight(13.02) === 13 && frameLineHeight(13.04) === 13.05 && frameLineHeight(0) === 0.05, 'a line height is a whole number of twentieths of a point');
  // Measured in OpenOffice: a 20 pt line at y = 160 pt has its baselines at 176 and 196 pt.
  check(frameAscent(20) === 16 && frameBaselines(160, 20, 2).join(',') === '176,196', 'the baseline lies four fifths of the line height below the line\'s top (the measured 20 pt case)');
  check(frameAscent(13.05) === 10.4, `the four fifths are taken in whole twentieths, rounded down (${frameAscent(13.05)})`);
}

console.log('\n=== frames of a page ===');
{
  // A single line of two pieces (a label and a value on one row).
  const row: FixedLine = { baseline: 50, fontSize: 10, segments: [{ x: 20, width: 40, runs: [run('Label123', { spacingTw: -2 })] }, { x: 200, width: 30, runs: [run('Value1', { scale: 97 })] }] };
  const frames = buildPageFrames(pageOf([{ kind: 'text', before: 0, lineHeight: 12, lines: [row] }]), half);
  check(frames.length === 2, `each piece of a line is a frame of its own (${frames.length})`);
  check(frames.every((f) => f.lineHeight === 13) && near(frames[0]!.y, 50 - 10.4, 1e-9) && frames[0]!.x === 20 && frames[1]!.x === 200, 'at its left edge; the line is 1.3 font sizes high and its top four fifths of that above the baseline');
  check(near(frames[0]!.width, 180, 1e-9) && near(frames[1]!.width, 400 - 0.5 - 200, 1e-9), 'with all the room up to the next piece or the edge of the page (a frame does not grow sideways)');
  check(frames.every((f) => f.wrap === 'hard' && f.lines.length === 1), 'single lines are never re-wrapped');
  check(frames[0]!.lines[0]![0]!.spacingTw === -2 && frames[1]!.lines[0]![0]!.scale === 97, 'the runs keep the fit to the PDF\'s width the layout gave them (scale and letter spacing)');
  check(frames[0]!.lines[0]![0] !== row.segments[0]!.runs[0], 'as copies: the layout is not touched');

  // A line with a large and a small run: the largest decides.
  const mixed = buildPageFrames(pageOf([block([{ baseline: 80, fontSize: 24, segments: [{ x: 10, width: 100, runs: [run('1446', { fontSize: 24 }), run(' PLN', { fontSize: 12 })] }] }])]), half)[0]!;
  check(mixed.lineHeight === 31.2 && near(mixed.y, 80 - frameAscent(31.2), 1e-9), 'the largest font size of a line decides its height');

  // Columns are walked.
  const cols = buildPageFrames(pageOf([{ kind: 'columns', top: 0, height: 40, columns: [
    { x: 10, width: 100, blocks: [block([line(20, 10, 25, [run('Left1')])])] },
    { x: 200, width: 100, blocks: [block([line(26, 200, 30, [run('Right1')])])] },
  ] }]), half);
  check(cols.length === 2 && textOf(cols[0]!.lines[0]!) === 'Left1' && near(cols[1]!.y, 26 - 10.4, 1e-9), 'blocks inside layout columns become frames at their own heights');
}

console.log('\n=== wrapping as a word processor does ===');
{
  const text = [run('aaa bbb '), run('ccc', { bold: true }), run(' ddd eee')];
  const lines = wrapRuns(text, 40, half)!; // "aaa bbb" = 35, + " ccc" = 55
  check(lines.map(textOf).join('|') === 'aaa bbb|ccc ddd|eee', `words go on a line while they fit (${lines.map(textOf).join(' | ')})`);
  check(lines[1]![0]!.bold && !lines[1]![1]!.bold, 'a line keeps the formats of its words');
  check(wrapRuns(text, 40, half, 1.2)!.length === 5 && wrapRuns(text, 40, half, 0.6)!.length === 2, 'the stretch factor moves the breaks (it is what the stability test uses)');
  check(wrapRuns([run('abc'), run('def ghi')], 20, half)!.map(textOf).join('|') === 'abcdef|ghi', 'a word that crosses runs is never split');
  check(wrapRuns(text, 40, () => null) === null, 'unknown widths give null');
  check(runsWidth([run('abcd', { scale: 90, spacingTw: 10 })], half) === 20 * 0.9 + 4 * 0.5, 'widths count the character scale and the letter spacing');
}

// ------------------------------------------------------------ 2. soft and hard paragraphs
console.log('\n=== running text: one paragraph where that is provably the same ===');
{
  // 10 pt, 5 pt per character.
  const para = (texts: string[], widths?: number[], over: Partial<FixedRun> = {}): FixedBlock =>
    block(texts.map((t, i) => line(100 + i * 13, 30, widths?.[i] ?? [...t].length * 5, [run(t, over)])));
  const frameOf = (b: FixedBlock) => buildPageFrames(pageOf([b]), half)[0]!;

  const ragged = frameOf(para(['alpha beta gamma', 'delta epsilon zeta', 'eta theta']));
  check(ragged.wrap === 'soft' && ragged.align === 'start', `ragged text whose breaks the wrap reproduces is one paragraph (${ragged.wrap}, ${ragged.align})`);
  // longest line 90 pt; the shortest "line + space + next word" is 80 + 5 + 25 = 110.
  check(ragged.width > 90 * 1.015 && ragged.width < 110 * 0.985, `the frame is wider than its longest line and too narrow for any line plus the next word (${ragged.width.toFixed(1)} pt)`);
  check(ragged.lineHeight === 13 && near(ragged.y, 100 - 10.4, 1e-9) && ragged.x === 30, 'its lines are as high as the PDF\'s line step; the top four fifths of that above the first baseline');
  check(frameBaselines(ragged.y, ragged.lineHeight, 3).every((b, i) => near(b, 100 + i * 13, 1e-9)), 'so every line lands on the PDF\'s baseline');
  const written = softParagraphRuns(ragged.lines);
  check(textOf(written) === 'alpha beta gamma delta epsilon zeta eta theta', 'written as one paragraph, its lines joined by single spaces');
  check(wrapRuns(written, ragged.width, half)!.map((l) => textOf(l).trim()).join('|') === 'alpha beta gamma|delta epsilon zeta|eta theta', 'wrapping what is written gives the PDF\'s lines back');

  // The layout fitted every line to its own width (scale / spacing): a ragged paragraph keeps that.
  const fitted = frameOf(block([
    line(100, 30, 78.4, [run('alpha beta gamma', { scale: 98 })]),
    line(113, 30, 87.3, [run('delta epsilon zeta', { spacingTw: -3 })]),
    line(126, 30, 45, [run('eta theta')]),
  ]));
  check(fitted.wrap === 'soft' && fitted.lines[0]![0]!.scale === 98 && fitted.lines[1]![0]!.spacingTw === -3, 'each ragged line keeps the fit to its own width in the PDF');

  // Justified: body lines end at one edge.
  const just = frameOf(para(['aaaa bbbb cccc dddd', 'eeee ffff gggg hh', 'iiii jjjj kkkk llll', 'mmmm nn'], [100, 100, 100, 35], { spacingTw: 6 }));
  check(just.wrap === 'soft' && just.align === 'justify' && near(just.width, 100, 1e-9), `lines ending at one edge are a justified paragraph as wide as that edge (${just.wrap}, ${just.align}, ${just.width})`);
  check(new Set(just.lines.flat().map((r) => `${r.scale}|${r.spacingTw}`)).size === 1 && just.lines.flat()[0]!.spacingTw === 0 && just.lines.every((l) => runsWidth(l, half)! <= 100 + 1e-6),
    'a justified paragraph has one scale and no letter spacing (the word processor stretches the spaces), and no line is wider than the frame');

  // Everything that must stay as the PDF's own lines.
  const hard = (name: string, b: FixedBlock): void => {
    const f = frameOf(b);
    check(f.wrap === 'hard' && b.kind === 'text' && f.lines.length === b.lines.length, `${name}: the lines are kept as they are`);
  };
  hard('a line ending in a hyphenated word', para(['alpha beta gam-', 'ma delta epsilon', 'eta theta']));
  hard('a word a word processor may break inside (a/b)', para(['alpha beta gamma', 'delta and/or zeta', 'eta theta']));
  hard('a break the wrap would not make (the next word would still fit)', para(['alpha', 'beta gamma delta eps', 'eta theta']));
  hard('a break too close to call (within the tolerance)', para(['alpha beta gamma del', 'x epsilon zeta', 'eta theta'], [100, 70, 45]));
  hard('a raised run (a superscript)', block([line(100, 30, 80, [run('alpha beta gamma'), run('2', { raise: 3, fontSize: 6 })]), line(113, 30, 90, [run('delta epsilon zeta')]), line(126, 30, 45, [run('eta theta')])]));
  const noMeasure = buildPageFrames(pageOf([para(['alpha beta gamma', 'delta epsilon zeta', 'eta theta'])]))[0]!;
  check(noMeasure.wrap === 'hard', 'without metrics nothing is re-wrapped');
  const hf = frameOf(para(['alpha', 'beta gamma delta eps', 'eta theta']));
  check(near(hf.width, 100 + 4, 1e-9) && hf.lineHeight === 13, 'a hard frame is as wide as its widest line plus a little slack, so that no line wraps');
  check(frameOf(para(['alpha beta gamma', 'delta epsilon zeta'])).wrap === 'soft', 'two lines are enough for a paragraph');
}

// ------------------------------------------------------------ 3. the pipeline
console.log('\n=== chrome-brochure.pdf -> .odt with text frames ===');
const brochure = new Uint8Array(readFileSync(join(ROOT, 'test-real-pdfs', 'chrome-brochure.pdf')));
const source = await pdfToFixedPages(new File([brochure], 'chrome-brochure.pdf'));
const frames = source.pages.map((p) => buildPageFrames(p.layout, source.measure));
const odt = await renderFixedPagesToOdt(source.pages, { measure: source.measure });
const zip = await JSZip.loadAsync(await odt.arrayBuffer());
const content = await zip.file('content.xml')!.async('string');
const stylesXml = await zip.file('styles.xml')!.async('string');
{
  const total = frames.reduce((n, f) => n + f.length, 0);
  const soft = frames.flat().filter((f) => f.wrap === 'soft');
  check(typeof source.measure === 'function', 'the pipeline hands out the metrics it fitted the text with');
  check(total >= 40 && soft.length >= 5, `${total} frames, ${soft.length} of them paragraphs that wrap on their own`);
  check(!!new DOMParser().parseFromString(content, 'text/xml').documentElement && !!new DOMParser().parseFromString(stylesXml, 'text/xml').documentElement, 'content.xml and styles.xml are well-formed');
  const boxes = [...content.matchAll(/<draw:frame [^>]*>(?=<draw:text-box)/g)].map((m) => m[0]);
  check(boxes.length === total, `one text frame per block (${boxes.length})`);
  check(boxes.every((b) => /svg:x="[\d.]+pt"/.test(b) && /svg:y="-?[\d.]+pt"/.test(b) && /svg:width="[\d.]+pt"/.test(b) && /text:anchor-type="paragraph"/.test(b)), 'each with its place and an explicit width');
  check((content.match(/<draw:image /g) ?? []).length === source.pages.length && !content.includes('<table:table'), 'the page pictures are still there; no layout tables are needed any more');

  // What makes it a Writer frame and not a drawing shape (light-blue fill, lost link text).
  const used = [...new Set(boxes.map((b) => /draw:style-name="([^"]+)"/.exec(b)![1]!))];
  const frameStyle = new RegExp(`<style:style style:name="${used[0]}"[^>]*>.*?</style:style>`).exec(content)?.[0] ?? '';
  check(used.length === 1 && /style:family="graphic"/.test(frameStyle) && /style:parent-style-name="Frame"/.test(frameStyle), 'every text frame has a graphic style whose parent is "Frame" — that is what makes it a Writer frame');
  check(/<style:style style:name="Frame" style:family="graphic">/.test(stylesXml), 'and the "Frame" style exists in styles.xml');
  // What makes it see-through over the page picture (a frame with "no fill" paints white over it).
  check(/fo:background-color="#[0-9a-fA-F]{6}"/.test(frameStyle) && /style:background-transparency="100%"/.test(frameStyle) && !/fo:background-color="transparent"/.test(frameStyle),
    'its ground is a colour with 100 % transparency, not "no fill"');
  check(/fo:border="none"/.test(frameStyle) && /fo:padding="0pt"/.test(frameStyle) && /style:run-through="foreground"/.test(frameStyle) && /style:horizontal-rel="page"/.test(frameStyle) && /style:vertical-rel="page"/.test(frameStyle),
    'no border, no padding, in front of the pictures, placed from the page\'s corner');

  const paraStyles = [...content.matchAll(/<style:style style:name="(FB\d+)"[^>]*>.*?<\/style:style>/g)];
  check(paraStyles.length > 0 && paraStyles.every((m) => /fo:line-height="[\d.]+pt"/.test(m[0])), `the paragraphs in frames have exact line heights (${paraStyles.length} styles)`);
  // Without the common paragraph styles OpenOffice saves every frame paragraph again as a bare
  // <text:p>: line height, font and size are gone from the user's file after one "Save".
  check(paraStyles.every((m) => /style:parent-style-name="Frame_20_contents"/.test(m[0]))
    && /<style:style style:name="Standard" style:family="paragraph"/.test(stylesXml) && /<style:style style:name="Frame_20_contents"[^>]*style:family="paragraph"[^>]*style:parent-style-name="Standard"/.test(stylesXml),
    'their parent is "Frame contents", and that style and "Standard" exist in styles.xml (OpenOffice keeps the format through its own save only then)');
  const justified = frames.flat().filter((f) => f.align === 'justify').length;
  check(content.includes('fo:text-align="justify"') === justified > 0, `justified paragraphs are written as justified, and only those (${justified} in this file)`);
  // The same characters as the layout the text was written from.
  const plain = squash(content.replace(/<text:line-break\/>/g, ' ').replace(/<\/text:p>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
  const want = squash(source.pages.flatMap((p) => placedLinesOf(p.layout)).flatMap((l) => l.segments.map((s) => textOf(s.runs))).join(' '));
  check([...plain].sort().join('') === [...want].sort().join(''), `the same characters as the PDF's text (${plain.length} / ${want.length})`);
}

console.log('\n=== read back by the site: every line where the PDF has it ===');
{
  const pages = await readFixedOdt(odt);
  check(!!pages && pages.length === source.pages.length, `recognised as a positioned document (${pages?.length} pages)`);
  if (pages) {
    check(pages.every((p, i) => (p.boxes ?? []).length === frames[i]!.length && p.lines.length === 0), 'its text arrives as frames, not yet laid out');
    check(pages.flatMap((p) => p.boxes ?? []).every((b) => b.width > 0 && b.paragraphs.length === 1 && b.paragraphs[0]!.lineHeight > 0), 'every frame has a width and one paragraph, with its line height');
    layoutPlacedBoxes(pages, source.measure);
    let lines = 0;
    let missing = 0;
    let worstY = 0;
    let worstX = 0;
    pages.forEach((page, i) => {
      for (const want of placedLinesOf(source.pages[i]!.layout)) for (const seg of want.segments) {
        lines++;
        const text = squash(textOf(seg.runs));
        const got = page.lines.filter((l) => squash(l.segments.map((s) => textOf(s.runs)).join('')) === text)
          .sort((a, b) => Math.abs(a.baseline - want.baseline) - Math.abs(b.baseline - want.baseline))[0];
        if (!got) { missing++; continue; }
        worstY = Math.max(worstY, Math.abs(got.baseline - want.baseline));
        worstX = Math.max(worstX, Math.abs(got.segments[0]!.x - seg.x));
      }
    });
    check(missing === 0, `all ${lines} pieces of text come back as lines of their own (soft paragraphs wrapped exactly as in the PDF)`);
    check(worstY < 0.3 && worstX < 1, `baselines within ${worstY.toFixed(2)} pt, left edges within ${worstX.toFixed(2)} pt of the layout`);
    check(pages.every((p) => p.boxes === undefined), 'the frames are consumed');
  }
}

/** A PDF page as pdf.js reads it: lines of text with their left edge, right edge and baseline. */
async function pdfRows(bytes: Uint8Array): Promise<Array<Array<{ text: string; x: number; right: number; baseline: number }>>> {
  const pdf = await pdfjsLib.getDocument(pdfjsDocOptions(bytes)).promise;
  const out: Array<Array<{ text: string; x: number; right: number; baseline: number }>> = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const h = page.getViewport({ scale: 1 }).height;
    const items = (await page.getTextContent()).items.filter((i): i is typeof i & { str: string; transform: number[]; width: number } => 'str' in i && i.str.trim().length > 0);
    const rows: Array<{ baseline: number; items: typeof items }> = [];
    for (const it of items) {
      const b = h - it.transform[5]!;
      const row = rows.find((r) => Math.abs(r.baseline - b) < 0.6);
      if (row) row.items.push(it); else rows.push({ baseline: b, items: [it] });
    }
    out.push(rows.map((r) => {
      const s = r.items.sort((a, b) => a.transform[4]! - b.transform[4]!);
      return { text: squash(s.map((i) => i.str).join('')), x: s[0]!.transform[4]!, right: Math.max(...s.map((i) => i.transform[4]! + i.width)), baseline: r.baseline };
    }));
  }
  return out;
}

console.log('\n=== .odt with text frames -> PDF: the pages of the original ===');
{
  const blob = await positionedOdtToPdf(odt);
  check(!!blob, 'converted by position');
  if (blob) {
    const truth = await pdfRows(new Uint8Array(brochure));
    const got = await pdfRows(new Uint8Array(await blob.arrayBuffer()));
    check(got.length === truth.length, `${got.length} pages`);
    let total = 0, found = 0, wy = 0, wx = 0, wr = 0;
    truth.forEach((ls, p) => {
      for (const l of ls) {
        total++;
        const g = (got[p] ?? []).filter((o) => o.text === l.text).sort((a, b) => Math.abs(a.baseline - l.baseline) - Math.abs(b.baseline - l.baseline))[0];
        if (!g) continue;
        found++;
        wy = Math.max(wy, Math.abs(g.baseline - l.baseline));
        wx = Math.max(wx, Math.abs(g.x - l.x));
        wr = Math.max(wr, Math.abs(g.right - l.right));
      }
    });
    check(found === total, `every line of the original PDF is a line of the result (${found}/${total})`);
    check(wy < 0.3 && wx < 0.5 && wr < 1.5, `baseline within ${wy.toFixed(2)} pt, left edge within ${wx.toFixed(2)} pt, line end within ${wr.toFixed(2)} pt`);
  }
}

console.log('\n=== a hyperlink inside a frame ===');
{
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Zobacz', { x: 40, y: 200, size: 12, font });
  page.drawText('regulamin sklepu', { x: 84, y: 200, size: 12, font });
  const w = font.widthOfTextAtSize('regulamin sklepu', 12);
  const annot = doc.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [84, 197, 84 + w, 211], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of('https://example.com/regulamin') } });
  page.node.set(PDFName.of('Annots'), doc.context.obj([doc.context.register(annot)]));
  const linked = await pdfToFixedPages(new File([await doc.save()], 'link.pdf'));
  const xml = await (await JSZip.loadAsync(await (await renderFixedPagesToOdt(linked.pages, { measure: linked.measure })).arrayBuffer())).file('content.xml')!.async('string');
  const a = /<text:a [^>]*xlink:href="https:\/\/example\.com\/regulamin"[^>]*>(.*?)<\/text:a>/.exec(xml);
  check(!!a && squash(a[1]!.replace(/<[^>]+>/g, '')).length > 0 && 'regulaminsklepu'.includes(squash(a[1]!.replace(/<[^>]+>/g, ''))), `the link is written around its text inside the frame (${a ? a[1]!.replace(/<[^>]+>/g, '') : 'missing'})`);
  check(xml.indexOf('<text:a ') > xml.indexOf('<draw:text-box'), 'inside a text frame — which keeps a link\'s text only because it is a Writer frame');
  const back = await readFixedOdt(await renderFixedPagesToOdt(linked.pages, { measure: linked.measure }));
  if (back) layoutPlacedBoxes(back, linked.measure);
  const runs = (back ?? []).flatMap((p) => p.lines).flatMap((l) => l.segments.flatMap((s) => s.runs));
  check(runs.some((r) => r.link === 'https://example.com/regulamin' && r.text.includes('regulamin')), 'and the reader gives the link back');
}

console.log('\n=== frames the user changed ===');
{
  // A frame moved by 30 pt / 12 pt: its text follows it.
  const first = /(<draw:frame [^>]*svg:x=")([\d.]+)(pt" svg:y=")([\d.]+)(pt"[^>]*>)(?=<draw:text-box)/.exec(content)!;
  const moved = content.replace(first[0], `${first[1]}${(Number(first[2]) + 30).toFixed(2)}${first[3]}${(Number(first[4]) + 12).toFixed(2)}${first[5]}`);
  const z2 = await JSZip.loadAsync(await odt.arrayBuffer());
  z2.file('content.xml', moved);
  const pages = await readFixedOdt(new Blob([await z2.generateAsync({ type: 'uint8array' })]));
  const before = await readFixedOdt(odt);
  check(!!pages && !!before, 'a document with a moved frame is still read by position');
  if (pages && before) {
    const pageIdx = before.findIndex((p) => (p.boxes ?? []).some((b) => near(b.x, Number(first[2]), 0.01) && near(b.y, Number(first[4]), 0.01)));
    const a = before[pageIdx]!.boxes!.find((b) => near(b.x, Number(first[2]), 0.01) && near(b.y, Number(first[4]), 0.01))!;
    const b = pages[pageIdx]!.boxes!.find((q) => near(q.x, a.x + 30, 0.01) && near(q.y, a.y + 12, 0.01));
    check(!!b && textOf(b.paragraphs[0]!.lines[0]!) === textOf(a.paragraphs[0]!.lines[0]!), 'the text is read at the frame\'s new place');
  }

  // A paragraph in a frame without a fixed line height (typed with a default style): not guessed.
  const loose = content.replace(/(<style:style style:name="FB1"[^>]*><style:paragraph-properties [^>]*?)fo:line-height="[\d.]+pt"/, '$1fo:line-height="120%"');
  const z3 = await JSZip.loadAsync(await odt.arrayBuffer());
  z3.file('content.xml', loose);
  check(loose !== content && (await readFixedOdt(new Blob([await z3.generateAsync({ type: 'uint8array' })]))) === null, 'a frame paragraph without an exact line height sends the document to the ordinary reader (nothing is guessed)');

  // A frame edited into two paragraphs of different line heights, with an empty line between.
  const two: PlacedPage = {
    width: 300, height: 300, lines: [],
    boxes: [{ x: 40, y: 50, width: 200, paragraphs: [
      { lineHeight: 13, lines: [[run('Pierwszy akapit')]] },
      { lineHeight: 13, lines: [[]] },
      { lineHeight: 30, lines: [[run('Drugi', { fontSize: 20 })], [run('i trzecia linia', { fontSize: 20 })]] },
    ] }],
  };
  layoutPlacedBoxes([two], half);
  const ys = two.lines.map((l) => l.baseline);
  check(two.lines.length === 3 && near(ys[0]!, 50 + 10.4, 1e-9) && near(ys[1]!, 50 + 26 + 24, 1e-9) && near(ys[2]!, 50 + 26 + 30 + 24, 1e-9), `paragraphs of a frame follow one another, each line as high as its paragraph says; an empty line takes its height (${ys.map((v) => v.toFixed(2)).join(', ')})`);
  check(two.lines.every((l) => l.segments[0]!.x === 40), 'at the frame\'s left edge');

  // Text typed into a frame wraps inside it.
  const typed: PlacedPage = { width: 300, height: 300, lines: [], boxes: [{ x: 10, y: 10, width: 60, paragraphs: [{ lineHeight: 13, lines: [[run('aaa bbb ccc ddd eee fff')]] }] }] };
  layoutPlacedBoxes([typed], half);
  check(typed.lines.length === 2 && textOf(typed.lines[0]!.segments[0]!.runs).trim() === 'aaa bbb ccc' && textOf(typed.lines[1]!.segments[0]!.runs).trim() === 'ddd eee fff' && near(typed.lines[1]!.baseline - typed.lines[0]!.baseline, 13, 1e-9), 'a paragraph longer than its frame is wrapped into it, line under line');
}

console.log(fails === 0 ? '\nALL PASS' : `\nFAILURES PRESENT: ${fails}`);
process.exit(fails === 0 ? 0 : 1);
