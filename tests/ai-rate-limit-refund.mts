// QA-001 — AI daily rate limit must not be spent on provider-side failures, but must
// still be spent on failures the requester's own input can trigger.
//
// Previously: checkAiRateLimit() incremented the counter BEFORE calling OpenRouter, with
// no way to give the token back. A run of OpenRouter outages (or any network blip) would
// burn a user's entire 15/day quota on nothing but 502 error responses.
//
// Fix: lib/ai-rate-limit.ts gets a refundAiRateLimit(), called from app/api/ai/route.ts on
// a thrown network error or an OpenRouter response with status >= 500 — NOT on any 4xx.
// The first version of this fix refunded on any non-2xx (`!res.ok`), which included 4xx
// codes OpenRouter can return because of the request's own content (e.g. 400 for text
// exceeding the model's context window) — an attacker could have sent deliberately
// oversized/invalid requests forever without ever spending their quota, defeating the
// rate limit while still loading this endpoint and Redis on every attempt.
//
// This file proves it three ways:
//   1. unit — checkAiRateLimit/refundAiRateLimit directly, isolating the counter mechanics.
//   2. integration — the real POST() handler from app/api/ai/route.ts, with global.fetch
//      mocked to simulate a network failure and a 5xx OpenRouter response, proving the
//      quota IS restored on the exact path a real request takes.
//   3. integration — the same handler with a mocked 400 (client-error) OpenRouter
//      response, proving the quota is NOT restored and repeating the 400 gives no free
//      retries — the abuse vector above.
//
// Runs entirely against the in-memory fallback: tsx does not load .env.local, so
// UPSTASH_REDIS_KV_REST_API_URL/TOKEN are unset here and getRedis() returns null — this is
// deliberate, so the test never touches the production Redis rate-limit counters. The
// Redis-path negative-count clamp in refundAiRateLimit (concurrent refunds racing a window
// reset) is therefore defensive-only and NOT exercised by this file — the in-memory
// fallback's Math.max(0, ...) can't go negative by construction (single-threaded, no race).

import { checkAiRateLimit, refundAiRateLimit } from '../lib/ai-rate-limit';

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

console.log('=== unit: 15 requests allowed, the 16th rejected (sanity on the limit itself) ===');
{
  const ip = freshIp('drain');
  let lastRemaining = -1;
  for (let i = 0; i < 15; i++) {
    const r = await checkAiRateLimit(ip);
    check(r.allowed, `request ${i + 1}/15 allowed`);
    lastRemaining = r.remaining;
  }
  check(lastRemaining === 0, `remaining is 0 after the 15th request (got ${lastRemaining})`);
  const r16 = await checkAiRateLimit(ip);
  check(r16.allowed === false, `16th request rejected (got allowed=${r16.allowed})`);
}

console.log('\n=== unit: refund gives back exactly one slot ===');
{
  const ip = freshIp('refund-one');
  const first = await checkAiRateLimit(ip);
  check(first.allowed && first.remaining === 14, `1st request allowed, remaining=14 (got ${first.remaining})`);
  await refundAiRateLimit(ip);
  const second = await checkAiRateLimit(ip);
  check(second.allowed && second.remaining === 14, `after refund, next request again sees remaining=14 (got ${second.remaining}) — the token was actually given back`);
}

console.log('\n=== unit: refunding an IP with no prior request is a safe no-op ===');
{
  const ip = freshIp('refund-empty');
  await refundAiRateLimit(ip); // must not throw, must not create a weird negative entry
  const r = await checkAiRateLimit(ip);
  check(r.allowed && r.remaining === 14, `unaffected — first real request still sees remaining=14 (got ${r.remaining})`);
}

console.log('\n=== integration: the real POST() handler refunds on network failure and on a non-2xx OpenRouter response ===');
{
  process.env.OPENROUTER_API_KEY = 'test-key-for-qa-001-regression';
  const { POST } = await import('../app/api/ai/route');

  type FetchBehavior = 'failing' | 'success';
  const originalFetch = globalThis.fetch;

  async function runScenario(label: string, failingResponse: () => Promise<Response> | never): Promise<void> {
    let fetchBehavior: FetchBehavior = 'success';
    let fetchCallCount = 0;
    globalThis.fetch = (async () => {
      fetchCallCount++;
      if (fetchBehavior === 'failing') return failingResponse();
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'ok response' } }] }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;

    const ip = freshIp(`route-${label}`);
    const makeAiRequest = (): Request => new Request('http://localhost/api/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ task: 'summary', text: 'hello world' }),
    });

    // Drain 14 of the 15 slots with real successes, so the internal counter sits at
    // count=14/remaining=1 — the next call is the last genuinely free one.
    let lastRemaining = -1;
    for (let i = 0; i < 14; i++) {
      const res = await POST(makeAiRequest());
      check(res.status === 200, `[${label}] warm-up request ${i + 1}/14 succeeds (got ${res.status})`);
      lastRemaining = Number(res.headers.get('X-RateLimit-Remaining'));
    }
    check(lastRemaining === 1, `[${label}] after 14 successes, 1 slot left (got ${lastRemaining})`);

    // This call consumes the LAST slot (count -> 15) and OpenRouter fails. If the refund
    // didn't happen, the quota would now read exhausted for the next call.
    fetchBehavior = 'failing';
    const failRes = await POST(makeAiRequest());
    check(failRes.status === 502, `[${label}] provider failure -> 502 (got ${failRes.status})`);

    // Decisive check: if the refund worked, this next call still finds a free slot and
    // succeeds — this is the 15th genuinely successful use of the daily quota. If the
    // refund didn't happen, this gets rejected with 429 instead.
    fetchBehavior = 'success';
    const afterFailRes = await POST(makeAiRequest());
    check(afterFailRes.status === 200, `[${label}] refund worked: a request right after the provider failure still succeeds (got ${afterFailRes.status}, 429 would mean the quota was NOT given back)`);
    check(Number(afterFailRes.headers.get('X-RateLimit-Remaining')) === 0, `[${label}] and it correctly used up the last real slot (remaining=0)`);

    // Sanity bound: no quota was leaked by the refund — exactly 15 real successes have now
    // happened (14 warm-up + 1 here) and one more request must be rejected.
    const overLimitRes = await POST(makeAiRequest());
    check(overLimitRes.status === 429, `[${label}] limit still enforced — one more request is rejected (got ${overLimitRes.status})`);
    check(fetchCallCount === 16, `[${label}] OpenRouter was called for all 16 non-rejected attempts, and NOT for the 429 (got ${fetchCallCount})`);
  }

  try {
    await runScenario('network-error', () => { throw new Error('simulated network failure reaching OpenRouter'); });
    await runScenario('bad-status-5xx', async () => new Response('upstream error body', { status: 503 }));
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('\n=== integration: a 4xx (content-triggerable) OpenRouter response does NOT refund — no free retries ===');
{
  process.env.OPENROUTER_API_KEY = 'test-key-for-qa-001-regression';
  const { POST } = await import('../app/api/ai/route');

  const originalFetch = globalThis.fetch;
  let respondWith400 = false;
  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount++;
    if (respondWith400) return new Response('bad request body', { status: 400 });
    return new Response(
      JSON.stringify({ choices: [{ message: { content: 'ok response' } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;

  const ip = freshIp('route-client-error-no-refund');
  const makeAiRequest = (): Request => new Request('http://localhost/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ task: 'summary', text: 'hello world' }),
  });

  try {
    // Drain 14 of the 15 slots with real successes, exactly as in the refund scenarios above.
    let lastRemaining = -1;
    for (let i = 0; i < 14; i++) {
      const res = await POST(makeAiRequest());
      lastRemaining = Number(res.headers.get('X-RateLimit-Remaining'));
    }
    check(lastRemaining === 1, `after 14 successes, 1 slot left (got ${lastRemaining})`);

    // This call consumes the LAST slot (count -> 15) and OpenRouter returns 400.
    respondWith400 = true;
    const badReqRes = await POST(makeAiRequest());
    check(badReqRes.status === 502, `400 from OpenRouter surfaces as 502 to the caller (got ${badReqRes.status})`);

    // Decisive check: unlike the 5xx/network scenarios, this must NOT be refunded — the
    // quota is genuinely exhausted now, even though the failure just happened.
    const nextAttemptRes = await POST(makeAiRequest());
    check(nextAttemptRes.status === 429, `NOT refunded: the very next request is rejected with 429 (got ${nextAttemptRes.status}) — a 200 here would mean 400s grant free retries`);

    // And repeating the same 400-triggering request again doesn't even reach OpenRouter
    // once the quota is exhausted — the rate limiter blocks it before the fetch.
    const callsBeforeRepeat = fetchCallCount;
    const repeatRes = await POST(makeAiRequest());
    check(repeatRes.status === 429, `repeating the "bad" request again still just gets 429 (got ${repeatRes.status})`);
    check(fetchCallCount === callsBeforeRepeat, `and it never even reached OpenRouter this time (fetch call count unchanged: ${fetchCallCount})`);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
