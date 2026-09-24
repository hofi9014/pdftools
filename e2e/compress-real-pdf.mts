// End-to-end through the REAL /compress page on a real PDF with large JPEG images
// (test-real-pdfs/allegro-raport.pdf, 27 pages). In Node the image recompression is skipped
// (no createImageBitmap/canvas), so the three levels can only be compared in a real browser.
// Checks: each level downloads a PDF that opens in pdf.js with all pages and the full text, the
// stronger levels are not larger than the weaker ones, and the download is smaller than the source.
import { chromium } from 'playwright';
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

async function inspect(bytes: Uint8Array): Promise<{ pages: number; chars: number }> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(bytes),
    standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/',
  }).promise;
  let chars = 0;
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    chars += tc.items.map((i) => ('str' in i ? i.str : '')).join('').replace(/\s+/g, '').length;
  }
  return { pages: doc.numPages, chars };
}

const source = readFileSync(join(ROOT, 'test-real-pdfs', 'allegro-raport.pdf'));
const original = await inspect(new Uint8Array(source));
const browser = await chromium.launch({ headless: true });
const sizes: Record<string, number> = {};

for (const [level, label] of [['low', 'Niski'], ['recommended', 'Polecane'], ['extreme', 'Ekstremalne']] as const) {
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/pl/compress`, { waitUntil: 'load' });
  await page.setInputFiles('#fileInput', { name: 'allegro-raport.pdf', mimeType: 'application/pdf', buffer: source });
  await page.locator('button', { hasText: label }).first().click();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }),
    page.locator('button', { hasText: /Kompresja plików PDF/i }).last().click(),
  ]);
  const path = await download.path();
  const bytes = new Uint8Array(readFileSync(path!));
  sizes[level] = bytes.length;
  const got = await inspect(bytes);
  console.log(`  ${level}: ${(source.length / 1024).toFixed(0)}KB -> ${(bytes.length / 1024).toFixed(0)}KB`);
  check(got.pages === original.pages, `${level}: all ${original.pages} pages survive (got ${got.pages})`);
  check(got.chars === original.chars, `${level}: the full text survives (${got.chars}/${original.chars} chars)`);
  await page.close();
}

check(sizes.low! < source.length, 'even the lowest level is smaller than the source');
check(sizes.recommended! <= sizes.low! && sizes.extreme! <= sizes.recommended!, `stronger levels are not larger (low ${sizes.low}, recommended ${sizes.recommended}, extreme ${sizes.extreme})`);
check(sizes.extreme! < 0.7 * source.length, `the extreme level shrinks this image-heavy PDF by more than 30% (${((sizes.extreme! / source.length) * 100).toFixed(0)}% of the source)`);

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
