// Server errors reached the visitor in Polish whatever language the page was in: the API routes
// and the proxy answer { error: '<Polish text>' } and the pages printed that text as is. A
// second, older problem in the same place: on a response that is not JSON (a gateway error
// page), `await res.json()` threw and the visitor saw "Unexpected token '<'…".
//
// Now every error carries a stable `code` (+ `params`), and the client shows the visitor's own
// language for it, falling back to the server's text for an unknown code.
//
// Also covered here, because it lives on the same path: /api/url-to-pdf had only the proxy's
// per-INSTANCE request counter. lib/window-rate-limit.ts counts in a store shared by all
// instances (Upstash; in-memory when it is not configured or fails).
import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const { API_ERROR_CODES } = await import('../lib/api-error-codes');
const { ApiError, apiErrorFromResponse, apiErrorText, apiFetch } = await import('../lib/api-error');
const { t, locales } = await import('../lib/i18n');

console.log('=== every code has a message in every language ===');
{
  const missing: string[] = [];
  const untranslated: string[] = [];
  const badParams: string[] = [];
  for (const locale of locales) {
    for (const code of API_ERROR_CODES) {
      const key = `api.err.${code}`;
      const text = t(key, locale);
      if (text === key) { missing.push(`${locale}:${code}`); continue; }
      if (locale !== 'pl' && text === t(key, 'pl')) untranslated.push(`${locale}:${code}`);
      if (code === 'too_large' && !text.includes('{mb}')) badParams.push(`${locale}:${code}`);
      if (code === 'ai_daily_limit' && !text.includes('{hours}')) badParams.push(`${locale}:${code}`);
    }
  }
  check(locales.length === 16 && API_ERROR_CODES.length === 12, `sanity: ${locales.length} locales x ${API_ERROR_CODES.length} codes`);
  check(missing.length === 0, `no missing message (${missing.slice(0, 6).join(', ')})`);
  check(untranslated.length === 0, `no locale just repeats the Polish text (${untranslated.slice(0, 6).join(', ')})`);
  check(badParams.length === 0, `the size and hours placeholders are kept (${badParams.join(', ')})`);
}

console.log('\n=== the client shows the visitor\'s language ===');
{
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const e1 = await apiErrorFromResponse(json(400, { error: 'Nieprawidłowy adres URL.', code: 'url_invalid' }), 'fallback');
  check(e1 instanceof ApiError && e1.code === 'url_invalid' && e1.status === 400, 'the code and status are read from the response');
  check(apiErrorText(e1, 'de').startsWith('Ungültige Adresse'), `German visitor: "${apiErrorText(e1, 'de')}"`);
  check(apiErrorText(e1, 'pl').startsWith('Nieprawidłowy adres'), 'Polish visitor still gets Polish');
  check(apiErrorText(e1, 'ja') !== apiErrorText(e1, 'pl') && !/[a-ząćęłńóśźż]{6}/i.test(apiErrorText(e1, 'ja').replace(/https?/g, '')), 'Japanese visitor gets Japanese');

  const e2 = await apiErrorFromResponse(json(429, { error: 'Przekroczono dzienny limit…', code: 'ai_daily_limit', params: { hours: 7 } }), 'fallback');
  check(apiErrorText(e2, 'en').includes('about 7 h'), `parameters are filled in: "${apiErrorText(e2, 'en')}"`);

  const e3 = await apiErrorFromResponse(json(400, { error: 'Zupełnie nowy błąd serwera.', code: 'not_a_known_code' }), 'fallback');
  check(apiErrorText(e3, 'de') === 'Zupełnie nowy błąd serwera.', 'an unknown code falls back to the server\'s own text');

  const html = new Response('<html><body>504 Gateway Timeout</body></html>', { status: 504, headers: { 'content-type': 'text/html' } });
  const e4 = await apiErrorFromResponse(html, 'Usługa AI tymczasowo niedostępna');
  check(e4.message === 'Usługa AI tymczasowo niedostępna' && !/Unexpected token/.test(e4.message), 'a non-JSON error page gives the fallback, not a JSON parse error');

  const e5 = await apiErrorFromResponse(new Response('too many', { status: 429 }), 'fallback');
  check(e5.code === 'rate_limited' && apiErrorText(e5, 'fr').startsWith('Trop de requêtes'), 'a bare 429 is still recognised as "too many requests"');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch;
  let net: unknown;
  try { await apiFetch('/api/ai', { method: 'POST' }); } catch (e) { net = e; }
  globalThis.fetch = originalFetch;
  check(net instanceof ApiError && net.code === 'network' && apiErrorText(net, 'es').startsWith('Sin conexión'), 'no connection → a localized message instead of the browser\'s "Failed to fetch"');
  check(apiErrorText(new Error('Zwykły błąd'), 'de') === 'Zwykły błąd' && apiErrorText('x', 'de') === t('error.generic', 'de'), 'other errors keep their message / the generic text');
}

console.log('\n=== the real handlers stamp the codes ===');
{
  const { proxy } = await import('../proxy');
  const post = (ip: string, headers: Record<string, string> = {}) =>
    proxy(new NextRequest('https://optimapdf.com/api/ai', { method: 'POST', headers: { origin: 'https://optimapdf.com', 'x-forwarded-for': ip, ...headers } }));
  const forbidden = proxy(new NextRequest('https://optimapdf.com/api/ai', { method: 'POST', headers: { origin: 'https://evil.example', 'x-forwarded-for': 'codes-1' } }));
  check(forbidden.status === 403 && (await forbidden.json()).code === 'forbidden', 'proxy 403 → forbidden');
  const big = post('codes-2', { 'content-length': String(500 * 1024 * 1024) });
  const bigBody = await big.json();
  check(big.status === 413 && bigBody.code === 'too_large' && bigBody.params?.mb === 100, 'proxy 413 → too_large with the limit in MB');
  let limited = post('codes-3');
  for (let i = 0; i < 31 && limited.status !== 429; i++) limited = post('codes-3');
  check(limited.status === 429 && (await limited.json()).code === 'rate_limited', 'proxy 429 → rate_limited');

  const route = await import('../app/api/url-to-pdf/route');
  const call = (url: unknown, ip: string) => route.POST(new Request('http://localhost/api/url-to-pdf', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify({ url }),
  }));
  const bodyOf = async (r: Response) => (await r.json()) as { code?: string; error?: string };
  check((await bodyOf(await call('', 'u-1'))).code === 'url_invalid', 'url-to-pdf: missing address → url_invalid');
  check((await bodyOf(await call('http://[not-an-address', 'u-1'))).code === 'url_invalid', 'url-to-pdf: unparsable address → url_invalid');
  check((await bodyOf(await call('https://example.com:8443/', 'u-1'))).code === 'url_invalid', 'url-to-pdf: non-standard port → url_invalid');
  const blocked = await bodyOf(await call('http://127.0.0.1/', 'u-1'));
  check(blocked.code === 'url_blocked' && blocked.error === 'Adres URL jest zablokowany.', 'url-to-pdf: internal address → url_blocked, Polish text kept for logs/old clients');

  console.log('\n=== /api/url-to-pdf: a limit shared by all instances ===');
  let last: Response | undefined;
  let allowed = 0;
  for (let i = 0; i < route.URL_TO_PDF_LIMIT + 3; i++) {
    last = await call('', 'limit-ip');
    if (last.status !== 429) allowed++;
  }
  check(allowed === route.URL_TO_PDF_LIMIT, `exactly ${route.URL_TO_PDF_LIMIT} requests pass in one window (${allowed})`);
  check(last!.status === 429 && (await bodyOf(last!)).code === 'rate_limited' && Number(last!.headers.get('retry-after')) > 0, 'the next one is 429 rate_limited with Retry-After');
  check((await call('', 'another-ip')).status !== 429, 'another address is not affected');
}

console.log('\n=== the counter itself ===');
{
  const { checkWindowLimit, createMemoryWindowStore, createRedisWindowStore } = await import('../lib/window-rate-limit');
  // Two "instances" each with its own memory: the old situation — the allowance doubles.
  const a = createMemoryWindowStore();
  const b = createMemoryWindowStore();
  let passed = 0;
  for (let i = 0; i < 10; i++) {
    const r = await checkWindowLimit({ name: 't', key: 'ip', limit: 5, windowSeconds: 60, store: i % 2 ? a : b });
    if (r.allowed) passed++;
  }
  check(passed === 10, `sanity: separate per-instance counters let ${passed} of 10 through a limit of 5`);
  // One shared store, as with Upstash: the limit holds across instances.
  const shared = createMemoryWindowStore();
  passed = 0;
  for (let i = 0; i < 10; i++) if ((await checkWindowLimit({ name: 't', key: 'ip', limit: 5, windowSeconds: 60, store: shared })).allowed) passed++;
  check(passed === 5, `a shared counter lets exactly 5 through (${passed})`);

  // The window ends.
  let now = 1_000_000;
  const clock = createMemoryWindowStore(() => now);
  for (let i = 0; i < 3; i++) await checkWindowLimit({ name: 't', key: 'k', limit: 2, windowSeconds: 60, store: clock });
  const blockedNow = await checkWindowLimit({ name: 't', key: 'k', limit: 2, windowSeconds: 60, store: clock });
  now += 61_000;
  const afterWindow = await checkWindowLimit({ name: 't', key: 'k', limit: 2, windowSeconds: 60, store: clock });
  check(!blockedNow.allowed && blockedNow.retryAfterSeconds > 0 && afterWindow.allowed, 'blocked inside the window, allowed again after it');

  // The Redis store: INCR + TTL in one round trip, EXPIRE on the first hit.
  const calls: string[] = [];
  let count = 0;
  const fakeRedis = {
    pipeline: () => ({
      incr: (k: string) => { calls.push(`incr ${k}`); },
      ttl: (k: string) => { calls.push(`ttl ${k}`); },
      exec: async () => { count++; return [count, count === 1 ? -1 : 590]; },
    }),
    expire: async (k: string, s: number) => { calls.push(`expire ${k} ${s}`); return 1; },
  };
  const redisStore = createRedisWindowStore(fakeRedis as never);
  const first = await checkWindowLimit({ name: 'url2pdf', key: '1.2.3.4', limit: 30, windowSeconds: 600, store: redisStore });
  const second = await checkWindowLimit({ name: 'url2pdf', key: '1.2.3.4', limit: 30, windowSeconds: 600, store: redisStore });
  check(calls.join(' | ') === 'incr wl:url2pdf:1.2.3.4 | ttl wl:url2pdf:1.2.3.4 | expire wl:url2pdf:1.2.3.4 600 | incr wl:url2pdf:1.2.3.4 | ttl wl:url2pdf:1.2.3.4',
    'Redis: namespaced key, expiry set once on the first request');
  check(first.allowed && first.remaining === 29 && second.remaining === 28 && second.retryAfterSeconds === 590, 'Redis: remaining and retry-after come from the shared counter');

  // A Redis outage must not open the door: the in-memory fallback still limits.
  const broken = { hit: async () => { throw new Error('upstash down'); } };
  const fallback = createMemoryWindowStore();
  const originalError = console.error;
  console.error = () => {};
  passed = 0;
  for (let i = 0; i < 6; i++) if ((await checkWindowLimit({ name: 't', key: 'ip', limit: 3, windowSeconds: 60, store: broken, fallback })).allowed) passed++;
  console.error = originalError;
  check(passed === 3, `store failure → the fallback still enforces the limit (${passed} of 6 passed)`);
}

console.log('\n=== the pages use the localized text ===');
for (const f of ['app/ai-chat/page.tsx', 'app/ai-summary/page.tsx', 'app/ai-translate/page.tsx', 'app/url-to-pdf/page.tsx']) {
  check(/apiErrorText\(err, locale\)/.test(readFileSync(join(ROOT, f), 'utf8')), `${f} shows apiErrorText(err, locale)`);
}
{
  const client = readFileSync(join(ROOT, 'lib/client-ai.ts'), 'utf8');
  check((client.match(/apiErrorFromResponse\(res,/g) ?? []).length === 3 && !/await res\.json\(\);\s*throw new Error\(data\.error/.test(client), 'client-ai reads error responses defensively in all three calls');
  const proxySrc = readFileSync(join(ROOT, 'proxy.ts'), 'utf8');
  check(!/from '@\/lib\/(api-error|i18n)'/.test(proxySrc), 'the proxy does not pull the translations into its bundle');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
