// Audit finding (Medium, ui area) — app/edit-pdf/page.tsx used the native alert() for file
// validation errors (wrong file type, file over 100MB) — a blocking, unstyled browser dialog,
// while every sibling tool page uses the same styled `{error && <div className="bg-red-50...">
// ⚠️ {error}</div>}` banner pattern instead.
//
// Fixed by adding `error` state and the same banner markup already used elsewhere (verified
// byte-identical to app/merge/page.tsx's own banner), replacing both alert() calls with
// setError().
//
// handleFile() is an internal callback of a 'use client' component, not exported, and
// exercising it end-to-end needs real DOM event dispatch this project's test setup doesn't
// otherwise provide (no jsdom/RTL harness) — verified at the source level instead: no more
// alert() calls anywhere in the file, both validation branches call setError(), and the
// banner JSX is present and matches the sibling convention exactly.

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

console.log('=== edit-pdf: file validation uses the styled error banner, not alert() ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'app', 'edit-pdf', 'page.tsx'), 'utf-8');
const mergeSrc = readFileSync(join(here, '..', 'app', 'merge', 'page.tsx'), 'utf-8');

check(!/\balert\(/.test(src), 'no alert() calls remain anywhere in the file');
check(src.includes("const [error, setError] = useState('')"), "the component has 'error' state");

const handleFileMatch = src.match(/const handleFile = useCallback\(\(f: File \| null\) => \{[\s\S]*?\n {2}\}, \[locale\]\);/);
check(!!handleFileMatch, 'sanity: found handleFile()');
if (handleFileMatch) {
  const fn = handleFileMatch[0];
  check(/setError\(t\('error\.onlypdf', locale\)\)/.test(fn), 'the wrong-file-type branch calls setError() with the same translated message alert() used to show');
  check(/setError\(t\('edit\.max_size', locale\)\)/.test(fn), 'the over-size branch calls setError() with the same translated message alert() used to show');
  check(/setError\(''\)/.test(fn), 'a subsequent valid file clears any previous error');
}

const bannerRe = /\{error && <div className="([^"]+)">⚠️ \{error\}<\/div>\}/;
const editBannerMatch = src.match(bannerRe);
const mergeBannerMatch = mergeSrc.match(bannerRe);
check(!!editBannerMatch, 'the error banner JSX is present in edit-pdf/page.tsx');
check(!!mergeBannerMatch, 'sanity: found the reference banner in merge/page.tsx');
if (editBannerMatch && mergeBannerMatch) {
  check(editBannerMatch[1] === mergeBannerMatch[1], `banner className matches the sibling convention exactly (edit-pdf: "${editBannerMatch[1]}")`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
