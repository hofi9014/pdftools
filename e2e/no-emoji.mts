// The built pages contain no emoji: every icon is a drawn SVG (see tests/tool-icons.mts).
// Emoji are drawn by the visitor's operating system, so they looked different on every device.
// Reads the server HTML of every tool page and the main information pages in all 16 languages,
// and the per-language dictionary script, with a plain fetch (no browser needed).
//
//   E2E_BASE_URL=http://localhost:3100 npx tsx e2e/no-emoji.mts
import { tools } from '../lib/tools.ts';
import { locales } from '../lib/i18n.ts';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/gu;
let fails = 0;

const pages = ['', '/faq', '/help', '/wsparcie', '/nasze-zasady', '/guide', '/privacy', '/rodo', '/security', '/terms',
  ...tools.filter((t) => !t.disabled).map((t) => `/${t.slug}`)];

const found: string[] = [];
let checked = 0;
for (const locale of locales) {
  const urls = [...pages.map((p) => `/${locale}${p}`), `/${locale}/messages.js`];
  await Promise.all(urls.map(async (u) => {
    const res = await fetch(BASE + u);
    if (!res.ok) { found.push(`${u} → HTTP ${res.status}`); return; }
    // The dictionary script holds its JSON as a string literal; non-ASCII text stays literal.
    const body = await res.text();
    checked++;
    const hits = [...new Set(body.match(EMOJI) ?? [])];
    if (hits.length) found.push(`${u}: ${hits.join(' ')}`);
  }));
}
const ok = found.length === 0 && checked === locales.length * (pages.length + 1);
console.log(`  ${ok ? 'PASS' : 'FAIL'} ${checked} pages and dictionaries in ${locales.length} languages contain no emoji${found.length ? `\n    ${found.slice(0, 15).join('\n    ')}` : ''}`);
if (!ok) fails++;
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
