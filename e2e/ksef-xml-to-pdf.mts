// KSeF XML to PDF through the real page: the page itself (Polish only, SEO text and structured
// data in the HTML), adding every sample at once, the preview, a single PDF, one PDF for all
// invoices and the ZIP — each PDF read back with pdf.js — no upload of the file, a 375 px phone,
// and axe with an invoice on screen in both themes.
// Run against a production build: E2E_BASE_URL (default http://localhost:3100).
import { chromium, type Page } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const PAGE = `${BASE}/pl/ksef-xml-na-pdf`;
const DIR = 'test-fixtures/ksef';
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

// Text past the 50 pt margin of the tagged-PDF engine ran out of its table cell or off the page.
const MARGIN = 50;
async function pdfText(bytes: Uint8Array): Promise<{ pages: number; text: string; outside: string[] }> {
  const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
  let text = '';
  const outside: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const width = page.getViewport({ scale: 1 }).width;
    const c = await page.getTextContent();
    text += `\n[page ${i}]\n` + c.items.map((x) => ('str' in x ? x.str : '')).join(' ');
    for (const x of c.items) {
      if (!('str' in x) || !x.str.trim()) continue;
      const left = x.transform[4];
      if (left < MARGIN - 1 || left + x.width > width - MARGIN + 1) outside.push(`p${i} "${x.str}" ${left.toFixed(1)}–${(left + x.width).toFixed(1)}`);
    }
  }
  return { pages: doc.numPages, text: text.replace(/\s+/g, ' '), outside };
}

console.log('=== the page (HTML as served) ===');
{
  const res = await fetch(PAGE);
  const html = await res.text();
  check(res.status === 200, `/pl/ksef-xml-na-pdf → ${res.status}`);
  check(/<h1[^>]*>KSeF XML na PDF – otwórz e-fakturę bez logowania<\/h1>/.test(html), 'H1 as requested');
  check(html.includes('<title>KSeF XML na PDF – otwórz e-fakturę bez logowania | OptimaPDF</title>'), 'title');
  check(/<meta name="description" content="Otwórz plik XML e-faktury z KSeF/.test(html), 'meta description');
  check(html.includes('<link rel="canonical" href="https://optimapdf.com/pl/ksef-xml-na-pdf"'), 'canonical');
  check(html.includes('"@type":"FAQPage"') && html.includes('"@type":"WebApplication"') && html.includes('Czy PDF z KSeF jest fakturą?'), 'FAQ visible and in FAQPage + WebApplication data');
  check(html.includes('Plik nie opuszcza Twojego komputera.'), 'the visualization notice is in the page');
  const de = await fetch(`${BASE}/de/ksef-xml-na-pdf`);
  check(de.status === 404, `/de/ksef-xml-na-pdf → ${de.status} (Polish only)`);
  const bare = await fetch(`${BASE}/ksef-xml-na-pdf`, { redirect: 'manual' });
  check([301, 308].includes(bare.status) && (bare.headers.get('location') ?? '').endsWith('/pl/ksef-xml-na-pdf'), `/ksef-xml-na-pdf → ${bare.status} ${bare.headers.get('location')}`);
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  check(sitemap.includes('/pl/ksef-xml-na-pdf</loc>') && !sitemap.includes('/en/ksef-xml-na-pdf'), 'in the sitemap, Polish only');
  const pl = await (await fetch(`${BASE}/pl`)).text();
  const en = await (await fetch(`${BASE}/en`)).text();
  check(pl.includes('href="/pl/ksef-xml-na-pdf"') && !en.includes('ksef-xml-na-pdf'), 'in the Polish menu, not in the English one');
}

console.log('\n=== the guide under the tool ===');
const GUIDE = `${PAGE}/jak-otworzyc-fakture-xml`;
{
  const res = await fetch(GUIDE);
  const html = await res.text();
  check(res.status === 200, `${GUIDE.replace(BASE, '')} → ${res.status}`);
  check(/<h1[^>]*>Jak otworzyć fakturę XML z KSeF i zapisać ją jako PDF<\/h1>/.test(html), 'H1');
  check(html.includes('<link rel="canonical" href="https://optimapdf.com/pl/ksef-xml-na-pdf/jak-otworzyc-fakture-xml"'), 'canonical');
  check(html.includes('"@type":"Article"') && html.includes('"@type":"FAQPage"') && html.includes('"@type":"BreadcrumbList"'), 'Article, FAQPage, BreadcrumbList');
  check(html.includes('property="og:type" content="article"'), 'og:type article');
  check(html.includes('href="/pl/ksef-xml-na-pdf"') && html.includes('Kiedy na wizualizacji musi być kod QR'), 'links to the tool, the QR section is in the HTML');
  check((await (await fetch(PAGE)).text()).includes('href="/pl/ksef-xml-na-pdf/jak-otworzyc-fakture-xml"'), 'the tool page links to the guide');
  check((await fetch(`${BASE}/en/ksef-xml-na-pdf/jak-otworzyc-fakture-xml`)).status === 404, 'English address → 404 (Polish only)');
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  check(sitemap.includes('/pl/ksef-xml-na-pdf/jak-otworzyc-fakture-xml</loc>'), 'in the sitemap');
  for (const img of ['/guides/ksef/podglad-faktury-ksef.webp', '/guides/ksef/faktura-ksef-pdf.webp']) {
    const r = await fetch(`${BASE}${img}`);
    check(r.status === 200 && (r.headers.get('content-type') ?? '').includes('webp'), `${img} served as WebP`);
  }
}

console.log('\n=== the Polish home page lists, finds and counts it ===');
{
  const browser0 = await chromium.launch();
  for (const [loc, expectTile, total, local] of [['pl', true, 41, 37], ['en', false, 40, 36]] as const) {
    const ctx = await browser0.newContext({ serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/${loc}`, { waitUntil: 'networkidle' });
    const tile = page.locator('#tools a[href="/pl/ksef-xml-na-pdf"]');
    check((await tile.count() === 1) === expectTile, `/${loc}: KSeF tile in the tool catalog — ${expectTile ? 'present' : 'absent'}`);
    const hero = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    check(hero.includes(`${total} `) && hero.includes(`${local}/${total}`), `/${loc}: counts ${total} tools, ${local}/${total} local`);
    await page.locator('#tool-search').fill('ksef');
    const found = page.locator('[role="status"] a[href="/pl/ksef-xml-na-pdf"]');
    check((await found.count() === 1) === expectTile, `/${loc}: search "ksef" ${expectTile ? 'finds' : 'does not offer'} the tool`);
    await ctx.close();
  }
  await browser0.close();
}

const files = ['mf', 'brochure', 'other'].flatMap((d) => readdirSync(join(DIR, d)).map((f) => ({ name: f, mimeType: 'text/xml', buffer: readFileSync(join(DIR, d, f)) })));
const invoices = files.filter((f) => !['mf-upo.xml', 'fa1-stub.xml', 'inny-xml.xml', 'notatka.xml'].includes(f.name));

const browser = await chromium.launch();

async function open(ctxOpts: Parameters<typeof browser.newContext>[0] = {}): Promise<{ page: Page; requests: { method: string; url: string; body: number }[]; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ locale: 'pl-PL', acceptDownloads: true, serviceWorkers: 'block', ...ctxOpts });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
  const page = await ctx.newPage();
  const requests: { method: string; url: string; body: number }[] = [];
  page.on('request', (r) => requests.push({ method: r.method(), url: r.url(), body: r.postDataBuffer()?.length ?? 0 }));
  await page.goto(PAGE, { waitUntil: 'networkidle' });
  return { page, requests, close: () => ctx.close() };
}

console.log('\n=== all samples at once, preview, no upload ===');
{
  const { page, requests, close } = await open();
  const before = requests.length;
  await page.locator('#ksefFileInput').setInputFiles(files);
  await page.getByRole('heading', { name: /^Pliki \(/ }).waitFor();
  const items = page.locator('li.ksef-file');
  check(await items.count() === files.length, `${await items.count()} files listed`);
  const errors = await page.locator('li.ksef-file [role="alert"]').allTextContents();
  check(errors.length === 4 && errors.some((e) => e.includes('UPO')) && errors.some((e) => e.includes('FA(1)')) && errors.some((e) => e.includes('nie jest plik XML')), `4 non-invoices with their messages`);
  const preview = page.locator('.ksef-preview');
  check(await preview.isVisible(), 'a preview is shown');
  // Show one invoice with many parts.
  await page.locator('li.ksef-file', { hasText: 'wiele-stawek.xml' }).getByRole('button', { name: 'Podgląd' }).click();
  const text = (await preview.innerText()).replace(/\s+/g, ' ');
  check(text.includes('Faktura VAT nr FV/245/09/2026') && text.includes('Kwota należności ogółem: 2 351,00 PLN'), 'preview of the multi-rate invoice: title and total');
  check(text.includes('Odbiorca') && text.includes('Zwolnienie od podatku') && text.includes('Do zapłaty'), 'parties, annotations, settlement');

  // A single PDF.
  const [one] = await Promise.all([page.waitForEvent('download'), page.locator('li.ksef-file', { hasText: 'wiele-stawek.xml' }).getByRole('button', { name: 'Pobierz PDF' }).click()]);
  check(one.suggestedFilename() === 'wiele-stawek.pdf', `single PDF named ${one.suggestedFilename()}`);
  const single = await pdfText(new Uint8Array(readFileSync((await one.path())!)));
  check(single.text.includes('FV/245/09/2026') && single.text.includes('2 351,00') && single.text.includes('Dokumentem księgowym jest plik XML w KSeF'), `single PDF: ${single.pages} page(s), number, total, notice`);
  check(single.text.includes('Pościel') === false && single.text.includes('Złom stalowy') && single.text.includes('Łódź'), 'single PDF: only this invoice, Polish letters intact');

  // One PDF for all.
  const [all] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /jako jeden PDF/ }).click()]);
  const merged = await pdfText(new Uint8Array(readFileSync((await all.path())!)));
  const numbers = ['FV/245/09/2026', 'FK/12/09/2026', 'FK/13/09/2026', 'FZ/3/09/2026', 'FA/YUCFO-4342344706/03/2026', 'FA/KUDYO-5316371561/05/2025'];
  check(merged.pages >= invoices.length && numbers.every((n) => merged.text.includes(n)), `one PDF: ${merged.pages} pages for ${invoices.length} invoices, each invoice present`);
  check(merged.outside.length === 0, `no text past the page margins in any of the ${merged.pages} pages${merged.outside.length ? `\n      ${merged.outside.slice(0, 6).join('\n      ')}` : ''}`);
  const starts = merged.text.split(/\[page \d+\]/).filter((p) => /^ ?Faktura/.test(p)).length;
  check(starts === invoices.length, `each invoice starts on a new page (${starts}/${invoices.length})`);

  // ZIP.
  const [zipDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /ZIP/ }).click()]);
  const zip = await JSZip.loadAsync(readFileSync((await zipDl.path())!));
  const names = Object.keys(zip.files);
  check(zipDl.suggestedFilename() === 'faktury-ksef.zip' && names.length === invoices.length && names.includes('korekta-roznicowa.pdf'), `ZIP: ${names.length} PDFs`);
  const kor = await pdfText(new Uint8Array(await zip.file('korekta-roznicowa.pdf')!.async('uint8array')));
  check(kor.text.includes('Faktura korygująca') && kor.text.includes('-405,90'), 'ZIP: the correction PDF has its title and negative total');

  const after = requests.slice(before);
  const sent = after.filter((r) => r.method !== 'GET' && r.method !== 'HEAD' || r.body > 0);
  check(sent.length === 0, `no request carries data while reading and saving (${after.length} requests, all GET)`);
  await close();
}

console.log('\n=== phone 375 px ===');
{
  const { page, close } = await open({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true });
  await page.locator('#ksefFileInput').setInputFiles(files.filter((f) => f.name === 'cs-invoice-template-fa-3-with-attachment.xml'));
  await page.locator('.ksef-preview').waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `no sideways scroll of the page with the attachment invoice (${overflow}px)`);
  const wide = await page.evaluate(() => Array.from(document.querySelectorAll('.ksef-preview *')).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && !el.closest('.ksef-table-wrap');
  }).length);
  check(wide === 0, `only tables scroll inside their own box (${wide} elements outside the screen)`);
  const nameWidth = await page.locator('li.ksef-file > span').first().evaluate((el) => el.getBoundingClientRect().width);
  check(nameWidth >= 200, `the file name keeps its own line next to the buttons (${Math.round(nameWidth)}px wide)`);
  await close();
}

console.log('\n=== no word split inside a table cell ===');
for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 800 }]) {
  const { page, close } = await open({ viewport });
  await page.locator('#ksefFileInput').setInputFiles(files.filter((f) => f.name === 'wiele-stawek.xml'));
  await page.locator('.ksef-preview table').first().waitFor();
  // A word drawn on two lines has two client rectangles.
  const split = await page.evaluate(() => {
    const out: string[] = [];
    for (const cell of Array.from(document.querySelectorAll('.ksef-preview td, .ksef-preview th'))) {
      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.textContent ?? '';
        for (const m of text.matchAll(/\S+/g)) {
          const r = document.createRange();
          r.setStart(n, m.index!);
          r.setEnd(n, m.index! + m[0].length);
          const lines = new Set(Array.from(r.getClientRects()).filter((x) => x.width > 0).map((x) => Math.round(x.top)));
          if (lines.size > 1) out.push(m[0]);
        }
      }
    }
    return out;
  });
  check(split.length === 0, `${viewport.width}px: no word broken across lines in a table${split.length ? ` (${split.slice(0, 5).join(', ')})` : ''}`);
  await close();
}

console.log('\n=== accessibility with an invoice on screen ===');
{
  const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
  for (const theme of ['light', 'dark'] as const) {
    const { page, close } = await open({ colorScheme: theme });
    await page.locator('#ksefFileInput').setInputFiles(files.filter((f) => ['wiele-stawek.xml', 'mf-upo.xml'].includes(f.name)));
    await page.locator('.ksef-preview').waitFor();
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), theme === 'dark');
    await page.waitForTimeout(400);
    await page.addScriptTag({ content: axeSource });
    const res = await page.evaluate(async () => (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe.run({ include: [['main']] }, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }));
    const v = res.violations.flatMap((x) => x.nodes.map((n) => `${x.id} ${n.target.join(' ')}`));
    check(v.length === 0, `${theme}: axe clean${v.length ? `\n      ${v.slice(0, 6).join('\n      ')}` : ''}`);
    await close();
  }
}

console.log('\n=== the guide in a browser ===');
{
  const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
  for (const theme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({ locale: 'pl-PL', serviceWorkers: 'block', colorScheme: theme });
    await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
    const page = await ctx.newPage();
    await page.goto(GUIDE, { waitUntil: 'networkidle' });
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), theme === 'dark');
    await page.waitForTimeout(400);
    await page.addScriptTag({ content: axeSource });
    const res = await page.evaluate(async () => (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe.run({ include: [['main']] }, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }));
    const v = res.violations.flatMap((x) => x.nodes.map((n) => `${x.id} ${n.target.join(' ')}`));
    check(v.length === 0, `guide ${theme}: axe clean${v.length ? `\n      ${v.slice(0, 6).join('\n      ')}` : ''}`);
    await ctx.close();
  }
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto(GUIDE, { waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const outside = await page.evaluate(() => Array.from(document.querySelectorAll('article *')).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && !el.closest('.ksef-table-wrap');
  }).length);
  check(overflow <= 0 && outside === 0, `guide at 375 px: no sideways scroll (${overflow}px), nothing outside the screen but the table (${outside})`);
  const images = await page.evaluate(() => Array.from(document.querySelectorAll('article img')).map((i) => (i as HTMLImageElement).alt.length));
  check(images.length === 2 && images.every((n) => n > 40), `two pictures with alt text (${images.join(', ')})`);
  await ctx.close();
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
