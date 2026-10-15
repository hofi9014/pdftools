// Server logs keep no full IP address and no line per ordinary API call.
//
// proxy.ts wrote `[time] METHOD /api/... ip=<full address>` for EVERY API request, plus the full
// address on every rejection, into the hosting logs. Rejections are worth logging (abuse), every
// call is not, and a masked address is enough to see where a burst comes from (GDPR art. 5(1)(c)).
// Rate limiting itself still counts the full address, in memory.
import { NextRequest } from 'next/server';

const { proxy, maskIp } = await import('../proxy.ts');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

console.log('\n=== masking ===');
check(maskIp('203.0.113.77') === '203.0.113.0', `IPv4 loses its last part (${maskIp('203.0.113.77')})`);
check(maskIp('2001:db8:85a3:8d3:1319:8a2e:370:7348') === '2001:db8:85a3::', `IPv6 is cut to /48 (${maskIp('2001:db8:85a3:8d3:1319:8a2e:370:7348')})`);
check(maskIp('2001:db8::1') === '2001:db8::', `short IPv6 keeps only what is there (${maskIp('2001:db8::1')})`);
check(maskIp('unknown') === 'unknown' && maskIp('') === 'unknown', 'no address → "unknown"');

const IP = '198.51.100.123';
const logged: string[] = [];
const orig = { log: console.log, warn: console.warn, info: console.info };
const capture = (...a: unknown[]) => logged.push(a.map(String).join(' '));
const quiet = async (fn: () => Promise<void> | void) => {
  console.log = capture; console.warn = capture; console.info = capture;
  try { await fn(); } finally { Object.assign(console, orig); }
};
const req = (init: { method?: string; origin?: string; ip?: string } = {}) => new NextRequest('https://optimapdf.com/api/url-to-pdf', {
  method: init.method ?? 'POST',
  headers: { 'x-forwarded-for': init.ip ?? IP, host: 'optimapdf.com', ...(init.origin ? { origin: init.origin } : {}), 'content-type': 'application/json' },
  body: (init.method ?? 'POST') === 'GET' ? undefined : '{}',
});

console.log('\n=== what reaches the logs ===');
await quiet(() => { for (let i = 0; i < 5; i++) proxy(req({ origin: 'https://optimapdf.com', ip: `198.51.100.${10 + i}` })); });
check(logged.length === 0, `ordinary API calls write nothing (${logged.length} lines)`);

logged.length = 0;
await quiet(() => { proxy(req({ origin: 'https://evil.example' })); });
check(logged.length === 1 && logged[0]!.includes('[CSRF]'), `a rejected request is still logged (${logged[0]?.slice(0, 80)})`);
check(!logged.some((l) => l.includes(IP)) && logged[0]!.includes('198.51.100.0'), 'with the masked address, never the full one');

logged.length = 0;
let status = 0;
await quiet(() => { for (let i = 0; i < 40; i++) status = proxy(req({ origin: 'https://optimapdf.com', ip: '192.0.2.200' })).status; });
check(status === 429, `the rate limit still counts the full address (request 40 → ${status})`);
check(logged.length > 0 && logged.every((l) => l.includes('[RATE LIMIT]') && l.includes('192.0.2.0') && !l.includes('192.0.2.200')), `rate-limit lines carry only the masked address (${logged.length} lines)`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
