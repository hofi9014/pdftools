// The home page says "36/40 tools are local" with an asterisk, and the footnote names the tools
// that are not. This test keeps the claim tied to the code: the tools whose pages call the server
// (an /api/ route or the AI client) must be exactly the ones the footnote names, their number must
// match the "36/40" figure, and every language must carry the footnote with both placeholders.
//
// Run: npx tsx tests/home-local-footnote.mts
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tools } from '../lib/tools';
import { t, locales } from '../lib/i18n';

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) fails++; };

const pagesDir = join(process.cwd(), 'app', '(unprefixed)');
const serverSlugs = readdirSync(pagesDir)
  .filter(d => existsSync(join(pagesDir, d, 'page.tsx')))
  .filter(d => /\/api\/|client-ai|apiFetch/.test(readFileSync(join(pagesDir, d, 'page.tsx'), 'utf8')))
  .sort();
const serverKeys = tools.filter(tl => serverSlugs.includes(tl.slug)).map(tl => tl.key).sort();
console.log('tools calling the server:', serverSlugs.join(', '));

const footnoteKeys = ['aichat', 'aisummary', 'translate', 'url'].sort();
check(JSON.stringify(serverKeys) === JSON.stringify(footnoteKeys),
  `the footnote names exactly the tools that call the server (${serverKeys.join(', ')})`);

const home = readFileSync(join(process.cwd(), 'components', 'pages', 'HomeView.tsx'), 'utf8');
check(home.includes("['aichat', 'aisummary', 'translate'].map") && home.includes("url: t('tool.url', locale)"),
  'HomeView fills the footnote with the AI tools and URL to PDF');
check(home.includes("t('home.local_footnote'"), 'HomeView renders home.local_footnote');

for (const loc of locales) {
  const [local, total] = t('stats.local', loc).split('/').map(Number);
  const nonLocal = (total ?? 0) - (local ?? 0);
  check(total === tools.length && nonLocal === serverKeys.length,
    `${loc}: stats.local "${local}/${total}" matches ${tools.length} tools, ${serverKeys.length} not local`);
  const raw = t('home.local_footnote', loc);
  check(raw !== 'home.local_footnote' && raw.includes('{ai}') && raw.includes('{url}') && raw.includes(String(nonLocal)),
    `${loc}: footnote has {ai}, {url} and the number ${nonLocal}`);
  const filled = t('home.local_footnote', loc, { ai: t('tool.aichat', loc), url: t('tool.url', loc) });
  check(filled.includes(t('tool.url', loc)) && !filled.includes('{'), `${loc}: footnote fills both placeholders`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
