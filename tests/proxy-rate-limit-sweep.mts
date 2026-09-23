// Audit finding (fresh scanning round, proxy.ts) — checkRateLimit()'s module-level `rateMap`
// (backing the 30-req/60s per-IP rate limiter applied to every /api/* request) was only ever
// WRITTEN to, never swept. An entry is only refreshed if the SAME IP sends another request
// after its window expires; an IP that sends one request and never returns leaves its entry in
// the map forever. Since this module persists across requests on a warm instance, sustained
// traffic from many distinct IPs (organic churn, IPv6 rotation, or a trivial low-effort
// scripted burst hitting the endpoint once per IP) causes steady, unbounded growth of rateMap —
// a memory leak under ordinary traffic and a low-effort DoS vector on a long-lived warm
// instance. Contrast with lib/ai-rate-limit.ts's in-memory fallback, which already has an
// explicit ensureCleanup()/setInterval sweep for exactly this reason — proxy.ts's own map
// never got the equivalent treatment.
//
// Fixed with an opportunistic sweep (not a background timer, whose firing isn't guaranteed
// across every runtime this proxy might execute in) — every RATE_LIMIT_SWEEP_INTERVAL calls to
// checkRateLimit(), every entry whose window has already expired is removed.

import { checkRateLimit, getRateMapForTesting, resetRateLimitSweepStateForTesting, RATE_LIMIT_SWEEP_INTERVAL } from '../proxy';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== rateMap grows with distinct one-shot IPs, then gets swept after RATE_LIMIT_SWEEP_INTERVAL calls ===');
{
  resetRateLimitSweepStateForTesting();
  const rateMap = getRateMapForTesting();

  // Simulate RATE_LIMIT_SWEEP_INTERVAL - 1 distinct IPs, each sending exactly one request
  // (never returning) — this must NOT yet trigger the sweep (it's on an interval, not every
  // call), so all of them should still be present.
  for (let i = 0; i < RATE_LIMIT_SWEEP_INTERVAL - 1; i++) {
    checkRateLimit(`10.0.0.${i % 256}.shard${Math.floor(i / 256)}`);
  }
  check(rateMap.size === RATE_LIMIT_SWEEP_INTERVAL - 1, `map holds all ${RATE_LIMIT_SWEEP_INTERVAL - 1} one-shot IPs before the sweep interval is reached (got ${rateMap.size})`);

  // Manually expire every entry currently in the map (simulating that their 60s window has
  // long since passed) — this is exactly the state a real one-shot IP's entry would be in
  // after its window elapses without ever sending a second request.
  const now = Date.now();
  for (const val of rateMap.values()) val.resetAt = now - 1000;

  // The RATE_LIMIT_SWEEP_INTERVAL-th call (a brand new IP) must trigger the sweep.
  checkRateLimit('192.0.2.99');
  check(rateMap.size === 1, `after the sweep-triggering call, only the fresh, non-expired IP remains — all expired entries were purged (got size ${rateMap.size})`);
  check(rateMap.has('192.0.2.99'), 'the fresh IP that triggered the sweep is itself present (its own entry is added before/independent of the sweep)');
}

console.log('\n=== a real still-active IP survives the sweep (only EXPIRED entries are removed) ===');
{
  resetRateLimitSweepStateForTesting();
  const rateMap = getRateMapForTesting();

  checkRateLimit('203.0.113.1'); // fresh, non-expired — must survive any sweep
  // -2 (not -1): one call already spent above on the active IP, and the sweep must fire on
  // the FINAL call below, after these entries have been manually expired — not mid-loop.
  for (let i = 0; i < RATE_LIMIT_SWEEP_INTERVAL - 2; i++) {
    checkRateLimit(`198.51.100.${i % 256}.shard${Math.floor(i / 256)}`);
  }
  const now = Date.now();
  for (const [key, val] of rateMap) {
    if (key !== '203.0.113.1') val.resetAt = now - 1000; // expire everything except the active IP
  }
  checkRateLimit('198.100.100.1'); // triggers the sweep
  check(rateMap.has('203.0.113.1'), 'the still-active IP (window not yet expired) survives the sweep');
  check(rateMap.size === 2, `only the active IP and the sweep-triggering fresh IP remain (got size ${rateMap.size})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
