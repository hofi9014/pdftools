// The page /{locale}/where-your-file-goes (content/pages/upload-comparison.ts, 2026-11-17): it
// names other companies, so every claim must be one the measurement made and nothing may be left
// untranslated or half-filled.
//
// Checks: the rows are exactly the services the measurement script visits, and only OptimaPDF
// keeps the file; every language has every text, translated, with its placeholders; titles and
// descriptions fit a search result and name the measured services; the rendered page in each
// language shows the date, every service, the four OptimaPDF tools that work outside the browser
// and the public script; the page is in the sitemap, the footer, the breadcrumbs and the proxy's
// list of addresses without a language.
//
// Run: npx tsx tests/upload-comparison-page.mts
import { readFileSync, existsSync } from 'node:fs';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { content, rows, SCRIPT_URL, MEASURED_ON } from '../content/pages/upload-comparison';
import { t, locales, type Locale } from '../lib/i18n';
import { tools, NON_LOCAL_TOOLS } from '../lib/tools';

// Imported the way tests/localize-page-data.mts imports views (a static import resolves to the module object under tsx).
const UploadComparisonView = (await import('../components/pages/UploadComparisonView.tsx')).default as ComponentType<{ locale: Locale }>;

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

console.log('=== the rows are what the script measures ===');
const script = readFileSync('scripts/measure-upload-comparison.mts', 'utf8');
const measured = [...script.matchAll(/\{ name: '([^']+)', url: 'https:/g)].map((m) => m[1]);
check(SCRIPT_URL.endsWith('/blob/main/scripts/measure-upload-comparison.mts') && existsSync('scripts/measure-upload-comparison.mts'), 'the linked script exists in the repository');
check(JSON.stringify(rows.map((r) => r.name)) === JSON.stringify(measured), `rows = services in the script (${measured.join(', ')})`);
check(rows.filter((r) => !r.sent).map((r) => r.name).join() === 'OptimaPDF', 'only OptimaPDF keeps the file in the browser');
check(rows.every((r) => !r.sent || !!r.to), 'every service that received the file names where it went');
check(/^\d{4}-\d{2}-\d{2}$/.test(MEASURED_ON), `measurement date ${MEASURED_ON}`);

console.log('\n=== every language, every text ===');
const en = content.en!;
const others = rows.filter((r) => r.sent).map((r) => r.name);
const width = (s: string) => [...s].reduce((n, ch) => n + (/[　-鿿＀-￯]/.test(ch) ? 2 : 1), 0);
for (const l of locales) {
  const c = content[l];
  if (!c) { check(false, `${l}: page text exists`); continue; }
  const strings = [c.seoTitle, c.seoDescription, c.title, c.lead, c.measured, c.thService, c.thSent, c.thWhere, c.yes, c.no, c.notes.zip, c.notes.ours,
    c.methodTitle, ...c.method, c.limitsTitle, ...c.limits, c.verifyTitle, c.codeTitle, c.code, c.codeLink, c.cta];
  const bad: string[] = [];
  if (strings.some((s) => !s || !s.trim())) bad.push('empty text');
  if (c.method.length !== en.method.length || c.limits.length !== en.limits.length) bad.push('list length');
  if (!c.measured.includes('{date}')) bad.push('{date}');
  if (!c.limits.some((s) => s.includes('{exceptions}'))) bad.push('{exceptions}');
  if (!c.seoTitle.includes(String(rows.length))) bad.push(`${rows.length} in the title`);
  if (l !== 'en' && [c.title, c.lead, c.methodTitle, c.cta, c.method[0]].some((s, i) => s === [en.title, en.lead, en.methodTitle, en.cta, en.method[0]][i])) bad.push('English left');
  const missing = others.filter((n) => !c.seoDescription.includes(n));
  if (missing.length) bad.push(`description lacks ${missing.join(', ')}`);
  const max = l === 'ja' || l === 'zh' ? 100 : 160;
  if (c.seoDescription.length > max) bad.push(`description ${c.seoDescription.length} > ${max}`);
  if (width(c.seoTitle) > 60) bad.push(`title width ${width(c.seoTitle)} > 60`);
  check(bad.length === 0, `${l}: complete${bad.length ? ` — ${bad.join('; ')}` : ''}`);
  check(t('nav.upload_check', l) !== 'nav.upload_check' && (l === 'en' || t('nav.upload_check', l) !== t('nav.upload_check', 'en')), `${l}: footer/breadcrumb label "${t('nav.upload_check', l)}"`);
}

console.log('\n=== the rendered page ===');
const exceptions = tools.filter((x) => NON_LOCAL_TOOLS[x.key]).map((x) => x.key);
check(exceptions.length === 4, `4 tools work outside the browser (${exceptions.join(', ')})`);
for (const l of locales) {
  const html = renderToStaticMarkup(createElement(UploadComparisonView, { locale: l as Locale }));
  const bad: string[] = [];
  if (/\{(date|exceptions)\}/.test(html)) bad.push('unfilled placeholder');
  if (!html.includes(SCRIPT_URL)) bad.push('script link');
  for (const r of rows) if (!html.includes(r.name)) bad.push(r.name);
  for (const k of exceptions) if (!html.includes(t(`tool.${k}`, l as Locale).replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;'))) bad.push(`tool.${k}`);
  if (!/2026|٢٠٢٦|۲۰۲۶/.test(html)) bad.push('date');
  if (!html.includes(`/${l}/compress`)) bad.push('compress link');
  check(bad.length === 0, `${l}: renders${bad.length ? ` — missing ${bad.join(', ')}` : ''}`);
}

console.log('\n=== wired into the site ===');
const read = (p: string) => readFileSync(p, 'utf8');
check(existsSync('app/[locale]/where-your-file-goes/page.tsx') && existsSync('app/(unprefixed)/where-your-file-goes/page.tsx'), 'both route files exist');
check(read('app/sitemap.ts').includes("'where-your-file-goes'"), 'listed in the sitemap');
check(read('proxy.ts').includes("'where-your-file-goes'"), 'the address without a language redirects (proxy LEGACY_PATHS)');
check(read('components/Footer.tsx').includes('nav.upload_check'), 'linked in the footer');
check(read('components/Breadcrumbs.tsx').includes("'where-your-file-goes': 'nav.upload_check'"), 'named in the breadcrumbs');

console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
process.exit(fails ? 1 : 0);
