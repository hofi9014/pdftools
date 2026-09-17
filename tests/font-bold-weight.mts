// Audit finding (Medium, engine area) — lib/pdf/fonts.ts's Noto Sans and Open Sans entries
// used the IDENTICAL woff2 URL for weight 700 (bold) as for weight 400 (regular). Noto Sans
// is edit-pdf's default font family, so every "bold" checkbox in that tool silently embedded
// the regular weight instead — text that should look bold renders identically to normal text
// in the exported PDF.
//
// Root cause (confirmed by fetching Google's live css2 API both ways): requesting weight 400
// and 700 TOGETHER in one query returns a single shared variable-font blob for these two
// families specifically — its un-instanced default renders as regular for both. Querying each
// weight in ISOLATION returns genuinely distinct static instances. Open Sans additionally had
// all three of its URLs pointing at an aged-out v40 path that now 404s outright.
//
// Later privacy-hardening pass (see tests/privacy-hardening-batch.mts): these fonts moved from
// live fonts.gstatic.com fetches to self-hosted files under public/fonts/, downloaded once and
// verified byte-for-byte at download time. getFontBytes() now does `fetch('/fonts/...')`, a
// browser-relative URL with no meaning to a bare Node fetch() outside a page — so this test
// reads the self-hosted files directly from disk instead of calling getFontBytes() over the
// network. That's a genuine improvement on top of the original fix: this test no longer depends
// on Google's live API being reachable/unchanged to prove anything.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getFontFamily } from '../lib/pdf/fonts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== Noto Sans / Open Sans: bold actually loads a bold font, not regular ===');

const fontkit = (await import('@pdf-lib/fontkit')).default ?? (await import('@pdf-lib/fontkit'));
const SAMPLE = 'AVWMil';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function readFontFile(family: string, weight: 400 | 700): Buffer {
  const key = getFontFamily(family);
  const variant = weight === 700 ? 'bold' : 'regular';
  return readFileSync(join(repoRoot, 'public', 'fonts', `${key}-${variant}.woff2`));
}

function checkFamily(family: string): void {
  const regularBytes = readFontFile(family, 400);
  const boldBytes = readFontFile(family, 700);

  check(regularBytes.byteLength > 1000, `[${family}] regular font read (${regularBytes.byteLength} bytes)`);
  check(boldBytes.byteLength > 1000, `[${family}] bold font read (${boldBytes.byteLength} bytes)`);

  const regularHash = regularBytes.subarray(0, 64).toString('hex');
  const boldHash = boldBytes.subarray(0, 64).toString('hex');
  check(regularHash !== boldHash, `[${family}] regular and bold are NOT byte-identical (the exact old bug)`);

  const regularFont = fontkit.create(regularBytes);
  const boldFont = fontkit.create(boldBytes);

  check(/regular/i.test(regularFont.postscriptName), `[${family}] regular font's own name says Regular (got: ${regularFont.postscriptName})`);
  check(/bold/i.test(boldFont.postscriptName), `[${family}] bold font's own name says Bold (got: ${boldFont.postscriptName})`);

  const regularWidth = regularFont.layout(SAMPLE).advanceWidth;
  const boldWidth = boldFont.layout(SAMPLE).advanceWidth;
  check(boldWidth > regularWidth * 1.02, `[${family}] bold measurably wider than regular for "${SAMPLE}" (regular=${regularWidth}, bold=${boldWidth})`);
}

checkFamily('Noto Sans');
checkFamily('Open Sans');

// Regression guard: a family that was NEVER buggy (had genuinely distinct URLs all along)
// still resolves fine and its bold is still wider — proves this fix didn't disturb it.
console.log('--- regression guard: Roboto (never buggy) ---');
checkFamily('Roboto');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
