// End-to-end through the REAL tool pages with a REAL 27-page PDF (allegro-raport.pdf, images + text)
// instead of the tiny synthetic PDFs the unit tests use. Each tool's actual download is opened with
// an independent implementation (pdf.js / a zip reader) and checked for what the tool promises:
// merge (page count), split (one PDF per page), rotate (every page rotated), watermark (text on
// every page), page numbers (a number on the last page), PDF→Word (a valid .docx with the text).
import { chromium, type Page } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const allegro = readFileSync(join(ROOT, 'test-real-pdfs', 'allegro-raport.pdf'));
const chrome = readFileSync(join(ROOT, 'test-real-pdfs', 'chrome-report.pdf'));
const SRC_PAGES = 27;

async function open(bytes: Uint8Array) {
  return pdfjsLib.getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' }).promise;
}
async function pageTexts(bytes: Uint8Array): Promise<string[]> {
  const doc = await open(bytes);
  const out: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) out.push((await (await doc.getPage(p)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' '));
  return out;
}

const browser = await chromium.launch({ headless: true });

async function run(slug: string, files: Array<{ name: string; buffer: Buffer }>, button: RegExp, before?: (page: Page) => Promise<void>) {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE_URL}/pl/${slug}`, { waitUntil: 'load' });
  await page.setInputFiles('#fileInput', files.map((f) => ({ name: f.name, mimeType: 'application/pdf', buffer: f.buffer })));
  if (before) await before(page);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 180000 }),
    page.locator('button', { hasText: button }).last().click(),
  ]);
  const bytes = new Uint8Array(readFileSync((await download.path())!));
  const name = download.suggestedFilename();
  await page.close();
  return { bytes, name, errors };
}

console.log('=== merge (allegro-raport + chrome-report) ===');
{
  const r = await run('merge', [{ name: 'a.pdf', buffer: allegro }, { name: 'b.pdf', buffer: chrome }], /Połącz PDF/);
  const doc = await open(r.bytes);
  check(doc.numPages === SRC_PAGES + 1, `merged PDF has ${SRC_PAGES + 1} pages (got ${doc.numPages})`);
  const texts = await pageTexts(r.bytes);
  check(/Kwartalny raport/.test(texts[SRC_PAGES] ?? ''), 'the second file is the last page, in order');
  check(r.errors.length === 0, `no page errors (${r.errors.join('; ')})`);
}

console.log('\n=== rotate ===');
{
  const r = await run('rotate-pdf', [{ name: 'a.pdf', buffer: allegro }], /Obróć plik PDF/);
  const doc = await open(r.bytes);
  let rotated = 0;
  for (let p = 1; p <= doc.numPages; p++) if (((await doc.getPage(p)).rotate % 360) !== 0) rotated++;
  check(doc.numPages === SRC_PAGES, `all ${SRC_PAGES} pages kept (got ${doc.numPages})`);
  check(rotated === SRC_PAGES, `every page is rotated (${rotated}/${SRC_PAGES})`);
}

console.log('\n=== watermark ===');
{
  const r = await run('watermark-pdf', [{ name: 'a.pdf', buffer: allegro }], /Dodaj znak wodny/, async (page) => {
    await page.locator('input[type="text"]').first().fill('POUFNE');
  });
  const texts = await pageTexts(r.bytes);
  check(texts.length === SRC_PAGES, `all ${SRC_PAGES} pages kept`);
  check(texts.every((t) => t.includes('POUFNE')), `the watermark text is on every page (${texts.filter((t) => t.includes('POUFNE')).length}/${SRC_PAGES})`);
  check(/Czy zastanawiałeś się kiedyś/.test(texts[1] ?? ''), 'the original text is still there');
}

console.log('\n=== page numbers ===');
{
  const r = await run('page-numbers', [{ name: 'a.pdf', buffer: allegro }], /Dodaj numery stron/);
  const texts = await pageTexts(r.bytes);
  check(texts.length === SRC_PAGES, `all ${SRC_PAGES} pages kept`);
  check(/\b27\b/.test(texts[SRC_PAGES - 1] ?? ''), 'the last page carries the number 27');
  check(/\b2\b/.test(texts[1] ?? ''), 'page 2 carries the number 2');
}

console.log('\n=== split (default mode) ===');
{
  const r = await run('split', [{ name: 'a.pdf', buffer: allegro }], /Podziel plik PDF/);
  const zip = await JSZip.loadAsync(r.bytes);
  const entries = Object.keys(zip.files).filter((n) => n.endsWith('.pdf'));
  check(entries.length === SRC_PAGES, `one PDF per page: ${entries.length} files in ${r.name}`);
  const first = await open(new Uint8Array(await zip.file(entries[0]!)!.async('uint8array')));
  check(first.numPages === 1, 'each file has a single page');
}

console.log('\n=== PDF → Word ===');
{
  const r = await run('pdf-to-word', [{ name: 'a.pdf', buffer: allegro }], /Konwertuj do formatu Word/);
  const zip = await JSZip.loadAsync(r.bytes);
  const xml = await zip.file('word/document.xml')?.async('string');
  check(!!xml, `a valid .docx (${r.name})`);
  // runs inside one paragraph are glued (a colour change mid-word must not split it); paragraphs get a space
  // Tabs and line breaks inside a paragraph are white space too (the faithful layout uses both).
  const text = (xml ?? '').replace(/<\/w:p>|<w:(tab|br)[^>]*\/>/g, ' ').replace(/<[^>]+>/g, '');
  const src = (await pageTexts(new Uint8Array(allegro))).join(' ');
  const words = (t: string) => t.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  const have = new Set(words(text));
  const srcWords = words(src);
  const recall = srcWords.filter((w) => have.has(w)).length / srcWords.length;
  check(recall > 0.995,`${(recall * 100).toFixed(1)}% of the source words are in the document`);
  check(!/Obr.cony tekst/.test(text), 'no "[Obrócony tekst]" placeholders');
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
