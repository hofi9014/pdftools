// End-to-end through the REAL /ocr-pdf page on "scans": pages of real PDFs rasterised to JPEG at
// scanner resolution and wrapped in an image-only PDF (no text layer at all), so the only way any
// text can come out is real recognition by Tesseract in a real browser.
//
// What the tool promised and did not deliver before the fix (all measured with this script):
//   1. a searchable PDF — tesseract.js (v6+) returns only `text` unless `blocks` is requested, so
//      the word list was always empty and the downloaded "OCR" PDF had NO text layer (0%);
//   2. readable small print — every page was rendered at a fixed 144 DPI: a 4.5 pt schedule
//      table came out as garbage (3-5% of its words);
//   3. 33 languages — only pol and eng were ever provisioned; the other 31 returned 404 and
//      the tool spun forever on them, because tesseract.js swallows a failed language download;
//   4. a text layer on rotated scans — word boxes were written in raw page space, ignoring the
//      page's /Rotate.
//
// Ground truth is the source PDFs' own text (pdf.js getTextContent), read independently of the
// tool. Needs a running server (E2E_BASE_URL, default http://localhost:3000).
import { chromium, type Page } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PDFDocument, degrees } from 'pdf-lib';

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

const words = (s: string): string[] =>
  s.toLowerCase().normalize('NFC').split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);

/** Share of the truth's words (as a multiset) that the recognised text contains. */
function wordRecall(truth: string, got: string): number {
  const have = new Map<string, number>();
  for (const w of words(got)) have.set(w, (have.get(w) ?? 0) + 1);
  const t = words(truth);
  let hit = 0;
  for (const w of t) {
    const n = have.get(w) ?? 0;
    if (n > 0) { hit++; have.set(w, n - 1); }
  }
  return t.length ? hit / t.length : 0;
}

const openPdf = (bytes: Uint8Array) => pdfjsLib.getDocument({
  data: new Uint8Array(bytes),
  standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/',
  cMapUrl: join(ROOT, 'node_modules/pdfjs-dist/cmaps/') + '/',
  cMapPacked: true,
}).promise;

/** A line of the source page as a viewer sees it: left edge, width and baseline from the top. */
interface TruthLine { text: string; x: number; w: number; baseline: number }
interface Scan { pdf: Uint8Array; truth: string; lines: TruthLine[][] }

/**
 * Rasterise the given 1-based pages to JPEG and wrap them in an image-only PDF.
 * `rotated`: store the page the way many scanners do — a landscape media box holding the image
 * sideways, plus /Rotate 90 so a viewer shows it upright.
 */
async function makeScan(file: string, pageNumbers: number[], dpi: number, rotated = false): Promise<Scan> {
  const src = await openPdf(new Uint8Array(readFileSync(join(ROOT, 'test-real-pdfs', file))));
  const out = await PDFDocument.create();
  let truth = '';
  const lines: TruthLine[][] = [];
  for (const n of pageNumbers) {
    const page = await src.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: dpi / 72 });
    const canvas = canvasMod.createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;
    const jpg = await out.embedJpg(canvas.toBuffer('image/jpeg', 70));
    if (rotated) {
      const p = out.addPage([base.height, base.width]);
      p.drawImage(jpg, { x: base.height, y: 0, width: base.width, height: base.height, rotate: degrees(90) });
      p.setRotation(degrees(90));
    } else {
      out.addPage([base.width, base.height]).drawImage(jpg, { x: 0, y: 0, width: base.width, height: base.height });
    }

    const tc = await page.getTextContent();
    const items = tc.items.filter((i): i is typeof i & { str: string; transform: number[]; width: number } => 'str' in i);
    truth += items.map((i) => i.str).join(' ') + '\n';
    lines.push(items.filter((i) => i.str.trim()).map((i) => {
      const t = pdfjsLib.Util.transform(base.transform, i.transform) as number[];
      return { text: i.str, x: t[4]!, w: i.width, baseline: t[5]! };
    }));
  }
  return { pdf: await out.save(), truth, lines };
}

async function runOcr(page: Page, scan: Uint8Array, name: string): Promise<{ text: string; pdf: Uint8Array }> {
  await page.goto(`${BASE_URL}/pl/ocr-pdf`, { waitUntil: 'load' });
  await page.setInputFiles('#fileInput', { name, mimeType: 'application/pdf', buffer: Buffer.from(scan) });
  await page.selectOption('#ocr-language', 'pol');
  await page.locator('button', { hasText: 'Uruchom OCR' }).click();
  await page.waitForSelector('#ocr-result', { timeout: 300000 });
  const text = await page.inputValue('#ocr-result');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.locator('button', { hasText: '📄' }).click(),
  ]);
  const path = await download.path();
  return { text, pdf: new Uint8Array(readFileSync(path!)) };
}

const browser = await chromium.launch({ headless: true });
const outDir = join(ROOT, 'test-output', 'ocr-real-scan');
mkdirSync(outDir, { recursive: true });

interface Case { file: string; pages: number[]; dpi: number; minRecall: number; rotated?: boolean; label: string }
const CASES: Case[] = [
  // 13 pt, 11 pt and 9 pt body text.
  { file: 'allegro-raport.pdf', pages: [2, 14], dpi: 200, minRecall: 0.97, label: '13 pt report' },
  { file: 'gpw-ebook.pdf', pages: [5, 6], dpi: 200, minRecall: 0.97, label: '11 pt e-book' },
  { file: 'chrome-article.pdf', pages: [1], dpi: 200, minRecall: 0.97, label: '9 pt article' },
  // Small print: a dense schedule table set in 4.5 pt. Garbage (3-5%) at the old fixed 144 DPI.
  { file: 'epz_pptx_table_fixture.pdf', pages: [1], dpi: 300, minRecall: 0.65, label: '4.5 pt table' },
  // The same e-book pages stored sideways with /Rotate 90, as scanners do.
  { file: 'gpw-ebook.pdf', pages: [5, 6], dpi: 200, minRecall: 0.97, rotated: true, label: '11 pt e-book, /Rotate 90' },
];

for (const c of CASES) {
  console.log(`\n=== ${c.label}: ${c.file} pages ${c.pages.join(', ')} as a ${c.dpi} DPI scan ===`);
  const scan = await makeScan(c.file, c.pages, c.dpi, c.rotated);
  const tag = `${c.file.replace('.pdf', '')}${c.rotated ? '-rot90' : ''}`;
  writeFileSync(join(outDir, `${tag}-scan.pdf`), scan.pdf);
  const scanDoc = await openPdf(scan.pdf);
  let scanItems = 0;
  for (let p = 1; p <= scanDoc.numPages; p++) scanItems += (await (await scanDoc.getPage(p)).getTextContent()).items.length;
  check(scanItems === 0, `sanity: the scan has no text layer (${scanItems} items) — any text must come from recognition`);
  check(words(scan.truth).length > 150, `sanity: the source pages carry real text (${words(scan.truth).length} words)`);

  const page = await browser.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  const t0 = Date.now();
  const result = await runOcr(page, scan.pdf, `${tag}-scan.pdf`);
  const seconds = (Date.now() - t0) / 1000;
  writeFileSync(join(outDir, `${tag}-ocr.pdf`), result.pdf);
  writeFileSync(join(outDir, `${tag}-ocr.txt`), result.text);

  const recall = wordRecall(scan.truth, result.text);
  console.log(`  recognised ${words(result.text).length} words in ${seconds.toFixed(1)} s`);
  check(recall >= c.minRecall, `the recognised text contains ≥${(c.minRecall * 100).toFixed(0)}% of the source words (${(recall * 100).toFixed(1)}%)`);
  check(pageErrors.length === 0, `no page errors (${pageErrors.slice(0, 2).join(' | ')})`);

  // The downloaded PDF must be SEARCHABLE: an invisible text layer over the unchanged scan,
  // with every word where a viewer shows that word.
  const ocrDoc = await openPdf(result.pdf);
  check(ocrDoc.numPages === c.pages.length, `the OCR PDF keeps all pages (${ocrDoc.numPages})`);
  let layerText = '';
  let placed = 0;
  let checked = 0;
  let upright = 0;
  let layerItems = 0;
  for (let p = 1; p <= ocrDoc.numPages; p++) {
    const pg = await ocrDoc.getPage(p);
    const vp = pg.getViewport({ scale: 1 });
    const tc = await pg.getTextContent();
    const items = tc.items.filter((i): i is typeof i & { str: string; transform: number[] } => 'str' in i && i.str.trim().length > 0);
    layerText += items.map((i) => i.str).join(' ') + '\n';
    const truthLines = scan.lines[p - 1]!;
    for (const it of items) {
      const t = pdfjsLib.Util.transform(vp.transform, it.transform) as number[];
      layerItems++;
      // Upright on screen: the glyph x-axis points right (no leftover page rotation).
      if (t[0]! > 0 && Math.abs(t[1]!) < 0.01 * Math.abs(t[0]!)) upright++;
      const w = it.str.trim();
      if (w.length < 5) continue;
      const holders = truthLines.filter((l) => l.text.includes(w));
      if (holders.length !== 1) continue;
      const line = holders[0]!;
      // Where the word should start: its character offset along the line (proportional type,
      // so a tolerance of a tenth of the line plus a few points).
      const expectedX = line.x + line.w * (line.text.indexOf(w) / Math.max(1, line.text.length));
      checked++;
      if (Math.abs(t[4]! - expectedX) <= 0.1 * line.w + 12 && Math.abs(t[5]! - line.baseline) <= 8) placed++;
    }
  }
  const layerRecall = wordRecall(scan.truth, layerText);
  check(layerRecall >= c.minRecall - 0.02, `the PDF's text layer contains ≥${((c.minRecall - 0.02) * 100).toFixed(0)}% of the source words (${(layerRecall * 100).toFixed(1)}%)`);
  check(checked >= 20 && placed / Math.max(1, checked) >= 0.95, `text-layer words sit on the scanned words (${placed}/${checked})`);
  check(layerItems > 0 && upright / Math.max(1, layerItems) >= 0.99, `text-layer words are upright for the viewer (${upright}/${layerItems})`);
  await page.close();
}

console.log('\n=== every offered language has data on the server ===');
{
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/pl/ocr-pdf`, { waitUntil: 'load' });
  const langs = await page.locator('#ocr-language option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
  check(langs.length >= 30 && langs.includes('pol') && langs.includes('eng'), `the page offers languages including pol and eng (${langs.length})`);
  const missing: string[] = [];
  for (const l of langs) {
    const res = await page.request.head(`${BASE_URL}/tesseract/lang-data/${l}.traineddata.gz`);
    if (res.status() !== 200 || (res.headers()['content-type'] ?? '').includes('text/html')) missing.push(`${l}:${res.status()}`);
  }
  check(missing.length === 0, `all ${langs.length} offered languages are downloadable (missing: ${missing.join(', ')})`);
  await page.close();
}

console.log('\n=== a second language really recognises (German data, German text) ===');
{
  const doc = await PDFDocument.create();
  const canvas = canvasMod.createCanvas(1240, 500);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1240, 500);
  ctx.fillStyle = '#000000';
  ctx.font = '34px Arial';
  const german = ['Die Größe der Straße überrascht mich jedes Mal.', 'Über den Flüssen hängen schöne Brücken.', 'Wir müssen heute früh aufstehen.'];
  german.forEach((l, i) => ctx.fillText(l, 60, 110 + i * 90));
  const png = await doc.embedPng(canvas.toBuffer('image/png'));
  doc.addPage([595, 240]).drawImage(png, { x: 0, y: 0, width: 595, height: 240 });
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/pl/ocr-pdf`, { waitUntil: 'load' });
  await page.setInputFiles('#fileInput', { name: 'deutsch.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await doc.save()) });
  await page.selectOption('#ocr-language', 'deu');
  await page.locator('button', { hasText: 'Uruchom OCR' }).click();
  const outcome = await page.waitForSelector('#ocr-result', { timeout: 120000 }).then(() => 'result').catch(() => 'no result');
  const text = outcome === 'result' ? await page.inputValue('#ocr-result') : '';
  const recall = wordRecall(german.join(' '), text);
  check(outcome === 'result', `German finishes instead of spinning forever (${outcome})`);
  check(recall >= 0.9 && /Größe|Straße|müssen/.test(text), `German text with ß and umlauts is read (${(recall * 100).toFixed(0)}%)`);
  await page.close();
}

console.log('\n=== a language whose data is missing is reported, not an endless spinner ===');
{
  const page = await browser.newPage();
  await page.route('**/tesseract/lang-data/fra.traineddata.gz', (r) => r.fulfill({ status: 404, contentType: 'text/html', body: '<html>not found</html>' }));
  await page.goto(`${BASE_URL}/pl/ocr-pdf`, { waitUntil: 'load' });
  await page.setInputFiles('#fileInput', { name: 'scan.pdf', mimeType: 'application/pdf', buffer: readFileSync(join(outDir, 'chrome-article-scan.pdf')) });
  await page.selectOption('#ocr-language', 'fra');
  await page.locator('button', { hasText: 'Uruchom OCR' }).click();
  const error = page.locator('.bg-red-50, .dark\\:bg-red-900\\/20').first();
  const shown = await error.waitFor({ timeout: 30000 }).then(() => true).catch(() => false);
  const message = shown ? await error.innerText() : '';
  check(shown, 'an error appears within 30 s');
  check(/niedostępne/.test(message) && !/Network error|traineddata/.test(message), `the message is the localized one (${message.slice(0, 90)})`);
  check(await page.locator('button', { hasText: 'Uruchom OCR' }).isEnabled(), 'the tool is usable again (button back, no spinner)');
  await page.close();
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
