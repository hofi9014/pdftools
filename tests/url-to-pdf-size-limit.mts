// Audit finding (Medium, backend area) — fetchViaValidatedAddresses() in
// app/api/url-to-pdf/route.ts buffered a fetched page's response body with no size limit at
// all. The `timeout: 15000` option only guards socket IDLE time, not total transferred bytes
// — a server that keeps streaming data (deliberately, or just serving something huge) would
// have its whole response buffered into memory without ever tripping that timeout, an
// unbounded-memory DoS vector on a publicly reachable endpoint.
//
// Fixed by tracking received bytes in the response handler and aborting the request
// (req.destroy()) as soon as the total exceeds MAX_UPLOAD_BYTES (the same 100MB cap already
// used for user file uploads, lib/upload-limit.ts) — resolving with a new 'too-large' outcome
// instead of continuing to buffer.
//
// This test runs a local HTTP server that streams data CONTINUOUSLY (never stops on its own,
// simulating either a malicious or just misbehaving/huge origin) and proves: the client-side
// abort actually happens near the cap — not after buffering the whole thing — by having the
// SERVER measure how many bytes it managed to write before the connection was torn down.

import * as http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { AddressInfo } from 'node:net';

import { fetchViaValidatedAddresses } from '../app/api/url-to-pdf/route';
import { MAX_UPLOAD_BYTES } from '../lib/upload-limit';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== url-to-pdf: unbounded response body is capped, not buffered without limit ===');

{
  const CHUNK = Buffer.alloc(64 * 1024, 'x'); // 64KB chunks
  let serverBytesWritten = 0;
  let serverSawClose = false;

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    let writing = true;
    req.on('close', () => { writing = false; serverSawClose = true; });
    res.on('close', () => { writing = false; serverSawClose = true; });
    const pump = () => {
      // Keep writing forever until the client (our code under test) disconnects — this
      // never stops on its own, exactly the "misbehaving/huge/malicious origin" scenario
      // the fix has to survive without buffering it all into memory.
      while (writing) {
        serverBytesWritten += CHUNK.length;
        if (!res.write(CHUNK)) { res.once('drain', pump); return; }
      }
    };
    pump();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const url = new URL(`http://127.0.0.1:${port}/`);

  const t0 = Date.now();
  const outcome = await fetchViaValidatedAddresses(url, [{ address: '127.0.0.1', family: 4 }]);
  const elapsedMs = Date.now() - t0;

  check(outcome.kind === 'too-large', `an unbounded/never-ending response resolves as 'too-large', not 'ok' or a hang (got: ${outcome.kind})`);
  check(elapsedMs < 15000, `the abort happens well before the 15s socket-idle timeout would ever fire (took ${elapsedMs}ms) — proves it's the SIZE cap acting, not the unrelated timeout`);

  // Give the server a moment to observe the connection actually closing.
  await new Promise((r) => setTimeout(r, 200));
  check(serverSawClose, 'the server observed the connection actually being torn down (req.destroy() really aborts it)');
  check(
    serverBytesWritten < MAX_UPLOAD_BYTES * 1.5,
    `server wrote a BOUNDED amount before the connection closed — nowhere near "kept streaming until eof that never comes" (wrote ${(serverBytesWritten / 1024 / 1024).toFixed(1)}MB, cap is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB)`,
  );
  check(
    serverBytesWritten > MAX_UPLOAD_BYTES * 0.5,
    `server wrote a MEANINGFUL amount before stopping — the abort triggers near the real cap, not suspiciously early (wrote ${(serverBytesWritten / 1024 / 1024).toFixed(1)}MB)`,
  );

  await new Promise<void>((resolve) => server.close(() => resolve()));
}

// A full POST()-level integration check would need a real publicly-routable oversized
// server — a local 127.0.0.1 test server is, correctly, rejected by the unrelated SEC-003b
// SSRF check before ever reaching this code path. Source-level check instead that POST()
// actually maps the new outcome to a client-facing error, rather than letting it fall
// through unhandled to the generic 500 catch-all.
console.log('\n=== POST() maps the new outcome to a clean client error ===');
{
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '..', 'app', 'api', 'url-to-pdf', 'route.ts'), 'utf-8');
  check(/outcome\.kind === 'too-large'/.test(src), "POST() checks for outcome.kind === 'too-large'");
  check(/status:\s*413/.test(src), "the too-large case returns HTTP 413 (Payload Too Large)");
}

// Regression guard: a small, normal response still works exactly as before.
console.log('\n=== regression guard: a small, ordinary response is unaffected ===');
{
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('a small ordinary page, nothing unusual here');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const url = new URL(`http://127.0.0.1:${port}/`);

  const outcome = await fetchViaValidatedAddresses(url, [{ address: '127.0.0.1', family: 4 }]);
  check(outcome.kind === 'ok', `small ordinary response still resolves 'ok' (got: ${outcome.kind})`);
  if (outcome.kind === 'ok') {
    check(outcome.body === 'a small ordinary page, nothing unusual here', 'body content unaffected by the size-cap logic');
  }

  await new Promise<void>((resolve) => server.close(() => resolve()));
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
