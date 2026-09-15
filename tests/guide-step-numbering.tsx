// Audit finding U1 — ContentBlockRenderer numbered guide "step" blocks using their index
// in the FULL blocks array ((i + 1).toString()), not a counter over step blocks alone. Any
// non-step block (paragraph/heading/cta/list) before or between steps shifts every following
// step number. Real content hits this: content/guides/merge-pdf/how-to-merge-pdf-online.ts
// has paragraph, cta, heading BEFORE its first step block — so the 3 real steps rendered as
// "4, 5, 6" instead of "1, 2, 3", exactly the symptom the audit reported.
//
// Renders the real guide article through the real component (react-dom/server, no mocking of
// ContentBlockRenderer itself) and reads the actual step-badge numbers out of the HTML.

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ContentBlockRenderer from '../components/guides/ContentBlockRenderer';
import article from '../content/guides/merge-pdf/how-to-merge-pdf-online';
import type { ContentBlock } from '../types/guide';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function stepBadgeNumbers(html: string): string[] {
  // Matches the exact badge markup from ContentBlockRenderer's 'step' case.
  const re = /rounded-full bg-blue-600[^>]*>\s*([0-9]+)\s*</g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

console.log('=== U1: guide "step" blocks are numbered by their own sequence, not the array index ===');

const body = article.body as ContentBlock[];
const stepCount = body.filter((b) => b.type === 'step').length;
const firstStepIndex = body.findIndex((b) => b.type === 'step');
check(stepCount >= 3, `sanity: the real merge-pdf guide has multiple step blocks (got ${stepCount})`);
check(firstStepIndex > 0, `sanity: the real guide has non-step blocks before the first step (first step at array index ${firstStepIndex}, so the old index-based bug would show "${firstStepIndex + 1}" for step 1)`);

const html = renderToStaticMarkup(<ContentBlockRenderer blocks={body} locale="pl" />);
const numbers = stepBadgeNumbers(html);
const expected = Array.from({ length: stepCount }, (_, i) => String(i + 1));
check(numbers.length === stepCount, `rendered exactly ${stepCount} step badges (got ${numbers.length}: [${numbers.join(', ')}])`);
check(JSON.stringify(numbers) === JSON.stringify(expected), `step badges read 1..${stepCount} in order regardless of preceding paragraph/cta/heading blocks (got [${numbers.join(', ')}], expected [${expected.join(', ')}])`);

// Synthetic worst case: a step block sandwiched between many non-step blocks on both sides,
// and two consecutive step blocks with more non-step blocks between them.
const synthetic: ContentBlock[] = [
  { type: 'paragraph', text: { pl: 'a', en: 'a' } },
  { type: 'paragraph', text: { pl: 'b', en: 'b' } },
  { type: 'heading', level: 2, text: { pl: 'c', en: 'c' } },
  { type: 'list', items: [{ pl: 'd', en: 'd' }] },
  { type: 'step', title: { pl: 'S1', en: 'S1' }, text: { pl: 'x', en: 'x' } },
  { type: 'paragraph', text: { pl: 'e', en: 'e' } },
  { type: 'heading', level: 3, text: { pl: 'f', en: 'f' } },
  { type: 'step', title: { pl: 'S2', en: 'S2' }, text: { pl: 'y', en: 'y' } },
  { type: 'step', title: { pl: 'S3', en: 'S3' }, text: { pl: 'z', en: 'z' } },
];
const syntheticHtml = renderToStaticMarkup(<ContentBlockRenderer blocks={synthetic} locale="pl" />);
const syntheticNumbers = stepBadgeNumbers(syntheticHtml);
check(JSON.stringify(syntheticNumbers) === JSON.stringify(['1', '2', '3']), `synthetic worst case (4 non-step blocks before step 1, more between steps) still numbers 1, 2, 3 (got [${syntheticNumbers.join(', ')}])`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
