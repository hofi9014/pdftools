// Pages that hold their text in all 16 languages hand their client view one language
// (2026-10-22): /{locale}/faq, help, nasze-zasady, wsparcie, terms, privacy, rodo, security and the
// home page's guide cards. Before, the client component itself held all 16 (FAQ 196 kB, help
// 278 kB, the three legal pages 324 kB, the home page every guide article — 181 kB — for four
// titles), and every one of them was downloaded to show one.
//
// lib/localize-data.ts keeps only the page's language in every { pl, en, … } object. This renders
// each view in each language twice — with all 16 languages and with the one it is now given — and
// requires the same HTML: the trimmed data must not change a single character on the page.
import { createElement as h, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { locales } = await import('../lib/i18n.ts');
const { localizeData } = await import('../lib/localize-data.ts');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

type Props = Record<string, unknown>;
const views: Array<{ name: string; view: ComponentType<Props>; prop: string; data: unknown; extra?: Props }> = [
  { name: 'faq', view: (await import('../components/pages/FaqView.tsx')).default as ComponentType<Props>, prop: 'faqData', data: (await import('../content/pages/faq.ts')).faqData },
  { name: 'help', view: (await import('../components/pages/HelpView.tsx')).default as ComponentType<Props>, prop: 'helpData', data: (await import('../content/pages/help.ts')).helpData },
  { name: 'nasze-zasady', view: (await import('../components/pages/RulesView.tsx')).default as ComponentType<Props>, prop: 'content', data: (await import('../content/pages/nasze-zasady.ts')).content },
  { name: 'wsparcie', view: (await import('../components/pages/SupportView.tsx')).default as ComponentType<Props>, prop: 'content', data: (await import('../content/pages/wsparcie.ts')).content },
  { name: 'terms', view: (await import('../components/pages/TermsView.tsx')).default as ComponentType<Props>, prop: 'content', data: (await import('../content/pages/terms.ts')).content },
  { name: 'home', view: (await import('../components/pages/HomeView.tsx')).default as ComponentType<Props>, prop: 'guides', data: (await import('../lib/guide-cards.ts')).homeGuideCards() },
];

const size = (x: unknown) => JSON.stringify(x).length;
for (const v of views) {
  const different: string[] = [];
  let full = 0, one = 0;
  for (const l of locales) {
    const local = localizeData(v.data, l);
    const a = renderToStaticMarkup(h(v.view, { locale: l, [v.prop]: v.data }));
    const b = renderToStaticMarkup(h(v.view, { locale: l, [v.prop]: local }));
    if (a !== b || a.length < 500) different.push(l);
    full = size(v.data); one = Math.max(one, size(local));
  }
  check(different.length === 0, `${v.name}: the same HTML in all 16 languages with one language as with all (${different.join(', ') || 'ok'}); data ${Math.round(full / 1024)} kB → at most ${Math.round(one / 1024)} kB`);
}

console.log('\n=== legal pages: the server hands LegalDocument one document ===');
{
  const { readFileSync } = await import('node:fs');
  for (const p of ['privacy', 'rodo', 'security']) {
    const src = readFileSync(new URL(`../app/[locale]/${p}/page.tsx`, import.meta.url), 'utf8');
    check(src.includes(`<LegalDocument doc={legalFor(locale).${p}}`) && !src.includes('(unprefixed)'), `/{locale}/${p} renders LegalDocument with legalFor(locale).${p}, not the client page holding all languages`);
  }
}

console.log('\n=== localizeData ===');
{
  const sample = { title: { pl: 'Tytuł', en: 'Title', de: '' }, n: 3, list: [{ q: { pl: 'P', en: 'Q' } }], keys: { a: 1, b: 2 }, one: { en: 'only' } };
  check(JSON.stringify(localizeData(sample, 'pl')) === JSON.stringify({ title: { pl: 'Tytuł' }, n: 3, list: [{ q: { pl: 'P' } }], keys: { a: 1, b: 2 }, one: { en: 'only' } }), 'keeps one language, leaves other objects and single-key objects alone');
  check(JSON.stringify(localizeData(sample, 'de')) === JSON.stringify({ title: { de: 'Title' }, n: 3, list: [{ q: { de: 'Q' } }], keys: { a: 1, b: 2 }, one: { en: 'only' } }), 'a missing or empty language gets the en text, as the views fall back');
  check(localizeData(sample, 'pl') !== (sample as unknown) && sample.title.de === '', 'does not modify its input');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
