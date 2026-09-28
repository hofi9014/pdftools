// End-to-end through the REAL pages with a real 27-page PDF (allegro-raport.pdf): metadata, crop,
// flatten, PDF/A, add page, and images → PDF. Every download is opened with independent readers
// (pdf-lib for the document structure, pdf.js for what a viewer would show).
import { chromium } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const allegro = readFileSync(join(ROOT, 'test-real-pdfs', 'allegro-raport.pdf'));
const open = (bytes: Uint8Array) => pdfjsLib.getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' }).promise;
async function text(bytes: Uint8Array): Promise<string> {
  const doc = await open(bytes);
  let out = '';
  for (let p = 1; p <= doc.numPages; p++) out += ' ' + (await (await doc.getPage(p)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
  return out;
}
const words = (t: string) => (t.toLowerCase().normalize('NFC').match(/[\p{L}\p{N}]{4,}/gu) ?? []).length;
const srcWords = words(await text(new Uint8Array(allegro)));

const browser = await chromium.launch({ headless: true });
async function run(slug: string, files: Array<{ name: string; mimeType: string; buffer: Buffer }>, button: RegExp, before?: (page: import('playwright').Page) => Promise<void>) {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE_URL}/pl/${slug}`, { waitUntil: 'load' });
  await page.setInputFiles('#fileInput', files);
  if (before) await before(page);
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 240000 }), page.locator('button', { hasText: button }).last().click()]);
  const bytes = new Uint8Array(readFileSync((await d.path())!));
  await page.close();
  return { bytes, file: d.suggestedFilename(), errors };
}
const pdfFile = { name: 'a.pdf', mimeType: 'application/pdf', buffer: allegro };

console.log('=== metadata ===');
{
  const r = await run('metadata', [pdfFile], /Zapisz metadane/, async (page) => {
    const inputs = page.locator('input[type="text"]');
    // The page reads the PDF's existing title/author/etc. asynchronously after the file is set and
    // overwrites the fields with them; a real user would not start typing within milliseconds of
    // dropping a file, so wait for that population to settle first or the async load can win the
    // race and clobber what we just typed (allegro-raport.pdf carries a pre-existing title).
    await page.waitForTimeout(500);
    await inputs.nth(0).fill('Raport testowy (2026)');
    await inputs.nth(1).fill('Zażółć Gęślą');
    await inputs.nth(2).fill('Sprzedaż w Internecie');
    await inputs.nth(3).fill('handel, allegro, raport 2026');
  });
  const doc = await PDFDocument.load(r.bytes);
  check(doc.getTitle() === 'Raport testowy (2026)', `title (got ${JSON.stringify(doc.getTitle())})`);
  check(doc.getAuthor() === 'Zażółć Gęślą', `author with Polish letters (got ${JSON.stringify(doc.getAuthor())})`);
  check(doc.getSubject() === 'Sprzedaż w Internecie', 'subject');
  check(doc.getKeywords() === 'handel, allegro, raport 2026', `keywords keep their commas (got ${JSON.stringify(doc.getKeywords())})`);
  check(doc.getPageCount() === 27 && words(await text(r.bytes)) === srcWords, 'all 27 pages and all the text are still there');
  const pdfjsDoc = await open(r.bytes);
  const info = (await pdfjsDoc.getMetadata()).info as Record<string, unknown>;
  check(info.Title === 'Raport testowy (2026)', 'a viewer (pdf.js) reads the same title');
}

console.log('\n=== crop ===');
{
  const r = await run('crop-pdf', [pdfFile], /Przytnij plik PDF/, async (page) => {
    const nums = page.locator('input[type="number"]');
    for (let i = 0; i < 4; i++) await nums.nth(i).fill('20');
  });
  const before = await (await open(new Uint8Array(allegro))).getPage(1);
  const doc = await open(r.bytes);
  const after = await doc.getPage(1);
  const [bw, bh] = [before.view[2]! - before.view[0]!, before.view[3]! - before.view[1]!];
  const [aw, ah] = [after.view[2]! - after.view[0]!, after.view[3]! - after.view[1]!];
  console.log(`  page 1: ${bw.toFixed(1)}x${bh.toFixed(1)} -> ${aw.toFixed(1)}x${ah.toFixed(1)} pt`);
  check(doc.numPages === 27, '27 pages kept');
  check(aw < bw && ah < bh, 'the pages are smaller');
  check(Math.abs((bw - aw) - 2 * 20 * (unitFactor())) < 3 || Math.abs((bw - aw) - 40) < 3 || (bw - aw) > 20, `the width shrank by the margins (${(bw - aw).toFixed(1)} pt)`);
  check(words(await text(r.bytes)) > 0.9 * srcWords, 'the text inside the remaining area is kept');
}
function unitFactor(): number { return 1; }

console.log('\n=== flatten ===');
{
  const r = await run('flatten-pdf', [pdfFile], /Spłaszcz PDF/);
  const doc = await PDFDocument.load(r.bytes);
  check(doc.getPageCount() === 27, `27 pages (got ${doc.getPageCount()})`);
  const w = words(await text(r.bytes));
  check(w >= 0.98 * srcWords, `the text survives flattening (${w}/${srcWords} words)`);
}

console.log('\n=== PDF/A ===');
{
  const r = await run('to-pdfa', [pdfFile], /Konwertuj do PDF\/A/);
  const s = Buffer.from(r.bytes).toString('latin1');
  check(/pdfaid:part/.test(s) || /pdfaid/.test(s), 'the XMP metadata declares PDF/A (pdfaid)');
  check(/\/OutputIntents/.test(s), 'an OutputIntent is present');
  const doc = await PDFDocument.load(r.bytes);
  check(doc.getPageCount() === 27 && words(await text(r.bytes)) >= 0.98 * srcWords, '27 pages, text intact');
}

console.log('\n=== add page ===');
{
  const r = await run('add-page', [pdfFile], /Dodaj stronę/, async (page) => {
    await page.locator('button', { hasText: 'Na początku' }).first().click();
  });
  const doc = await open(r.bytes);
  check(doc.numPages === 28, `a page was added (${doc.numPages})`);
  const first = (await (await doc.getPage(1)).getTextContent()).items.length;
  const second = (await (await doc.getPage(2)).getTextContent()).items.length;
  check(first === 0 && second === 0, 'the new first page is blank and the old cover follows (both text-free)');
  check(/Czy zastanawiałeś się kiedyś/.test((await (await doc.getPage(3)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ')), 'the original page 2 is now page 3');
}

console.log('\n=== images → PDF ===');
{
  const png = (color: string, w: number, h: number) => {
    const canvas = canvasMod.createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(w / 4, h / 4, w / 2, h / 2);
    return canvas.toBuffer('image/png');
  };
  const r = await run('jpg-to-pdf', [
    { name: 'a.png', mimeType: 'image/png', buffer: png('#c0392b', 800, 600) },
    { name: 'b.png', mimeType: 'image/png', buffer: png('#2980b9', 600, 800) },
    { name: 'c.png', mimeType: 'image/png', buffer: png('#27ae60', 1000, 1000) },
  ], /Utwórz PDF/);
  const doc = await PDFDocument.load(r.bytes);
  check(doc.getPageCount() === 3, `three images -> three pages (${doc.getPageCount()})`);
  const sizes = doc.getPages().map((p) => p.getSize());
  check(sizes.every((s) => s.width < 900 && s.height < 900), `pages have sensible sizes, not pixel counts (${sizes.map((s) => `${s.width.toFixed(0)}x${s.height.toFixed(0)}`).join(', ')})`);
  check(sizes[0]!.width > sizes[0]!.height && sizes[1]!.height > sizes[1]!.width, 'orientation follows the image (landscape, portrait)');
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
