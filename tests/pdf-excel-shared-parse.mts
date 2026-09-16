// Audit finding (Medium, engine area) — mergeBandsForRoundtrip() called pdfTablesToCells(file)
// and extractFormattedTextFromPDF(file) via Promise.all, but each is a fully independent
// pipeline: re-read the file, reload it in pdf.js, and for every page recompute the operator
// list, the text-run scaffold, and the table-rect clustering — the expensive part of parsing
// a PDF, done twice for one pdf-to-excel conversion.
//
// Fixed by hoisting that shared per-page work into parsePagesForTableExtraction(), called
// ONCE by mergeBandsForRoundtrip and fed to both downstream builders
// (pdfTablesToCellsFromScaffolds / extractFormattedTextFromScaffolds). Each function's own
// public, file-based entry point (pdfTablesToCells, extractFormattedTextFromPDF) still parses
// once per call, unchanged for their several other independent callers (app/pdf-to-openoffice,
// pdfToWordIR, multiple tests).
//
// Behavioral correctness of the refactor is already covered exhaustively by the existing
// hard-coded-ground-truth suites (test:regression 13/13, test:pptx 14/14, pdf-writer-c3.mts
// 26/26 — all pass byte-for-byte unchanged). This test verifies the actual PERFORMANCE claim
// at the source level: that mergeBandsForRoundtrip's body only parses the file once.

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

console.log('=== mergeBandsForRoundtrip parses the file once, shared between both downstream builders ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'lib', 'client-pdf.ts'), 'utf-8');

function extractBalanced(text: string, openIndex: number): string {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(openIndex, i + 1);
    }
  }
  throw new Error('Unbalanced braces');
}

const fnStart = src.indexOf('export async function mergeBandsForRoundtrip');
check(fnStart !== -1, 'sanity: found mergeBandsForRoundtrip');
const fnBody = extractBalanced(src, src.indexOf('{', fnStart));

const parseCallCount = (fnBody.match(/parsePagesForTableExtraction\(/g) || []).length;
check(parseCallCount === 1, `mergeBandsForRoundtrip calls parsePagesForTableExtraction exactly once (got ${parseCallCount})`);

check(!/\bpdfTablesToCells\(/.test(fnBody), 'mergeBandsForRoundtrip no longer calls the file-based pdfTablesToCells(file) — the old duplicate-parse pattern');
check(!/\bextractFormattedTextFromPDF\(/.test(fnBody), 'mergeBandsForRoundtrip no longer calls the file-based extractFormattedTextFromPDF(file) — the old duplicate-parse pattern');

check(fnBody.includes('pdfTablesToCellsFromScaffolds(scaffolds)'), 'mergeBandsForRoundtrip derives tables from the shared scaffolds, not a fresh parse');
check(fnBody.includes('extractFormattedTextFromScaffolds(scaffolds)'), 'mergeBandsForRoundtrip derives layout from the shared scaffolds, not a fresh parse');

// The two public, file-based entry points must still exist and still do their own full parse
// (for their other several callers) — this refactor must not have removed them.
const pdfTablesToCellsSrc = src.slice(src.indexOf('export async function pdfTablesToCells'));
const pdfTablesToCellsFn = extractBalanced(pdfTablesToCellsSrc, pdfTablesToCellsSrc.indexOf('{'));
check(pdfTablesToCellsFn.includes('parsePagesForTableExtraction(file)'), 'pdfTablesToCells(file) itself still does its own full parse via the shared helper (unchanged for its other callers)');

const extractFn = src.slice(src.indexOf('export async function extractFormattedTextFromPDF'));
const extractFnBody = extractBalanced(extractFn, extractFn.indexOf('{'));
check(extractFnBody.includes('parsePagesForTableExtraction(file)'), 'extractFormattedTextFromPDF(file) itself still does its own full parse via the shared helper (unchanged for its other callers)');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
