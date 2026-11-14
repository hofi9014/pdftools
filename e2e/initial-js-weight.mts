// What a tool page makes the browser download before a file is chosen (plan 1.4, 2026-11-12).
//
// Measured on a production build before the change: the scripts in the HTML of a tool page were
// 1.28-1.43 MB (a plain page such as /pl/faq: 0.63 MB) because the PDF engine came with the page,
// and after load every page of the site — home page included — fetched 2.98 MB (846 kB brotli):
// the engine of every tool (header links are prefetched) plus all guides in 16 languages, which
// the breadcrumbs loaded to find one article title. After: tool pages ~0.68 MB in their HTML,
// the home page and FAQ ~1.48 MB (403 kB brotli) in total, a tool page with its engine fetched
// in the background ~2.1-2.2 MB (619-657 kB brotli).
//
// Checks: (1) no tool page has the engine (pdf-lib) among the scripts of its HTML, and none
// carries more than a plain page plus a margin; (2) the home page and FAQ never fetch the engine
// or the guides; (3) a tool page fetches its engine on its own once idle (ready and cached for
// offline use before a file is chosen); (4) a guide article still gets its title as the last crumb.
//
// Run: E2E_BASE_URL=http://localhost:3100 npx tsx e2e/initial-js-weight.mts   (default: localhost:3000)
import { chromium, type Page } from 'playwright';
import { tools } from '../lib/tools';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) fails++; };

const PDF_LIB = /Expected instance of PDFDocument|PDFDocument\.load/;
const GUIDES = /how-to-compress-pdf-online/;

const bodies = new Map<string, string>();
async function body(url: string): Promise<string> {
  let b = bodies.get(url);
  if (b === undefined) { b = await (await fetch(url)).text(); bodies.set(url, b); }
  return b;
}
async function htmlScripts(path: string): Promise<{ bytes: number; engine: boolean }> {
  const html = await (await fetch(BASE + path)).text();
  // next start serves /_next/static/chunks/…, Vercel /_next/static/immutable/chunks/….
  const srcs = [...new Set([...html.matchAll(/\/_next\/static\/(?:immutable\/)?chunks\/[^"']+\.js/g)].map((m) => m[0]))];
  let bytes = 0, engine = false;
  for (const s of srcs) { const b = await body(BASE + s); bytes += Buffer.byteLength(b); if (PDF_LIB.test(b)) engine = true; }
  return { bytes, engine };
}

// 1. Scripts in the HTML of every tool page.
const plain = await htmlScripts('/pl/faq');
check(plain.bytes > 100_000 && !plain.engine, `/pl/faq HTML scripts: ${(plain.bytes / 1024).toFixed(0)} kB, no engine`);
const LIMIT = plain.bytes + 150 * 1024;
const heavy: string[] = [];
const withEngine: string[] = [];
let max = 0;
for (const t of tools) {
  const r = await htmlScripts(`/pl/${t.slug}`);
  max = Math.max(max, r.bytes);
  if (r.engine) withEngine.push(t.slug);
  if (r.bytes > LIMIT) heavy.push(`${t.slug} ${(r.bytes / 1024).toFixed(0)} kB`);
}
check(withEngine.length === 0, `no tool page ships the PDF engine in its HTML${withEngine.length ? ': ' + withEngine.join(', ') : ''}`);
check(heavy.length === 0, `every tool page's HTML scripts ≤ plain page + 150 kB (largest ${(max / 1024).toFixed(0)} kB)${heavy.length ? ': ' + heavy.join(', ') : ''}`);

// 2-4. In a browser, with the service worker blocked so every fetch is seen.
const browser = await chromium.launch();
async function visit(path: string, wait: number, fn?: (p: Page) => Promise<void>): Promise<string[]> {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const scripts: string[] = [];
  page.on('response', (r) => { if (r.request().resourceType() === 'script' && r.url().startsWith(BASE)) scripts.push(r.url()); });
  await page.goto(BASE + encodeURI(path), { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
  if (fn) await fn(page);
  await ctx.close();
  return [...new Set(scripts)];
}
async function fetched(urls: string[], re: RegExp): Promise<boolean> {
  for (const u of urls) if (re.test(await body(u))) return true;
  return false;
}

for (const p of ['/pl', '/pl/faq', '/de']) {
  const urls = await visit(p, 4000);
  check(!(await fetched(urls, PDF_LIB)), `${p}: the PDF engine is not fetched (${urls.length} scripts)`);
  check(!(await fetched(urls, GUIDES)), `${p}: the guides are not fetched`);
}

for (const slug of ['merge', 'compress', 'edit-pdf', 'word-to-pdf']) {
  const urls = await visit(`/pl/${slug}`, 5000);
  check(await fetched(urls, PDF_LIB), `/pl/${slug}: the engine is fetched in the background without any action`);
}

const article = '/guides/przewodnik/compress-pdf/how-to-compress-pdf-online';
await visit(article, 1500, async (page) => {
  const h1 = (await page.locator('h1').first().innerText()).trim();
  const crumb = (await page.locator('nav[aria-label="Breadcrumb"] li').last().innerText()).replace(/^[\s/›>]+/, '').trim();
  check(h1.length > 10 && crumb === h1, `guide article: last crumb is the article title ("${crumb}")`);
});

await browser.close();
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL PASS');
process.exit(fails ? 1 : 0);
