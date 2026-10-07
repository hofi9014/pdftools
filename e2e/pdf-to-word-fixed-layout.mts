// PDF -> Word / OpenDocument through the real tool pages, judged by a real word processor.
//
// Reported case: a designed travel offer (react-pdf) converted with /pdf-to-word opened in
// OpenOffice as a page-sized grid of empty cells, text in the wrong font and place, every picture
// gone. The fix is the fixed page layout (lib/pdf/fixedLayout.ts); this script proves it the way
// the user checks it — by opening the result:
//
//   1. the tool pages offer the layout choice, pick the fixed layout for a designed PDF on their
//      own, the flow engine for a plain one, and honour an explicit choice,
//   2. the downloaded .docx and .odt are opened by an installed Apache OpenOffice / LibreOffice,
//      saved as PDF, and compared with the source PDF: same page count, same words on every
//      page, every line within a few points of where the source has it, and the page pictures
//      close to the source pixel for pixel,
//   3. the same file through the flow engine fails that comparison (the reported behaviour),
//   4. a lone "ć" run — which OpenOffice's Word import drops, breaking the paragraph — survives.
//
// E2E_EXTRA_PDF=<path to any PDF> additionally converts that file (automatic layout, .docx and
// .odt), opens both in the office and prints the same comparison — for checking a reported file
// without adding it to the repository.
//
// Needs a running dev or production server (E2E_BASE_URL, default http://localhost:3000). Part 2-4
// need an office installation and are reported as SKIP without one.

import { chromium, type Page } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import JSZip from 'jszip';
import { findOffice, convertToPdf, saveAsOdt, stopOffice } from './helpers/openoffice.mts';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const canvasMod = await import('@napi-rs/canvas');
if (!(globalThis as Record<string, unknown>).DOMMatrix) (globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const outDir = join(ROOT, 'test-output', 'pdf-to-word-fixed-layout');
mkdirSync(outDir, { recursive: true });
const EXTRA = process.env.E2E_EXTRA_PDF;
const fixture = (name: string): Buffer => readFileSync(name === 'extra.pdf' && EXTRA ? EXTRA : name === 'photos.pdf' ? join(outDir, name) : join(ROOT, 'test-real-pdfs', name));

// A page with two raster photos (the brochure's "photos" are vector drawings): each photo must
// come out as a picture of its own, above the page picture, and still be where the PDF has it
// when a word processor draws the document.
const PHOTO_PAGE = { width: 400, height: 500 };
const PHOTOS = [{ x: 40, y: 80, w: 150, h: 100, hue: 200 }, { x: 210, y: 80, w: 150, h: 100, hue: 20 }];
{
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const canvasMod = await import('@napi-rs/canvas');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([PHOTO_PAGE.width, PHOTO_PAGE.height]);
  page.drawRectangle({ x: 20, y: PHOTO_PAGE.height - 200, width: 360, height: 140, color: rgb(0.93, 0.96, 0.97) });
  for (const ph of PHOTOS) {
    const c = canvasMod.createCanvas(300, 200);
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 300, 200);
    grad.addColorStop(0, `hsl(${ph.hue}, 70%, 30%)`);
    grad.addColorStop(1, `hsl(${ph.hue + 40}, 70%, 55%)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 300, 200);
    page.drawImage(await doc.embedJpg(new Uint8Array(c.toBuffer('image/jpeg', 92))), { x: ph.x, y: PHOTO_PAGE.height - ph.y - ph.h, width: ph.w, height: ph.h });
  }
  page.drawText('FOTO1 Tytul strony ze zdjeciami', { x: 40, y: PHOTO_PAGE.height - 50, size: 16, font });
  page.drawText('FOTO2 Opis pod zdjeciami, zwykly tekst.', { x: 40, y: PHOTO_PAGE.height - 230, size: 11, font });
  writeFileSync(join(outDir, 'photos.pdf'), await doc.save());
}

const openPdf = (bytes: Uint8Array) => pdfjsLib.getDocument({
  data: new Uint8Array(bytes),
  standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/',
  cMapUrl: join(ROOT, 'node_modules/pdfjs-dist/cmaps/') + '/',
  cMapPacked: true,
}).promise;

interface Line { text: string; x: number; right: number; baseline: number }
interface PageRead { lines: Line[]; words: string[]; gray: Uint8Array; width: number; height: number }

/** A PDF as a viewer sees it: lines of text with their position, and a small grey picture per page. */
async function readPdf(bytes: Uint8Array): Promise<PageRead[]> {
  const doc = await openPdf(bytes);
  const out: PageRead[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items.filter((i): i is typeof i & { str: string; transform: number[]; width: number } => 'str' in i && i.str.trim().length > 0);
    const rows: Array<{ baseline: number; items: typeof items }> = [];
    for (const it of items) {
      const b = vp.height - it.transform[5]!;
      const row = rows.find((r) => Math.abs(r.baseline - b) < 1.2);
      if (row) row.items.push(it);
      else rows.push({ baseline: b, items: [it] });
    }
    const lines: Line[] = [];
    for (const r of rows) {
      // Text far apart on one baseline (label … value, card … price) is compared piece by piece.
      const sorted = r.items.sort((a, b) => a.transform[4]! - b.transform[4]!);
      let cur: Line | null = null;
      for (const it of sorted) {
        const x = it.transform[4]!;
        if (cur && x - cur.right < 12) { cur.text += (x - cur.right > 1 ? ' ' : '') + it.str; cur.right = x + it.width; }
        else { cur = { text: it.str, x, right: x + it.width, baseline: r.baseline }; lines.push(cur); }
      }
    }
    // 50 dpi grey render for the pixel comparison.
    const scale = 50 / 72;
    const rvp = page.getViewport({ scale });
    const canvas = canvasMod.createCanvas(Math.round(rvp.width), Math.round(rvp.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport: rvp }).promise;
    const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const gray = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0; i < gray.length; i++) gray[i] = Math.round(0.299 * rgba[i * 4]! + 0.587 * rgba[i * 4 + 1]! + 0.114 * rgba[i * 4 + 2]!);
    out.push({ lines, words: items.flatMap((i) => i.str.split(/\s+/)).filter(Boolean), gray, width: canvas.width, height: canvas.height });
  }
  return out;
}

const norm = (s: string): string => s.replace(/\s+/g, '').toLowerCase();
const multiset = (w: string[]): string => [...w].sort().join(' ');

interface Comparison { pagesEqual: boolean; wordsEqual: boolean; lines: number; found: number; worstY: number; worstX: number; offBy5: number; worstRight: number; pixelDiff: number }

/** How far the converted document (as PDF from the office) is from the source PDF. */
function compare(source: PageRead[], got: PageRead[]): Comparison {
  const res: Comparison = { pagesEqual: source.length === got.length, wordsEqual: true, lines: 0, found: 0, worstY: 0, worstX: 0, offBy5: 0, worstRight: 0, pixelDiff: 0 };
  let pixels = 0;
  let diff = 0;
  for (let p = 0; p < source.length; p++) {
    const s = source[p]!;
    const g = got[p];
    if (!g) { res.wordsEqual = false; res.lines += s.lines.length; res.offBy5 += s.lines.length; continue; }
    if (multiset(s.words.map(norm)) !== multiset(g.words.map(norm))) res.wordsEqual = false;
    for (const line of s.lines) {
      res.lines++;
      const key = norm(line.text).slice(0, 16);
      if (key.length < 3) { res.found++; continue; }
      const cands = g.lines.filter((l) => norm(l.text).startsWith(key));
      const best = cands.sort((a, b) => Math.hypot(a.x - line.x, a.baseline - line.baseline) - Math.hypot(b.x - line.x, b.baseline - line.baseline))[0];
      if (!best) { res.offBy5++; continue; }
      res.found++;
      const dy = Math.abs(best.baseline - line.baseline);
      const dx = Math.abs(best.x - line.x);
      res.worstY = Math.max(res.worstY, dy);
      res.worstX = Math.max(res.worstX, dx);
      if (norm(best.text) === norm(line.text)) res.worstRight = Math.max(res.worstRight, Math.abs(best.right - line.right));
      if (dy > 5 || dx > 5) res.offBy5++;
    }
    if (g.width === s.width && g.height === s.height) {
      for (let i = 0; i < s.gray.length; i++) diff += Math.abs(s.gray[i]! - g.gray[i]!);
      pixels += s.gray.length;
    } else {
      diff += 255 * s.gray.length;
      pixels += s.gray.length;
    }
  }
  res.pixelDiff = pixels ? diff / pixels / 255 : 1;
  return res;
}

const browser = await chromium.launch({ headless: true });

async function convert(tool: 'pdf-to-word' | 'pdf-to-openoffice', file: string, mode: 'auto' | 'fixed' | 'flow' | null): Promise<{ bytes: Uint8Array; used: string | null; page: Page }> {
  const page = await browser.newPage();
  await page.route('https://www.googletagmanager.com/**', (r) => r.abort());
  await page.goto(`${BASE_URL}/pl/${tool}`, { waitUntil: 'load' });
  await page.setInputFiles('#fileInput', { name: file, mimeType: 'application/pdf', buffer: fixture(file) });
  if (mode) await page.locator(`[data-layout-mode="${mode}"]`).click();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 180000 }),
    page.locator('button', { hasText: tool === 'pdf-to-word' ? '📝' : '📄' }).last().click(),
  ]);
  const bytes = new Uint8Array(readFileSync((await download.path())!));
  const used = await page.locator('#layout-used').getAttribute('data-layout', { timeout: 15000 }).catch(() => null);
  return { bytes, used, page };
}

// ---------------------------------------------------------------- 1. the tool pages
console.log('=== /pdf-to-word: the layout choice ===');
const auto = await convert('pdf-to-word', 'chrome-brochure.pdf', null);
{
  const modes = await auto.page.locator('[data-layout-mode]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-layout-mode')}:${e.getAttribute('aria-checked')}`));
  check(modes.join(',') === 'auto:true,fixed:false,flow:false', `three choices, "automatic" selected by default (${modes.join(',')})`);
  check(auto.used === 'fixed', `a designed PDF is converted with the fixed layout automatically (${auto.used})`);
  const note = await auto.page.locator('#layout-used').innerText();
  check(/Zachowano wygląd stron/.test(note), `the result says what was done ("${note.slice(0, 60)}…")`);
  const zip = await JSZip.loadAsync(auto.bytes);
  const xml = await zip.file('word/document.xml')!.async('string');
  check((xml.match(/behindDoc="1"/g) ?? []).length === 2, 'the .docx has one page picture per page, behind the text');
  check(/ROW3 Podróż tam:/.test(xml.replace(/<[^>]+>/g, '')) && /CARD2 Długość/.test(xml.replace(/<[^>]+>/g, '')), 'and the text as text');
  writeFileSync(join(outDir, 'brochure-fixed.docx'), auto.bytes);
  await auto.page.close();
}
const flow = await convert('pdf-to-word', 'chrome-brochure.pdf', 'flow');
check(flow.used === 'flow', `choosing "flowing text" uses the flow engine (${flow.used})`);
writeFileSync(join(outDir, 'brochure-flow.docx'), flow.bytes);
await flow.page.close();
const plain = await convert('pdf-to-word', 'Plik_D.pdf', null);
check(plain.used === 'flow', `a plain text PDF goes through the flow engine automatically (${plain.used})`);
await plain.page.close();
const forced = await convert('pdf-to-word', 'Plik_D.pdf', 'fixed');
check(forced.used === 'fixed', `choosing "faithful layout" is honoured for a plain PDF too (${forced.used})`);
await forced.page.close();

console.log('\n=== /pdf-to-openoffice ===');
const odt = await convert('pdf-to-openoffice', 'chrome-brochure.pdf', null);
{
  check(odt.used === 'fixed', `a designed PDF is converted with the fixed layout automatically (${odt.used})`);
  const zip = await JSZip.loadAsync(odt.bytes);
  const content = await zip.file('content.xml')!.async('string');
  check((content.match(/<draw:image /g) ?? []).length === 2 && content.replace(/<[^>]+>/g, '').includes('CARD2 Długość'), 'the .odt has the page pictures and the text');
  const boxes = (content.match(/<draw:text-box/g) ?? []).length;
  check(boxes >= 40 && !content.includes('<table:table'), `the text of the .odt is in text boxes of its own, not in layout tables (${boxes} boxes)`);
  writeFileSync(join(outDir, 'brochure-fixed.odt'), odt.bytes);
  await odt.page.close();
}
console.log('=== photos become pictures of their own ===');
{
  const docx = await convert('pdf-to-word', 'photos.pdf', 'fixed');
  const dz = await JSZip.loadAsync(docx.bytes);
  const anchors = ((await dz.file('word/document.xml')!.async('string')).match(/<wp:anchor /g) ?? []).length;
  check(anchors === 3, `the .docx anchors the page picture and both photos separately (${anchors} pictures)`);
  writeFileSync(join(outDir, 'photos.docx'), docx.bytes);
  await docx.page.close();
  const odt = await convert('pdf-to-openoffice', 'photos.pdf', 'fixed');
  const frames = ((await (await JSZip.loadAsync(odt.bytes)).file('content.xml')!.async('string')).match(/<draw:image /g) ?? []).length;
  check(frames === 3, `the .odt has three picture frames (${frames})`);
  writeFileSync(join(outDir, 'photos.odt'), odt.bytes);
  await odt.page.close();
}
if (EXTRA) {
  for (const tool of ['pdf-to-word', 'pdf-to-openoffice'] as const) {
    const res = await convert(tool, 'extra.pdf', null);
    writeFileSync(join(outDir, tool === 'pdf-to-word' ? 'extra.docx' : 'extra.odt'), res.bytes);
    console.log(`  extra file through /${tool}: layout "${res.used}", ${res.bytes.length} bytes`);
    await res.page.close();
  }
}
await browser.close();

// ---------------------------------------------------------------- 2-4. a real word processor
const office = findOffice();
if (!office) {
  console.log('\n  SKIP no Apache OpenOffice / LibreOffice installation found — the documents were not opened in a word processor');
} else {
  console.log(`\n=== opened in ${office.name} and compared with the source PDF ===`);
  const pdfOf = (name: string): string => join(outDir, name.replace(/\.(docx|odt)$/, '-$1.pdf'));
  await convertToPdf(office, ['brochure-fixed.docx', 'brochure-fixed.odt', 'brochure-flow.docx'].map((n) => [join(outDir, n), pdfOf(n)] as [string, string]));
  const source = await readPdf(fixture('chrome-brochure.pdf'));
  const report = (c: Comparison): string => `${c.found}/${c.lines} lines found, worst baseline ${c.worstY.toFixed(1)} pt, worst left edge ${c.worstX.toFixed(1)} pt, ${c.offBy5} off by more than 5 pt, pixel difference ${(c.pixelDiff * 100).toFixed(1)}%`;

  // Text on a coloured ground (white on the price badge, white on the footer band): whatever
  // carries the text must be see-through. Text frames of the .odt were not at first — a frame
  // with "no fill" painted the page's white over the picture under it, and a frame imported as
  // a drawing shape had a light-blue fill — while every line was exactly in place. Measured
  // inside the two areas of page 1 (points from the page's top-left corner).
  const GROUNDS = [{ name: 'price badge', x: 425, y: 192, w: 165, h: 78 }, { name: 'footer band', x: 0, y: 796, w: 595, h: 44 }];
  const groundDiff = (a: PageRead, b: PageRead, box: { x: number; y: number; w: number; h: number }): number => {
    if (a.width !== b.width || a.height !== b.height) return 1;
    const k = a.width / 595.28;
    let sum = 0;
    let n = 0;
    for (let y = Math.ceil(box.y * k); y < Math.min(a.height, Math.floor((box.y + box.h) * k)); y++) {
      for (let x = Math.ceil(box.x * k); x < Math.min(a.width, Math.floor((box.x + box.w) * k)); x++) { sum += Math.abs(a.gray[y * a.width + x]! - b.gray[y * a.width + x]!); n++; }
    }
    return sum / Math.max(1, n) / 255;
  };

  for (const name of ['brochure-fixed.docx', 'brochure-fixed.odt']) {
    const opened = await readPdf(readFileSync(pdfOf(name)));
    const c = compare(source, opened);
    console.log(`  ${name}: ${report(c)}`);
    check(c.pagesEqual, `${name}: the same number of pages as the PDF`);
    check(c.wordsEqual, `${name}: the same words on every page`);
    check(c.found === c.lines && c.offBy5 === 0, `${name}: every line is within 5 pt of its place`);
    check(c.worstY <= 2.5 && c.worstX <= 2.5, `${name}: in fact within 2.5 pt (baseline ${c.worstY.toFixed(2)}, left ${c.worstX.toFixed(2)})`);
    check(c.worstRight <= 4, `${name}: lines end where they ended (${c.worstRight.toFixed(2)} pt) — the text is fitted to its width in a different font`);
    check(c.pixelDiff < 0.05, `${name}: the page looks like the PDF (${(c.pixelDiff * 100).toFixed(2)}% grey difference at 50 dpi; the flow engine: about 15%)`);
    const grounds = GROUNDS.map((g) => ({ name: g.name, diff: opened[0] ? groundDiff(source[0]!, opened[0], g) : 1 }));
    // A white or light-blue box over the text there differs by 20 % and more.
    check(grounds.every((g) => g.diff < 0.08), `${name}: text on a coloured ground is not boxed in (${grounds.map((g) => `${g.name} ${(g.diff * 100).toFixed(1)} %`).join(', ')})`);
  }

  // What happens to the file once it has been through the word processor's own "Save": the
  // office rewrites every style (centimetres, its own names, a paragraph's single format moved
  // from the span up to the paragraph). The result must still be read as a positioned document
  // by /openoffice-to-pdf — a 34 pt title came back 5 pt low before the reader inherited a
  // paragraph's own text format.
  console.log(`\n=== saved again by ${office.name} as .odt, then back to PDF on this site ===`);
  {
    const resaved: Array<[string, string]> = [['brochure-fixed.docx', 'brochure-docx-resaved.odt'], ['brochure-fixed.odt', 'brochure-odt-resaved.odt']];
    await saveAsOdt(office, resaved.map(([from, to]) => [join(outDir, from), join(outDir, to)] as [string, string]));
    const b2 = await chromium.launch({ headless: true });
    for (const [from, to] of resaved) {
      const page = await b2.newPage();
      await page.goto(`${BASE_URL}/pl/openoffice-to-pdf`, { waitUntil: 'load' });
      await page.setInputFiles('#fileInput', { name: to, mimeType: 'application/vnd.oasis.opendocument.text', buffer: readFileSync(join(outDir, to)) });
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 120000 }),
        page.locator('button', { hasText: /Konwertuj do PDF/ }).last().click(),
      ]);
      const c = compare(source, await readPdf(readFileSync((await download.path())!)));
      await page.close();
      console.log(`  ${from} -> ${to} -> PDF: ${report(c)}`);
      check(c.pagesEqual && c.wordsEqual, `${to}: the same pages and words as the source PDF`);
      check(c.found === c.lines && c.worstY <= 1.5 && c.worstX <= 1, `${to}: every line where the source has it (baseline ${c.worstY.toFixed(2)} pt, left ${c.worstX.toFixed(2)} pt)`);
    }
    await b2.close();
  }

  // Photos as separate pictures: a word processor must draw them ABOVE the page picture (which
  // no longer contains them) and at their place. Measured inside each photo's box.
  console.log(`\n=== photos, opened in ${office.name} ===`);
  {
    const photoSource = (await readPdf(fixture('photos.pdf')))[0]!;
    const inBox = (a: PageRead, b: PageRead, box: { x: number; y: number; w: number; h: number }): number => {
      if (a.width !== b.width || a.height !== b.height) return 1;
      const k = a.width / PHOTO_PAGE.width;
      let sum = 0;
      let n = 0;
      for (let y = Math.ceil(box.y * k); y < Math.floor((box.y + box.h) * k); y++) {
        for (let x = Math.ceil(box.x * k); x < Math.floor((box.x + box.w) * k); x++) { sum += Math.abs(a.gray[y * a.width + x]! - b.gray[y * a.width + x]!); n++; }
      }
      return sum / Math.max(1, n) / 255;
    };
    await saveAsOdt(office, [[join(outDir, 'photos.docx'), join(outDir, 'photos-resaved.odt')]]);
    await convertToPdf(office, ['photos.docx', 'photos.odt'].map((n) => [join(outDir, n), pdfOf(n)] as [string, string]));
    const results: Array<[string, PageRead[]]> = [];
    for (const name of ['photos.docx', 'photos.odt']) results.push([name, await readPdf(readFileSync(pdfOf(name)))]);
    // ...and the document saved again by the office, back to PDF through this site.
    const b3 = await chromium.launch({ headless: true });
    const page = await b3.newPage();
    await page.goto(`${BASE_URL}/pl/openoffice-to-pdf`, { waitUntil: 'load' });
    await page.setInputFiles('#fileInput', { name: 'photos-resaved.odt', mimeType: 'application/vnd.oasis.opendocument.text', buffer: readFileSync(join(outDir, 'photos-resaved.odt')) });
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.locator('button', { hasText: /Konwertuj do PDF/ }).last().click()]);
    results.push(['photos.docx saved again as .odt, back to PDF here', await readPdf(readFileSync((await download.path())!))]);
    await b3.close();
    for (const [name, pages] of results) {
      const got = pages[0];
      const c = compare([photoSource], pages);
      const worst = got ? Math.max(...PHOTOS.map((ph) => inBox(photoSource, got, ph))) : 1;
      check(c.pagesEqual && c.wordsEqual && c.found === c.lines, `${name}: one page, the same words, every line found`);
      // A photo hidden under the page picture, or moved, would differ by 20 % and more here.
      check(worst < 0.04, `${name}: both photos are where the PDF has them (${(worst * 100).toFixed(1)} % grey difference inside their boxes)`);
    }
  }

  console.log('\n=== the same PDF through the flow engine (the reported behaviour) ===');
  {
    const c = compare(source, await readPdf(readFileSync(pdfOf('brochure-flow.docx'))));
    console.log(`  brochure-flow.docx: ${report(c)}`);
    check(c.offBy5 > c.lines * 0.25 || !c.pagesEqual, `the flow engine cannot hold this page: ${c.offBy5} of ${c.lines} lines are misplaced or missing${c.pagesEqual ? '' : ', and the page count differs'}`);
    check(c.pixelDiff > 0.08, `and it does not look like the PDF (${(c.pixelDiff * 100).toFixed(1)}% grey difference)`);
  }

  console.log('\n=== a lone "ć" run survives the word processor ===');
  {
    (globalThis as Record<string, unknown>).DOMParser = (await import('@xmldom/xmldom')).DOMParser;
    const { renderIRToDocx } = await import('../lib/client-pdf-docx.ts');
    const r = (text: string, x: number) => ({ text, fontName: 'Arial', fontSize: 12, width: text.length * 6, height: 12, position: { x, y: 700 }, color: '#000000', bold: false, italic: false, rotation: 0 });
    // The way a glyph-by-glyph PDF arrives: "ć" is a run of its own.
    const runs = [r('Trzeba to zrobi', 72), r('ć', 162), r(' dzisiaj, a nie odkłada', 168), r('ć', 306), r('.', 312)];
    const blob = await renderIRToDocx([{ width: 595, height: 842, blocks: [{ kind: 'paragraph', runs, bounds: { x: 72, y: 690, width: 250, height: 14 } }] }]);
    const path = join(outDir, 'lone-c.docx');
    writeFileSync(path, new Uint8Array(await blob.arrayBuffer()));
    const xml = await (await JSZip.loadAsync(readFileSync(path))).file('word/document.xml')!.async('string');
    check(!/<w:t xml:space="preserve">ć<\/w:t>/.test(xml), 'no run of the written file is a lone "ć"');
    await convertToPdf(office, [[path, pdfOf('lone-c.docx')]]);
    const read = await readPdf(readFileSync(pdfOf('lone-c.docx')));
    const text = read[0]!.lines.map((l) => l.text).join(' | ');
    check(read[0]!.lines.length === 1 && /zrobić dzisiaj, a nie odkładać\./.test(text), `one line, both letters present: "${text}"`);
  }
  if (EXTRA) {
    console.log('');
    console.log('=== the extra file, opened in the office ===');
    await convertToPdf(office, ['extra.docx', 'extra.odt'].map((n) => [join(outDir, n), pdfOf(n)] as [string, string]));
    const src = await readPdf(readFileSync(EXTRA));
    for (const name of ['extra.docx', 'extra.odt']) {
      const c = compare(src, await readPdf(readFileSync(pdfOf(name))));
      console.log(`  ${name}: pages ${c.pagesEqual ? 'equal' : 'DIFFER'}, words ${c.wordsEqual ? 'equal' : 'DIFFER'}, ${report(c)}, worst line end ${c.worstRight.toFixed(1)} pt`);
    }
  }
  await stopOffice(office);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
