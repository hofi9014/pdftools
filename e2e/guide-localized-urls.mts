// Guide addresses in each language on the built site (plan item 5, 2026-11-14; lib/guide-urls.ts).
//
// Old addresses (English ids under a non-English hub) answer 308 with the new address; the new
// address is the page (200, canonical = itself); English is unchanged; the sitemap lists the new
// addresses; the breadcrumbs name the category and article in the page's language; the language
// switcher opens the same article at its address in the other language.
//
// Run: E2E_BASE_URL=http://localhost:3100 npx tsx e2e/guide-localized-urls.mts   (default: localhost:3000)
import { chromium } from 'playwright';
import { t } from '../lib/i18n';
import { guideArticlePath, guideCategoryPath, encodePath } from '../lib/guide-urls';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) fails++; };
const head = (path: string) => fetch(BASE + path, { redirect: 'manual' });

// 1. Old addresses → 308 to the new one (as written and percent-encoded hubs).
const cases: [string, string][] = [
  ['/guides/przewodnik/compress-pdf/how-to-compress-pdf-online', guideArticlePath('pl', 'compress-pdf', 'how-to-compress-pdf-online')],
  ['/guides/przewodnik/compress-pdf', guideCategoryPath('pl', 'compress-pdf')],
  ['/guides/anleitungen/pdf-to-word/how-to-convert-pdf-to-word', guideArticlePath('de', 'pdf-to-word', 'how-to-convert-pdf-to-word')],
  [`/guides/${encodeURIComponent('دليل')}/merge-pdf/how-to-merge-pdf-online`, guideArticlePath('ar', 'merge-pdf', 'how-to-merge-pdf-online')],
  [`/guides/${encodeURIComponent('指南')}/ocr-pdf/how-to-ocr-pdf`, guideArticlePath('zh', 'ocr-pdf', 'how-to-ocr-pdf')],
  ['/guides/handbaekur/jpg-to-pdf', guideCategoryPath('is', 'jpg-to-pdf')],
];
for (const [from, to] of cases) {
  const r = await head(from);
  const loc = r.headers.get('location') ?? '';
  check(r.status === 308 && decodeURIComponent(new URL(loc, BASE).pathname) === to, `${decodeURIComponent(from)} → ${r.status} ${decodeURIComponent(loc)}`);
  const page = await head(encodePath(to));
  const html = await page.text();
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  check(page.status === 200 && !!canonical && decodeURIComponent(new URL(canonical).pathname) === to, `  ${to} → ${page.status}, canonical = itself`);
}

// 2. English unchanged; an unknown article under a known category is still a 404.
const en = await head('/guides/guides/merge-pdf/how-to-merge-pdf-online');
check(en.status === 200, `English article unchanged → ${en.status}`);
const missing = await head(encodePath(`${guideCategoryPath('pl', 'merge-pdf')}/nie-ma-takiego-artykulu`));
check(missing.status === 404, `unknown article under a localized category → ${missing.status}`);

// 3. Sitemap.
const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decodeURIComponent(new URL(m[1]!.replace(/&amp;/g, '&')).pathname));
check(urls.includes(guideArticlePath('pl', 'compress-pdf', 'how-to-compress-pdf-online')) && urls.includes(guideArticlePath('ja', 'ocr-pdf', 'how-to-ocr-pdf')),
  'sitemap lists the new pl and ja addresses');
check(!urls.includes('/guides/przewodnik/compress-pdf/how-to-compress-pdf-online'), 'sitemap no longer lists the old pl address');

// 4. Breadcrumbs and the language switcher, in a browser.
const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'pl-PL' });
const plArticle = guideArticlePath('pl', 'compress-pdf', 'how-to-compress-pdf-online');
await page.goto(BASE + encodePath(plArticle), { waitUntil: 'networkidle' });
const crumbs = (await page.locator('nav[aria-label="Breadcrumb"] li').allInnerTexts()).map((s) => s.replace(/^[\s/]+/, '').trim());
const h1 = (await page.locator('h1').first().innerText()).trim();
check(crumbs[2] === t('tool.compress', 'pl') && crumbs[3] === h1, `breadcrumbs: ${crumbs.join(' / ')}`);
await page.locator('button[aria-label$=": Przełącz język"]').click();
await page.locator('button, a', { hasText: 'Deutsch' }).first().click();
await page.waitForURL((u) => decodeURIComponent(u.pathname).startsWith('/guides/anleitungen/'), { timeout: 15000 });
await page.waitForLoadState('networkidle');
const dePath = decodeURIComponent(new URL(page.url()).pathname);
check(dePath === guideArticlePath('de', 'compress-pdf', 'how-to-compress-pdf-online'), `language switcher pl → de opens the same article: ${dePath}`);
await browser.close();

console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL PASS');
process.exit(fails ? 1 : 0);
