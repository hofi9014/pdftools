// /llms.txt (lib/llms-text.ts, 2026-11-16): the description AI assistants read must match the site.
//
// Checks: every tool is listed once with its English name and its real /en address; the counts
// ("N of M tools … in the browser") come from the tool registry; every tool that leaves the
// browser is named as an exception, and no local tool is; the AI limit is the one the server
// enforces; every guide is listed at its real address; every language has its home page; the
// route is static and served as text.
//
// Run: npx tsx tests/llms-txt.mts
import { readFileSync } from 'node:fs';
import { llmsText } from '../lib/llms-text';
import { t, locales } from '../lib/i18n';
import { tools, toolPath, NON_LOCAL_TOOLS } from '../lib/tools';
import { getAllArticles } from '../lib/guides';
import { guideArticlePath, encodePath } from '../lib/guide-urls';
import { DAILY_LIMIT } from '../lib/ai-limit';

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) fails++; };
const SITE = 'https://optimapdf.com';

const text = llmsText();
const lines = text.split('\n');
check(lines[0] === '# OptimaPDF' && lines.some((l) => l.startsWith('> ')), 'title line and one-line summary (llmstxt.org shape)');

const listed = tools.filter((x) => !x.disabled);
const local = listed.filter((x) => !NON_LOCAL_TOOLS[x.key]);
check(text.includes(`${local.length} of ${listed.length} tools`), `counts from the registry: ${local.length} of ${listed.length}`);

const missing: string[] = [];
for (const x of listed) {
  const entry = `- [${t(`tool.${x.key}`, 'en')}](${SITE}${toolPath(x.key, 'en')}): `;
  if (lines.filter((l) => l.startsWith(entry)).length !== 1) missing.push(x.key);
}
check(missing.length === 0, `each of ${listed.length} tools listed once with its name and /en address${missing.length ? ': ' + missing.join(', ') : ''}`);

const exceptions = lines.find((l) => l.includes('tools work outside the browser')) ?? '';
const nonLocal = listed.filter((x) => NON_LOCAL_TOOLS[x.key]);
check(nonLocal.length > 0 && nonLocal.every((x) => exceptions.includes(t(`tool.${x.key}`, 'en'))), `every tool that leaves the browser is named: ${nonLocal.map((x) => x.key).join(', ')}`);
check(local.every((x) => !exceptions.includes(`${t(`tool.${x.key}`, 'en')},`) && !exceptions.includes(`${t(`tool.${x.key}`, 'en')} `)), 'no local tool is named as an exception');
check(exceptions.includes(`${DAILY_LIMIT} AI requests per day`), `AI limit = DAILY_LIMIT (${DAILY_LIMIT})`);

const articles = getAllArticles();
const guideMissing = articles.filter((a) => !text.includes(`(${SITE}${encodePath(guideArticlePath('en', a.category, a.slug))})`));
check(articles.length > 0 && guideMissing.length === 0, `all ${articles.length} guides listed at their address${guideMissing.length ? ': ' + guideMissing.map((a) => a.slug).join(', ') : ''}`);

const homeMissing = locales.filter((l) => !text.includes(`(${SITE}/${l})`));
check(homeMissing.length === 0, `home page of all ${locales.length} languages${homeMissing.length ? ': ' + homeMissing.join(', ') : ''}`);

check(!/\{[a-z]+\}/.test(text) && !text.includes('undefined'), 'no unfilled placeholder or "undefined"');

const route = readFileSync('app/llms.txt/route.ts', 'utf8');
check(/dynamic = 'force-static'/.test(route) && /text\/plain; charset=utf-8/.test(route), 'route is static and served as UTF-8 text');

console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL PASS');
process.exit(fails ? 1 : 0);
