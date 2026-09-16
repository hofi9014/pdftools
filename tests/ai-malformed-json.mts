// Audit finding (Medium, backend area) — app/api/ai/route.ts's POST() called
// `await request.json()` with no try/catch, unlike its own sibling url-to-pdf handler.
// A malformed JSON body (or none at all) made `request.json()` throw, which unwound out of
// POST() uncaught — Next.js turns that into a generic framework error response instead of the
// clean, structured `{ error: ... }` JSON this API returns for every other failure mode
// (missing OpenRouter key, rate limit, unknown task, provider failure).
//
// This calls the REAL exported POST() handler (same pattern as tests/ai-rate-limit-refund.mts)
// with a body that fails JSON.parse, and proves it returns a clean 400 instead of throwing —
// and that a well-formed request on the same route still works normally, both before and
// after a malformed one (the fix must not affect the happy path or leak partial state).

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

console.log('=== app/api/ai POST(): malformed JSON body returns a clean 400, not an uncaught throw ===');

process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'test-key-not-real';
const originalFetch = global.fetch;
global.fetch = (async () => new Response(
  JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
  { status: 200, headers: { 'content-type': 'application/json' } },
)) as typeof fetch;

try {
  const { POST } = await import('../app/api/ai/route');
  const ip = freshIp('malformed-json');

  const malformedRequest = new Request('http://localhost/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: '{ this is not valid JSON ',
  });

  let threw = false;
  let res: Response;
  try {
    res = await POST(malformedRequest);
  } catch (e) {
    threw = true;
    res = new Response(null, { status: 599 });
    console.error('  (unexpected throw)', e);
  }

  check(!threw, 'POST() does not throw on a malformed JSON body');
  check(res!.status === 400, `malformed JSON body gets a 400 (got ${res!.status})`);
  const errBody = await res!.json().catch(() => null);
  check(!!errBody && typeof errBody.error === 'string', `response body is clean structured JSON with an "error" string (got: ${JSON.stringify(errBody)})`);

  // The completely-empty-body case (no JSON at all) must behave the same way.
  const emptyRequest = new Request('http://localhost/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': freshIp('empty-body') },
  });
  let emptyRes: Response;
  let emptyThrew = false;
  try {
    emptyRes = await POST(emptyRequest);
  } catch {
    emptyThrew = true;
    emptyRes = new Response(null, { status: 599 });
  }
  check(!emptyThrew, 'POST() does not throw on a completely empty body either');
  check(emptyRes!.status === 400, `empty body also gets a clean 400 (got ${emptyRes!.status})`);

  // Regression guard: a well-formed request on the same route still works normally right
  // after a malformed one — the fix must not disturb the happy path or leak state.
  const goodRequest = new Request('http://localhost/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': freshIp('good-after-bad') },
    body: JSON.stringify({ task: 'summary', text: 'hello world' }),
  });
  const goodRes = await POST(goodRequest);
  check(goodRes.status === 200, `a well-formed request right after the malformed ones still succeeds (got ${goodRes.status})`);
  const goodBody = await goodRes.json();
  check(goodBody.content === 'ok', 'well-formed request still gets the real AI response through');
} finally {
  global.fetch = originalFetch;
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
