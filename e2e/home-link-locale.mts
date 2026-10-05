// Real-browser proof for tests/home-link-locale.mts: a visitor reading the German merge page in a
// Polish browser.
//
//   - nothing the page loads or prefetches is answered with a redirect (a link to "/" made Next
//     prefetch "/?_rsc=…", which the proxy answers with a 307 — one wasted proxy run per page
//     view; prefetching only happens on a production build, so that check needs `next start` or
//     the deployed site, and is reported as skipped on the dev server),
//   - the logo, the "Home" nav item and the breadcrumb all point at /de,
//   - clicking the logo stays in German instead of jumping to /pl.
//
// Run against a running server: E2E_BASE_URL=http://localhost:3100 npx tsx e2e/home-link-locale.mts

import { chromium } from 'playwright';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'pl-PL', viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
await page.route('https://www.googletagmanager.com/**', (r) => r.abort());

const origin = new URL(BASE_URL).origin;
const redirects: string[] = [];
const prefetches: string[] = [];
page.on('response', (res) => {
  const url = new URL(res.url());
  if (url.origin !== origin) return;
  if (url.searchParams.has('_rsc')) prefetches.push(url.pathname);
  if (res.status() >= 300 && res.status() < 400) redirects.push(`${res.status()} ${url.pathname}`);
});

console.log('=== /de/merge in a Polish browser ===');
await page.goto(`${BASE_URL}/de/merge`, { waitUntil: 'networkidle' });
// Give viewport-triggered prefetches time to go out.
await page.waitForTimeout(2500);

const logoHref = await page.locator('header a').first().getAttribute('href');
const navHomeHref = await page.locator('header nav a').first().getAttribute('href');
const crumbHref = await page.locator('nav[aria-label="Breadcrumb"] a').first().getAttribute('href');
check(logoHref === '/de', `the logo links to /de (got ${logoHref})`);
check(navHomeHref === '/de', `the "Home" nav item links to /de (got ${navHomeHref})`);
check(crumbHref === '/de', `the breadcrumb's first entry links to /de (got ${crumbHref})`);

if (prefetches.length === 0) {
  console.log('  SKIP no prefetch requests seen (dev server) — the redirect check needs a production build');
} else {
  check(redirects.length === 0, `no request of the page is answered with a redirect (${prefetches.length} prefetches; redirects: ${redirects.join(', ') || 'none'})`);
  check(!prefetches.includes('/'), 'the bare root is not prefetched');
}

await page.locator('header a').first().click();
await page.waitForURL((u) => !u.pathname.endsWith('/merge'), { timeout: 15000 }).catch(() => undefined);
await page.waitForLoadState('networkidle');
const landed = new URL(page.url()).pathname;
check(landed === '/de', `clicking the logo stays in German (landed on ${landed})`);
check((await page.getAttribute('html', 'lang')) === 'de', 'the home page it opens is the German one');

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
