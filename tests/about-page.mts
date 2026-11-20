// The /{locale}/about page (content/pages/about.ts, plan 1.2, 2026-11-20). Every number and
// name on it comes from the code, every language is complete and translated, and the page is
// linked from the footer, the breadcrumbs, the sitemap and the proxy's legacy addresses.
// Run: npm run test:about-page
import { readFileSync, existsSync } from 'node:fs';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { content, OWNER_NAME, CONTACT_EMAIL, SOURCE_URL } from '../content/pages/about';
import { t, locales, type Locale } from '../lib/i18n';
import { tools, NON_LOCAL_TOOLS, toolCounts } from '../lib/tools';
import { DAILY_LIMIT } from '../lib/ai-limit';

const AboutView = (await import('../components/pages/AboutView.tsx')).default as ComponentType<{ locale: Locale }>;
const ocrCount = (JSON.parse(readFileSync('lib/ocr-languages.json', 'utf8')) as unknown[]).length;

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const read = (p: string) => readFileSync(p, 'utf8');

console.log('=== facts the page states ===');
const legal = read('lib/legal/pl.ts');
check(legal.includes(OWNER_NAME) && legal.includes(CONTACT_EMAIL), 'owner and e-mail match the privacy policy');
check(read('content/pages/upload-comparison.ts').includes("sent: true") && (read('content/pages/upload-comparison.ts').match(/sent: true/g) ?? []).length === 5, 'five measured services uploaded the file (the "why" paragraph)');
const exceptions = tools.filter((x) => NON_LOCAL_TOOLS[x.key]);
check(exceptions.length === 4, `four tools work outside the browser (the limits say "four") — ${exceptions.map((x) => x.key).join(', ')}`);
check(SOURCE_URL === 'https://github.com/hofi9014/pdftools', 'source code link is the public repository');
check(!read('components/pages/SupportView.tsx').includes('const DONATIONS_ENABLED = true'), 'no paid or donation button while the page says the creator covers the costs');

console.log('\n=== every language ===');
const en = content.en!;
const width = (s: string) => [...s].reduce((n, ch) => n + (/[　-鿿＀-￯]/.test(ch) ? 2 : 1), 0);
for (const l of locales) {
  const c = content[l];
  if (!c) { check(false, `${l}: page text exists`); continue; }
  const strings = Object.values(c).flat() as string[];
  const bad: string[] = [];
  if (strings.some((s) => !s || !s.trim())) bad.push('empty text');
  if (c.how.length !== en.how.length || c.limits.length !== en.limits.length) bad.push('list length');
  const joined = [...c.how, ...c.limits].join(' ');
  for (const p of ['{local}', '{total}', '{exceptions}', '{limit}', '{ocr}', '{cookies}']) if (!joined.includes(p)) bad.push(p);
  if (l !== 'en' && [c.title, c.lead, c.quote, c.who, c.how[0], c.limits[0], c.money].some((s, i) => s === [en.title, en.lead, en.quote, en.who, en.how[0], en.limits[0], en.money][i])) bad.push('English left');
  const max = l === 'ja' || l === 'zh' ? 100 : 160;
  if (c.seoDescription.length > max) bad.push(`description ${c.seoDescription.length} > ${max}`);
  if (width(c.seoTitle) > 72) bad.push(`title width ${width(c.seoTitle)} > 72`);
  if (!c.quoteBy.includes(l === 'ar' ? 'ليشيك' : l === 'fa' ? 'لِشک' : l === 'hi' ? 'लेशेक' : l === 'ja' ? 'レシェク' : 'Leszek')) bad.push('quote not attributed to the owner');
  check(bad.length === 0, `${l}: complete${bad.length ? ` — ${bad.join('; ')}` : ''}`);
  check(t('nav.about', l) !== 'nav.about' && (l === 'en' || t('nav.about', l) !== t('nav.about', 'en')), `${l}: footer/breadcrumb label "${t('nav.about', l)}"`);
}

console.log('\n=== rendered page ===');
for (const l of locales) {
  const html = renderToStaticMarkup(createElement(AboutView, { locale: l as Locale }));
  const counts = toolCounts(l);
  const bad: string[] = [];
  if (/\{(local|total|exceptions|limit|ocr|cookies)\}/.test(html)) bad.push('unfilled placeholder');
  if (!html.includes(String(counts.local)) || !html.includes(String(counts.total))) bad.push('tool counts');
  if (!html.includes(String(DAILY_LIMIT)) || !html.includes(String(ocrCount))) bad.push('limit/ocr numbers');
  for (const x of exceptions) if (!html.includes(t(`tool.${x.key}`, l as Locale).replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;'))) bad.push(`tool.${x.key}`);
  if (!html.includes(t('cookie.settings', l as Locale))) bad.push('cookie settings label');
  if (!html.includes(SOURCE_URL) || !html.includes(`mailto:${CONTACT_EMAIL}`)) bad.push('code / e-mail link');
  if (!html.includes(`/${l}/where-your-file-goes`)) bad.push('comparison link');
  if (!html.includes('"@type":"AboutPage"')) bad.push('AboutPage data');
  if ((html.match(/<h1/g) ?? []).length !== 1) bad.push('one h1');
  check(bad.length === 0, `${l}: renders${bad.length ? ` — ${bad.join(', ')}` : ''}`);
}

console.log('\n=== wired into the site ===');
check(existsSync('app/[locale]/about/page.tsx') && existsSync('app/(unprefixed)/about/page.tsx'), 'both route files exist');
check(read('app/sitemap.ts').includes("'about'"), 'listed in the sitemap');
check(read('proxy.ts').includes("'about'"), 'the address without a language redirects (proxy LEGACY_PATHS)');
check(read('components/Footer.tsx').includes('nav.about'), 'linked in the footer');
check(read('components/Breadcrumbs.tsx').includes("about: 'nav.about'"), 'breadcrumb label');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
