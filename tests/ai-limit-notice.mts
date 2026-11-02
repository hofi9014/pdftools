// The AI tools say, next to their action button, that they are free, need no API key and allow
// DAILY_LIMIT requests a day — the number the server enforces, not a copy of it.
//
// Before (2026-10-29): the limit was a line under the "how it works" box at the very bottom of
// the page, "15" typed into each of the 16 translations (so changing DAILY_LIMIT would leave the
// pages saying 15), and nothing said that no API key is needed — an external audit read the tools
// as "requiring an AI connection" and guessed a user would need their own key.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const { all, locales, t } = await import('../lib/i18n.ts');

console.log('=== one number for the server and the pages ===');
let DAILY_LIMIT = NaN;
try {
  ({ DAILY_LIMIT } = await import('../lib/ai-limit.ts'));
} catch { /* module missing before the change */ }
const server = await import('../lib/ai-rate-limit.ts');
check(Number.isInteger(DAILY_LIMIT) && DAILY_LIMIT > 0, `lib/ai-limit.ts exports DAILY_LIMIT (${DAILY_LIMIT})`);
check(server.DAILY_LIMIT === DAILY_LIMIT, `the rate limiter enforces the same number (${server.DAILY_LIMIT})`);
check(/from ['"]@\/lib\/ai-limit['"]/.test(read('components/ToolGuide.tsx')), 'the tool-page FAQ takes it from lib/ai-limit (no server module in page code)');

console.log('\n=== the notice sits next to the action on all three AI tools ===');
const pages: Record<string, string> = {
  'ai-chat': 'handleExtract',
  'ai-summary': 'type="submit"',
  'ai-translate': 'handleTranslate} disabled',
};
for (const [slug, action] of Object.entries(pages)) {
  const src = read(`app/(unprefixed)/${slug}/page.tsx`);
  const notice = src.indexOf('<AiNotice');
  const button = src.indexOf(action, notice < 0 ? 0 : notice);
  check(notice > 0 && button > notice && button - notice < 400, `${slug}: <AiNotice> right before its main button`);
  check(!src.includes('feature.ai_daily_limit') && !src.includes("'page.ai_warning'"), `${slug}: no separate warning box or bottom limit line`);
}

console.log('\n=== the text, in every language ===');
const missing = locales.filter((l) => !all[l]!['ai.notice_free']?.includes('{limit}'));
check(missing.length === 0, `ai.notice_free with {limit} in all 16 languages (missing: ${missing.join(', ') || 'none'})`);
const untranslated = locales.filter((l) => l !== 'en' && all[l]!['ai.notice_free'] === all.en!['ai.notice_free']);
check(untranslated.length === 0, `translated, not copied from English (${untranslated.join(', ') || 'none'})`);
const hardcoded = locales.filter((l) => 'feature.ai_daily_limit' in all[l]!);
check(hardcoded.length === 0, `the old key with "15" typed in is gone (${hardcoded.join(', ') || 'none'})`);

console.log('\n=== the "limit reached" message ===');
{
  const typed = locales.filter((l) => !all[l]!['api.err.ai_daily_limit']?.includes('{limit}') || /15|۱۵/.test(all[l]!['api.err.ai_daily_limit']!));
  check(typed.length === 0, `api.err.ai_daily_limit takes {limit} instead of a typed "15" (${typed.join(', ') || 'none'})`);
  const route = read('app/api/ai/route.ts');
  check(/apiErrorBody\('ai_daily_limit', `[^`]*\$\{DAILY_LIMIT\}[\s\S]{0,140}\{ hours: resetHours, limit: DAILY_LIMIT \}/.test(route), 'the server sends the limit with the error (and uses it in its own text)');
  const { ApiError, apiErrorText } = await import('../lib/api-error.ts');
  const shown = apiErrorText(new ApiError('x', 429, 'ai_daily_limit', { hours: 3, limit: DAILY_LIMIT }), 'de');
  check(shown.includes(String(DAILY_LIMIT)) && shown.includes('3') && !shown.includes('{'), `the visitor reads it with both numbers filled in (de: ${shown})`);
}

console.log('\n=== rendered ===');
let AiNotice: React.ComponentType<{ locale: string }> | null = null;
try {
  AiNotice = (await import('../components/AiNotice.tsx')).default;
} catch { /* component missing before the change */ }
for (const l of ['pl', 'en', 'ar'] as const) {
  const html = AiNotice ? renderToStaticMarkup(React.createElement(AiNotice, { locale: l })) : '';
  check(html.includes(t('ai.notice_free', l, { limit: String(DAILY_LIMIT) })) && !html.includes('{limit}'), `${l}: the limit line with the real number`);
  check(html.includes(t('page.ai_warning', l)), `${l}: and where the text goes (page.ai_warning)`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
