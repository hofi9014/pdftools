// AI tools: the text of a document must not be stored or trained on by the model's provider.
//
// The privacy policy promised that text sent to the AI tools is "not used to train models", but
// the request to OpenRouter set no data policy at all, so OpenRouter's default routing applied:
// `data_collection: "allow"` — "allow providers which store user data non-transiently and may
// train on it" (OpenRouter's provider-routing docs). The request now carries
// `provider: { data_collection: "deny" }` ("use only providers which do not collect user data").
// If no provider of the model meets that, OpenRouter fails the request; the route then reports
// the AI as unavailable and gives the request back to the daily limit — it never retries
// without the policy.
//
// Runs on the in-memory rate limit (tsx does not load .env.local), never the production Redis.
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

process.env.OPENROUTER_API_KEY = 'test-key-for-data-policy';
const { POST } = await import('../app/api/ai/route');
const originalFetch = globalThis.fetch;
const ip = `test-data-policy-${Date.now()}`;
const request = (task: string, extra: Record<string, unknown> = {}): Request => new Request('http://localhost/api/ai', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  body: JSON.stringify({ task, text: 'Umowa najmu lokalu, Warszawa.', ...extra }),
});

console.log('\n=== every AI task asks OpenRouter for providers that do not collect data ===');
{
  const bodies: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  try {
    for (const [task, extra] of [['summary', {}], ['translate', { language: 'angielski' }], ['chat', { question: 'Gdzie jest lokal?' }]] as const) {
      const res = await POST(request(task, extra) as never);
      check(res.status === 200, `${task}: answered (${res.status})`);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
  check(bodies.length === 3, `three requests reached OpenRouter (${bodies.length})`);
  const policies = bodies.map((b) => JSON.stringify(b.provider));
  check(policies.every((p) => p === '{"data_collection":"deny"}'), `each carries provider.data_collection = "deny" (${policies.join(', ')})`);
}

console.log('\n=== no provider meets the policy: an error, the request given back, no retry without it ===');
{
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return new Response(JSON.stringify({ error: { code: 404, message: 'No endpoints found matching your data policy' } }), { status: 404, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  const { checkAiRateLimit } = await import('../lib/ai-rate-limit');
  let res: Response;
  const quotaIp = `test-data-policy-404-${Date.now()}`;
  try {
    res = await POST(new Request('http://localhost/api/ai', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': quotaIp },
      body: JSON.stringify({ task: 'summary', text: 'Tekst.' }),
    }) as never);
  } finally {
    globalThis.fetch = originalFetch;
  }
  const body = await res.json() as { code?: string };
  check(res.status === 502 && body.code === 'ai_unavailable', `the user is told the AI is unavailable (${res.status} ${body.code})`);
  check(calls === 1, `OpenRouter was asked once — no second attempt without the data policy (${calls})`);
  // The failed request does not count: 15 more fit in the day.
  const after = await checkAiRateLimit(quotaIp);
  check(after.allowed && after.remaining === 14, `the request was given back to the daily limit (remaining after one more: ${after.remaining})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
