// End-to-end through the real /search-pdf page (plan 2.8, 2026-11-28). Four files are added at
// once — a real 27-page report, a PDF built for the test, a scan without a text layer and an
// encrypted file — and the page is checked against the same search run in Node over the texts
// pdf.js reads (lib/pdf/pdfPageTexts.ts): the same number of hits, page numbers and snippets. The
// scan counts as a searched file (it is read, it just has no text), so the summary says "of 3".
// Also: the options (case, diacritics, whole words), the CSV download, the scan note linking to
// OCR, the message for the encrypted file, no request carrying a file, the English page, and axe
// (WCAG 2.2 AA) in both themes with results on screen.
// Run: npm run test:e2e-search-pdf (needs a running server, E2E_BASE_URL).
import { chromium, type Page, type Request } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
const { t } = await import('../lib/i18n.ts');
const { searchPages } = await import('../lib/pdf/searchText.ts');
const { pdfPageTexts } = await import('../lib/pdf/pdfPageTexts.ts');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

// ---------- the files ----------
const report = readFileSync(join(ROOT, 'test-real-pdfs/allegro-raport.pdf'));
const own = await PDFDocument.create();
const font = await own.embedFont(StandardFonts.Helvetica);
own.addPage([595, 842]).drawText('Umowa nr 17 z Kowalskim. Kot spi.', { x: 50, y: 760, size: 14, font });
own.addPage([595, 842]).drawText('Druga strona: KOWALSKI i kotek. Umowa nr 18.', { x: 50, y: 760, size: 14, font });
const synthetic = Buffer.from(await own.save());
const scanDoc = await PDFDocument.create();
const img = canvasMod.createCanvas(200, 100);
const ig = img.getContext('2d');
ig.fillStyle = '#fff'; ig.fillRect(0, 0, 200, 100); ig.fillStyle = '#000'; ig.font = '20px sans-serif'; ig.fillText('Umowa (skan)', 10, 50);
scanDoc.addPage([400, 200]).drawImage(await scanDoc.embedPng(new Uint8Array(img.toBuffer('image/png'))), { x: 0, y: 0, width: 400, height: 200 });
const scan = Buffer.from(await scanDoc.save());
const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
const encrypted = Buffer.from(await encryptPDF(new Uint8Array(synthetic), 'tajne123'));

const texts = {
  'raport.pdf': (await pdfPageTexts(new Uint8Array(report))).pages,
  'umowy.pdf': (await pdfPageTexts(new Uint8Array(synthetic))).pages,
};
type Opts = { matchCase?: boolean; matchDiacritics?: boolean; wholeWord?: boolean };
const expected = (q: string, o: Opts = {}) => Object.entries(texts).map(([file, pages]) => ({ file, hits: searchPages(pages, q, o) }));

const browser = await chromium.launch();
async function open(locale: string, theme: 'light' | 'dark' = 'light'): Promise<{ page: Page; sent: Request[] }> {
  const ctx = await browser.newContext({ locale: locale === 'pl' ? 'pl-PL' : 'en-US', colorScheme: theme, serviceWorkers: 'block', acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/${locale}/search-pdf`, { waitUntil: 'networkidle' });
  if (theme === 'dark') await p.evaluate(() => document.documentElement.classList.add('dark'));
  const sent: Request[] = [];
  p.on('request', (r) => sent.push(r));
  return { page: p, sent };
}
const FILES = [
  { name: 'raport.pdf', mimeType: 'application/pdf', buffer: report },
  { name: 'umowy.pdf', mimeType: 'application/pdf', buffer: synthetic },
  { name: 'skan.pdf', mimeType: 'application/pdf', buffer: scan },
  { name: 'tajny.pdf', mimeType: 'application/pdf', buffer: encrypted },
];
async function addAll(p: Page, locale: string) {
  await p.setInputFiles('#fileInput', FILES);
  await p.waitForFunction((reading) => !document.querySelector('[data-testid="search-files"]')?.textContent?.includes(reading), t('page.search.reading', locale), { timeout: 60_000 });
}
async function shown(p: Page) {
  return p.evaluate(() => Array.from(document.querySelectorAll('[data-testid="search-results"] > div')).map((box) => ({
    file: box.querySelector('h3')?.firstChild?.textContent?.trim() ?? '',
    items: Array.from(box.querySelectorAll('li')).map((li) => ({ label: li.querySelector('span')?.textContent ?? '', match: li.querySelector('mark')?.textContent ?? '', text: li.textContent ?? '' })),
  })));
}
async function search(p: Page, q: string) {
  await p.fill('#search-query', q);
  await p.waitForTimeout(150);
}

try {
  console.log('=== /pl/search-pdf: four files at once ===');
  {
    const { page: p, sent } = await open('pl');
    check((await p.locator('h1').innerText()).trim() === t('tool.search', 'pl'), 'the page has the tool name as its heading');
    await addAll(p, 'pl');
    const list = await p.locator('[data-testid="search-files"]').innerText();
    check(list.includes(t('page.search.pages', 'pl', { n: 27 })) && list.includes(t('page.search.pages', 'pl', { n: 2 })), 'the report has 27 pages, the test file 2');
    check(await p.locator('[data-testid="search-no-text"]').count() === 1, 'the scan gets the note that it has no text');
    check(await p.locator(`[data-testid="search-no-text"] a[href="/pl/ocr-pdf"]`).count() === 1, 'the note links to the OCR tool in the page language');
    check(/zabezpieczony hasłem/.test(list), 'the encrypted file gets a Polish message in the list');

    for (const [q, o] of [['allegro', {}], ['umowa nr', {}], ['kowalski', {}]] as [string, Opts][]) {
      await search(p, q);
      const exp = expected(q, o).filter((e) => e.hits.length);
      const got = await shown(p);
      const total = exp.reduce((n, e) => n + e.hits.length, 0);
      const summary = (await p.locator('[data-testid="search-summary"]').innerText()).trim();
      check(summary === t('page.search.summary', 'pl', { hits: total, files: exp.length, total: 3 }), `"${q}": summary "${summary}" (expected ${total} hits)`);
      const sameFiles = JSON.stringify(got.map((g) => g.file)) === JSON.stringify(exp.map((e) => e.file));
      const samePages = exp.every((e, i) => e.hits.slice(0, 100).every((h, j) => got[i]?.items[j]?.label === `${t('page.search.page_label', 'pl', { page: h.page })}:`
        && got[i]?.items[j]?.match === h.match));
      check(sameFiles && samePages, `"${q}": the same files, page numbers and matched text as the search in Node`);
    }

    await search(p, 'kowalski');
    check((await shown(p)).find((g) => g.file === 'umowy.pdf')?.items.length === 2, 'the default ignores case ("kowalski" finds "Kowalskim" and "KOWALSKI")');
    await p.check('#search-case');
    check((await shown(p)).find((g) => g.file === 'umowy.pdf')?.items.length === undefined, 'with "match case" lowercase "kowalski" finds neither');
    await p.uncheck('#search-case');
    await search(p, 'kot');
    check((await shown(p)).find((g) => g.file === 'umowy.pdf')?.items.length === 2, '"kot" finds "Kot" and "kotek"');
    await p.check('#search-whole');
    check((await shown(p)).find((g) => g.file === 'umowy.pdf')?.items.length === 1, 'with "whole words" only "Kot"');
    await p.uncheck('#search-whole');

    await search(p, 'nie ma takiego slowa xyz');
    check((await p.locator('[data-testid="search-summary"]').innerText()).trim() === t('page.search.no_hits', 'pl', { query: 'nie ma takiego slowa xyz' }), 'no hits: a message with the query');

    await search(p, 'umowa nr');
    const [download] = await Promise.all([p.waitForEvent('download'), p.locator('main button', { hasText: t('page.search.csv', 'pl') }).click()]);
    const csv = readFileSync(await download.path(), 'utf8');
    const rows = csv.replace(/^﻿/, '').trim().split('\r\n');
    check(download.suggestedFilename() === `${t('file.search_results', 'pl')}.csv`, `the CSV is named ${download.suggestedFilename()}`);
    check(csv.startsWith('﻿') && rows[0] === 'Plik,Strona,Fragment', 'the CSV has a BOM and a Polish header');
    check(rows.length === 3 && rows[1]!.startsWith('umowy.pdf,1,') && rows[2]!.startsWith('umowy.pdf,2,'), `one row per hit with file and page (${rows.slice(1).join(' | ')})`);

    const uploads = sent.filter((r) => (r.method() !== 'GET' && r.method() !== 'HEAD') || (r.postDataBuffer()?.length ?? 0) > 0);
    check(uploads.length === 0, `no request carries a file (${sent.length} requests, all GET/HEAD without a body)`);

    await p.locator('main button', { hasText: t('page.search.clear', 'pl') }).click();
    check(await p.locator('[data-testid="search-files"]').count() === 0, '"remove all files" empties the list');
    await p.context().close();
  }

  console.log('\n=== the English page ===');
  {
    const { page: p } = await open('en');
    check((await p.locator('h1').innerText()).trim() === t('tool.search', 'en'), `English heading (${t('tool.search', 'en')})`);
    await addAll(p, 'en');
    await search(p, 'umowa');
    const exp = expected('umowa').filter((e) => e.hits.length);
    check((await p.locator('[data-testid="search-summary"]').innerText()).trim() === t('page.search.summary', 'en', { hits: exp.reduce((n, e) => n + e.hits.length, 0), files: exp.length, total: 3 }), 'English summary');
    check(/password/i.test(await p.locator('[data-testid="search-files"]').innerText()), 'the encrypted file gets an English message');
    const [download] = await Promise.all([p.waitForEvent('download'), p.locator('main button', { hasText: t('page.search.csv', 'en') }).click()]);
    check(download.suggestedFilename() === 'search-results.csv', `English CSV name (${download.suggestedFilename()})`);
    await p.context().close();
  }

  console.log('\n=== legible in both themes (axe), with results on screen ===');
  const axeSource = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
  for (const theme of ['light', 'dark'] as const) {
    const { page: p } = await open('pl', theme);
    await addAll(p, 'pl');
    await search(p, 'allegro');
    await p.waitForFunction(() => document.getAnimations().every((x) => x.playState !== 'running' || x.effect?.getTiming().iterations === Infinity), undefined, { timeout: 10000 });
    await p.addScriptTag({ content: axeSource });
    const res = await p.evaluate(async () => (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } })
      .axe.run('main', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
    const v = res.violations.map((x) => `${x.id}×${x.nodes.length} (${x.nodes[0]?.target.join(' ').slice(0, 50)})`).join(', ');
    check(!v, `${theme}: axe (WCAG 2.2 AA): ${v || 'clean'}`);
    await p.context().close();
  }

  console.log('\n=== phone width (375 px) ===');
  {
    const ctx = await browser.newContext({ locale: 'pl-PL', serviceWorkers: 'block', viewport: { width: 375, height: 800 } });
    await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/pl/search-pdf`, { waitUntil: 'networkidle' });
    await addAll(p, 'pl');
    await search(p, 'allegro');
    const wide = await p.evaluate(() => document.documentElement.scrollWidth);
    check(wide <= 375, `no sideways scroll with results on screen (${wide} px)`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
