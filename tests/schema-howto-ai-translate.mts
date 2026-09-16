// Audit finding (Medium, ui area) — SchemaHowTo.tsx's toolSteps registry had entries for
// 'ai-chat' and 'ai-summary' but not 'ai-translate' — the only AI tool without a schema.org
// HowTo structured-data entry, despite having its own i18n keys like its siblings. Since the
// component early-returns null when `!toolSteps[segment]`, /ai-translate emitted NO HowTo
// JSON-LD at all (verified live: before this fix, no <script type="application/ld+json">
// HowTo block existed on that page).
//
// Fixed by adding a toolSteps['ai-translate'] entry (4 steps: upload, select target language,
// click translate, read the result) and three new step-key translations (selectTargetLanguage
// reusing lib/i18n.ts's already-translated page.translate.howto_2 content verbatim;
// clickTranslate/readTranslation following the exact existing clickConvert/clickSummarize and
// readSummary templates — the same word substituted into an already-professionally-translated
// sentence structure, not freshly authored prose).
//
// Verified live in the browser (both pl and en) that a complete, correctly translated HowTo
// JSON-LD block now renders on /ai-translate. This test checks the underlying data for all
// 16 locales, since mounting the real component (which reads the URL via next/navigation's
// usePathname) isn't practical outside a full Next.js render.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { locales, t } from '../lib/i18n';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== SchemaHowTo: ai-translate has a real HowTo entry, like its ai-chat/ai-summary siblings ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'components', 'SchemaHowTo.tsx'), 'utf-8');

const toolStepsMatch = src.match(/const toolSteps: Record<string, StepRef\[\]\[\]> = \{[\s\S]*?\n\};/);
check(!!toolStepsMatch, 'sanity: found the toolSteps registry');
if (toolStepsMatch) {
  check(/'ai-translate': \[/.test(toolStepsMatch[0]), "toolSteps has an 'ai-translate' entry (previously missing entirely)");
}

const entryMatch = src.match(/'ai-translate': \[\s*(\[[^\]]*\][,\s]*)+\],/);
check(!!entryMatch, "sanity: found the 'ai-translate' step list itself");
if (entryMatch) {
  check(entryMatch[0].includes('uploadPdfConvert'), 'step 1 is the upload step');
  check(entryMatch[0].includes('selectTargetLanguage'), 'includes a select-target-language step');
  check(entryMatch[0].includes('clickTranslate'), 'includes a click-translate step');
  check(entryMatch[0].includes('readTranslation'), 'includes a read-the-result step');
}

// Every new step key must have all 16 locales, same as its siblings, and must not just
// echo the raw key (a stray typo/missing-locale bug would show up as an object with fewer
// than 16 entries, which the render path resolves via `tr()` the same way ContentBlockRenderer
// resolves LocalizedString objects — falling back to 'en' silently, hiding the gap).
for (const key of ['selectTargetLanguage', 'clickTranslate', 'readTranslation']) {
  const keyMatch = src.match(new RegExp(`  ${key}: \\{([\\s\\S]*?)\\n  \\},`));
  check(!!keyMatch, `sanity: found the ${key} entry`);
  if (keyMatch) {
    // Not anchored to line-start: clickTranslate follows the file's own established
    // compact style (e.g. clickConvert/clickSummarize) with pl+en on one line.
    const localeCount = (keyMatch[1].match(/\b[a-z]{2}: '/g) || []).length;
    check(localeCount === 16, `${key} has all 16 locales (got ${localeCount})`);
  }
}

console.log('\n--- selectTargetLanguage reuses the already-translated page.translate.howto_2 verbatim ---');
const selectMatch = src.match(/selectTargetLanguage: \{([\s\S]*?)\n  \},/);
if (selectMatch) {
  for (const locale of locales) {
    const localeLineMatch = selectMatch[1].match(new RegExp(`${locale}: '([^']*)'`));
    const howto2 = t('page.translate.howto_2', locale);
    check(!!localeLineMatch && localeLineMatch[1] === howto2, `[${locale}] selectTargetLanguage matches page.translate.howto_2 exactly (got "${localeLineMatch?.[1]}" vs "${howto2}")`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
