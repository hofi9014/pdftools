// End-to-end round trips through the REAL pages with a real 27-page PDF, each output opened with an
// independent reader (pdf.js): protect → unlock (password really required, then really gone, text
// intact), PDF → Word → PDF and PDF → Excel → PDF (the two converters feed each other's input, so a
// loss in either direction shows up), and PDF → images.
import { chromium, type Page } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

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

const open = (bytes: Uint8Array, password?: string) => pdfjsLib.getDocument({
  data: new Uint8Array(bytes), password, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/',
}).promise;
async function text(bytes: Uint8Array, password?: string): Promise<string> {
  const doc = await open(bytes, password);
  let out = '';
  for (let p = 1; p <= doc.numPages; p++) out += ' ' + (await (await doc.getPage(p)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
  return out;
}
const words = (t: string) => t.toLowerCase().normalize('NFC').match(/[\p{L}\p{N}]{4,}/gu) ?? [];
const distinctRecall = (src: string, out: string) => {
  const have = new Set(words(out));
  const need = [...new Set(words(src))];
  return need.filter((w) => have.has(w)).length / need.length;
};

const browser = await chromium.launch({ headless: true });

async function download(page: Page, click: () => Promise<void>) {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 240000 }), click()]);
  return { bytes: new Uint8Array(readFileSync((await d.path())!)), file: d.suggestedFilename() };
}
async function fresh(slug: string, files: Array<{ name: string; mimeType: string; buffer: Buffer | Uint8Array }>) {
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/pl/${slug}`, { waitUntil: 'load' });
  await page.setInputFiles('#fileInput', files.map((f) => ({ name: f.name, mimeType: f.mimeType, buffer: Buffer.from(f.buffer) })));
  return page;
}

const srcText = await text(new Uint8Array(allegro));

console.log('=== protect → unlock ===');
{
  const page = await fresh('protect-pdf', [{ name: 'a.pdf', mimeType: 'application/pdf', buffer: allegro }]);
  const pw = page.locator('input[type="password"]');
  await pw.nth(0).fill('sekret123');
  await pw.nth(1).fill('sekret123');
  const prot = await download(page, () => page.locator('button', { hasText: /Zabezpiecz PDF/ }).last().click());
  await page.close();
  let needsPassword = false;
  try { await open(prot.bytes); } catch (e) { needsPassword = /password/i.test(String((e as Error).name + (e as Error).message)); }
  check(needsPassword, 'the protected PDF cannot be opened without the password');
  check(words(await text(prot.bytes, 'sekret123')).length === words(srcText).length, 'with the password all the text is there');

  const page2 = await fresh('unlock-pdf', [{ name: 'p.pdf', mimeType: 'application/pdf', buffer: prot.bytes }]);
  await page2.locator('input[type="password"]').first().fill('sekret123');
  const unl = await download(page2, () => page2.locator('button', { hasText: /Odblokuj plik PDF/ }).last().click());
  await page2.close();
  const doc = await open(unl.bytes);
  check(doc.numPages === 27, `the unlocked PDF opens without a password, ${doc.numPages} pages`);
  check(words(await text(unl.bytes)).length === words(srcText).length, 'and has all the text');
}

console.log('\n=== PDF → Word → PDF ===');
{
  const p1 = await fresh('pdf-to-word', [{ name: 'a.pdf', mimeType: 'application/pdf', buffer: allegro }]);
  const docx = await download(p1, () => p1.locator('button', { hasText: /Konwertuj do formatu Word/ }).last().click());
  await p1.close();
  const p2 = await fresh('word-to-pdf', [{ name: 'a.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: docx.bytes }]);
  const back = await download(p2, () => p2.locator('button', { hasText: /Konwertuj do formatu PDF/ }).last().click());
  await p2.close();
  const doc = await open(back.bytes);
  const rc = distinctRecall(srcText, await text(back.bytes));
  check(doc.numPages === 27, `the round-tripped PDF has ${doc.numPages} pages (source 27, was 13 before page breaks were read)`);
  check(rc > 0.97, `${(rc * 100).toFixed(1)}% of the distinct source words survive Word and back`);
}

console.log('\n=== PDF → Excel → PDF (schedule) ===');
{
  const p1 = await fresh('pdf-to-excel', [{ name: 's.pdf', mimeType: 'application/pdf', buffer: schedule }]);
  const xlsx = await download(p1, () => p1.locator('button', { hasText: /Konwertuj do formatu Excel/ }).last().click());
  await p1.close();
  const p2 = await fresh('excel-to-pdf', [{ name: 's.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: xlsx.bytes }]);
  const back = await download(p2, () => p2.locator('button', { hasText: /Konwertuj do formatu PDF/ }).last().click());
  await p2.close();
  const doc = await open(back.bytes);
  const src = await text(new Uint8Array(schedule));
  const rc = distinctRecall(src, await text(back.bytes));
  check(doc.numPages >= 3, `the round-tripped PDF has ${doc.numPages} pages`);
  check(rc > 0.95, `${(rc * 100).toFixed(1)}% of the distinct source words survive Excel and back`);
}

console.log('\n=== PDF → images ===');
{
  const page = await fresh('pdf-to-images', [{ name: 'a.pdf', mimeType: 'application/pdf', buffer: allegro }]);
  await page.locator('button', { hasText: /Wyodrębnij obrazy/ }).last().click();
  await page.waitForFunction(() => document.querySelectorAll('img[src^="blob:"], img[src^="data:"]').length >= 1, null, { timeout: 240000 }).catch(() => undefined);
  const shown = await page.evaluate(() => document.querySelectorAll('img[src^="blob:"], img[src^="data:"]').length);
  check(shown >= 1, `the page shows the extracted images (${shown})`);
  await page.close();
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
