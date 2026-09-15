// Audit finding U3 — every tool page's file dropzone was a plain <div onClick={...}> with a
// hidden <input type="file"> triggered only by mouse click. No role/tabIndex meant the div
// was never reachable via Tab, and even if it somehow received focus, a div has no native
// activation on Enter/Space the way a real <button> does — so on all 36+ tool pages, a
// keyboard-only user could not open the file picker at all.
//
// Fixed by adding role="button" tabIndex={0} and an onKeyDown handler (Enter/Space ->
// preventDefault + the same document.getElementById(id).click() the onClick already used) to
// every dropzone div, across all app/*/page.tsx files that have one.
//
// This is source-level verification across every affected file (no React render needed: the
// defect and the fix are both about which JSX attributes are present) — decisive because it
// checks the SAME onClick/id pairing carries a matching onKeyDown for that exact id, not just
// "some onKeyDown exists somewhere in the file".

import { readFileSync, readdirSync } from 'node:fs';
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

console.log('=== U3: every tool-page file dropzone is keyboard-operable (role/tabIndex/onKeyDown) ===');

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const appDir = join(root, 'app');

const pageFiles = (readdirSync(appDir, { recursive: true }) as string[])
  .filter((f) => f.endsWith('page.tsx'))
  .map((f) => join(appDir, f));

check(pageFiles.length > 30, `sanity: found a substantial number of app/*/page.tsx files (got ${pageFiles.length})`);

// Matches the click-to-open-picker pattern this audit finding is about, wherever it appears
// on a line (single-line JSX like sign-pdf, or its own line like most tool pages), and
// captures the exact input id so the matching onKeyDown can be checked for that same id.
const onClickRe = /onClick=\{\(\) => document\.getElementById\('([^']+)'\)\?\.click\(\)\}/g;

let totalDropzones = 0;
let filesWithDropzones = 0;

for (const file of pageFiles) {
  const src = readFileSync(file, 'utf-8');
  const rel = file.slice(root.length + 1);
  const matches = [...src.matchAll(onClickRe)];
  if (matches.length === 0) continue;
  filesWithDropzones++;

  for (const m of matches) {
    totalDropzones++;
    const id = m[1];
    // Look at a window of source right after this onClick for the accompanying attributes —
    // proves they're on the SAME element, not just present somewhere else in the file.
    const windowSrc = src.slice(m.index!, m.index! + 400);
    check(/role="button"/.test(windowSrc), `${rel}: dropzone for #${id} has role="button" right after its onClick`);
    check(/tabIndex=\{0\}/.test(windowSrc), `${rel}: dropzone for #${id} has tabIndex={0} right after its onClick`);
    const keyDownRe = new RegExp(`onKeyDown=\\{[^}]*getElementById\\('${id}'\\)`);
    check(keyDownRe.test(windowSrc), `${rel}: dropzone for #${id} has an onKeyDown handler wired to the SAME id ('${id}')`);
    check(/e\.key === 'Enter'.*e\.key === ' '|e\.key === ' '.*e\.key === 'Enter'/.test(windowSrc), `${rel}: onKeyDown for #${id} handles both Enter and Space`);
  }
}

check(filesWithDropzones >= 35, `sanity: at least 35 files have a file dropzone (got ${filesWithDropzones})`);
check(totalDropzones >= 35, `sanity: at least 35 total dropzone instances found (got ${totalDropzones}, across files including compare-pdf's two)`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
console.log(`(${totalDropzones} dropzones checked across ${filesWithDropzones} files)`);
process.exit(fails === 0 ? 0 : 1);
