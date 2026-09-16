// Audit finding (Medium, backend area) — app/api/url-to-pdf/route.ts had TWO separate
// private-address block lists: the old BLOCKED_HOSTS/isBlockedHost (a hand-rolled prefix
// list, checked against the raw hostname string BEFORE DNS resolution) and PRIVATE_BLOCKLIST
// (a net.BlockList built for SEC-003b, checked against the RESOLVED address). The old list was
// missing several ranges the new one covers (CGNAT 100.64.0.0/10, RFC 2544 benchmarking
// 198.18.0.0/15, reserved 240.0.0.0/4) and handled IPv6 only via a literal '::1' string match.
// Not an active vulnerability — every hostname's resolved address still goes through the
// comprehensive check regardless — but a second, incomplete gate sitting right next to the
// real one reads as a second layer of defense while actually adding nothing, which is exactly
// the kind of thing that misleads someone auditing this code later.
//
// Removed entirely, folding all protection into the single already-comprehensive resolved-
// address check. This test proves hostnames the OLD list specifically named (localhost, the
// cloud metadata hostnames) are still blocked — just via DNS resolution + PRIVATE_BLOCKLIST
// instead of a hostname-string prefix match — and that a real public hostname is unaffected.

import { POST, isPrivateOrReservedAddress } from '../app/api/url-to-pdf/route';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function makePostRequest(url: string): Request {
  return new Request('http://localhost/api/url-to-pdf', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
}

console.log('=== url-to-pdf: the old, weaker duplicate block list is gone; the one real gate still catches everything it did ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'app', 'api', 'url-to-pdf', 'route.ts'), 'utf-8');
check(!src.includes('BLOCKED_HOSTS'), 'the old BLOCKED_HOSTS list is gone from the source');
check(!src.includes('isBlockedHost'), 'the old isBlockedHost() function is gone from the source');

// Every hostname the OLD list specifically named must still end up blocked — via the single
// remaining comprehensive path (DNS resolution + isPrivateOrReservedAddress on every
// resolved address), not the removed prefix check.
console.log('\n--- hostnames the old list named by literal string are still blocked end-to-end ---');
{
  const res = await POST(makePostRequest('http://localhost/'));
  check(res.status === 403, `"localhost" -> still 403 (got ${res.status})`);
}
{
  // metadata.google.internal resolves to 169.254.169.254 in real DNS, which is covered by
  // the link-local subnet in PRIVATE_BLOCKLIST — but that hostname may not resolve at all in
  // this test environment's DNS, so accept either "blocked" (403) or "could not resolve"
  // (400) as correct, and only fail if it were ever allowed through (200) or crashed.
  const res = await POST(makePostRequest('http://metadata.google.internal/'));
  check(res.status === 403 || res.status === 400, `"metadata.google.internal" -> still rejected, not allowed through (got ${res.status})`);
}

// The IP ranges the old prefix list was MISSING (this is the actual point of the finding —
// the old list would have let these through as a false sense of security) are covered by the
// one remaining check.
console.log('\n--- ranges the OLD list was missing are covered by the one remaining check ---');
check(isPrivateOrReservedAddress('100.100.100.204'), 'CGNAT-range cloud metadata IP (100.100.100.204) is blocked — old list had no CGNAT coverage at all');
check(isPrivateOrReservedAddress('198.18.0.5'), 'RFC 2544 benchmarking range (198.18.0.0/15) is blocked — absent from the old list');
check(isPrivateOrReservedAddress('240.0.0.1'), 'reserved range (240.0.0.0/4) is blocked — absent from the old list');

// Regression guard: a normal public domain is completely unaffected.
console.log('\n--- regression guard: a real public domain still works ---');
{
  const res = await POST(makePostRequest('https://example.com'));
  check(res.status === 200, `example.com -> 200 (got ${res.status})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
