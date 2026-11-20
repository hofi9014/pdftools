// The /{pl|en}/for-business page (content/pages/business.ts, 2026-11-20): the owner sends it to
// companies, so every number, tool name and link on it must come from the code, both languages
// must be complete, and nothing may promise a price, a limit-free service or legal certainty.
// Run: npm run test:business-page
import { readFileSync, existsSync } from 'node:fs';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { content, BUSINESS_LOCALES, BUSINESS_TOOLS } from '../content/pages/business';
import { t, locales, type Locale } from '../lib/i18n';
import { tools, NON_LOCAL_TOOLS, toolCounts, toolPath } from '../lib/tools';
import { DAILY_LIMIT } from '../lib/ai-limit';
import { KSEF_PATH } from '../lib/ksef/route';

const BusinessView = (await import('../components/pages/BusinessView.tsx')).default as ComponentType<{ locale: string }>;

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const read = (p: string) => readFileSync(p, 'utf8');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

console.log('=== facts the page states ===');
check(BUSINESS_TOOLS.every((k) => tools.some((x) => x.key === k) && !NON_LOCAL_TOOLS[k]), `every tool it recommends runs in the browser (${BUSINESS_TOOLS.join(', ')})`);
check(read('components/pages/BusinessView.tsx').includes('NON_LOCAL_TOOLS') && tools.filter((x) => NON_LOCAL_TOOLS[x.key]).length === 4, 'the exceptions are listed from the registry');
check(read('lib/pdf-raster.ts').includes('rasterizePages') || read('lib/pdf-raster.ts').includes('export async function rasterize'), 'redaction turns the page into an image (lib/pdf-raster.ts)');
check(/compressPDFToTarget/.test(read('app/(unprefixed)/compress/page.tsx')), 'compress to a target size exists on the compress page');
for (const l of BUSINESS_LOCALES) {
  const c = content[l];
  const all = (Object.values(c).flat() as string[]).join(' ');
  check(all.includes(String(locales.length)), `${l}: says ${locales.length} languages`);
  check(!/\b(zł|PLN|€|\$|USD|EUR)\b|cena|cennik|price|pricing|subskrypc|subscription/i.test(all), `${l}: names no price or paid plan`);
  check(!/bez limit|no (file )?limits?|unlimited|nieogranicz/i.test(all), `${l}: promises no limit-free service`);
  check(/porad[ay] prawn|legal advice/i.test(c.gdprNote), `${l}: the GDPR part says it is not legal advice`);
  check(c.seoDescription.length <= 160 && (c.seoTitle + ' | OptimaPDF').length <= 72, `${l}: title and description fit a search result`);
  check([...c.files, c.lead].some((s) => s.includes('{local}')) && c.files.some((s) => s.includes('{exceptions}') && s.includes('{limit}')), `${l}: numbers are placeholders filled from the code`);
}

console.log('\n=== rendered page ===');
for (const l of BUSINESS_LOCALES) {
  const html = renderToStaticMarkup(createElement(BusinessView, { locale: l }));
  const counts = toolCounts(l);
  const bad: string[] = [];
  if (/\{(local|total|exceptions|limit)\}/.test(html)) bad.push('unfilled placeholder');
  if (!html.includes(`${counts.local}`) || !html.includes(`${counts.total}`) || !html.includes(String(DAILY_LIMIT))) bad.push('numbers');
  for (const k of BUSINESS_TOOLS) if (!html.includes(`href="${toolPath(k, l)}"`) || !html.includes(esc(t(`tool.${k}`, l as Locale)))) bad.push(`tool ${k}`);
  for (const p of [`/${l}/where-your-file-goes`, `/${l}/privacy`, `/${l}/security`, `/${l}/about`, KSEF_PATH, 'mailto:kontakt@optimapdf.com', 'https://github.com/hofi9014/pdftools']) if (!html.includes(p)) bad.push(p);
  if ((html.match(/<h1/g) ?? []).length !== 1) bad.push('one h1');
  check(bad.length === 0, `${l}: renders${bad.length ? ` — missing ${bad.join(', ')}` : ''}`);
}

console.log('\n=== wired into the site ===');
const route = read('app/[locale]/for-business/page.tsx');
check(existsSync('app/[locale]/for-business/page.tsx') && /notFound\(\)/.test(route) && route.includes('BUSINESS_LOCALES'), 'Polish and English only; other languages 404');
check(read('app/sitemap.ts').includes('/for-business') && read('components/Breadcrumbs.tsx').includes("'for-business': 'nav.business'"), 'sitemap and breadcrumb');
check(/locale === 'pl' \|\| locale === 'en'/.test(read('components/Footer.tsx')) && read('components/Footer.tsx').includes('nav.business'), 'footer link only in Polish and English');
check(locales.every((l) => t('nav.business', l) !== 'nav.business'), 'label in every language');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
