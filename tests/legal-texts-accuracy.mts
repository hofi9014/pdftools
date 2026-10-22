// The privacy policy, the GDPR page, the security page and two paragraphs of "Our principles"
// say what the code does — in all 16 languages — and keep saying it.
//
// Before (2026-10-14) these pages promised things that did not exist or were not true: server-side
// RAM processing for compression/OCR/conversions (all run in the browser), magic-byte checks and a
// 100 MB file limit for those files, anti-CSRF tokens, scanning with Snyk, an OpenRouter key kept in
// localStorage (the AI tools use the server's key), "no third-party analytics cookies" (GA sets
// them after consent), "no transfers outside the EEA except AI" (the server runs in the USA),
// server logs kept 7 days (1 hour on the current plan), and withdrawal of analytics consent by
// editing localStorage. The texts now live in lib/legal/<locale>.ts; this test ties the facts that
// can drift to the constants they come from.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');
const { legalTexts } = await import('../lib/legal/index.ts');
const { all, locales } = await import('../lib/i18n.ts');
const { URL_TO_PDF_LIMIT, URL_TO_PDF_WINDOW_SECONDS } = await import('../app/api/url-to-pdf/route.ts');
const { MAX_UPLOAD_MB } = await import('../lib/upload-limit.ts');
type Doc = (typeof legalTexts)['pl']['privacy'];

/** The Upstash database's region, as shown in its Vercel storage settings (see the check below). */
const UPSTASH_REGION = 'iad1';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

/** Everything a reader sees in a document, with Persian/Arabic digits read as 0-9. */
const flat = (d: Doc): string => [d.title, d.intro ?? '', ...d.sections.flatMap((s) => [s.h, s.p ?? '', ...(s.items ?? []), ...(s.sub ?? []).flatMap((u) => [u.h, u.p, ...(u.items ?? [])])])]
  .join('\n').replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0)).replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660));
const hasNum = (text: string, n: number): boolean => new RegExp(`(^|[^0-9])${n}([^0-9]|$)`).test(text);

const aiRoute = read('app/api/ai/route.ts');
const aiLimit = read('lib/ai-rate-limit.ts');
const proxy = read('proxy.ts');
const DAILY = Number(/const DAILY_LIMIT = (\d+)/.exec(aiLimit)?.[1]);
const DAILY_HOURS = Number(/const DAILY_WINDOW_MS = (\d+) \* 60 \* 60 \* 1000/.exec(aiLimit)?.[1]);
const PROXY_PER_MINUTE = Number(/const RATE_LIMIT_REQUESTS = (\d+)/.exec(proxy)?.[1]);
const COOKIE_DAYS = Number(/x-detected-locale=\$\{code\};path=\/;max-age=\$\{(\d+) \* 24 \* 60 \* 60\}/.exec(read('components/LanguageSelector.tsx'))?.[1]);

console.log('\n=== the facts the texts rely on, read from the code ===');
check(DAILY === 15 && DAILY_HOURS === 24, `AI: ${DAILY} requests per ${DAILY_HOURS} hours`);
check(URL_TO_PDF_LIMIT === 30 && URL_TO_PDF_WINDOW_SECONDS === 600, `URL to PDF: ${URL_TO_PDF_LIMIT} per ${URL_TO_PDF_WINDOW_SECONDS / 60} minutes`);
check(PROXY_PER_MINUTE === 30 && MAX_UPLOAD_MB === 100, `API: ${PROXY_PER_MINUTE} per minute, request size ${MAX_UPLOAD_MB} MB`);
check(COOKIE_DAYS === 365, `language cookie: ${COOKIE_DAYS} days = 12 months`);
check(/data_collection: 'deny'/.test(aiRoute) && /provider: PROVIDER_DATA_POLICY/.test(aiRoute), 'AI requests require providers that do not collect data');
check(!/ip=\$\{ip\}/.test(proxy) && /maskIp\(ip\)/.test(proxy), 'server logs keep only masked addresses of rejected requests');

console.log('\n=== every language says the same, true things ===');
const shape = (d: Doc): string => d.sections.map((s) => `${s.p ? 'p' : ''}${s.items ? `i${s.items.length}` : ''}${s.sub ? `s${s.sub.map((u) => u.items?.length ?? 0).join('.')}` : ''}`).join('|');
for (const doc of ['privacy', 'rodo', 'security'] as const) {
  const ref = shape(legalTexts.en[doc]);
  const off = locales.filter((l) => shape(legalTexts[l][doc]) !== ref);
  check(off.length === 0, `${doc}: all 16 languages have the same sections, paragraphs and list items (${off.join(', ') || 'all match'})`);
}
const bad: string[] = [];
for (const l of locales) {
  const t = legalTexts[l];
  const privacy = flat(t.privacy), rodo = flat(t.rodo), security = flat(t.security);
  const need = (cond: boolean, what: string) => { if (!cond) bad.push(`${l}: ${what}`); };
  need(hasNum(privacy, DAILY) && hasNum(privacy, DAILY_HOURS), 'privacy: AI limit and 24 h');
  need(hasNum(privacy, URL_TO_PDF_LIMIT) && hasNum(privacy, URL_TO_PDF_WINDOW_SECONDS / 60), 'privacy: URL to PDF limit');
  need(hasNum(privacy, MAX_UPLOAD_MB) && hasNum(security, MAX_UPLOAD_MB), '100 MB request limit');
  need(hasNum(security, PROXY_PER_MINUTE) && hasNum(security, DAILY), 'security: limits');
  need(hasNum(privacy, 12) && hasNum(rodo, 12), 'language cookie 12 months');
  need(hasNum(privacy, 14), 'GA retention 14 months');
  for (const name of ['Vercel', 'Upstash', 'OpenRouter', 'Google LLC']) need(privacy.includes(name) && rodo.includes(name.replace(' LLC', '')), `recipient ${name}`);
  // Where the rate-limit counters (keyed by IP address) are stored. Read from the store's settings
  // on 2026-10-18 with `vercel api /v1/storage/stores`: Upstash for Redis, metadata.primaryRegion
  // "iad1" (Washington, D.C., USA), readRegions []. If the database is ever moved, change
  // UPSTASH_REGION here and the sentence in every lib/legal/<locale>.ts.
  need(privacy.includes(UPSTASH_REGION), `privacy: where the Upstash database is (${UPSTASH_REGION})`);
  need(privacy.includes('x-detected-locale') && rodo.includes('x-detected-locale'), 'the language cookie by name');
  need(privacy.includes('_ga') && rodo.includes('_ga'), 'the GA cookies by name');
  need(privacy.includes('2023/1795') && rodo.includes('2023/1795'), 'the DPF adequacy decision');
  need(privacy.includes('kontakt@optimapdf.com') && security.includes('kontakt@optimapdf.com'), 'contact address');
  // The control the texts point to must be the one on the page, in that language.
  const settings = all[l]!['cookie.settings']!;
  need(privacy.includes(settings) && rodo.includes(settings) && t.principles.tracking.includes(settings), `the button name "${settings}"`);
  for (const [doc, text] of [['privacy', privacy], ['rodo', rodo], ['security', security]] as const) {
    for (const lie of [/magic/i, /Snyk/i, /\bRAM\b/, /TLS 1\.3/, /7 (dni|days|Tage)/i]) need(!lie.test(text), `${doc} has no claim matching ${lie}`);
  }
}
check(bad.length === 0, `numbers, recipients, cookie names and the "Cookie settings" button name are in every language (${bad.slice(0, 6).join('; ') || 'all 16'})`);

console.log('\n=== the pages use these texts ===');
for (const page of ['privacy', 'rodo', 'security']) {
  const src = read(`app/(unprefixed)/${page}/page.tsx`);
  check(src.includes(`legalFor(locale).${page}`) && src.split('\n').length < 20, `/${page} renders lib/legal (the old inline text is gone: ${src.split('\n').length} lines)`);
}
const component = read('components/LegalDocument.tsx');
check(!/^\s*<main/m.test(component) && /^\s*<div className="max-w-3xl/m.test(component), 'the legal page layout opens no second <main> (its wrapper is a <div>)');
const principles = read('content/pages/nasze-zasady.ts');
const missing = locales.filter((l) => !principles.includes(legalTexts[l].principles.security.replace(/'/g, "\\'")) || !principles.includes(legalTexts[l].principles.tracking.replace(/'/g, "\\'")));
check(missing.length === 0, `"Our principles" carries the same two paragraphs in every language (${missing.join(', ') || 'all 16'})`);
check(!/RAM|zanonimizowan|anonymi[sz]ed|anonimizzat|anonimizad/i.test(principles), '"Our principles" no longer claims RAM processing or anonymised analytics');

console.log('\n=== the AI tools do not claim everything stays in the browser ===');
for (const page of ['ai-chat', 'ai-translate', 'ai-summary']) {
  check(!read(`app/(unprefixed)/${page}/page.tsx`).includes("t('feature.no_upload_browser'"), `/${page} does not show "Everything stays in your browser"`);
}
const noAiKey = locales.filter((l) => !all[l]!['feature.ai_file_local']);
check(noAiKey.length === 0, `the accurate line ("only the extracted text goes to the AI") exists in every language (${noAiKey.join(', ') || 'all 16'})`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
