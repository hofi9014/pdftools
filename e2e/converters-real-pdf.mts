// End-to-end through the REAL converter pages with real PDFs. Each download is opened with an
// independent reader (zip + XML) and checked for what the converter promises, using word recall
// against pdf.js's own text extraction as the measure of "no text lost":
// PDF→TXT / HTML / EPUB / ODT / Word on allegro-raport.pdf (27 pages, images, ligatures), PDF→PPTX
// (one slide per page, text present), PDF→SVG (one svg per page), PDF→Excel on the schedule PDF
// (3 sheets, dense grid).
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
const schedule = readFileSync(join(ROOT, 'test-fixtures', 'xlsx_EPZ_SIERPIEN_2026.pdf'));

async function sourceText(bytes: Uint8Array): Promise<string> {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' }).promise;
  let out = '';
  for (let p = 1; p <= doc.numPages; p++) out += ' ' + (await (await doc.getPage(p)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
  return out;
}
const words = (t: string) => t.toLowerCase().normalize('NFC').match(/[\p{L}\p{N}]{4,}/gu) ?? [];
function recall(src: string, out: string): number {
  const have = new Map<string, number>();
  for (const w of words(out)) have.set(w, (have.get(w) ?? 0) + 1);
  const need = words(src);
  let hit = 0;
  for (const w of need) { const n = have.get(w) ?? 0; if (n > 0) { hit++; have.set(w, n - 1); } }
  return hit / need.length;
}
// Tabs and line breaks inside a paragraph are white space too (the faithful layout uses both).
const strip = (xml: string) => xml.replace(/<\/(w:p|text:p|a:p|p|div|h\d|li|si)>|<(w:tab|w:br|text:tab|text:line-break|text:s)[^>]*\/>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const browser = await chromium.launch({ headless: true });

async function convert(slug: string, buffer: Buffer, button: RegExp, name = 'a.pdf') {
  const page: Page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE_URL}/pl/${slug}`, { waitUntil: 'load' });
  await page.setInputFiles('#fileInput', { name, mimeType: 'application/pdf', buffer });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 240000 }),
    page.locator('button', { hasText: button }).last().click(),
  ]);
  const bytes = new Uint8Array(readFileSync((await download.path())!));
  const file = download.suggestedFilename();
  await page.close();
  return { bytes, file, errors };
}

const src = await sourceText(new Uint8Array(allegro));

console.log('=== PDF → TXT ===');
{
  const r = await convert('pdf-to-txt', allegro, /Wyodrębnij tekst/);
  const text = new TextDecoder().decode(r.bytes);
  check(r.file.endsWith('.txt'), `downloads a .txt (${r.file})`);
  const rc = recall(src, text);
  check(rc > 0.995, `${(rc * 100).toFixed(1)}% of the source words`);
  check(!/[ﬀ-ﬆ]/.test(text), 'no ligature characters');
}

console.log('\n=== PDF → HTML ===');
{
  const r = await convert('pdf-to-html', allegro, /Konwertuj do HTML/);
  const html = new TextDecoder().decode(r.bytes);
  check(/<html/i.test(html), `an HTML document (${r.file})`);
  const rc = recall(src, strip(html));
  check(rc > 0.995, `${(rc * 100).toFixed(1)}% of the source words`);
}

console.log('\n=== PDF → EPUB ===');
{
  const r = await convert('pdf-to-epub', allegro, /Konwertuj do formatu EPUB/);
  const zip = await JSZip.loadAsync(r.bytes);
  check(!!zip.file('META-INF/container.xml'), `a valid EPUB container (${r.file})`);
  let text = '';
  for (const n of Object.keys(zip.files)) if (/\.x?html$/.test(n)) text += ' ' + strip(await zip.file(n)!.async('string'));
  const rc = recall(src, text);
  check(rc > 0.995, `${(rc * 100).toFixed(1)}% of the source words`);
}

console.log('\n=== PDF → ODT ===');
{
  const r = await convert('pdf-to-openoffice', allegro, /Konwertuj do ODT/);
  const zip = await JSZip.loadAsync(r.bytes);
  const content = await zip.file('content.xml')?.async('string');
  check(!!content, `a valid ODT (${r.file})`);
  const rc = recall(src, strip(content ?? ''));
  // This report is converted with the faithful layout (chosen automatically). It draws its
  // footer twice on six pages, "… @ 2020" over "… @ 2019"; the copy printed over the other
  // stays in the page picture, so those twelve words (0.8%) are deliberately not text.
  check(rc > 0.99, `${(rc * 100).toFixed(1)}% of the source words`);
  check(Object.keys(zip.files).filter((n) => n.startsWith('Pictures/')).length >= 3, 'the page pictures are embedded');
}

console.log('\n=== PDF → PowerPoint ===');
{
  const r = await convert('pdf-to-powerpoint', allegro, /Konwertuj do PowerPoint/);
  const zip = await JSZip.loadAsync(r.bytes);
  const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  check(slides.length === 27, `one slide per page (${slides.length})`);
  let text = '';
  for (const n of slides) text += ' ' + strip(await zip.file(n)!.async('string'));
  const rc = recall(src, text);
  check(rc > 0.99, `${(rc * 100).toFixed(1)}% of the source words`);
}

console.log('\n=== PDF → SVG ===');
{
  const r = await convert('pdf-to-svg', allegro, /Konwertuj do formatu SVG/);
  let svgs = 0;
  if (r.file.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(r.bytes);
    svgs = Object.keys(zip.files).filter((n) => n.endsWith('.svg')).length;
  } else {
    svgs = /<svg/.test(new TextDecoder().decode(r.bytes)) ? 1 : 0;
  }
  check(svgs >= 1, `SVG output (${r.file}, ${svgs} svg file(s))`);
}

console.log('\n=== PDF → Excel (schedule PDF, 3 sheets) ===');
{
  const r = await convert('pdf-to-excel', schedule, /Konwertuj do formatu Excel/, 'schedule.pdf');
  const zip = await JSZip.loadAsync(r.bytes);
  const sheets = Object.keys(zip.files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  check(sheets.length === 3, `three sheets (${sheets.length}) in ${r.file}`);
  const shared = (await zip.file('xl/sharedStrings.xml')?.async('string')) ?? '';
  const sst = strip(shared);
  // xlsx stores every distinct string once (sharedStrings), so compare DISTINCT words, not occurrences
  const have = new Set(words(sst));
  const need = [...new Set(words(await sourceText(new Uint8Array(schedule))))].filter((w) => !/^arkusz\d$/.test(w)); // sheet names live in workbook.xml
  const rc = need.filter((w) => have.has(w)).length / need.length;
  check(rc === 1,`${(rc * 100).toFixed(1)}% of the distinct source words are in the cells (${need.length} words)`);
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
