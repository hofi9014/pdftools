// Audit finding B1 — proxy.ts's CSRF origin check used origin.startsWith(allowed),
// which a domain like https://optimapdf.com.evil.com (fully attacker-controlled) also
// starts with. Fix: parse the header into a real origin (new URL(...).origin) and check
// exact membership in ALLOWED_ORIGINS, instead of a substring match.
//
// This file proves both directions: the attack actually works against the vulnerable
// code (run before the fix, kept here as a regression guard), and is rejected after it.

import { NextRequest } from 'next/server';
import { proxy } from '../proxy';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function makeRequest(path: string, opts: { method?: string; origin?: string; referer?: string } = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (opts.origin) headers['origin'] = opts.origin;
  if (opts.referer) headers['referer'] = opts.referer;
  return new NextRequest(`http://localhost:3000${path}`, { method: opts.method ?? 'POST', headers });
}

console.log('=== B1: CSRF origin check on proxy.ts ===');

{
  const res = proxy(makeRequest('/api/ai', { origin: 'https://optimapdf.com' }));
  check(res.status !== 403, `legitimate Origin (https://optimapdf.com) is allowed through (got ${res.status})`);
}

{
  // The decisive check: this exact domain is fully attacker-controlled (they own
  // "evil.com" and can create any subdomain-looking label under it), yet the old
  // `origin.startsWith('https://optimapdf.com')` check matched it.
  const res = proxy(makeRequest('/api/ai', { origin: 'https://optimapdf.com.evil.com' }));
  check(res.status === 403, `attacker origin "https://optimapdf.com.evil.com" is REJECTED (got ${res.status}) — this is the bypass B1 reports; a 200/next() here means the vulnerability is still present`);
}

{
  const res = proxy(makeRequest('/api/ai', { origin: 'https://optimapdf.comevil.com' }));
  check(res.status === 403, `attacker origin "https://optimapdf.comevil.com" (no dot, still starts-with) is REJECTED (got ${res.status})`);
}

{
  // Referer fallback (SEC-004's original design: Referer carries a full URL, not a bare
  // origin) must still work once normalized through new URL(...).origin.
  const res = proxy(makeRequest('/api/ai', { referer: 'https://optimapdf.com/merge?x=1' }));
  check(res.status !== 403, `legitimate Referer (full URL, https://optimapdf.com/merge?x=1) is allowed through (got ${res.status})`);
}

{
  const res = proxy(makeRequest('/api/ai', { referer: 'https://optimapdf.com.evil.com/merge' }));
  check(res.status === 403, `attacker Referer (full URL on the evil domain) is REJECTED (got ${res.status})`);
}

{
  // No Origin/Referer at all on a state-changing method — pre-existing SEC-004 behavior, must be unaffected.
  const res = proxy(makeRequest('/api/ai', {}));
  check(res.status === 403, `missing Origin/Referer on POST is still REJECTED (got ${res.status}) — SEC-004 behavior preserved`);
}

{
  const res = proxy(makeRequest('/api/ai', { origin: 'not a url', referer: undefined }));
  check(res.status === 403, `malformed Origin header (not parseable as a URL) is REJECTED, not thrown (got ${res.status})`);
}

{
  // Non-state-changing method: the CSRF origin check must not apply at all, attacker
  // origin or not — confirms the fix didn't accidentally widen the check's scope.
  const res = proxy(makeRequest('/api/ai', { method: 'GET', origin: 'https://optimapdf.com.evil.com' }));
  check(res.status !== 403, `GET request bypasses the CSRF check regardless of Origin, as designed (got ${res.status})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
