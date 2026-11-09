// Audit finding (fresh scanning round, app/guides/[locale]/[category]/page.tsx and
// app/guides/[locale]/[category]/[slug]/page.tsx) — neither route called Next's notFound() for
// genuinely nonexistent content: an unrecognized slug rendered a normal 200 "article not found"
// MESSAGE (not a real 404 status), and an unrecognized category rendered a normal 200 "no
// articles" page whose own <h1> even echoed the raw, invalid category string verbatim
// (getCategoryLabel()'s fallback). Since dynamicParams isn't disabled for either route, Next.js
// renders ANY path matching the route shape, not just the ones generateStaticParams()
// enumerates — so an arbitrary invalid URL (a typo, an old bookmark, a scraper probing random
// slugs) produced a "valid-looking", HTTP 200, indexable page instead of a real 404: unbounded
// soft-404 URL space that search engines waste crawl budget on.
//
// Fixed by calling notFound() in both routes when the requested category/slug genuinely doesn't
// exist in the actual guide content (checked via getAllCategories()/getArticle() — the same
// source of truth generateStaticParams() itself uses).
//
// This drives a real Next.js server (dev or production, via E2E_BASE_URL) with Playwright and
// checks the actual HTTP response status of page.goto() — the only way to prove the real,
// framework-level status code changed, as opposed to just the rendered page content.

import { chromium } from 'playwright';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else { console.log(`  FAIL ${msg}`); fails++; }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

console.log('=== a genuinely invalid article slug returns a real 404, not a 200 "not found" message ===');
{
  const res = await page.goto(`${BASE_URL}/guides/guides/merge-pdf/this-slug-does-not-exist-xyz123`, { waitUntil: 'load' });
  check(res !== null && res.status() === 404, `invalid slug -> HTTP 404 (got: ${res?.status()})`);
}

console.log('\n=== a genuinely invalid category returns a real 404, not a 200 "no articles" page ===');
{
  const res = await page.goto(`${BASE_URL}/guides/guides/this-category-does-not-exist-xyz123`, { waitUntil: 'load' });
  check(res !== null && res.status() === 404, `invalid category -> HTTP 404 (got: ${res?.status()})`);
  const bodyText = await page.locator('body').innerText();
  check(!bodyText.includes('this-category-does-not-exist-xyz123'), 'the invalid category string is NOT echoed back into the page as a fake heading (old getCategoryLabel() fallback)');
}

// Search Console (2026-11-09) listed /guides/undefined: an unknown language segment rendered the
// English hub with HTTP 200, and so did /guides/<anything>/<category>. And every guides 404 was
// Next's bare error document, without the site's header and footer.
console.log('\n=== an unknown language segment is a real 404 too, and every guides 404 has the site header ===');
for (const path of [
  '/guides/undefined',
  '/guides/xyz-no-such-language',
  '/guides/xyz-no-such-language/compress-pdf',
  '/guides/xyz-no-such-language/compress-pdf/how-to-compress-pdf-online',
  '/guides/guides/this-category-does-not-exist-xyz123',
  '/guides/przewodnik/compress-pdf/this-slug-does-not-exist-xyz123',
]) {
  const res = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'load' });
  check(res !== null && res.status() === 404, `${path} -> HTTP 404 (got: ${res?.status()})`);
  const header = await page.locator('header').count();
  check(header > 0, `${path}: the 404 page has the site header (got ${header})`);
  // Next adds its own noindex next to the page's: every robots tag must say noindex.
  const robots = await page.locator('meta[name="robots"]').evaluateAll((els) => els.map((e) => e.getAttribute('content') ?? ''));
  check(robots.length > 0 && robots.every((r) => /noindex/.test(r)), `${path}: every robots tag is noindex (got ${JSON.stringify(robots)})`);
}

console.log('\n=== sanity: a REAL category and a REAL article slug still render normally (200) ===');
{
  const catRes = await page.goto(`${BASE_URL}/guides/guides/merge-pdf`, { waitUntil: 'load' });
  check(catRes !== null && catRes.status() === 200, `real category (merge-pdf) -> HTTP 200 (got: ${catRes?.status()})`);
  const artRes = await page.goto(`${BASE_URL}/guides/guides/merge-pdf/how-to-merge-pdf-online`, { waitUntil: 'load' });
  check(artRes !== null && artRes.status() === 200, `real article -> HTTP 200 (got: ${artRes?.status()})`);
}

await browser.close();

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
