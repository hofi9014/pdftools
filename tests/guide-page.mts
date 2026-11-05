// The /guide page (2026-11-05). It used to keep its own description, steps and tip for every
// tool in 16 languages, and that copy had drifted from the tools: the AI tools "required an
// OpenRouter API key", Split had a mode "every N pages", files and images were reordered "by
// dragging" (there are arrow buttons), converters "started automatically", Excel to PDF took .xls,
// PDF to SVG gave "vector images", Redact "blackened pages", URL to PDF failed on "CORS". The page
// is now built from the sources the tool pages use (content/pages/guide.ts); this test ties it to
// them and checks what a visitor gets in the HTML.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';

const { locales, t } = await import('../lib/i18n.ts');
const { tools, slugByKey } = await import('../lib/tools.ts');
const { toolHowToSteps } = await import('../content/tool-howto.ts');
const { faqData } = await import('../content/pages/faq.ts');
const { localizeData } = await import('../lib/localize-data.ts');
const { guideData } = await import('../content/pages/guide.ts');
const { default: GuideView } = await import('../components/pages/GuideView.tsx');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

console.log('=== the guide lists every tool once, under its own category ===');
{
  const listed = guideData.categories.flatMap((c) => c.tools.map((tool) => `${c.key}/${tool.key}`));
  const expected = tools.filter((tool) => !tool.disabled).map((tool) => `${tool.category}/${tool.key}`);
  check(listed.length === expected.length && expected.every((e) => listed.includes(e)), `${listed.length} tools, each in its registry category (${expected.length} expected)`);
}

console.log('\n=== its text comes from the tool pages’ own sources ===');
{
  const wrong: string[] = [];
  for (const cat of guideData.categories) {
    for (const tool of cat.tools) {
      for (const l of locales) {
        const steps = toolHowToSteps(slugByKey[tool.key]!, l)!;
        if (tool.steps.map((s) => s[l]).join('\n') !== steps.join('\n')) wrong.push(`${tool.key} steps ${l}`);
        if (tool.name[l] !== t(`tool.${tool.key}`, l) || !tool.name[l]) wrong.push(`${tool.key} name ${l}`);
        if (tool.desc[l] !== t(`desc.${tool.key}`, l) || !tool.desc[l]) wrong.push(`${tool.key} desc ${l}`);
      }
    }
  }
  check(wrong.length === 0, `steps = the tool page steps, name = tool.*, description = desc.*, in 16 languages (${wrong.slice(0, 5).join(', ') || 'ok'})`);
  const cloud = faqData.find((c) => c.key === 'cloud')!;
  check(JSON.stringify(guideData.cloud.items.map((i) => [i.q, i.a])) === JSON.stringify(cloud.items.map((i) => [i.q, i.a])), 'the cloud section is the FAQ’s cloud answers');
}

console.log('\n=== what a visitor gets ===');
{
  const missing: string[] = [];
  const stale: string[] = [];
  for (const l of locales) {
    const html = renderToStaticMarkup(h(GuideView, { locale: l, guideData: localizeData(guideData, l) }));
    const text = html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
    for (const cat of guideData.categories) {
      for (const tool of cat.tools) {
        for (const s of tool.steps) if (!text.includes(s[l]!)) missing.push(`${l} ${tool.key}`);
      }
    }
    for (const bad of ['OpenRouter', 'CORS', '.xls ', '.xls,', '.xls.']) if (text.includes(bad)) stale.push(`${l} “${bad}”`);
    if (/<button[^>]*>(?:(?!<\/button>)[\s\S])*<a\b/.test(html)) stale.push(`${l}: a link inside a button`);
  }
  check(missing.length === 0, `every step of every tool is in the HTML, closed cards only hide it (${[...new Set(missing)].slice(0, 5).join(', ') || 'ok'})`);
  check(stale.length === 0, `no API key, CORS or .xls claims, no link nested in a button (${stale.slice(0, 5).join(', ') || 'ok'})`);
}

console.log('\n=== the page is small and server-built ===');
{
  for (const p of ['app/(unprefixed)/guide/page.tsx', 'app/[locale]/guide/page.tsx']) {
    const src = readFileSync(p, 'utf8');
    check(!src.includes("'use client'") && src.length < 2000, `${p} is a server page that hands the view its data (${src.length} B)`);
  }
  const view = readFileSync('components/pages/GuideView.tsx', 'utf8');
  check(!/from '@\/content\/(?:pages\/guide|tool-howto)'/.test(view.replace(/import type[^\n]*\n/g, '')), 'the client view imports no page data, only its types');
  const one = JSON.stringify(localizeData(guideData, 'pl')).length;
  check(one < 60_000, `one language of the guide is ${Math.round(one / 1024)} kB (the old client page was 328 kB with all 16)`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
