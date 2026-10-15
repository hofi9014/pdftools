// Accessibility in a real browser, measured with axe-core (the engine behind Lighthouse's
// accessibility score) on a spread of pages in both themes, plus what axe cannot see:
// the skip link is the first thing Tab reaches and actually moves focus to the content.
//
// Before 2026-10-15: 143 text elements below WCAG AA contrast (grey descriptions on the home
// page, gold accent text and white text on gold buttons), unlabelled fields on /sign-pdf and
// /ocr-pdf, two <main> landmarks and no <h1> on the home page and six info pages, heading
// levels jumping from h1 to h3 on 31 tool pages, a 20 px password toggle, no skip link.
//
// Fails on any violation of the rules listed in ENFORCED. Run against a dev or production
// server: E2E_BASE_URL (default http://localhost:3000).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const PAGES = [
  'pl', 'en', 'ar', 'pl/merge', 'pl/compress', 'pl/pdf-to-word', 'pl/edit-pdf', 'pl/sign-pdf', 'pl/ocr-pdf',
  'pl/protect-pdf', 'pl/unlock-pdf', 'pl/split', 'pl/ai-chat', 'pl/watermark-pdf', 'pl/privacy', 'pl/rodo',
  'pl/security', 'pl/terms', 'pl/faq', 'pl/help', 'pl/nasze-zasady', 'pl/wsparcie', 'pl/guide', 'de/merge', 'ar/privacy',
];
const ENFORCED = new Set([
  'color-contrast', 'label', 'select-name', 'landmark-no-duplicate-main', 'landmark-main-is-top-level',
  'page-has-heading-one', 'heading-order', 'target-size', 'image-redundant-alt', 'button-name', 'link-name',
  'html-has-lang', 'document-title', 'aria-allowed-attr', 'aria-valid-attr-value', 'duplicate-id-aria',
]);

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

type AxeResult = { violations: { id: string; nodes: { target: string[] }[] }[] };
const browser = await chromium.launch();

console.log('\n=== axe on every page, light and dark ===');
for (const theme of ['light', 'dark'] as const) {
  for (const path of PAGES) {
    const ctx = await browser.newContext({ locale: 'pl-PL', colorScheme: theme, serviceWorkers: 'block' });
    // Answer the cookie question first so the banner does not cover the page being measured
    // (the banner itself is measured once below).
    await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
    const page = await ctx.newPage();
    const resp = await page.goto(`${BASE}/${path}`, { waitUntil: 'networkidle' });
    await page.addScriptTag({ content: axeSource });
    // The watermark preview is a picture of a deliberately faint result (WCAG 1.4.3 "incidental"
    // text); it is aria-hidden and the same words are in the text field above it.
    const res = await page.evaluate(async () => (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<AxeResult> } }).axe.run(
      { exclude: [['[data-watermark-preview]']] },
      { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    ));
    const bad = res.violations.filter((v) => ENFORCED.has(v.id));
    check(resp?.status() === 200 && bad.length === 0,
      `${theme} /${path}: ${bad.map((v) => `${v.id}×${v.nodes.length} (${v.nodes[0]?.target.join(' ').slice(0, 60)})`).join(', ') || 'clean'}`);
    await ctx.close();
  }
}

console.log('\n=== the cookie banner ===');
for (const theme of ['light', 'dark'] as const) {
  const ctx = await browser.newContext({ locale: 'pl-PL', colorScheme: theme, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/pl`, { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(async () => (window as unknown as { axe: { run: (o: unknown) => Promise<AxeResult> } }).axe.run({ include: [['[role="region"]']], runOnly: ['color-contrast', 'button-name', 'link-name'] }));
  check(res.violations.length === 0, `${theme}: banner text and buttons (${res.violations.map((v) => v.id).join(', ') || 'clean'})`);
  await ctx.close();
}

console.log('\n=== skip link ===');
{
  const ctx = await browser.newContext({ locale: 'pl-PL', serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
  const page = await ctx.newPage();
  for (const [path, label] of [['pl/merge', 'Przejdź do treści'], ['de/merge', 'Zum Inhalt springen'], ['ar/merge', 'انتقل إلى المحتوى']] as const) {
    await page.goto(`${BASE}/${path}`, { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => ({ text: document.activeElement?.textContent ?? '', href: document.activeElement?.getAttribute('href') }));
    const box = await page.locator('a[href="#main-content"]').boundingBox();
    check(first.text === label && first.href === '#main-content', `/${path}: Tab reaches "${first.text}" first`);
    check(!!box && box.width > 40 && box.height > 20, `/${path}: and it becomes visible when focused (${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'hidden'})`);
    await page.keyboard.press('Enter');
    check(await page.evaluate(() => document.activeElement?.id) === 'main-content', `/${path}: Enter moves focus to the content`);
  }
  await page.goto(`${BASE}/pl/merge`, { waitUntil: 'networkidle' });
  const hidden = await page.locator('a[href="#main-content"]').boundingBox();
  check(!hidden || hidden.width <= 1, 'without focus the link takes no space');
  await ctx.close();
}

console.log('\n=== reduced motion ===');
{
  const ctx = await browser.newContext({ locale: 'pl-PL', reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/pl`, { waitUntil: 'networkidle' });
  const t = await page.evaluate(() => getComputedStyle(document.querySelector('.coffee-card') as Element).transitionDuration);
  check(parseFloat(t) < 0.01, `tool cards do not animate (transition ${t})`);
  check(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior) === 'auto', 'no smooth scrolling');
  await ctx.close();
}

console.log('\n=== header logo ===');
{
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const sizes: number[] = [];
  page.on('response', async (r) => { if (/\/(logo|icons\/logo)[^/]*\.png/.test(r.url())) sizes.push((await r.body()).length); });
  await page.goto(`${BASE}/pl`, { waitUntil: 'networkidle' });
  check(sizes.length > 0 && Math.max(...sizes) < 30_000, `the header logo downloads ${sizes.map((s) => `${Math.round(s / 1024)} kB`).join(', ')} (was 219 kB)`);
  await ctx.close();
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
