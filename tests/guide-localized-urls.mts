// Guide addresses in each language (plan item 5, 2026-11-14) — lib/guide-urls.ts.
//
// Before: every language used the English ids, e.g. /guides/przewodnik/compress-pdf/how-to-compress-pdf-online.
// After:  /guides/przewodnik/kompresuj-pdf/jak-skutecznie-skompresowac-pdf-online, and the old
// address answers 308 (next.config.ts). Checks: every guide has an address in every language, in a
// safe shape, unambiguous; addresses resolve back (also percent-encoded); every old address has a
// redirect to the new one and nothing redirects in a loop; the sitemap and the pages use the new
// addresses; and an address once published never changes (tests/fixtures/published-guide-urls.json).
//
// Run: npx tsx tests/guide-localized-urls.mts
import { readFileSync } from 'node:fs';
import { locales, type Locale } from '../lib/i18n';
import { getAllArticles } from '../lib/guides';
import { GUIDE_CATEGORY_SLUGS } from '../lib/guide-category-slugs';
import { GUIDE_ARTICLE_SLUGS } from '../lib/guide-article-slugs';
import { GUIDES_HUB_SEGMENTS } from '../lib/guides-hub-segments';
import {
  categorySegment, articleSegment, guideArticlePath, guideCategoryPath, resolveCategorySegment,
  resolveArticleSegment, translateGuidePath, encodePath,
} from '../lib/guide-urls';

let fails = 0;
const check = (ok: boolean, msg: string) => { if (!ok) { console.log(`FAIL: ${msg}`); fails++; } };
const pass = (msg: string) => console.log(`PASS: ${msg}`);
const articles = getAllArticles();

// 1. Complete, English unchanged.
let missing = 0;
for (const a of articles) {
  for (const l of locales) {
    if (!GUIDE_CATEGORY_SLUGS[a.category]?.[l]) { missing++; check(false, `no category address: ${a.category} ${l}`); }
    if (!GUIDE_ARTICLE_SLUGS[a.category]?.[a.slug]?.[l]) { missing++; check(false, `no article address: ${a.slug} ${l}`); }
  }
  check(categorySegment('en', a.category) === a.category && articleSegment('en', a.category, a.slug) === a.slug,
    `English address of ${a.slug} is the original id`);
}
if (!missing) pass(`${articles.length} guides have a category and article address in all ${locales.length} languages; English unchanged`);

// 2. Shape.
const LATIN = new Set(['pl', 'de', 'es', 'fr', 'it', 'pt', 'sv', 'no', 'is', 'tr', 'en', 'id', 'nl', 'da', 'ro', 'cs', 'vi']);
let bad = 0;
for (const l of locales) {
  const all = [
    ...Object.values(GUIDE_CATEGORY_SLUGS).map((r) => r[l]!),
    ...Object.values(GUIDE_ARTICLE_SLUGS).flatMap((arts) => Object.values(arts).map((r) => r[l]!)),
  ];
  for (const s of all) {
    const ok = LATIN.has(l)
      ? /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)
      : /^[\p{L}\p{M}\p{N}]+(?:-[\p{L}\p{M}\p{N}]+)*$/u.test(s) && s === s.normalize('NFC') && s === s.toLocaleLowerCase();
    if (!ok || s.length > 64) { bad++; check(false, `${l} address segment "${s}" — lowercase letters/digits joined by "-", at most 64`); }
  }
}
if (!bad) pass('every address segment: lowercase letters and digits joined by "-" (ASCII in Latin-script languages), ≤ 64 characters');

// 3. Unambiguous within a language.
for (const l of locales) {
  const cats = Object.entries(GUIDE_CATEGORY_SLUGS).map(([, r]) => r[l]!);
  check(new Set(cats).size === cats.length, `${l}: two categories share an address`);
  for (const [c, r] of Object.entries(GUIDE_CATEGORY_SLUGS)) {
    const other = GUIDE_CATEGORY_SLUGS[r[l]!];
    check(!other || r[l] === c, `${l}: category ${c}'s address "${r[l]}" is another category's English id`);
  }
  const arts = Object.values(GUIDE_ARTICLE_SLUGS).flatMap((a) => Object.values(a).map((r) => r[l]!));
  check(new Set(arts).size === arts.length, `${l}: two articles share an address`);
}
pass('no two categories or articles share an address in any language, and no address is another category\'s old id');

// 4. Addresses resolve back — as written and percent-encoded; old ids are recognised as old.
let rt = 0;
for (const a of articles) {
  for (const l of locales as readonly Locale[]) {
    for (const seg of [categorySegment(l, a.category), encodeURIComponent(categorySegment(l, a.category))]) {
      const r = resolveCategorySegment(l, seg);
      if (r?.category !== a.category || r.legacy) { rt++; check(false, `${l} category "${seg}" → ${JSON.stringify(r)}`); }
    }
    for (const seg of [articleSegment(l, a.category, a.slug), encodeURIComponent(articleSegment(l, a.category, a.slug))]) {
      const r = resolveArticleSegment(l, a.category, seg);
      if (r?.slug !== a.slug || r.legacy) { rt++; check(false, `${l} article "${seg}" → ${JSON.stringify(r)}`); }
    }
    const oldCat = resolveCategorySegment(l, a.category);
    const oldArt = resolveArticleSegment(l, a.category, a.slug);
    if (oldCat?.category !== a.category || oldArt?.slug !== a.slug) { rt++; check(false, `${l}: old id of ${a.slug} not recognised`); }
    if (oldCat!.legacy !== (categorySegment(l, a.category) !== a.category)) { rt++; check(false, `${l}: old category id ${a.category} legacy flag`); }
  }
}
check(resolveCategorySegment('pl', 'nie-ma-takiej') === null, 'an unknown category is not resolved');
check(resolveArticleSegment('pl', 'compress-pdf', 'nie-ma-takiego') === null, 'an unknown article is not resolved');
if (!rt) pass('every address resolves back to its guide (also percent-encoded); old English ids are recognised and marked as old');

// 5. Language switcher.
const plPath = guideArticlePath('pl', 'compress-pdf', 'how-to-compress-pdf-online');
check(plPath === '/guides/przewodnik/kompresuj-pdf/jak-skutecznie-skompresowac-pdf-online', `pl address: ${plPath}`);
check(translateGuidePath(plPath, 'de', 'pl') === guideArticlePath('de', 'compress-pdf', 'how-to-compress-pdf-online'), 'pl article → de article');
check(translateGuidePath(encodePath(guideArticlePath('ja', 'ocr-pdf', 'how-to-ocr-pdf')), 'pl', 'ja') === guideArticlePath('pl', 'ocr-pdf', 'how-to-ocr-pdf'), 'ja article (percent-encoded) → pl article');
check(translateGuidePath(guideCategoryPath('fr', 'merge-pdf'), 'en', 'fr') === '/guides/guides/merge-pdf', 'fr category → en category');
check(translateGuidePath('/guides/przewodnik', 'de', 'pl') === '/guides/anleitungen', 'hub → hub');
check(translateGuidePath('/guides/przewodnik/xyz/abc', 'de', 'pl') === '/guides/anleitungen', 'unknown address → hub');
pass('the language switcher translates hub, category and article addresses');

// 6. Redirects of the old addresses (next.config.ts).
const cfgMod = await import('../next.config');
const cfg = ((cfgMod as { default: { default?: unknown } }).default.default ?? (cfgMod as { default: unknown }).default) as { redirects: () => Promise<{ source: string; destination: string; permanent: boolean }[]> };
const redirects = await cfg.redirects();
const bySource = new Map(redirects.map((r) => [r.source, r]));
const LEGACY = ['ar', 'de', 'es', 'fa', 'fr', 'hi', 'is', 'it', 'ja', 'no', 'pl', 'pt', 'sv', 'tr', 'zh'] as const;
let rd = 0;
for (const l of LEGACY) {
  const hub = GUIDES_HUB_SEGMENTS[l];
  for (const a of articles) {
    const pairs: [string, string][] = [
      [`/guides/${hub}/${a.category}/${a.slug}`, guideArticlePath(l, a.category, a.slug)],
    ];
    if (categorySegment(l, a.category) !== a.category) pairs.push([`/guides/${hub}/${a.category}`, guideCategoryPath(l, a.category)]);
    for (const [from, to] of pairs) {
      for (const src of [from, encodePath(from)]) {
        const r = bySource.get(src);
        if (!r || !r.permanent || r.destination !== encodePath(to)) { rd++; check(false, `no 308 ${src} → ${to}`); }
      }
    }
  }
}
const guideRedirects = redirects.filter((r) => r.source.startsWith('/guides/'));
for (const r of guideRedirects) {
  if (/[^\x21-\x7e]/.test(r.destination)) { rd++; check(false, `redirect destination is not ASCII: ${r.destination}`); }
  if (bySource.has(r.destination) || bySource.has(decodeURIComponent(r.destination))) { rd++; check(false, `redirect chain/loop at ${r.destination}`); }
}
check(redirects.length < 1500, `${redirects.length} redirects — Vercel allows 2048 routes in total`);
if (!rd) pass(`every old address of the ${LEGACY.length} earlier languages answers 308 to its new address (${guideRedirects.length} guide redirects, as written and percent-encoded, no chains)`);

// 7. Sitemap and pages use the new addresses.
const sitemap = (await import('../app/sitemap')).default();
const guideUrls = sitemap.map((p) => p.url).filter((u) => u.includes('/guides/'));
const legacyInSitemap = guideUrls.filter((u) => {
  const segs = new URL(u).pathname.split('/').filter(Boolean);
  if (segs.length < 3) return false;
  const loc = (Object.entries(GUIDES_HUB_SEGMENTS).find(([, h]) => h === decodeURIComponent(segs[1]!))?.[0] ?? 'en') as Locale;
  return resolveCategorySegment(loc, segs[2]!)?.legacy !== false
    || (segs[3] !== undefined && resolveArticleSegment(loc, resolveCategorySegment(loc, segs[2]!)!.category, segs[3])?.legacy !== false);
});
check(legacyInSitemap.length === 0, `sitemap lists old addresses: ${legacyInSitemap.slice(0, 3).join(', ')}`);
const plArticle = sitemap.find((p) => p.url === `https://optimapdf.com${plPath}`);
check(!!plArticle && plArticle.alternates?.languages?.de === `https://optimapdf.com${guideArticlePath('de', 'compress-pdf', 'how-to-compress-pdf-online')}`,
  'sitemap: the pl article with its de alternate');
pass(`sitemap: ${guideUrls.length} guide addresses, all in their language`);

const slugPage = readFileSync('app/guides/[locale]/[category]/[slug]/page.tsx', 'utf8');
const catPage = readFileSync('app/guides/[locale]/[category]/page.tsx', 'utf8');
check(/category: categorySegment\(locale, article\.category\)/.test(slugPage) && /slug: articleSegment\(locale, article\.category, article\.slug\)/.test(slugPage),
  'article pages are generated at the new addresses');
check(/category: categorySegment\(locale, cat\)/.test(catPage), 'category pages are generated at the new addresses');
check(/permanentRedirect\(encodePath\(guideArticlePath/.test(slugPage) && /permanentRedirect\(encodePath\(guideCategoryPath/.test(catPage),
  'pages redirect an old address that reaches them (fallback to next.config.ts)');
const builders = ['app/guides/[locale]/page.tsx', 'components/ToolGuide.tsx', 'components/pages/HomeView.tsx', 'lib/guides-canonical.ts', 'app/sitemap.ts']
  .filter((f) => /\/guides\/\$\{[^}]+\}\/\$\{[^}]*(?:cat|category)\}/.test(readFileSync(f, 'utf8')));
check(builders.length === 0, `guide links built from the English ids: ${builders.join(', ')}`);
pass('pages, links and the canonical address use lib/guide-urls.ts');

// 8. A published address never changes (additions are fine).
const published = JSON.parse(readFileSync('tests/fixtures/published-guide-urls.json', 'utf8')) as {
  categories: Record<string, Record<string, string>>; articles: Record<string, Record<string, Record<string, string>>>;
};
let moved = 0;
for (const [c, r] of Object.entries(published.categories)) for (const [l, s] of Object.entries(r)) {
  if (GUIDE_CATEGORY_SLUGS[c]?.[l] !== s) { moved++; check(false, `published category address changed: ${c} ${l} "${s}" → "${GUIDE_CATEGORY_SLUGS[c]?.[l]}"`); }
}
for (const [c, arts] of Object.entries(published.articles)) for (const [slug, r] of Object.entries(arts)) for (const [l, s] of Object.entries(r)) {
  if (GUIDE_ARTICLE_SLUGS[c]?.[slug]?.[l] !== s) { moved++; check(false, `published article address changed: ${slug} ${l} "${s}"`); }
}
if (!moved) pass('every published address is unchanged (tests/fixtures/published-guide-urls.json)');

console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL PASS');
process.exit(fails ? 1 : 0);
