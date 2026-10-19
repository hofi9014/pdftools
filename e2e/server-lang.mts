// The HTML the server sends already says which language the page is in and which way it reads —
// before any JavaScript runs.
//
// Until 2026-10-18 the one root layout rendered `<html lang="en">` for every page (/pl, /de/merge,
// /ar/privacy, the Japanese guides…) and components/HtmlLang.tsx corrected `lang`/`dir` only after
// hydration. Search engines that read the raw HTML, link previews, a screen reader announcing the
// page while scripts load, and the first paint of Arabic and Persian pages (laid out left-to-right,
// then flipped) all got the wrong language. Now each branch has its own root layout: app/[locale]
// takes the language from the URL, app/guides/[locale] from its localized segment.
//
// Plain HTTP fetches, no browser: this is exactly what a crawler sees.
import { localeGuidesSlug } from '../lib/guides-slugs.ts';
import { locales, localeToHtmlLang, isRtlLocale, t, type Locale } from '../lib/i18n.ts';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

let fails = 0;
const bad: string[] = [];

function htmlTag(html: string): { lang: string | null; dir: string | null } {
  const tag = /<html\b[^>]*>/i.exec(html)?.[0] ?? '';
  return {
    lang: /\blang="([^"]*)"/.exec(tag)?.[1] ?? null,
    dir: /\bdir="([^"]*)"/.exec(tag)?.[1] ?? null,
  };
}

async function expectLang(path: string, locale: Locale): Promise<void> {
  const res = await fetch(BASE_URL + encodeURI(path), { redirect: 'manual' });
  if (res.status !== 200) { bad.push(`${path}: HTTP ${res.status}`); return; }
  const { lang, dir } = htmlTag(await res.text());
  const wantLang = localeToHtmlLang(locale);
  const wantDir = isRtlLocale(locale) ? 'rtl' : 'ltr';
  if (lang !== wantLang || dir !== wantDir) bad.push(`${path}: <html lang="${lang}" dir="${dir}">, expected lang="${wantLang}" dir="${wantDir}"`);
}

function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const paths: [string, Locale][] = [];
for (const l of locales) {
  for (const p of [`/${l}`, `/${l}/merge`, `/${l}/pdf-to-word`, `/${l}/privacy`, `/${l}/faq`]) paths.push([p, l]);
  paths.push([`/guides/${localeGuidesSlug[l]}`, l]);
}
for (const [p, l] of paths) await expectLang(p, l);
check(bad.length === 0, `${paths.length} pages (home, two tools, privacy, FAQ, guides hub × 16 languages) carry their language and direction in the server HTML${bad.length ? `:\n      ${bad.slice(0, 20).join('\n      ')}${bad.length > 20 ? `\n      … ${bad.length - 20} more` : ''}` : ''}`);

// The guides hub's heading is in its language. Before 2026-10-18 every hub whose segment is not
// plain ASCII (دليل, راهنما, गाइड, ガイド, 指南) rendered its heading and list in English: the page got
// the segment percent-encoded and lib/guides-slugs.ts compared it with the decoded slug.
{
  const wrong: string[] = [];
  const text = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').trim();
  for (const l of locales) {
    const html = await (await fetch(`${BASE_URL}/guides/${encodeURIComponent(localeGuidesSlug[l])}`)).text();
    const h1 = text(/<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '');
    if (h1 !== t('guides.hub_title', l)) wrong.push(`${l}: "${h1}" (expected "${t('guides.hub_title', l)}")`);
  }
  check(wrong.length === 0, `the guides hub heading is in the page's language in all 16 languages${wrong.length ? `: ${wrong.join('; ')}` : ''}`);
}

// The breadcrumb names the hub in the page's language. usePathname() is percent-encoded, so
// before components/Breadcrumbs.tsx decoded it the Arabic hub's last crumb read "%D8%AF%D9%84…".
{
  const wrong: string[] = [];
  for (const l of locales) {
    const html = await (await fetch(`${BASE_URL}/guides/${encodeURIComponent(localeGuidesSlug[l])}`)).text();
    const nav = /<nav\b[^>]*aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '';
    const crumbs = nav.replace(/<[^>]*>/g, '|').split('|').map((s) => s.trim()).filter((s) => s && s !== '/');
    const last = crumbs[crumbs.length - 1] ?? '';
    if (last !== t('guides.breadcrumb', l)) wrong.push(`${l}: "${last}"`);
  }
  check(wrong.length === 0, `the guides hub's breadcrumb names it in its language in all 16 languages${wrong.length ? `: ${wrong.join('; ')}` : ''}`);
}

// A guide article, not only the hub: the article page sits two levels below the root layout.
{
  const hub = await (await fetch(`${BASE_URL}/guides/${encodeURIComponent(localeGuidesSlug.de)}`)).text();
  const href = /href="(\/guides\/anleitungen\/[^"/]+\/[^"/]+)"/.exec(hub)?.[1];
  check(!!href, `the German guides hub links to an article (${href})`);
  if (href) {
    const { lang, dir } = htmlTag(await (await fetch(BASE_URL + href)).text());
    check(lang === 'de' && dir === 'ltr', `${href}: <html lang="${lang}" dir="${dir}">`);
  }
}

// An unknown address still answers 404 (the root layout moved; the 404 page must not break).
for (const p of ['/xx', '/pl/nie-ma-takiej-strony', '/a/b/c']) {
  const res = await fetch(BASE_URL + p, { redirect: 'manual' });
  const html = await res.text();
  // …and keeps the site's header, as it did with the single root layout (app/global-not-found.tsx).
  check(res.status === 404 && html.includes('<header'), `${p} → ${res.status}, ${html.includes('<header') ? 'with' : 'WITHOUT'} the site header`);
}

console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
process.exit(fails ? 1 : 0);
