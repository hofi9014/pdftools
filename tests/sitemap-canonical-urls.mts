// app/sitemap.ts used to list UNPREFIXED tool/info URLs (/merge, /privacy ...). proxy.ts answers
// those with a 307 to /{locale}/... chosen from Accept-Language, so the sitemap advertised
// redirects while none of the real canonical pages (/{locale}/{slug}, which carry hreflang
// alternates via lib/metadata.ts) were in it. Now only canonical locale-prefixed URLs are listed.
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as sitemapModule from '../app/sitemap.ts';
import { locales } from '../lib/i18n.ts';
import { tools } from '../lib/tools.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://optimapdf.com';
// tsx loads .ts files as CommonJS, so the default export can arrive nested one level deeper.
const sm = sitemapModule as unknown as { default: unknown };
const sitemap = (typeof sm.default === 'function' ? sm.default : (sm.default as { default: unknown }).default) as () => import('next').MetadataRoute.Sitemap;
const entries = sitemap();
const urls = entries.map((e) => e.url);

console.log('=== no redirecting (unprefixed) URLs ===');
const localeSet = new Set<string>(locales);
const legacy = urls.filter((u) => {
  const seg = u.replace(BASE, '').split('/').filter(Boolean);
  if (seg[0] === 'guides') return false;
  return !(seg[0] && localeSet.has(seg[0]));
});
check(legacy.length === 0, `every non-guide URL starts with a locale segment (offenders: ${legacy.slice(0, 5).join(', ') || 'none'})`);
check(!urls.includes(BASE) && !urls.includes(BASE + '/merge') && !urls.includes(BASE + '/privacy'), 'the old redirecting URLs /, /merge, /privacy are gone');

console.log('\n=== full coverage: every locale × every tool, home and info pages ===');
const active = tools.filter((t) => !t.disabled);
let missing = 0;
for (const l of locales) for (const t of active) if (!urls.includes(`${BASE}/${l}/${t.slug}`)) missing++;
check(missing === 0, `all ${locales.length} locales × ${active.length} tools present (${locales.length * active.length} URLs, missing ${missing})`);
check(locales.every((l) => urls.includes(`${BASE}/${l}`)), 'every locale home page listed');
for (const p of ['privacy', 'faq', 'help', 'rodo', 'security', 'terms', 'wsparcie', 'nasze-zasady']) {
  check(locales.every((l) => urls.includes(`${BASE}/${l}/${p}`)), `info page ${p} listed for every locale`);
}

console.log('\n=== every listed page really exists on disk ===');
const localeDir = join(ROOT, 'app', '[locale]');
const onDisk = new Set(readdirSync(localeDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name));
const ghosts: string[] = [];
for (const u of urls) {
  const seg = u.replace(BASE, '').split('/').filter(Boolean);
  if (seg[0] === 'guides' || !seg[0] || !localeSet.has(seg[0]) || !seg[1]) continue;
  if (seg.length === 2 && !(onDisk.has(seg[1]) && existsSync(join(localeDir, seg[1], 'page.tsx')))) ghosts.push(u);
}
check(ghosts.length === 0, `no sitemap URL points at a missing page (ghosts: ${ghosts.slice(0, 5).join(', ') || 'none'})`);

console.log('\n=== hreflang alternates are complete and self-consistent ===');
{
  const sample = entries.filter((e) => e.url === `${BASE}/de/merge` || e.url === `${BASE}/pl`);
  check(sample.length === 2, 'sampled /de/merge and /pl');
  for (const e of sample) {
    const langs = (e.alternates?.languages ?? {}) as Record<string, string>;
    check(locales.every((l) => typeof langs[l] === 'string') && langs['x-default']?.includes('/en'), `${e.url}: all ${locales.length} locales + x-default → /en`);
    const self = e.url.split('/')[3];
    check(langs[self as string] === e.url, `${e.url}: its own hreflang entry points back at itself`);
  }
}

console.log('\n=== hygiene ===');
check(new Set(urls).size === urls.length, 'no duplicate URLs');
check(entries.filter((e) => !e.url.includes('/guides/') && e.lastModified).length === 0, 'no fake build-time lastModified on pages without a real modification date');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
