// SEC-003b — DNS-rebinding TOCTOU fix in app/api/url-to-pdf/route.ts.
//
// Previously: dns.lookup() validated one DNS resolution, then fetch() performed a SECOND,
// independent one to actually connect — an attacker with a short-TTL DNS record could answer
// differently between the two, returning a public IP for the check and a private one for the
// connect. Fix: resolve once, validate every address, then freeze that exact list as a custom
// `lookup` function handed straight to http(s).request — no second resolution ever happens.
//
// This file proves the fix, not just the intent:
//   1. unit: makeFrozenLookup's behavior in isolation (ignores the requested hostname, handles
//      the all:true / family-filter / no-match branches real Node net/http code paths exercise).
//   2. unit: isPrivateOrReservedAddress covers the ranges added for this task (CGNAT, 0.0.0.0/8,
//      benchmarking, reserved) plus expanded-form IPv6 loopback.
//   3. decisive integration proof: fetchViaValidatedAddresses successfully completes a real HTTP
//      request to a hostname that DOES NOT EXIST IN DNS AT ALL, purely because the connection is
//      pinned to the frozen address — this is only possible if no fresh DNS resolution occurs.
//   4. end-to-end via the real POST handler: a domain that resolves to a private address
//      (localtest.me -> 127.0.0.1) is rejected; a normal public domain (example.com) still works
//      and returns an actual PDF.

import { Buffer } from 'node:buffer';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  POST,
  isPrivateOrReservedAddress,
  makeFrozenLookup,
  fetchViaValidatedAddresses,
} from '../app/api/url-to-pdf/route';

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

console.log('=== unit: makeFrozenLookup ignores the requested hostname (single address) ===');
{
  const frozen = makeFrozenLookup([{ address: '203.0.113.7', family: 4 }]);
  await new Promise<void>((resolve) => {
    frozen('totally-different-hostname.example', { all: false }, (err, address, family) => {
      check(err === null, 'no error for single-address lookup');
      check(address === '203.0.113.7', `returns the frozen address regardless of requested hostname (got ${String(address)})`);
      check(family === 4, `returns the frozen family (got ${family})`);
      resolve();
    });
  });
}

console.log('\n=== unit: makeFrozenLookup — all:true returns the full frozen list ===');
{
  const frozen = makeFrozenLookup([
    { address: '203.0.113.7', family: 4 },
    { address: '2001:db8::1', family: 6 },
  ]);
  await new Promise<void>((resolve) => {
    frozen('x', { all: true }, (err, addresses) => {
      check(err === null, 'no error for all:true lookup');
      check(Array.isArray(addresses) && addresses.length === 2, `returns the full frozen list (${JSON.stringify(addresses)})`);
      resolve();
    });
  });
}

console.log('\n=== unit: makeFrozenLookup — family filter picks the matching frozen address ===');
{
  const frozen = makeFrozenLookup([
    { address: '203.0.113.7', family: 4 },
    { address: '2001:db8::1', family: 6 },
  ]);
  await new Promise<void>((resolve) => {
    frozen('x', { family: 6 }, (err, address, family) => {
      check(err === null && address === '2001:db8::1' && family === 6, `family:6 -> the IPv6 frozen address (got ${String(address)}/${family})`);
      resolve();
    });
  });
}

console.log('\n=== unit: makeFrozenLookup — no matching family -> ENOTFOUND (never falls back to a real lookup) ===');
{
  const frozen = makeFrozenLookup([{ address: '203.0.113.7', family: 4 }]);
  await new Promise<void>((resolve) => {
    frozen('x', { family: 6 }, (err) => {
      check(!!err && (err as NodeJS.ErrnoException).code === 'ENOTFOUND', `family:6 requested, only IPv4 frozen -> ENOTFOUND (got ${err?.code})`);
      resolve();
    });
  });
}

console.log('\n=== unit: isPrivateOrReservedAddress — ranges added for SEC-003b ===');
check(isPrivateOrReservedAddress('100.64.1.1') === true, 'CGNAT 100.64.0.0/10 blocked');
check(isPrivateOrReservedAddress('100.63.255.255') === false, '100.63.255.255 (just below CGNAT) allowed');
check(isPrivateOrReservedAddress('100.128.0.1') === false, '100.128.0.1 (just above CGNAT) allowed');
check(isPrivateOrReservedAddress('0.5.5.5') === true, '0.0.0.0/8 blocked (not just the exact 0.0.0.0)');
check(isPrivateOrReservedAddress('198.18.5.5') === true, 'benchmarking 198.18.0.0/15 blocked');
check(isPrivateOrReservedAddress('198.17.5.5') === false, '198.17.5.5 (just below benchmarking range) allowed');
check(isPrivateOrReservedAddress('198.20.5.5') === false, '198.20.5.5 (just above benchmarking range) allowed');
check(isPrivateOrReservedAddress('240.1.1.1') === true, 'reserved 240.0.0.0/4 blocked');
check(isPrivateOrReservedAddress('239.1.1.1') === false, '239.1.1.1 (just below reserved range) allowed');
check(isPrivateOrReservedAddress('8.8.8.8') === false, 'public 8.8.8.8 (Google DNS) allowed');
check(isPrivateOrReservedAddress('0:0:0:0:0:0:0:1') === true, 'expanded-form IPv6 loopback (0:0:0:0:0:0:0:1) blocked, not just compressed ::1');
check(isPrivateOrReservedAddress('::1') === true, 'compressed IPv6 loopback still blocked');
check(isPrivateOrReservedAddress('2001:4860:4860::8888') === false, 'public IPv6 (Google DNS) allowed');

console.log('\n=== decisive proof: connects to the FROZEN address for a hostname that does not exist in DNS at all ===');
console.log('    (if a second, real DNS resolution ever occurred here — the pre-fix bug — this would fail with ENOTFOUND/EAI_AGAIN instead of succeeding)');
{
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(`hello from local server, Host=${req.headers.host}`);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;

  const fakeHostname = 'this-domain-does-not-exist-sec003b-test.invalid';
  const url = new URL(`http://${fakeHostname}:${port}/`);

  try {
    const outcome = await fetchViaValidatedAddresses(url, [{ address: '127.0.0.1', family: 4 }]);
    check(outcome.kind === 'ok', `connected successfully to an UNRESOLVABLE hostname purely via the frozen address (outcome: ${outcome.kind})`);
    if (outcome.kind === 'ok') {
      check(
        outcome.body.includes(`Host=${fakeHostname}:${port}`),
        `Host header sent to the server is the real hostname (proves virtual hosting/SNI stay correct): ${outcome.body}`,
      );
    }
  } catch (err) {
    check(false, `expected a successful connection via the frozen address, got an error instead: ${(err as Error).message}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

console.log('\n=== integration: POST — a domain resolving to a private address is rejected ===');
{
  const res = await POST(makePostRequest('http://localtest.me/'));
  check(res.status === 403, `localtest.me (resolves to 127.0.0.1 / ::1) -> 403 (got ${res.status})`);
  const body = (await res.json()) as { error?: string };
  console.log(`    body: ${JSON.stringify(body)}`);
}

console.log('\n=== integration: POST — a normal public domain still works ===');
{
  const res = await POST(makePostRequest('https://example.com'));
  check(res.status === 200, `example.com -> 200 (got ${res.status})`);
  if (res.status === 200) {
    const buf = Buffer.from(await res.arrayBuffer());
    check(buf.subarray(0, 5).toString('latin1') === '%PDF-', `response is a real PDF (magic bytes: ${JSON.stringify(buf.subarray(0, 8).toString('latin1'))})`);
    console.log(`    PDF size: ${buf.length} bytes`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
