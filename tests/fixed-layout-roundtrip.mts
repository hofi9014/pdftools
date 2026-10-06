// A document written with the faithful layout, read back and turned into a PDF again
// (lib/pdf/fixedLayoutRead.ts + fixedLayoutToPdf.ts).
//
// Why it exists: PDF -> Word (faithful layout) -> PDF through this site's own Word -> PDF gave 41
// loose pages for a 27-page report, because the ordinary reader reflows paragraphs and knows
// nothing of exact line heights, tab stops, layout tables or the page picture. A positioned
// document is now read as positions.
//
// What is proven here, without a browser:
//   1. the readers return, for the .docx and the .odt written from chrome-brochure.pdf, the very
//      lines the writers were given (text, left edge, baseline), the page sizes and the pictures;
//   2. the PDF made from them has the same pages, the same words and every line where the
//      ORIGINAL PDF has it — both read by pdf.js, an independent reader;
//   3. an ordinary document (the flow engine's .docx / .odt) is NOT taken for a positioned one;
//   4. pages of different sizes: the section-closing paragraph is 1 pt high (it used to be a full
//      default line under a full page), a landscape page is written as landscape, and the sizes
//      survive the round trip in both formats;
//   5. a link stays a link, and text in a family other than Arial keeps its width.
// The same round trip through the real pages is e2e/roundtrips-real-pdf.mts.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

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

const { FIXED_DESCENT } = await import('../lib/pdf/fixedLayout.ts');
type FixedPageLayout = import('../lib/pdf/fixedLayout.ts').FixedPageLayout;
type FixedRun = import('../lib/pdf/fixedLayout.ts').FixedRun;
type FixedPage = import('../lib/pdf/fixedLayoutDocx.ts').FixedPage;
type PlacedPage = import('../lib/pdf/fixedLayoutRead.ts').PlacedPage;
type PlacedLine = import('../lib/pdf/fixedLayoutRead.ts').PlacedLine;
const { pdfToFixedPages } = await import('../lib/pdf/fixedLayoutPdf.ts');
const { renderFixedPagesToDocx } = await import('../lib/pdf/fixedLayoutDocx.ts');
const { renderFixedPagesToOdt } = await import('../lib/pdf/fixedLayoutOdt.ts');
const { readFixedDocx, readFixedOdt, placedLinesOf } = await import('../lib/pdf/fixedLayoutRead.ts');
const { renderPlacedPagesToPdf, positionedDocxToPdf, positionedOdtToPdf } = await import('../lib/pdf/fixedLayoutToPdf.ts');
const { pdfToDocxDocument, pdfToOdtDocument } = await import('../lib/pdf/pdfDocumentExport.ts');
const { initPdfjs, pdfjsDocOptions } = await import('../lib/client-pdf.ts');
const pdfjsLib = await import('pdfjs-dist');
await initPdfjs();

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const squash = (s: string): string => s.replace(/\s+/g, '');
const lineText = (l: PlacedLine): string => l.segments.map((s) => s.runs.map((r) => r.text).join('')).join(' ');

interface TruthLine { text: string; x: number; right: number; baseline: number }
/** A PDF page as pdf.js reads it: lines of text with their left edge, right edge and baseline. */
async function pdfLines(bytes: Uint8Array): Promise<Array<{ width: number; height: number; lines: TruthLine[]; words: string[] }>> {
  const pdf = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(bytes))).promise;
  const out = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items.filter((i): i is typeof i & { str: string; transform: number[]; width: number } => 'str' in i && i.str.trim().length > 0);
    const rows: Array<{ baseline: number; items: typeof items }> = [];
    for (const it of items) {
      const b = vp.height - it.transform[5]!;
      const row = rows.find((r) => Math.abs(r.baseline - b) < 0.6);
      if (row) row.items.push(it);
      else rows.push({ baseline: b, items: [it] });
    }
    const lines = rows.map((r) => {
      const sorted = r.items.sort((a, b) => a.transform[4]! - b.transform[4]!);
      return { text: sorted.map((i) => i.str).join(' '), x: sorted[0]!.transform[4]!, right: Math.max(...sorted.map((i) => i.transform[4]! + i.width)), baseline: r.baseline };
    });
    out.push({ width: vp.width, height: vp.height, lines, words: items.flatMap((i) => i.str.split(/\s+/)).filter(Boolean) });
  }
  return out;
}

const brochure = new Uint8Array(readFileSync(join(ROOT, 'test-real-pdfs', 'chrome-brochure.pdf')));
const source = await pdfToFixedPages(new File([brochure], 'chrome-brochure.pdf'));
const truth = await pdfLines(brochure);
const docx = await renderFixedPagesToDocx(source.pages);
const odt = await renderFixedPagesToOdt(source.pages);

// ------------------------------------------------------------ 1. the readers
for (const [name, read] of [['.docx', () => readFixedDocx(docx)], ['.odt', () => readFixedOdt(odt)]] as const) {
  console.log(`\n=== ${name}: read back as the positions it was written from ===`);
  const pages = await read();
  check(!!pages && pages.length === source.pages.length, `recognised as a positioned document, ${pages?.length} pages`);
  if (!pages) continue;
  let lines = 0;
  let worstY = 0;
  let worstX = 0;
  let textDiff = 0;
  pages.forEach((page, i) => {
    const want = placedLinesOf(source.pages[i]!.layout);
    lines += want.length;
    if (page.lines.length !== want.length) { textDiff += Math.abs(page.lines.length - want.length); return; }
    // Same order: both walk the document top to bottom, columns left to right.
    want.forEach((w, k) => {
      const got = page.lines[k]!;
      if (squash(lineText(got)) !== squash(lineText(w))) { textDiff++; return; }
      worstY = Math.max(worstY, Math.abs(got.baseline - w.baseline));
      w.segments.forEach((s, j) => { worstX = Math.max(worstX, Math.abs((got.segments[j]?.x ?? Infinity) - s.x)); });
    });
  });
  check(textDiff === 0, `all ${lines} lines come back with their text`);
  // The writers round sizes to half a point and positions to a twentieth; a line squeezed against
  // the one above it is the only thing that moves by more.
  check(worstY < 1 && worstX < 0.06, `baselines within ${worstY.toFixed(2)} pt, left edges within ${worstX.toFixed(3)} pt of the layout`);
  check(pages.every((p, i) => Math.abs(p.width - source.pages[i]!.layout.width) < 0.06 && Math.abs(p.height - source.pages[i]!.layout.height) < 0.06), 'page sizes are the PDF\'s');
  check(pages.every((p, i) => !!p.background && p.background.mime === 'image/jpeg' && p.background.data.length === source.pages[i]!.background!.data.length), 'every page has its picture, byte for byte the same length');
  const run = pages[0]!.lines.flatMap((l) => l.segments.flatMap((s) => s.runs)).find((r) => r.text.trim().length > 3)!;
  check(run.font === 'Arial' && run.fontSize > 4 && /^[0-9a-f]{6}$/i.test(run.color), `runs carry their format (${run.font} ${run.fontSize} pt #${run.color})`);
}

// ------------------------------------------------------------ 2. the PDF made from them
for (const [name, convert] of [['.docx', () => positionedDocxToPdf(docx)], ['.odt', () => positionedOdtToPdf(odt)]] as const) {
  console.log(`\n=== ${name} -> PDF: the pages of the original ===`);
  const blob = await convert();
  check(!!blob, 'converted by position');
  if (!blob) continue;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const out = await pdfLines(bytes);
  check(out.length === truth.length, `${out.length} pages (the original has ${truth.length})`);
  check(out.every((p, i) => Math.abs(p.width - truth[i]!.width) < 0.1 && Math.abs(p.height - truth[i]!.height) < 0.1), 'the same page sizes');
  let matched = 0;
  let total = 0;
  let worstY = 0;
  let worstX = 0;
  let worstRight = 0;
  out.forEach((page, i) => {
    const sorted = (ws: string[]): string => [...ws].sort().join(' ');
    check(sorted(squashWords(page.words)) === sorted(squashWords(truth[i]!.words)), `page ${i + 1}: the same text (${page.words.length} / ${truth[i]!.words.length} words)`);
    for (const t of truth[i]!.lines) {
      total++;
      const got = page.lines.filter((l) => squash(l.text) === squash(t.text)).sort((a, b) => Math.abs(a.baseline - t.baseline) - Math.abs(b.baseline - t.baseline))[0];
      if (!got) continue;
      matched++;
      worstY = Math.max(worstY, Math.abs(got.baseline - t.baseline));
      worstX = Math.max(worstX, Math.abs(got.x - t.x));
      worstRight = Math.max(worstRight, Math.abs(got.right - t.right));
    }
  });
  check(matched === total, `every line of the original is a line of the result (${matched} of ${total})`);
  check(worstY < 1.2 && worstX < 0.8 && worstRight < 2.5, `baseline within ${worstY.toFixed(2)} pt, left edge within ${worstX.toFixed(2)} pt, line end within ${worstRight.toFixed(2)} pt of the original PDF`);
  const pdf = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(bytes))).promise;
  const ops = await (await pdf.getPage(1)).getOperatorList();
  check(ops.fnArray.includes(pdfjsLib.OPS.paintImageXObject), 'the page picture is drawn');
}

/** Words as one comparable list: the result draws a line run by run, so it is compared letter-wise per page. */
function squashWords(words: string[]): string[] {
  return [...words.join('')].filter((c) => c.trim());
}

// ------------------------------------------------------------ 3. ordinary documents
console.log('\n=== an ordinary document is not taken for a positioned one ===');
{
  const plain = new File([readFileSync(join(ROOT, 'test-real-pdfs', 'Plik_D.pdf'))], 'Plik_D.pdf');
  const flowDocx = await pdfToDocxDocument(plain, 'flow');
  const flowOdt = await pdfToOdtDocument(plain, 'flow');
  check(flowDocx.layout === 'flow' && (await readFixedDocx(flowDocx.blob)) === null, 'the flow engine\'s .docx: null (the ordinary reader takes it)');
  check(flowOdt.layout === 'flow' && (await readFixedOdt(flowOdt.blob)) === null, 'the flow engine\'s .odt: null');
  check((await positionedDocxToPdf(flowDocx.blob)) === null && (await positionedOdtToPdf(flowOdt.blob)) === null, 'so neither is converted by position');
  check((await readFixedDocx(new Blob([new Uint8Array(brochure)]))) === null, 'a file that is not a document at all: null, no exception');

  // One paragraph without an exact line height (typed in by the user in Word) is enough.
  const zip = await JSZip.loadAsync(await docx.arrayBuffer());
  const xml = await zip.file('word/document.xml')!.async('string');
  zip.file('word/document.xml', xml.replace('<w:sectPr>', '<w:p><w:r><w:t>Dopisane w Wordzie</w:t></w:r></w:p><w:sectPr>'));
  const edited = await zip.generateAsync({ type: 'blob' });
  check((await readFixedDocx(edited)) === null, 'a positioned document with an ordinary paragraph added: null (no guessing where it goes)');
}

// ------------------------------------------------------------ 4. pages of different sizes
console.log('\n=== pages of different sizes ===');
{
  const run: FixedRun = { text: 'Strona', font: 'Arial', fontSize: 10, bold: false, italic: false, color: '000000', scale: 100, spacingTw: 0, raise: 0 };
  const mk = (width: number, height: number): FixedPage => ({
    layout: { width, height, unplaced: [], blocks: [{ kind: 'text', before: 40, lineHeight: 12, lines: [{ baseline: 50.8, fontSize: 10, segments: [{ x: 30, width: 28, runs: [run] }] }] }] } as FixedPageLayout,
  });
  const sizes: Array<[number, number]> = [[595, 842], [595, 842], [842, 595], [595, 842]];
  const pagesIn = sizes.map(([w, h]) => mk(w, h));
  const mixedDocx = await renderFixedPagesToDocx(pagesIn);
  const xml = await (await JSZip.loadAsync(await mixedDocx.arrayBuffer())).file('word/document.xml')!.async('string');
  const sectionEnds = [...xml.matchAll(/<w:p><w:pPr>((?:(?!<\/w:pPr>).)*)<w:sectPr>/g)].map((m) => m[1]!);
  check(sectionEnds.length === 2 && sectionEnds.every((s) => /w:line="20" w:lineRule="exact"/.test(s)), `the paragraph that closes a section is 1 pt high (${sectionEnds.length} of them)`);
  check(/<w:pgSz w:w="16840" w:h="11900" w:orient="landscape"\/>/.test(xml), 'the landscape page is written as landscape, wide side as its width');
  check((xml.match(/w:lineRule="exact"/g) ?? []).length === (xml.match(/<w:p>/g) ?? []).length, 'every paragraph has an exact line height');
  for (const [name, pages] of [['.docx', await readFixedDocx(mixedDocx)], ['.odt', await readFixedOdt(await renderFixedPagesToOdt(pagesIn))]] as const) {
    const got = (pages ?? []).map((p: PlacedPage) => `${Math.round(p.width)}x${Math.round(p.height)}`).join(' ');
    check(got === sizes.map(([w, h]) => `${w}x${h}`).join(' '), `${name}: four pages with their own sizes (${got})`);
    const line = pages?.[2]?.lines[0];
    // 1 pt page head + 40 before + 12 line, baseline FIXED_DESCENT of 10 pt above the line's bottom
    check(!!line && Math.abs(line.baseline - (53 - FIXED_DESCENT * 10)) < 0.06 && Math.abs(line.segments[0]!.x - 30) < 0.06, `${name}: the line of the landscape page is at x 30, baseline ${line?.baseline.toFixed(2)}`);
  }
}

// ------------------------------------------------------------ 5. links and other families
console.log('\n=== a link stays a link; text in another family keeps its width ===');
{
  const base = { fontSize: 12, bold: false, italic: false, color: '0000ee', scale: 100, spacingTw: 0, raise: 0 };
  const page: PlacedPage = {
    width: 400, height: 300,
    lines: [
      { baseline: 60, segments: [{ x: 40, runs: [{ ...base, text: 'optimapdf.com', font: 'Arial', link: 'https://optimapdf.com/' }] }] },
      { baseline: 100, segments: [{ x: 40, runs: [{ ...base, text: 'Zażółć gęślą jaźń i jeszcze trochę', font: 'Arial' }] }] },
      { baseline: 140, segments: [{ x: 40, runs: [{ ...base, text: 'Zażółć gęślą jaźń i jeszcze trochę', font: 'Times New Roman' }] }] },
      { baseline: 180, segments: [{ x: 40, runs: [{ ...base, text: 'rozstrzelony', font: 'Arial', spacingTw: 40, scale: 80 }] }] },
    ],
  };
  const blob = await renderPlacedPagesToPdf([page], { measure: (text, family, _b, _i, size) => (family === 'Times New Roman' ? text.length * size * 0.4 : null) });
  const bytes = new Uint8Array(await blob!.arrayBuffer());
  const pdf = await pdfjsLib.getDocument(pdfjsDocOptions(new Uint8Array(bytes))).promise;
  const p1 = await pdf.getPage(1);
  const annots = await p1.getAnnotations();
  const link = annots.find((a: { subtype?: string }) => a.subtype === 'Link') as { url?: string; rect: number[] } | undefined;
  check(link?.url === 'https://optimapdf.com/' && Math.abs(link.rect[0]! - 40) < 0.5 && link.rect[1]! < 240 && link.rect[3]! > 240, `a clickable link over its text (${link?.url})`);
  const [out] = await pdfLines(bytes);
  const at = (baseline: number): TruthLine => out!.lines.find((l) => Math.abs(l.baseline - baseline) < 0.6)!;
  const arial = at(100);
  const times = at(140);
  check(/Zażółć gęślą jaźń/.test(arial.text.normalize('NFC')), 'Polish letters are drawn (the font has them)');
  const wantTimes = 'Zażółć gęślą jaźń i jeszcze trochę'.length * 12 * 0.4;
  check(Math.abs((times.right - times.x) - wantTimes) < 1 && times.right - times.x < arial.right - arial.x - 10, `Times text is ${(times.right - times.x).toFixed(1)} pt wide — the width its own family gives it (${wantTimes.toFixed(1)}), not Arial's ${(arial.right - arial.x).toFixed(1)}`);
  // pdf.js reports the advance of the glyphs; with letter spacing the next run would start later.
  const spaced = at(180);
  check(Math.abs(spaced.x - 40) < 0.5 && spaced.right - spaced.x > 40, `scaled and spaced text is drawn (${(spaced.right - spaced.x).toFixed(1)} pt)`);
  check((await renderPlacedPagesToPdf([{ ...page, lines: [{ baseline: 60, segments: [{ x: 40, runs: [{ ...base, text: '日本語のテキスト', font: 'Arial' }] }] }] }])) === null, 'text in a script the font lacks: null (the caller keeps its old path)');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
