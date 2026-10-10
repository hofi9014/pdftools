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

/** Lines of every page as pdf.js reads them: text without spaces, left edge, baseline from the top. */
async function pageLines(bytes: Uint8Array): Promise<Array<Array<{ text: string; x: number; baseline: number }>>> {
  const doc = await open(bytes);
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const height = page.getViewport({ scale: 1 }).height;
    const items = (await page.getTextContent()).items.filter((i): i is typeof i & { str: string; transform: number[] } => 'str' in i && i.str.trim().length > 0);
    const rows: Array<{ baseline: number; items: typeof items }> = [];
    for (const it of items) {
      const b = height - it.transform[5]!;
      const row = rows.find((r) => Math.abs(r.baseline - b) < 0.6);
      if (row) row.items.push(it);
      else rows.push({ baseline: b, items: [it] });
    }
    out.push(rows.map((r) => {
      const sorted = r.items.sort((a, b) => a.transform[4]! - b.transform[4]!);
      return { text: sorted.map((i) => i.str).join('').replace(/\s+/g, ''), x: sorted[0]!.transform[4]!, baseline: r.baseline };
    }));
  }
  return out;
}
const srcLines = await pageLines(new Uint8Array(allegro));

/** How many lines of the source are lines of the result, and how far the furthest one moved. */
function compareLines(result: Awaited<ReturnType<typeof pageLines>>): { total: number; matched: number; worstY: number; worstX: number } {
  let total = 0;
  let matched = 0;
  let worstY = 0;
  let worstX = 0;
  srcLines.forEach((lines, p) => {
    for (const l of lines) {
      total++;
      const got = (result[p] ?? []).filter((o) => o.text === l.text).sort((a, b) => Math.abs(a.baseline - l.baseline) - Math.abs(b.baseline - l.baseline))[0];
      if (!got) continue;
      matched++;
      worstY = Math.max(worstY, Math.abs(got.baseline - l.baseline));
      worstX = Math.max(worstX, Math.abs(got.x - l.x));
    }
  });
  return { total, matched, worstY, worstX };
}

async function toDocument(slug: string, button: RegExp, layout?: 'flow') {
  const page = await fresh(slug, [{ name: 'a.pdf', mimeType: 'application/pdf', buffer: allegro }]);
  if (layout) await page.locator(`[data-layout-mode="${layout}"]`).click();
  const doc = await download(page, () => page.locator('button', { hasText: button }).last().click());
  const used = await page.locator('#layout-used').getAttribute('data-layout');
  await page.close();
  return { ...doc, used };
}
async function backToPdf(slug: string, name: string, mimeType: string, bytes: Uint8Array, button: RegExp) {
  const page = await fresh(slug, [{ name, mimeType, buffer: bytes }]);
  const back = await download(page, () => page.locator('button', { hasText: button }).last().click());
  await page.close();
  return back.bytes;
}
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ODT_MIME = 'application/vnd.oasis.opendocument.text';

// The report is a designed document, so PDF -> Word picks the faithful layout by itself: every
// line is a paragraph with an exact height over the page picture. Sent back through Word -> PDF
// that used to be reflowed by the ordinary reader into 41 loose pages; a positioned document is
// now read as positions, and the result is compared line by line with the SOURCE PDF.
console.log('\n=== PDF → Word → PDF (faithful layout, chosen automatically) ===');
{
  const docx = await toDocument('pdf-to-word', /Konwertuj do formatu Word/);
  check(docx.used === 'fixed', `PDF → Word used the faithful layout (${docx.used})`);
  const back = await backToPdf('word-to-pdf', 'a.docx', DOCX_MIME, docx.bytes, /Konwertuj do formatu PDF/);
  const doc = await open(back);
  const rc = distinctRecall(srcText, await text(back));
  check(doc.numPages === 27, `the round-tripped PDF has ${doc.numPages} pages (source 27; 41 when it was reflowed)`);
  check(rc > 0.99, `${(rc * 100).toFixed(1)}% of the distinct source words survive Word and back`);
  const cmp = compareLines(await pageLines(back));
  check(cmp.matched / cmp.total > 0.97, `${cmp.matched} of ${cmp.total} source lines are lines of the result`);
  check(cmp.worstY < 2 && cmp.worstX < 1, `they sit where the source has them: baseline within ${cmp.worstY.toFixed(2)} pt, left edge within ${cmp.worstX.toFixed(2)} pt`);
  const ops = await (await doc.getPage(4)).getOperatorList();
  check(ops.fnArray.includes(pdfjsLib.OPS.paintImageXObject), 'the page picture is there (page 4)');
}

console.log('\n=== PDF → Word → PDF (flow layout, chosen by hand) ===');
{
  const docx = await toDocument('pdf-to-word', /Konwertuj do formatu Word/, 'flow');
  check(docx.used === 'flow', `PDF → Word used the flow layout (${docx.used})`);
  const back = await backToPdf('word-to-pdf', 'a.docx', DOCX_MIME, docx.bytes, /Konwertuj do formatu PDF/);
  const doc = await open(back);
  const rc = distinctRecall(srcText, await text(back));
  check(doc.numPages === 27, `the round-tripped PDF has ${doc.numPages} pages (source 27, was 13 before page breaks were read)`);
  check(rc > 0.97, `${(rc * 100).toFixed(1)}% of the distinct source words survive Word and back`);
}

console.log('\n=== PDF → ODT → PDF (faithful layout) ===');
{
  const odt = await toDocument('pdf-to-openoffice', /Konwertuj do ODT/);
  check(odt.used === 'fixed', `PDF → ODT used the faithful layout (${odt.used})`);
  const back = await backToPdf('openoffice-to-pdf', 'a.odt', ODT_MIME, odt.bytes, /Konwertuj do PDF/);
  const doc = await open(back);
  const rc = distinctRecall(srcText, await text(back));
  check(doc.numPages === 27, `the round-tripped PDF has ${doc.numPages} pages (source 27)`);
  check(rc > 0.99, `${(rc * 100).toFixed(1)}% of the distinct source words survive OpenDocument and back`);
  const cmp = compareLines(await pageLines(back));
  check(cmp.matched / cmp.total > 0.97 && cmp.worstY < 2 && cmp.worstX < 1, `${cmp.matched} of ${cmp.total} source lines, baseline within ${cmp.worstY.toFixed(2)} pt, left edge within ${cmp.worstX.toFixed(2)} pt`);
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

// The other way round: a workbook printed to PDF by this app and read back by it. Every word the
// PDF cut at the end of a line used to come back in two pieces, and the last column of the first
// sheet (alone on its column pages) was dropped.
console.log('\n=== Excel → PDF → Excel (a real workbook, 3 sheets) ===');
{
  const JSZip = (await import('jszip')).default;
  const workbook = readFileSync(join(ROOT, 'test-fixtures', 'EPZ_SIERPIEN_2026.xlsx'));
  const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const p1 = await fresh('excel-to-pdf', [{ name: 'e.xlsx', mimeType: xlsxMime, buffer: workbook }]);
  const pdf = await download(p1, () => p1.locator('button', { hasText: /Konwertuj do formatu PDF/ }).last().click());
  await p1.close();
  const p2 = await fresh('pdf-to-excel', [{ name: 'e.pdf', mimeType: 'application/pdf', buffer: pdf.bytes }]);
  const back = await download(p2, () => p2.locator('button', { hasText: /Konwertuj do formatu Excel/ }).last().click());
  await p2.close();
  const strings = async (bytes: Uint8Array | Buffer): Promise<string[]> => {
    const zip = await JSZip.loadAsync(bytes);
    const xml = (await zip.file('xl/sharedStrings.xml')?.async('string')) ?? '';
    return (xml.match(/<si>[\s\S]*?<\/si>/g) ?? []).map((si) => si.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()).filter((t) => t !== '');
  };
  const sheetCount = Object.keys((await JSZip.loadAsync(back.bytes)).files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).length;
  const want = new Set(await strings(workbook)), got = new Set(await strings(back.bytes));
  // dates and times are numbers in the source and text in the result: compare the texts
  const texts = [...want].filter((t) => /\p{L}{3}/u.test(t));
  const missing = texts.filter((t) => !got.has(t));
  check(sheetCount === 3, `three sheets come back (${sheetCount})`);
  check(missing.length === 0, `every text cell of the workbook comes back exactly as it was (${texts.length - missing.length} of ${texts.length} distinct texts; missing e.g. ${JSON.stringify(missing.slice(0, 2))})`);
  check(got.has('Godzina rozpoczęcia pracy') && ![...got].some((t) => /rozpoczę ?ci ?a pracy/.test(t) && t !== 'Godzina rozpoczęcia pracy'), 'a word cut at a line end is whole again');
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
