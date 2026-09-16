// Audit finding (Low, ui area) — app/ai-chat/page.tsx used manual .replace('{wordCount}', ...)
// chaining instead of t(key, locale, params), which is used correctly elsewhere in the same
// file/scope.
//
// Fixing this surfaced a second, more serious bug at a DIFFERENT call site in the same file
// (not part of the original audit finding, found while verifying the fix live in the browser):
// the "show text (N words)" toggle button manually prepended the word count outside the
// translated string (`${count} ${t('page.aichat.words', locale)}`) while the translation string
// ITSELF also contains a `{count}` placeholder (all 16 locales: e.g. English '{count} words
// extracted') that was never substituted — so the button visibly showed a literal, un-replaced
// "{count}" next to the real count in every locale (confirmed live: "▼ Visa text (8 {count}
// extraherade ord)" before the fix). Fixed by passing count through t()'s own params instead of
// string-concatenating it in.

import { t } from '../lib/i18n';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== ai-chat: t(key, locale, params) used instead of manual placeholder replacement ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'app', 'ai-chat', 'page.tsx'), 'utf-8');

console.log('--- source no longer manually replaces placeholders ---');
check(!src.includes(".replace('{wordCount}'"), 'the manual .replace(\'{wordCount}\', ...) chain is gone');
check(src.includes("t('page.aichat.extracted_msg', locale, { wordCount, mode })"), 'extracted_msg now uses t() params for wordCount and mode');
check(src.includes("t('page.aichat.words', locale, { count:"), 'words now uses t() params for count instead of string-concatenating it in');

console.log('\n--- real t() output: no literal {placeholder} text leaks through for any locale ---');
for (const locale of ['pl', 'en', 'ja', 'ar']) {
  const extracted = t('page.aichat.extracted_msg', locale, { wordCount: 8, mode: '🤖 AI' });
  const words = t('page.aichat.words', locale, { count: 8 });
  check(!extracted.includes('{wordCount}') && !extracted.includes('{mode}'), `[${locale}] extracted_msg has no leftover {wordCount}/{mode} — "${extracted}"`);
  check(extracted.includes('8') && extracted.includes('🤖 AI'), `[${locale}] extracted_msg actually contains the substituted values — "${extracted}"`);
  check(!words.includes('{count}'), `[${locale}] words has no leftover literal {count} — "${words}" (this exact bug was visible live before the fix: "8 {count} extraherade ord")`);
  check(words.includes('8'), `[${locale}] words actually contains the substituted count — "${words}"`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
