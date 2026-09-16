// Audit finding (Medium, backend area) — CloudFileSaver.tsx's getMicrosoftToken() (OneDrive
// OAuth popup flow) only removed its 'message' event listener on a SUCCESSFUL login; it never
// cleared the setInterval (polling popup.closed every 500ms) or the setTimeout (120s login
// timeout) on that path. Both kept running after a successful login — the interval until the
// already-closed popup naturally satisfies its own closed-check, the timeout for up to 120s
// regardless — pure timer leaks, whereas the sibling getDropboxToken() right below it already
// had the correct pattern: a `settled` guard and a single cleanup() clearing listener +
// interval + timeout, called from every exit path (success, cancel, timeout).
//
// getMicrosoftToken() and getDropboxToken() are internal (unexported) helpers inside a
// 'use client' component that opens a real browser popup and listens for postMessage — not
// practically mountable in a Node test without new browser-simulation infrastructure this
// project doesn't otherwise use. This verifies the fix at the source level: getMicrosoftToken
// now has the exact same cleanup shape as getDropboxToken, checked structurally (not just
// "contains the word cleanup somewhere").

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

console.log('=== CloudFileSaver: getMicrosoftToken cleans up its timers on every exit path, like getDropboxToken ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'components', 'CloudFileSaver.tsx'), 'utf-8');

function extractFunction(name: string): string {
  const start = src.indexOf(`async function ${name}(`);
  if (start === -1) throw new Error(`function ${name} not found`);
  const bodyOpen = src.indexOf('{', start);
  let depth = 0;
  for (let i = bodyOpen; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error('unbalanced braces');
}

const msFn = extractFunction('getMicrosoftToken');
const dbFn = extractFunction('getDropboxToken');

for (const [label, fn] of [['getMicrosoftToken', msFn], ['getDropboxToken', dbFn]] as const) {
  check(/let settled = false/.test(fn), `${label} has a 'settled' guard against double-resolve/reject races`);
  check(/const cleanup = \(\) => \{/.test(fn), `${label} has a single cleanup() function`);
  const cleanupBody = fn.slice(fn.indexOf('const cleanup = () => {'), fn.indexOf('const cleanup = () => {') + 400).split('};')[0];
  check(cleanupBody.includes('removeEventListener'), `${label}'s cleanup() removes the message listener`);
  check(cleanupBody.includes('clearInterval(timer)'), `${label}'s cleanup() clears the polling interval`);
  check(cleanupBody.includes('clearTimeout(timeout)'), `${label}'s cleanup() clears the login timeout`);

  const successHandlerMatch = fn.match(/const handler = \(e: MessageEvent\) => \{[\s\S]*?\n {4}\};/);
  check(!!successHandlerMatch && successHandlerMatch[0].includes('cleanup()'), `${label}'s success message handler calls cleanup() (not just removeEventListener)`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
