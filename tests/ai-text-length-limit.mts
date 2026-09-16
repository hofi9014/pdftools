// Audit finding (Medium, backend area) — the client (lib/client-ai.ts) truncates `text`
// before sending it to /api/ai (12000 chars for 'chat', 120000 for 'summary'/'translate'),
// but the server never enforced any length limit of its own. A request sent directly to the
// endpoint — bypassing the app's own UI entirely — could carry an arbitrarily large `text` (or
// `question`/`language`), forwarded straight into the OpenRouter request body: unbounded
// input-token cost the app pays for, regardless of the response-side max_tokens cap.
//
// Fixed by cloning the same per-task limits server-side (chat: 12000, summary/translate:
// 120000 for text; plus sane caps on question/language) and rejecting oversized requests with
// a clean 400 instead of forwarding them to OpenRouter at all.
//
// Calls the REAL exported POST() handler (same pattern as tests/ai-rate-limit-refund.mts and
// tests/ai-malformed-json.mts) with oversized fields and confirms OpenRouter is never even
// reached — the fetch mock below throws if called, so any test that reaches it fails loudly.

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function freshIp(label: string): string {
  return `test-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

console.log('=== app/api/ai POST(): server-side text/question/language length limits, cloned from the client ===');

process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'test-key-not-real';
const originalFetch = global.fetch;
let openRouterCalls = 0;
global.fetch = (async () => {
  openRouterCalls++;
  return new Response(
    JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}) as typeof fetch;

function makeRequest(body: Record<string, unknown>, ip: string): Request {
  return new Request('http://localhost/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

try {
  const { POST } = await import('../app/api/ai/route');

  // --- chat: text over the client's own 12000-char limit is rejected ---
  {
    openRouterCalls = 0;
    const res = await POST(makeRequest({ task: 'chat', text: 'x'.repeat(12001), question: 'q' }, freshIp('chat-over')));
    check(res.status === 400, `chat text at 12001 chars -> 400 (got ${res.status})`);
    check(openRouterCalls === 0, 'OpenRouter was never called for the oversized chat request');
  }
  // --- chat: text AT the limit is allowed through ---
  {
    openRouterCalls = 0;
    const res = await POST(makeRequest({ task: 'chat', text: 'x'.repeat(12000), question: 'q' }, freshIp('chat-at-limit')));
    check(res.status === 200, `chat text at exactly 12000 chars -> 200, not rejected (got ${res.status})`);
    check(openRouterCalls === 1, 'OpenRouter WAS called for the in-limit chat request');
  }

  // --- summary: the bulk 120000-char limit applies, NOT the tighter chat limit ---
  {
    openRouterCalls = 0;
    const overChatButUnderBulk = 'x'.repeat(50000); // over chat's 12000, well under bulk's 120000
    const res = await POST(makeRequest({ task: 'summary', text: overChatButUnderBulk }, freshIp('summary-mid')));
    check(res.status === 200, `50000-char summary text -> 200 (uses the 120000 bulk limit, not the 12000 chat one) (got ${res.status})`);
  }
  {
    openRouterCalls = 0;
    const res = await POST(makeRequest({ task: 'summary', text: 'x'.repeat(120001) }, freshIp('summary-over')));
    check(res.status === 400, `summary text at 120001 chars -> 400 (got ${res.status})`);
    check(openRouterCalls === 0, 'OpenRouter was never called for the oversized summary request');
  }

  // --- translate: oversized language name is rejected even with a short text ---
  {
    openRouterCalls = 0;
    const res = await POST(makeRequest({ task: 'translate', text: 'short text', language: 'x'.repeat(101) }, freshIp('lang-over')));
    check(res.status === 400, `translate with a 101-char language name -> 400 (got ${res.status})`);
    check(openRouterCalls === 0, 'OpenRouter was never called for the oversized language field');
  }

  // --- missing/wrong-typed text is rejected cleanly, not passed through ---
  {
    openRouterCalls = 0;
    const res = await POST(makeRequest({ task: 'chat', question: 'q' }, freshIp('missing-text')));
    check(res.status === 400, `missing text field -> 400, not a crash (got ${res.status})`);
    check(openRouterCalls === 0, 'OpenRouter was never called when text is missing');
  }

  // --- regression guard: a normal, well-formed request still works exactly as before ---
  {
    openRouterCalls = 0;
    const res = await POST(makeRequest({ task: 'chat', text: 'hello world', question: 'what is this?' }, freshIp('normal')));
    check(res.status === 200, `a completely ordinary request still succeeds (got ${res.status})`);
    const body = await res.json();
    check(body.content === 'ok', 'and still gets the real AI response through');
  }
} finally {
  global.fetch = originalFetch;
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
