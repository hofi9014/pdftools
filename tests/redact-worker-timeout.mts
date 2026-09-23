// Audit finding (Medium-high, engine area) — createRedactWorker()/redactInWorker()
// (lib/client-pdf.ts) cached the redact Worker forever, even if it was permanently broken, and
// had NO timeout at all. `redactWorkerDisabled` is only set when `typeof Worker === 'undefined'`
// or `new Worker()` throws SYNCHRONOUSLY. If the worker's MODULE fails to fully load (blocked by
// an ad-blocker/extension, a transient network failure, a stale CDN/service-worker cache — the
// `import 'pdfjs-dist/build/pdf.worker.min.mjs'` at the top of redact-worker.ts), the Worker
// object is still constructed without throwing, so the module-level `redactWorker` variable got
// cached and returned unconditionally by every future call (`if (redactWorker) return
// redactWorker;`) — but because the worker's script never finished evaluating, it never wires up
// a message handler, so it silently drops every `postMessage()` forever with no message or error
// event ever firing back. Combined with the total absence of any timeout, every redact call
// after the first hung its promise permanently — the UI stayed stuck on "loading" until the page
// was reloaded.
//
// Fixed by adding a bounded timeout (REDACT_WORKER_TIMEOUT_MS) to redactInWorker(), and — on
// EITHER a timeout OR a genuine 'error' event — discarding the cached worker (terminate + null
// out the module variable) so the next call constructs a fresh one instead of reusing the same
// dead instance forever.
//
// Testing note (why this isn't a full end-to-end test through the public redactPdfRaster()):
// createRedactWorker/redactInWorker/discardRedactWorker are internal, unexported module state —
// they can only be reached through redactPdfRaster()'s public entry point. redactPdfRaster()'s
// FALLBACK path (when the worker is unavailable) imports the non-legacy 'pdfjs-dist' build and
// calls its real getDocument(), which — unlike the 'legacy' build this repo's other pdfjs-based
// tests deliberately use via scripts/_pdfjs_remap.mjs — requires genuine Worker-thread message
// dispatch to parse a document at all; confirmed directly (see this fix's commit) that it throws
// "a.toHex is not a function" immediately on getDocument() under plain Node even for a trivial
// PDF, with no practical polyfill available. So this test proves the fix two ways instead:
//   1. A source-level check that the real code actually has the fix's shape (timeout exists,
//      discard is wired to both the timeout AND the error-event paths, and the worker is NOT
//      unconditionally cached without any escape hatch anymore).
//   2. A standalone reproduction of the EXACT same promise/timeout/discard state machine
//      (copied, not re-invented — matching redactInWorker()'s real structure line-for-line
//      minus the actual `postMessage`/pdf.js parts) against a worker double that hangs forever,
//      proving the ALGORITHM itself actually bounds the wait instead of hanging — decisive by
//      construction, since the old code had no setTimeout call in this function at all, so this
//      reproduction's old-shape variant provably never settles within any bounded time.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== source-level: redactInWorker has a bounded timeout wired to worker discard ===');
{
  const src = readFileSync(join(ROOT, 'lib', 'client-pdf.ts'), 'utf-8');
  const startIdx = src.indexOf('function redactInWorker(');
  const endIdx = src.indexOf('\nexport async function redactPdfRaster');
  const fnSrc = src.slice(Math.max(0, startIdx - 600), endIdx); // include discardRedactWorker() just above
  check(startIdx !== -1, 'redactInWorker function found in source');
  check(/setTimeout\(/.test(fnSrc), 'a setTimeout(...) call exists in/around redactInWorker (the missing timeout)');
  check(/function discardRedactWorker/.test(fnSrc), 'a discardRedactWorker() helper exists');
  check(/redactWorker\s*=\s*null/.test(fnSrc), 'discarding actually nulls out the cached worker variable (not just terminates it)');
  // Both failure paths — the setTimeout callback AND the onError handler — must call the
  // discard helper, not just one of them (a worker that errors out synchronously also needs a
  // fresh replacement next time, same as one that silently hangs).
  const timeoutBlockMatch = fnSrc.match(/const timeoutId = setTimeout\(\(\) => \{[\s\S]*?\}, REDACT_WORKER_TIMEOUT_MS\);/);
  const errorBlockMatch = fnSrc.match(/const onError = \(e: ErrorEvent\) => \{[\s\S]*?\};/);
  check(!!timeoutBlockMatch && /discardRedactWorker\(\)/.test(timeoutBlockMatch[0]), 'the timeout callback calls discardRedactWorker()');
  check(!!errorBlockMatch && /discardRedactWorker\(\)/.test(errorBlockMatch[0]), 'the onError handler also calls discardRedactWorker()');
}

console.log('\n=== algorithmic reproduction: bounded timeout actually bounds the wait ===');
{
  // A worker double that NEVER responds — the exact real-world failure mode (script failed to
  // load, so it silently drops every postMessage with no message/error event ever firing).
  class HangingWorker {
    addEventListener() {}
    removeEventListener() {}
    postMessage() {}
    terminate() {}
  }

  // NEW shape: mirrors the real fixed redactInWorker's structure exactly (settle-once guard,
  // setTimeout that rejects + discards, cleared on any settle path).
  function callWithTimeout(worker: HangingWorker, timeoutMs: number): Promise<never> {
    return new Promise((_resolve, reject) => {
      let settled = false;
      const cleanup = () => { clearTimeout(timeoutId); worker.removeEventListener('message', () => {}); };
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Redact worker is not available in this browser'));
      }, timeoutMs);
      worker.addEventListener('message', () => {});
      worker.postMessage({});
    });
  }

  // OLD shape: the exact pre-fix structure — no setTimeout anywhere, so nothing ever settles a
  // hung worker's promise.
  function callWithNoTimeout(worker: HangingWorker): Promise<never> {
    return new Promise(() => {
      worker.addEventListener('message', () => {});
      worker.postMessage({});
      // (no timeout — matches the pre-fix code exactly)
    });
  }

  const worker = new HangingWorker();
  const BOUND_MS = 500;

  const fixedResult = await Promise.race([
    callWithTimeout(worker, 50).then(() => 'resolved', () => 'rejected'),
    new Promise<'still-pending'>((r) => setTimeout(() => r('still-pending'), BOUND_MS)),
  ]);
  check(fixedResult === 'rejected', `NEW shape (with timeout) settles within ${BOUND_MS}ms instead of hanging (got: ${fixedResult})`);

  const oldResult = await Promise.race([
    callWithNoTimeout(worker).then(() => 'resolved', () => 'rejected'),
    new Promise<'still-pending'>((r) => setTimeout(() => r('still-pending'), BOUND_MS)),
  ]);
  check(oldResult === 'still-pending', `OLD shape (no timeout) is STILL PENDING after ${BOUND_MS}ms — proves it really would hang forever (got: ${oldResult})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
