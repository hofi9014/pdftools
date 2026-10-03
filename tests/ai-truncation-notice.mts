// FINDING (client-ai truncation notice + notice-overflow, 2026-09-21) — see the comment on
// truncateWithNotice in lib/client-ai.ts for full detail. Two bugs, found together while
// scanning for further engine issues:
//
// 1. summarizeText/translateText silently sliced long text with no notice — the AI model (and
//    therefore the user) had no way to know a long document's summary/translation only covered
//    the first ~120000 characters.
//
// 2. A more serious, PRE-EXISTING bug this exposed: askAI's own truncation sliced to exactly
//    the server's length limit and then appended a notice ON TOP of that, pushing the real
//    request past app/api/ai/route.ts's own strict `text.length > maxTextLength` check by the
//    notice's length (53 chars, measured) — so every chat message that actually needed
//    truncation got a hard 400 rejection from the server instead of a working, truncated
//    response. Fixed by reserving room for the notice inside the length budget instead of
//    slicing to the full limit and appending on top.
//
// This test drives the REAL client functions (askAI/summarizeText/translateText from
// lib/client-ai.ts) against the REAL server route (app/api/ai/route.ts's exported POST, same
// pattern as tests/ai-text-length-limit.mts) with oversized input, and confirms the request
// actually succeeds (200, OpenRouter called) instead of being rejected — proving the client's
// own truncation never produces a request the server's own limit would reject.

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

console.log('=== client-ai: truncation notice never pushes a request past the server\'s own length limit ===');

process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'test-key-not-real';
const originalFetch = global.fetch;
let openRouterCalls = 0;
let lastRequestedIp = '';

// Route every fetch through the REAL POST handler (matching tests/ai-*.mts convention) instead
// of hitting the network, but keep it wired to the real x-forwarded-for the client sends so
// rate-limiting/IP-keying still works per call.
const { POST } = await import('../app/api/ai/route');
global.fetch = (async (url: string) => {
  if (typeof url === 'string' && url.includes('openrouter')) {
    openRouterCalls++;
    return new Response(
      JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }
  throw new Error(`unexpected fetch to ${url}`);
}) as typeof fetch;

// client-ai.ts calls fetch('/api/ai', ...) directly — intercept that specific call and hand it
// to the real route handler, exactly as the browser's relative fetch would resolve to this
// app's own API route.
const clientFetch = global.fetch;
global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url === '/api/ai') {
    const req = new Request('http://localhost/api/ai', {
      method: init?.method || 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': lastRequestedIp },
      body: init?.body as string,
    });
    return POST(req);
  }
  return clientFetch(input as string, init);
}) as typeof fetch;

try {
  const { askAI, summarizeText, translateText } = await import('../lib/client-ai');

  // --- askAI: a long chat message that NEEDS truncation must still succeed (not 400) ---
  {
    openRouterCalls = 0;
    lastRequestedIp = freshIp('chat-long');
    const longText = 'x'.repeat(15000); // over the 12000 chat limit -> triggers truncation+notice
    const result = await askAI(longText, 'summarize this');
    check(result === 'ok', `askAI with 15000-char text (needs truncation) succeeds, not a 400 (got: ${result})`);
    check(openRouterCalls === 1, 'OpenRouter was actually reached for the truncated chat request');
  }

  // --- summarizeText: a long document that needs truncation must still succeed ---
  {
    openRouterCalls = 0;
    lastRequestedIp = freshIp('summary-long');
    const longText = 'y'.repeat(130000); // over the 120000 bulk limit -> triggers truncation+notice
    const result = await summarizeText(longText);
    check(result === 'ok', `summarizeText with 130000-char text (needs truncation) succeeds, not a 400 (got: ${result})`);
    check(openRouterCalls === 1, 'OpenRouter was actually reached for the truncated summary request');
  }

  // --- translateText: same, for the translate task ---
  {
    openRouterCalls = 0;
    lastRequestedIp = freshIp('translate-long');
    const longText = 'z'.repeat(130000);
    const result = await translateText(longText, 'angielski');
    check(result === 'ok', `translateText with 130000-char text (needs truncation) succeeds, not a 400 (got: ${result})`);
    check(openRouterCalls === 1, 'OpenRouter was actually reached for the truncated translate request');
  }

  // --- Positive proof the notice is actually present (not just that it fits) ---
  {
    lastRequestedIp = freshIp('notice-presence');
    let capturedText = '';
    const savedFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/ai') {
        const body = JSON.parse(init?.body as string);
        capturedText = body.text;
      }
      return savedFetch(input, init);
    }) as typeof fetch;
    await summarizeText('w'.repeat(130000));
    global.fetch = savedFetch;
    check(capturedText.includes('tekst przyciety'), 'the actual request body sent to /api/ai contains the truncation notice');
    check(capturedText.length <= 120000, `truncated+notice text stays within the server's 120000 limit (got ${capturedText.length})`);
  }
} finally {
  global.fetch = originalFetch;
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
