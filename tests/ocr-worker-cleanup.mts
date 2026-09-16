// Audit finding (Medium, engine area) — ocrPdfClient()'s per-page loop threw on error
// (re-thrown as "Błąd OCR na stronie N: ..."), which unwound the whole function BEFORE the
// cleanup lines that ran right after the loop (`await doc.cleanup(); await
// tessWorker.terminate();`). A single bad page therefore leaked the pdf.js document and,
// worse, the Tesseract worker — a real Web Worker holding WASM memory that keeps running in
// the background with nothing left referencing it.
//
// Mounting the real ocrPdfClient() end-to-end needs pdfjs-dist + tesseract.js + a live
// document/canvas — not practical to fully mock for a control-flow check. Instead, this
// parses the actual function body out of lib/client-ocr.ts with a balanced-brace scan (not a
// naive regex that could be fooled by unrelated braces elsewhere) and proves structurally
// that: the per-page loop sits inside a try block, that try is immediately followed by a
// finally block, and BOTH cleanup calls (doc.cleanup / tessWorker.terminate) live inside that
// finally — i.e. they run on every path out of the loop, not only the success path.

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

console.log('=== ocrPdfClient: worker/document cleanup runs even when a page throws ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'lib', 'client-ocr.ts'), 'utf-8');

const fnStart = src.indexOf('export async function ocrPdfClient');
check(fnStart !== -1, 'sanity: found ocrPdfClient in lib/client-ocr.ts');

function extractBalanced(text: string, openIndex: number): string {
  let depth = 0;
  let i = openIndex;
  for (; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(openIndex, i + 1);
    }
  }
  throw new Error('Unbalanced braces — could not extract function body');
}

// The function's own signature is `...): Promise<{ ... }> {` — the return type's object
// literal has its own brace pair BEFORE the real function-body brace, so naively taking the
// first "{" after the function name would grab that instead. Anchor on "): Promise<...> {"
// (the closing paren of the params, then the return type, then the body's opening brace).
const signatureEnd = src.indexOf('): Promise<', fnStart);
check(signatureEnd !== -1, 'sanity: found the function signature\'s return type');
const fnBodyOpen = src.indexOf('{', src.indexOf('>', signatureEnd));
const fnBody = extractBalanced(src, fnBodyOpen);

// Anchor directly on "try {" immediately wrapping the for-loop (only whitespace between them)
// — precise and unambiguous, rather than a generic backward brace-walk over arbitrary code.
const tryForRe = /try\s*\{\s*for \(let i = 0; i < totalPages; i\+\+\)/;
const tryForMatch = fnBody.match(tryForRe);
check(!!tryForMatch, 'sanity: found the per-page for-loop wrapped directly by "try {"');

const tryOpenIdx = tryForMatch ? fnBody.indexOf('{', tryForMatch.index!) : -1;
check(tryOpenIdx !== -1, 'the for-loop is enclosed in a try block');

if (tryOpenIdx !== -1) {
  const tryBlock = extractBalanced(fnBody, tryOpenIdx);
  const tryCloseIdx = tryOpenIdx + tryBlock.length;
  const afterTry = fnBody.slice(tryCloseIdx).trimStart();
  check(afterTry.startsWith('finally'), `the try wrapping the loop is immediately followed by a finally block (got: "${afterTry.slice(0, 20)}...")`);

  if (afterTry.startsWith('finally')) {
    const finallyOpenIdx = tryCloseIdx + fnBody.slice(tryCloseIdx).indexOf('{');
    const finallyBlock = extractBalanced(fnBody, finallyOpenIdx);
    check(finallyBlock.includes('doc.cleanup()'), 'doc.cleanup() runs inside the finally block (not after, where a throw would skip it)');
    check(finallyBlock.includes('tessWorker.terminate()'), 'tessWorker.terminate() runs inside the finally block (not after, where a throw would skip it)');
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
