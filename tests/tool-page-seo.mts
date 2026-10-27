// What search engines read on the tool pages and the FAQ/help pages (audit 2026-10-27).
//
// Measured on production before this change: a tool page had about thirty words of its own (the
// rest is the menu), its description was the bare one-line purpose (20-55 characters), its how-to
// steps existed only as structured data built in the browser (0 of 4 visible on /pl/compress), a
// client component shipped the steps of every tool in all 16 languages to every page (101 kB),
// and the FAQ page had 43 answers in structured data and none in the HTML (rendered on click).
//
// This test holds the fix in place: every tool page renders, on the server and in its own
// language, the steps, three answers that match how the tool handles the file, and the guide
// link; the structured data says exactly what the page shows; titles and descriptions say what
// people search for and stay true about where the file goes; collapsed FAQ/help answers are
// still in the HTML.
//
// Run: npx tsx tests/tool-page-seo.mts
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createElement as h, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = process.cwd();
const { locales, t } = await import('../lib/i18n.ts');
const { tools, NON_LOCAL_TOOLS, toolProcessing } = await import('../lib/tools.ts');
const { toolHowToSteps, howToSlugs } = await import('../content/tool-howto.ts');
const { toolSearchMetadata, pageMetadata } = await import('../lib/metadata.ts');
const { default: ToolGuide, toolFaq } = await import('../components/ToolGuide.tsx');
const { siteJsonLd } = await import('../lib/site-schema.ts');
const { DAILY_LIMIT } = await import('../lib/ai-rate-limit.ts');
const guides = (await import('../content/guides/index.ts')).default;

let fails = 0;
const check = (ok: boolean, msg: string) => { if (!ok) { console.log(`FAIL: ${msg}`); fails++; } };
const pass = (msg: string) => console.log(`PASS: ${msg}`);

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const CJK = new Set(['ja', 'zh']);

// --- 1. Steps: every tool, every language, really translated --------------------------------------
check(tools.every((tl) => howToSlugs.includes(tl.slug)), 'every tool has steps');
for (const tl of tools) {
  const en = toolHowToSteps(tl.slug, 'en') ?? [];
  for (const l of locales) {
    const steps = toolHowToSteps(tl.slug, l) ?? [];
    check(steps.length >= 3 && steps.every((s) => s.trim().length > 3), `${tl.slug}/${l}: at least 3 non-empty steps`);
    if (l !== 'en') check(steps.some((s, i) => s !== en[i]), `${tl.slug}/${l}: steps are translated, not the English fallback`);
  }
}
const howtoSrc = readFileSync(join(root, 'content', 'tool-howto.ts'), 'utf8');
const lPart = howtoSrc.slice(howtoSrc.indexOf('const L'), howtoSrc.indexOf('type StepRef'));
const stepsPart = howtoSrc.slice(howtoSrc.indexOf('const toolSteps'));
const defined = [...lPart.matchAll(/\n  (\w+): \{\n([\s\S]*?)\n  \},/g)];
const used = new Set([...stepsPart.matchAll(/\['(\w+)'\]/g)].map((m) => m[1]));
for (const [, key, body] of defined) {
  check(used.has(key!), `step text "${key}" is used by a tool`);
  check((body!.match(/\b[a-z]{2}: '/g) ?? []).length === 16, `step text "${key}" has 16 languages`);
}
check([...used].every((k) => defined.some((d) => d[1] === k)), 'every step a tool uses is defined');
// Steps that described what the tools do not do (fixed together with making the steps visible).
for (const gone of ['waitConversion', 'waitExtraction', 'downloadReport', 'adjustPageSize', 'customizePdfOptions', 'uploadHtml', 'selectPagesRedact', 'waitAnalysis']) {
  check(!used.has(gone), `no tool uses the inaccurate step "${gone}"`);
}
pass(`steps: ${tools.length} tools × ${locales.length} languages, ${defined.length} step texts`);

// --- 2. Where each tool sends data matches the pages that call the server -------------------------
const pagesDir = join(root, 'app', '(unprefixed)');
const serverKeys = tools.filter((tl) => {
  const f = join(pagesDir, tl.slug, 'page.tsx');
  return existsSync(f) && /\/api\/|client-ai|apiFetch/.test(readFileSync(f, 'utf8'));
}).map((tl) => tl.key).sort();
check(JSON.stringify(serverKeys) === JSON.stringify(Object.keys(NON_LOCAL_TOOLS).sort()), `NON_LOCAL_TOOLS = pages that call the server (${serverKeys.join(', ')})`);
pass('processing kinds match the code');

// --- 3. Titles and descriptions --------------------------------------------------------------------
for (const l of locales) {
  const seen = new Set<string>();
  for (const tl of tools) {
    const { title, description } = toolSearchMetadata(tl.key, l);
    const tool = t(`tool.${tl.key}`, l);
    check(title.includes(tool) && title !== tool && !title.includes('{'), `${l}/${tl.key}: title names the tool and adds search words ("${title}")`);
    check(description.includes(t(`desc.${tl.key}`, l)) && !description.includes('{'), `${l}/${tl.key}: description starts from the tool's purpose`);
    const [min, max] = CJK.has(l) ? [35, 120] : [90, 230];
    check(description.length >= min && description.length <= max, `${l}/${tl.key}: description length ${description.length} in [${min}, ${max}]`);
    check(!seen.has(description), `${l}/${tl.key}: description is unique`);
    seen.add(description);
    const meta = pageMetadata(l, `/${tl.slug}`);
    check(meta.title === title && meta.description === description, `${l}/${tl.key}: pageMetadata uses them`);
  }
}
// The privacy claim must not appear where it is false.
const localClaim = t('seo.desc_local', 'pl', { desc: '' });
for (const key of Object.keys(NON_LOCAL_TOOLS)) {
  check(!toolSearchMetadata(key, 'pl').description.includes(localClaim.slice(2)), `${key}: description does not claim the file never leaves the browser`);
}
pass('titles and descriptions for every tool and language');

// --- 4. The section under each tool -----------------------------------------------------------------
for (const tl of tools) {
  const guide = guides.find((g) => g.relatedTool === tl.key);
  for (const l of locales) {
    const html = renderToStaticMarkup(h(ToolGuide as ComponentType<{ slug: string; locale: string }>, { slug: tl.slug, locale: l }));
    const text = decode(html);
    const steps = toolHowToSteps(tl.slug, l)!;
    check(steps.every((s, i) => text.includes(`id="step-${i + 1}"`) && text.includes(s)), `${tl.slug}/${l}: every step is visible`);
    for (const f of toolFaq(tl.key, l)) check(text.includes(f.q) && text.includes(f.a), `${tl.slug}/${l}: FAQ "${f.q}" visible`);
    const ld = JSON.parse(decode(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]!).replace(/\\u003C/g, '<').replace(/\\u003E/g, '>').replace(/\\u0026/g, '&'));
    const howto = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'HowTo');
    const app = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'WebApplication');
    check(JSON.stringify(howto.step.map((s: { text: string }) => s.text)) === JSON.stringify(steps), `${tl.slug}/${l}: HowTo data = the visible steps`);
    check(app.name === t(`tool.${tl.key}`, l) && app.url === `https://optimapdf.com/${l}/${tl.slug}` && app.isAccessibleForFree === true, `${tl.slug}/${l}: WebApplication data`);
    if (guide) check(text.includes(`/guides/`) && text.includes(guide.title[l]), `${tl.slug}/${l}: links its guide`);
    else check(!html.includes('/guides/'), `${tl.slug}/${l}: no guide link without a guide`);
    if (toolProcessing(tl.key) === 'ai') check(text.includes(String(DAILY_LIMIT)) && text.includes(t('toolpage.online_note', l)), `${tl.slug}/${l}: AI answers state the daily limit and the internet need`);
  }
}
pass(`tool section rendered for ${tools.length} tools × ${locales.length} languages`);

// --- 5. Wiring: every tool page renders the section; nothing ships the steps to the browser ----------
for (const tl of tools) {
  const src = readFileSync(join(root, 'app', '[locale]', tl.slug, 'page.tsx'), 'utf8');
  check(src.includes(`<ToolGuide slug="${tl.slug}" locale={locale as Locale} />`), `app/[locale]/${tl.slug} renders <ToolGuide slug="${tl.slug}">`);
}
check(!existsSync(join(root, 'components', 'SchemaHowTo.tsx')), 'the client SchemaHowTo component is gone');
check(!readFileSync(join(root, 'components', 'LayoutShell.tsx'), 'utf8').includes('<SchemaHowTo'), 'LayoutShell no longer renders it');
const clientFiles: string[] = [];
const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); } else if (/\.tsx?$/.test(e.name)) clientFiles.push(p); } };
['app', 'components', 'lib'].forEach((d) => walk(join(root, d)));
for (const f of clientFiles) {
  const s = readFileSync(f, 'utf8');
  if (/^['"]use client['"]/.test(s.trimStart())) check(!/tool-howto|components\/ToolGuide|from '\.\/ToolGuide'/.test(s), `${f}: client code does not import the steps`);
}
check(!readFileSync(join(root, 'components', 'ToolGuide.tsx'), 'utf8').includes('use client'), 'ToolGuide is a server component');
pass('wiring');

// --- 6. FAQ and help answers are in the HTML even when collapsed ---------------------------------
const { faqData } = await import('../content/pages/faq.ts');
const { helpData } = await import('../content/pages/help.ts');
const FaqView = (await import('../components/pages/FaqView.tsx')).default as ComponentType<Record<string, unknown>>;
const HelpView = (await import('../components/pages/HelpView.tsx')).default as ComponentType<Record<string, unknown>>;
type Cat = { items: { a: Record<string, string> }[] };
for (const l of ['pl', 'en', 'ja', 'ar']) {
  for (const [name, View, prop, data] of [['faq', FaqView, 'faqData', faqData], ['help', HelpView, 'helpData', helpData]] as const) {
    const text = decode(renderToStaticMarkup(h(View, { locale: l, [prop]: data })));
    const answers = (data as Cat[]).flatMap((c) => c.items.map((i) => i.a[l] || i.a.en!));
    const visible = answers.filter((a) => text.includes(a)).length;
    check(visible === answers.length, `${name}/${l}: ${visible}/${answers.length} answers in the HTML`);
    check(/aria-expanded="false"/.test(text) && /hidden=""/.test(text), `${name}/${l}: answers start collapsed (hidden, aria-expanded)`);
  }
}
pass('FAQ and help answers in the HTML');

// --- 7. Organization and WebSite on the home page ----------------------------------------------------
for (const l of locales) {
  const g = siteJsonLd(l)['@graph'];
  const org = g.find((n) => n['@type'] === 'Organization') as { logo: { url: string }; '@id': string };
  const site = g.find((n) => n['@type'] === 'WebSite') as { url: string; inLanguage: string };
  check(site.url === `https://optimapdf.com/${l}` && site.inLanguage === l, `${l}: WebSite in the page language`);
  check(existsSync(join(root, 'public', new URL(org.logo.url).pathname)), `${l}: Organization logo file exists`);
}
check(readFileSync(join(root, 'app', '[locale]', 'page.tsx'), 'utf8').includes('siteJsonLd(locale'), 'home page renders the site data');
check(readFileSync(join(root, 'public', '.well-known', 'security.txt'), 'utf8').includes((siteJsonLd('en')['@graph'][0] as { email: string }).email), 'contact address = security.txt');
pass('site data');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
