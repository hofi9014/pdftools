// What a link preview (Facebook, LinkedIn, X, Slack, WhatsApp, Discord), a crawler and a browser get
// from the server before any JavaScript runs: the preview tags, the preview picture, security.txt
// and the security headers.
//
// Measured on production before 2026-10-21:
//   - no page had og:image, while every page declared a "summary_large_image" X card — previews
//     showed no picture;
//   - a tool page's openGraph (only og:url) replaced the layout's as a whole: no og:site_name,
//     og:type or og:locale;
//   - /pl, /de, … had an English <title>, og:title, og:locale "en_US" and og:url without the
//     language; every X card was in English;
//   - the guides hub and category pages had no og:* tags and no canonical address;
//   - the nine information pages (privacy, FAQ, terms…) all had the home page's title, doubled:
//     "OptimaPDF - Free online PDF tools | OptimaPDF";
//   - no /.well-known/security.txt; no Cross-Origin-Opener-Policy; 'unsafe-eval' in the CSP.
//
// Plain HTTP fetches. Needs the BUILT site (next start): `next dev` keeps 'unsafe-eval' on purpose.
import { locales, t, type Locale } from '../lib/i18n.ts';
import { OG_LOCALES, toolSearchMetadata } from '../lib/metadata.ts';
import { localeGuidesSlug } from '../lib/guides-slugs.ts';
import { getAllArticles } from '../lib/guides.ts';
import { buildCanonicalUrl } from '../lib/guides-canonical.ts';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const SITE = 'https://optimapdf.com';
const IMAGE = `${SITE}/og-image.jpg`;

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const decode = (s: string): string => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function metas(html: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of html.matchAll(/<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"/g)) {
    const list = out.get(m[1]!) ?? [];
    list.push(decode(m[2]!));
    out.set(m[1]!, list);
  }
  return out;
}

interface PageCase { path: string; locale: Locale; title: string; type: 'website' | 'article' }
const article = getAllArticles()[0]!;
const cases: PageCase[] = [];
for (const l of locales) {
  cases.push({ path: `/${l}`, locale: l, title: t('meta.title', l), type: 'website' });
  // Tool titles carry the search words since 2026-10-27 ("Połącz PDF online za darmo").
  cases.push({ path: `/${l}/merge`, locale: l, title: `${toolSearchMetadata('merge', l).title} | OptimaPDF`, type: 'website' });
  cases.push({ path: `/${l}/privacy`, locale: l, title: `${t('breadcrumb.privacy', l)} | OptimaPDF`, type: 'website' });
  cases.push({ path: `/guides/${localeGuidesSlug[l]}`, locale: l, title: `${t('guides.hub_title', l)} | OptimaPDF`, type: 'website' });
  cases.push({ path: `/guides/${localeGuidesSlug[l]}/${article.category}`, locale: l, title: '', type: 'website' });
  cases.push({ path: new URL(buildCanonicalUrl(article, l)).pathname, locale: l, title: '', type: 'article' });
}

console.log(`=== link-preview tags on ${cases.length} pages (home, a tool, privacy, guides hub, category, article × 16 languages) ===`);
const problems: string[] = [];
for (const c of cases) {
  const res = await fetch(BASE_URL + encodeURI(decodeURI(c.path)), { redirect: 'manual' });
  if (res.status !== 200) { problems.push(`${c.path}: HTTP ${res.status}`); continue; }
  const html = await res.text();
  const m = metas(html);
  const one = (k: string) => m.get(k)?.[0];
  const title = decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '');
  const description = decode(/<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '');
  const canonical = decode(/<link rel="canonical" href="([^"]*)"/.exec(html)?.[1] ?? '');
  const wrong: string[] = [];
  if (c.title && title !== c.title) wrong.push(`<title> "${title}" (expected "${c.title}")`);
  if (one('og:title') !== title) wrong.push(`og:title "${one('og:title')}" ≠ <title>`);
  if (one('twitter:title') !== title) wrong.push(`twitter:title "${one('twitter:title')}" ≠ <title>`);
  if (!description || one('og:description') !== description || one('twitter:description') !== description) wrong.push('description / og:description / twitter:description differ');
  if (!canonical.startsWith(SITE) || one('og:url') !== canonical) wrong.push(`og:url "${one('og:url')}" ≠ canonical "${canonical}"`);
  if (one('og:site_name') !== 'OptimaPDF') wrong.push(`og:site_name ${one('og:site_name')}`);
  if (one('og:type') !== c.type) wrong.push(`og:type ${one('og:type')}`);
  if (one('og:locale') !== OG_LOCALES[c.locale]) wrong.push(`og:locale ${one('og:locale')} (expected ${OG_LOCALES[c.locale]})`);
  if ((m.get('og:locale:alternate') ?? []).length !== locales.length - 1) wrong.push(`${(m.get('og:locale:alternate') ?? []).length} og:locale:alternate`);
  if (one('og:image') !== IMAGE || one('og:image:width') !== '1200' || one('og:image:height') !== '630' || !one('og:image:alt')) wrong.push(`og:image ${one('og:image')} ${one('og:image:width')}×${one('og:image:height')}`);
  if (one('twitter:card') !== 'summary_large_image' || one('twitter:image') !== IMAGE) wrong.push(`twitter:card ${one('twitter:card')} / twitter:image ${one('twitter:image')}`);
  if (wrong.length) problems.push(`${c.path}: ${wrong.join('; ')}`);
}
check(problems.length === 0, `every page has its own title, description, address, language and the picture in og:* and twitter:*${problems.length ? `:\n      ${problems.slice(0, 15).join('\n      ')}${problems.length > 15 ? `\n      … ${problems.length - 15} more` : ''}` : ''}`);
// The cards are in the page's language, not English everywhere.
{
  const pl = metas(await (await fetch(`${BASE_URL}/pl/merge`)).text());
  check(pl.get('twitter:description')?.[0] === toolSearchMetadata('merge', 'pl').description, `the X card of /pl/merge is in Polish ("${pl.get('twitter:description')?.[0]}")`);
}

// Every page of a language has its own <title>: the nine information pages used to carry the home
// page's, doubled ("OptimaPDF - … | OptimaPDF"), the same on all nine.
{
  const dup: string[] = [];
  for (const l of locales) {
    const seen = new Map<string, string>();
    for (const p of ['', '/merge', '/privacy', '/rodo', '/security', '/terms', '/faq', '/help', '/guide', '/nasze-zasady', '/wsparcie']) {
      const html = await (await fetch(`${BASE_URL}/${l}${p}`)).text();
      const title = decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '');
      if ((title.match(/OptimaPDF/g) ?? []).length > 1) dup.push(`/${l}${p}: "${title}"`);
      if (seen.has(title)) dup.push(`/${l}${p} and ${seen.get(title)}: both "${title}"`);
      seen.set(title, `/${l}${p}`);
    }
  }
  check(dup.length === 0, `home, a tool and the nine information pages have distinct titles in all 16 languages${dup.length ? `:\n      ${dup.slice(0, 10).join('\n      ')}` : ''}`);
}

console.log('\n=== the preview picture ===');
{
  const res = await fetch(`${BASE_URL}/og-image.jpg`);
  const buf = new Uint8Array(await res.arrayBuffer());
  // JPEG size from the first start-of-frame marker.
  let w = 0, h = 0;
  for (let i = 2; i < buf.length - 9;) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1]!;
    const len = (buf[i + 2]! << 8) | buf[i + 3]!;
    if (marker >= 0xc0 && marker <= 0xc3) { h = (buf[i + 5]! << 8) | buf[i + 6]!; w = (buf[i + 7]! << 8) | buf[i + 8]!; break; }
    i += 2 + len;
  }
  check(res.status === 200 && (res.headers.get('content-type') ?? '').startsWith('image/jpeg'), `/og-image.jpg is served as a JPEG (${res.status} ${res.headers.get('content-type')})`);
  check(w === 1200 && h === 630, `1200×630, the size the tags declare (${w}×${h})`);
  check(buf.length < 300 * 1024, `small enough for messengers that refuse large previews (${Math.round(buf.length / 1024)} kB)`);
}

console.log('\n=== /.well-known/security.txt (RFC 9116) ===');
{
  const res = await fetch(`${BASE_URL}/.well-known/security.txt`);
  const body = await res.text();
  const field = (k: string) => new RegExp(`^${k}:\\s*(.+)$`, 'mi').exec(body)?.[1]?.trim();
  check(res.status === 200 && (res.headers.get('content-type') ?? '').startsWith('text/plain'), `served as text/plain (${res.status} ${res.headers.get('content-type')})`);
  check(/^mailto:[^@\s]+@optimapdf\.com$/.test(field('Contact') ?? ''), `Contact: ${field('Contact')}`);
  const expires = Date.parse(field('Expires') ?? '');
  const days = (expires - Date.now()) / 86400000;
  // The RFC asks for less than a year; this check fails a month BEFORE the file goes stale.
  check(days > 30 && days < 400, `Expires is in the future and under ~a year away (${field('Expires')}, ${Math.round(days)} days) — renew public/.well-known/security.txt when this fails`);
  check(field('Canonical') === `${SITE}/.well-known/security.txt`, `Canonical: ${field('Canonical')}`);
}

console.log('\n=== security headers ===');
{
  const res = await fetch(`${BASE_URL}/pl/merge`);
  const csp = res.headers.get('content-security-policy') ?? '';
  const scriptSrc = /script-src([^;]*)/.exec(csp)?.[1] ?? '';
  check(!scriptSrc.includes("'unsafe-eval'"), `script-src does not allow 'unsafe-eval' (${scriptSrc.trim().split(' ').slice(0, 4).join(' ')} …)`);
  check(scriptSrc.includes("'wasm-unsafe-eval'"), "script-src allows WebAssembly ('wasm-unsafe-eval') for OCR");
  check(res.headers.get('cross-origin-opener-policy') === 'same-origin-allow-popups', `pages send Cross-Origin-Opener-Policy: ${res.headers.get('cross-origin-opener-policy')}`);
  for (const p of ['/dropbox-oauth.html', '/onedrive-oauth.html', '/onedrive-picker-oauth.html', '/sharepoint-oauth.html']) {
    const r = await fetch(BASE_URL + p);
    check(r.status === 200 && r.headers.get('cross-origin-opener-policy') === 'unsafe-none', `${p}: sign-in return page keeps window.opener (COOP ${r.headers.get('cross-origin-opener-policy')})`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
