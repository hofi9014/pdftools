// What a search engine gets from the built site (plain fetch, no JavaScript) — audit 2026-10-27.
// Before this change, on production: tool descriptions 20-55 characters, how-to steps 0 of N in
// the visible HTML, FAQ answers 0 of 43 in the HTML, no Organization/WebSite data, and every tool
// page loading a 101 kB script with the steps of all tools in all 16 languages.
//
// Run: E2E_BASE_URL=http://localhost:3100 npx tsx e2e/tool-page-seo.mts   (default: localhost:3000)
import { tools } from '../lib/tools';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) fails++; };

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
async function get(path: string) {
  const r = await fetch(BASE + encodeURI(path), { redirect: 'manual' });
  return { status: r.status, html: await r.text() };
}
const visibleText = (html: string) => decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
const jsonLd = (html: string) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  .map((m) => JSON.parse(m[1]!.replace(/\\u003C/g, '<').replace(/\\u003E/g, '>').replace(/\\u0026/g, '&')))
  .flatMap((j) => j['@graph'] ?? [j]);
const meta = (html: string, name: string) => decode(html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1] ?? '');

// Every tool in Polish, a sample of tools in English, Japanese and Arabic.
const pages = [
  ...tools.map((t) => `/pl/${t.slug}`),
  ...['compress', 'pdf-to-word', 'ai-chat', 'url-to-pdf', 'merge'].flatMap((s) => [`/en/${s}`, `/ja/${s}`, `/ar/${s}`]),
];
let ok = 0;
for (const p of pages) {
  const { status, html } = await get(p);
  const text = visibleText(html);
  const desc = meta(html, 'description');
  const nodes = jsonLd(html);
  const howto = nodes.find((n) => n['@type'] === 'HowTo');
  const app = nodes.find((n) => n['@type'] === 'WebApplication');
  const steps: string[] = howto?.step?.map((s: { text: string }) => s.text) ?? [];
  const cjk = /^\/(ja|zh)\//.test(p);
  const good = status === 200
    && desc.length >= (cjk ? 35 : 90)
    && steps.length >= 3 && steps.every((s) => text.includes(s))
    && !!app && app.isAccessibleForFree === true
    && /<h2[^>]*id="tool-howto"/.test(html);
  if (good) ok++; else check(false, `${p}: status ${status}, description ${desc.length} chars, ${steps.filter((s) => text.includes(s)).length}/${steps.length} steps visible, WebApplication ${!!app}`);
}
check(ok === pages.length, `${ok}/${pages.length} tool pages: long description, visible steps = HowTo data, WebApplication`);

// AI and URL pages must not claim the file never leaves the browser.
for (const p of ['/pl/ai-chat', '/pl/ai-summary', '/pl/ai-translate', '/pl/url-to-pdf']) {
  const d = meta((await get(p)).html, 'description');
  check(!/nie trafia na nasz serwer/.test(d), `${p}: description does not claim local processing ("${d.slice(0, 70)}…")`);
}

// The old client component carried the steps of every language to every page.
{
  const { html } = await get('/pl/compress');
  const scripts = [...new Set([...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]!))];
  let foreign = 0;
  for (const s of scripts) if ((await (await fetch(BASE + s)).text()).includes('Laden Sie die zu komprimierende')) foreign++;
  check(foreign === 0, `/pl/compress: no script carries the German steps (${scripts.length} scripts checked)`);
}

// FAQ answers are in the HTML.
for (const l of ['pl', 'en', 'ar']) {
  const { html } = await get(`/${l}/faq`);
  const faq = jsonLd(html).find((n) => n['@type'] === 'FAQPage');
  const answers: string[] = faq?.mainEntity?.map((q: { acceptedAnswer: { text: string } }) => q.acceptedAnswer.text) ?? [];
  const text = visibleText(html);
  const visible = answers.filter((a) => text.includes(a.replace(/\s+/g, ' '))).length;
  check(answers.length > 30 && visible === answers.length, `/${l}/faq: ${visible}/${answers.length} answers in the HTML`);
}

// Who runs the site.
for (const l of ['pl', 'de', 'ja']) {
  const nodes = jsonLd((await get(`/${l}`)).html);
  const org = nodes.find((n) => n['@type'] === 'Organization');
  const site = nodes.find((n) => n['@type'] === 'WebSite');
  check(!!org && !!site && site.inLanguage === l && site.url === `https://optimapdf.com/${l}`, `/${l}: Organization and WebSite data in the page language`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
