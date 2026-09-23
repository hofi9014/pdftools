// Audit finding (fresh scanning round, app/ai-chat/page.tsx) — handleAsk() never reset the
// `error` state at the start of a new question, unlike its sibling handlers handleFile() and
// handleExtract() (both call setError('') before doing async work) and unlike the equivalent
// submit handlers in the sibling AI pages ai-summary/page.tsx and ai-translate/page.tsx (both
// clear error at the top of their submit). askAI() (lib/client-ai.ts) genuinely throws on a
// non-2xx response from /api/ai (daily rate limit exceeded, a 5xx from OpenRouter, a network
// failure) — not a hypothetical case. Once that happens once in a chat session, the red error
// banner rendered at line ~155 (visible in the chat view, under the question input) stayed
// permanently on screen for the rest of that session on that document: nothing ever set `error`
// back to '' afterwards, even after the user asked a further question that got a real, correct
// AI answer appended to the message list. The chat kept working; the error banner just never
// went away, contradicting the now-successful state.
//
// `handleAsk` is a closure inside a 'use client' component, not an exported function, so this is
// verified the same two ways used elsewhere in this repo for the same shape of bug (see
// tests/add-page-invalid-position.mts, tests/edit-pdf-combined-export.mts): (1) a source-level
// check that the real file's handleAsk body actually clears `error` before doing async work, and
// (2) a standalone reproduction of the exact state-transition sequence handleAsk performs
// (setAsking/setError/try-catch/finally), run against a fake askAI that fails once then
// succeeds, proving the OLD sequence (no clear) leaves the error message stuck around after a
// later success, while the FIXED sequence does not.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== source check: handleAsk() clears error before doing async work ===');
{
  const src = readFileSync(join(ROOT, 'app/ai-chat/page.tsx'), 'utf8');
  const handleAskMatch = src.match(/const handleAsk = async \(\) => \{[\s\S]*?\n  \};/);
  check(!!handleAskMatch, 'handleAsk function body found in source');
  const body = handleAskMatch?.[0] ?? '';
  check(/setAsking\(true\);\s*setError\(''\);/.test(body), 'handleAsk sets setAsking(true) and setError(\'\') together, before the async askAI() call');

  const handleFileMatch = src.match(/const handleFile = \([\s\S]*?\n  \};/);
  const handleExtractMatch = src.match(/const handleExtract = async \(\) => \{[\s\S]*?\n  \};/);
  check(/setError\(''\)/.test(handleFileMatch?.[0] ?? ''), 'sibling handleFile still clears error too (sanity check on the pattern)');
  check(/setError\(''\)/.test(handleExtractMatch?.[0] ?? ''), 'sibling handleExtract still clears error too (sanity check on the pattern)');
}

console.log('\n=== behavioral reproduction: a stale error must not survive a later successful question ===');
{
  // Minimal stand-in for the 4 pieces of React state handleAsk touches.
  interface FakeState { asking: boolean; error: string; messages: string[]; question: string }

  async function runHandleAsk(
    state: FakeState,
    q: string,
    askAI: (q: string) => Promise<string>,
    clearErrorAtStart: boolean,
  ): Promise<void> {
    state.asking = true;
    if (clearErrorAtStart) state.error = '';
    state.question = '';
    state.messages.push(`user:${q}`);
    try {
      const answer = await askAI(q);
      state.messages.push(`assistant:${answer}`);
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'generic error';
    } finally {
      state.asking = false;
    }
  }

  let callCount = 0;
  const flakyAskAI = async (q: string): Promise<string> => {
    callCount++;
    if (callCount === 1) throw new Error('Usługa AI tymczasowo niedostępna (limit dzienny)');
    return `real answer to "${q}"`;
  };

  console.log('  -- old behavior (no setError(\'\') at start) --');
  {
    callCount = 0;
    const state: FakeState = { asking: false, error: '', messages: [], question: '' };
    await runHandleAsk(state, 'first question (will fail)', flakyAskAI, false);
    check(state.error.length > 0, 'first, failing question sets a real error message');
    await runHandleAsk(state, 'second question (will succeed)', flakyAskAI, false);
    check(state.messages.some(m => m.startsWith('assistant:real answer')), 'second question does get a real, successful AI answer appended');
    check(state.error.length > 0, 'OLD behavior bug reproduced: error from the FIRST question is still stuck around after the SECOND one succeeded');
  }

  console.log('  -- fixed behavior (setError(\'\') at start, matching the real patched source) --');
  {
    callCount = 0;
    const state: FakeState = { asking: false, error: '', messages: [], question: '' };
    await runHandleAsk(state, 'first question (will fail)', flakyAskAI, true);
    check(state.error.length > 0, 'first, failing question sets a real error message');
    await runHandleAsk(state, 'second question (will succeed)', flakyAskAI, true);
    check(state.messages.some(m => m.startsWith('assistant:real answer')), 'second question does get a real, successful AI answer appended');
    check(state.error === '', 'FIXED behavior: the stale error from the first question is cleared once the second question starts');
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
