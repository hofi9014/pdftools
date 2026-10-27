// Each page carries one language, and every component on it renders in that language.
//
// Until 2026-10-22 lib/i18n.ts held all 16 dictionaries, and every page downloaded and parsed them
// in one script (918 kB, 176 kB over the wire with brotli) to use one. The dictionaries now live
// in lib/translations/<locale>.ts; the browser bundle gets none (package.json "imports",
// '#translations' → none.ts for the browser) and app/_root/RootDocument.tsx hands the page its
// own dictionary as data (components/Translations.tsx).
//
// That only works if every client component asks for the page's language. Ten did not: they took
// the visitor's stored language (lib/locale-context.tsx useHydrationSafeLocale) — on /de/edit-pdf
// the editor's toolbar said "Select (V)", or "Zaznacz (V)" with Polish stored. Measured on
// production before the change; checked here in a real browser.
//
// Needs the BUILT site (next start): `next dev` bundles differently.
import { chromium, type Page } from 'playwright';
import { locales, t, type Locale } from '../lib/i18n.ts';
import { localeGuidesSlug } from '../lib/guides-slugs.ts';
import { getAllArticles } from '../lib/guides.ts';
import { buildCanonicalUrl } from '../lib/guides-canonical.ts';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

// A string the page never renders, so finding it means a dictionary was shipped, not a label shown.
const PROBE = 'page.unlock.optional';
const probes = new Map<Locale, string>();
for (const l of locales) {
  const v = t(PROBE, l);
  if (locales.every((o) => o === l || t(PROBE, o) !== v)) probes.set(l, v);
}

async function pageBytes(path: string): Promise<{ html: string; js: string; messages: string; messageSrcs: string[] }> {
  const html = await (await fetch(BASE_URL + encodeURI(decodeURI(path)))).text();
  const srcs = [...new Set([...html.matchAll(/src="(\/_next\/static\/(?:immutable\/)?chunks\/[^"]+\.js)"/g)].map((m) => m[1]!))];
  let js = '';
  for (const s of srcs) js += await (await fetch(BASE_URL + s)).text();
  // The page's dictionary script (lib/i18n-asset.ts), one per language.
  const messageSrcs = [...new Set([...html.matchAll(/\/([a-z]{2})\/messages\.js\?v=[0-9a-f]+/g)].map((m) => m[0]))];
  let messages = '';
  for (const s of messageSrcs) messages += await (await fetch(BASE_URL + s)).text();
  return { html, js, messages, messageSrcs };
}

// JSON inside the page's data is escaped; compare on the raw text the way it appears there.
const present = (hay: string, needle: string) => hay.includes(needle) || hay.includes(JSON.stringify(needle).slice(1, -1));

console.log(`=== what each page downloads (${probes.size} languages with a distinct probe string) ===`);
{
  const article = getAllArticles()[0]!;
  const cases: Array<[string, Locale]> = [
    ['/pl', 'pl'], ['/de/merge', 'de'], ['/ar/compress', 'ar'], ['/ja/edit-pdf', 'ja'], ['/fa/privacy', 'fa'],
    ['/hi/faq', 'hi'], ['/en/help', 'en'], [`/guides/${localeGuidesSlug.de}`, 'de'],
    [new URL(buildCanonicalUrl(article, 'zh')).pathname, 'zh'],
  ];
  for (const [path, locale] of cases) {
    const { html, js, messages, messageSrcs } = await pageBytes(path);
    const others = [...probes].filter(([l, v]) => l !== locale && (present(js, v) || present(html, v) || present(messages, v))).map(([l]) => l);
    const own = probes.get(locale);
    check(others.length === 0, `${path}: no other language's dictionary in its HTML or scripts${others.length ? ` (found: ${others.join(', ')})` : ''}`);
    // Since 2026-10-27 the dictionary is one cached script per language, not page data: four
    // copies of it in every prerendered page made up ~250 MB of each deployment.
    check(messageSrcs.length === 1 && messageSrcs[0]!.startsWith(`/${locale}/messages.js?v=`), `${path}: loads exactly its own language's dictionary script (${messageSrcs.join(', ')})`);
    if (own) check(present(messages, own) && !present(html, own) && !present(js, own), `${path}: its own dictionary comes in that script, not in the page or the app code`);
  }
}

console.log('\n=== page texts: each page carries its own language only ===');
{
  // Before: the FAQ, help, principles, support, terms and legal pages and the home page's guide
  // cards held their text in all 16 languages in client code (tests/localize-page-data.mts).
  const { faqData } = await import('../content/pages/faq.ts');
  const { helpData } = await import('../content/pages/help.ts');
  const { content: rules } = await import('../content/pages/nasze-zasady.ts');
  const { content: support } = await import('../content/pages/wsparcie.ts');
  const { content: terms } = await import('../content/pages/terms.ts');
  const { legalTexts } = await import('../lib/legal/index.ts');
  const { homeGuideCards } = await import('../lib/guide-cards.ts');
  const card = homeGuideCards()[0]!;
  const pick: Array<[string, (l: Locale) => string | undefined]> = [
    ['faq', (l) => faqData[0]!.items[0]!.a[l]],
    ['help', (l) => helpData[0]!.items[0]!.a[l]],
    ['nasze-zasady', (l) => (rules as Record<string, { sections: Array<{ h: string }> }>)[l]?.sections[0]?.h],
    ['wsparcie', (l) => (support as Record<string, { subtitle: string }>)[l]?.subtitle],
    ['terms', (l) => (terms as Record<string, { sections: Array<{ p?: string }> }>)[l]?.sections[0]?.p],
    ['privacy', (l) => legalTexts[l].privacy.sections[0]?.p],
    ['', (l) => card.excerpt[l]],
  ];
  for (const [page, text] of pick) {
    for (const locale of ['pl', 'ja', 'ar'] as Locale[]) {
      const path = `/${locale}${page ? '/' + page : ''}`;
      const { html, js } = await pageBytes(path);
      const others = locales.filter((l) => l !== locale).filter((l) => {
        const v = text(l);
        return v && v !== text(locale) && v.length > 20 && (present(js, v) || present(html, v.slice(0, 60)));
      });
      const own = text(locale);
      check(others.length === 0 && !!own && present(html, own.slice(0, 60)), `${path}: its text in its language only${others.length ? ` (also: ${others.join(', ')})` : ''}`);
    }
  }
}

console.log('\n=== every component renders in the page language (real browser, a different language stored) ===');
const browser = await chromium.launch();
async function open(stored: Locale | null): Promise<{ page: Page; problems: string[] }> {
  const ctx = await browser.newContext({ locale: 'en-US' });
  if (stored) await ctx.addInitScript((s) => { try { localStorage.setItem('locale', s); } catch { /* ignore */ } }, stored);
  const page = await ctx.newPage();
  const problems: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' && /\[i18n\]|Minified React error #4(18|19|23|25)|[Hh]ydration/.test(m.text())) problems.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message.slice(0, 160)));
  return { page, problems };
}

{
  const { page, problems } = await open('pl');
  await page.goto(BASE_URL + '/de/edit-pdf', { waitUntil: 'networkidle' });
  await page.setInputFiles('input[type=file]', 'test-real-pdfs/chrome-report.pdf');
  await page.waitForSelector(`button[title^="${t('edit.toolbar_select', 'de')}"]`, { timeout: 30000 }).catch(() => {});
  const titles = await page.$$eval('button[title]', (bs) => bs.map((b) => b.getAttribute('title') ?? ''));
  const select = titles.find((x) => /\(V\)$/.test(x)) ?? '(none)';
  check(select.startsWith(t('edit.toolbar_select', 'de')), `/de/edit-pdf with Polish stored: the editor toolbar is German ("${select}")`);
  check(problems.length === 0, `no missing language or hydration error${problems.length ? `: ${problems.join(' | ')}` : ''}`);
  await page.context().close();
}

{
  const { page, problems } = await open('pl');
  await page.goto(BASE_URL + '/de/delete-pages', { waitUntil: 'networkidle' });
  await page.setInputFiles('input[type=file]', 'test-real-pdfs/chrome-report.pdf');
  await page.waitForTimeout(3000);
  const body = await page.locator('body').innerText();
  check(body.includes(t('preview.heading.delete', 'de')) && !body.includes(t('preview.heading.delete', 'pl')), '/de/delete-pages with Polish stored: the page thumbnails speak German');
  check(problems.length === 0, `no missing language or hydration error${problems.length ? `: ${problems.join(' | ')}` : ''}`);
  await page.context().close();
}

{
  const { page, problems } = await open(null);
  const visited: string[] = [];
  for (const path of ['/pl', '/ar/compress', '/fa/privacy', '/hi/faq', '/ja/help', '/tr/sign-pdf', '/zh/pdf-to-word', '/sv/nasze-zasady', '/is/wsparcie', '/no/terms', `/guides/${localeGuidesSlug.ja}`]) {
    await page.goto(BASE_URL + encodeURI(path), { waitUntil: 'networkidle' });
    visited.push(path);
  }
  check(problems.length === 0, `${visited.length} pages in 11 languages load without a missing language or hydration error${problems.length ? `: ${problems.join(' | ')}` : ''}`);
  await page.context().close();
}

{
  // Switching language keeps the same root layout: the new page must bring its own dictionary.
  const { page, problems } = await open('pl');
  await page.goto(BASE_URL + '/pl/merge', { waitUntil: 'networkidle' });
  await page.click(`button[aria-label="${t('lang.switch', 'pl')}"]`);
  await page.click('button:has-text("العربية")');
  await page.waitForURL('**/ar/merge', { timeout: 20000 });
  await page.waitForFunction(() => document.documentElement.lang === 'ar', null, { timeout: 20000 });
  const nav = await page.locator('header').innerText();
  check(nav.includes(t('nav.home', 'ar')) && !nav.includes(t('nav.home', 'pl')), `/pl/merge → العربية: the header is Arabic ("${t('nav.home', 'ar')}")`);
  const h1 = await page.locator('h1').first().innerText();
  check(h1.includes(t('tool.merge', 'ar')), `the tool heading is Arabic ("${h1}")`);
  check(problems.length === 0, `no missing language or hydration error${problems.length ? `: ${problems.join(' | ')}` : ''}`);
  await page.context().close();
}

// [address, stored language, language the header ends up in]: the address language wins.
for (const [path, stored, shown] of [['/xx/nie-ma', 'pl', 'pl'], ['/pl/nie-ma-takiej-strony', null, 'pl'], ['/ja/nope', 'de', 'ja'], ['/a/b/c', 'de', 'de']] as Array<[string, Locale | null, Locale]>) {
  // The 404 page has no language in its address: it follows the stored one, so it loads all 16.
  // It also threw React error #418 on every unknown address until 2026-10-22: it is built once,
  // under /_not-found, so the breadcrumb trail in its HTML ("Home / _not found") never matched the
  // one the browser built from the real address. The 404 page now has no trail.
  const { page, problems } = await open(stored);
  const res = await page.goto(BASE_URL + path, { waitUntil: 'load' });
  const home = t('nav.home', shown);
  await page.waitForFunction((s) => document.querySelector('header')?.textContent?.includes(s), home, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const nav = await page.locator('header').innerText();
  check(res?.status() === 404 && nav.includes(home), `404 at ${path}${stored ? ` with ${stored} stored` : ''}: the header says "${home}"`);
  check(!(await page.content()).includes('_not found'), `${path}: no "Home / _not found" trail`);
  check(problems.length === 0, `${path}: no missing language or hydration error${problems.length ? `: ${problems.join(' | ')}` : ''}`);
  await page.context().close();
}

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
