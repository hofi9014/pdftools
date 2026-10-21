// End-to-end through the REAL converter pages with real PDFs. Each download is opened with an
// independent reader (zip + XML) and checked for what the converter promises, using word recall
// against pdf.js's own text extraction as the measure of "no text lost":
// PDF→TXT / HTML / EPUB / ODT / Word on allegro-raport.pdf (27 pages, images, ligatures), PDF→PPTX
// (one slide per page, text present), PDF→SVG (one svg per page), PDF→Excel on the schedule PDF
// (3 sheets, dense grid) and on an invoice printed from a browser (text and a two-page table, read
// back by a spreadsheet application when one is installed). Where Microsoft Office is installed,
// the presentation is opened in PowerPoint and both workbooks in Excel as well.
import { chromium, type Page } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import JSZip from 'jszip';
import { findOffice, convertToPdf, stopOffice } from './helpers/openoffice.mts';
import { invoiceItems, invoiceTotals } from './fixtures/make-invoice-pdf.mts';
import { findMsOffice, excelOpen, powerpointOpen } from './helpers/msoffice.mts';

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
const invoice = readFileSync(join(ROOT, 'test-real-pdfs', 'chrome-invoice.pdf'));
// Microsoft Office, when installed, opens the downloads too (e2e/helpers/msoffice.mts).
const ms = findMsOffice();
const msDir = join(ROOT, 'test-output', 'e2e-converters-msoffice');
mkdirSync(msDir, { recursive: true });

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
  if (!ms?.powerpoint) console.log('  SKIP Microsoft PowerPoint is not installed: the presentation is not opened in it');
  else {
    const path = join(msDir, 'allegro.pptx');
    writeFileSync(path, r.bytes);
    const [res] = powerpointOpen([[path, join(msDir, 'allegro-pptx.pdf')]]);
    check(!!res?.ok && res.slides === 27, `Microsoft PowerPoint opens it without repairing it, 27 slides (${res?.ok ? res.slides : res?.error})`);
    if (res?.ok) {
      const shown = await sourceText(new Uint8Array(readFileSync(join(msDir, 'allegro-pptx.pdf'))));
      const rcPp = recall(src, shown);
      check(rcPp > 0.99, `and shows ${(rcPp * 100).toFixed(1)}% of the source words (read from the PDF PowerPoint prints)`);
    }
  }
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
  if (!ms?.excel) console.log('  SKIP Microsoft Excel is not installed: the workbook is not opened in it');
  else {
    const path = join(msDir, 'schedule.xlsx');
    writeFileSync(path, r.bytes);
    const [res] = excelOpen([[path, null]]);
    check(!!res?.ok && res.sheets?.length === 3, `Microsoft Excel opens it without repairing it, three sheets (${res?.ok ? res.sheets?.map((s) => `${s.name} ${s.rows}×${s.cols}`).join(', ') : res?.error})`);
    if (res?.ok) {
      const shownWords = new Set(words(res.sheets!.flatMap((s) => s.cells.map((c) => c.text)).join(' ')));
      const rcX = need.filter((w) => shownWords.has(w)).length / need.length;
      check(rcX === 1, `and shows ${(rcX * 100).toFixed(1)}% of the distinct source words in its cells`);
    }
  }
}

// A PDF that is not a sheet printed by this app: an invoice from a browser. It used to end in
// "Worksheet name … cannot include any of the following characters" with no download at all.
console.log('\n=== PDF → Excel (an invoice printed from a browser) ===');
{
  const r = await convert('pdf-to-excel', invoice, /Konwertuj do formatu Excel/, 'faktura.pdf');
  check(r.file.endsWith('.xlsx') && r.errors.length === 0, `downloads an .xlsx without page errors (${r.file}; ${r.errors.join(' | ') || 'no errors'})`);
  const zip = await JSZip.loadAsync(r.bytes);
  const sst = ((await zip.file('xl/sharedStrings.xml')?.async('string')) ?? '').match(/<si>[\s\S]*?<\/si>/g)?.map((si) => strip(si).trim()) ?? [];
  const sheetXml = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
  const values = [...sheetXml.matchAll(/<c r="[A-Z]+\d+"([^>]*)>(?:<[^v][^>]*>)*<v>([^<]*)<\/v>/g)].map((m) => (/t="s"/.test(m[1]!) ? sst[Number(m[2])] ?? '' : m[2]!));
  const rc = recall(await sourceText(new Uint8Array(invoice)), values.join(' '));
  check(rc === 1, `${(rc * 100).toFixed(1)}% of the invoice's words are in the cells (title, both parties, 34 items, totals, note)`);
  check(sst.includes(`${invoiceItems[2]!.marker} ${invoiceItems[2]!.name}`), 'a product name wrapped over three lines is one cell');
  // "10,75" and "1 307,49" are numbers a spreadsheet can add up, not text that looks like them.
  const numeric = new Set(values.filter((v) => /^-?\d+(\.\d+)?$/.test(v)).map(Number));
  const amounts = invoiceItems.flatMap((it) => [Number(it.price.toFixed(2)), Number(it.gross.toFixed(2))]);
  check(amounts.every((a) => numeric.has(a)) && !sst.some((t) => /^\d[\d ]*,\d{2}$/.test(t)), `all ${amounts.length} prices and values of the items are stored as numbers`);

  const office = findOffice();
  if (!office) {
    console.log('  SKIP no spreadsheet application (OpenOffice / LibreOffice) installed: the workbook is not opened in one');
  } else {
    // What a spreadsheet application reads from the file: its first sheet, saved by the
    // application itself as text.
    const outDir = join(ROOT, 'test-output', 'e2e-converters');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'faktura.xlsx'), r.bytes);
    try {
      await convertToPdf(office, [[join(outDir, 'faktura.xlsx'), join(outDir, 'faktura.csv')]]);
    } finally {
      await stopOffice(office);
    }
    const rows = readFileSync(join(outDir, 'faktura.csv'), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l !== '');
    const fields = (line: string): string[] => {
      const out: string[] = [];
      let cur = '', quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]!;
        if (quoted) {
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ';') { out.push(cur); cur = ''; } else cur += ch;
      }
      out.push(cur);
      return out;
    };
    const table = rows.map(fields);
    check(table.length === 48 && table.every((f) => f.length === 8), `${office.name} opens it as 48 rows of 8 columns (${table.length} rows)`);
    // Amounts are numbers in the workbook; the application shows them in ITS settings ("1 307,49"
    // with a no-break space, or "1,307.49"), so they are compared as numbers.
    const amount = (t: string | undefined): number => {
      const c = (t ?? '').replace(/[\s\u00a0\u202f]/g, '');
      const dec = Math.max(c.lastIndexOf(','), c.lastIndexOf('.'));
      return dec < 0 ? Number(c) : Number(c.slice(0, dec).replace(/[.,]/g, '') + '.' + c.slice(dec + 1));
    };
    let wrong = 0;
    for (const it of invoiceItems) {
      const row = table.find((f) => f[1]?.startsWith(it.marker + ' '));
      const want = [String(it.lp), `${it.marker} ${it.name}`, String(it.qty), 'szt.', '23%'];
      if (!row || [0, 1, 3, 4, 6].map((i) => row[i]).join('|') !== want.join('|')
        || amount(row[5]) !== Number(it.price.toFixed(2)) || amount(row[7]) !== Number(it.gross.toFixed(2))) wrong++;
    }
    check(wrong === 0, `and reads all 34 items with every value in its column (${wrong} wrong)`);
    const first = table.find((f) => f[1]?.startsWith(invoiceItems[0]!.marker + ' '));
    check(/^\d+[.,]\d{2}$/.test(first?.[5] ?? ''), `amounts keep their two decimals on screen (${first?.[5]})`);
    const net = table.find((f) => f.includes('Razem netto:'));
    // The total is a number with "zł" in its format; Calc shows it with its own thousands space.
    check(/zł$/.test(net?.[7] ?? '') && amount(net?.[7]?.replace(/zł$/, '')) === Number(invoiceTotals.net.toFixed(2)), `the total stands under the value column, as a number shown with "zł" (${net?.join('|')})`);
    check(table.some((f) => f[0] === 'Sprzedawca' && f.includes('Nabywca')), 'seller and buyer are two cells of one row');
  }

  // The same workbook in Microsoft Excel: opened read-only without repair, every cell read as
  // Excel shows it, together with whether Excel holds it as a number.
  if (!ms?.excel) console.log('  SKIP Microsoft Excel is not installed: the workbook is not opened in it');
  else {
    const path = join(msDir, 'faktura.xlsx');
    writeFileSync(path, r.bytes);
    const [res] = excelOpen([[path, null]]);
    const sheet = res?.sheets?.[0];
    check(!!res?.ok && !!sheet, `Microsoft Excel opens it without repairing it (${res?.ok ? `${sheet?.name}: ${sheet?.rows}×${sheet?.cols}` : res?.error})`);
    if (sheet) {
      const at = (row: number, col: number) => sheet.cells.find((c) => c.r === row && c.c === col);
      const rowOf = (marker: string) => sheet.cells.find((c) => c.c === 2 && c.text.startsWith(marker + ' '))?.r;
      const amount = (t: string | undefined): number => Number((t ?? '').replace(/[^\d,.-]/g, '').replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
      let wrong = 0;
      const notNumbers: string[] = [];
      for (const it of invoiceItems) {
        const row = rowOf(it.marker);
        if (!row) { wrong++; continue; }
        const price = at(row, 6);
        const gross = at(row, 8);
        if (at(row, 1)?.text !== String(it.lp) || at(row, 2)?.text !== `${it.marker} ${it.name}` || at(row, 4)?.text !== String(it.qty)
          || at(row, 5)?.text !== 'szt.' || at(row, 7)?.text !== '23%'
          || amount(price?.text) !== Number(it.price.toFixed(2)) || amount(gross?.text) !== Number(it.gross.toFixed(2))) wrong++;
        if (!price?.number || !gross?.number) notNumbers.push(it.marker);
      }
      check(sheet.rows === 48 && sheet.cols === 8, `48 rows of 8 columns in Excel too (${sheet.rows}×${sheet.cols})`);
      check(wrong === 0, `Excel reads all 34 items with every value in its column (${wrong} wrong)`);
      check(notNumbers.length === 0, `and holds every price and value as a number it can add up (${notNumbers.length ? notNumbers.join(', ') : 'all 68'})`);
      const first = at(rowOf(invoiceItems[0]!.marker)!, 6)?.text ?? '';
      check(/^\d+[.,]\d{2}$/.test(first), `amounts show two decimals in Excel (${first})`);
      const netLabel = sheet.cells.find((c) => c.text === 'Razem netto:');
      const net = netLabel ? at(netLabel.r, 8) : undefined;
      check(!!net?.number && /zł$/.test(net.text) && amount(net.text.replace(/zł$/, '')) === Number(invoiceTotals.net.toFixed(2)), `the net total is a number Excel shows with "zł" (${net?.text})`);
    }
  }
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
